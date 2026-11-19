import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useTheme } from '../context/ThemeContext';
import {
  BookOpen,
  BrainCircuit,
  FileText,
  TrendingUp,
  LogOut,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';

// Replace with your preferred subtitle label
const SIDEBAR_SUBTITLE = 'Personal Study Space';

export default function DashboardLayout({
  children,
  showBackButton = false,
  backTo = '/dashboard',
  backLabel = 'Back',
}) {
  const { isDark } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsSidebarOpen(false);
    await signOut(auth);
    navigate('/login');
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const navItems = [
    { label: 'Overview', to: '/dashboard', icon: TrendingUp },
    { label: 'Documents', to: '/documents', icon: FileText },
    { label: 'Flashcards', to: '/flashcards', icon: BrainCircuit },
    { label: 'Quizzes', to: '/quizzes', icon: BookOpen },
  ];

  return (
    <div
      className={`min-h-screen flex font-sans relative ${
        isDark ? 'bg-[#12141A] text-white' : 'bg-[#e2eaeb] text-[#111827]'
      }`}
      style={{ fontSize: '19px' }}
    >
      {/* Backdrop when sidebar is open */}
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/25 z-30 transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Collapsible sidebar */}
      {isSidebarOpen && (
        <aside
          className={`fixed md:static top-0 left-0 h-screen md:h-auto w-72 border-r p-6 flex flex-col justify-between shadow-lg z-40 shrink-0 ${
            isDark ? 'bg-[#171A21] border-[#2C313C]' : 'bg-white border-[#D5DDE0]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-10 px-1">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#54626f] text-white flex items-center justify-center shadow-md">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h1
                    className={`tracking-tight ${
                      isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#000000]'
                    }`}
                    style={{ fontSize: '21px' }}
                  >
                    AI Assistant
                  </h1>
                  <p
                    className={`tracking-wider uppercase ${
                      isDark ? 'font-black text-[#9CA3AF]' : 'font-black text-[#54626f]'
                    }`}
                    style={{ fontSize: '13px' }}
                  >
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
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeSidebar}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition ${
                      isActive
                        ? 'bg-[#54626f] text-white font-black'
                        : isDark
                          ? 'text-[#E5E7EB] hover:bg-[#222732] hover:text-white font-black'
                          : 'text-[#1F2937] hover:bg-[#E2EAEB] hover:text-[#000000] font-extrabold'
                    }`}
                    style={{ fontSize: '18px' }}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-6 border-t border-[#D5DDE0]">
            <button
              type="button"
              onClick={handleLogout}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2] rounded-2xl transition cursor-pointer ${
                isDark ? 'font-black' : 'font-bold'
              }`}
              style={{ fontSize: '18px' }}
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main content area */}
      <div className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="w-11 h-11 rounded-xl bg-white text-[#1F2937] border border-[#D5DDE0] hover:bg-[#54626f] hover:text-white hover:border-[#54626f] flex items-center justify-center shadow-2xs transition cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {showBackButton && (
            <button
              type="button"
              onClick={() => navigate(backTo)}
              className={`outside-card-text inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black border border-[#D5DDE0] hover:bg-[#f8fafb] shadow-2xs transition cursor-pointer ${
                isDark ? 'font-black' : 'font-bold'
              }`}
              style={{ fontSize: '18px', backgroundColor: '#FFFFFF', color: '#000000' }}
            >
              <ArrowLeft className="w-5 h-5 text-black" />
              <span style={{ color: '#000000' }}>{backLabel}</span>
            </button>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}