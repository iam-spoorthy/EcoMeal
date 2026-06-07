import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Mail, Lock, LogIn, ArrowRight } from 'lucide-react';

const Login = ({ onNavigateToRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await login(email, password);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4 relative overflow-hidden font-sans">
      
      {/* Animating Mesh Background Glows */}
      <div className="absolute -top-32 -left-32 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] animate-drift-1 pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px] animate-drift-2 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-purple-500/5 rounded-full blur-[180px] pointer-events-none"></div>

      {/* Main Glass Panel */}
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl shadow-2xl relative z-10 animate-fade-in border border-white/10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-brand-primary/10 rounded-xl mb-4 border border-brand-primary/20 shadow-inner">
            <Sparkles className="w-8 h-8 text-brand-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">
            EcoMeal
          </h1>
          <p className="text-gray-400 mt-2 text-xs font-medium uppercase tracking-wider">
            AI Kitchen Operations Console
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-brand-accent/10 border border-brand-accent/20 rounded-xl text-brand-accent text-xs font-semibold animate-shake">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email input field */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Staff Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <Mail className="w-4.5 h-4.5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter registered email"
                autoComplete="off"
                className="w-full bg-[#0a0f1e]/80 border border-dark-border text-white placeholder-gray-600 text-sm rounded-xl focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 pl-11 pr-4 py-3.5 transition-all duration-200 shadow-inner"
              />
            </div>
          </div>

          {/* Password input field */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <Lock className="w-4.5 h-4.5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-[#0a0f1e]/80 border border-dark-border text-white placeholder-gray-600 text-sm rounded-xl focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 pl-11 pr-4 py-3.5 transition-all duration-200 shadow-inner"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center bg-brand-primary hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl py-4 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-brand-primary/15 btn-glow-green cursor-pointer"
          >
            {loading ? (
              <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span>
            ) : (
              <>
                <LogIn className="w-4.5 h-4.5 mr-2" />
                Sign In to Console
              </>
            )}
          </button>
        </form>

        {/* Navigation prompt to registration */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">
            Need staff credentials?{' '}
            <button
              onClick={onNavigateToRegister}
              className="text-brand-primary hover:underline font-bold inline-flex items-center ml-1"
            >
              Register Account
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </p>
        </div>

        {/* Demo credentials helper card */}
        <div className="mt-8 pt-6 border-t border-white/5 text-left">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Verification Guidance</h4>
          <p className="text-[10px] text-gray-400 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
            🔑 **Domain Rules**: Admin requires email ending in `@admin.com` (e.g. `alex@admin.com`). Kitchen Manager requires `@manager.com` (e.g. `dan@manager.com`). Staff accepts any domain (e.g. `sam@gmail.com`).
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
