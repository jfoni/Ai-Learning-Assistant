import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';
import FlashcardPage from './FlashcardPage';
import {
  BrainCircuit,
  FileText,
  Sparkles,
  Layers,
  SlidersHorizontal,
  BookOpenCheck,
  BookmarkCheck,
  Trash2,
  Play,
} from 'lucide-react';

// Guess likely question focus from sample question text for saved decks
const detectQuestionFocus = (questionText) => {
  const q = String(questionText || '').toLowerCase();
  if (!q) return 'Mixed Important';
  if (q.includes('difference') || q.includes('compare') || q.includes('vs') || q.includes('decide between')) {
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

// Map stored difficulty value to a clean display label and badge style
const getDifficultyBadge = (rawDiff) => {
  const normalized = String(rawDiff || 'medium').toLowerCase();
  if (normalized === 'easy' || normalized === 'basic') {
    return {
      label: 'EASY',
      classes: 'bg-[#e2eaeb] text-[#1f3b4d]',
    };
  }
  if (normalized === 'hard') {
    return {
      label: 'HARD',
      classes: 'bg-[#6b4c35]/15 text-[#6b4c35]',
    };
  }
  return {
    label: 'MEDIUM',
    classes: 'bg-[#54626f]/15 text-[#1f3b4d]',
  };
};

export default function FlashcardsListPage() {
  const [userId, setUserId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [savedDecks, setSavedDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Source mode: 'document' or 'topic'
  const [sourceMode, setSourceMode] = useState('document');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [customTopic, setCustomTopic] = useState('');

  // Flashcard customization options
  const [difficulty, setDifficulty] = useState('medium');
  const [questionType, setQuestionType] = useState('mixed');
  const [cardCount, setCardCount] = useState(5);

  const [generating, setGenerating] = useState(false);
  const [generatingDocId, setGeneratingDocId] = useState(null);
  const [selectedFlashcards, setSelectedFlashcards] = useState(null);
  const [activeDeckTitle, setActiveDeckTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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

  // Load previously saved flashcard sets for this user
  const loadSavedDecks = async (uid) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/flashcards/user/${uid}`);
      const decks = res.data?.data || [];
      setSavedDecks(decks);
    } catch (err) {
      console.error('Error loading saved flashcard decks:', err);
    }
  };

  // Resolve a readable deck title from document list or custom topic field
  const resolveDeckTitle = (deck, docsList) => {
    if (deck.title) return deck.title;
    if (typeof deck.documentId === 'string' && deck.documentId.startsWith('topic:')) {
      return deck.documentId.replace(/^topic:/, '').trim();
    }
    const matchedDoc = docsList.find((d) => String(d._id) === String(deck.documentId));
    if (matchedDoc?.title) return matchedDoc.title;
    return 'Flashcard Deck';
  };

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

    try {
      setGenerating(true);
      if (docId) setGeneratingDocId(docId);

      const endpoint = docId
        ? `http://localhost:8000/api/flashcards/${docId}`
        : 'http://localhost:8000/api/flashcards/generate';

      const res = await axios.post(endpoint, {
        userId,
        documentId: docId || null,
        customTopic: topicText.trim(),
        difficulty,
        questionType,
        cardCount: safeCount,
      });

      const cards =
        res.data?.data?.flashcards || res.data?.data?.cards || res.data?.flashcards || [];

      if (cards.length > 0) {
        setActiveDeckTitle(label || res.data?.data?.title || topicText.trim() || 'Study Deck');
        setSelectedFlashcards(cards);
        await loadSavedDecks(userId);
      } else {
        setErrorMsg('No flashcards returned from AI. Please try again.');
      }
    } catch (err) {
      console.error('Failed to generate flashcards:', err);
      setErrorMsg(
        err.response?.data?.error || 'Failed to generate flashcards. Check backend server.'
      );
    } finally {
      setGenerating(false);
      setGeneratingDocId(null);
    }
  };

  const handleOpenSavedDeck = (deck) => {
    const deckCards = deck?.cards || deck?.flashcards || [];
    if (!Array.isArray(deckCards) || deckCards.length === 0) return;
    setActiveDeckTitle(resolveDeckTitle(deck, documents));
    setSelectedFlashcards(deckCards);
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

  if (selectedFlashcards) {
    return (
      <div className="min-h-screen bg-[#e2eaeb] text-[#54626f] p-6 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-2 text-center">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-[#1f3b4d] text-xs font-extrabold border border-[#54626f]/20 shadow-2xs">
              <BrainCircuit className="w-4 h-4 text-[#6b4c35]" />
              <span>
                {activeDeckTitle} • {Number(selectedFlashcards.length)} Cards
              </span>
            </span>
          </div>

          <FlashcardPage
            flashcards={selectedFlashcards}
            onBack={() => setSelectedFlashcards(null)}
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
    <div className="min-h-screen bg-[#e2eaeb] text-[#54626f] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/90 border border-[#54626f]/20 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1F2118] tracking-tight">
              Custom AI Flashcards Studio
            </h1>
            <p className="text-sm text-[#54626f] mt-1">
              Create high-yield flashcards from your documents or any custom topic with your preferred level, question type, and count (1 to 20).
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e2eaeb] text-[#1f3b4d] text-xs font-extrabold self-start sm:self-auto">
            <BookOpenCheck className="w-4 h-4 text-[#6b4c35]" />
            <span>{totalSavedCards} Saved Cards</span>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Custom Builder Card */}
        <form
          onSubmit={handleBuilderSubmit}
          className="bg-white/95 border border-[#54626f]/20 rounded-2xl p-6 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-2 border-b border-[#54626f]/10 pb-3">
            <SlidersHorizontal className="w-5 h-5 text-[#54626f]" />
            <h2 className="text-lg font-black text-[#1F2118]">Configure Your Flashcard Set</h2>
          </div>

          {/* Source Selector: Existing Document vs New Topic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#54626f]">
                Source Type
              </label>
              <div className="flex bg-[#e2eaeb]/70 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSourceMode('document')}
                  className={`flex-1 py-2.5 rounded-lg transition cursor-pointer ${
                    sourceMode === 'document'
                      ? 'bg-[#54626f] text-white shadow-2xs'
                      : 'text-[#54626f] hover:text-[#1F2118]'
                  }`}
                >
                  From My Document
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode('topic')}
                  className={`flex-1 py-2.5 rounded-lg transition cursor-pointer ${
                    sourceMode === 'topic'
                      ? 'bg-[#54626f] text-white shadow-2xs'
                      : 'text-[#54626f] hover:text-[#1F2118]'
                  }`}
                >
                  New Custom Topic
                </button>
              </div>
            </div>

            {sourceMode === 'document' ? (
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#54626f]">
                  Select Document
                </label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  disabled={documents.length === 0}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#54626f]/25 bg-[#f8fafb] text-[#1F2118] text-sm font-semibold focus:outline-none focus:border-[#54626f]"
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
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#54626f]">
                  Enter New Topic Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Operating System Deadlocks, A* Search, Normalization..."
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#54626f]/25 bg-[#f8fafb] text-[#1F2118] text-sm font-medium focus:outline-none focus:border-[#54626f]"
                />
              </div>
            )}
          </div>

          {/* Difficulty, Question Type, and Card Count (1 to 20) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Difficulty */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#54626f]">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-[#e2eaeb]/60 p-1 rounded-xl">
                {[
                  { id: 'easy', label: 'Basic' },
                  { id: 'medium', label: 'Medium' },
                  { id: 'hard', label: 'Hard' },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setDifficulty(lvl.id)}
                    className={`py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      difficulty === lvl.id
                        ? 'bg-[#54626f] text-white shadow-2xs'
                        : 'text-[#1f3b4d] hover:bg-white/60'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Type */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#54626f]">
                Question Type
              </label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#54626f]/25 bg-[#f8fafb] text-[#1F2118] text-sm font-semibold focus:outline-none focus:border-[#54626f]"
              >
                <option value="mixed">Most Important (Mixed)</option>
                <option value="definition">Definitions &amp; Terms</option>
                <option value="concept">Core Concepts &amp; How It Works</option>
                <option value="comparison">Comparisons &amp; Differences</option>
                <option value="application">Exam &amp; Application Questions</option>
              </select>
            </div>

            {/* Card Count (1 to 20) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#54626f]">
                  Number of Cards (1–20)
                </label>
                <span className="text-xs font-black text-[#6b4c35] bg-[#6b4c35]/10 px-2.5 py-0.5 rounded-md">
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
                  className="w-16 px-2.5 py-1.5 rounded-xl border border-[#54626f]/25 bg-[#f8fafb] text-[#1F2118] text-sm font-bold text-center focus:outline-none focus:border-[#54626f]"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={generating || (sourceMode === 'document' ? !selectedDocId : !customTopic.trim())}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-extrabold text-white bg-[#54626f] hover:bg-[#1F2118] transition shadow-sm disabled:opacity-50 cursor-pointer"
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
        <div className="bg-white/95 border border-[#54626f]/20 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-[#6b4c35]" />
              <h2 className="text-lg font-black text-[#1F2118]">Saved Flashcard Decks</h2>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#6b4c35]/12 text-[#6b4c35]">
              {Number(savedDecks.length)} Sets ({totalSavedCards} Cards)
            </span>
          </div>

          {savedDecks.length === 0 ? (
            <div className="text-center py-7 px-4 rounded-xl bg-[#e2eaeb]/40 border border-dashed border-[#54626f]/25">
              <p className="text-sm font-bold text-[#1F2118]">
                No saved flashcard sets yet. Generate a set above and it will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedDecks.map((deck) => {
                const cardsList = deck.cards || deck.flashcards || [];
                const deckTitle = resolveDeckTitle(deck, documents);
                const firstCard = cardsList[0] || {};
                const diffBadge = getDifficultyBadge(firstCard.difficulty);
                const questionFocus = detectQuestionFocus(firstCard.question);

                return (
                  <div
                    key={deck._id}
                    className="rounded-2xl p-5 bg-[#f8fafb] border border-[#54626f]/15 flex flex-col justify-between hover:bg-white transition"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-extrabold px-2.5 py-1 rounded-md bg-[#e2eaeb] text-[#1f3b4d]">
                            {Number(cardsList.length)} Cards
                          </span>
                          <span
                            className={`text-xs font-extrabold px-2.5 py-1 rounded-md ${diffBadge.classes}`}
                          >
                            {diffBadge.label}
                          </span>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-white border border-[#54626f]/15 text-[#54626f]">
                            {questionFocus}
                          </span>
                        </div>
                        <span className="text-xs text-[#54626f]">
                          {deck.createdAt
                            ? new Date(deck.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : ''}
                        </span>
                      </div>

                      <h3 className="font-bold text-[#1F2118] text-base mt-3 leading-snug">
                        {deckTitle}
                      </h3>

                      {firstCard.question && (
                        <p className="text-xs text-[#54626f] mt-1.5 line-clamp-2">
                          Sample: {firstCard.question}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#54626f]/10 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenSavedDeck(deck)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-[#54626f] hover:bg-[#1F2118] transition cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Open Deck</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDeck(deck._id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
        <div className="bg-white/90 border border-[#54626f]/20 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#54626f]" />
              <h2 className="text-lg font-black text-[#1F2118]">Your Documents Quick Deck</h2>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#e2eaeb] text-[#1f3b4d]">
              {Number(documents.length)} Documents
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-[#54626f] font-medium py-4">Loading your documents...</p>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl bg-[#e2eaeb]/40 border border-dashed border-[#54626f]/25">
              <p className="text-sm font-bold text-[#1F2118]">
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
                    className="rounded-2xl p-5 bg-[#f8fafb] border border-[#54626f]/15 flex flex-col justify-between hover:bg-white transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#e2eaeb] text-[#54626f] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1F2118] text-base leading-snug">
                          {doc.title}
                        </h3>
                        <p className="text-xs text-[#54626f] mt-1">
                          Added on:{' '}
                          {new Date(doc.uploadDate || doc.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#54626f]/10 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#6b4c35] bg-[#6b4c35]/10 px-2.5 py-1 rounded-md">
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
                        className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-[#54626f] hover:bg-[#1F2118] transition disabled:opacity-50 cursor-pointer"
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
  );
}