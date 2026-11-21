import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  loadUserDocumentsForTeachMe,
  evaluateTeachMeExplanation,
  interactWithTeachMe,
  fetchTeachMeHistory,
} from '../services/teachMeService';
import { useTheme } from '../context/ThemeContext';
import AppSidebar from '../components/AppSidebar';
import {
  Menu,
  ArrowLeft,
  GraduationCap,
  FileText,
  Edit3,
  Send,
  Lightbulb,
  HelpCircle,
  BookOpenCheck,
  History,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

const cleanDisplayText = (raw = '') =>
  String(raw || '')
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/```[a-zA-Z0-9_-]*\n?/g, '').replace(/```/g, '')
    )
    .replace(/[#*`~$]/g, '')
    .trim();

const getDocText = (doc) =>
  String(
    doc?.content || doc?.text || doc?.extractedText || doc?.summary || ''
  ).trim();

const getScoreBadgeClasses = (score, isDark) => {
  if (score >= 75) {
    return isDark
      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
      : 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
  if (score >= 45) {
    return isDark
      ? 'bg-amber-950/60 text-amber-300 border-amber-500/30'
      : 'bg-amber-100 text-amber-800 border-amber-200';
  }
  return isDark
    ? 'bg-rose-950/60 text-rose-300 border-rose-500/30'
    : 'bg-rose-100 text-rose-800 border-rose-200';
};

export default function TeachMePage() {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [userId, setUserId] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [sourceType, setSourceType] = useState('manual');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [explanation, setExplanation] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [activeSession, setActiveSession] = useState(null);
  const [historySessions, setHistorySessions] = useState([]);

  const [followUpReply, setFollowUpReply] = useState('');
  const [confusingPart, setConfusingPart] = useState('');
  const [showCorrected, setShowCorrected] = useState(false);

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

  const loadHistory = useCallback(async (uid) => {
    if (!uid) {
      setHistorySessions([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const list = await fetchTeachMeHistory(uid);
      setHistorySessions(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      const uid = user?.uid || '';
      setUserId(uid);
      if (!uid) {
        setDocuments([]);
        setHistorySessions([]);
        setActiveSession(null);
        return;
      }

      const docs = await loadUserDocumentsForTeachMe(uid);
      setDocuments(docs);
      if (docs.length > 0) {
        setSelectedDocId((prev) => prev || String(docs[0]._id || docs[0].id));
      }

      await loadHistory(uid);
    });

    return () => unsub();
  }, [loadHistory]);

  const handleSelectDocument = (docId) => {
    setSelectedDocId(docId);
    const doc = documents.find((d) => String(d._id || d.id) === String(docId));
    if (doc?.title && !topic.trim()) {
      setTopic(doc.title);
    }
  };

  const handleEvaluateSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const effectiveTopic =
      topic.trim() ||
      (sourceType === 'document' ? selectedDocument?.title || '' : '');

    if (!effectiveTopic.trim()) {
      setErrorMsg('Please enter a topic or select one from your documents.');
      return;
    }

    if (explanation.trim().length < 10) {
      setErrorMsg(
        'Write a short explanation in your own words (at least 10 characters) so the teacher can evaluate it.'
      );
      return;
    }

    const uid = userId || auth.currentUser?.uid;
    if (!uid) {
      setErrorMsg('Please sign in to evaluate and save your teaching session.');
      return;
    }

    setSubmitting(true);
    setShowCorrected(false);

    try {
      const data = await evaluateTeachMeExplanation({
        userId: uid,
        topic: effectiveTopic.trim(),
        sourceType,
        documentId:
          sourceType === 'document' && selectedDocument
            ? String(selectedDocument._id || selectedDocument.id)
            : '',
        documentTitle:
          sourceType === 'document' && selectedDocument
            ? selectedDocument.title || ''
            : '',
        documentContent:
          sourceType === 'document' && selectedDocument
            ? getDocText(selectedDocument)
            : '',
        difficulty,
        explanation: explanation.trim(),
      });

      const created = data?.session || null;
      if (created) {
        setActiveSession(created);
        setHistorySessions((prev) => [
          created,
          ...prev.filter((s) => String(s._id) !== String(created._id)),
        ]);
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Could not evaluate your explanation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTeacherInteraction = async (
    interactionType,
    customReply = ''
  ) => {
    if (!activeSession?._id) return;
    const uid = userId || auth.currentUser?.uid;
    if (!uid) return;

    const replyText =
      interactionType === 'answer_followup'
        ? String(customReply ?? followUpReply).trim()
        : '';

    if (interactionType === 'answer_followup' && !replyText) {
      setErrorMsg('Type your answer to the follow-up question first.');
      return;
    }

    if (interactionType === 'corrected_explanation') {
      setShowCorrected(true);
    }

    setErrorMsg('');
    setInteracting(true);

    try {
      const data = await interactWithTeachMe({
        userId: uid,
        sessionId: activeSession._id,
        interactionType,
        studentReply: replyText,
        confusingPart: confusingPart.trim(),
      });

      if (data?.session) {
        setActiveSession(data.session);
        setHistorySessions((prev) =>
          prev.map((s) =>
            String(s._id) === String(data.session._id) ? data.session : s
          )
        );
        if (interactionType === 'answer_followup') {
          setFollowUpReply('');
        }
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Could not continue teacher conversation.');
    } finally {
      setInteracting(false);
    }
  };

  const handleOpenHistorySession = (session) => {
    setActiveSession(session);
    setTopic(session.topic || '');
    setDifficulty(session.difficulty || 'Beginner');
    setSourceType(session.sourceType || 'manual');
    if (session.documentId) {
      setSelectedDocId(String(session.documentId));
    }
    setExplanation(session.explanation || '');
    setShowCorrected(false);
    setErrorMsg('');
  };

  const getPreviousTopicScore = (session) => {
    if (!session) return null;
    const sameTopicOlder = historySessions.filter(
      (item) =>
        String(item._id) !== String(session._id) &&
        String(item.topic || '').toLowerCase() ===
          String(session.topic || '').toLowerCase() &&
        new Date(item.createdAt) < new Date(session.createdAt)
    );
    if (sameTopicOlder.length === 0) return null;
    return sameTopicOlder[0]?.evaluation?.score ?? null;
  };

  const evaluation = activeSession?.evaluation || null;
  const previousScore = getPreviousTopicScore(activeSession);
  const scoreDelta =
    evaluation && previousScore !== null
      ? evaluation.score - previousScore
      : null;

  const surfaceClass = isDark
    ? 'bg-[#231F2C] border-purple-400/20 text-[#F3F0FA]'
    : 'bg-white/95 border-[#54626f]/20 text-[#1F2118]';

  const nestedSurfaceClass = isDark
    ? 'bg-[#1B1723] border-purple-400/15 text-[#EAE5F5]'
    : 'bg-[#f8fafb] border-[#54626f]/15 text-[#1F2118]';

  const inputClass = isDark
    ? 'bg-[#1B1723] border-purple-400/25 text-[#F3F0FA] placeholder-[#9B92AE] focus:border-purple-300'
    : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118] placeholder-[#6B7280] focus:border-[#54626f]';

  const primaryBtnClass = isDark
    ? 'bg-purple-300 text-[#18151F] hover:bg-purple-200'
    : 'bg-[#54626f] text-white hover:bg-[#1F2118]';

  const secondaryBtnClass = isDark
    ? 'bg-[#2E283D] text-[#EDE8F8] hover:bg-[#3A324D]'
    : 'bg-[#e2eaeb] text-[#1F2118] hover:bg-[#d2dee0]';

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
          {/* Page Header */}
          <div
            className={`border rounded-3xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4 ${surfaceClass}`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                aria-label="Toggle sidebar"
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition cursor-pointer shrink-0 ${secondaryBtnClass}`}
              >
                <Menu className="w-6 h-6" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <GraduationCap
                    className={`w-8 h-8 shrink-0 ${
                      isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                    }`}
                  />
                  <h1
                    className="font-black tracking-tight"
                    style={{ fontSize: '40px', lineHeight: 1.2 }}
                  >
                    AI Teach Me Mode
                  </h1>
                </div>
                <p
                  className={`mt-1 ${
                    isDark ? 'text-[#C5BCE0]' : 'text-[#54626f]'
                  }`}
                  style={{ fontSize: '21px' }}
                >
                  Explain a concept in your own words and let your AI teacher test, guide, and refine your understanding
                </p>
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Setup, Own-Words Explanation & Evaluation */}
            <div className="lg:col-span-8 space-y-6">
              <form
                onSubmit={handleEvaluateSubmit}
                className={`border rounded-3xl p-6 shadow-sm space-y-5 ${surfaceClass}`}
              >
                {/* 1. Topic Source & Difficulty */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span
                      className={`font-extrabold uppercase tracking-wider ${
                        isDark ? 'text-purple-300/80' : 'text-[#54626f]'
                      }`}
                      style={{ fontSize: '15px' }}
                    >
                      1. Choose Topic &amp; Difficulty
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSourceType('manual')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-bold transition cursor-pointer ${
                          sourceType === 'manual' ? primaryBtnClass : secondaryBtnClass
                        }`}
                        style={{ fontSize: '19px' }}
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Enter Topic</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSourceType('document');
                          if (selectedDocument?.title && !topic.trim()) {
                            setTopic(selectedDocument.title);
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-bold transition cursor-pointer ${
                          sourceType === 'document' ? primaryBtnClass : secondaryBtnClass
                        }`}
                        style={{ fontSize: '19px' }}
                      >
                        <FileText className="w-4 h-4" />
                        <span>From Uploaded Document</span>
                      </button>
                    </div>
                  </div>

                  {sourceType === 'document' && (
                    <div>
                      <label
                        htmlFor="teachme-doc-select"
                        className="block font-bold mb-1.5"
                        style={{ fontSize: '19px' }}
                      >
                        Uploaded Document
                      </label>
                      {documents.length === 0 ? (
                        <div
                          className={`rounded-2xl border p-4 ${nestedSurfaceClass}`}
                          style={{ fontSize: '20px' }}
                        >
                          No uploaded documents found yet. You can still enter any topic manually below.
                        </div>
                      ) : (
                        <select
                          id="teachme-doc-select"
                          value={selectedDocId}
                          onChange={(e) => handleSelectDocument(e.target.value)}
                          className={`w-full rounded-2xl border px-4 py-3 font-semibold outline-none ${inputClass}`}
                          style={{ fontSize: '20px' }}
                        >
                          {documents.map((doc) => {
                            const id = String(doc._id || doc.id);
                            return (
                              <option key={id} value={id}>
                                {doc.title || 'Untitled Document'}
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-7">
                      <label
                        htmlFor="teachme-topic-input"
                        className="block font-bold mb-1.5"
                        style={{ fontSize: '19px' }}
                      >
                        Concept / Topic to Teach
                      </label>
                      <input
                        id="teachme-topic-input"
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., Deadlock in Operating Systems, Binary Search, Photosynthesis"
                        className={`w-full rounded-2xl border px-4 py-3 font-semibold outline-none transition ${inputClass}`}
                        style={{ fontSize: '21px' }}
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label
                        htmlFor="teachme-difficulty-select"
                        className="block font-bold mb-1.5"
                        style={{ fontSize: '19px' }}
                      >
                        Difficulty Level
                      </label>
                      <select
                        id="teachme-difficulty-select"
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className={`w-full rounded-2xl border px-4 py-3 font-bold outline-none transition ${inputClass}`}
                        style={{ fontSize: '21px' }}
                      >
                        {DIFFICULTIES.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Explain in Own Words */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label
                      htmlFor="teachme-explanation-textarea"
                      className="font-bold"
                      style={{ fontSize: '20px' }}
                    >
                      2. Explain It in Your Own Words
                    </label>
                    <span
                      className={`font-semibold ${
                        isDark ? 'text-[#B5ACC9]' : 'text-[#54626f]'
                      }`}
                      style={{ fontSize: '18px' }}
                    >
                      No textbook copying needed
                    </span>
                  </div>

                  <textarea
                    id="teachme-explanation-textarea"
                    rows={6}
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Imagine you are teaching a classmate how this works and why it matters. Use your own words and everyday examples..."
                    className={`w-full rounded-2xl border p-4 leading-relaxed font-medium outline-none transition resize-y ${inputClass}`}
                    style={{ fontSize: '22px' }}
                  />
                </div>

                {errorMsg && (
                  <div
                    className="rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-400 px-4 py-3 font-bold"
                    style={{ fontSize: '20px' }}
                  >
                    {cleanDisplayText(errorMsg)}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-extrabold transition cursor-pointer disabled:opacity-50 ${primaryBtnClass}`}
                    style={{ fontSize: '21px' }}
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>
                      {submitting
                        ? 'Evaluating Explanation...'
                        : 'Submit Explanation'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Empty State Before First Evaluation */}
              {!submitting && !evaluation && (
                <div
                  className={`border rounded-3xl p-8 text-center space-y-3 ${surfaceClass}`}
                >
                  <BookOpenCheck
                    className={`w-12 h-12 mx-auto ${
                      isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                    }`}
                  />
                  <h2 className="font-black" style={{ fontSize: '28px' }}>
                    Ready When You Are
                  </h2>
                  <p
                    className={`max-w-xl mx-auto ${
                      isDark ? 'text-[#B5ACC9]' : 'text-[#54626f]'
                    }`}
                    style={{ fontSize: '21px' }}
                  >
                    Pick a topic and explain how it works in your own words. Your AI teacher will highlight what you got right, separate missing points from misconceptions, and guide you with hints and follow-up questions.
                  </p>
                </div>
              )}

              {/* Detailed Evaluation & AI Teacher Interaction */}
              {evaluation && (
                <div className="space-y-6">
                  {/* Score & Summary Card */}
                  <div
                    className={`border rounded-3xl p-6 shadow-sm space-y-4 ${surfaceClass}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span
                          className={`font-extrabold uppercase tracking-wider ${
                            isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                          }`}
                          style={{ fontSize: '15px' }}
                        >
                          {activeSession.topic} • {activeSession.difficulty}
                        </span>
                        <h2 className="font-black mt-0.5" style={{ fontSize: '30px' }}>
                          Concept Check Feedback
                        </h2>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        {scoreDelta !== null && (
                          <span
                            className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full font-extrabold border ${
                              scoreDelta >= 0
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            }`}
                            style={{ fontSize: '18px' }}
                          >
                            {scoreDelta >= 0 ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4" />
                            )}
                            <span>
                              {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} vs
                              previous attempt
                            </span>
                          </span>
                        )}

                        <span
                          className={`px-4 py-1.5 rounded-full font-black border ${getScoreBadgeClasses(
                            evaluation.score,
                            isDark
                          )}`}
                          style={{ fontSize: '22px' }}
                        >
                          Understanding Score: {evaluation.score}/100
                        </span>
                      </div>
                    </div>

                    {evaluation.summary && (
                      <p
                        className={`leading-relaxed m-0 ${
                          isDark ? 'text-[#EAE5F5]' : 'text-[#374151]'
                        }`}
                        style={{ fontSize: '22px' }}
                      >
                        {cleanDisplayText(evaluation.summary)}
                      </p>
                    )}

                    {/* Breakdown Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {/* Explained Correctly */}
                      <div className={`rounded-2xl border p-5 ${nestedSurfaceClass}`}>
                        <div className="flex items-center gap-2 font-black text-emerald-400 mb-3" style={{ fontSize: '22px' }}>
                          <CheckCircle2 className="w-5 h-5 shrink-0" />
                          <span>Explained Correctly</span>
                        </div>
                        {evaluation.explainedCorrectly?.length > 0 ? (
                          <ul className="list-disc pl-6 space-y-2.5 m-0" style={{ fontSize: '21px' }}>
                            {evaluation.explainedCorrectly.map((item, i) => (
                              <li key={i} className="leading-relaxed">
                                {cleanDisplayText(item)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="m-0 opacity-75" style={{ fontSize: '20px' }}>
                            No clear accurate points detected yet—let us build this up together.
                          </p>
                        )}
                      </div>

                      {/* Missing Points */}
                      <div className={`rounded-2xl border p-5 ${nestedSurfaceClass}`}>
                        <div className="flex items-center gap-2 font-black text-amber-400 mb-3" style={{ fontSize: '22px' }}>
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          <span>Important Missing Points</span>
                        </div>
                        {evaluation.missingPoints?.length > 0 ? (
                          <ul className="list-disc pl-6 space-y-2.5 m-0" style={{ fontSize: '21px' }}>
                            {evaluation.missingPoints.map((item, i) => (
                              <li key={i} className="leading-relaxed">
                                {cleanDisplayText(item)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="m-0 opacity-75" style={{ fontSize: '20px' }}>
                            No major omissions for this difficulty level.
                          </p>
                        )}
                      </div>

                      {/* Misconceptions */}
                      <div className={`rounded-2xl border p-5 ${nestedSurfaceClass}`}>
                        <div className="flex items-center gap-2 font-black text-rose-400 mb-3" style={{ fontSize: '22px' }}>
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          <span>Misconceptions &amp; Mistakes</span>
                        </div>
                        {evaluation.misconceptions?.length > 0 ? (
                          <ul className="list-disc pl-6 space-y-2.5 m-0" style={{ fontSize: '21px' }}>
                            {evaluation.misconceptions.map((item, i) => (
                              <li key={i} className="leading-relaxed">
                                {cleanDisplayText(item)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="m-0 opacity-75" style={{ fontSize: '20px' }}>
                            No factual misconceptions spotted in your explanation.
                          </p>
                        )}
                      </div>

                      {/* How to Improve */}
                      <div className={`rounded-2xl border p-5 ${nestedSurfaceClass}`}>
                        <div
                          className={`flex items-center gap-2 font-black mb-3 ${
                            isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                          }`}
                          style={{ fontSize: '22px' }}
                        >
                          <TrendingUp className="w-5 h-5 shrink-0" />
                          <span>How to Improve</span>
                        </div>
                        {evaluation.improvementTips?.length > 0 ? (
                          <ul className="list-disc pl-6 space-y-2.5 m-0" style={{ fontSize: '21px' }}>
                            {evaluation.improvementTips.map((item, i) => (
                              <li key={i} className="leading-relaxed">
                                {cleanDisplayText(item)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="m-0 opacity-75" style={{ fontSize: '20px' }}>
                            Try explaining a concrete real-world example to reinforce mastery.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Optional Corrected Explanation */}
                    {evaluation.correctedExplanation && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setShowCorrected((prev) => !prev)}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition cursor-pointer ${secondaryBtnClass}`}
                          style={{ fontSize: '19px' }}
                        >
                          <BookOpenCheck className="w-4 h-4" />
                          <span>
                            {showCorrected
                              ? 'Hide Corrected Explanation'
                              : 'Show Corrected Explanation'}
                          </span>
                        </button>

                        {showCorrected && (
                          <div
                            className={`mt-3 rounded-2xl border p-5 leading-relaxed ${nestedSurfaceClass}`}
                            style={{ fontSize: '21px' }}
                          >
                            {cleanDisplayText(evaluation.correctedExplanation)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Interactive AI Teacher Dialogue */}
                  <div
                    className={`border rounded-3xl p-6 shadow-sm space-y-5 ${surfaceClass}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageCircle
                        className={`w-6 h-6 ${
                          isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                        }`}
                      />
                      <h2 className="font-black" style={{ fontSize: '28px' }}>
                        Ai Check-In &amp; Guidance
                      </h2>
                    </div>

                    {evaluation.followUpQuestion && (
                      <div
                        className={`rounded-2xl border p-4 ${nestedSurfaceClass}`}
                        style={{ fontSize: '21px' }}
                      >
                        <span className="font-black block mb-1">
                          Follow-Up Question:
                        </span>
                        <span>{cleanDisplayText(evaluation.followUpQuestion)}</span>
                      </div>
                    )}

                    {/* Dialogue Thread */}
                    {activeSession.dialogue?.length > 0 && (
                      <ul className="space-y-3 list-none m-0 p-0 max-h-[340px] overflow-y-auto pr-1">
                        {activeSession.dialogue.map((turn, idx) => {
                          const isTeacher = turn.role === 'teacher';
                          return (
                            <li
                              key={turn._id || idx}
                              className={`rounded-2xl border p-4 ${
                                isTeacher
                                  ? nestedSurfaceClass
                                  : isDark
                                  ? 'bg-[#342C47] border-purple-300/40 text-[#F3F0FA]'
                                  : 'bg-[#54626f] border-[#54626f] text-white'
                              }`}
                              style={{ fontSize: '21px' }}
                            >
                              <div className="font-extrabold text-sm uppercase tracking-wider mb-1 opacity-80">
                                {isTeacher ? 'Teacher' : 'You'}
                              </div>
                              <p className="m-0 leading-relaxed whitespace-pre-line">
                                {cleanDisplayText(turn.content)}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {/* Confusing Part & Support Actions */}
                    <div
                      className={`space-y-3 pt-2 border-t ${
                        isDark ? 'border-purple-400/20' : 'border-[#54626f]/20'
                      }`}
                    >
                      <label
                        htmlFor="teachme-confusing-input"
                        className="block font-bold"
                        style={{ fontSize: '19px' }}
                      >
                        Confusing Part or Specific Question (Optional)
                      </label>
                      <input
                        id="teachme-confusing-input"
                        type="text"
                        value={confusingPart}
                        onChange={(e) => setConfusingPart(e.target.value)}
                        placeholder="e.g., Why does circular wait cause deadlock?"
                        className={`w-full rounded-2xl border px-4 py-2.5 font-medium outline-none ${inputClass}`}
                        style={{ fontSize: '20px' }}
                      />

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          disabled={interacting}
                          onClick={() => handleTeacherInteraction('hint')}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition cursor-pointer disabled:opacity-50 ${secondaryBtnClass}`}
                          style={{ fontSize: '19px' }}
                        >
                          <Lightbulb className="w-4 h-4" />
                          <span>Give a Hint</span>
                        </button>

                        <button
                          type="button"
                          disabled={interacting}
                          onClick={() => handleTeacherInteraction('clarify')}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition cursor-pointer disabled:opacity-50 ${secondaryBtnClass}`}
                          style={{ fontSize: '19px' }}
                        >
                          <HelpCircle className="w-4 h-4" />
                          <span>Explain Confusing Part</span>
                        </button>

                        <button
                          type="button"
                          disabled={interacting}
                          onClick={() =>
                            handleTeacherInteraction('corrected_explanation')
                          }
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition cursor-pointer disabled:opacity-50 ${secondaryBtnClass}`}
                          style={{ fontSize: '19px' }}
                        >
                          <BookOpenCheck className="w-4 h-4" />
                          <span>Corrected Explanation</span>
                        </button>
                      </div>

                      {/* Reply to Follow-Up Question */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                        <input
                          type="text"
                          value={followUpReply}
                          onChange={(e) => setFollowUpReply(e.target.value)}
                          placeholder="Answer the teacher's follow-up question..."
                          className={`flex-1 min-w-0 rounded-2xl border px-4 py-3 font-medium outline-none ${inputClass}`}
                          style={{ fontSize: '21px' }}
                        />
                        <button
                          type="button"
                          disabled={interacting}
                          onClick={() =>
                            handleTeacherInteraction('answer_followup')
                          }
                          className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold transition cursor-pointer shrink-0 disabled:opacity-50 ${primaryBtnClass}`}
                          style={{ fontSize: '20px' }}
                        >
                          <Send className="w-5 h-5" />
                          <span>{interacting ? 'Sending...' : 'Reply'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Learning History & Progress */}
            <div className="lg:col-span-4 space-y-6">
              <div
                className={`border rounded-3xl p-5 shadow-sm space-y-4 h-fit ${surfaceClass}`}
              >
                <div className="flex items-center gap-2">
                  <History
                    className={`w-5 h-5 ${
                      isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                    }`}
                  />
                  <h2 className="font-black" style={{ fontSize: '25px' }}>
                    Teaching History
                  </h2>
                </div>

                {loadingHistory ? (
                  <p
                    className={`font-semibold ${
                      isDark ? 'text-[#B5ACC9]' : 'text-[#54626f]'
                    }`}
                    style={{ fontSize: '20px' }}
                  >
                    Loading past sessions...
                  </p>
                ) : historySessions.length === 0 ? (
                  <p
                    className={`${isDark ? 'text-[#B5ACC9]' : 'text-[#54626f]'}`}
                    style={{ fontSize: '20px' }}
                  >
                    Your teaching sessions and score progress will appear here after your first explanation.
                  </p>
                ) : (
                  <ul className="space-y-3 list-none m-0 p-0 max-h-[680px] overflow-y-auto pr-1">
                    {historySessions.map((item) => {
                      const isCurrent =
                        activeSession && String(activeSession._id) === String(item._id);
                      const itemScore = item?.evaluation?.score ?? 0;

                      return (
                        <li
                          key={item._id}
                          onClick={() => handleOpenHistorySession(item)}
                          className={`rounded-2xl border p-4 transition cursor-pointer space-y-2 ${
                            isCurrent
                              ? isDark
                                ? 'bg-[#342C47] border-purple-300/50'
                                : 'bg-[#e2eaeb] border-[#54626f]/40'
                              : `${nestedSurfaceClass} hover:opacity-90`
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className="font-extrabold leading-snug m-0"
                              style={{ fontSize: '21px' }}
                            >
                              {cleanDisplayText(item.topic)}
                            </p>
                            <span
                              className={`px-3 py-0.5 rounded-full font-black border shrink-0 ${getScoreBadgeClasses(
                                itemScore,
                                isDark
                              )}`}
                              style={{ fontSize: '17px' }}
                            >
                              {itemScore}%
                            </span>
                          </div>

                          <div
                            className={`flex items-center justify-between font-bold ${
                              isDark ? 'text-[#B5ACC9]' : 'text-[#54626f]'
                            }`}
                            style={{ fontSize: '16px' }}
                          >
                            <span>{item.difficulty}</span>
                            <span>
                              {item.createdAt
                                ? new Date(item.createdAt).toLocaleDateString()
                                : ''}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}