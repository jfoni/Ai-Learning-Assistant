import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { getImprovementAnalytics } from '../../services/improvementService';
import {
  Layers,
  Calendar,
  Activity,
  Menu,
  X,
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  FileText,
  TrendingUp,
  Target,
  LogOut,
} from 'lucide-react';

const SIDEBAR_SUBTITLE = 'Personal Study Space';

// Calm, cohesive palette matched to the #e2eaeb and #54626f study hub theme
const getBarStyle = (level) => {
  if (level === 'high') {
    return 'bg-[#2b6777]';
  }
  if (level === 'medium') {
    return 'bg-[#54626f]';
  }
  if (level === 'low') {
    return 'bg-[#b87d4b]';
  }
  return 'bg-[#dce4e6] border border-dashed border-[#b6c4c8]';
};

const getStatusBadgeStyle = (level) => {
  if (level === 'high') {
    return 'bg-[#2b6777]/12 text-[#2b6777]';
  }
  if (level === 'medium') {
    return 'bg-[#54626f]/12 text-[#3f4b56]';
  }
  if (level === 'low') {
    return 'bg-[#b87d4b]/15 text-[#8c5a2b]';
  }
  return 'bg-[#edf2f3] text-[#6b7882]';
};

const getStatusLabel = (level) => {
  if (level === 'high') return 'High';
  if (level === 'medium') return 'Moderate';
  if (level === 'low') return 'Light';
  return 'No Activity';
};

