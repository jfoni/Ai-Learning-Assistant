import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  onAuthStateChanged,
  signOut,
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { auth } from '../../services/firebase';
import { getDashboardOverview } from '../../services/dashboardService';
import { useTheme } from '../../context/ThemeContext';
import {
  BookOpen,
  BrainCircuit,
  FileText,
  NotebookPen,
  TrendingUp,
  Target,
  SearchCheck,
  Sparkles,
  GraduationCap,
  User,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  Sun,
  Moon,
  Lock,
  KeyRound,
  CheckCircle2,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

const SIDEBAR_SUBTITLE = 'Personal Study Space';

const ALL_SIDEBAR_FEATURES = [
  { label: 'Overview', to: '/dashboard', icon: TrendingUp },
  { label: 'Universal Assistant', to: '/assistant', icon: Sparkles },
  { label: 'Teach Me', to: '/teach-me', icon: GraduationCap },
  { label: 'Documents', to: '/documents', icon: FileText },
  { label: 'Study Notes', to: '/notes', icon: NotebookPen },
  { label: 'Flashcards', to: '/flashcards', icon: BrainCircuit },
  { label: 'Quizzes', to: '/quizzes', icon: BookOpen },
  { label: 'Knowledge Gaps', to: '/knowledge-gaps', icon: SearchCheck },
  { label: 'Improvement', to: '/improvement', icon: Target },
  { label: 'Profile', to: '/profile', icon: User },
];

export default function ProfilePage() {
  const { isDark, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalFlashcards: 0,
    totalDocuments: 0,
    averageScore: 0,
  });

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      setUser(currentUser);
      setDisplayName(
        currentUser.displayName || currentUser.email?.split('@')[0] || 'Learner'
      );

      try {
        const res = await getDashboardOverview(currentUser.uid);
        if (res?.success && res?.data?.stats) {
          setStats({
            totalQuizzes: Number(res.data.stats.totalQuizzes) || 0,
            totalFlashcards: Number(res.data.stats.totalFlashcards) || 0,
            totalDocuments: Number(res.data.stats.totalDocuments) || 0,
            averageScore: Number(res.data.stats.averageScore) || 0,
          });
        }
      } catch (err) {
        console.error('Profile stats load error:', err);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleThemeChange = (mode) => {
    setTheme(mode);
    setIsSidebarOpen(true);
    setStatusMessage(
      mode === 'dark'
        ? 'Dark mode enabled across the app.'
        : 'Light mode enabled across the app.'
    );
    setErrorMessage('');
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;

    try {
      setSavingName(true);
      setErrorMessage('');
      setStatusMessage('');
      await updateProfile(user, { displayName: displayName.trim() });
      setStatusMessage('Profile name updated successfully.');
    } catch (err) {
      console.error('Update profile error:', err);
      setErrorMessage('Could not update profile name.');
    } finally {
      setSavingName(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!user) return;

    setErrorMessage('');
    setStatusMessage('');

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }

    try {
      setUpdatingPassword(true);

      if (user.email && currentPassword) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }

      await updatePassword(user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatusMessage('Password updated successfully.');
    } catch (err) {
      console.error('Password update error:', err);
      if (err?.code === 'auth/requires-recent-login') {
        setErrorMessage(
          'Please enter your current password or sign in again to change password.'
        );
      } else if (
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-credential'
      ) {
        setErrorMessage('Current password is incorrect.');
      } else {
        setErrorMessage('Failed to update password. Please try again.');
      }
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleLogout = async () => {
    setIsSidebarOpen(false);
    await signOut(auth);
    navigate('/login');
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const lastSignInDate = user?.metadata?.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Not available';

  const createdDate = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Not available';

  const accountSummaryItems = [
    {
      id: 'password-status',
      label: 'Last Password / Sign-In',
      value: lastSignInDate,
      badge: 'Security',
      badgeClass: 'bg-[#2b6777]/12 text-[#2b6777]',
      rowClass: isDark ? 'bg-[#14181C]' : 'bg-[#f4f9fa]',
    },
    {
      id: 'theme-status',
      label: 'Interface Theme',
      value: isDark ? 'Dark Mode' : 'Light Mode',
      badge: 'Appearance',
      badgeClass: 'bg-[#b87d4b]/16 text-[#8c5a2b]',
      rowClass: isDark ? 'bg-[#14181C]' : 'bg-[#fbf7f3]',
    },
    {
      id: 'member-status',
      label: 'Member Since',
      value: createdDate,
      badge: 'Account',
      badgeClass: 'bg-[#4a7c59]/14 text-[#2f553a]',
      rowClass: isDark ? 'bg-[#14181C]' : 'bg-[#f5f9f6]',
    },
    {
      id: 'accuracy-status',
      label: 'Quiz Average Score',
      value: `${Number(stats.averageScore)}%`,
      badge: 'Progress',
      badgeClass: 'bg-[#54626f]/14 text-[#3f4b56]',
      rowClass: isDark ? 'bg-[#14181C]' : 'bg-[#f5f8f9]',
    },
  ];

  return (
    <div
      className={`min-h-screen flex relative transition-colors ${
        isDark ? 'bg-[#14181C] text-[#E8ECEF]' : 'bg-[#e2eaeb] text-[#1f2933]'
      }`}
      style={{ fontSize: '18px' }}
    >
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/25 z-30 transition-opacity md:hidden"
          aria-hidden="true"
        />
      )}

      {isSidebarOpen && (
        <aside
          className={`fixed md:static top-0 left-0 h-screen md:h-auto w-72 border-r p-6 flex flex-col justify-between shadow-lg z-40 shrink-0 ${
            isDark
              ? 'bg-[#1E242B] border-[#303A46] text-[#E8ECEF]'
              : 'bg-white border-[#d5dde0] text-[#1f2933]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-10 px-1">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#54626f] text-white flex items-center justify-center shadow-sm">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-black tracking-tight" style={{ fontSize: '22px' }}>
                    AI Assistant
                  </h1>
                  <p
                    className="font-black tracking-wider uppercase text-[#54626f]"
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
              {ALL_SIDEBAR_FEATURES.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.to === '/dashboard'
                    ? location.pathname === '/dashboard'
                    : location.pathname.startsWith(item.to);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeSidebar}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold transition ${
                      isActive
                        ? 'bg-[#54626f] text-white'
                        : isDark
                          ? 'hover:bg-[#262E37] text-[#E8ECEF]'
                          : 'text-[#1f2937] hover:bg-[#e2eaeb]'
                    }`}
                    style={{ fontSize: '18px' }}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div
            className={`pt-6 border-t ${isDark ? 'border-[#303A46]' : 'border-[#d5dde0]'}`}
          >
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#fef2f2] text-[#dc2626] hover:bg-[#fee2e2] rounded-2xl font-bold transition cursor-pointer"
              style={{ fontSize: '18px' }}
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      )}

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Top Header */}
          <div
            className={`rounded-2xl p-6 border shadow-xs flex items-start justify-between gap-4 ${
              isDark
                ? 'bg-[#1E242B] border-[#303A46]'
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
                    ? 'bg-[#262E37] text-[#E8ECEF] hover:bg-[#54626f]'
                    : 'bg-[#e2eaeb] text-[#1f2937] hover:bg-[#54626f] hover:text-white'
                }`}
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h1
                  className="font-black tracking-tight"
                  style={{ fontSize: '36px', lineHeight: 1.15 }}
                >
                  Profile &amp; Settings
                </h1>
                <p
                  className={`mt-1.5 font-medium ${
                    isDark ? 'text-[#9AA6B2]' : 'text-[#54626f]'
                  }`}
                  style={{ fontSize: '19px' }}
                >
                  Manage your account information, theme preference, and password.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                isDark
                  ? 'bg-[#262E37] text-[#E8ECEF] hover:bg-[#54626f]'
                  : 'bg-[#e2eaeb] text-[#1f2937] hover:bg-[#54626f] hover:text-white'
              }`}
              style={{ fontSize: '17px' }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          </div>

          {/* Feedback Banner */}
          {statusMessage && (
            <div
              className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-emerald-100 text-emerald-900 font-extrabold"
              style={{ fontSize: '18px' }}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div
              className="px-4 py-3.5 rounded-2xl bg-rose-100 text-rose-800 font-extrabold"
              style={{ fontSize: '18px' }}
            >
              {errorMessage}
            </div>
          )}

          {/* Profile Information & Theme Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <form
              onSubmit={handleProfileSave}
              className={`rounded-2xl p-6 border shadow-xs space-y-5 ${
                isDark
                  ? 'bg-[#1E242B] border-[#303A46]'
                  : 'bg-white/95 border-[#54626f]/15'
              }`}
            >
              <div className="flex items-center gap-3 border-b border-[#54626f]/15 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#2b6777]/15 text-[#2b6777] flex items-center justify-center text-2xl">
                  <span role="img" aria-label="Cat avatar">
                    🐱
                  </span>
                </div>
                <div>
                  <h2 className="font-black" style={{ fontSize: '24px' }}>
                    Profile Information
                  </h2>
                  <p
                    className={`font-semibold ${
                      isDark ? 'text-[#9AA6B2]' : 'text-[#54626f]'
                    }`}
                    style={{ fontSize: '17px' }}
                  >
                    Joined on {createdDate}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    className="block font-extrabold uppercase tracking-wider text-[#54626f] mb-1.5"
                    style={{ fontSize: '15px' }}
                  >
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border font-semibold focus:outline-none ${
                      isDark
                        ? 'bg-[#14181C] border-[#303A46] text-[#E8ECEF]'
                        : 'bg-[#f8fafb] border-[#54626f]/20 text-[#1f2933]'
                    }`}
                    style={{ fontSize: '18px' }}
                  />
                </div>

                <div>
                  <label
                    className="block font-extrabold uppercase tracking-wider text-[#54626f] mb-1.5"
                    style={{ fontSize: '15px' }}
                  >
                    Email Address
                  </label>
                  <div
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border font-semibold ${
                      isDark
                        ? 'bg-[#14181C]/70 border-[#303A46] text-[#9AA6B2]'
                        : 'bg-[#f1f5f7] border-[#e2eaeb] text-[#4a5560]'
                    }`}
                    style={{ fontSize: '18px' }}
                  >
                    <Mail className="w-5 h-5 text-[#54626f]" />
                    <span>{user?.email || 'No email linked'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
                <div
                  className={`p-3.5 rounded-xl ${
                    isDark ? 'bg-[#14181C]' : 'bg-[#f5f8f9]'
                  }`}
                >
                  <p className="font-black" style={{ fontSize: '24px' }}>
                    {Number(stats.totalFlashcards)}
                  </p>
                  <p className="font-bold text-[#54626f]" style={{ fontSize: '15px' }}>
                    Flashcards
                  </p>
                </div>
                <div
                  className={`p-3.5 rounded-xl ${
                    isDark ? 'bg-[#14181C]' : 'bg-[#f5f8f9]'
                  }`}
                >
                  <p className="font-black" style={{ fontSize: '24px' }}>
                    {Number(stats.totalDocuments)}
                  </p>
                  <p className="font-bold text-[#54626f]" style={{ fontSize: '15px' }}>
                    Documents
                  </p>
                </div>
                <div
                  className={`p-3.5 rounded-xl ${
                    isDark ? 'bg-[#14181C]' : 'bg-[#f5f8f9]'
                  }`}
                >
                  <p className="font-black" style={{ fontSize: '24px' }}>
                    {Number(stats.totalQuizzes)}
                  </p>
                  <p className="font-bold text-[#54626f]" style={{ fontSize: '15px' }}>
                    Quizzes
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingName}
                className="w-full py-3 rounded-xl font-extrabold bg-[#54626f] text-white hover:bg-[#2b6777] transition disabled:opacity-50 cursor-pointer"
                style={{ fontSize: '18px' }}
              >
                {savingName ? 'Saving...' : 'Save Profile'}
              </button>
            </form>

            {/* Appearance / Theme Mode */}
            <div
              className={`rounded-2xl p-6 border shadow-xs flex flex-col justify-between space-y-5 ${
                isDark
                  ? 'bg-[#1E242B] border-[#303A46]'
                  : 'bg-white/95 border-[#54626f]/15'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 border-b border-[#54626f]/15 pb-4">
                  <div className="w-11 h-11 rounded-xl bg-[#b87d4b]/15 text-[#8c5a2b] flex items-center justify-center">
                    {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="font-black" style={{ fontSize: '24px' }}>
                      Theme Preference
                    </h2>
                    <p
                      className={`font-semibold ${
                        isDark ? 'text-[#9AA6B2]' : 'text-[#54626f]'
                      }`}
                      style={{ fontSize: '17px' }}
                    >
                      Choose between Light Mode and Dark Mode
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleThemeChange('light')}
                    className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                      !isDark
                        ? 'bg-[#e2eaeb] border-[#54626f] text-[#1f2933]'
                        : 'bg-[#14181C] border-[#303A46] text-[#9AA6B2] hover:border-[#54626f]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black" style={{ fontSize: '18px' }}>
                      <Sun className="w-5 h-5 text-[#b87d4b]" />
                      <span>Light Mode</span>
                    </div>
                    <p className="font-medium mt-1 opacity-80" style={{ fontSize: '15px' }}>
                      Clean soft mist and slate look
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleThemeChange('dark')}
                    className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                      isDark
                        ? 'bg-[#262E37] border-[#8FA6B8] text-[#E8ECEF]'
                        : 'bg-[#f8fafb] border-[#e2eaeb] text-[#1f2933] hover:border-[#54626f]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black" style={{ fontSize: '18px' }}>
                      <Moon className="w-5 h-5 text-[#8FA6B8]" />
                      <span>Dark Mode</span>
                    </div>
                    <p className="font-medium mt-1 opacity-80" style={{ fontSize: '15px' }}>
                      Low-glare evening study mode
                    </p>
                  </button>
                </div>
              </div>

              {/* Styled UL Summary List */}
              <ul className="divide-y divide-[#dce4e6] border border-[#dce4e6] rounded-2xl overflow-hidden list-none p-0 m-0">
                {accountSummaryItems.map((item) => (
                  <li
                    key={item.id}
                    className={`px-4 py-3.5 flex items-center justify-between gap-2 ${item.rowClass}`}
                    style={{ fontSize: '17px' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`font-extrabold px-2.5 py-0.5 rounded-full ${item.badgeClass}`}
                        style={{ fontSize: '14px' }}
                      >
                        {item.badge}
                      </span>
                      <span className="font-bold">{item.label}</span>
                    </div>
                    <span className="font-black">{item.value}</span>
                  </li>
                ))}
              </ul>

              <div
                className={`p-3.5 rounded-2xl border font-semibold flex items-center justify-between ${
                  isDark
                    ? 'bg-[#14181C] border-[#303A46] text-[#9AA6B2]'
                    : 'bg-[#f5f8f9] border-[#e2eaeb] text-[#4a5560]'
                }`}
                style={{ fontSize: '17px' }}
              >
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#2b6777]" />
                  <span>Active Theme</span>
                </span>
                <span className="font-black uppercase">{isDark ? 'Dark' : 'Light'}</span>
              </div>
            </div>
          </div>

          {/* Settings & Password Update Section */}
          <form
            onSubmit={handlePasswordChange}
            className={`rounded-2xl p-6 border shadow-xs space-y-5 ${
              isDark
                ? 'bg-[#1E242B] border-[#303A46]'
                : 'bg-white/95 border-[#54626f]/15'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#54626f]/15 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-xl bg-[#2b6777]/12 text-[#2b6777] flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black" style={{ fontSize: '24px' }}>
                    Settings &amp; Password
                  </h2>
                  <p
                    className={`font-semibold ${
                      isDark ? 'text-[#9AA6B2]' : 'text-[#54626f]'
                    }`}
                    style={{ fontSize: '17px' }}
                  >
                    Last password / security update: {lastSignInDate}
                  </p>
                </div>
              </div>

              <span
                className="font-extrabold px-3.5 py-1.5 rounded-full bg-[#2b6777]/12 text-[#2b6777] self-start sm:self-auto"
                style={{ fontSize: '15px' }}
              >
                Last Activity: {lastSignInDate}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  className="block font-extrabold uppercase tracking-wider text-[#54626f] mb-1.5"
                  style={{ fontSize: '15px' }}
                >
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`w-full pl-4 pr-11 py-3 rounded-xl border font-medium focus:outline-none ${
                      isDark
                        ? 'bg-[#14181C] border-[#303A46] text-[#E8ECEF]'
                        : 'bg-[#f8fafb] border-[#54626f]/20 text-[#1f2933]'
                    }`}
                    style={{ fontSize: '18px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw((prev) => !prev)}
                    aria-label={showCurrentPw ? 'Hide current password' : 'View current password'}
                    title={showCurrentPw ? 'Hide current password' : 'View current password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#54626f] hover:text-[#1f2933] cursor-pointer"
                  >
                    {showCurrentPw ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  className="block font-extrabold uppercase tracking-wider text-[#54626f] mb-1.5"
                  style={{ fontSize: '15px' }}
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full pl-4 pr-11 py-3 rounded-xl border font-medium focus:outline-none ${
                      isDark
                        ? 'bg-[#14181C] border-[#303A46] text-[#E8ECEF]'
                        : 'bg-[#f8fafb] border-[#54626f]/20 text-[#1f2933]'
                    }`}
                    style={{ fontSize: '18px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw((prev) => !prev)}
                    aria-label={showNewPw ? 'Hide new password' : 'View new password'}
                    title={showNewPw ? 'Hide new password' : 'View new password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#54626f] hover:text-[#1f2933] cursor-pointer"
                  >
                    {showNewPw ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  className="block font-extrabold uppercase tracking-wider text-[#54626f] mb-1.5"
                  style={{ fontSize: '15px' }}
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-4 pr-11 py-3 rounded-xl border font-medium focus:outline-none ${
                      isDark
                        ? 'bg-[#14181C] border-[#303A46] text-[#E8ECEF]'
                        : 'bg-[#f8fafb] border-[#54626f]/20 text-[#1f2933]'
                    }`}
                    style={{ fontSize: '18px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw((prev) => !prev)}
                    aria-label={showConfirmPw ? 'Hide confirm password' : 'View confirm password'}
                    title={showConfirmPw ? 'Hide confirm password' : 'View confirm password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#54626f] hover:text-[#1f2933] cursor-pointer"
                  >
                    {showConfirmPw ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={updatingPassword || !newPassword || !confirmPassword}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-extrabold bg-[#54626f] text-white hover:bg-[#2b6777] transition disabled:opacity-50 cursor-pointer"
                style={{ fontSize: '18px' }}
              >
                <KeyRound className="w-5 h-5" />
                <span>{updatingPassword ? 'Updating...' : 'Change Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}