import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useTheme } from '../context/ThemeContext';
import {
  BookOpen,
  BrainCircuit,
  FileText,
  TrendingUp,
  Target,
  User,
  LogOut,
  X,
} from 'lucide-react';

const SIDEBAR_SUBTITLE = 'Personal Study Space';

const NAV_ITEMS = [
  { label: 'Overview', to: '/dashboard', icon: TrendingUp },
  { label: 'Documents', to: '/documents', icon: FileText },
  { label: 'Flashcards', to: '/flashcards', icon: BrainCircuit },
  { label: 'Quizzes', to: '/quizzes', icon: BookOpen },
  { label: 'Improvement', to: '/improvement', icon: Target },
];

const PROFILE_ITEM = {
  label: 'Profile',
  to: '/profile',
  icon: User,
};

export default function AppSidebar({ isOpen, onClose }) {
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const isProfileActive = location.pathname.startsWith(PROFILE_ITEM.to);
  const ProfileIcon = PROFILE_ITEM.icon;

  const handleLogout = async () => {
    onClose?.();
    await signOut(auth);
    navigate('/login');
  };

  return (
    <>
      {/* Backdrop when sidebar is open */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 z-30 transition-opacity"
        aria-hidden="true"
      />

      {/* Collapsible sidebar */}
      <aside
        className={`fixed md:static top-0 left-0 h-screen md:min-h-screen w-72 border-r p-6 flex flex-col justify-between shadow-xl z-40 shrink-0 ${
          isDark
            ? 'bg-[#171A21] border-[#2C313C] text-[#F3F4F6]'
            : 'bg-white border-[#D5DDE0] text-[#111827]'
        }`}
        style={{ fontSize: '18px' }}
      >
        <div>
          {/* Brand header */}
          <div className="flex items-center justify-between mb-9 px-1">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md shrink-0 ${
                  isDark ? 'bg-[#2B2F3A] text-[#F3F4F6]' : 'bg-[#54626f] text-white'
                }`}
              >
                <BookOpen className="w-5 h-5" />
              </div>

              <div className="min-w-0">
                <h1
                  className={`tracking-tight truncate ${
                    isDark ? 'font-black text-[#F3F4F6]' : 'font-black text-[#000000]'
                  }`}
                  style={{ fontSize: '21px', lineHeight: 1.2 }}
                >
                  AI Assistant
                </h1>
                <p
                  className={`tracking-wider uppercase leading-snug mt-0.5 ${
                    isDark ? 'font-black text-[#9CA3AF]' : 'font-extrabold text-[#54626f]'
                  }`}
                  style={{ fontSize: '12px' }}
                >
                  {SIDEBAR_SUBTITLE}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close sidebar"
              className={`p-2 rounded-xl transition cursor-pointer shrink-0 ${
                isDark
                  ? 'text-[#D1D5DB] hover:bg-[#222732] hover:text-white'
                  : 'text-[#54626f] hover:bg-[#e2eaeb]'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation links */}
          <nav className="space-y-2.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.to === '/dashboard'
                  ? location.pathname === '/dashboard'
                  : location.pathname.startsWith(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-full transition-colors ${
                    isDark
                      ? isActive
                        ? 'bg-[#2A2F3B] text-[#FFFFFF] font-black border border-[#3E4556] shadow-2xs'
                        : 'text-[#E5E7EB] hover:bg-[#222732] hover:text-[#FFFFFF] font-black'
                      : isActive
                        ? 'bg-[#54626f] text-white font-extrabold'
                        : 'text-[#1F2937] hover:bg-[#E2EAEB] hover:text-[#000000] font-extrabold'
                  }`}
                  style={{ fontSize: '18px', lineHeight: 1.3 }}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isDark
                        ? isActive
                          ? 'text-[#FFFFFF]'
                          : 'text-[#D1D5DB]'
                        : isActive
                          ? 'text-white'
                          : 'text-[#54626f]'
                    }`}
                  />
                  <span
                    className="truncate"
                    style={
                      isDark
                        ? { color: '#FFFFFF', fontWeight: 900, fontSize: '18px' }
                        : undefined
                    }
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {/* Pill-shaped Profile link that stays neutral by default and highlights only when active or hovered */}
            <Link
              to={PROFILE_ITEM.to}
              onClick={onClose}
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-full transition-colors ${
                isDark
                  ? isProfileActive
                    ? 'bg-[#2A2F3B] text-[#FFFFFF] font-black border border-[#3E4556] shadow-2xs'
                    : 'text-[#E5E7EB] hover:bg-[#222732] hover:text-[#FFFFFF] font-black'
                  : isProfileActive
                    ? 'bg-[#54626f] text-white font-extrabold'
                    : 'text-[#1F2937] hover:bg-[#E2EAEB] hover:text-[#000000] font-extrabold'
              }`}
              style={{ fontSize: '18px', lineHeight: 1.3 }}
            >
              <ProfileIcon
                className={`w-5 h-5 shrink-0 ${
                  isDark
                    ? isProfileActive
                      ? 'text-[#FFFFFF]'
                      : 'text-[#D1D5DB]'
                    : isProfileActive
                      ? 'text-white'
                      : 'text-[#54626f]'
                }`}
              />
              <span
                className="truncate"
                style={
                  isDark
                    ? { color: '#FFFFFF', fontWeight: 900, fontSize: '18px' }
                    : undefined
                }
              >
                {PROFILE_ITEM.label}
              </span>
            </Link>
          </nav>
        </div>

        {/* Sign out button */}
        <div
          className={`pt-6 border-t ${
            isDark ? 'border-[#2C313C]' : 'border-[#D5DDE0]'
          }`}
        >
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full flex items-center justify-center gap-2.5 px-4 py-3.5 bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2] rounded-2xl transition cursor-pointer ${
              isDark ? 'font-black' : 'font-bold'
            }`}
            style={{ fontSize: '18px' }}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}