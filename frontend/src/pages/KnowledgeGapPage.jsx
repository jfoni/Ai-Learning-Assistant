import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { analyzeKnowledgeGaps } from '../services/knowledgeGapService';
import { useTheme } from '../context/ThemeContext';
import AppSidebar from '../components/AppSidebar';
import {
  Menu,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  Layers,
  Sparkles,
  FileText,
  RefreshCw,
} from 'lucide-react';

const badgeStyle = (category, isDark) => {
  if (category === 'Weak') {
    return isDark
      ? 'bg-rose-950/50 text-rose-300 border-rose-500/30'
      : 'bg-rose-100 text-rose-700 border-rose-200';
  }
  if (category === 'Needs Improvement') {
    return isDark
      ? 'bg-amber-950/50 text-amber-300 border-amber-500/30'
      : 'bg-amber-100 text-amber-800 border-amber-200';
  }
  return isDark
    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30'
    : 'bg-emerald-100 text-emerald-700 border-emerald-200';
};

const barColor = (category, isDark) => {
  if (category === 'Weak') return 'bg-rose-500';
  if (category === 'Needs Improvement') return 'bg-amber-500';
  return isDark ? 'bg-[#7EC4CF]' : 'bg-[#2F5D68]';
};

export default function KnowledgeGapPage() {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [userId, setUserId] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [report, setReport] = useState({
    hasEnoughData: false,
    totalSubmissionsAnalyzed: 0,
    topics: [],
    aiInsights: null,
  });

  const loadAnalysis = useCallback(async (uid) => {
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await analyzeKnowledgeGaps(uid);
      setReport(data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Could not load knowledge gap analysis right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const uid = user?.uid || '';
      setUserId(uid);
      loadAnalysis(uid);
    });
    return () => unsub();
  }, [loadAnalysis]);

  const topics = Array.isArray(report?.topics) ? report.topics : [];
  const weakTopics = topics.filter((t) => t.category === 'Weak');
  const needsWorkTopics = topics.filter((t) => t.category === 'Needs Improvement');
  const strongTopics = topics.filter((t) => t.category === 'Strong');
  const analyses = Array.isArray(report?.aiInsights?.topicAnalyses)
    ? report.aiInsights.topicAnalyses
    : [];

  const handlePracticeTopic = (topicName) => {
    navigate('/quizzes', {
      state: {
        topic: topicName,
        category: 'Exam & Application Questions',
        difficulty: 'Medium',
      },
    });
  };

  return (
    <div
      className={`min-h-screen flex relative ${
        isDark ? 'bg-[#12141A] text-[#F3F4F6]' : 'bg-[#e2eaeb] text-[#1F2118]'
      }`}
      style={{ fontSize: '22px' }}
    >
      <AppSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
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
                  className="font-black tracking-tight"
                  style={{ fontSize: '38px', lineHeight: 1.2 }}
                >
                  AI Knowledge Gap Detector
                </h1>
                <p
                  className={`mt-1 ${
                    isDark ? 'text-[#D1D5DB] font-semibold' : 'text-[#54626f] font-medium'
                  }`}
                  style={{ fontSize: '20px' }}
                >
                  Pinpoints weak concepts, recurring mistakes, and next study steps from your actual quiz history
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadAnalysis(userId)}
              disabled={loading || !userId}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition cursor-pointer disabled:opacity-50 ${
                isDark
                  ? 'bg-[#222732] text-[#7EC4CF] hover:bg-[#2C3240]'
                  : 'bg-[#e2eaeb] text-[#1F2937] hover:bg-[#d2dee0]'
              }`}
              style={{ fontSize: '19px' }}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Analysis</span>
            </button>
          </div>

          {loading ? (
            <div
              className={`border rounded-3xl p-10 text-center font-bold ${
                isDark
                  ? 'bg-[#171A21] border-[#2C313C] text-[#D1D5DB]'
                  : 'bg-white/95 border-[#54626f]/20 text-[#54626f]'
              }`}
              style={{ fontSize: '22px' }}
            >
              Analyzing your learning history and quiz accuracy...
            </div>
          ) : errorMsg ? (
            <div
              className={`border rounded-3xl p-6 font-bold text-rose-500 ${
                isDark
                  ? 'bg-[#171A21] border-rose-500/30'
                  : 'bg-white border-rose-200'
              }`}
              style={{ fontSize: '21px' }}
            >
              {errorMsg}
            </div>
          ) : !report.hasEnoughData ? (
            <div
              className={`border rounded-3xl p-8 sm:p-10 text-center space-y-4 ${
                isDark
                  ? 'bg-[#171A21] border-[#2C313C]'
                  : 'bg-white/95 border-[#54626f]/20'
              }`}
            >
              <TrendingUp
                className={`w-12 h-12 mx-auto ${
                  isDark ? 'text-[#7EC4CF]' : 'text-[#2F5D68]'
                }`}
              />
              <h2 className="font-black" style={{ fontSize: '28px' }}>
                No Quiz History to Analyze Yet
              </h2>
              <p
                className={`max-w-xl mx-auto ${
                  isDark ? 'text-[#D1D5DB]' : 'text-[#54626f]'
                }`}
                style={{ fontSize: '20px' }}
              >
                Complete at least one quiz so the detector can evaluate your real answers, identify weak concepts, and recommend targeted revision.
              </p>
              <button
                type="button"
                onClick={() => navigate('/quizzes')}
                className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition cursor-pointer ${
                  isDark
                    ? 'bg-[#7EC4CF] text-black hover:bg-[#93D1DA]'
                    : 'bg-[#54626f] text-white hover:bg-[#1F2118]'
                }`}
                style={{ fontSize: '20px' }}
              >
                <Sparkles className="w-5 h-5" />
                <span>Take a Quiz</span>
              </button>
            </div>
          ) : (
            <>
              {/* Overview Counts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className={`border rounded-3xl p-6 ${
                    isDark
                      ? 'bg-[#171A21] border-[#2C313C]'
                      : 'bg-white/95 border-[#54626f]/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-extrabold uppercase tracking-wider ${
                        isDark ? 'text-[#9CA3AF]' : 'text-[#54626f]'
                      }`}
                      style={{ fontSize: '15px' }}
                    >
                      Weak Topics
                    </span>
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  </div>
                  <p className="font-black text-rose-500 mt-1.5" style={{ fontSize: '38px' }}>
                    {weakTopics.length}
                  </p>
                </div>

                <div
                  className={`border rounded-3xl p-6 ${
                    isDark
                      ? 'bg-[#171A21] border-[#2C313C]'
                      : 'bg-white/95 border-[#54626f]/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-extrabold uppercase tracking-wider ${
                        isDark ? 'text-[#9CA3AF]' : 'text-[#54626f]'
                      }`}
                      style={{ fontSize: '15px' }}
                    >
                      Needs Improvement
                    </span>
                    <BookOpen className="w-5 h-5 text-amber-500" />
                  </div>
                  <p className="font-black text-amber-500 mt-1.5" style={{ fontSize: '38px' }}>
                    {needsWorkTopics.length}
                  </p>
                </div>

                <div
                  className={`border rounded-3xl p-6 ${
                    isDark
                      ? 'bg-[#171A21] border-[#2C313C]'
                      : 'bg-white/95 border-[#54626f]/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-extrabold uppercase tracking-wider ${
                        isDark ? 'text-[#9CA3AF]' : 'text-[#54626f]'
                      }`}
                      style={{ fontSize: '15px' }}
                    >
                      Strong Topics
                    </span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="font-black text-emerald-500 mt-1.5" style={{ fontSize: '38px' }}>
                    {strongTopics.length}
                  </p>
                </div>
              </div>

              {/* AI Summary Banner */}
              {report.aiInsights?.summary && (
                <div
                  className={`border rounded-3xl p-6 flex items-start gap-4 ${
                    isDark
                      ? 'bg-[#171A21] border-[#2C313C]'
                      : 'bg-white/95 border-[#54626f]/20'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isDark
                        ? 'bg-[#22313A] text-[#7EC4CF]'
                        : 'bg-[#e2eaeb] text-[#2F5D68]'
                    }`}
                  >
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-black" style={{ fontSize: '26px' }}>
                      AI Diagnostic Summary
                    </h2>
                    <p
                      className={`mt-2 leading-relaxed ${
                        isDark ? 'text-[#E5E7EB]' : 'text-[#374151]'
                      }`}
                      style={{ fontSize: '21px' }}
                    >
                      {report.aiInsights.summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Topic-wise Performance & Progress Bars */}
              <div
                className={`border rounded-3xl p-6 sm:p-7 space-y-6 ${
                  isDark
                    ? 'bg-[#171A21] border-[#2C313C]'
                    : 'bg-white/95 border-[#54626f]/20'
                }`}
              >
                <h2 className="font-black" style={{ fontSize: '30px' }}>
                  Topic-wise Mastery &amp; Gaps
                </h2>

                <ul className="space-y-5 list-none m-0 p-0">
                  {topics.map((t) => {
                    const aiDetail = analyses.find(
                      (a) => a.topic.toLowerCase() === t.topic.toLowerCase()
                    );

                    const insightPoints =
                      aiDetail && t.category !== 'Strong'
                        ? [
                            {
                              label: 'Why it may be difficult',
                              value: aiDetail.whyDifficult,
                            },
                            {
                              label: 'Possible misconception',
                              value: aiDetail.possibleMisunderstanding,
                            },
                            {
                              label: 'Next step',
                              value: aiDetail.studyAdvice,
                            },
                            {
                              label: 'Flashcard focus',
                              value: aiDetail.flashcardFocus,
                            },
                          ]
                        : [];

                    return (
                      <li
                        key={t.topic}
                        className={`rounded-2xl border p-6 space-y-4 ${
                          isDark
                            ? 'bg-[#12141A] border-[#2E3542]'
                            : 'bg-[#f8fafb] border-[#54626f]/15'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-black" style={{ fontSize: '27px' }}>
                              {t.topic}
                            </h3>
                            <span
                              className={`font-extrabold px-4 py-1 rounded-full border ${badgeStyle(
                                t.category,
                                isDark
                              )}`}
                              style={{ fontSize: '16px' }}
                            >
                              {t.category}
                            </span>
                            {t.progressDelta !== null && (
                              <span
                                className={`font-bold px-3.5 py-1 rounded-full ${
                                  t.progressDelta >= 0
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-rose-100 text-rose-600'
                                }`}
                                style={{ fontSize: '16px' }}
                              >
                                {t.progressDelta >= 0
                                  ? `+${t.progressDelta}% recent`
                                  : `${t.progressDelta}% recent`}
                              </span>
                            )}
                          </div>

                          <span className="font-black" style={{ fontSize: '21px' }}>
                            Avg: {t.avgPercentage}% ({t.correctQuestions}/{t.totalQuestions} correct)
                          </span>
                        </div>

                        <div
                          className={`w-full h-3.5 rounded-full overflow-hidden ${
                            isDark ? 'bg-[#222732]' : 'bg-[#e2eaeb]'
                          }`}
                        >
                          <div
                            className={`h-full rounded-full transition-all ${barColor(
                              t.category,
                              isDark
                            )}`}
                            style={{ width: `${t.avgPercentage}%` }}
                          />
                        </div>

                        {insightPoints.length > 0 && (
                          <ul
                            className={`space-y-3 pt-3 border-t list-disc pl-7 m-0 ${
                              isDark
                                ? 'border-[#262C38] text-[#E5E7EB] marker:text-[#7EC4CF]'
                                : 'border-[#54626f]/15 text-[#374151] marker:text-[#2F5D68]'
                            }`}
                            style={{ fontSize: '21px' }}
                          >
                            {insightPoints.map((pt) => (
                              <li key={pt.label} className="leading-relaxed">
                                <strong
                                  className={
                                    isDark
                                      ? 'text-white font-extrabold'
                                      : 'text-[#1F2118] font-extrabold'
                                  }
                                >
                                  {pt.label}:
                                </strong>{' '}
                                <span>{pt.value}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                          <div className="flex items-center gap-2" style={{ fontSize: '18px' }}>
                            {t.recommendedDocument ? (
                              <span
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${
                                  isDark
                                    ? 'bg-[#222732] text-[#7EC4CF]'
                                    : 'bg-[#e2eaeb] text-[#1f3b4d]'
                                }`}
                              >
                                <FileText className="w-5 h-5" />
                                <span>Suggested Doc: {t.recommendedDocument.title}</span>
                              </span>
                            ) : (
                              <span
                                className={`font-semibold ${
                                  isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
                                }`}
                              >
                                Attempts: {t.attempts}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => navigate('/flashcards')}
                              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition cursor-pointer ${
                                isDark
                                  ? 'bg-[#222732] text-[#E5E7EB] hover:bg-[#2C3240]'
                                  : 'bg-[#e2eaeb] text-[#1F2118] hover:bg-[#d2dee0]'
                              }`}
                              style={{ fontSize: '18px' }}
                            >
                              <Layers className="w-5 h-5" />
                              <span>Flashcards</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePracticeTopic(t.topic)}
                              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold transition cursor-pointer ${
                                isDark
                                  ? 'bg-[#7EC4CF] text-black hover:bg-[#93D1DA]'
                                  : 'bg-[#54626f] text-white hover:bg-[#1F2118]'
                              }`}
                              style={{ fontSize: '18px' }}
                            >
                              <Sparkles className="w-5 h-5" />
                              <span>Practice Topic</span>
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}