export default function ImprovementPage() {
  const [daysRange, setDaysRange] = useState(7);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        const data = await getImprovementAnalytics(user.uid, daysRange);
        setSeries(data);
      } catch (err) {
        console.error('Failed to load improvement data:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate, daysRange]);

  const handleLogout = async () => {
    setIsSidebarOpen(false);
    await signOut(auth);
    navigate('/login');
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const totalActions = series.reduce((sum, item) => sum + (Number(item.totalActivity) || 0), 0);
  const activeDays = series.filter((item) => (Number(item.totalActivity) || 0) > 0).length;
  const inactiveDays = Math.max(0, Number(series.length) - activeDays);
  const totalFlashcards = series.reduce(
    (sum, item) => sum + (Number(item.flashcardsCreated) || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#e2eaeb] text-[#1f2933] flex relative">
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/20 z-30 transition-opacity"
          aria-hidden="true"
        />
      )}

      {isSidebarOpen && (
        <aside className="fixed md:static top-0 left-0 h-screen md:h-auto w-64 bg-white border-r border-[#d5dde0] p-6 flex flex-col justify-between shadow-lg z-40 shrink-0">
          <div>
            <div className="flex items-center justify-between mb-10 px-1">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#54626f] text-white flex items-center justify-center shadow-sm">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-black text-lg tracking-tight text-[#1f2933]">
                    AI Assistant
                  </h1>
                  <p className="text-[10px] font-black tracking-wider uppercase text-[#54626f]">
                    {SIDEBAR_SUBTITLE}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeSidebar}
                aria-label="Close sidebar"
                className="p-2 rounded-xl text-[#54626f] hover:bg-[#e2eaeb] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="space-y-2">
              <Link
                to="/dashboard"
                onClick={closeSidebar}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-extrabold text-[#1f2937] hover:bg-[#e2eaeb] transition"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Overview</span>
              </Link>
              <Link
                to="/documents"
                onClick={closeSidebar}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-extrabold text-[#1f2937] hover:bg-[#e2eaeb] transition"
              >
                <FileText className="w-4 h-4" />
                <span>Documents</span>
              </Link>
              <Link
                to="/flashcards"
                onClick={closeSidebar}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-extrabold text-[#1f2937] hover:bg-[#e2eaeb] transition"
              >
                <BrainCircuit className="w-4 h-4" />
                <span>Flashcards</span>
              </Link>
              <Link
                to="/quizzes"
                onClick={closeSidebar}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-extrabold text-[#1f2937] hover:bg-[#e2eaeb] transition"
              >
                <BookOpen className="w-4 h-4" />
                <span>Quizzes</span>
              </Link>
              <Link
                to="/improvement"
                onClick={closeSidebar}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-extrabold bg-[#54626f] text-white transition"
              >
                <Target className="w-4 h-4" />
                <span>Improvement</span>
              </Link>
            </nav>
          </div>

          <div className="pt-6 border-t border-[#d5dde0]">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#fef2f2] text-[#dc2626] hover:bg-[#fee2e2] rounded-2xl text-sm font-bold transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      )}

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white/95 border border-[#54626f]/15 rounded-2xl p-6 shadow-xs flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                aria-label="Toggle navigation menu"
                className="w-11 h-11 rounded-xl bg-[#e2eaeb] text-[#1f2937] hover:bg-[#54626f] hover:text-white flex items-center justify-center transition shrink-0 mt-0.5 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#1f2933] tracking-tight">
                  Improvement Tracker
                </h1>
                <p className="text-sm text-[#54626f] mt-1">
                  Date-wise activity across flashcards, documents, and quizzes.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#e2eaeb] text-[#1f2937] hover:bg-[#54626f] hover:text-white transition shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/95 border border-[#54626f]/15 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#54626f]">
                  Total Actions ({Number(daysRange)}d)
                </p>
                <p className="text-2xl font-black text-[#1f2933] mt-1">{Number(totalActions)}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#2b6777]/12 text-[#2b6777] flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white/95 border border-[#54626f]/15 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#54626f]">
                  Flashcards Created
                </p>
                <p className="text-2xl font-black text-[#1f2933] mt-1">{Number(totalFlashcards)}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#b87d4b]/15 text-[#8c5a2b] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white/95 border border-[#54626f]/15 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#54626f]">
                  Active / Inactive Days
                </p>
                <p className="text-2xl font-black text-[#1f2933] mt-1">
                  {Number(activeDays)} / {Number(inactiveDays)}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#54626f]/12 text-[#54626f] flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Clean Bar Graph & Activity List */}
          <div className="bg-white/95 border border-[#54626f]/15 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-[#1f2933]">Daily Activity Bar Chart</h2>
                <p className="text-xs font-semibold text-[#54626f] mt-0.5">
                  Includes active days, low days, and zero-activity days by date
                </p>
              </div>

              <div className="flex items-center gap-2">
                {[7, 14].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDaysRange(d)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                      daysRange === d
                        ? 'bg-[#54626f] text-white'
                        : 'bg-[#e2eaeb] text-[#1f2937] hover:bg-[#d2dee0]'
                    }`}
                  >
                    {Number(d)} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Clean Color Key */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-[#4a5560]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#2b6777]" />
                <span>High</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#54626f]" />
                <span>Moderate</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#b87d4b]" />
                <span>Light</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#dce4e6] border border-[#b6c4c8]" />
                <span>Zero (0)</span>
              </span>
            </div>

            {loading ? (
              <div className="py-14 text-center text-sm font-bold text-[#54626f]">
                Loading chart...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Bar Chart */}
                <div className="bg-[#f5f8f9] border border-[#dce4e6] rounded-2xl p-5 overflow-x-auto">
                  <div
                    className="grid items-end gap-3 min-h-[205px]"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(1, series.length)}, minmax(64px, 1fr))`,
                    }}
                  >
                    {series.map((day) => (
                      <div
                        key={day.dateKey}
                        className="flex flex-col items-center justify-end h-full gap-2"
                      >
                        <span className="text-xs font-black text-[#1f2933]">
                          {Number(day.totalActivity)}
                        </span>

                        <div className="w-full max-w-[38px] h-[125px] bg-white border border-[#e2eaeb] rounded-xl p-1 flex items-end">
                          <div
                            className={`w-full rounded-lg transition-all duration-300 ${getBarStyle(
                              day.level
                            )}`}
                            style={{ height: `${day.heightPercent}%` }}
                            title={`${day.label}: ${Number(day.totalActivity)}`}
                          />
                        </div>

                        <span className="text-[11px] font-bold text-[#3f4b56]">{day.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clean UL Breakdown List */}
                <ul className="divide-y divide-[#e6ecef] border border-[#e2eaeb] rounded-2xl bg-white overflow-hidden list-none p-0 m-0">
                  {series.map((day) => {
                    const quizCount =
                      Number(day.quizzesCreated || 0) + Number(day.quizzesSubmitted || 0);

                    return (
                      <li
                        key={`row-${day.dateKey}`}
                        className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#f8fafb] transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-[#1f2933] min-w-[58px]">
                            {day.label}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${getStatusBadgeStyle(
                              day.level
                            )}`}
                          >
                            {getStatusLabel(day.level)}
                          </span>
                        </div>

                        {Number(day.totalActivity) === 0 ? (
                          <span className="text-xs font-medium text-[#7b8794]">
                            No activity recorded
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#3f4b56]">
                            <span className="px-2.5 py-1 rounded-lg bg-[#f1f5f7]">
                              Flashcards: {Number(day.flashcardsCreated || 0)}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-[#f1f5f7]">
                              Docs: {Number(day.documentsCreated || 0)}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-[#f1f5f7]">
                              Quizzes: {Number(quizCount)}
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}