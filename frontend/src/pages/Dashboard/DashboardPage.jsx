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
  Clock
} from 'lucide-react';

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [userName, setUserName] = useState('Learner');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Get logged in user name
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const nameFromAuth = user.displayName || user.email?.split('@')[0] || 'Learner';
        setUserName(nameFromAuth);
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

  const stats = overview?.stats || { totalQuizzes: 0, totalFlashcards: 0, totalSubmissions: 0, averageScore: 0 };
  const recentQuizzes = overview?.recentActivity?.quizzes || [];
  const recentSubmissions = overview?.recentActivity?.submissions || [];

  return (
    <div className="min-h-screen bg-[#e2eaeb] flex">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white/70 backdrop-blur-xl border-r border-white/85 p-6 hidden md:flex flex-col justify-between shadow-sm">
        <div>
          {/* Brand Logo with Study Icon */}
          <div className="flex items-center space-x-3 mb-10 px-2">
            <div className="w-10 h-10 rounded-2xl bg-[#54626f] text-white flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-[#54626f] text-lg tracking-tight">AI Assistant</h1>
              <p className="text-[10px] text-[#54626f]/60 font-semibold tracking-wider uppercase">Smart Study Hub</p>
            </div>
          </div>

          <nav className="space-y-2">
            <Link to="/dashboard" className="flex items-center space-x-3 px-4 py-3 bg-[#54626f] text-white rounded-2xl font-bold text-sm shadow-md">
              <TrendingUp className="w-4 h-4" />
              <span>Overview</span>
            </Link>
            <Link to="/documents" className="flex items-center space-x-3 px-4 py-3 text-[#54626f]/70 hover:bg-white/60 hover:text-[#54626f] rounded-2xl font-semibold text-sm transition">
              <FileText className="w-4 h-4" />
              <span>Documents</span>
            </Link>
            <Link to="/flashcards" className="flex items-center space-x-3 px-4 py-3 text-[#54626f]/70 hover:bg-white/60 hover:text-[#54626f] rounded-2xl font-semibold text-sm transition">
              <BrainCircuit className="w-4 h-4" />
              <span>Flashcards</span>
            </Link>
            <Link to="/quizzes" className="flex items-center space-x-3 px-4 py-3 text-[#54626f]/70 hover:bg-white/60 hover:text-[#54626f] rounded-2xl font-semibold text-sm transition">
              <BookOpen className="w-4 h-4" />
              <span>Quizzes</span>
            </Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-[#54626f]/10">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition shadow-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        
        {/* Top Header with Cute Cat Welcome Bubble */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-[#54626f] tracking-tight">Dashboard Overview</h2>
            <p className="text-sm text-[#54626f]/70 font-medium">Here is your personalized learning progress summary.</p>
          </div>

          {/* User Welcome Bubble with Cat Mascot */}
          <div className="flex items-center space-x-3 self-start md:self-auto bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-3xl border border-white shadow-md">
            <div className="relative bg-[#54626f] text-white px-3.5 py-1.5 rounded-2xl text-xs font-bold shadow-sm">
              Welcome to your profile, <span className="underline decoration-white/60">{userName}</span>! 🐾
              <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-[#54626f] rotate-45"></div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[#e2eaeb] border border-white flex items-center justify-center text-2xl shadow-inner select-none">
              🐱
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64 text-[#54626f] font-bold">Loading dashboard stats...</div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium">{error}</div>
        ) : (
          <>
            {/* Stats Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              
              <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-sm flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-[#54626f]/10 flex items-center justify-center text-[#54626f]">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#54626f]/60 uppercase tracking-widest">Total Quizzes</p>
                  <h3 className="text-3xl font-black text-[#54626f] mt-1">{stats.totalQuizzes}</h3>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-sm flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-[#54626f]/10 flex items-center justify-center text-[#54626f]">
                  <BrainCircuit className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#54626f]/60 uppercase tracking-widest">Flashcards</p>
                  <h3 className="text-3xl font-black text-[#54626f] mt-1">{stats.totalFlashcards}</h3>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-sm flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-[#54626f]/10 flex items-center justify-center text-[#54626f]">
                  <Award className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#54626f]/60 uppercase tracking-widest">Submissions</p>
                  <h3 className="text-3xl font-black text-[#54626f] mt-1">{stats.totalSubmissions}</h3>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-sm flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-[#54626f]/10 flex items-center justify-center text-[#54626f]">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#54626f]/60 uppercase tracking-widest">Avg Score</p>
                  <h3 className="text-3xl font-black text-[#54626f] mt-1">{stats.averageScore}%</h3>
                </div>
              </div>

            </div>

            {/* Performance Analytics Section */}
            <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm mb-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black text-[#54626f]">Performance Analytics & Progress</h3>
                  <p className="text-xs text-[#54626f]/70 font-medium">Visual breakdown of your quiz accuracy and mastery level</p>
                </div>
                <span className="px-3 py-1 bg-[#54626f]/10 text-[#54626f] rounded-full text-xs font-bold">Active Progress</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#54626f] mb-1.5">
                    <span>Overall Quiz Score Accuracy</span>
                    <span>{stats.averageScore}%</span>
                  </div>
                  <div className="w-full bg-[#54626f]/10 h-4 rounded-full overflow-hidden p-0.5">
                    <div 
                      className="bg-[#54626f] h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${stats.averageScore}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-[#54626f] mb-1.5">
                    <span>Study Material Completion Rate</span>
                    <span>{Math.min(stats.totalQuizzes * 25, 100)}%</span>
                  </div>
                  <div className="w-full bg-[#54626f]/10 h-4 rounded-full overflow-hidden p-0.5">
                    <div 
                      className="bg-[#54626f]/80 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.min(stats.totalQuizzes * 25, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-sm">
                <h3 className="text-md font-black text-[#54626f] mb-4 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#54626f]" />
                  <span>Recent Quizzes Created</span>
                </h3>
                {recentQuizzes.length === 0 ? (
                  <p className="text-xs text-[#54626f]/60 font-medium py-4">No recent quizzes found yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentQuizzes.map((quiz) => (
                      <div key={quiz._id} className="p-4 bg-white/60 rounded-2xl border border-white flex justify-between items-center shadow-inner">
                        <span className="text-sm font-bold text-[#54626f] truncate pr-2">{quiz.title}</span>
                        <span className="text-[10px] font-semibold text-[#54626f]/60">{new Date(quiz.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-sm">
                <h3 className="text-md font-black text-[#54626f] mb-4 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#54626f]" />
                  <span>Recent Submissions</span>
                </h3>
                {recentSubmissions.length === 0 ? (
                  <p className="text-xs text-[#54626f]/60 font-medium py-4">No quiz submissions yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentSubmissions.map((sub) => (
                      <div key={sub._id} className="p-4 bg-white/60 rounded-2xl border border-white flex justify-between items-center shadow-inner">
                        <span className="text-sm font-bold text-[#54626f] truncate pr-2">{sub.quizId?.title || 'Quiz Assessment'}</span>
                        <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">Score: {sub.score}/{sub.totalQuestions}</span>
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