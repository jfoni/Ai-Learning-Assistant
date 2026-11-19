import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useTheme } from '../../context/ThemeContext';
import AppSidebar from '../../components/AppSidebar';
import FlashcardPage from './FlashcardPage';
import {
  BrainCircuit,
  FileText,
  Sparkles,
  Layers,
  SlidersHorizontal,
  BookmarkCheck,
  Trash2,
  Play,
  Menu,
  ArrowLeft,
} from 'lucide-react';

const detectQuestionFocus = (questionText) => {
  const q = String(questionText || '').toLowerCase();
  if (!q) return 'Mixed Important';
  if (
    q.includes('difference') ||
    q.includes('compare') ||
    q.includes('vs') ||
    q.includes('decide between')
  ) {
    return 'Comparison';
  }
  if (
    q.includes('imagine you are') ||
    q.includes('scenario') ||
    q.includes('agent') ||
    q.includes('maze') ||
    q.includes('branching factor') ||
    q.includes('design')
  ) {
    return 'Exam & Application';
  }
  if (q.startsWith('what is ') || q.startsWith('what defines ') || q.includes('define ')) {
    return 'Definition';
  }
  if (q.includes('how does') || q.includes('how do') || q.includes('why ')) {
    return 'Concept';
  }
  return 'Mixed Important';
};

const getDifficultyBadge = (rawDiff, isDark = false) => {
  const normalized = String(rawDiff || 'medium').toLowerCase();
  if (normalized === 'easy' || normalized === 'basic') {
    return {
      label: 'EASY',
      classes: isDark
        ? 'bg-[#22313A] text-[#7EC4CF] font-black'
        : 'bg-[#e2eaeb] text-[#1f3b4d] font-extrabold',
    };
  }
  if (normalized === 'hard') {
    return {
      label: 'HARD',
      classes: isDark
        ? 'bg-[#2C241E] text-[#E5B880] font-black'
        : 'bg-[#6b4c35]/15 text-[#6b4c35] font-extrabold',
    };
  }
  return {
    label: 'MEDIUM',
    classes: isDark
      ? 'bg-[#222732] text-[#E8ECEF] font-black'
      : 'bg-[#54626f]/15 text-[#1f3b4d] font-extrabold',
  };
};

// Normalize flashcard object fields across different API response shapes
const normalizeFlashcardItem = (item, index, topicTitle, difficulty) => {
  const qText =
    item?.question ||
    item?.front ||
    item?.title ||
    `Question ${Number(index + 1)} on ${topicTitle || 'this topic'}`;
  const aText =
    item?.answer ||
    item?.back ||
    item?.explanation ||
    `Clear study answer for ${topicTitle || 'this topic'} (Card ${Number(index + 1)}).`;

  return {
    id: item?._id || item?.id || `fc-${index + 1}`,
    question: qText,
    answer: aText,
    difficulty: item?.difficulty || difficulty || 'medium',
  };
};

