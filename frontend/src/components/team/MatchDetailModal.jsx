import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Activity, BarChart2, Shield } from 'lucide-react';
import { matchApi } from '../../services/api';

export default function MatchDetailModal({ matchId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!matchId) return;
    setLoading(true);
    setError(null);
    matchApi
      .getMatchDetail(matchId)
      .then((res) => {
        setDetail(res.data);
      })
      .catch((err) => {
        setError('خطا در دریافت جزئیات مسابقه');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [matchId]);

  if (!matchId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass-panel w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-cyan-500/40 p-6 text-white text-right space-y-6 shadow-2xl relative"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          <h2 className="text-lg font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Activity className="text-cyan-400" size={20} />
            <span>جزئیات و آمار مسابقه</span>
          </h2>

          {loading && (
            <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
              در حال بارگذاری آمار بازی...
            </div>
          )}

          {error && (
            <div className="py-8 text-center text-rose-400 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && detail && (
            <div className="space-y-6">
              {/* Scoreboard Banner */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center space-y-2">
                <div className="text-[11px] text-slate-400 font-medium">
                  {detail.round_name || 'مسابقه لیگ'}
                </div>
                <div className="flex items-center justify-center gap-6 my-2">
                  <span className="font-black text-lg text-white w-2/5 text-left">
                    {detail.home_team_name}
                  </span>
                  <div className="bg-slate-950 px-4 py-1.5 rounded-xl border border-cyan-500/40 text-cyan-400 font-mono font-black text-xl shadow-lg">
                    {detail.home_score} - {detail.away_score}
                  </div>
                  <span className="font-black text-lg text-white w-2/5 text-right">
                    {detail.away_team_name}
                  </span>
                </div>
                <span className="inline-block text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/30 px-3 py-0.5 rounded-full">
                  {detail.status === 'FINISHED' ? 'پایان یافته' : detail.status}
                </span>
              </div>

              {/* Team Stats Comparison */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                  <BarChart2 size={16} />
                  <span>آمار تیمی (Team Statistics)</span>
                </h3>

                {detail.team_stats && detail.team_stats.length > 0 ? (
                  <div className="space-y-2 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 text-xs">
                    {detail.team_stats.map((stat) => (
                      <div key={stat.id} className="border-b border-slate-800/60 pb-2 mb-2 last:border-none last:pb-0 last:mb-0">
                        <span className="font-bold text-amber-400 block mb-1">
                          تیم {stat.team_name}
                        </span>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center text-[11px]">
                          <div className="bg-slate-950 p-2 rounded-xl">
                            <span className="text-slate-400 block text-[10px]">مالکیت</span>
                            <span className="font-bold text-white">{stat.possession_percent}%</span>
                          </div>
                          <div className="bg-slate-950 p-2 rounded-xl">
                            <span className="text-slate-400 block text-[10px]">شوت</span>
                            <span className="font-bold text-white">{stat.shots}</span>
                          </div>
                          <div className="bg-slate-950 p-2 rounded-xl">
                            <span className="text-slate-400 block text-[10px]">در چارچوب</span>
                            <span className="font-bold text-white">{stat.shots_on_target}</span>
                          </div>
                          <div className="bg-slate-950 p-2 rounded-xl">
                            <span className="text-slate-400 block text-[10px]">کرنر</span>
                            <span className="font-bold text-white">{stat.corners}</span>
                          </div>
                          <div className="bg-slate-950 p-2 rounded-xl">
                            <span className="text-slate-400 block text-[10px]">خطا</span>
                            <span className="font-bold text-white">{stat.fouls}</span>
                          </div>
                          <div className="bg-slate-950 p-2 rounded-xl">
                            <span className="text-slate-400 block text-[10px]">آفساید</span>
                            <span className="font-bold text-white">{stat.offsides}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-900/40 rounded-2xl text-center text-slate-500 text-xs border border-slate-800">
                    آمار تیمی تفکیکی برای این بازی هنوز ثبت نشده است.
                  </div>
                )}
              </div>

              {/* Player Ratings */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-purple-300 flex items-center gap-2">
                  <Award size={16} />
                  <span>نمرات بازیکنان (Player Ratings)</span>
                </h3>

                {detail.player_stats && detail.player_stats.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {detail.player_stats.map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-800"
                      >
                        <div>
                          <span className="font-bold text-white block">
                            {p.player_name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            پست: {p.player_position || '-'} | دقایق: {p.minutes_played}'
                          </span>
                        </div>
                        <span className="font-mono font-black text-sm text-cyan-400 bg-cyan-950 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                          {p.rating ? p.rating.toFixed(1) : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-900/40 rounded-2xl text-center text-slate-500 text-xs border border-slate-800">
                    نمرات بازیکنان برای این مسابقه هنوز ثبت نشده است.
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
