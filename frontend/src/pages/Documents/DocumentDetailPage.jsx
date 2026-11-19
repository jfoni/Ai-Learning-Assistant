import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';
import StyledChatUl, {
  cleanDisplayText,
  renderFormattedInline,
} from '../../components/StyledChatUl';
import {
  ArrowLeft,
  Sparkles,
  MessageSquare,
  FileText,
  Send,
  Bot,
  User,
  Lightbulb,
  Plus,
  History,
  Trash2,
} from 'lucide-react';

const createNewSessionId = () =>
  `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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

const FormattedMarkdownContent = ({ content, isUserMessage = false }) => {
  if (!content) return null;

  if (isUserMessage) {
    return (
      <p className="text-lg sm:text-xl leading-relaxed whitespace-pre-line font-medium">
        {content}
      </p>
    );
  }

  const lines = String(content).split('\n');
  const blocks = [];
  let bulletBuffer = [];

  const flushBullets = (keyPrefix) => {
    if (bulletBuffer.length > 0) {
      blocks.push(<StyledChatUl key={`${keyPrefix}-chat-ul`} items={bulletBuffer} />);
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
      blocks.push(<hr key={`hr-${idx}`} className="my-3 border-[#54626f]/20" />);
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
          className="text-xl sm:text-2xl font-black text-[#1f3b4d] tracking-tight mt-3.5 mb-2"
        >
          {cleanHeading}
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
        className="text-lg sm:text-xl text-[#1F2118] leading-relaxed my-2"
      >
        {renderFormattedInline(cleanedPara)}
      </p>
    );
  });

  flushBullets('end');

  return <div className="space-y-1">{blocks}</div>;
};

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

const handleStrictLocalIntent = (rawInput, userName) => {
  const normalized = String(rawInput || '')
    .toLowerCase()
    .replace(/[!?.,]+$/g, '')
    .trim();

  const greetingWords = [
    'hi',
    'hey',
    'hello',
    'hii',
    'hiii',
    'yo',
    'sup',
    'good morning',
    'good afternoon',
    'good evening',
  ];
  if (greetingWords.includes(normalized)) {
    return userName
      ? `Hello ${userName}! How can I help you today?`
      : 'Hello! How can I help you today?';
  }

  const statusPhrases = [
    'how are you',
    'how r u',
    'how are u',
    'whats up',
    "what's up",
    'how is it going',
  ];
  if (statusPhrases.includes(normalized)) {
    return userName
      ? `I'm good, ${userName}! How are you? How can I help you?`
      : "I'm good! How are you? How can I help you?";
  }

  return null;
};

