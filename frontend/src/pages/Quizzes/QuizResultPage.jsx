import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { getQuizSubmissions } from '../../services/quizService';
import { useTheme } from '../../context/ThemeContext';
import AppSidebar from '../../components/AppSidebar';
import QuizResultTrendGraph from '../../components/QuizResultTrendGraph';
import {
  Menu,
  Award,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Repeat,
} from 'lucide-react';

const stripDollars = (text) =>
  String(text || '')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$\n]+?)\$/g, '$1')
    .replace(/\$/g, '')
    .trim();

const cleanTopicTitle = (raw = '') => {
  const cleaned = stripDollars(raw)
    .replace(/\bpdf\b/gi, '')
    .replace(/\.(pdf|docx|doc|pptx|ppt|txt|csv|md)\b/gi, '')
    .replace(/\s*\(\d+\)\s*/g, ' ')
    .replace(/^\s*\d+(\.\d+)*[.):\-\s]+/, '')
    .replace(/[#*^$`~|\\{}[\]<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.replace(/\.+$/, '').trim() || 'Study Quiz';
};

export default function QuizResultPage() {
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSubmissions, setActiveSubmissions] = useState([]);
  const [filterMode, setFilterMode] = useState('all');

  const stateData = (() => {
    if (location.state?.questions) return location.state;
    try {
      const saved = localStorage.getItem('latest_quiz_result');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    let isMounted = true;

    const syncHistory = async (uid) => {
      let localSubs = [];
      try {
        const raw = localStorage.getItem('quiz_submissions_list');
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) localSubs = parsed;
      } catch {
        localSubs = [];
      }

      if (uid) {
        const backendSubs = await getQuizSubmissions(uid).catch(() => null);
        if (Array.isArray(backendSubs) && isMounted) {
          setActiveSubmissions(backendSubs);
          return;
        }
      }

      if (isMounted) {
        setActiveSubmissions(localSubs);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      syncHistory(user?.uid || '');
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const questions = Array.isArray(stateData?.questions) ? stateData.questions : [];
  const selectedAnswers = stateData?.selectedAnswers || {};
  const topic = cleanTopicTitle(stateData?.topic || stateData?.title || 'Study Quiz');
  const category = stripDollars(stateData?.category || 'Mixed');
  const difficulty = stripDollars(stateData?.difficulty || 'Medium');

  const resolveRightAnswer = (q) => {
    if (q?.correctAnswer) return stripDollars(q.correctAnswer);
    if (typeof q?.correctIndex === 'number' && Array.isArray(q.options)) {
      return stripDollars(q.options[q.correctIndex] || '');
    }
    return '';
  };

  const reviewedItems = questions.map((q, idx) => {
    const chosen = stripDollars(selectedAnswers[idx] ?? '');
    const rightAns = resolveRightAnswer(q);
    const isCorrect = Boolean(chosen && chosen === rightAns);
    const reason = stripDollars(
      q.explanation ||
        `${rightAns} is the correct choice because it directly answers the question.`
    );
    return { q, idx, chosen, rightAns, isCorrect, reason };
  });

  const correctCount = reviewedItems.filter((item) => item.isCorrect).length;
  const wrongItems = reviewedItems.filter((item) => !item.isCorrect);
  const totalCount = Number(questions.length);
  const scorePercent =
    totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  const visibleItems = reviewedItems.filter((item) => {
    if (filterMode === 'wrong') return !item.isCorrect;
    if (filterMode === 'correct') return item.isCorrect;
    return true;
  });

  const handleRetryWrong = () => {
    const wrongQuestions = wrongItems.map((w) => w.q);
    if (wrongQuestions.length === 0) return;
    navigate('/quizzes', {
      state: {
        topic: `${topic} (Wrong Review)`,
        category,
        difficulty,
        retryQuestions: wrongQuestions,
      },
    });
  };

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
          {/* Header */}
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
                  Quiz Result
                </h1>
                <p
                  className={`mt-1 ${
                    isDark ? 'text-[#D1D5DB] font-bold' : 'text-[#54626f] font-semibold'
                  }`}
                  style={{ fontSize: '18px' }}
                >
                  {topic} • {category} • {difficulty}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {wrongItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleRetryWrong}
                  className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl transition cursor-pointer ${
                    isDark
                      ? 'bg-[#222732] text-[#E5B880] hover:bg-[#2C3240] font-black'
                      : 'bg-[#e2eaeb] text-[#1F2118] hover:bg-[#d2dee0] font-bold'
                  }`}
                  style={{ fontSize: '17px' }}
                >
                  <Repeat className="w-4 h-4" />
                  <span>Practice Wrong ({Number(wrongItems.length)})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate('/quizzes')}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl transition cursor-pointer ${
                  isDark
                    ? 'bg-[#7EC4CF] text-[#000000] hover:bg-[#93D1DA] font-black'
                    : 'bg-[#54626f] text-white hover:bg-[#1F2118] font-bold'
                }`}
                style={{ fontSize: '18px' }}
              >
                <RotateCcw className="w-4 h-4" />
                <span>New Quiz</span>
              </button>
            </div>
          </div>

          {/* Score & stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              className={`border rounded-3xl p-5 shadow-sm flex items-center gap-4 ${
                isDark
                  ? 'bg-[#171A21] border-[#2C313C]'
                  : 'bg-white/95 border-[#54626f]/20'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  isDark
                    ? 'bg-[#22313A] text-[#7EC4CF]'
                    : 'bg-[#e2eaeb] text-[#1f3b4d]'
                }`}
              >
                <Award className="w-7 h-7" />
              </div>
              <div>
                <p
                  className={`uppercase tracking-wider font-extrabold ${
                    isDark ? 'text-[#9CA3AF]' : 'text-[#54626f]'
                  }`}
                  style={{ fontSize: '14px' }}
                >
                  Score
                </p>
                <p className="font-black" style={{ fontSize: '30px' }}>
                  {Number(scorePercent)}%
                </p>
              </div>
            </div>

            <div
              className={`border rounded-3xl p-5 shadow-sm ${
                isDark
                  ? 'bg-[#171A21] border-[#2C313C]'
                  : 'bg-white/95 border-[#54626f]/20'
              }`}
            >
              <p
                className={`uppercase tracking-wider font-extrabold ${
                  isDark ? 'text-[#9CA3AF]' : 'text-[#54626f]'
                }`}
                style={{ fontSize: '14px' }}
              >
                Correct Answers
              </p>
              <p className="font-black text-emerald-500 mt-1" style={{ fontSize: '30px' }}>
                {Number(correctCount)} / {Number(totalCount)}
              </p>
            </div>

            <div
              className={`border rounded-3xl p-5 shadow-sm ${
                isDark
                  ? 'bg-[#171A21] border-[#2C313C]'
                  : 'bg-white/95 border-[#54626f]/20'
              }`}
            >
              <p
                className={`uppercase tracking-wider font-extrabold ${
                  isDark ? 'text-[#9CA3AF]' : 'text-[#54626f]'
                }`}
                style={{ fontSize: '14px' }}
              >
                Needs Review
              </p>
              <p className="font-black text-rose-500 mt-1" style={{ fontSize: '30px' }}>
                {Number(wrongItems.length)} Questions
              </p>
            </div>
          </div>

          {/* Quiz Score Trend Graph */}
          <QuizResultTrendGraph
            submissions={activeSubmissions}
            currentScore={scorePercent}
            isDark={isDark}
          />

          {/* Detailed answer breakdown */}
          {questions.length > 0 && (
            <div
              className={`border rounded-3xl p-6 sm:p-7 shadow-sm space-y-5 ${
                isDark
                  ? 'bg-[#171A21] border-[#2C313C]'
                  : 'bg-white/95 border-[#54626f]/20'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  className={`font-black ${
                    isDark ? 'text-[#F3F4F6]' : 'text-[#1F2118]'
                  }`}
                  style={{ fontSize: '26px' }}
                >
                  Answer Breakdown &amp; Explanations
                </h2>

                <div className="flex items-center gap-2">
                  {[
                    { key: 'all', label: `All (${Number(questions.length)})` },
                    { key: 'wrong', label: `Wrong (${Number(wrongItems.length)})` },
                    { key: 'correct', label: `Correct (${Number(correctCount)})` },
                  ].map((tab) => {
                    const active = filterMode === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setFilterMode(tab.key)}
                        className={`px-3.5 py-1.5 rounded-full font-bold transition cursor-pointer ${
                          isDark
                            ? active
                              ? 'bg-[#7EC4CF] text-[#000000] font-black'
                              : 'bg-[#222732] text-[#D1D5DB] hover:bg-[#2C3240]'
                            : active
                              ? 'bg-[#54626f] text-white'
                              : 'bg-[#e2eaeb] text-[#54626f] hover:bg-[#d2dee0]'
                        }`}
                        style={{ fontSize: '15px' }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <ul className="space-y-4 list-none m-0 p-0">
                {visibleItems.map(({ q, idx, chosen, rightAns, isCorrect, reason }) => (
                  <li
                    key={q.id || idx}
                    className={`rounded-2xl border p-5 space-y-2.5 ${
                      isDark
                        ? 'bg-[#12141A] border-[#2E3542]'
                        : 'bg-[#f8fafb] border-[#54626f]/15'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p
                        className={`font-black leading-snug ${
                          isDark ? 'text-[#F3F4F6]' : 'text-[#1F2118]'
                        }`}
                        style={{ fontSize: '22px' }}
                      >
                        {Number(idx + 1)}. {cleanTopicTitle(q.question)}
                      </p>
                      {isCorrect ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                      )}
                    </div>

                    <p
                      className={`${
                        isDark ? 'text-[#E5E7EB] font-bold' : 'text-[#1F2118] font-semibold'
                      }`}
                      style={{ fontSize: '19px' }}
                    >
                      Your Answer:{' '}
                      <span className={isCorrect ? 'text-emerald-400' : 'text-rose-400'}>
                        {chosen || 'Not answered'}
                      </span>
                    </p>

                    <p
                      className={`font-extrabold ${
                        isDark ? 'text-[#7EC4CF]' : 'text-[#1f3b4d]'
                      }`}
                      style={{ fontSize: '19px' }}
                    >
                      Correct Answer: <span>{rightAns}</span>
                    </p>

                    <div
                      className={`pt-2 border-t ${
                        isDark
                          ? 'border-[#262C38] text-[#D1D5DB] font-semibold'
                          : 'border-[#54626f]/15 text-[#54626f] font-medium'
                      }`}
                      style={{ fontSize: '18px' }}
                    >
                      <strong className={isDark ? 'text-[#F3F4F6]' : 'text-[#1F2118]'}>
                        Why This Is Correct:
                      </strong>{' '}
                      <span>{reason}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}