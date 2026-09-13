import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowLeft, Gift } from 'lucide-react';
import { gachaApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PackOpeningModal from '../store/PackOpeningModal';

export default function PendingPackBanner({ onSessionChanged }) {
  const { isAuthenticated } = useAuth();
  const [pendingSession, setPendingSession] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchActiveSession = useCallback(async () => {
    if (!isAuthenticated) {
      setPendingSession(null);
      return;
    }
    try {
      setLoading(true);
      const res = await gachaApi.getActiveSession();
      if (res.data?.has_active_session && res.data.session_id) {
        setPendingSession(res.data);
        if (onSessionChanged) onSessionChanged(res.data);
      } else {
        setPendingSession(null);
        if (onSessionChanged) onSessionChanged(null);
      }
    } catch {
      // quiet fallback
      setPendingSession(null);
      if (onSessionChanged) onSessionChanged(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, onSessionChanged]);

  useEffect(() => {
    fetchActiveSession();

    const handleRefresh = () => fetchActiveSession();
    window.addEventListener('vml_pack_completed', handleRefresh);
    window.addEventListener('vml_pack_opened', handleRefresh);
    window.addEventListener('vml_team_updated', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    return () => {
      window.removeEventListener('vml_pack_completed', handleRefresh);
      window.removeEventListener('vml_pack_opened', handleRefresh);
      window.removeEventListener('vml_team_updated', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [fetchActiveSession]);

  if (!pendingSession || !pendingSession.has_active_session) {
    return null;
  }

  const packName = pendingSession.pack?.name || 'پک شانس';

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
          className="w-full px-3 sm:px-5 md:px-6 pt-3 pb-1"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/80 via-yellow-950/70 to-slate-950/90 border border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.25)] p-3 sm:p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 backdrop-blur-md">
            {/* Ambient Background Sheen */}
            <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
            
            {/* Left/Main Description & Icon */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(251,191,36,0.35)]">
                <Gift className="text-amber-400 animate-bounce" size={22} />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] uppercase font-sport tracking-wider">
                    انتخاب معلق
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-amber-200 truncate font-sport">
                    کارت‌های پک «{packName}» منتظر شما هستند!
                  </h4>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 line-clamp-1">
                  پک قبلی شما باز شده است. لطفاً بازیکن مورد نظر خود را انتخاب و به ترکیب اضافه فرمایید.
                </p>
              </div>
            </div>

            {/* Right Action Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs font-sport shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95"
            >
              <Sparkles size={16} />
              <span>تکمیل انتخاب بازیکن</span>
              <ArrowLeft size={16} className="rtl:rotate-0 ltr:rotate-180" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Direct Modal for Claiming */}
      {isModalOpen && pendingSession.pack && (
        <PackOpeningModal
          pack={pendingSession.pack}
          isOpen={isModalOpen}
          initialSessionData={pendingSession}
          onClose={() => setIsModalOpen(false)}
          onPlayerClaimed={() => {
            setIsModalOpen(false);
            fetchActiveSession();
          }}
        />
      )}
    </>
  );
}
