import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContext } from '../../context/AuthContext';
import { BookOpen, User, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.username.trim() || !form.email.trim() || !form.password || !form.confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (form.username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      if (data.token) {
        login(data.user, data.token, true);
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', {
          state: {
            message: 'Account created successfully. Please sign in.'
          }
        });
      }

    } catch (error) {
      setError(error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e2eaeb] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex w-full max-w-5xl min-h-[650px] overflow-hidden rounded-[28px] bg-white shadow-[0_20px_80px_rgba(84,98,111,0.15)]"
      >
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:flex w-1/2 items-center justify-center bg-[#54626f] p-12 text-[#e2eaeb]"
        >
          <div className="max-w-sm text-center">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#e2eaeb]/20 border border-[#e2eaeb]/30 shadow-lg"
            >
              <Sparkles size={36} className="text-[#e2eaeb]" />
            </motion.div>

            <h2 className="text-3xl font-bold text-white">Start your learning journey.</h2>
            <p className="mt-4 leading-7 text-[#e2eaeb]/90">
              Join AI Learn and explore a smarter way to study, practice, and build your skills.
            </p>

            <Link
              to="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#e2eaeb]/40 px-7 py-3 text-[#e2eaeb] transition hover:bg-[#e2eaeb] hover:text-[#54626f]"
            >
              Sign In <ArrowRight size={18} />
            </Link>
          </div>
        </motion.div>

        <div className="flex w-full md:w-1/2 items-center justify-center p-8 md:p-12">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-sm"
          >
            <Link to="/" className="mb-6 flex items-center gap-2 text-[#54626f]">
              <BookOpen size={28} className="text-[#54626f]" />
              <span className="text-xl font-bold">AI Learn</span>
            </Link>

            <h1 className="text-3xl font-bold text-[#54626f]">Create account</h1>
            <p className="mt-2 text-sm text-stone-500">Begin your personalized learning experience.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#54626f]">Username</label>
                <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-[#e2eaeb]/30 px-4 focus-within:border-[#54626f]">
                  <User size={18} className="text-[#54626f]" />
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    placeholder="Choose a username"
                    autoComplete="username"
                    required
                    className="w-full bg-transparent py-3 text-sm outline-none text-[#54626f]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#54626f]">Email address</label>
                <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-[#e2eaeb]/30 px-4 focus-within:border-[#54626f]">
                  <Mail size={18} className="text-[#54626f]" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="w-full bg-transparent py-3 text-sm outline-none text-[#54626f]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#54626f]">Password</label>
                <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-[#e2eaeb]/30 px-4 focus-within:border-[#54626f]">
                  <Lock size={18} className="text-[#54626f]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    required
                    className="w-full bg-transparent py-3 text-sm outline-none text-[#54626f]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-stone-400 hover:text-[#54626f]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#54626f]">Confirm password</label>
                <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-[#e2eaeb]/30 px-4 focus-within:border-[#54626f]">
                  <Lock size={18} className="text-[#54626f]" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    required
                    className="w-full bg-transparent py-3 text-sm outline-none text-[#54626f]"
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#54626f] py-3.5 font-semibold text-[#e2eaeb] transition hover:bg-[#e2eaeb] hover:text-[#54626f] disabled:opacity-60 shadow-md"
              >
                {loading ? 'Creating account...' : 'Create Account'}
                {!loading && <ArrowRight size={18} />}
              </motion.button>
            </form>

            <p className="mt-5 text-center text-sm text-stone-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[#54626f] hover:underline">
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}