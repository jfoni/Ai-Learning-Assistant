import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { fetchDocuments } from '../../services/documentService';
import { useTheme } from '../../context/ThemeContext';
import AppSidebar from '../../components/AppSidebar';
import {
  Menu,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
  BookOpen,
  Upload,
  FileText,
  Clock,
  AlertCircle,
} from 'lucide-react';

const QUESTION_TYPES = [
  'Most Important (Mixed)',
  'Definitions & Terms',
  'Numerical Problems',
  'Core Concepts & How It Works',
  'Comparisons & Differences',
  'Exam & Application Questions',
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const cleanDollars = (text) =>
  String(text || '')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1') .replace(/\$([^$\n]+?)\$/g, '$1')
    .replace(/\$/g, '')
    .trim();

const formatSeconds = (totalSec) => {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Extract readable text from an uploaded PDF or TXT file in browser when possible
const extractUploadedFileText = async (file) => {
  if (!file) return '';
  if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
    return cleanDollars(await file.text());
  }

  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const rawDecoder = new TextDecoder('latin1');
    const rawStr = rawDecoder.decode(bytes);
    const matches = rawStr.match(/\(([^()\\]{3,200})\)/g) || [];
    const readable = matches
      .map((m) => m.slice(1, -1))
      .join(' ')
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleanDollars(readable.slice(0, 15000));
  } catch {
    return '';
  }
};

const buildFallbackQuestions = ({ topic, category, difficulty, count }) => {
  const safeTopic = cleanDollars(topic) || 'Core Topic';
  const safeType = cleanDollars(category) || QUESTION_TYPES[0];
  const safeDiff = cleanDollars(difficulty) || 'Medium';
  const total = Math.max(1, Math.min(20, Number(count) || 5));

  return Array.from({ length: total }, (_, idx) => {
    const qNum = idx + 1;
    const rightOption = `Accurate ${safeType} answer for ${safeTopic} (${safeDiff})`;
    return {
      question: `Q${qNum} (${safeType} - ${safeDiff}): Which statement is most accurate for ${safeTopic}?`,
      options: [
        rightOption,
        `Incorrect assumption ignoring ${safeTopic} rules`,
        'Unrelated concept outside the study scope',
        'Incomplete statement missing required conditions',
      ],
      correctAnswer: rightOption,
      explanation: `${rightOption} is correct because it directly satisfies ${safeType} requirements for ${safeTopic}.`,
    };
  });
};

