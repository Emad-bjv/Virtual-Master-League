import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, MessageSquare, Ban } from 'lucide-react';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

const REJECT_QUICK_CHIPS = [
  '🚫 این بازیکن غیرقابل فروش است',
  '💸 مبلغ پیشنهادی بسیار پایین است',
  '🔄 فقط در ازای معاوضه بازیکن واگذار می‌شود',
  '🏟️ به این بازیکن برای بازی‌های حساس لیگ نیاز داریم',
  '🤝 با باشگاه دیگری در حال مذاکره نهایی هستیم',
];

export default function RejectOfferModal({
  isOpen,
  offer,
  isCancelOutgoing = false,
  isLoading = false,
  onClose,
  onConfirm,
}) {
  useBodyScrollLock(isOpen);
  const [reason, setReason] = useState('');

  // Reset reason when modal re-opens
  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen || !offer) return null;

  const handleChipClick = (chip) => {
    setReason((prev) => {
      if (!prev) return chip;
      if (prev.includes(chip)) return prev;
      const combined = `${prev} - ${chip}`;
      return combined.length <= 200 ? combined : prev;
    });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (onConfirm) {
      onConfirm((reason || '').trim());
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto font-sans dir-rtl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative z-10 w-full max-w-md my-auto bg-gradient-to-b from-[#101726] via-[#0c121e] to-[#080c14] border border-rose-500/40 rounded-3xl p-5 shadow-[0_0_35px_rgba(244,63,94,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                  {isCancelOutgoing ? <Ban size={18} /> : <AlertTriangle size={18} />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {isCancelOutgoing ? 'لغو پیشنهاد ارسالی' : 'رد پیشنهاد نقل‌وانتقال'}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-sport">
                    {isCancelOutgoing
                      ? 'لغو درخواست خرید پیش از پاسخ حریف'
                      : `بازیکن: ${offer.target_player_name || 'بازیکن'}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Offer Summary snippet */}
            <div className="my-3.5 p-3 rounded-2xl bg-[#05080e]/90 border border-slate-800 text-xs font-sport space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>طرف معامله:</span>
                <span className="text-white font-bold font-sans">
                  {isCancelOutgoing
                    ? offer.receiver_team_name || 'تیم مقصد'
                    : offer.sender_team_name || 'تیم پیشنهاددهنده'}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>مبلغ پیشنهادی:</span>
                <span className="text-[#00ff87] font-black font-mono dir-ltr">
                  ${Number(offer.cash_amount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              {/* If rejecting, allow reason with chips */}
              {!isCancelOutgoing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold flex items-center gap-1.5 text-xs">
                      <MessageSquare size={13} className="text-rose-400" />
                      <span>علت یا یادداشت رد پیشنهاد (اختیاری):</span>
                    </label>
                    <span className={`text-[10px] font-mono ${reason.length > 180 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {reason.length} / 200
                    </span>
                  </div>

                  {/* Quick Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {REJECT_QUICK_CHIPS.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleChipClick(chip)}
                        className="text-[10px] bg-[#05080e] hover:bg-rose-950/70 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 px-2 py-1 rounded-lg transition-all cursor-pointer select-none"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value.slice(0, 200))}
                    rows={2}
                    maxLength={200}
                    placeholder="می‌توانید دلیل رد را برای مربی مقابل بنویسید (مثلاً: قیمت بسیار کم است یا فقط معاوضه می‌کنم)..."
                    className="w-full bg-[#05080e] border border-slate-700/80 rounded-2xl p-2.5 text-white placeholder-slate-500 text-xs outline-none focus:border-rose-500 resize-none transition-colors"
                  />
                </div>
              )}

              {isCancelOutgoing && (
                <p className="text-xs text-slate-300 leading-relaxed">
                  آیا از لغو این پیشنهاد ارسالی برای «<strong className="text-white">{offer.target_player_name}</strong>» اطمینان دارید؟
                </p>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2 font-sport">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  بازگشت
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs"
                >
                  {isLoading ? (
                    <span>در حال انجام...</span>
                  ) : (
                    <span>{isCancelOutgoing ? 'بله، لغو پیشنهاد' : 'رد قطعی پیشنهاد'}</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
