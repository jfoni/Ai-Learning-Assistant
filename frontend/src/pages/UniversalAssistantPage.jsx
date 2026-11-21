import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  loadUserDocumentsForAssistant,
  getSavedConversations,
  saveUserConversations,
  sendAssistantMessage,
} from '../services/universalAssistantService';
import { useTheme } from '../context/ThemeContext';
import AppSidebar from '../components/AppSidebar';
import {
  Menu,
  ArrowLeft,
  Send,
  FileText,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  RotateCcw,
  Minimize2,
  Lightbulb,
  ListOrdered,
  MessageSquare,
} from 'lucide-react';

const sanitizeDisplayText = (rawText = '') => {
  return String(rawText || '')
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/```[a-zA-Z0-9_-]*\n?/g, '').replace(/```/g, '')
    )
    .replace(/[#*$%^&~`|]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const isEmptyImageAreaPrompt = (text = '') => {
  return /\b(image|photo|picture|diagram|img|chobi|chobir|image er jayga|empty)\b/i.test(
    String(text || '')
  );
};

const createNewConversation = (mode = 'general', doc = null) => ({
  id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  title:
    mode === 'document' && doc?.title
      ? `Doc: ${doc.title}`
      : 'New Learning Session',
  mode,
  documentId: mode === 'document' ? doc?._id || doc?.id || '' : '',
  documentTitle: mode === 'document' ? doc?.title || '' : '',
  updatedAt: new Date().toISOString(),
  messages: [],
});

const parseFormattedBlocks = (rawText = '') => {
  const cleaned = sanitizeDisplayText(rawText);
  const lines = cleaned.split('\n');
  const blocks = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push({ type: 'ul', items: [...currentList] });
      currentList = [];
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    const bulletMatch = trimmed.match(/^(?:[-•]+|\d+[.)])\s+(.*)$/);
    if (bulletMatch) {
      currentList.push(sanitizeDisplayText(bulletMatch[1]));
    } else {
      flushList();
      blocks.push({ type: 'p', text: sanitizeDisplayText(trimmed) });
    }
  }

  flushList();
  return blocks;
};

function FormattedMessageContent({ content, isDark, keepImageEmpty = false }) {
  const blocks = parseFormattedBlocks(content);

  if (blocks.length === 0) {
    return <span>{sanitizeDisplayText(content)}</span>;
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, idx) => {
        if (block.type === 'ul') {
          return (
            <ul
              key={idx}
              className={`list-disc pl-7 space-y-3 m-0 rounded-2xl p-4 border ${
                isDark
                  ? 'bg-[#231F2C]/90 border-purple-400/20 marker:text-purple-300 text-[#F3F0FA]'
                  : 'bg-white border-[#54626f]/20 marker:text-[#2F5D68] text-[#1F2118]'
              }`}
              style={{ fontSize: '21px' }}
            >
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed pl-1 break-words">
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p
            key={idx}
            className="leading-relaxed m-0 break-words"
            style={{ fontSize: '21px' }}
          >
            {block.text}
          </p>
        );
      })}

      {keepImageEmpty && (
        <div
          aria-label="Empty image area"
          className={`w-full min-h-[140px] rounded-2xl border border-dashed ${
            isDark
              ? 'border-purple-400/30 bg-[#1B1723]/60'
              : 'border-[#54626f]/30 bg-white/60'
          }`}
        />
      )}
    </div>
  );
}

