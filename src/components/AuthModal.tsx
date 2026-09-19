import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Mail,
  Lock,
  User,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Brain,
  Flame,
  ShieldCheck,
  Bot
} from 'lucide-react';
import {
  supabaseSignUp,
  supabaseSignIn,
  supabaseSignInWithGoogle,
  isSupabaseConfigured
} from '../lib/supabase';
import { storage } from '../lib/storage';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  initialMode?: 'signin' | 'signup';
  triggerReason?: string; // e.g. "To access Voice Call, please sign in" or "Free trial limit reached"
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'signup',
  triggerReason,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('High School');
  const [goals, setGoals] = useState('Excel in academics and explore AI & coding');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasSupabase = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setErrorMsg('Please provide your name or nickname.');
      setLoading(false);
      return;
    }

    try {
      if (hasSupabase) {
        if (mode === 'signup') {
          const res = await supabaseSignUp(email, password, { name, grade, goals });
          if (res.error) {
            setErrorMsg(res.error);
            setLoading(false);
            return;
          }

          if (!res.session) {
            setSuccessMsg('Account created. Check your email to confirm your account, then sign in.');
            setMode('signin');
            setLoading(false);
            return;
          }

          const newUser: UserProfile = {
            id: res.user?.id || `usr_${Date.now()}`,
            name: name || 'Student',
            email: email,
            avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || email)}`,
            grade: grade,
            goals: goals,
            favorite_subjects: 'Math, Computer Science',
            interests: 'Coding, Science, Problem Solving',
            streak_days: 1,
            longest_streak: 1,
            total_study_minutes: 15,
            total_messages: 5,
            created_at: new Date().toISOString(),
          };

          storage.saveUser(newUser);
          setSuccessMsg('Account created successfully! Welcome to Buddy.');
          setTimeout(() => {
            onAuthSuccess(newUser);
            onClose();
          }, 800);
        } else {
          const res = await supabaseSignIn(email, password);
          if (res.error) {
            setErrorMsg(res.error);
            setLoading(false);
            return;
          }

          const existing = storage.getUser();
          const updatedUser: UserProfile = {
            ...existing,
            id: res.user?.id || existing.id,
            email: res.user?.email || email,
            name: (res.user?.user_metadata as any)?.name || existing.name || email.split('@')[0],
          };

          storage.saveUser(updatedUser);
          setSuccessMsg('Welcome back!');
          setTimeout(() => {
            onAuthSuccess(updatedUser);
            onClose();
          }, 600);
        }
      } else {
        // Local / Offline Auth Mode (fallback when Supabase keys not in .env)
        const currentUser = storage.getUser();
        const updatedUser: UserProfile = {
          ...currentUser,
          id: `usr_${Date.now()}`,
          name: mode === 'signup' ? name || 'Student' : currentUser.name || email.split('@')[0],
          email: email,
          grade: mode === 'signup' ? grade : currentUser.grade,
          goals: mode === 'signup' ? goals : currentUser.goals,
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || email)}`,
        };

        storage.saveUser(updatedUser);
        setSuccessMsg(mode === 'signup' ? 'Profile saved! Enjoy full access.' : 'Signed in!');
        setTimeout(() => {
          onAuthSuccess(updatedUser);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    if (hasSupabase) {
      const res = await supabaseSignInWithGoogle();
      if (res.error) {
        setErrorMsg(res.error);
      }
    } else {
      // Local demo Google login
      const googleUser: UserProfile = {
        ...storage.getUser(),
        id: `usr_google_${Date.now()}`,
        name: 'Alex Rivera',
        email: 'alex.rivera@gmail.com',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      };
      storage.saveUser(googleUser);
      onAuthSuccess(googleUser);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0f1424] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
        {/* Glow Header */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-purple-500/20 blur-3xl pointer-events-none" />

        {/* Modal Top Bar */}
        <div className="p-5 pb-3 flex items-center justify-between relative border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                Buddy AI <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              </h2>
              <p className="text-[11px] text-slate-400">Your AI Study Coach & Companion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Trigger Banner (if prompted by trial limit or locked feature) */}
        {triggerReason && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-xs text-purple-200 leading-snug font-medium">
              {triggerReason}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 pt-4 space-y-4">
          {/* Mode Switch Tabs */}
          <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Your Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Grade / Level</label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <select
                      value={grade}
                      onChange={e => setGrade(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      <option value="Middle School">Middle School (6th - 8th)</option>
                      <option value="High School">High School (9th - 12th)</option>
                      <option value="College / University">College / University</option>
                      <option value="Graduate / Professional">Graduate / Professional</option>
                      <option value="Self-Taught / Lifelong Learner">Self-Taught / Lifelong Learner</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Processing...' : mode === 'signup' ? 'Create Free Account' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-2 text-slate-600 text-xs my-2">
            <div className="flex-1 h-px bg-slate-800" />
            <span>or</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Google Auth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Value props */}
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span>Long-Term Memory</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>Study Streak Heatmap</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Live Spoken Voice</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Supabase Cloud Sync</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
