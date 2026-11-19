import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, Zap, BookOpen } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function HomePage() {
  const { isDark } = useTheme();

  return (
    <div
      className={`min-h-screen flex flex-col justify-between relative overflow-hidden ${
        isDark ? 'bg-[#12141A] text-white' : 'bg-[#e2eaeb] text-[#54626f]'
      }`}
      style={{ fontSize: '19px' }}
    >
      {/* Background ambient glows */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#54626f]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-white/50 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar / Header */}
      <header className="w-full max-w-6xl mx-auto p-6 flex justify-between items-center z-10">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-[#54626f] text-white flex items-center justify-center shadow-md">
            <BookOpen className="w-5 h-5" />
          </div>
          <span
            className={`tracking-tight ${
              isDark ? 'font-black text-[#F3F4F6]' : 'font-extrabold text-[#54626f]'
            }`}
            style={{ fontSize: '21px' }}
          >
            AI Assistant
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/login"
            className={`px-5 py-2.5 rounded-xl transition duration-200 ${
              isDark
                ? 'font-black text-[#E5E7EB] hover:bg-[#171A21]'
                : 'font-bold text-[#54626f] hover:bg-white/50'
            }`}
            style={{ fontSize: '17px' }}
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className={`px-5 py-2.5 bg-[#54626f] text-white rounded-xl shadow-lg shadow-[#54626f]/20 hover:bg-[#434f5a] transition duration-200 ${
              isDark ? 'font-black' : 'font-bold'
            }`}
            style={{ fontSize: '17px' }}
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-4xl mx-auto px-6 py-12 text-center z-10 my-auto">
        {/* Floating mascot badge */}
        <div className="inline-flex flex-col items-center select-none mb-6">
          <div
            className={`relative bg-[#54626f] text-white px-4 py-1.5 rounded-full shadow-lg mb-2 animate-bounce tracking-wide ${
              isDark ? 'font-black' : 'font-semibold'
            }`}
            style={{ fontSize: '15px' }}
          >
            Your Smart Study Companion 🐾
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#54626f] rotate-45" />
          </div>
          <div
            className={`w-20 h-20 rounded-3xl backdrop-blur-md border flex items-center justify-center shadow-xl ${
              isDark
                ? 'bg-[#171A21]/90 border-[#2E3542]'
                : 'bg-white/80 border-white'
            }`}
            style={{ fontSize: '36px' }}
          >
            🐱
          </div>
        </div>

        <h1
          className={`font-black tracking-tight leading-tight mb-6 ${
            isDark ? 'text-[#F3F4F6]' : 'text-[#54626f]'
          }`}
          style={{ fontSize: '48px', lineHeight: 1.15 }}
        >
          Learn Smarter with AI
        </h1>

        <p
          className={`max-w-2xl mx-auto mb-10 leading-relaxed ${
            isDark ? 'text-[#D1D5DB] font-bold' : 'text-[#54626f]/80 font-medium'
          }`}
          style={{ fontSize: '20px' }}
        >
          Create personalized study plans, simplify difficult topics, generate quizzes, and get instant answers. Everything you need for smarter, more effective learning in one place.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className={`w-full sm:w-auto px-8 py-4 bg-[#54626f] text-white rounded-2xl hover:bg-[#434f5a] shadow-xl shadow-[#54626f]/20 transition duration-200 flex items-center justify-center space-x-2 group ${
              isDark ? 'font-black' : 'font-bold'
            }`}
            style={{ fontSize: '19px' }}
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition duration-200" />
          </Link>
          <Link
            to="/login"
            className={`w-full sm:w-auto px-8 py-4 backdrop-blur-md border rounded-2xl transition duration-200 shadow-sm ${
              isDark
                ? 'bg-[#171A21] text-[#F3F4F6] border-[#2C313C] hover:bg-[#222732] font-black'
                : 'bg-white/70 text-[#54626f] border-white hover:bg-white font-bold'
            }`}
            style={{ fontSize: '19px' }}
          >
            I already have an account
          </Link>
        </div>

        {/* Features preview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 text-left">
          <div
            className={`backdrop-blur-md p-6 rounded-3xl border shadow-sm ${
              isDark
                ? 'bg-[#171A21]/95 border-[#2C313C]'
                : 'bg-white/60 border-white/80'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                isDark ? 'bg-[#222732] text-[#E5E7EB]' : 'bg-[#54626f]/10 text-[#54626f]'
              }`}
            >
              <Zap className="w-5 h-5" />
            </div>
            <h3
              className={`mb-1.5 ${
                isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#54626f]'
              }`}
              style={{ fontSize: '21px' }}
            >
              Instant Answers
            </h3>
            <p
              className={`leading-relaxed ${
                isDark ? 'text-[#D1D5DB] font-bold' : 'text-[#54626f]/70 font-medium'
              }`}
              style={{ fontSize: '17px' }}
            >
              Get precise answers, code breakdowns, and concept explanations instantly.
            </p>
          </div>

          <div
            className={`backdrop-blur-md p-6 rounded-3xl border shadow-sm ${
              isDark
                ? 'bg-[#171A21]/95 border-[#2C313C]'
                : 'bg-white/60 border-white/80'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                isDark ? 'bg-[#222732] text-[#E5E7EB]' : 'bg-[#54626f]/10 text-[#54626f]'
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <h3
              className={`mb-1.5 ${
                isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#54626f]'
              }`}
              style={{ fontSize: '21px' }}
            >
              Personalized Plans
            </h3>
            <p
              className={`leading-relaxed ${
                isDark ? 'text-[#D1D5DB] font-bold' : 'text-[#54626f]/70 font-medium'
              }`}
              style={{ fontSize: '17px' }}
            >
              Structured learning tracks and study plans designed to help you master new topics.
            </p>
          </div>

          <div
            className={`backdrop-blur-md p-6 rounded-3xl border shadow-sm ${
              isDark
                ? 'bg-[#171A21]/95 border-[#2C313C]'
                : 'bg-white/60 border-white/80'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                isDark ? 'bg-[#222732] text-[#E5E7EB]' : 'bg-[#54626f]/10 text-[#54626f]'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3
              className={`mb-1.5 ${
                isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#54626f]'
              }`}
              style={{ fontSize: '21px' }}
            >
              Quiz Generation
            </h3>
            <p
              className={`leading-relaxed ${
                isDark ? 'text-[#D1D5DB] font-bold' : 'text-[#54626f]/70 font-medium'
              }`}
              style={{ fontSize: '17px' }}
            >
              Test your understanding with dynamically generated quizzes and assessments.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`w-full max-w-6xl mx-auto p-6 text-center z-10 ${
          isDark ? 'text-[#9CA3AF] font-bold' : 'text-[#54626f]/60 font-medium'
        }`}
        style={{ fontSize: '16px' }}
      >
        © 2026 AI Learning Assistant.
      </footer>
    </div>
  );
}