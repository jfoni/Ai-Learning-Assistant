import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';
import {
  ArrowLeft,
  Sparkles,
  MessageSquare,
  FileText,
  Send,
  Bot,
  User,
  Lightbulb,
} from 'lucide-react';

// Resolve friendly display name from Firebase user profile or email
const getUserDisplayName = (user) => {
  if (!user) return '';
  if (user.displayName && user.displayName.trim()) {
    return user.displayName.trim().split(' ')[0];
  }
  if (user.email) {
    const localPart = user.email.split('@')[0] || '';
    const cleaned = localPart.replace(/[0-9._-]+/g, ' ').trim();
    if (cleaned) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).split(' ')[0];
    }
  }
  return '';
};

// Strip raw LaTeX dollar signs without altering user-requested content
const cleanDisplayText = (text) =>
  String(text || '')
    .replace(/\$([^$]+)\$/g, '$1')
    .trim();

// Highlight inline bold and italic segments with distinct accent colors
const renderFormattedInline = (text, variant = 'default') => {
  if (!text) return null;
  const sanitized = cleanDisplayText(text);
  const tokens = sanitized.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);

  const boldClass =
    variant === 'summary'
      ? 'font-extrabold text-[#1f3b4d] bg-[#e2eaeb] px-2 py-0.5 rounded-md'
      : variant === 'list'
      ? 'font-extrabold text-[#6b4c35] bg-[#6b4c35]/12 px-1.5 py-0.5 rounded-md'
      : 'font-extrabold text-[#1f3b4d] underline decoration-[#6b4c35]/50 decoration-2 underline-offset-2';

  const italicClass = 'italic font-semibold text-[#6b4c35]';

  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={idx} className={boldClass}>
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em key={idx} className={italicClass}>
          {token.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
};

