import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useTheme } from '../../context/ThemeContext';
import { getImprovementAnalytics } from '../../services/improvementService';
import AppSidebar from '../../components/AppSidebar';
import {
  Layers,
  Calendar,
  Activity,
  Menu,
  ArrowLeft,
  BrainCircuit,
  FileText,
  BookOpen,
} from 'lucide-react';

// Calm, cohesive palette matched to the study hub theme
const getBarStyle = (level, isDark = false) => {
  if (isDark) {
    if (level === 'high') return 'bg-[#7EC4CF]';
    if (level === 'medium') return 'bg-[#C8B9D6]';
    if (level === 'low') return 'bg-[#E5B880]';
    return 'bg-[#222732] border border-dashed border-[#384152]';
  }

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

const getStatusBadgeStyle = (level, isDark = false) => {
  if (isDark) {
    if (level === 'high') return 'bg-[#22313A] text-[#7EC4CF] font-black';
    if (level === 'medium') return 'bg-[#2A2433] text-[#C8B9D6] font-black';
    if (level === 'low') return 'bg-[#2C241E] text-[#E5B880] font-black';
    return 'bg-[#222732] text-[#9CA3AF] font-black';
  }

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
  const { isDark } = useTheme();
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
        setSeries(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load improvement data:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate, daysRange]);

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const totalActions = series.reduce(
    (sum, item) => sum + (Number(item.totalActivity) || 0),
    0
  );
  const activeDays = series.filter(
    (item) => (Number(item.totalActivity) || 0) > 0
  ).length;
  const inactiveDays = Math.max(0, Number(series.length) - activeDays);
  const totalFlashcards = series.reduce(
    (sum, item) => sum + (Number(item.flashcardsCreated) || 0),
    0
  );
  const maxDayActivity = Math.max(
    1,
    ...series.map((item) => Number(item.totalActivity) || 0)
  );

  return (
    <div
      className={`min-h-screen flex relative ${
        isDark ? 'bg-[#12141A] text-[#F3F4F6]' : 'bg-[#e2eaeb] text-[#1f2933]'
      }`}
      style={{ fontSize: '18px' }}
    >
      <AppSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div
            className={`border rounded-2xl p-6 shadow-xs flex items-start justify-between gap-4 ${
              isDark
                ? 'bg-[#171A21] border-[#2C313C]'
                : 'bg-white/95 border-[#54626f]/15'
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
                    : 'bg-[#e2eaeb] text-[#1f2937] hover:bg-[#54626f] hover:text-white'
                }`}
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h1
                  className={`tracking-tight ${
                    isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#1f2933]'
                  }`}
                  style={{ fontSize: '32px', lineHeight: 1.15 }}
                >
                  Improvement Tracker
                </h1>
                <p
                  className={`mt-1 ${
                    isDark ? 'font-bold text-[#D1D5DB]' : 'font-medium text-[#54626f]'
                  }`}
                  style={{ fontSize: '18px' }}
                >
                  Date-wise activity across flashcards, documents, and quizzes.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition shrink-0 cursor-pointer ${
                isDark
                  ? 'bg-[#222732] text-[#FFFFFF] border border-[#2E3542] hover:bg-[#2C3240] font-black'
                  : 'bg-[#e2eaeb] text-[#1f2937] hover:bg-[#54626f] hover:text-white font-bold'
              }`}
              style={{ fontSize: '16px' }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              className={`border rounded-2xl p-5 shadow-xs flex items-center justify-between ${
                isDark
                  ? 'bg-[#171A21] border-[#2C313C]'
                  : 'bg-white/95 border-[#54626f]/15'
              }`}
            >
              <div>
                <p
                  className={`uppercase tracking-wider ${
                    isDark ? 'font-black text-[#D1D5DB]' : 'font-extrabold text-[#54626f]'
                  }`}
                  style={{ fontSize: '15px' }}
                >
                  Total Actions ({Number(daysRange)}d)
                </p>
                <p
                  className={`mt-1 ${
                    isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#1f2933]'
                  }`}
                  style={{ fontSize: '30px', lineHeight: 1.15 }}
                >
                  {Number(totalActions)}
                </p>
              </div>
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-[#22313A] text-[#7EC4CF]' : 'bg-[#2b6777]/12 text-[#2b6777]'
                }`}
              >
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div
              className={`border rounded-2xl p-5 shadow-xs flex items-center justify-between ${
                isDark
                  ? 'bg-[#171A21] border-[#2C313C]'
                  : 'bg-white/95 border-[#54626f]/15'
              }`}
            >
              <div>
                <p
                  className={`uppercase tracking-wider ${
                    isDark ? 'font-black text-[#D1D5DB]' : 'font-extrabold text-[#54626f]'
                  }`}
                  style={{ fontSize: '15px' }}
                >
                  Flashcards Created
                </p>
                <p
                  className={`mt-1 ${
                    isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#1f2933]'
                  }`}
                  style={{ fontSize: '30px', lineHeight: 1.15 }}
                >
                  {Number(totalFlashcards)}
                </p>
              </div>
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-[#2C241E] text-[#E5B880]' : 'bg-[#b87d4b]/15 text-[#8c5a2b]'
                }`}
              >
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div
              className={`border rounded-2xl p-5 shadow-xs flex items-center justify-between ${
                isDark
                  ? 'bg-[#171A21] border-[#2C313C]'
                  : 'bg-white/95 border-[#54626f]/15'
              }`}
            >
              <div>
                <p
                  className={`uppercase tracking-wider ${
                    isDark ? 'font-black text-[#D1D5DB]' : 'font-extrabold text-[#54626f]'
                  }`}
                  style={{ fontSize: '15px' }}
                >
                  Active / Inactive Days
                </p>
                <p
                  className={`mt-1 ${
                    isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#1f2933]'
                  }`}
                  style={{ fontSize: '30px', lineHeight: 1.15 }}
                >
                  {Number(activeDays)} / {Number(inactiveDays)}
                </p>
              </div>
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-[#222732] text-[#C8B9D6]' : 'bg-[#54626f]/12 text-[#54626f]'
                }`}
              >
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Clean Bar Graph & Modern Aesthetic Activity UL */}
          <div
            className={`border rounded-2xl p-6 shadow-xs space-y-6 ${
              isDark
                ? 'bg-[#171A21] border-[#2C313C]'
                : 'bg-white/95 border-[#54626f]/15'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2
                  className={
                    isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#1f2933]'
                  }
                  style={{ fontSize: '23px' }}
                >
                  Daily Activity Bar Chart
                </h2>
                <p
                  className={`mt-0.5 ${
                    isDark ? 'font-bold text-[#D1D5DB]' : 'font-semibold text-[#54626f]'
                  }`}
                  style={{ fontSize: '17px' }}
                >
                  Includes active days, low days, and zero-activity days by date
                </p>
              </div>

              <div className="flex items-center gap-2">
                {[7, 14].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDaysRange(d)}
                    className={`px-4 py-2 rounded-xl transition cursor-pointer ${
                      daysRange === d
                        ? isDark
                          ? 'bg-[#C8B9D6] text-[#000000] font-black'
                          : 'bg-[#54626f] text-white font-extrabold'
                        : isDark
                          ? 'bg-[#222732] text-[#F3F4F6] hover:bg-[#2C3240] font-black'
                          : 'bg-[#e2eaeb] text-[#1f2937] hover:bg-[#d2dee0] font-extrabold'
                    }`}
                    style={{ fontSize: '16px' }}
                  >
                    {Number(d)} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Clean Color Key */}
            <div
              className={`flex flex-wrap items-center gap-4 ${
                isDark ? 'font-black text-[#E5E7EB]' : 'font-bold text-[#4a5560]'
              }`}
              style={{ fontSize: '16px' }}
            >
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`w-3 h-3 rounded-xs ${
                    isDark ? 'bg-[#7EC4CF]' : 'bg-[#2b6777]'
                  }`}
                />
                <span>High</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`w-3 h-3 rounded-xs ${
                    isDark ? 'bg-[#C8B9D6]' : 'bg-[#54626f]'
                  }`}
                />
                <span>Moderate</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`w-3 h-3 rounded-xs ${
                    isDark ? 'bg-[#E5B880]' : 'bg-[#b87d4b]'
                  }`}
                />
                <span>Light</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`w-3 h-3 rounded-xs border ${
                    isDark
                      ? 'bg-[#222732] border-[#384152]'
                      : 'bg-[#dce4e6] border-[#b6c4c8]'
                  }`}
                />
                <span>Zero (0)</span>
              </span>
            </div>

            {loading ? (
              <div
                className={`py-14 text-center ${
                  isDark ? 'font-black text-[#D1D5DB]' : 'font-bold text-[#54626f]'
                }`}
                style={{ fontSize: '18px' }}
              >
                Loading chart...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Bar Chart */}
                <div
                  className={`border rounded-2xl p-5 overflow-x-auto ${
                    isDark
                      ? 'bg-[#12141A] border-[#2E3542]'
                      : 'bg-[#f5f8f9] border-[#dce4e6]'
                  }`}
                >
                  <div
                    className="grid items-end gap-3 min-h-[210px]"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(
                        1,
                        series.length
                      )}, minmax(66px, 1fr))`,
                    }}
                  >
                    {series.map((day) => (
                      <div
                        key={day.dateKey}
                        className="flex flex-col items-center justify-end h-full gap-2"
                      >
                        <span
                          className={
                            isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#1f2933]'
                          }
                          style={{ fontSize: '16px' }}
                        >
                          {Number(day.totalActivity)}
                        </span>

                        <div
                          className={`w-full max-w-[40px] h-[125px] border rounded-xl p-1 flex items-end ${
                            isDark
                              ? 'bg-[#171A21] border-[#2E3542]'
                              : 'bg-white border-[#e2eaeb]'
                          }`}
                        >
                          <div
                            className={`w-full rounded-lg transition-all duration-300 ${getBarStyle(
                              day.level,
                              isDark
                            )}`}
                            style={{ height: `${day.heightPercent}%` }}
                            title={`${day.label}: ${Number(day.totalActivity)}`}
                          />
                        </div>

                        <span
                          className={
                            isDark ? 'font-black text-[#D1D5DB]' : 'font-bold text-[#3f4b56]'
                          }
                          style={{ fontSize: '15px' }}
                        >
                          {day.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modern Aesthetic & Useful UL Breakdown List */}
                <ul className="space-y-3 list-none p-0 m-0">
                  {series.map((day) => {
                    const count = Number(day.totalActivity || 0);
                    const flashcardsNum = Number(day.flashcardsCreated || 0);
                    const docsNum = Number(day.documentsCreated || 0);
                    const quizCount =
                      Number(day.quizzesCreated || 0) + Number(day.quizzesSubmitted || 0);
                    const pacePercent = Math.min(
                      100,
                      Math.round((count / maxDayActivity) * 100)
                    );

                    return (
                      <li
                        key={`row-${day.dateKey}`}
                        className={`rounded-2xl border p-4 transition ${
                          isDark
                            ? 'bg-[#12141A] border-[#2E3542] hover:bg-[#1A1E26]'
                            : 'bg-[#f8fafb] border-[#dce4e6] hover:bg-white shadow-2xs'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                          {/* Left: Date, Status & Daily Pace Bar */}
                          <div className="flex flex-wrap items-center gap-3 min-w-[210px]">
                            <span
                              className={`min-w-[68px] ${
                                isDark
                                  ? 'font-black text-[#F3F4F6]'
                                  : 'font-black text-[#1f2933]'
                              }`}
                              style={{ fontSize: '18px' }}
                            >
                              {day.label}
                            </span>

                            <span
                              className={`px-3 py-1 rounded-full ${getStatusBadgeStyle(
                                day.level,
                                isDark
                              )} ${!isDark ? 'font-bold' : ''}`}
                              style={{ fontSize: '15px' }}
                            >
                              {getStatusLabel(day.level)}
                            </span>

                            <div className="flex items-center gap-2">
                              <div
                                className={`w-20 h-2 rounded-full overflow-hidden ${
                                  isDark ? 'bg-[#222732]' : 'bg-[#e2eaeb]'
                                }`}
                              >
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${getBarStyle(
                                    day.level,
                                    isDark
                                  )}`}
                                  style={{ width: `${count === 0 ? 0 : Math.max(12, pacePercent)}%` }}
                                />
                              </div>
                              <span
                                className={
                                  isDark
                                    ? 'font-black text-[#E5B880]'
                                    : 'font-extrabold text-[#54626f]'
                                }
                                style={{ fontSize: '15px' }}
                              >
                                {count} {count === 1 ? 'action' : 'actions'}
                              </span>
                            </div>
                          </div>

                          {/* Right: Metric Pills or Rest Day Note */}
                          {count === 0 ? (
                            <span
                              className={
                                isDark
                                  ? 'font-bold text-[#9CA3AF]'
                                  : 'font-medium text-[#7b8794]'
                              }
                              style={{ fontSize: '17px' }}
                            >
                              Rest day — no study actions logged
                            </span>
                          ) : (
                            <div
                              className="flex flex-wrap items-center gap-2.5"
                              style={{ fontSize: '16px' }}
                            >
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                                  isDark
                                    ? 'bg-[#171A21] border-[#2E3542] text-[#F3F4F6] font-black'
                                    : 'bg-white border-[#dce4e6] text-[#1f2933] font-bold'
                                }`}
                              >
                                <BrainCircuit
                                  className={`w-4 h-4 ${
                                    isDark ? 'text-[#7EC4CF]' : 'text-[#2b6777]'
                                  }`}
                                />
                                <span>Flashcards: {flashcardsNum}</span>
                              </span>

                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                                  isDark
                                    ? 'bg-[#171A21] border-[#2E3542] text-[#F3F4F6] font-black'
                                    : 'bg-white border-[#dce4e6] text-[#1f2933] font-bold'
                                }`}
                              >
                                <FileText
                                  className={`w-4 h-4 ${
                                    isDark ? 'text-[#C8B9D6]' : 'text-[#54626f]'
                                  }`}
                                />
                                <span>Docs: {docsNum}</span>
                              </span>

                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                                  isDark
                                    ? 'bg-[#171A21] border-[#2E3542] text-[#F3F4F6] font-black'
                                    : 'bg-white border-[#dce4e6] text-[#1f2933] font-bold'
                                }`}
                              >
                                <BookOpen
                                  className={`w-4 h-4 ${
                                    isDark ? 'text-[#E5B880]' : 'text-[#8c5a2b]'
                                  }`}
                                />
                                <span>Quizzes: {quizCount}</span>
                              </span>
                            </div>
                          )}
                        </div>
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