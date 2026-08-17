import React, { useState, useEffect } from 'react';
import { Search, Eye, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { transferApi } from '../../services/api';
import { getTeamLogoUrl } from '../../utils/teamLogos';

export default function LeagueDirectory({ currentTeamId, onPlayerSelect }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    transferApi.getLeagueTeams()
      .then(res => setTeams(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredTeams = teams.filter(t => t.id !== currentTeamId && t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) {
    return <div className="text-center py-10 text-cyan-400">در حال بارگذاری لیست تیم‌ها...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <input 
          type="text" 
          placeholder="جستجوی تیم..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-10 text-white outline-none focus:border-cyan-500 transition-colors text-sm"
        />
        <Search className="absolute right-3 top-3 text-slate-400" size={16} />
      </div>

      <div className="space-y-2">
        {filteredTeams.map(team => (
          <div key={team.id} className="glass-panel border border-slate-800 rounded-2xl overflow-hidden">
            <div 
              className="p-3 bg-slate-900/60 flex items-center justify-between cursor-pointer hover:bg-slate-800/80 transition-colors"
              onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl team-crest-badge flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-md">
                  {getTeamLogoUrl(team) ? (
                    <img src={getTeamLogoUrl(team)} alt={team.name} className="w-full h-full object-contain" />
                  ) : (
                    <Users size={16} className="text-slate-800" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-white block">{team.name}</span>
                  <span className="text-[10px] text-slate-400">تعداد بازیکن: {team.players?.length || 0}</span>
                </div>
              </div>
              <span className="text-xs text-amber-400 font-mono">بودجه: {Number(team.budget).toLocaleString('fa-IR')} $</span>
            </div>
            
            <AnimatePresence>
              {expandedTeamId === team.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3 pb-3 border-t border-slate-800/50"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {(team.players || []).map(player => (
                      <div 
                        key={player.id} 
                        className="flex items-center justify-between bg-slate-950/40 p-2 rounded-xl border border-slate-800/50 hover:border-cyan-500/30 transition-colors"
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-200 block">{player.name}</span>
                          <span className="text-[10px] text-slate-400">{player.position} | OVR {player.overall} | دستمزد: {Number(player.wage).toLocaleString()} $</span>
                        </div>
                        <button 
                          onClick={() => onPlayerSelect(player, team)}
                          className="bg-indigo-600/20 text-indigo-400 p-1.5 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors"
                          title="مشاهده و ارائه پیشنهاد"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
