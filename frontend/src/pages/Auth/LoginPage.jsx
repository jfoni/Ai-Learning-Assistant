import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen bg-[#e2eaeb] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      
      {/* Aesthetic Background Ambient Shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#54626f]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/40 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative w-full max-w-md mt-8">
        
        {/* Floating Aesthetic Cat Mascot */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center select-none pointer-events-none">
          <div className="relative bg-[#54626f] text-white px-3.5 py-1 rounded-full text-xs font-semibold shadow-lg mb-1.5 animate-bounce tracking-wide">
            Welcome Back! 🐾
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#54626f] rotate-45"></div>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/80 backdrop-blur-md border border-white flex items-center justify-center text-3xl shadow-xl transform hover:scale-110 transition duration-300">
            🐱
          </div>
        </div>

        {/* Main Glassmorphic Card */}
        <div className="bg-white/70 backdrop-blur-2xl w-full p-8 pt-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(84,98,111,0.1)] border border-white/80 relative overflow-hidden">
          
          <div className="text-center mb-8 mt-2">
            <h2 className="text-3xl font-black text-[#54626f] tracking-tight">Sign In</h2>
            <p className="text-sm text-[#54626f]/70 mt-1 font-medium">Continue your learning journey with AI</p>
          </div>

          {error && (
            <div className="bg-red-50/80 backdrop-blur-sm border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-2xl mb-6 text-xs font-medium shadow-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[#54626f]/70 mb-2 ml-1">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[#54626f]/40">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white/60 rounded-2xl border border-[#54626f]/15 focus:outline-none focus:ring-2 focus:ring-[#54626f]/50 focus:bg-white text-[#54626f] text-sm transition duration-300 shadow-inner"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[#54626f]/70 mb-2 ml-1">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[#54626f]/40">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white/60 rounded-2xl border border-[#54626f]/15 focus:outline-none focus:ring-2 focus:ring-[#54626f]/50 focus:bg-white text-[#54626f] text-sm transition duration-300 shadow-inner"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-4 bg-[#54626f] text-white font-bold rounded-2xl hover:bg-[#434f5a] active:scale-[0.98] transition duration-200 shadow-lg shadow-[#54626f]/20 flex items-center justify-center space-x-2 group cursor-pointer text-sm tracking-wide"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition duration-200" />}
            </button>
          </form>

          <p className="text-center text-xs text-[#54626f]/70 mt-8 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-[#54626f] hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}