import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useTheme } from '../../context/ThemeContext';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden ${
        isDark ? 'bg-[#12141A] text-white' : 'bg-[#e2eaeb] text-[#54626f]'
      }`}
      style={{ fontSize: '19px' }}
    >
      {/* Aesthetic background ambient shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#54626f]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md mt-8">
        {/* Floating aesthetic cat mascot */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center select-none pointer-events-none">
          <div
            className={`relative bg-[#54626f] text-white px-4 py-1.5 rounded-full shadow-lg mb-1.5 animate-bounce tracking-wide ${
              isDark ? 'font-black' : 'font-bold'
            }`}
            style={{ fontSize: '15px' }}
          >
            Welcome Back!
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#54626f] rotate-45" />
          </div>
          <div
            className={`w-16 h-16 rounded-2xl backdrop-blur-md border flex items-center justify-center shadow-xl transform hover:scale-110 transition duration-300 ${
              isDark
                ? 'bg-[#171A21]/90 border-[#2E3542]'
                : 'bg-white/80 border-white'
            }`}
            style={{ fontSize: '32px' }}
          >
            <span role="img" aria-label="Cat mascot">
              🐱
            </span>
          </div>
        </div>

        {/* Main glassmorphic card */}
        <div
          className={`backdrop-blur-2xl w-full p-8 pt-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(84,98,111,0.1)] border relative overflow-hidden ${
            isDark
              ? 'bg-[#171A21]/95 border-[#2C313C]'
              : 'bg-white/75 border-white/80'
          }`}
        >
          <div className="text-center mb-8 mt-2">
            <h2
              className={`font-black tracking-tight ${
                isDark ? 'text-[#F3F4F6]' : 'text-[#54626f]'
              }`}
              style={{ fontSize: '36px', lineHeight: 1.15 }}
            >
              Sign In
            </h2>
            <p
              className={`mt-1.5 ${
                isDark ? 'text-[#D1D5DB] font-bold' : 'text-[#54626f]/75 font-medium'
              }`}
              style={{ fontSize: '19px' }}
            >
              Continue your learning journey with AI
            </p>
          </div>

          {error && (
            <div
              className={`bg-red-50/90 backdrop-blur-sm border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-2xl mb-6 shadow-sm ${
                isDark ? 'font-extrabold' : 'font-semibold'
              }`}
              style={{ fontSize: '17px' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                className={`block uppercase tracking-wider mb-2 ml-1 ${
                  isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f]/80 font-extrabold'
                }`}
                style={{ fontSize: '15px' }}
              >
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[#54626f]/45">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-[#54626f]/50 transition duration-300 shadow-inner ${
                    isDark
                      ? 'bg-[#12141A] border-[#2E3542] text-[#F3F4F6] placeholder-[#9CA3AF] font-bold'
                      : 'bg-white/70 border-[#54626f]/15 focus:bg-white text-[#54626f] font-medium'
                  }`}
                  style={{ fontSize: '19px' }}
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label
                className={`block uppercase tracking-wider mb-2 ml-1 ${
                  isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f]/80 font-extrabold'
                }`}
                style={{ fontSize: '15px' }}
              >
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[#54626f]/45">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-12 pr-12 py-3.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-[#54626f]/50 transition duration-300 shadow-inner ${
                    isDark
                      ? 'bg-[#12141A] border-[#2E3542] text-[#F3F4F6] placeholder-[#9CA3AF] font-bold'
                      : 'bg-white/70 border-[#54626f]/15 focus:bg-white text-[#54626f] font-medium'
                  }`}
                  style={{ fontSize: '19px' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'View password'}
                  title={showPassword ? 'Hide password' : 'View password'}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#54626f]/65 hover:text-[#54626f] transition cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-2 py-4 bg-[#54626f] text-white rounded-2xl hover:bg-[#434f5a] active:scale-[0.98] transition duration-200 shadow-lg shadow-[#54626f]/20 flex items-center justify-center space-x-2 group cursor-pointer tracking-wide ${
                isDark ? 'font-black' : 'font-bold'
              }`}
              style={{ fontSize: '19px' }}
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              {!loading && (
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition duration-200" />
              )}
            </button>
          </form>

          <p
            className={`text-center mt-8 ${
              isDark ? 'text-[#D1D5DB] font-bold' : 'text-[#54626f]/75 font-medium'
            }`}
            style={{ fontSize: '18px' }}
          >
            Don&apos;t have an account?{' '}
            <Link
              className={`hover:underline ${
                isDark ? 'font-black text-white' : 'font-bold text-[#54626f]'
              }`}
              to="/register"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}