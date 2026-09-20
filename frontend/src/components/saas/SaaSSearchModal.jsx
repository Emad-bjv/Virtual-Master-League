import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Search, X, Command, LayoutDashboard, BarChart3, Users, 
  CreditCard, ShieldAlert, ArrowRight, Zap, Sparkles
} from 'lucide-react';

export default function SaaSSearchModal({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('');

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickLinks = [
    { label: 'Executive Dashboard Hub', id: 'overview', category: 'Navigation', icon: LayoutDashboard },
    { label: 'Revenue Analytics & Funnel', id: 'analytics', category: 'Analytics', icon: BarChart3 },
    { label: 'Subscribers & User Accounts', id: 'customers', category: 'Users', icon: Users },
    { label: 'Billing & API Quotas', id: 'billing', category: 'Finance', icon: CreditCard },
    { label: 'Audit Logs & Webhooks', id: 'audit', category: 'Security', icon: ShieldAlert }
  ];

  const filteredLinks = (quickLinks || []).filter(l => 
    String(l.label || '').toLowerCase().includes(query.toLowerCase()) ||
    String(l.category || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          {/* Backdrop Click */}
          <div className="fixed inset-0" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950 p-4 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="relative flex items-center border-b border-slate-800 pb-3">
              <Search className="h-5 w-5 text-indigo-400 ml-2 mr-3" />
              <input
                type="text"
                autoFocus
                placeholder="Type a command, search metrics, or jump to view..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-800 bg-slate-900 p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="mt-3 space-y-1 max-h-80 overflow-y-auto">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Quick Navigation & Commands
              </p>

              {filteredLinks.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No commands matching "{query}"
                </div>
              ) : (
                filteredLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onClose();
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[9px] font-mono text-slate-400">
                          {item.category}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-500 font-mono">
              <div className="flex items-center gap-2">
                <span>Use <kbd className="rounded bg-slate-900 px-1 py-0.5 border border-slate-800">↑</kbd> <kbd className="rounded bg-slate-900 px-1 py-0.5 border border-slate-800">↓</kbd> to navigate</span>
                <span><kbd className="rounded bg-slate-900 px-1 py-0.5 border border-slate-800">ESC</kbd> to exit</span>
              </div>
              <span className="text-indigo-400">UI UX Pro Max Dashboard</span>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>,
      document.body
    )
  );
}
