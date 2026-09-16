import React, { useState } from 'react';
import { Trophy, Calendar, Sparkles } from 'lucide-react';
import LeagueStandingsTable from '../team/LeagueStandingsTable';
import { useLanguage } from '../../context/LanguageContext';

export default function LeagueTab({ teamData, initialSubTab = 'standings' }) {
  const { t, lang } = useLanguage();
  const [subTab, setSubTab] = useState(initialSubTab);

  return (
    <div className="space-y-4 pb-24 text-slate-100 max-w-md sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-1 sm:px-2">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-950 to-blue-950/60 border border-purple-500/40 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/60 flex items-center justify-center text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <Trophy size={24} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              {lang === 'fa' ? 'لیگ برتر مجازی (VML)' : 'Virtual Master League (VML)'}
            </h2>
            <p className="text-xs text-purple-300/80">
              {lang === 'fa' ? 'جدول رده‌بندی زنده، نتایج و وضعیت صعود و سقوط' : 'Live standings, qualification zones, and statistics'}
            </p>
          </div>
        </div>
      </div>

      {/* Standings Table */}
      <LeagueStandingsTable userTeamId={teamData?.id} />
    </div>
  );
}
