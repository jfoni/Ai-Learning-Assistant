import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, Zap, BookOpen } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#e2eaeb] flex flex-col justify-between relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#54626f]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-white/50 rounded-full blur-3xl pointer-events-none"></div>

      {/* Navbar / Header */}
      <header className="w-full max-w-6xl mx-auto p-6 flex justify-between items-center z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#54626f] text-white flex items-center justify-center shadow-md">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-[#54626f] text-lg tracking-tight">AI Assistant</span>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/login"
            className="px-5 py-2.5 text-sm font-bold text-[#54626f] hover:bg-white/50 rounded-xl transition duration-200"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 text-sm font-bold bg-[#54626f] text-white rounded-xl shadow-lg shadow-[#54626f]/20 hover:bg-[#434f5a] transition duration-200"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-4xl mx-auto px-6 py-12 text-center z-10 my-auto">
        
        {/* Floating Mascot Badge */}
        <div className="inline-flex flex-col items-center select-none mb-6">
          <div className="relative bg-[#54626f] text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg mb-2 animate-bounce tracking-wide">
            Your Smart Study Companion 🐾
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#54626f] rotate-45"></div>
          </div>
          <div className="w-20 h-20 rounded-3xl bg-white/80 backdrop-blur-md border border-white flex items-center justify-center text-4xl shadow-xl">
            🐱
          </div>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-[#54626f] tracking-tight leading-tight mb-6">
          Learn Smarter with AI
        </h1>
        
        <p className="text-base sm:text-lg text-[#54626f]/80 max-w-2xl mx-auto font-medium mb-10 leading-relaxed">
          Create personalized study plans, simplify difficult topics, generate quizzes, and get instant answers. Everything you need for smarter, more effective learning in one place.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 bg-[#54626f] text-white font-bold rounded-2xl hover:bg-[#434f5a] shadow-xl shadow-[#54626f]/20 transition duration-200 flex items-center justify-center space-x-2 group text-base"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition duration-200" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 bg-white/70 backdrop-blur-md text-[#54626f] border border-white font-bold rounded-2xl hover:bg-white transition duration-200 shadow-sm text-base"
          >
            I already have an account
          </Link>
        </div>

        {/* Features Preview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 text-left">
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white/80 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#54626f]/10 flex items-center justify-center text-[#54626f] mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#54626f] mb-1">Instant Answers</h3>
            <p className="text-xs text-[#54626f]/70 leading-relaxed">Get precise answers, code breakdowns, and concept explanations instantly.</p>
          </div>

          <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white/80 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#54626f]/10 flex items-center justify-center text-[#54626f] mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#54626f] mb-1">Personalized Plans</h3>
            <p className="text-xs text-[#54626f]/70 leading-relaxed">Structured learning tracks and study plans designed to help you master new topics.</p>
          </div>

          <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white/80 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#54626f]/10 flex items-center justify-center text-[#54626f] mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#54626f] mb-1">Quiz Generation</h3>
            <p className="text-xs text-[#54626f]/70 leading-relaxed">Test your understanding with dynamically generated quizzes and assessments.</p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto p-6 text-center text-xs text-[#54626f]/60 font-medium z-10">
        © 2026 AI Learning Assistant. Built with passion and code.
      </footer>

    </div>
  );
}