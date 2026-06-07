import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, User, Mail, Lock, UserPlus, ArrowLeft } from 'lucide-react';

const Register = ({ onNavigateToLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !role) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }

    // Role-based email domain validation
    if (role === 'admin' && !email.toLowerCase().endsWith('@admin.com')) {
      setErrorMsg('Admin accounts must register with an email ending in @admin.com (e.g., user@admin.com).');
      return;
    }

    if (role === 'kitchen_manager' && !email.toLowerCase().endsWith('@manager.com')) {
      setErrorMsg('Kitchen Manager accounts must register with an email ending in @manager.com (e.g., user@manager.com).');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await register(name, email, password, role);
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Try a different email.');
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
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-brand-primary/10 rounded-xl mb-3 border border-brand-primary/20 shadow-inner">
            <Sparkles className="w-7 h-7 text-brand-primary animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">
            Join EcoMeal
          </h1>
          <p className="text-gray-400 mt-1.5 text-xs font-semibold uppercase tracking-wider">
            Register Staff Account
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-4 bg-brand-accent/10 border border-brand-accent/20 rounded-xl text-brand-accent text-xs font-semibold animate-shake">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name input */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Chef Antonio"
                autoComplete="off"
                className="w-full bg-[#0a0f1e]/80 border border-dark-border text-white placeholder-gray-600 text-sm rounded-xl focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 pl-10 pr-4 py-3 transition-colors duration-200 shadow-inner"
              />
            </div>
          </div>

          {/* Email input */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="chef@admin.com, chef@manager.com"
                autoComplete="off"
                className="w-full bg-[#0a0f1e]/80 border border-dark-border text-white placeholder-gray-600 text-sm rounded-xl focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 pl-10 pr-4 py-3 transition-colors duration-200 shadow-inner"
              />
            </div>
            {/* Dynamic helper notification for domain requirements */}
            {role === 'admin' && (
              <p className="text-[10px] text-brand-warning mt-1.5 animate-pulse font-medium">
                ⚠️ Admin role requires email to end with <b>@admin.com</b>
              </p>
            )}
            {role === 'kitchen_manager' && (
              <p className="text-[10px] text-brand-warning mt-1.5 animate-pulse font-medium">
                ⚠️ Manager role requires email to end with <b>@manager.com</b>
              </p>
            )}
            {role === 'staff' && (
              <p className="text-[10px] text-emerald-400 mt-1.5 font-medium">
                ✓ Staff role supports standard emails (e.g. gmail, yahoo)
              </p>
            )}
          </div>

          {/* Password input */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                className="w-full bg-[#0a0f1e]/80 border border-dark-border text-white placeholder-gray-600 text-sm rounded-xl focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 pl-10 pr-4 py-3 transition-colors duration-200 shadow-inner"
              />
            </div>
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Access Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#0a0f1e]/80 border border-dark-border text-white text-sm rounded-xl focus:outline-none focus:border-brand-primary px-3 py-3 transition-colors duration-200 cursor-pointer shadow-inner"
            >
              <option value="staff">Staff (View Dashboard Stats)</option>
              <option value="kitchen_manager">Kitchen Manager (Update Inventory)</option>
              <option value="admin">Admin (Full Control - Edit/Delete)</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 inline-flex items-center justify-center bg-brand-primary hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl py-3.5 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-brand-primary/15 btn-glow-green cursor-pointer"
          >
            {loading ? (
              <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span>
            ) : (
              <>
                <UserPlus className="w-5 h-5 mr-2" />
                Create Staff Account
              </>
            )}
          </button>
        </form>

        {/* Navigation prompt to Login */}
        <div className="text-center mt-5">
          <button
            onClick={onNavigateToLogin}
            className="text-gray-400 hover:text-white text-xs font-bold inline-flex items-center transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;