export default function UniversalAssistantPage() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [userId, setUserId] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [mode, setMode] = useState('general');

  const [preferences, setPreferences] = useState({
    level: 'University',
    style: 'Detailed',
    language: 'English',
  });

  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState('');
  const [editingChatId, setEditingChatId] = useState('');
  const [editingTitle, setEditingTitle] = useState('');

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const activeConversation =
    conversations.find((c) => c.id === activeChatId) || null;

  const selectedDocument =
    documents.find((d) => String(d._id || d.id) === String(selectedDocId)) ||
    null;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/overview');
    }
  };

  const persistConversations = useCallback((uid, nextList) => {
    setConversations(nextList);
    if (uid) {
      saveUserConversations(uid, nextList);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      const uid = user?.uid || '';
      setUserId(uid);

      if (!uid) {
        setConversations([]);
        setActiveChatId('');
        return;
      }

      const docs = await loadUserDocumentsForAssistant(uid);
      setDocuments(docs);
      if (docs.length > 0) {
        setSelectedDocId((prev) => prev || String(docs[0]._id || docs[0].id));
      }

      const saved = getSavedConversations(uid);
      if (saved.length > 0) {
        setConversations(saved);
        setActiveChatId(saved[0].id);
        setMode(saved[0].mode || 'general');
        if (saved[0].documentId) {
          setSelectedDocId(String(saved[0].documentId));
        }
      } else {
        const initial = createNewConversation('general', null);
        setConversations([initial]);
        setActiveChatId(initial.id);
        saveUserConversations(uid, [initial]);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages?.length, sending]);

  const handleNewChat = (targetMode = mode) => {
    const docObj = targetMode === 'document' ? selectedDocument : null;
    const fresh = createNewConversation(targetMode, docObj);
    const nextList = [fresh, ...conversations];
    persistConversations(userId, nextList);
    setActiveChatId(fresh.id);
    setErrorMsg('');
  };

  const handleSelectConversation = (chat) => {
    setActiveChatId(chat.id);
    setMode(chat.mode || 'general');
    if (chat.documentId) {
      setSelectedDocId(String(chat.documentId));
    }
    setErrorMsg('');
  };

  const handleStartRename = (chat, e) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleSaveRename = (chatId, e) => {
    e.stopPropagation();
    const trimmed = sanitizeDisplayText(editingTitle);
    if (!trimmed) return;
    const nextList = conversations.map((c) =>
      c.id === chatId
        ? { ...c, title: trimmed, updatedAt: new Date().toISOString() }
        : c
    );
    persistConversations(userId, nextList);
    setEditingChatId('');
  };

  const handleDeleteConversation = (chatId, e) => {
    e.stopPropagation();
    const filtered = conversations.filter((c) => c.id !== chatId);
    if (filtered.length === 0) {
      const fresh = createNewConversation(
        mode,
        mode === 'document' ? selectedDocument : null
      );
      persistConversations(userId, [fresh]);
      setActiveChatId(fresh.id);
      return;
    }
    persistConversations(userId, filtered);
    if (activeChatId === chatId) {
      setActiveChatId(filtered[0].id);
    }
  };

  const runPrompt = async ({
    customMessage = '',
    action = 'normal',
    targetAnswer = '',
  }) => {
    const trimmedMessage = String(customMessage || inputText).trim();

    if (action === 'normal' && !trimmedMessage) {
      setErrorMsg('Please write any question or topic first.');
      return;
    }

    const effectiveUid = userId || auth.currentUser?.uid || 'guest-session';
    const hasDocSelected = mode === 'document' && Boolean(selectedDocument);
    const effectiveMode = hasDocSelected ? 'document' : 'general';

    if (mode === 'document' && !selectedDocument) {
      setMode('general');
    }

    setErrorMsg('');
    setSending(true);

    let currentChat = activeConversation;
    let baseList = [...conversations];

    if (!currentChat) {
      currentChat = createNewConversation(
        effectiveMode,
        hasDocSelected ? selectedDocument : null
      );
      baseList = [currentChat, ...baseList];
      setActiveChatId(currentChat.id);
    }

    const displayUserContent =
      action === 'normal'
        ? trimmedMessage
        : trimmedMessage ||
          `${action.replace('_', ' ')} on previous answer`;

    const userMsg = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: displayUserContent,
      mode: effectiveMode,
      documentTitle: hasDocSelected ? selectedDocument?.title : null,
      createdAt: new Date().toISOString(),
    };

    const updatedMessagesWithUser = [...(currentChat.messages || []), userMsg];

    const autoTitle =
      currentChat.messages.length === 0
        ? trimmedMessage
          ? sanitizeDisplayText(trimmedMessage).slice(0, 44)
          : currentChat.title
        : currentChat.title;

    const optimisticList = baseList.map((c) =>
      c.id === currentChat.id
        ? {
            ...c,
            title: autoTitle,
            mode: effectiveMode,
            documentId: hasDocSelected
              ? String(selectedDocument?._id || selectedDocument?.id || '')
              : '',
            documentTitle: hasDocSelected ? selectedDocument?.title || '' : '',
            updatedAt: new Date().toISOString(),
            messages: updatedMessagesWithUser,
          }
        : c
    );
    persistConversations(effectiveUid, optimisticList);

    if (action === 'normal') {
      setInputText('');
    }

    try {
      const data = await sendAssistantMessage({
        userId: effectiveUid,
        mode: effectiveMode,
        message: trimmedMessage,
        document: hasDocSelected ? selectedDocument : null,
        history: updatedMessagesWithUser.slice(-8),
        preferences,
        action,
        targetAnswer: sanitizeDisplayText(targetAnswer),
      });

      const assistantMsg = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: sanitizeDisplayText(data.reply),
        keepImageEmpty: isEmptyImageAreaPrompt(trimmedMessage),
        mode: effectiveMode,
        documentTitle: hasDocSelected ? selectedDocument?.title : null,
        createdAt: new Date().toISOString(),
      };

      const finalList = optimisticList.map((c) =>
        c.id === currentChat.id
          ? {
              ...c,
              updatedAt: new Date().toISOString(),
              messages: [...updatedMessagesWithUser, assistantMsg],
            }
          : c
      );
      persistConversations(effectiveUid, finalList);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to get a response from the assistant.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    runPrompt({ customMessage: inputText, action: 'normal' });
  };

  const messages = Array.isArray(activeConversation?.messages)
    ? activeConversation.messages
    : [];

  return (
    <div
      className={`min-h-screen flex relative ${
        isDark ? 'bg-[#18151F] text-[#F3F0FA]' : 'bg-[#e2eaeb] text-[#1F2118]'
      }`}
      style={{ fontSize: '23px' }}
    >
      <AppSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Header */}
          <div
            className={`border rounded-3xl p-6 shadow-sm flex items-start justify-between gap-4 ${
              isDark
                ? 'bg-[#231F2C] border-purple-400/20'
                : 'bg-white/95 border-[#54626f]/20'
            }`}
          >
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                aria-label="Toggle sidebar"
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition cursor-pointer shrink-0 mt-1 ${
                  isDark
                    ? 'bg-[#2E283D] border-purple-400/15 text-[#EDE8F8] hover:bg-[#3A324D]'
                    : 'bg-[#e2eaeb] border-[#54626f]/15 text-[#1F2937] hover:bg-[#54626f] hover:text-white'
                }`}
              >
                <Menu className="w-6 h-6" />
              </button>

              <div className="min-w-0 flex-1">
                <h1
                  className="font-black tracking-tight"
                  style={{ fontSize: '40px', lineHeight: 1.2 }}
                >
                  AI Universal Learning Assistant
                </h1>
                <p
                  className={`mt-1 ${
                    isDark
                      ? 'text-[#C5BCE0] font-semibold'
                      : 'text-[#54626f] font-medium'
                  }`}
                  style={{ fontSize: '21px' }}
                >
                  Speaks English by default, switches to Bangla when you ask in Bangla, and keeps image areas empty
                </p>

                <div className="flex items-center gap-2.5 flex-wrap mt-4">
                  <button
                    type="button"
                    onClick={() => handleNewChat(mode)}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold transition cursor-pointer ${
                      isDark
                        ? 'bg-purple-300 text-[#18151F] hover:bg-purple-200 font-black'
                        : 'bg-[#54626f] text-white hover:bg-[#1F2118]'
                    }`}
                    style={{ fontSize: '19px' }}
                  >
                    <Plus className="w-5 h-5" />
                    <span>New Chat</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBack}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold transition cursor-pointer shrink-0 ml-auto ${
                isDark
                  ? 'bg-[#2E283D] border-purple-400/20 text-[#F3F0FA] hover:bg-[#3A324D]'
                  : 'bg-[#e2eaeb] border-[#54626f]/20 text-[#1F2118] hover:bg-[#d2dee0]'
              }`}
              style={{ fontSize: '18px' }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>

          {/* Mode & Personalization Bar */}
          <div
            className={`border rounded-3xl p-5 shadow-sm space-y-4 ${
              isDark
                ? 'bg-[#231F2C] border-purple-400/20'
                : 'bg-white/95 border-[#54626f]/20'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setMode('general')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition cursor-pointer ${
                    mode === 'general'
                      ? isDark
                        ? 'bg-purple-300 text-[#18151F] font-black'
                        : 'bg-[#54626f] text-white'
                      : isDark
                      ? 'bg-[#2E283D] text-[#D8D0EC] hover:bg-[#3A324D]'
                      : 'bg-[#e2eaeb] text-[#1F2118] hover:bg-[#d2dee0]'
                  }`}
                  style={{ fontSize: '19px' }}
                >
                  <Sparkles className="w-5 h-5" />
                  <span>General Learning Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('document')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition cursor-pointer ${
                    mode === 'document'
                      ? isDark
                        ? 'bg-purple-300 text-[#18151F] font-black'
                        : 'bg-[#54626f] text-white'
                      : isDark
                      ? 'bg-[#2E283D] text-[#D8D0EC] hover:bg-[#3A324D]'
                      : 'bg-[#e2eaeb] text-[#1F2118] hover:bg-[#d2dee0]'
                  }`}
                  style={{ fontSize: '19px' }}
                >
                  <FileText className="w-5 h-5" />
                  <span>Document Learning Mode</span>
                </button>
              </div>

              {mode === 'document' && (
                <div className="flex items-center gap-2.5 flex-1 min-w-[240px] max-w-md">
                  <label
                    htmlFor="assistant-doc-select"
                    className={`font-bold shrink-0 ${
                      isDark ? 'text-[#D8D0EC]' : 'text-[#54626f]'
                    }`}
                    style={{ fontSize: '18px' }}
                  >
                    Document:
                  </label>
                  <select
                    id="assistant-doc-select"
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2 font-semibold outline-none ${
                      isDark
                        ? 'bg-[#1B1723] border-purple-400/25 text-[#F3F0FA]'
                        : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118]'
                    }`}
                    style={{ fontSize: '18px' }}
                  >
                    {documents.length === 0 ? (
                      <option value="">No uploaded doc (answers any question)</option>
                    ) : (
                      documents.map((doc) => {
                        const id = String(doc._id || doc.id);
                        return (
                          <option key={id} value={id}>
                            {doc.title || 'Untitled Document'}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
              )}
            </div>

            <div
              className={`grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-dashed ${
                isDark ? 'border-purple-400/20' : 'border-[#54626f]/20'
              }`}
            >
              <div>
                <label
                  className={`block font-extrabold uppercase tracking-wider mb-1 ${
                    isDark ? 'text-purple-300/80' : 'text-[#54626f]'
                  }`}
                  style={{ fontSize: '14px' }}
                >
                  Learning Level
                </label>
                <select
                  value={preferences.level}
                  onChange={(e) =>
                    setPreferences((p) => ({ ...p, level: e.target.value }))
                  }
                  className={`w-full rounded-xl border px-3 py-2 font-bold outline-none ${
                    isDark
                      ? 'bg-[#1B1723] border-purple-400/25 text-[#F3F0FA]'
                      : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118]'
                  }`}
                  style={{ fontSize: '18px' }}
                >
                  <option value="School">School</option>
                  <option value="College">College</option>
                  <option value="University">University</option>
                </select>
              </div>

              <div>
                <label
                  className={`block font-extrabold uppercase tracking-wider mb-1 ${
                    isDark ? 'text-purple-300/80' : 'text-[#54626f]'
                  }`}
                  style={{ fontSize: '14px' }}
                >
                  Explanation Style
                </label>
                <select
                  value={preferences.style}
                  onChange={(e) =>
                    setPreferences((p) => ({ ...p, style: e.target.value }))
                  }
                  className={`w-full rounded-xl border px-3 py-2 font-bold outline-none ${
                    isDark
                      ? 'bg-[#1B1723] border-purple-400/25 text-[#F3F0FA]'
                      : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118]'
                  }`}
                  style={{ fontSize: '18px' }}
                >
                  <option value="Simple">Simple</option>
                  <option value="Detailed">Detailed</option>
                  <option value="Step-by-Step">Step-by-Step</option>
                </select>
              </div>

              <div>
                <label
                  className={`block font-extrabold uppercase tracking-wider mb-1 ${
                    isDark ? 'text-purple-300/80' : 'text-[#54626f]'
                  }`}
                  style={{ fontSize: '14px' }}
                >
                  Default Language
                </label>
                <select
                  value={preferences.language}
                  onChange={(e) =>
                    setPreferences((p) => ({ ...p, language: e.target.value }))
                  }
                  className={`w-full rounded-xl border px-3 py-2 font-bold outline-none ${
                    isDark
                      ? 'bg-[#1B1723] border-purple-400/25 text-[#F3F0FA]'
                      : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118]'
                  }`}
                  style={{ fontSize: '18px' }}
                >
                  <option value="English">English</option>
                  <option value="Bangla">Bangla</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chat History */}
            <div
              className={`lg:col-span-4 border rounded-3xl p-5 shadow-sm space-y-4 h-fit ${
                isDark
                  ? 'bg-[#231F2C] border-purple-400/20'
                  : 'bg-white/95 border-[#54626f]/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare
                  className={`w-5 h-5 ${
                    isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                  }`}
                />
                <h2 className="font-black" style={{ fontSize: '24px' }}>
                  Chat History
                </h2>
              </div>

              {conversations.length === 0 ? (
                <p
                  className={`${isDark ? 'text-[#B5ACC9]' : 'text-[#54626f]'}`}
                  style={{ fontSize: '19px' }}
                >
                  No saved conversations yet.
                </p>
              ) : (
                <ul className="space-y-3 list-none m-0 p-0 max-h-[540px] overflow-y-auto pr-1">
                  {conversations.map((chat) => {
                    const isSelected = chat.id === activeChatId;
                    const isEditing = editingChatId === chat.id;

                    return (
                      <li
                        key={chat.id}
                        onClick={() => handleSelectConversation(chat)}
                        className={`rounded-2xl border p-4 transition cursor-pointer ${
                          isSelected
                            ? isDark
                              ? 'bg-[#342C47] border-purple-300/50'
                              : 'bg-[#e2eaeb] border-[#54626f]/40'
                            : isDark
                            ? 'bg-[#1B1723] border-purple-400/15 hover:bg-[#2A2438]'
                            : 'bg-[#f8fafb] border-[#54626f]/15 hover:bg-[#eef3f4]'
                        }`}
                      >
                        {isEditing ? (
                          <div
                            className="flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className={`flex-1 rounded-lg border px-2.5 py-1 font-bold outline-none ${
                                isDark
                                  ? 'bg-[#231F2C] border-purple-300/40 text-white'
                                  : 'bg-white border-[#54626f]/30 text-[#1F2118]'
                              }`}
                              style={{ fontSize: '18px' }}
                            />
                            <button
                              type="button"
                              onClick={(e) => handleSaveRename(chat.id, e)}
                              aria-label="Save title"
                              className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingChatId('');
                              }}
                              aria-label="Cancel rename"
                              className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p
                                className="font-extrabold truncate"
                                style={{ fontSize: '20px' }}
                              >
                                {sanitizeDisplayText(chat.title)}
                              </p>
                              <span
                                className={`inline-block mt-1.5 font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                  chat.mode === 'document'
                                    ? isDark
                                      ? 'bg-purple-400/20 text-purple-300'
                                      : 'bg-[#54626f]/15 text-[#1f3b4d]'
                                    : isDark
                                    ? 'bg-[#2E283D] text-[#D8D0EC]'
                                    : 'bg-white text-[#54626f]'
                                }`}
                                style={{ fontSize: '13px' }}
                              >
                                {chat.mode === 'document'
                                  ? 'Document Mode'
                                  : 'General Mode'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleStartRename(chat, e)}
                                aria-label="Rename conversation"
                                className={`p-1.5 rounded-lg transition cursor-pointer ${
                                  isDark
                                    ? 'text-[#B5ACC9] hover:bg-[#2E283D] hover:text-white'
                                    : 'text-[#54626f] hover:bg-white'
                                }`}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleDeleteConversation(chat.id, e)
                                }
                                aria-label="Delete conversation"
                                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Active Chat Window */}
            <div
              className={`lg:col-span-8 border rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between min-h-[560px] ${
                isDark
                  ? 'bg-[#231F2C] border-purple-400/20'
                  : 'bg-white/95 border-[#54626f]/20'
              }`}
            >
              <div className="space-y-4 overflow-y-auto max-h-[480px] pr-1">
                {messages.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Sparkles
                      className={`w-10 h-10 mx-auto ${
                        isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                      }`}
                    />
                    <h3 className="font-black" style={{ fontSize: '26px' }}>
                      {mode === 'document' && selectedDocument
                        ? `Ask About ${sanitizeDisplayText(selectedDocument.title)} or Anything Else`
                        : 'Ask Any Question You Want'}
                    </h3>
                    <p
                      className={`max-w-xl mx-auto ${
                        isDark ? 'text-[#B5ACC9]' : 'text-[#54626f]'
                      }`}
                      style={{ fontSize: '20px' }}
                    >
                      Ask in English by default, or ask in Bangla whenever you want Bangla replies.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isUser ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`max-w-[92%] rounded-2xl px-5 py-4 border ${
                            isUser
                              ? isDark
                                ? 'bg-[#342C47] border-purple-300/40 text-[#F3F0FA] font-semibold'
                                : 'bg-[#54626f] border-[#54626f] text-white font-semibold'
                              : isDark
                              ? 'bg-[#1B1723] border-purple-400/15 text-[#EAE5F5]'
                              : 'bg-[#f8fafb] border-[#54626f]/15 text-[#1F2118]'
                          }`}
                          style={{ fontSize: '21px' }}
                        >
                          {isUser ? (
                            <p
                              className="m-0 leading-relaxed break-words"
                              style={{ fontSize: '21px' }}
                            >
                              {sanitizeDisplayText(msg.content)}
                            </p>
                          ) : (
                            <FormattedMessageContent
                              content={msg.content}
                              isDark={isDark}
                              keepImageEmpty={Boolean(msg.keepImageEmpty)}
                            />
                          )}
                        </div>

                        {!isUser && (
                          <div className="flex flex-wrap items-center gap-2 mt-2.5">
                            <button
                              type="button"
                              disabled={sending}
                              onClick={() =>
                                runPrompt({
                                  action: 'explain_again',
                                  targetAnswer: msg.content,
                                })
                              }
                              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition cursor-pointer disabled:opacity-50 ${
                                isDark
                                  ? 'bg-[#2E283D] text-[#EDE8F8] hover:bg-[#3A324D]'
                                  : 'bg-[#e2eaeb] text-[#1F2118] hover:bg-[#d2dee0]'
                              }`}
                              style={{ fontSize: '17px' }}
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>Explain Again</span>
                            </button>

                            <button
                              type="button"
                              disabled={sending}
                              onClick={() =>
                                runPrompt({
                                  action: 'simplify',
                                  targetAnswer: msg.content,
                                })
                              }
                              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition cursor-pointer disabled:opacity-50 ${
                                isDark
                                  ? 'bg-[#2E283D] text-[#EDE8F8] hover:bg-[#3A324D]'
                                  : 'bg-[#e2eaeb] text-[#1F2118] hover:bg-[#d2dee0]'
                              }`}
                              style={{ fontSize: '17px' }}
                            >
                              <Minimize2 className="w-4 h-4" />
                              <span>Simplify This</span>
                            </button>

                            <button
                              type="button"
                              disabled={sending}
                              onClick={() =>
                                runPrompt({
                                  action: 'example',
                                  targetAnswer: msg.content,
                                })
                              }
                              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition cursor-pointer disabled:opacity-50 ${
                                isDark
                                  ? 'bg-[#2E283D] text-[#EDE8F8] hover:bg-[#3A324D]'
                                  : 'bg-[#e2eaeb] text-[#1F2118] hover:bg-[#d2dee0]'
                              }`}
                              style={{ fontSize: '17px' }}
                            >
                              <Lightbulb className="w-4 h-4" />
                              <span>Give an Example</span>
                            </button>

                            <button
                              type="button"
                              disabled={sending}
                              onClick={() =>
                                runPrompt({
                                  action: 'step_by_step',
                                  targetAnswer: msg.content,
                                })
                              }
                              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition cursor-pointer disabled:opacity-50 ${
                                isDark
                                  ? 'bg-[#2E283D] text-[#EDE8F8] hover:bg-[#3A324D]'
                                  : 'bg-[#e2eaeb] text-[#1F2118] hover:bg-[#d2dee0]'
                              }`}
                              style={{ fontSize: '17px' }}
                            >
                              <ListOrdered className="w-4 h-4" />
                              <span>Step-by-Step</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {sending && (
                  <div
                    className={`font-bold ${
                      isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                    }`}
                    style={{ fontSize: '20px' }}
                  >
                    Thinking...
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Error & Input Box */}
              <div
                className={`pt-4 mt-4 border-t space-y-3 ${
                  isDark ? 'border-purple-400/20' : 'border-[#54626f]/20'
                }`}
              >
                {errorMsg && (
                  <p
                    className="font-bold text-rose-400"
                    style={{ fontSize: '18px' }}
                  >
                    {sanitizeDisplayText(errorMsg)}
                  </p>
                )}

                <form
                  onSubmit={handleFormSubmit}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder=""
                    aria-label="Type your message"
                    className={`flex-1 min-w-0 rounded-2xl border px-4 py-3.5 font-medium outline-none transition ${
                      isDark
                        ? 'bg-[#1B1723] border-purple-400/25 text-[#F3F0FA] focus:border-purple-300'
                        : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118] focus:border-[#54626f]'
                    }`}
                    style={{ fontSize: '21px' }}
                  />

                  <button
                    type="submit"
                    disabled={sending}
                    className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition cursor-pointer shrink-0 disabled:opacity-50 ${
                      isDark
                        ? 'bg-purple-300 text-[#18151F] hover:bg-purple-200 font-black'
                        : 'bg-[#54626f] text-white hover:bg-[#1F2118]'
                    }`}
                    style={{ fontSize: '20px' }}
                  >
                    <Send className="w-5 h-5" />
                    <span>Ask</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}