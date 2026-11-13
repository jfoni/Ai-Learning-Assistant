
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { getDashboardOverview } from '../../services/dashboardService';
import {
  BookOpen,
  BrainCircuit,
  FileText,
  Award,
  TrendingUp,
  LogOut,
  CheckCircle2,
  Clock,
  ArrowUpRight
} from 'lucide-react';

import './DashboardPage.css';

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [userName, setUserName] = useState('Learner');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const name =
          user.displayName || user.email?.split('@')[0] || 'Learner';

        setUserName(name);
      } else {
        navigate('/login');
      }
    });

    const fetchDashboardData = async () => {
      try {
        const response = await getDashboardOverview();

        if (response.success) {
          setOverview(response.data);
        }
      } catch (err) {
        console.error('Dashboard Error:', err);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const stats = overview?.stats || {
    totalQuizzes: 0,
    totalFlashcards: 4,
    totalSubmissions: 0,
    averageScore: 0
  };

  const recentQuizzes = overview?.recentActivity?.quizzes || [];
  const recentSubmissions = overview?.recentActivity?.submissions || [];

  const cards = [
    {
      title: 'Total Quizzes',
      value: stats.totalQuizzes,
      icon: BookOpen,
      link: '/quizzes'
    },
    {
      title: 'Flashcards',
      value: stats.totalFlashcards,
      icon: BrainCircuit,
      link: '/flashcards'
    },
    {
      title: 'Submissions',
      value: stats.totalSubmissions,
      icon: Award,
      link: '/documents'
    },
    {
      title: 'Avg Score',
      value: `${stats.averageScore}%`,
      icon: TrendingUp,
      link: '/quizzes'
    }
  ];

  const completion = Math.min(stats.totalQuizzes * 25, 100);
  const accuracy = Math.min(Math.max(stats.averageScore, 0), 100);

  return (
    <div className="dashboard-page min-h-screen bg-[#e2eaeb] flex font-sans">

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#D5DDE0] p-6 hidden md:flex flex-col justify-between shadow-sm">

        <div>
          <div className="flex items-center space-x-3 mb-10 px-2">
            <div className="w-10 h-10 rounded-2xl bg-[#54626f] text-white flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>

            <div>
              <h1 className="font-black text-lg tracking-tight">
                AI Assistant
              </h1>
              <p className="text-[10px] font-black tracking-wider uppercase">
                Smart Study Hub
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            <Link to="/dashboard" className="sidebar-link active">
              <TrendingUp className="w-4 h-4" />
              <span>Overview</span>
            </Link>

            <Link to="/documents" className="sidebar-link">
              <FileText className="w-4 h-4" />
              <span>Documents</span>
            </Link>

            <Link to="/flashcards" className="sidebar-link">
              <BrainCircuit className="w-4 h-4" />
              <span>Flashcards</span>
            </Link>

            <Link to="/quizzes" className="sidebar-link">
              <BookOpen className="w-4 h-4" />
              <span>Quizzes</span>
            </Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-[#D5DDE0]">
          <button onClick={handleLogout} className="logout-button">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">

          <div>
            <h2 className="dashboard-heading text-2xl md:text-3xl font-black tracking-tight">
              Dashboard Overview
            </h2>

            <p className="dashboard-description text-sm font-semibold mt-1">
              Here is your personalized learning progress summary.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start md:self-auto bg-white px-4 py-2.5 rounded-3xl border border-[#D5DDE0] shadow-md">

            <div className="welcome-bubble">
              Welcome to your profile,{' '}
              <span>{userName}</span>! 🐾
            </div>

            <div className="w-11 h-11 rounded-2xl bg-[#e2eaeb] flex items-center justify-center text-2xl shadow-inner">
              🐱
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64 font-bold">
            Loading dashboard stats...
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium">
            {error}
          </div>
        ) : (
          <>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

              {cards.map((card) => {
                const Icon = card.icon;

                return (
                  <Link
                    to={card.link}
                    key={card.title}
                    className="stat-card"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="stat-icon">
                        <Icon className="w-7 h-7" />
                      </div>

                      <div>
                        <p className="stat-title">
                          {card.title}
                        </p>

                        <h3 className="stat-number">
                          {card.value}
                        </h3>
                      </div>
                    </div>

                    <ArrowUpRight className="w-5 h-5 stat-arrow" />
                  </Link>
                );
              })}

            </div>

            {/* Performance Analytics */}
            <div className="analytics-card">

              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="section-heading">
                    Performance Analytics & Progress
                  </h3>

                  <p className="section-description">
                    Visual breakdown of your quiz accuracy and mastery level
                  </p>
                </div>

                <span className="progress-badge">
                  Active Progress
                </span>
              </div>

              <div className="space-y-5">

                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span>Overall Quiz Score Accuracy</span>
                    <span className="text-black">{stats.averageScore}%</span>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${accuracy}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span>Study Material Completion Rate</span>
                    <span className="text-black">{completion}%</span>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Recent Quizzes */}
              <div className="activity-card">
                <h3 className="activity-heading">
                  <Clock className="w-4 h-4 text-[#54626f]" />
                  <span>Recent Quizzes Created</span>
                </h3>

                {recentQuizzes.length === 0 ? (
                  <p className="empty-message">
                    No recent quizzes found yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentQuizzes.map((quiz) => (
                      <div key={quiz._id} className="activity-item">
                        <span className="activity-name">
                          {quiz.title}
                        </span>

                        <span className="activity-date">
                          {new Date(quiz.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Submissions */}
              <div className="activity-card">
                <h3 className="activity-heading">
                  <CheckCircle2 className="w-4 h-4 text-[#54626f]" />
                  <span>Recent Submissions</span>
                </h3>

                {recentSubmissions.length === 0 ? (
                  <p className="empty-message">
                    No quiz submissions yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentSubmissions.map((sub) => (
                      <div key={sub._id} className="activity-item">
                        <span className="activity-name">
                          {sub.quizId?.title || 'Quiz Assessment'}
                        </span>

                        <span className="score-badge">
                          Score: {sub.score}/{sub.totalQuestions}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </>
        )}

      </main>
    </div>
  );
}