// Render AI chat responses with easy-to-read sizing and distinct styled ul blocks
const FormattedMarkdownContent = ({ content, isUserMessage = false }) => {
  if (!content) return null;

  if (isUserMessage) {
    return (
      <p className="text-base sm:text-[17px] leading-relaxed whitespace-pre-line font-medium">
        {content}
      </p>
    );
  }

  const lines = String(content).split('\n');
  const blocks = [];
  let bulletBuffer = [];

  const flushBullets = (keyPrefix) => {
    if (bulletBuffer.length > 0) {
      blocks.push(
        <ul
          key={`${keyPrefix}-ul`}
          className="my-3.5 space-y-2.5 rounded-2xl bg-[#eef4f5] border-l-4 border-[#6b4c35] p-4"
        >
          {bulletBuffer.map((bText, bIdx) => (
            <li
              key={bIdx}
              className="flex items-start gap-2.5 text-base sm:text-[17px] text-[#1f3b4d] font-medium leading-relaxed"
            >
              <span className="mt-2 w-2.5 h-2.5 rounded-full bg-[#6b4c35] shrink-0" />
              <span className="flex-1">{renderFormattedInline(bText, 'list')}</span>
            </li>
          ))}
        </ul>
      );
      bulletBuffer = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    if (!line) {
      flushBullets(`empty-${idx}`);
      return;
    }

    if (/^-{3,}$/.test(line) || /^\*{3,}$/.test(line)) {
      flushBullets(`hr-${idx}`);
      blocks.push(<hr key={`hr-${idx}`} className="my-4 border-[#54626f]/20" />);
      return;
    }

    const headingMatch = line.match(/^#{1,4}\s*(.+)$/);
    if (headingMatch) {
      flushBullets(`h-${idx}`);
      const cleanHeading = cleanDisplayText(headingMatch[1].replace(/\*\*/g, ''));
      if (!cleanHeading) return;
      blocks.push(
        <h4
          key={`h-${idx}`}
          className="text-lg sm:text-xl font-black text-[#1f3b4d] tracking-tight mt-4 mb-2 flex items-center gap-2 bg-[#e2eaeb]/80 px-3.5 py-2 rounded-xl border-l-4 border-[#54626f]"
        >
          <span>{cleanHeading}</span>
        </h4>
      );
      return;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      const cleanedBullet = cleanDisplayText(bulletMatch[1]);
      if (cleanedBullet) bulletBuffer.push(cleanedBullet);
      return;
    }

    flushBullets(`p-${idx}`);
    const cleanedPara = cleanDisplayText(line);
    if (!cleanedPara) return;
    blocks.push(
      <p
        key={`p-${idx}`}
        className="text-base sm:text-[17px] text-[#1F2118] leading-relaxed my-2"
      >
        {renderFormattedInline(cleanedPara, 'chat')}
      </p>
    );
  });

  flushBullets('end');

  return <div className="space-y-1.5">{blocks}</div>;
};

// Parse AI summary text into clean structured sections and styled ul lists
const parseSummarySections = (rawText) => {
  if (!rawText) return [];
  const lines = String(rawText)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const knownHeaders = [
    'overview',
    'key concepts',
    'important definitions',
    'exam takeaways',
    'summary',
    'main points',
    'real-life example',
  ];

  const sections = [];
  let current = { heading: 'Study Summary', items: [] };

  for (const line of lines) {
    const cleanedLine = cleanDisplayText(
      line.replace(/^\*\*|\*\*$/g, '').replace(/^#+\s*/, '')
    );
    if (!cleanedLine) continue;

    const isBullet = /^[-*•]\s+/.test(cleanedLine);
    const headerCandidate = cleanedLine.replace(/:$/, '').toLowerCase();

    if (!isBullet && knownHeaders.includes(headerCandidate)) {
      if (current.items.length > 0) {
        sections.push(current);
      }
      current = { heading: cleanedLine.replace(/:$/, ''), items: [] };
    } else if (isBullet) {
      const bulletContent = cleanDisplayText(cleanedLine.replace(/^[-*•]\s+/, ''));
      if (bulletContent) {
        current.items.push({
          type: 'bullet',
          text: bulletContent,
        });
      }
    } else {
      current.items.push({
        type: 'paragraph',
        text: cleanedLine,
      });
    }
  }

  if (current.items.length > 0) {
    sections.push(current);
  }

  return sections;
};

// Detect casual greetings, status checks, and strict single-intent requests
const handleStrictLocalIntent = (rawInput, userName) => {
  const normalized = String(rawInput || '')
    .toLowerCase()
    .replace(/[!?.,]+$/g, '')
    .trim();

  const greetingWords = ['hi', 'hey', 'hello', 'hii', 'hiii', 'yo', 'sup', 'good morning', 'good afternoon', 'good evening'];
  if (greetingWords.includes(normalized)) {
    return userName
      ? `Hello ${userName}! How can I help you today?`
      : 'Hello! How can I help you today?';
  }

  const statusPhrases = ['how are you', 'how r u', 'how are u', 'whats up', "what's up", 'how is it going'];
  if (statusPhrases.includes(normalized)) {
    return userName
      ? `I'm good, ${userName}! How are you? How can I help you?`
      : "I'm good! How are you? How can I help you?";
  }

  return null;
};

// Build focused prompt so AI answers ONLY what the user asked for without extra sections
const buildFocusedPrompt = (userText, docTitle, mode) => {
  const lower = String(userText || '').toLowerCase();
  const baseRule =
    'Respond strictly to what the user asked for. Do not add extra sections, summaries, or unrequested explanations.';

  if (mode === 'explain' || lower.includes('example')) {
    return [
      `Document topic: "${docTitle}".`,
      `User request: "${userText}".`,
      'Give ONLY a clear real-life example on this topic in easy, natural words.',
      baseRule,
    ].join(' ');
  }

  if (lower.includes('keyword')) {
    return [
      `Document topic: "${docTitle}".`,
      `User request: "${userText}".`,
      'List ONLY the key keywords from this topic/document as short bullet points (- ). Do not write extra paragraphs or definitions.',
      baseRule,
    ].join(' ');
  }

  if (lower.includes('main concept') || lower.includes('core concept') || lower.includes('concept')) {
    return [
      `Document topic: "${docTitle}".`,
      `User request: "${userText}".`,
      'Explain ONLY the main concept clearly and concisely in easy, natural words.',
      baseRule,
    ].join(' ');
  }

  return [
    `Document topic: "${docTitle}".`,
    `User request: "${userText}".`,
    'Answer directly and only what is asked in easy, natural words.',
    baseRule,
  ].join(' ');
};

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [userName, setUserName] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserName('');
        setLoading(false);
        return;
      }

      setUserName(getUserDisplayName(user));

      try {
        const res = await axios.get(`http://localhost:8000/api/documents/${user.uid}`);
        const docs = res.data?.data || [];
        const found = docs.find((doc) => doc._id === id);
        setDocument(found || null);
      } catch (err) {
        console.error('Error fetching document details:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const handleGenerateSummary = async () => {
    try {
      setAnalyzing(true);
      const res = await axios.post(`http://localhost:8000/api/documents/${id}/analyze`, {
        instruction:
          'Provide a clear summary of this document with bullet points (- ) and a real-life example where relevant.',
      });
      setSummary(res.data?.data?.summary || '');
      setActiveTab('summary');
    } catch (err) {
      console.error('Failed to generate summary:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSendMessage = async (e, customMode = 'chat') => {
    if (e) e.preventDefault();

    const trimmedInput = inputMessage.trim();
    if (customMode === 'chat' && !trimmedInput) return;

    const topicLabel = document?.title || 'this document';
    const userDisplayMsg =
      customMode === 'explain' ? trimmedInput || 'Give a real-life example' : trimmedInput;

    setInputMessage('');
    setMessages((prev) => [...prev, { role: 'user', content: userDisplayMsg }]);

    // Handle casual greetings and status questions directly without dumping document summaries
    if (customMode === 'chat') {
      const localReply = handleStrictLocalIntent(trimmedInput, userName);
      if (localReply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: localReply }]);
        return;
      }
    }

    setChatLoading(true);
    const focusedQuestion = buildFocusedPrompt(userDisplayMsg, topicLabel, customMode);

    try {
      const res = await axios.post(`http://localhost:8000/api/documents/${id}/chat`, {
        question: focusedQuestion,
        mode: customMode,
      });
      const aiReply = res.data?.data?.answer || 'No response generated.';
      setMessages((prev) => [...prev, { role: 'assistant', content: aiReply }]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong with the AI response.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e2eaeb] p-8 text-[#54626f] text-base font-semibold">
        Loading document details...
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-[#e2eaeb] p-8">
        <div className="max-w-xl mx-auto bg-white rounded-2xl p-6 border border-[#54626f]/20 text-center">
          <p className="text-red-600 text-base font-bold mb-4">
            Document not found in your account.
          </p>
          <button
            onClick={() => navigate('/documents')}
            className="px-5 py-2.5 bg-[#54626f] text-white rounded-xl text-sm font-bold cursor-pointer"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  const parsedSections = parseSummarySections(summary);

  return (
    <div className="min-h-screen bg-[#e2eaeb] text-[#54626f] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate('/documents')}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#54626f]/20 rounded-xl text-sm font-bold text-[#54626f] hover:bg-white/80 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Documents</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Document Info & Actions */}
          <div className="bg-white/95 rounded-2xl p-6 shadow-sm border border-[#54626f]/20 space-y-4 lg:col-span-1 h-fit">
            <div className="w-11 h-11 rounded-2xl bg-[#e2eaeb] text-[#54626f] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#1F2118] leading-snug">
                {document.title}
              </h1>
              <p className="text-sm text-[#54626f] mt-1 font-medium">
                Uploaded:{' '}
                {new Date(document.uploadDate || document.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="pt-3 border-t border-[#54626f]/10 flex flex-col gap-2.5">
              <button
                onClick={handleGenerateSummary}
                disabled={analyzing}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#54626f] hover:bg-[#1F2118] transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{analyzing ? 'Generating Summary...' : 'Generate AI Summary'}</span>
              </button>

              {document.filePath && (
                <a
                  href={`http://localhost:8000/${document.filePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center py-2.5 px-4 rounded-xl text-sm font-bold text-[#54626f] bg-[#e2eaeb] hover:bg-[#d3dfe1] transition"
                >
                  Open Original File
                </a>
              )}
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-[#e2eaeb]/70 p-1 rounded-xl text-sm font-bold mt-2">
              <button
                onClick={() => setActiveTab('summary')}
                className={`flex-1 py-2.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'summary'
                    ? 'bg-[#54626f] text-white shadow-2xs'
                    : 'text-[#54626f] hover:text-[#1F2118]'
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-[#54626f] text-white shadow-2xs'
                    : 'text-[#54626f] hover:text-[#1F2118]'
                }`}
              >
                AI Chat
              </button>
            </div>
          </div>

          {/* Right Panel: Structured Summary or AI Chat */}
          <div className="bg-white/95 rounded-2xl p-6 shadow-sm border border-[#54626f]/20 lg:col-span-2 flex flex-col h-[680px]">
            {activeTab === 'summary' ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="flex items-center justify-between border-b border-[#54626f]/15 pb-4 mb-5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#1f3b4d]">
                      AI Study Summary
                    </h2>
                    <p className="text-sm text-[#54626f] mt-0.5">
                      Structured study notes &amp; clear points
                    </p>
                  </div>
                </div>

                {analyzing ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-9 h-9 border-4 border-[#54626f]/20 border-t-[#54626f] rounded-full animate-spin mx-auto" />
                  </div>
                ) : !summary ? (
                  <div className="text-center py-20 px-4 bg-[#e2eaeb]/40 rounded-2xl border border-dashed border-[#54626f]/25">
                    <Sparkles className="w-8 h-8 text-[#54626f]/60 mx-auto mb-2" />
                    <p className="text-base sm:text-[17px] font-bold text-[#1F2118]">
                      No summary generated yet
                    </p>
                    <p className="text-sm text-[#54626f] mt-1">
                      Click &quot;Generate AI Summary&quot; on the left to build structured notes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {parsedSections.map((sec, sIdx) => {
                      const bulletsOnly = sec.items.filter((i) => i.type === 'bullet');
                      const parasOnly = sec.items.filter((i) => i.type !== 'bullet');

                      return (
                        <div
                          key={sIdx}
                          className="rounded-2xl bg-[#f8fafb] border border-[#54626f]/15 p-5 sm:p-6 space-y-3"
                        >
                          <h3 className="text-lg sm:text-xl font-black uppercase tracking-wider text-[#1f3b4d] flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#6b4c35]" />
                            <span>{sec.heading}</span>
                          </h3>

                          {parasOnly.map((pItem, pIdx) => (
                            <p
                              key={`p-${pIdx}`}
                              className="text-base sm:text-[17px] text-[#1F2118] leading-relaxed"
                            >
                              {renderFormattedInline(pItem.text, 'summary')}
                            </p>
                          ))}

                          {bulletsOnly.length > 0 && (
                            <ul className="mt-2 space-y-2.5 rounded-2xl bg-[#eef4f5] border-l-4 border-[#6b4c35] p-4">
                              {bulletsOnly.map((bItem, bIdx) => (
                                <li
                                  key={bIdx}
                                  className="flex items-start gap-2.5 text-base sm:text-[17px] text-[#1f3b4d] font-medium leading-relaxed"
                                >
                                  <span className="mt-2 w-2.5 h-2.5 rounded-full bg-[#6b4c35] shrink-0" />
                                  <span className="flex-1">
                                    {renderFormattedInline(bItem.text, 'list')}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col h-full min-h-0">
                {/* Chat Header */}
                <div className="flex items-center justify-between border-b border-[#54626f]/15 pb-3.5 mb-4 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#54626f] text-white flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-[#1f3b4d] leading-tight">
                        Chat with this Document
                      </h2>
                      <p className="text-xs sm:text-sm text-[#54626f]/75 font-medium">
                        Ask anything &amp; get focused answers
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 bg-[#e2eaeb]/35 p-4 rounded-2xl border border-[#54626f]/10">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-[#54626f]/15 text-[#54626f] flex items-center justify-center mb-3 shadow-2xs">
                        <Bot className="w-6 h-6" />
                      </div>
                      <p className="text-base sm:text-[17px] font-bold text-[#1F2118]">
                        Start a conversation about this document
                      </p>
                      <p className="text-sm text-[#54626f]/75 mt-1 max-w-sm">
                        Say hi, ask for keywords, request the main concept, or ask for a real-life example.
                      </p>
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isUser = m.role === 'user';
                      return (
                        <div
                          key={idx}
                          className={`flex items-start gap-2.5 ${
                            isUser ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {!isUser && (
                            <div className="w-8 h-8 rounded-xl bg-[#54626f] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                              <Bot className="w-4 h-4" />
                            </div>
                          )}

                          <div
                            className={`rounded-2xl px-4 py-3.5 shadow-2xs ${
                              isUser
                                ? 'max-w-[78%] bg-[#54626f] text-white rounded-tr-xs'
                                : 'max-w-[90%] bg-white text-[#1F2118] border border-[#54626f]/15 rounded-tl-xs'
                            }`}
                          >
                            <FormattedMarkdownContent
                              content={m.content}
                              isUserMessage={isUser}
                            />
                          </div>

                          {isUser && (
                            <div className="w-8 h-8 rounded-xl bg-white border border-[#54626f]/20 text-[#54626f] flex items-center justify-center shrink-0 mt-0.5">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {chatLoading && (
                    <div className="flex items-center gap-2.5 justify-start">
                      <div className="w-8 h-8 rounded-xl bg-[#54626f] text-white flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-white border border-[#54626f]/15 px-4 py-3 rounded-2xl rounded-tl-xs flex items-center gap-1.5 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-[#54626f] animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-[#6b4c35] animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 rounded-full bg-[#54626f] animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={(e) => handleSendMessage(e, 'chat')}
                  className="flex flex-col sm:flex-row gap-2 shrink-0"
                >
                  <input
                    type="text"
                    placeholder="Ask a question about this document..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#54626f]/25 bg-[#f8fafb] text-[#1F2118] text-sm sm:text-base focus:outline-none focus:border-[#54626f]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleSendMessage(e, 'explain')}
                      disabled={chatLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#1f3b4d] bg-[#e2eaeb] hover:bg-[#d2dee0] transition disabled:opacity-50 cursor-pointer"
                    >
                      <Lightbulb className="w-4 h-4 text-[#6b4c35]" />
                      <span>Explain Concept</span>
                    </button>
                    <button
                      type="submit"
                      disabled={chatLoading || !inputMessage.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#54626f] hover:bg-[#1F2118] transition disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}