import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { getDashboardOverview } from '../../services/dashboardService';
import { useTheme } from '../../context/ThemeContext';
import AppSidebar from '../../components/AppSidebar';
import {
  BookOpen,
  BrainCircuit,
  FileText,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Menu,
} from 'lucide-react';

import './DashboardPage.css';

export default function DashboardPage() {
  const { isDark } = useTheme();
  const [overview, setOverview] = useState(null);
  const [userName, setUserName] = useState('Learner');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      const name = user.displayName || user.email?.split('@')[0] || 'Learner';
      setUserName(name);
      setLoading(true);
      setError('');

      try {
        const response = await getDashboardOverview(user.uid);
        if (response.success) {
          setOverview(response.data);
        }
      } catch (err) {
        console.error('Dashboard Error:', err);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const stats = overview?.stats || {
    totalQuizzes: 0,
    totalFlashcards: 0,
    totalDocuments: 0,
    totalSubmissions: 0,
    averageScore: 0,
  };

  const recentQuizzes = overview?.recentActivity?.quizzes || [];
  const recentSubmissions = overview?.recentActivity?.submissions || [];

  const cards = [
    {
      title: 'Total Quizzes',
      value: Number(stats.totalQuizzes) || 0,
      icon: BookOpen,
      link: '/quizzes',
    },
    {
      title: 'Flashcards',
      value: Number(stats.totalFlashcards) || 0,
      icon: BrainCircuit,
      link: '/flashcards',
    },
    {
      title: 'Documents',
      value: Number(stats.totalDocuments) || 0,
      icon: FileText,
      link: '/documents',
    },
    {
      title: 'Avg Score',
      value: `${Number(stats.averageScore) || 0}%`,
      icon: TrendingUp,
      link: '/quizzes',
    },
  ];

  const completion = Math.min((Number(stats.totalDocuments) || 0) * 20, 100);
  const accuracy = Math.min(Math.max(Number(stats.averageScore) || 0, 0), 100);

  return (
    <div
      className={`dashboard-page min-h-screen flex font-sans relative ${
        isDark ? 'bg-[#12141A] text-[#F3F4F6]' : 'bg-[#e2eaeb] text-[#111827]'
      }`}
    >
      <AppSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Main content */}
      <main className="flex-1 p-6 sm:p-8 md:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header banner card */}
          <header
            className={`border rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8 ${
              isDark ? 'bg-[#171A21] border-[#2C313C]' : 'bg-white border-[#D5DDE0]'
            }`}
          >
            <div className="flex items-start gap-5">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Toggle navigation menu"
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shrink-0 mt-0.5 cursor-pointer border ${
                  isDark
                    ? 'bg-[#222732] text-[#E5E7EB] border-[#2E3542] hover:bg-[#2C3240]'
                    : 'bg-[#e2eaeb] text-[#1F2937] border-[#D5DDE0] hover:bg-[#54626f] hover:text-white'
                }`}
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h2
                  className={`dashboard-heading font-black tracking-tight ${
                    isDark ? 'text-[#F3F4F6]' : 'text-[#000000]'
                  }`}
                  style={{ fontSize: '28px', lineHeight: 1.2 }}
                >
                  Dashboard Overview
                </h2>
                <p
                  className={`dashboard-description mt-1.5 ${
                    isDark ? 'font-bold text-[#D1D5DB]' : 'font-semibold text-[#4B5563]'
                  }`}
                  style={{ fontSize: '16px' }}
                >
                  Here is your personalized learning progress summary.
                </p>
              </div>
            </div>

            <Link
              to="/profile"
              className={`flex items-center gap-3 self-start lg:self-auto px-4 py-2.5 rounded-2xl border shadow-2xs hover:border-[#54626f] transition ${
                isDark ? 'bg-[#12141A] border-[#2E3542]' : 'bg-[#f8fafb] border-[#D5DDE0]'
              }`}
            >
              <div className={`welcome-bubble ${isDark ? 'font-black' : 'font-bold'}`}>
                Welcome to your profile, <span>{userName}</span>!
              </div>

              <div
                className="w-10 h-10 rounded-xl bg-[#e2eaeb] flex items-center justify-center shadow-inner shrink-0"
                style={{ fontSize: '22px' }}
              >
                🐱
              </div>
            </Link>
          </header>

          {loading ? (
            <div
              className={`flex justify-center items-center h-64 ${
                isDark ? 'font-black' : 'font-bold'
              }`}
              style={{ fontSize: '20px' }}
            >
              Loading dashboard stats...
            </div>
          ) : error ? (
            <div
              className={`p-5 bg-red-50 text-red-600 rounded-2xl mb-6 ${
                isDark ? 'font-black' : 'font-semibold'
              }`}
              style={{ fontSize: '18px' }}
            >
              {error}
            </div>
          ) : (
            <>
              {/* Statistics cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {cards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link
                      to={card.link}
                      key={card.title}
                      className={`stat-card border shadow-2xs ${
                        isDark
                          ? 'bg-[#171A21] border-[#2C313C] hover:shadow-lg'
                          : 'bg-white border-[#D5DDE0] hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`stat-icon ${
                            isDark
                              ? 'bg-[#222732] text-[#E5E7EB]'
                              : 'bg-[#54626f]/15 text-[#54626f]'
                          }`}
                        >
                          <Icon className="w-7 h-7" />
                        </div>

                        <div>
                          <p
                            className={`stat-title ${
                              isDark ? 'font-black text-[#D1D5DB]' : 'font-extrabold text-[#374151]'
                            }`}
                          >
                            {card.title}
                          </p>
                          <h3
                            className={`stat-number ${
                              isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#000000]'
                            }`}
                          >
                            {card.value}
                          </h3>
                        </div>
                      </div>

                      <ArrowUpRight
                        className={`w-5 h-5 stat-arrow ${
                          isDark ? 'text-[#E5E7EB]' : 'text-[#54626f]'
                        }`}
                      />
                    </Link>
                  );
                })}
              </div>

              {/* Performance analytics */}
              <div
                className={`analytics-card border shadow-2xs p-7 sm:p-8 mb-8 ${
                  isDark ? 'bg-[#171A21] border-[#2C313C]' : 'bg-white border-[#D5DDE0]'
                }`}
              >
                <div className="flex justify-between items-start sm:items-center gap-4 mb-7">
                  <div>
                    <h3
                      className={`section-heading ${
                        isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#000000]'
                      }`}
                    >
                      Performance Analytics &amp; Progress
                    </h3>
                    <p
                      className={`section-description mt-2 ${
                        isDark ? 'font-bold text-[#D1D5DB]' : 'font-semibold text-[#4B5563]'
                      }`}
                    >
                      Visual breakdown of your quiz accuracy and mastery level
                    </p>
                  </div>

                  <span
                    className={`progress-badge shrink-0 px-4 py-2 ${
                      isDark
                        ? 'bg-[#222732] text-[#F3F4F6] font-black'
                        : 'bg-[#54626f]/15 text-[#1F2937] font-extrabold'
                    }`}
                  >
                    Active Progress
                  </span>
                </div>

                <div className="space-y-7">
                  <div>
                    <div className="flex justify-between items-center gap-4 mb-3">
                      <span
                        className={`analytics-label ${
                          isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#1F2937]'
                        }`}
                      >
                        Overall Quiz Score Accuracy
                      </span>
                      <span
                        className={`analytics-percent ${
                          isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#000000]'
                        }`}
                      >
                        {Number(stats.averageScore) || 0}%
                      </span>
                    </div>

                    <div
                      className={`progress-track ${
                        isDark ? 'bg-[#222732]' : 'bg-[#54626f]/15'
                      }`}
                    >
                      <div className="progress-fill" style={{ width: `${accuracy}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center gap-4 mb-3">
                      <span
                        className={`analytics-label ${
                          isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#1F2937]'
                        }`}
                      >
                        Study Material Completion Rate
                      </span>
                      <span
                        className={`analytics-percent ${
                          isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#000000]'
                        }`}
                      >
                        {Number(completion) || 0}%
                      </span>
                    </div>

                    <div
                      className={`progress-track ${
                        isDark ? 'bg-[#222732]' : 'bg-[#54626f]/15'
                      }`}
                    >
                      <div className="progress-fill" style={{ width: `${completion}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
                <div
                  className={`activity-card border shadow-2xs p-6 sm:p-7 ${
                    isDark ? 'bg-[#171A21] border-[#2C313C]' : 'bg-white border-[#D5DDE0]'
                  }`}
                >
                  <h3
                    className={`activity-heading mb-4 ${
                      isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#000000]'
                    }`}
                  >
                    <Clock className="w-5 h-5 text-[#54626f]" />
                    <span>Recent Quizzes Created</span>
                  </h3>

                  {recentQuizzes.length === 0 ? (
                    <p
                      className={`empty-message py-4 ${
                        isDark ? 'font-bold text-[#9CA3AF]' : 'font-semibold text-[#6B7280]'
                      }`}
                    >
                      No recent quizzes found yet.
                    </p>
                  ) : (
                    <div className="space-y-3.5">
                      {recentQuizzes.map((quiz) => (
                        <div
                          key={quiz._id}
                          className={`activity-item px-4 py-4 border gap-3 ${
                            isDark
                              ? 'bg-[#12141A] border-[#2E3542] hover:bg-[#1B2029]'
                              : 'bg-[#F4F6F7] border-[#E5E7EB] hover:bg-[#EAF0F1]'
                          }`}
                        >
                          <span
                            className={`activity-name ${
                              isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#1F2937]'
                            }`}
                          >
                            {quiz.title}
                          </span>
                          <span
                            className={`activity-date ${
                              isDark ? 'font-bold text-[#9CA3AF]' : 'font-semibold text-[#6B7280]'
                            }`}
                          >
                            {new Date(quiz.createdAt).toLocaleDateString('en-US')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className={`activity-card border shadow-2xs p-6 sm:p-7 ${
                    isDark ? 'bg-[#171A21] border-[#2C313C]' : 'bg-white border-[#D5DDE0]'
                  }`}
                >
                  <h3
                    className={`activity-heading mb-4 ${
                      isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#000000]'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-[#54626f]" />
                    <span>Recent Submissions</span>
                  </h3>

                  {recentSubmissions.length === 0 ? (
                    <p
                      className={`empty-message py-4 ${
                        isDark ? 'font-bold text-[#9CA3AF]' : 'font-semibold text-[#6B7280]'
                      }`}
                    >
                      No quiz submissions yet.
                    </p>
                  ) : (
                    <div className="space-y-3.5">
                      {recentSubmissions.map((sub) => (
                        <div
                          key={sub._id}
                          className={`activity-item px-4 py-4 border gap-3 ${
                            isDark
                              ? 'bg-[#12141A] border-[#2E3542] hover:bg-[#1B2029]'
                              : 'bg-[#F4F6F7] border-[#E5E7EB] hover:bg-[#EAF0F1]'
                          }`}
                        >
                          <span
                            className={`activity-name ${
                              isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#1F2937]'
                            }`}
                          >
                            {sub.quizId?.title || 'Quiz Assessment'}
                          </span>
                          <span
                            className={`score-badge px-3 py-1.5 ${
                              isDark ? 'font-black' : 'font-extrabold'
                            }`}
                          >
                            Score: {Number(sub.score) || 0}/{Number(sub.totalQuestions) || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}