export default function QuizTakePage() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [userId, setUserId] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Saved documents & uploaded PDF state
  const [savedDocs, setSavedDocs] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);

  // Quiz setup state
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState(QUESTION_TYPES[0]);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState('Medium');

  // Active quiz state
  const [quizId, setQuizId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitWarning, setSubmitWarning] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const uid = user?.uid || '';
      setUserId(uid);
      if (uid) {
        const docs = await fetchDocuments(uid).catch(() => []);
        setSavedDocs(Array.isArray(docs) ? docs : []);
      }
    });
    return () => unsubscribe();
  }, []);

  // Support retrying specific questions passed from QuizResultPage
  useEffect(() => {
    const retryState = location.state?.retryQuestions;
    if (Array.isArray(retryState) && retryState.length > 0) {
      setQuizId(null);
      setTopic(cleanDollars(location.state?.topic || 'Weak Questions Review'));
      setCategory(cleanDollars(location.state?.category || QUESTION_TYPES[0]));
      setDifficulty(cleanDollars(location.state?.difficulty || 'Medium'));
      setQuestions(retryState);
      setSelectedAnswers({});
      setSubmitWarning('');
      setCurrentIndex(0);
      setElapsedSeconds(0);
      setQuizStarted(true);
    }
  }, [location.state]);

  // Live timer while quiz is running
  useEffect(() => {
    if (!quizStarted) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [quizStarted]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setUploadedFile(file);
    if (file && !topic.trim()) {
      const baseName = file.name.replace(/\.(pdf|txt)$/i, '').trim();
      setTopic(baseName);
    }
  };

  const handleStartQuiz = async (e) => {
    e.preventDefault();

    const matchedDoc = savedDocs.find((d) => String(d._id) === String(selectedDocId));
    const derivedTopic =
      cleanDollars(topic) ||
      (uploadedFile ? cleanDollars(uploadedFile.name.replace(/\.(pdf|txt)$/i, '')) : '') ||
      (matchedDoc ? cleanDollars(matchedDoc.title) : '');

    if (!derivedTopic && !selectedDocId && !uploadedFile) {
      setErrorMsg('Please enter a topic, choose a saved document, or upload a PDF.');
      return;
    }

    const boundedCount = Math.max(1, Math.min(20, Number(questionCount) || 5));
    setQuestionCount(boundedCount);
    setErrorMsg('');
    setSubmitWarning('');
    setGenerating(true);

    const pdfText = uploadedFile ? await extractUploadedFileText(uploadedFile) : '';

    const payload = {
      userId,
      title: derivedTopic,
      topic: derivedTopic,
      customTopic: derivedTopic,
      category,
      difficulty,
      questionCount: boundedCount,
      count: boundedCount,
      documentId: selectedDocId || null,
      pdfText,
    };

    try {
      const res = await axios.post('http://localhost:8000/api/quizzes/generate', payload);
      const createdQuiz = res.data?.data;
      setQuizId(createdQuiz?._id || null);

      const rawList = Array.isArray(createdQuiz?.questions) ? createdQuiz.questions : [];
      const cleanedList = rawList.slice(0, boundedCount).map((q, idx) => {
        const opts =
          Array.isArray(q.options) && q.options.length > 0
            ? q.options.map((o) => cleanDollars(o))
            : ['Option A', 'Option B', 'Option C', 'Option D'];
        const rightAns = cleanDollars(q.correctAnswer) || opts[0];
        return {
          id: q.id || `q-${idx + 1}`,
          question: cleanDollars(q.question || `Question ${idx + 1}`),
          options: opts,
          correctAnswer: rightAns,
          explanation:
            cleanDollars(q.explanation) ||
            `${rightAns} is the correct answer for this question.`,
        };
      });

      const finalQuestions =
        cleanedList.length > 0 ? cleanedList : buildFallbackQuestions(payload);

      setTopic(derivedTopic);
      setQuestions(finalQuestions);
      setSelectedAnswers({});
      setCurrentIndex(0);
      setElapsedSeconds(0);
      setQuizStarted(true);
    } catch (err) {
      console.warn('Using fallback quiz generator:', err?.message || err);
      setQuizId(null);
      setTopic(derivedTopic);
      setQuestions(buildFallbackQuestions(payload));
      setSelectedAnswers({});
      setCurrentIndex(0);
      setElapsedSeconds(0);
      setQuizStarted(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = (qIndex, optText) => {
    setSubmitWarning('');
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIndex]: optText,
    }));
  };

  const handleSubmitQuiz = async () => {
    const unansweredIndices = questions
      .map((_, idx) => idx)
      .filter((idx) => selectedAnswers[idx] === undefined || selectedAnswers[idx] === null);

    if (unansweredIndices.length > 0) {
      setSubmitWarning(
        `Please answer all ${Number(questions.length)} questions before submitting (${Number(unansweredIndices.length)} remaining).`
      );
      setCurrentIndex(unansweredIndices[0]);
      return;
    }

    setSubmitting(true);

    const correctCount = questions.reduce((acc, q, idx) => {
      return cleanDollars(selectedAnswers[idx]) === cleanDollars(q.correctAnswer)
        ? acc + 1
        : acc;
    }, 0);

    const total = Number(questions.length) || 1;
    const scorePercent = Math.round((correctCount / total) * 100);
    const finalTopic = topic || 'Study Quiz';
    const submissionId = `sub-${Date.now()}`;

    let backendSubmissionId = submissionId;
    if (quizId) {
      const formattedAnswers = questions.map((_, idx) => ({
        questionIndex: idx,
        selectedAnswer: selectedAnswers[idx],
      }));

      const apiSubmit = await axios
        .post('http://localhost:8000/api/quizzes/submit', {
          quizId,
          userId: userId || null,
          answers: formattedAnswers,
        })
        .catch(() => null);

      if (apiSubmit?.data?.data?.submissionId) {
        backendSubmissionId = apiSubmit.data.data.submissionId;
      }
    }

    const resultPayload = {
      submissionId: backendSubmissionId,
      quizId,
      topic: finalTopic,
      category,
      difficulty,
      durationSeconds: Number(elapsedSeconds),
      score: Number(correctCount),
      totalQuestions: Number(questions.length),
      percentage: Number(scorePercent),
      questions,
      selectedAnswers,
      submittedAt: new Date().toISOString(),
    };

    try {
      const existingRaw = localStorage.getItem('quiz_attempts_history');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const nextNum = Number(existing?.length || 0) + 1;

      const updatedHistory = [
        ...(Array.isArray(existing) ? existing : []),
        {
          id: backendSubmissionId,
          label: `Q${nextNum}`,
          topic: finalTopic,
          category,
          difficulty,
          score: Number(scorePercent),
          correctCount: Number(correctCount),
          totalQuestions: Number(questions.length),
          submittedAt: resultPayload.submittedAt,
        },
      ];

      const subRaw = localStorage.getItem('quiz_submissions_list');
      const existingSubs = subRaw ? JSON.parse(subRaw) : [];
      const updatedSubs = [
        {
          _id: backendSubmissionId,
          quizId,
          userId: userId || null,
          title: finalTopic,
          topic: finalTopic,
          category,
          difficulty,
          score: Number(correctCount),
          totalQuestions: Number(questions.length),
          percentage: Number(scorePercent),
          questions,
          selectedAnswers,
          createdAt: resultPayload.submittedAt,
        },
        ...(Array.isArray(existingSubs) ? existingSubs : []),
      ];

      localStorage.setItem('quiz_attempts_history', JSON.stringify(updatedHistory.slice(-20)));
      localStorage.setItem('quiz_submissions_list', JSON.stringify(updatedSubs.slice(0, 50)));
      localStorage.setItem('latest_quiz_result', JSON.stringify(resultPayload));
    } catch (storageErr) {
      console.error('Failed to store quiz result:', storageErr);
    } finally {
      setSubmitting(false);
    }

    navigate('/quizzes/result', { state: resultPayload });
  };

  const activeQuestion = questions[currentIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  return (
    <div
      className={`min-h-screen flex relative ${
        isDark ? 'bg-[#12141A] text-[#F3F4F6]' : 'bg-[#e2eaeb] text-[#1F2118]'
      }`}
      style={{ fontSize: '20px' }}
    >
      <AppSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Top header */}
          <div
            className={`border rounded-3xl p-6 sm:p-7 shadow-sm flex flex-wrap items-center justify-between gap-4 ${
              isDark
                ? 'bg-[#171A21] border-[#2C313C]'
                : 'bg-white/95 border-[#54626f]/20'
            }`}
          >
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                aria-label="Toggle sidebar"
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                  isDark
                    ? 'bg-[#222732] text-[#E5E7EB] hover:bg-[#2C3240]'
                    : 'bg-[#e2eaeb] text-[#1F2937] hover:bg-[#54626f] hover:text-white'
                }`}
              >
                <Menu className="w-6 h-6" />
              </button>

              <div>
                <h1
                  className={`font-black tracking-tight ${
                    isDark ? 'text-[#F3F4F6]' : 'text-[#1F2118]'
                  }`}
                  style={{ fontSize: '34px', lineHeight: 1.2 }}
                >
                  Custom Quiz Studio
                </h1>
                <p
                  className={`mt-1 ${
                    isDark ? 'text-[#D1D5DB] font-bold' : 'text-[#54626f] font-semibold'
                  }`}
                  style={{ fontSize: '18px' }}
                >
                  Create a quiz by topic, saved document, or PDF file
                </p>
              </div>
            </div>

            {quizStarted ? (
              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black ${
                    isDark
                      ? 'bg-[#222732] text-[#7EC4CF]'
                      : 'bg-[#e2eaeb] text-[#1f3b4d]'
                  }`}
                  style={{ fontSize: '17px' }}
                >
                  <Clock className="w-4 h-4" />
                  <span>{formatSeconds(elapsedSeconds)}</span>
                </span>

                <button
                  type="button"
                  onClick={() => setQuizStarted(false)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition cursor-pointer ${
                    isDark
                      ? 'bg-[#222732] text-[#F3F4F6] hover:bg-[#2C3240]'
                      : 'bg-[#e2eaeb] text-[#54626f] hover:bg-[#d2dee0]'
                  }`}
                  style={{ fontSize: '17px' }}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Setup</span>
                </button>
              </div>
            ) : null}
          </div>

          {!quizStarted ? (
            <form
              onSubmit={handleStartQuiz}
              className={`border rounded-3xl p-6 sm:p-8 shadow-sm space-y-7 ${
                isDark
                  ? 'bg-[#171A21] border-[#2C313C]'
                  : 'bg-white/95 border-[#54626f]/20'
              }`}
            >
              {/* Topic input */}
              <div>
                <label
                  className={`block uppercase tracking-wider mb-2.5 ${
                    isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f] font-extrabold'
                  }`}
                  style={{ fontSize: '15px' }}
                >
                  Topic (Type Any Topic)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Informed Search, Binary Tree Traversal, SQL Joins..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className={`w-full px-5 py-4 rounded-2xl border focus:outline-none focus:border-[#54626f] ${
                    isDark
                      ? 'bg-[#12141A] border-[#2E3542] text-[#F3F4F6] placeholder-[#9CA3AF] font-bold'
                      : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118]'
                  }`}
                  style={{ fontSize: '20px' }}
                />
              </div>

              {/* Saved document or PDF upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    className={`flex items-center gap-2 uppercase tracking-wider mb-2.5 ${
                      isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f] font-extrabold'
                    }`}
                    style={{ fontSize: '15px' }}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Saved Document</span>
                  </label>
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className={`w-full px-4 py-3.5 rounded-2xl border focus:outline-none focus:border-[#54626f] ${
                      isDark
                        ? 'bg-[#12141A] border-[#2E3542] text-[#F3F4F6] font-bold'
                        : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118] font-semibold'
                    }`}
                    style={{ fontSize: '18px' }}
                  >
                    <option value="">-- Select a saved document --</option>
                    {savedDocs.map((doc) => (
                      <option key={doc._id} value={doc._id}>
                        {doc.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className={`flex items-center gap-2 uppercase tracking-wider mb-2.5 ${
                      isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f] font-extrabold'
                    }`}
                    style={{ fontSize: '15px' }}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload PDF / Text File</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={handleFileChange}
                    className={`w-full px-4 py-3 rounded-2xl border cursor-pointer ${
                      isDark
                        ? 'bg-[#12141A] border-[#2E3542] text-[#E5E7EB] font-bold'
                        : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118] font-semibold'
                    }`}
                    style={{ fontSize: '17px' }}
                  />
                  {uploadedFile && (
                    <p
                      className={`mt-1.5 text-base font-bold truncate ${
                        isDark ? 'text-[#7EC4CF]' : 'text-[#1f3b4d]'
                      }`}
                    >
                      Selected: {uploadedFile.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Question Type dropdown & Number of Questions (1-20) slider + input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                  <label
                    className={`block uppercase tracking-wider mb-2.5 ${
                      isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f] font-extrabold'
                    }`}
                    style={{ fontSize: '15px' }}
                  >
                    Question Type
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`w-full px-4 py-3.5 rounded-2xl border focus:outline-none focus:border-[#54626f] ${
                      isDark
                        ? 'bg-[#12141A] border-[#2E3542] text-[#F3F4F6] font-bold'
                        : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118] font-semibold'
                    }`}
                    style={{ fontSize: '18px' }}
                  >
                    {QUESTION_TYPES.map((qType) => (
                      <option key={qType} value={qType}>
                        {qType}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label
                      className={`uppercase tracking-wider ${
                        isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f] font-extrabold'
                      }`}
                      style={{ fontSize: '15px' }}
                    >
                      Number of Questions (1–20)
                    </label>
                    <span
                      className={`px-3 py-1 rounded-full font-black ${
                        isDark
                          ? 'bg-[#22313A] text-[#7EC4CF]'
                          : 'bg-[#e2eaeb] text-[#1f3b4d]'
                      }`}
                      style={{ fontSize: '15px' }}
                    >
                      {Number(questionCount)} Questions
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                      className="flex-1 accent-[#54626f] cursor-pointer h-2.5"
                    />
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={questionCount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setQuestionCount(Math.max(1, Math.min(20, val || 1)));
                      }}
                      className={`w-20 px-3 py-2.5 rounded-2xl border font-black text-center ${
                        isDark
                          ? 'bg-[#12141A] border-[#2E3542] text-[#F3F4F6]'
                          : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118]'
                      }`}
                      style={{ fontSize: '19px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Difficulty selector */}
              <div>
                <label
                  className={`block uppercase tracking-wider mb-2.5 ${
                    isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f] font-extrabold'
                  }`}
                  style={{ fontSize: '15px' }}
                >
                  Difficulty Level
                </label>
                <div className="flex flex-wrap gap-3">
                  {DIFFICULTIES.map((level) => {
                    const active = difficulty === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setDifficulty(level)}
                        className={`px-6 py-3 rounded-2xl border transition cursor-pointer ${
                          isDark
                            ? active
                              ? 'bg-[#22313A] border-[#7EC4CF] text-[#E6F4F7] font-black'
                              : 'bg-[#12141A] border-[#2E3542] text-[#D1D5DB] hover:bg-[#222732] font-bold'
                            : active
                              ? 'bg-[#54626f] border-[#54626f] text-white font-bold'
                              : 'bg-[#f8fafb] border-[#54626f]/20 text-[#1F2118] hover:bg-[#e2eaeb]/70 font-semibold'
                        }`}
                        style={{ fontSize: '18px' }}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMsg && (
                <p className="text-red-500 font-bold" style={{ fontSize: '18px' }}>
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={generating}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl transition shadow-sm disabled:opacity-50 cursor-pointer ${
                  isDark
                    ? 'bg-[#7EC4CF] text-[#000000] hover:bg-[#93D1DA] font-black'
                    : 'bg-[#54626f] text-white hover:bg-[#1F2118] font-bold'
                }`}
                style={{ fontSize: '20px' }}
              >
                <Sparkles className="w-5 h-5" />
                <span>{generating ? 'Generating Quiz...' : 'Start Quiz'}</span>
              </button>
            </form>
          ) : (
            <div
              className={`border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 ${
                isDark
                  ? 'bg-[#171A21] border-[#2C313C]'
                  : 'bg-white/95 border-[#54626f]/20'
              }`}
            >
              {/* Meta bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#54626f]/15">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-extrabold ${
                      isDark
                        ? 'bg-[#22313A] text-[#7EC4CF]'
                        : 'bg-[#e2eaeb] text-[#1f3b4d]'
                    }`}
                    style={{ fontSize: '16px' }}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{category}</span>
                  </span>
                  <span
                    className={`px-4 py-1.5 rounded-full font-extrabold ${
                      isDark
                        ? 'bg-[#222732] text-[#E5B880]'
                        : 'bg-[#e2eaeb] text-[#6b4c35]'
                    }`}
                    style={{ fontSize: '16px' }}
                  >
                    {difficulty}
                  </span>
                </div>

                <span
                  className={`font-black ${
                    isDark ? 'text-[#D1D5DB]' : 'text-[#54626f]'
                  }`}
                  style={{ fontSize: '18px' }}
                >
                  Question {Number(currentIndex + 1)} of {Number(questions.length)} •{' '}
                  {Number(answeredCount)}/{Number(questions.length)} Answered
                </span>
              </div>

              {/* Active question */}
              {activeQuestion && (
                <div className="space-y-5">
                  <h2
                    className={`font-black leading-snug ${
                      isDark ? 'text-[#F3F4F6]' : 'text-[#1F2118]'
                    }`}
                    style={{ fontSize: '26px' }}
                  >
                    {activeQuestion.question}
                  </h2>

                  <ul className="space-y-3.5 list-none m-0 p-0">
                    {(activeQuestion.options || []).map((opt, optIdx) => {
                      const isChosen = selectedAnswers[currentIndex] === opt;
                      const letter = OPTION_LETTERS[optIdx] || String(optIdx + 1);
                      return (
                        <li key={optIdx}>
                          <button
                            type="button"
                            onClick={() => handleSelectOption(currentIndex, opt)}
                            className={`w-full text-left px-5 py-4 rounded-2xl border flex items-center justify-between gap-3 transition cursor-pointer ${
                              isDark
                                ? isChosen
                                  ? 'bg-[#22313A] border-[#7EC4CF] text-[#E6F4F7] font-black'
                                  : 'bg-[#12141A] border-[#2E3542] text-[#F3F4F6] hover:bg-[#222732] font-bold'
                                : isChosen
                                  ? 'bg-[#54626f] border-[#54626f] text-white font-bold'
                                  : 'bg-[#f8fafb] border-[#54626f]/20 text-[#1F2118] hover:bg-[#e2eaeb]/70 font-semibold'
                            }`}
                            style={{ fontSize: '20px' }}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <span
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-black shrink-0 ${
                                  isDark
                                    ? isChosen
                                      ? 'bg-[#7EC4CF] text-[#000000]'
                                      : 'bg-[#222732] text-[#D1D5DB]'
                                    : isChosen
                                      ? 'bg-white text-[#54626f]'
                                      : 'bg-[#e2eaeb] text-[#54626f]'
                                }`}
                              >
                                {letter}
                              </span>
                              <span>{opt}</span>
                            </div>
                            {isChosen && <CheckCircle2 className="w-6 h-6 shrink-0" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {submitWarning && (
                <div
                  className={`rounded-2xl border px-4 py-3 flex items-center gap-2.5 font-bold ${
                    isDark
                      ? 'bg-rose-950/35 border-rose-500/40 text-rose-200'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                  style={{ fontSize: '17px' }}
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{submitWarning}</span>
                </div>
              )}

              {/* Navigation controls */}
              <div className="pt-4 border-t border-[#54626f]/15 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className={`inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold transition disabled:opacity-40 cursor-pointer ${
                    isDark
                      ? 'bg-[#222732] text-[#F3F4F6] hover:bg-[#2C3240]'
                      : 'bg-[#e2eaeb] text-[#54626f] hover:bg-[#d2dee0]'
                  }`}
                  style={{ fontSize: '19px' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))
                    }
                    className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition cursor-pointer ${
                      isDark
                        ? 'bg-[#222732] text-[#F3F4F6] hover:bg-[#2C3240] font-black'
                        : 'bg-[#54626f] text-white hover:bg-[#1F2118]'
                    }`}
                    style={{ fontSize: '19px' }}
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitQuiz}
                    className={`inline-flex items-center gap-2 px-7 py-4 rounded-2xl transition cursor-pointer ${
                      allAnswered
                        ? isDark
                          ? 'bg-[#7EC4CF] text-[#000000] hover:bg-[#93D1DA] font-black'
                          : 'bg-[#54626f] text-white hover:bg-[#1F2118] font-bold'
                        : isDark
                          ? 'bg-[#222732] text-[#9CA3AF] border border-[#2E3542] font-bold'
                          : 'bg-[#e2eaeb] text-[#54626f] border border-[#54626f]/25 font-bold'
                    }`}
                    style={{ fontSize: '19px' }}
                  >
                    <span>{submitting ? 'Saving Result...' : 'Finish & View Result'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}