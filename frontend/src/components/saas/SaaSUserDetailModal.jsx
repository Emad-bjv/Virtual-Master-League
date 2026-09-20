import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  X, ShieldCheck, Mail, Building, CreditCard, Calendar, 
  Clock, Zap, CheckCircle2, AlertTriangle, ExternalLink, Activity
} from 'lucide-react';

export default function SaaSUserDetailModal({ customer, onClose }) {
  if (!customer) return null;

  return (
    typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          {/* Backdrop Click */}
          <div className="fixed inset-0" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-2xl my-auto rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <img
                  src={customer.avatar}
                  alt={customer.name}
                  className="h-14 w-14 rounded-2xl object-cover ring-2 ring-indigo-500/50 shadow-lg"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{customer.name}</h3>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                      {customer.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">{customer.email} • {customer.company}</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body: Grid Metrics */}
            <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Current Spend</span>
                <p className="mt-1 text-base font-extrabold text-emerald-400 font-mono">${customer.mrr.toLocaleString()} / mo</p>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Provisioned Seats</span>
                <p className="mt-1 text-base font-extrabold text-indigo-400 font-mono">{customer.seats} Seats</p>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Plan Tier</span>
                <p className="mt-1 text-base font-extrabold text-purple-400 truncate">{customer.plan}</p>
              </div>
            </div>

            {/* Detailed Metadata Rows */}
            <div className="mt-5 space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 text-xs">
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Account ID:</span>
                <span className="font-mono text-slate-200">{customer.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Billing Interval:</span>
                <span className="font-semibold text-slate-200">{customer.billingCycle}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Account Tenure:</span>
                <span className="text-slate-200">Joined {customer.joinDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Telemetry Active:</span>
                <span className="text-cyan-400 font-medium">{customer.lastActive}</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all"
              >
                Close Drawer
              </button>

              <div className="flex items-center gap-2">
                <button className="rounded-xl border border-indigo-500/30 bg-indigo-600/20 px-4 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 transition-all">
                  Edit Plan & Limits
                </button>
                <button className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all">
                  Send Direct Message
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>,
      document.body
    )
  );
}
