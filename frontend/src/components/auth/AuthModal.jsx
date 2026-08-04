import React, { useState } from 'react';
import { X, LogIn, UserPlus, Disc as DiscordIcon, Mail, ShieldCheck, UserCheck, ShieldAlert, User, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthModal({ isOpen, onClose, onLoginSuccess, isRequired = false }) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('coach'); // 'coach' | 'admin' | 'guest'
  const [username, setUsername] = useState('coach@masterleague.ir');
  const [password, setPassword] = useState('••••••••');
  const [clubName, setClubName] = useState('باشگاه البرز');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setErrorMessage('');
    if (selectedRole === 'admin') {
      setUsername('admin');
      setPassword('admin');
    } else if (selectedRole === 'coach') {
      setUsername('coach@masterleague.ir');
      setPassword('••••••••');
    } else {
      setUsername('guest@masterleague.ir');
      setPassword('••••••••');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Admin Credentials Gate: username === 'admin' && password === 'admin'
    if (role === 'admin') {
      if (username.trim() !== 'admin' || password.trim() !== 'admin') {
        setErrorMessage('نام کاربری یا رمز عبور ادمین نادرست است! (نام کاربری: admin | رمز عبور: admin)');
        return;
      }
    }

    onLoginSuccess({
      email: username,
      role,
      clubName: role === 'guest' ? 'تماشاگر عمومی' : (clubName || 'باشگاه البرز'),
      coachName: role === 'guest' ? 'کاربر مهمان' : (isLogin ? 'امید رضایی' : 'مربی جدید'),
      isAdminAccess: role === 'admin',
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg font-sans dir-rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md glass-panel border border-slate-700/80 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden"
        >
          {/* Cyber glowing background ambient light */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-cyan-600/30 rounded-full blur-3xl pointer-events-none"></div>

          {/* Close button (Hidden if login is mandatory/required) */}
          {!isRequired && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-5">
            <div className="inline-flex p-3 bg-purple-900/30 border border-purple-500/30 rounded-2xl text-purple-400 mb-2 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-xl font-black text-white">
              {isLogin ? 'ورود به سیستم مستر لیگ' : 'ثبت‌نام مربی جدید'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              لطفاً برای دسترسی به سامانه ابتدا وارد حساب کاربری خود شوید
            </p>
          </div>

          {/* Error notification */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 text-xs text-rose-300 bg-rose-950/80 p-3 rounded-xl border border-rose-500/40 flex items-center gap-2 shadow-lg"
            >
              <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Role Selection Selector Tabs */}
          <div className="grid grid-cols-3 gap-2 mb-5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => handleRoleSelect('coach')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-bold transition-all ${
                role === 'coach'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck size={14} />
              <span>مربی</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('admin')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-bold transition-all ${
                role === 'admin'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert size={14} />
              <span>ادمین</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('guest')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-bold transition-all ${
                role === 'guest'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User size={14} />
              <span>عمومی</span>
            </button>
          </div>

          {/* Social Auth Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => {
                onLoginSuccess({ role: 'coach', clubName: 'باشگاه البرز', coachName: 'کاربر دیسکورد' });
                onClose();
              }}
              className="flex items-center justify-center gap-2 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition-all"
            >
              <DiscordIcon size={16} className="text-[#5865F2]" />
              <span>دیسکورد</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onLoginSuccess({ role: 'coach', clubName: 'باشگاه البرز', coachName: 'کاربر گوگل' });
                onClose();
              }}
              className="flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition-all"
            >
              <Mail size={16} className="text-rose-400" />
              <span>گوگل</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center mb-4">
            <div className="border-t border-slate-800 w-full"></div>
            <span className="bg-slate-900 px-3 text-[11px] text-slate-500 font-medium">ورود مستقیم با نام کاربری</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!isLogin && role === 'coach' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">نام باشگاه شما</label>
                <input
                  type="text"
                  required
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="مثلا: باشگاه البرز"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {role === 'admin' ? 'نام کاربری ادمین' : role === 'guest' ? 'ایمیل / نام کاربری عمومی' : 'ایمیل مربی'}
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={role === 'admin' ? 'admin' : 'user@masterleague.ir'}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">رمز عبور</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={role === 'admin' ? 'admin' : '••••••••'}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              className={`w-full mt-2 flex items-center justify-center gap-2 text-xs font-bold py-3 px-4 rounded-xl shadow-lg transition-all active:scale-98 ${
                role === 'admin'
                  ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white shadow-rose-600/30'
                  : role === 'guest'
                  ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-emerald-600/30'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-purple-600/30'
              }`}
            >
              {isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
              <span>
                {isLogin
                  ? `ورود به‌عنوان ${role === 'admin' ? 'ادمین ارشد' : role === 'guest' ? 'کاربر عمومی' : 'مربی باشگاه'}`
                  : 'ایجاد حساب کاربری جدید'}
              </span>
            </button>
          </form>

          {/* Toggle between login/register */}
          <div className="text-center mt-4">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {isLogin ? 'حساب کاربری ندارید؟ ثبت‌نام کنید' : 'قبلاً ثبت‌نام کرده‌اید؟ وارد شوید'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