const buildFocusedPrompt = (userText, docTitle, mode) => {
  const lower = String(userText || '').toLowerCase();

  if (mode === 'explain') {
    const focusTopic = userText && userText !== 'Explain Concept' ? userText : docTitle;
    return [
      `Document topic: "${docTitle}".`,
      `Topic to explain: "${focusTopic}".`,
      'Explain the full concept clearly and simply in easy words, and also include a clear real-life example so it is easy to understand.',
    ].join(' ');
  }

  if (lower.includes('example')) {
    return [
      `Document topic: "${docTitle}".`,
      `User request: "${userText}".`,
      'Explain the concept briefly and give a clear real-life example in easy, natural words.',
    ].join(' ');
  }

  if (lower.includes('keyword')) {
    return [
      `Document topic: "${docTitle}".`,
      `User request: "${userText}".`,
      'List ONLY the key keywords from this topic/document as short bullet points (- ). Do not write extra paragraphs or definitions.',
    ].join(' ');
  }

  if (lower.includes('main concept') || lower.includes('core concept') || lower.includes('concept')) {
    return [
      `Document topic: "${docTitle}".`,
      `User request: "${userText}".`,
      'Explain the main concept clearly and completely in easy, natural words with a real-life example.',
    ].join(' ');
  }

  return [
    `Document topic: "${docTitle}".`,
    `User request: "${userText}".`,
    'Answer directly and clearly in easy, natural words.',
  ].join(' ');
};

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const [activeTab, setActiveTab] = useState('chat');
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(() => createNewSessionId());
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const refreshSessions = async (uid) => {
    if (!uid) return [];
    const historyRes = await axios.get(`http://localhost:8000/api/documents/${id}/chat`, {
      params: { userId: uid },
    });
    const list = Array.isArray(historyRes.data?.data?.sessions)
      ? historyRes.data.data.sessions
      : [];
    setSessions(list);
    return list;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserId('');
        setUserName('');
        setSessions([]);
        setMessages([]);
        setLoading(false);
        return;
      }

      setUserId(user.uid);
      setUserName(getUserDisplayName(user));

      try {
        const [docRes, historyRes] = await Promise.all([
          axios.get(`http://localhost:8000/api/documents/${user.uid}`),
          axios.get(`http://localhost:8000/api/documents/${id}/chat`, {
            params: { userId: user.uid },
          }),
        ]);

        const docs = docRes.data?.data || [];
        const found = docs.find((doc) => doc._id === id);
        setDocument(found || null);

        const loadedSessions = Array.isArray(historyRes.data?.data?.sessions)
          ? historyRes.data.data.sessions
          : [];
        setSessions(loadedSessions);

        if (loadedSessions.length > 0) {
          setActiveSessionId(loadedSessions[0].sessionId);
          setMessages(loadedSessions[0].messages || []);
        } else {
          setActiveSessionId(createNewSessionId());
          setMessages([]);
        }
      } catch (err) {
        console.error('Error fetching document details or chat history:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // Start a fresh chat session without removing older saved chats
  const handleNewChat = () => {
    setActiveTab('chat');
    setShowHistoryDrawer(false);
    setActiveSessionId(createNewSessionId());
    setMessages([]);
    setInputMessage('');
  };

  // Switch to a previous chat session from Chat History
  const handleSelectSession = (session) => {
    setActiveTab('chat');
    setShowHistoryDrawer(false);
    setActiveSessionId(session.sessionId);
    setMessages(Array.isArray(session.messages) ? session.messages : []);
  };

  // Delete a single saved chat session from database and update UI state
  const handleDeleteSession = async (e, targetSessionId) => {
    e.stopPropagation();
    if (!targetSessionId) return;

    const updatedSessions = sessions.filter((s) => s.sessionId !== targetSessionId);
    setSessions(updatedSessions);

    if (targetSessionId === activeSessionId) {
      if (updatedSessions.length > 0) {
        setActiveSessionId(updatedSessions[0].sessionId);
        setMessages(updatedSessions[0].messages || []);
      } else {
        setActiveSessionId(createNewSessionId());
        setMessages([]);
      }
    }

    try {
      await axios.delete(`http://localhost:8000/api/documents/${id}/chat`, {
        params: { userId, sessionId: targetSessionId },
      });
      await refreshSessions(userId);
    } catch (err) {
      console.error('Failed to delete chat session:', err);
    }
  };

  const saveLocalExchange = async (uid, sessId, userText, assistantText) => {
    if (!uid) return;
    try {
      await axios.post(`http://localhost:8000/api/documents/${id}/chat`, {
        userId: uid,
        sessionId: sessId,
        question: userText,
        displayQuestion: userText,
        mode: 'local',
        skipAi: true,
        localAnswer: assistantText,
      });
      await refreshSessions(uid);
    } catch (err) {
      console.error('Failed to save local chat exchange:', err);
    }
  };

  const handleGenerateSummary = async () => {
    try {
      setAnalyzing(true);
      const res = await axios.post(`http://localhost:8000/api/documents/${id}/analyze`, {
        instruction:
          'Provide a clear summary of this document in simple, easy words with short bullet points (- ) and a real-life example where relevant.',
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

    const currentSessionId = activeSessionId || createNewSessionId();
    if (!activeSessionId) {
      setActiveSessionId(currentSessionId);
    }

    const topicLabel = document?.title || 'this document';
    const userDisplayMsg =
      customMode === 'explain'
        ? trimmedInput
          ? `${trimmedInput} — Explain Concept`
          : 'Explain Concept'
        : trimmedInput;

    setInputMessage('');
    setMessages((prev) => [...prev, { role: 'user', content: userDisplayMsg }]);

    if (customMode === 'chat') {
      const localReply = handleStrictLocalIntent(trimmedInput, userName);
      if (localReply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: localReply }]);
        await saveLocalExchange(userId, currentSessionId, userDisplayMsg, localReply);
        return;
      }
    }

    setChatLoading(true);
    const focusedQuestion = buildFocusedPrompt(
      trimmedInput || 'Explain Concept',
      topicLabel,
      customMode
    );

    try {
      const res = await axios.post(`http://localhost:8000/api/documents/${id}/chat`, {
        userId,
        sessionId: currentSessionId,
        question: focusedQuestion,
        displayQuestion: userDisplayMsg,
        mode: customMode,
      });
      const aiReply = res.data?.data?.answer || 'No response generated.';
      setMessages((prev) => [...prev, { role: 'assistant', content: aiReply }]);
      await refreshSessions(userId);
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
          <div className="bg-white/95 rounded-2xl p-6 shadow-sm border border-[#54626f]/20 lg:col-span-2 flex flex-col h-[680px] relative">
            {activeTab === 'summary' ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="flex items-center justify-between border-b border-[#54626f]/15 pb-4 mb-5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#1f3b4d]">
                      AI Study Summary
                    </h2>
                    <p className="text-base sm:text-[17px] text-[#54626f] mt-0.5">
                      Easy study notes with simple examples and key points
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
                    <p className="text-base sm:text-[17px] text-[#54626f] mt-1">
                      Click &quot;Generate AI Summary&quot; on the left to build easy notes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {parsedSections.map((sec, sIdx) => {
                      const bulletsOnly = sec.items
                        .filter((i) => i.type === 'bullet')
                        .map((i) => i.text);
                      const parasOnly = sec.items.filter((i) => i.type !== 'bullet');

                      return (
                        <div
                          key={sIdx}
                          className="rounded-2xl bg-[#f8fafb] border border-[#54626f]/15 p-5 sm:p-6 space-y-3"
                        >
                          <h3 className="text-base sm:text-[17px] font-black uppercase tracking-wider text-[#1f3b4d]">
                            {sec.heading}
                          </h3>

                          {parasOnly.map((pItem, pIdx) => (
                            <p
                              key={`p-${pIdx}`}
                              className="text-base sm:text-[17px] text-[#1F2118] leading-relaxed"
                            >
                              {renderFormattedInline(pItem.text)}
                            </p>
                          ))}

                          {bulletsOnly.length > 0 && <StyledChatUl items={bulletsOnly} />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col h-full min-h-0">
                {/* Chat Header with New Chat & Chat History */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#54626f]/15 pb-3.5 mb-4 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#54626f] text-white flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-[#1f3b4d]">
                        Chat with this Document
                      </h2>
                      <p className="text-sm text-[#54626f]/75 font-medium">
                        Ask anything &amp; get easy answers
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#54626f] text-white hover:bg-[#1F2118] transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Chat</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowHistoryDrawer((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#e2eaeb] text-[#1f3b4d] hover:bg-[#d2dee0] transition cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5 text-[#2b6777]" />
                      <span>Chat History ({Number(sessions.length)})</span>
                    </button>
                  </div>
                </div>

                {/* Chat History Dropdown Panel */}
                {showHistoryDrawer && (
                  <div className="mb-3 p-3 rounded-2xl bg-[#f8fafb] border border-[#54626f]/20 max-h-48 overflow-y-auto shrink-0">
                    <p className="text-xs font-black uppercase tracking-wider text-[#1f3b4d] mb-2">
                      Saved Chats for this Document
                    </p>
                    {sessions.length === 0 ? (
                      <p className="text-sm text-[#54626f]">No saved chats yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {sessions.map((s) => {
                          const isCurrent = s.sessionId === activeSessionId;
                          return (
                            <div
                              key={s.sessionId}
                              onClick={() => handleSelectSession(s)}
                              className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between gap-2 transition cursor-pointer ${
                                isCurrent
                                  ? 'bg-[#e6f2f4] text-[#1f3b4d] font-bold border border-[#2b6777]/30'
                                  : 'bg-white text-[#1F2118] hover:bg-[#e2eaeb]/60 border border-[#54626f]/10'
                              }`}
                            >
                              <span className="truncate flex-1">{s.title || 'Untitled Chat'}</span>
                              <span className="text-xs text-[#54626f] shrink-0">
                                {Number(s.messages?.length || 0)} msgs
                              </span>
                              <button
                                type="button"
                                title="Delete chat"
                                onClick={(e) => handleDeleteSession(e, s.sessionId)}
                                className="p-1.5 rounded-lg text-[#54626f] hover:text-red-700 hover:bg-red-50 transition cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 bg-[#e2eaeb]/35 p-4 rounded-2xl border border-[#54626f]/10">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-[#54626f]/15 text-[#54626f] flex items-center justify-center mb-3 shadow-2xs">
                        <Bot className="w-6 h-6" />
                      </div>
                      <p className="text-base sm:text-[17px] font-bold text-[#1F2118]">
                        Start a new chat about this document
                      </p>
                      <p className="text-sm text-[#54626f]/75 mt-1 max-w-sm">
                        Say hi, ask for keywords, request the main concept, or ask for an easy example.
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