import React, { useState } from 'react';
import { X, LogIn, ShieldCheck, UserCheck, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

export default function AuthModal({ isOpen, onClose, onLoginSuccess, isRequired = false }) {
  const { quickLogin } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState('coach'); // 'coach' | 'admin'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSimpleLogin = async (roleToUse = selectedRole) => {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const userData = await quickLogin(roleToUse);
      
      if (onLoginSuccess) {
        onLoginSuccess(userData);
      }
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrorMessage('خطا در ورود به سیستم. لطفاً دوباره تلاش نمایید.');
    } finally {
      setIsSubmitting(false);
    }
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
          {/* Ambient lighting */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-cyan-600/30 rounded-full blur-3xl pointer-events-none"></div>

          {/* Close button */}
          {!isRequired && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-gradient-to-tr from-purple-600/30 to-cyan-500/30 border border-purple-500/40 rounded-2xl text-cyan-300 mb-3 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-2xl font-black text-white tracking-wide">
              ورود به سیستم مستر لیگ
            </h3>
            <p className="text-xs text-slate-400 mt-1.5">
              نقش کاربری خود را انتخاب کنید و بدون نیاز به پیامک وارد شوید
            </p>
          </div>

          {/* Error Message */}
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

          {/* Simple Role Selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setSelectedRole('coach')}
              className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between relative overflow-hidden ${
                selectedRole === 'coach'
                  ? 'bg-gradient-to-b from-purple-900/60 to-slate-900 border-purple-500/80 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <UserCheck size={24} className={selectedRole === 'coach' ? 'text-purple-400' : 'text-slate-500'} />
              <div className="mt-3">
                <span className="font-bold text-sm block">مربی تیم</span>
                <span className="text-[10.5px] text-slate-400 block mt-0.5">مدیریت ترکیب و تاکتیک</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('admin')}
              className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between relative overflow-hidden ${
                selectedRole === 'admin'
                  ? 'bg-gradient-to-b from-cyan-900/60 to-slate-900 border-cyan-500/80 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <ShieldAlert size={24} className={selectedRole === 'admin' ? 'text-cyan-400' : 'text-slate-500'} />
              <div className="mt-3">
                <span className="font-bold text-sm block">مدیر کل (Superadmin)</span>
                <span className="text-[10.5px] text-slate-400 block mt-0.5">مدیریت لیگ و تنظیمات</span>
              </div>
            </button>
          </div>

          {/* One-Click Login Button */}
          <button
            type="button"
            onClick={() => handleSimpleLogin(selectedRole)}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2.5 text-sm font-black py-4 px-6 rounded-2xl shadow-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white shadow-purple-600/30 transition-all active:scale-98 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Sparkles size={18} />
                <span>ورود سریع به بازی</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-slate-500 mt-4">
            ورود ساده ۱-کلیکی فعال است (سیستم پیامکی در این فاز غیرفعال شده است).
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