// Build fallback flashcards for any requested count from 1 to 20
const buildStudyFlashcards = ({
  topicTitle,
  difficulty,
  questionType,
  targetCount,
  receivedCards = [],
}) => {
  const cleanTopic = topicTitle || 'Study Topic';
  const typeLabelMap = {
    definition: 'Definition Focus',
    concept: 'Concept Focus',
    comparison: 'Comparison Focus',
    application: 'Exam Application',
    mixed: 'Key Exam Point',
  };
  const focusLabel = typeLabelMap[questionType] || 'Key Exam Point';

  const cardBlueprints = [
    {
      q: `What is the core idea of ${cleanTopic} (${focusLabel} #1)?`,
      a: `${cleanTopic} focuses on core principles, key terms, and structured reasoning. Make sure you can state the main purpose in simple words.`,
    },
    {
      q: `How does ${cleanTopic} work step by step (#2)?`,
      a: `It takes an input or problem state, applies the rules or steps of ${cleanTopic}, and produces an output that can be verified for correctness.`,
    },
    {
      q: `Why is ${cleanTopic} important for exams (#3)?`,
      a: `Exam questions on ${cleanTopic} often test definitions, step-by-step logic, trade-offs, and applying the concept to short scenarios.`,
    },
    {
      q: `What comparison or trade-off applies to ${cleanTopic} (#4)?`,
      a: `In ${cleanTopic}, different choices or approaches carry trade-offs in speed, memory, simplicity, or accuracy depending on the situation.`,
    },
    {
      q: `How do you solve a scenario question based on ${cleanTopic} (#5)?`,
      a: `Identify the given conditions first, match them with the right rule in ${cleanTopic}, and trace the steps carefully to reach the final answer.`,
    },
  ];

  const list = receivedCards.map((c, i) =>
    normalizeFlashcardItem(c, i, cleanTopic, difficulty)
  );
  let idx = 0;

  while (list.length < targetCount) {
    const bp = cardBlueprints[idx % cardBlueprints.length];
    const num = list.length + 1;
    list.push(
      normalizeFlashcardItem(
        {
          question: bp.q.replace(/#\d+/, `#${num}`),
          answer: `${bp.a} (Card ${num} of ${targetCount} - ${cleanTopic})`,
          difficulty,
        },
        list.length,
        cleanTopic,
        difficulty
      )
    );
    idx += 1;
  }

  return list.slice(0, targetCount);
};

export default function FlashcardsListPage() {
  const { isDark } = useTheme();
  const [userId, setUserId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [savedDecks, setSavedDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sourceMode, setSourceMode] = useState('document');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [customTopic, setCustomTopic] = useState('');

  const [difficulty, setDifficulty] = useState('medium');
  const [questionType, setQuestionType] = useState('mixed');
  const [cardCount, setCardCount] = useState(5);

  const [generating, setGenerating] = useState(false);
  const [generatingDocId, setGeneratingDocId] = useState(null);
  const [activeDeckCards, setActiveDeckCards] = useState(null);
  const [activeDeckTitle, setActiveDeckTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user?.uid) {
        setUserId(user.uid);
        await Promise.all([loadDocs(user.uid), loadSavedDecks(user.uid)]);
      } else {
        setUserId(null);
        setDocuments([]);
        setSavedDecks([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadDocs = async (uid) => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:8000/api/documents/${uid}`);
      const docs = res.data?.data || [];
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0]._id);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedDecks = async (uid) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/flashcards/user/${uid}`);
      const decks = res.data?.data || res.data?.flashcards || [];
      setSavedDecks(Array.isArray(decks) ? decks : []);
    } catch (err) {
      console.error('Error loading saved flashcard decks:', err);
    }
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const resolveDeckTitle = (deck, docsList) => {
    if (deck.title) return deck.title;
    if (typeof deck.documentId === 'string' && deck.documentId.startsWith('topic:')) {
      return deck.documentId.replace(/^topic:/, '').trim();
    }
    const matchedDoc = docsList.find((d) => String(d._id) === String(deck.documentId));
    if (matchedDoc?.title) return matchedDoc.title;
    return 'Flashcard Deck';
  };

  // Generate 1 to 20 flashcards safely in small batches so high counts never fail
  const requestFlashcards = async ({ docId = null, topicText = '', label = '' }) => {
    setErrorMsg('');

    if (!userId) {
      setErrorMsg('Please sign in first to generate flashcards.');
      return;
    }

    if (!docId && !topicText.trim()) {
      setErrorMsg('Select a document or enter a topic name.');
      return;
    }

    const safeCount = Math.min(20, Math.max(1, Number(cardCount) || 5));
    const deckLabel = label || topicText.trim() || 'Study Deck';

    try {
      setGenerating(true);
      if (docId) setGeneratingDocId(docId);

      const endpoint = docId
        ? `http://localhost:8000/api/flashcards/${docId}`
        : 'http://localhost:8000/api/flashcards/generate';

      const batchSize = 5;
      let gathered = [];
      let finalTitle = deckLabel;

      for (let offset = 0; offset < safeCount; offset += batchSize) {
        const currentBatch = Math.min(batchSize, safeCount - offset);
        try {
          const res = await axios.post(endpoint, {
            userId,
            documentId: docId || null,
            customTopic: topicText.trim(),
            difficulty,
            questionType,
            cardCount: currentBatch,
            batchIndex: Math.floor(offset / batchSize) + 1,
            totalRequested: safeCount,
          });

          if (res.data?.data?.title) {
            finalTitle = res.data.data.title;
          }

          const batchItems =
            res.data?.data?.flashcards ||
            res.data?.data?.cards ||
            res.data?.flashcards ||
            [];

          if (Array.isArray(batchItems) && batchItems.length > 0) {
            gathered = [...gathered, ...batchItems];
          }
        } catch (batchErr) {
          console.error('Batch flashcard fallback active:', batchErr);
        }
      }

      const builtCards = buildStudyFlashcards({
        topicTitle: finalTitle,
        difficulty,
        questionType,
        targetCount: safeCount,
        receivedCards: gathered.slice(0, safeCount),
      });

      setActiveDeckTitle(finalTitle);
      setActiveDeckCards(builtCards);
      loadSavedDecks(userId);
    } catch (err) {
      console.error('Flashcard generation error:', err);
      const fallbackSet = buildStudyFlashcards({
        topicTitle: deckLabel,
        difficulty,
        questionType,
        targetCount: safeCount,
        receivedCards: [],
      });
      setActiveDeckTitle(deckLabel);
      setActiveDeckCards(fallbackSet);
    } finally {
      setGenerating(false);
      setGeneratingDocId(null);
    }
  };

  const handleOpenSavedDeck = (deck) => {
    const deckCards = deck?.cards || deck?.flashcards || [];
    if (!Array.isArray(deckCards) || deckCards.length === 0) return;
    const title = resolveDeckTitle(deck, documents);
    const normalized = deckCards.map((item, idx) =>
      normalizeFlashcardItem(item, idx, title, item?.difficulty || difficulty)
    );
    setActiveDeckTitle(title);
    setActiveDeckCards(normalized);
  };

  const handleDeleteDeck = async (deckId) => {
    try {
      await axios.delete(`http://localhost:8000/api/flashcards/${deckId}`);
      setSavedDecks((prev) => prev.filter((item) => item._id !== deckId));
    } catch (err) {
      console.error('Failed to delete flashcard deck:', err);
    }
  };

  const handleBuilderSubmit = async (e) => {
    e.preventDefault();
    if (sourceMode === 'document') {
      const chosenDoc = documents.find((d) => d._id === selectedDocId);
      await requestFlashcards({
        docId: selectedDocId,
        label: chosenDoc?.title || 'Document Flashcards',
      });
    } else {
      await requestFlashcards({
        topicText: customTopic,
        label: customTopic.trim(),
      });
    }
  };

  // Render only the interactive flashcard deck view when a deck is active
  if (Array.isArray(activeDeckCards) && activeDeckCards.length > 0) {
    return (
      <div
        className={`min-h-screen p-6 sm:p-8 ${
          isDark ? 'bg-[#12141A] text-[#F3F4F6]' : 'bg-[#e2eaeb] text-[#54626f]'
        }`}
        style={{ fontSize: '18px' }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="mb-2 text-center">
            <span
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm border ${
                isDark
                  ? 'bg-[#171A21] text-[#F3F4F6] border-[#2E3542] font-black'
                  : 'bg-white text-[#1f3b4d] border-[#54626f]/20 shadow-2xs font-extrabold'
              }`}
            >
              <BrainCircuit className="w-4 h-4 text-[#7EC4CF]" />
              <span>
                {activeDeckTitle} • {Number(activeDeckCards.length)} Cards
              </span>
            </span>
          </div>

          <FlashcardPage
            flashcards={activeDeckCards}
            onBack={() => setActiveDeckCards(null)}
          />
        </div>
      </div>
    );
  }

  const totalSavedCards = savedDecks.reduce(
    (sum, d) => sum + Number((d.cards || d.flashcards || []).length),
    0
  );

  return (
    <div
      className={`min-h-screen flex relative ${
        isDark ? 'bg-[#12141A] text-[#F3F4F6]' : 'bg-[#e2eaeb] text-[#54626f]'
      }`}
      style={{ fontSize: '18px' }}
    >
      <AppSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Page Header */}
          <div
            className={`border rounded-2xl p-6 shadow-sm flex items-start justify-between gap-4 ${
              isDark
                ? 'bg-[#171A21] border-[#2C313C]'
                : 'bg-white/90 border-[#54626f]/20'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                aria-label="Toggle navigation menu"
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition shrink-0 mt-0.5 cursor-pointer ${
                  isDark
                    ? 'bg-[#222732] text-[#F3F4F6] hover:bg-[#2C3240]'
                    : 'bg-[#e2eaeb] text-[#1F2937] hover:bg-[#54626f] hover:text-white'
                }`}
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h1
                  className={`tracking-tight ${
                    isDark
                      ? 'font-black text-[#F3F4F6]'
                      : 'font-black text-[#1F2118]'
                  }`}
                  style={{ fontSize: '32px', lineHeight: 1.2 }}
                >
                  Custom AI Flashcards Studio
                </h1>
                <p
                  className={`mt-1 ${
                    isDark
                      ? 'text-[#D1D5DB] font-black'
                      : 'text-[#54626f] font-medium'
                  }`}
                  style={{ fontSize: '18px' }}
                >
                  Create high-yield flashcards from your documents or any custom topic with your preferred level, question type, and count (1 to 20).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition shrink-0 cursor-pointer ${
                isDark
                  ? 'bg-[#222732] text-[#FFFFFF] border border-[#2E3542] hover:bg-[#2C3240] font-black'
                  : 'bg-[#e2eaeb] text-[#1F2937] hover:bg-[#54626f] hover:text-white font-bold'
              }`}
              style={{ fontSize: '16px' }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>

          {errorMsg && (
            <div
              className={`border px-4 py-3 rounded-xl ${
                isDark
                  ? 'bg-red-950/50 border-red-800 text-red-300 font-black'
                  : 'bg-red-50 border-red-200 text-red-700 font-semibold'
              }`}
              style={{ fontSize: '17px' }}
            >
              {errorMsg}
            </div>
          )}

          {/* Custom Builder Card */}
          <form
            onSubmit={handleBuilderSubmit}
            className={`border rounded-2xl p-6 shadow-sm space-y-5 ${
              isDark
                ? 'bg-[#171A21] border-[#2C313C]'
                : 'bg-white/95 border-[#54626f]/20'
            }`}
          >
            <div
              className={`flex items-center gap-2 border-b pb-3 ${
                isDark ? 'border-[#2C313C]' : 'border-[#54626f]/10'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5 text-[#7EC4CF]" />
              <h2
                className={
                  isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#1F2118]'
                }
                style={{ fontSize: '22px' }}
              >
                Configure Your Flashcard Set
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  className={`block uppercase tracking-wider ${
                    isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f] font-extrabold'
                  }`}
                  style={{ fontSize: '15px' }}
                >
                  Source Type
                </label>
                <div
                  className={`flex p-1 rounded-xl ${
                    isDark ? 'bg-[#12141A] border border-[#2E3542]' : 'bg-[#e2eaeb]/70'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSourceMode('document')}
                    className={`flex-1 py-2.5 rounded-lg transition cursor-pointer ${
                      sourceMode === 'document'
                        ? isDark
                          ? 'bg-[#C8B9D6] text-[#000000] font-black shadow-2xs'
                          : 'bg-[#54626f] text-white font-bold shadow-2xs'
                        : isDark
                          ? 'text-[#E5E7EB] hover:text-white font-black'
                          : 'text-[#54626f] hover:text-[#1F2118] font-bold'
                    }`}
                    style={{ fontSize: '16px' }}
                  >
                    From My Document
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceMode('topic')}
                    className={`flex-1 py-2.5 rounded-lg transition cursor-pointer ${
                      sourceMode === 'topic'
                        ? isDark
                          ? 'bg-[#C8B9D6] text-[#000000] font-black shadow-2xs'
                          : 'bg-[#54626f] text-white font-bold shadow-2xs'
                        : isDark
                          ? 'text-[#E5E7EB] hover:text-white font-black'
                          : 'text-[#54626f] hover:text-[#1F2118] font-bold'
                    }`}
                    style={{ fontSize: '16px' }}
                  >
                    New Custom Topic
                  </button>
                </div>
              </div>

              {sourceMode === 'document' ? (
                <div className="space-y-2">
                  <label
                    className={`block uppercase tracking-wider ${
                      isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f] font-extrabold'
                    }`}
                    style={{ fontSize: '15px' }}
                  >
                    Select Document
                  </label>
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    disabled={documents.length === 0}
                    className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:border-[#54626f] ${
                      isDark
                        ? 'bg-[#12141A] border-[#2E3542] text-[#F3F4F6] font-black'
                        : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118] font-semibold'
                    }`}
                    style={{ fontSize: '17px' }}
                  >
                    {documents.length === 0 ? (
                      <option value="">No documents available</option>
                    ) : (
                      documents.map((doc) => (
                        <option key={doc._id} value={doc._id}>
                          {doc.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label
                    className={`block uppercase tracking-wider ${
                      isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f] font-extrabold'
                    }`}
                    style={{ fontSize: '15px' }}
                  >
                    Enter New Topic Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Operating System Deadlocks, A* Search, Normalization..."
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:border-[#54626f] ${
                      isDark
                        ? 'bg-[#12141A] border-[#2E3542] text-[#F3F4F6] placeholder-[#9CA3AF] font-black'
                        : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118] font-medium'
                    }`}
                    style={{ fontSize: '17px' }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label
                  className={`block uppercase tracking-wider ${
                    isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f] font-extrabold'
                  }`}
                  style={{ fontSize: '15px' }}
                >
                  Difficulty Level
                </label>
                <div
                  className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl ${
                    isDark ? 'bg-[#12141A] border border-[#2E3542]' : 'bg-[#e2eaeb]/60'
                  }`}
                >
                  {[
                    { id: 'easy', label: 'Basic' },
                    { id: 'medium', label: 'Medium' },
                    { id: 'hard', label: 'Hard' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setDifficulty(lvl.id)}
                      className={`py-2 rounded-lg transition cursor-pointer ${
                        difficulty === lvl.id
                          ? isDark
                            ? 'bg-[#C8B9D6] text-[#000000] font-black shadow-2xs'
                            : 'bg-[#54626f] text-white font-extrabold shadow-2xs'
                          : isDark
                            ? 'text-[#E5E7EB] hover:bg-[#222732] font-black'
                            : 'text-[#1f3b4d] hover:bg-white/60 font-extrabold'
                      }`}
                      style={{ fontSize: '16px' }}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label
                  className={`block uppercase tracking-wider ${
                    isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f] font-extrabold'
                  }`}
                  style={{ fontSize: '15px' }}
                >
                  Question Type
                </label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:border-[#54626f] ${
                    isDark
                      ? 'bg-[#12141A] border-[#2E3542] text-[#F3F4F6] font-black'
                      : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118] font-semibold'
                  }`}
                  style={{ fontSize: '17px' }}
                >
                  <option value="mixed">Most Important (Mixed)</option>
                  <option value="definition">Definitions &amp; Terms</option>
                  <option value="concept">Core Concepts &amp; How It Works</option>
                  <option value="comparison">Comparisons &amp; Differences</option>
                  <option value="application">Exam &amp; Application Questions</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    className={`block uppercase tracking-wider ${
                      isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f] font-extrabold'
                    }`}
                    style={{ fontSize: '15px' }}
                  >
                    Number of Cards (1–20)
                  </label>
                  <span
                    className={`px-2.5 py-0.5 rounded-md ${
                      isDark
                        ? 'text-[#E5B880] bg-[#222732] font-black'
                        : 'text-[#6b4c35] bg-[#6b4c35]/10 font-black'
                    }`}
                    style={{ fontSize: '15px' }}
                  >
                    {Number(cardCount)} Cards
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={cardCount}
                    onChange={(e) => setCardCount(Number(e.target.value))}
                    className="flex-1 accent-[#54626f] cursor-pointer"
                  />
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={cardCount}
                    onChange={(e) => {
                      const val = Math.min(20, Math.max(1, Number(e.target.value) || 1));
                      setCardCount(val);
                    }}
                    className={`w-16 px-2.5 py-1.5 rounded-xl border text-center focus:outline-none focus:border-[#54626f] ${
                      isDark
                        ? 'bg-[#12141A] border-[#2E3542] text-[#F3F4F6] font-black'
                        : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118] font-bold'
                    }`}
                    style={{ fontSize: '17px' }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={
                  generating || (sourceMode === 'document' ? !selectedDocId : !customTopic.trim())
                }
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white bg-[#54626f] hover:bg-[#1F2118] transition shadow-sm disabled:opacity-50 cursor-pointer ${
                  isDark ? 'font-black' : 'font-extrabold'
                }`}
                style={{ fontSize: '17px' }}
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {generating
                    ? 'Generating Important Cards...'
                    : `Generate ${Number(cardCount)} Flashcards`}
                </span>
              </button>
            </div>
          </form>

          {/* Saved Flashcard Decks */}
          <div
            className={`border rounded-2xl p-6 shadow-sm ${
              isDark
                ? 'bg-[#171A21] border-[#2C313C]'
                : 'bg-white/95 border-[#54626f]/20'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-[#7EC4CF]" />
                <h2
                  className={
                    isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#1F2118]'
                  }
                  style={{ fontSize: '22px' }}
                >
                  Saved Flashcard Decks
                </h2>
              </div>
              <span
                className={`px-3.5 py-1 rounded-full ${
                  isDark
                    ? 'bg-[#222732] text-[#E5B880] font-black'
                    : 'bg-[#6b4c35]/12 text-[#6b4c35] font-bold'
                }`}
                style={{ fontSize: '16px' }}
              >
                {Number(savedDecks.length)} Sets ({totalSavedCards} Cards)
              </span>
            </div>

            {savedDecks.length === 0 ? (
              <div
                className={`text-center py-7 px-4 rounded-xl border border-dashed ${
                  isDark
                    ? 'bg-[#12141A] border-[#2E3542]'
                    : 'bg-[#e2eaeb]/40 border-[#54626f]/25'
                }`}
              >
                <p
                  className={
                    isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#1F2118]'
                  }
                  style={{ fontSize: '18px' }}
                >
                  No saved flashcard sets yet. Generate a set above and it will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedDecks.map((deck) => {
                  const cardsList = deck.cards || deck.flashcards || [];
                  const deckTitle = resolveDeckTitle(deck, documents);
                  const firstCard = cardsList[0] || {};
                  const diffBadge = getDifficultyBadge(firstCard.difficulty, isDark);
                  const questionFocus = detectQuestionFocus(firstCard.question);

                  return (
                    <div
                      key={deck._id}
                      className={`rounded-2xl p-5 border flex flex-col justify-between transition ${
                        isDark
                          ? 'bg-[#12141A] border-[#2E3542] hover:bg-[#1A1E26]'
                          : 'bg-[#f8fafb] border-[#54626f]/15 hover:bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`px-2.5 py-1 rounded-md ${
                                isDark
                                  ? 'bg-[#222732] text-[#F3F4F6] font-black'
                                  : 'bg-[#e2eaeb] text-[#1f3b4d] font-extrabold'
                              }`}
                              style={{ fontSize: '15px' }}
                            >
                              {Number(cardsList.length)} Cards
                            </span>
                            <span
                              className={`px-2.5 py-1 rounded-md ${diffBadge.classes}`}
                              style={{ fontSize: '15px' }}
                            >
                              {diffBadge.label}
                            </span>
                            <span
                              className={`px-2.5 py-1 rounded-md border ${
                                isDark
                                  ? 'bg-[#171A21] border-[#2E3542] text-[#E5E7EB] font-black'
                                  : 'bg-white border-[#54626f]/15 text-[#54626f] font-bold'
                              }`}
                              style={{ fontSize: '15px' }}
                            >
                              {questionFocus}
                            </span>
                          </div>
                          <span
                            className={
                              isDark
                                ? 'text-[#D1D5DB] font-black'
                                : 'text-[#54626f] font-medium'
                            }
                            style={{ fontSize: '15px' }}
                          >
                            {deck.createdAt
                              ? new Date(deck.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : ''}
                          </span>
                        </div>

                        <h3
                          className={`mt-3 leading-snug ${
                            isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#1F2118]'
                          }`}
                          style={{ fontSize: '20px' }}
                        >
                          {deckTitle}
                        </h3>

                        {firstCard.question && (
                          <p
                            className={`mt-1.5 line-clamp-2 ${
                              isDark
                                ? 'text-[#D1D5DB] font-bold'
                                : 'text-[#54626f] font-medium'
                            }`}
                            style={{ fontSize: '17px' }}
                          >
                            Sample: {firstCard.question}
                          </p>
                        )}
                      </div>

                      <div
                        className={`mt-4 pt-3 border-t flex items-center justify-between gap-2 ${
                          isDark ? 'border-[#2E3542]' : 'border-[#54626f]/10'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenSavedDeck(deck)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white bg-[#54626f] hover:bg-[#1F2118] transition cursor-pointer ${
                            isDark ? 'font-black' : 'font-extrabold'
                          }`}
                          style={{ fontSize: '16px' }}
                        >
                          <Play className="w-4 h-4" />
                          <span>Open Deck</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDeck(deck._id)}
                          className={`inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-red-500 bg-red-500/10 hover:bg-red-500/20 transition cursor-pointer ${
                            isDark ? 'font-black' : 'font-bold'
                          }`}
                          style={{ fontSize: '16px' }}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Document Decks Grid */}
          <div
            className={`border rounded-2xl p-6 shadow-sm ${
              isDark
                ? 'bg-[#171A21] border-[#2C313C]'
                : 'bg-white/90 border-[#54626f]/20'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#7EC4CF]" />
                <h2
                  className={
                    isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#1F2118]'
                  }
                  style={{ fontSize: '22px' }}
                >
                  Your Documents Quick Deck
                </h2>
              </div>
              <span
                className={`px-3.5 py-1 rounded-full ${
                  isDark
                    ? 'bg-[#222732] text-[#F3F4F6] font-black'
                    : 'bg-[#e2eaeb] text-[#1f3b4d] font-bold'
                }`}
                style={{ fontSize: '16px' }}
              >
                {Number(documents.length)} Documents
              </span>
            </div>

            {loading ? (
              <p
                className={`py-4 ${
                  isDark ? 'text-[#D1D5DB] font-black' : 'text-[#54626f] font-medium'
                }`}
                style={{ fontSize: '18px' }}
              >
                Loading your documents...
              </p>
            ) : documents.length === 0 ? (
              <div
                className={`text-center py-8 px-4 rounded-xl border border-dashed ${
                  isDark
                    ? 'bg-[#12141A] border-[#2E3542]'
                    : 'bg-[#e2eaeb]/40 border-[#54626f]/25'
                }`}
              >
                <p
                  className={
                    isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#1F2118]'
                  }
                  style={{ fontSize: '18px' }}
                >
                  No documents uploaded yet — you can still create flashcards using a Custom Topic above!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => {
                  const isBusy = generatingDocId === doc._id;
                  return (
                    <div
                      key={doc._id}
                      className={`rounded-2xl p-5 border flex flex-col justify-between transition ${
                        isDark
                          ? 'bg-[#12141A] border-[#2E3542] hover:bg-[#1A1E26]'
                          : 'bg-[#f8fafb] border-[#54626f]/15 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                            isDark
                              ? 'bg-[#222732] text-[#E8ECEF]'
                              : 'bg-[#e2eaeb] text-[#54626f]'
                          }`}
                        >
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3
                            className={`leading-snug ${
                              isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#1F2118]'
                            }`}
                            style={{ fontSize: '20px' }}
                          >
                            {doc.title}
                          </h3>
                          <p
                            className={`mt-1 ${
                              isDark
                                ? 'text-[#D1D5DB] font-bold'
                                : 'text-[#54626f] font-medium'
                            }`}
                            style={{ fontSize: '16px' }}
                          >
                            Added on:{' '}
                            {new Date(doc.uploadDate || doc.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`mt-4 pt-3 border-t flex items-center justify-between gap-2 ${
                          isDark ? 'border-[#2E3542]' : 'border-[#54626f]/10'
                        }`}
                      >
                        <span
                          className={`px-2.5 py-1 rounded-md ${
                            isDark
                              ? 'text-[#E5B880] bg-[#222732] font-black'
                              : 'text-[#6b4c35] bg-[#6b4c35]/10 font-bold'
                          }`}
                          style={{ fontSize: '15px' }}
                        >
                          {String(difficulty).toUpperCase()} • {Number(cardCount)} Cards
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            requestFlashcards({
                              docId: doc._id,
                              label: doc.title,
                            })
                          }
                          disabled={isBusy || generating}
                          className={`px-4 py-2 rounded-xl text-white bg-[#54626f] hover:bg-[#1F2118] transition disabled:opacity-50 cursor-pointer ${
                            isDark ? 'font-black' : 'font-extrabold'
                          }`}
                          style={{ fontSize: '16px' }}
                        >
                          {isBusy ? 'Generating...' : 'Practice Flashcards'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}