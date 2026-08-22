import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, ArrowRight, ArrowLeft
} from 'lucide-react';
import { matchApi } from '../../services/api';
import PostMatchComparisonCard from '../admin/PostMatchComparisonCard';

export default function MatchSummaryView({ 
  match, 
  onBack, 
  onNavigateMatch 
}) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!match?.id) return;
    setLoading(true);
    setError(null);
    matchApi
      .getMatchDetail(match.id)
      .then((res) => {
        setDetail(res.data);
      })
      .catch((err) => {
        setError('خطا در دریافت خلاصه آمار مسابقه');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [match?.id]);

  if (!match) return null;

  return (
    <div className="space-y-4 select-none">
      {/* Top Navigation Bar */}
      <div className="fc-card p-4 sm:p-5 rounded-3xl border border-slate-700/60 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-black transition-all flex items-center gap-1 font-sport cursor-pointer shadow active:scale-95"
            >
              <ArrowRight size={14} />
              <span>بازگشت به تقویم مسابقات</span>
            </button>

            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 tracking-tight">
                <Activity className="text-[#00ff87]" size={19} />
                <span>خلاصه آمار و عملکرد {match.round_name || 'مسابقه'}</span>
              </h2>
              <span className="text-[11px] text-slate-400">
                این مسابقه به پایان رسیده است — نتیجه نهایی و آمار مقایسه‌ای ثبت‌شده توسط ادمین در زیر نمایش داده شده است.
              </span>
            </div>
          </div>

          {/* Gameweek Stepper Controls */}
          {onNavigateMatch && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => onNavigateMatch(-1)}
                className="px-3 py-1.5 rounded-xl bg-[#080c14]/90 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 text-xs font-black transition-all flex items-center gap-1 font-sport cursor-pointer shadow active:scale-95"
                title="مسابقه قبلی"
              >
                <ArrowRight size={13} />
                <span>هفته قبل</span>
              </button>
              <button
                onClick={() => onNavigateMatch(1)}
                className="px-3 py-1.5 rounded-xl bg-[#080c14]/90 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 text-xs font-black transition-all flex items-center gap-1 font-sport cursor-pointer shadow active:scale-95"
                title="مسابقه بعدی"
              >
                <span>هفته بعد</span>
                <ArrowLeft size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="fc-card p-12 rounded-3xl border border-slate-700/60 text-center text-slate-400 text-sm animate-pulse space-y-2">
          <Activity className="animate-spin mx-auto text-cyan-400" size={24} />
          <p>در حال دریافت اطلاعات و آمار مسابقه...</p>
        </div>
      )}

      {error && (
        <div className="fc-card p-8 rounded-3xl border border-rose-500/40 text-center text-rose-400 text-xs">
          {error}
        </div>
      )}

      {!loading && !error && detail && (
        <PostMatchComparisonCard
          match={detail}
          teamStats={detail.team_stats}
          playerStats={detail.player_stats || []}
        />
      )}
    </div>
  );
}
