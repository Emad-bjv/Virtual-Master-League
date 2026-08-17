import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Tv, Radio, Activity, CheckCircle2, Sliders, X, Shield, Clock, Timer, Lock, Info, Play, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EFootballGamePlan from '../team/EFootballGamePlan';
import LiveMatchStandby from './LiveMatchStandby';
import { matchApi, teamApi } from '../../services/api';
import CustomSelect from '../common/CustomSelect';
import { TACTICAL_GUIDES } from '../team/TeamTab';
import notificationSoundService from '../../services/notificationSound';
import { getTeamLogoUrl } from '../../utils/teamLogos';

export default function LiveStreamTab({
  liveStreamUrl,
  liveEvents = [],
  onAddEvent,
  currentMatchStatus,
  onMatchStatusChange,
  teamData,
  initialPlayers = [],
  userRole = 'coach',
  onOpenAdminControl,
}) {
  // Time-gated state
  const [liveContext, setLiveContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [isStandbyBypassed, setIsStandbyBypassed] = useState(false);

  // Active Match State
  const [activeMatch, setActiveMatch] = useState(null);
  const [events, setEvents] = useState(liveEvents);
  const [matchState, setMatchState] = useState(currentMatchStatus || 'FIRST_HALF');
  const [halfTimeSeconds, setHalfTimeSeconds] = useState(30);
  const [subsCount, setSubsCount] = useState(0);
  const [saveToast, setSaveToast] = useState('');
  const [stoppageTime, setStoppageTime] = useState(0);
  const [matchTelemetryStats, setMatchTelemetryStats] = useState([]);

  // Live Match Stopwatch Clock (MM:SS)
  const [matchMinutes, setMatchMinutes] = useState(14);
  const [matchSeconds, setMatchSeconds] = useState(25);
  const [isClockRunning, setIsClockRunning] = useState(true);
  
  // Tactical GamePlan State
  const [isTacticsExpanded, setIsTacticsExpanded] = useState(false);
  const [serverPlayers, setServerPlayers] = useState(null);
  const [serverFormation, setServerFormation] = useState(null);
  const [tacticTab, setTacticTab] = useState('attack');
  const [tactics, setTactics] = useState({
    attacking_style: 'بازی مالکانه',
    build_up: 'پاس کوتاه',
    attacking_area: 'مرکز',
    positioning: 'حفظ ترکیب',
    support_range: 7,
    defensive_style: 'فشار خط مقدم',
    containment_area: 'میانه',
    pressing: 'تهاجمی',
    defensive_line: 6,
    compactness: 5,
    adv_offense_1: 'تیکی تاکا',
    adv_offense_2: 'هیچکدام',
    adv_defense_1: 'خط دفاعی عمیق',
    adv_defense_2: 'هیچکدام',
  });

  const wsRef = useRef(null);
  const isAdmin = userRole === 'admin';

  // 1. Fetch Live Context (Time-gating & schedule enforcement)
  const fetchLiveContext = async () => {
    try {
      const res = await matchApi.getLiveMatchContext();
      setLiveContext(res.data);
      if (res.data?.has_active_match && res.data.active_match) {
        setActiveMatch(res.data.active_match);
        if (res.data.active_match.half_status) {
          setMatchState(res.data.active_match.half_status);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch live context:', err);
    } finally {
      setLoadingContext(false);
    }
  };

  useEffect(() => {
    fetchLiveContext();
    const interval = setInterval(fetchLiveContext, 10000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch Team Tactical GamePlan and Team's Matches
  const [teamNextMatch, setTeamNextMatch] = useState(null);

  useEffect(() => {
    if (teamData?.id) {
      // Fetch Team Gameplan
      teamApi.getGameplan(teamData.id).then((res) => {
        if (res.data) {
          if (res.data.team && res.data.team.players) {
            setServerPlayers(res.data.team.players);
          }
          if (res.data.gameplan) {
            if (res.data.gameplan.formation) setServerFormation(res.data.gameplan.formation);
            setTactics((prev) => ({
              ...prev,
              ...res.data.gameplan,
            }));
          }
        }
      }).catch((err) => console.log('Failed to fetch live gameplan', err));

      // Fetch Team Schedule to find the exact fixture & opponent details
      matchApi.getTeamSchedule(teamData.id).then((res) => {
        const matches = res.data || [];
        if (matches.length > 0) {
          // Look for LIVE match first, then SCHEDULED, or fallback to first match
          const currentM = matches.find((m) => m.status === 'LIVE') || matches.find((m) => m.status === 'SCHEDULED') || matches[0];
          
          const isHome = currentM.home_team === teamData.id;
          const resolvedOpponentName = isHome 
            ? (currentM.away_team_name || currentM.opponent_name || 'حریف مسابقه') 
            : (currentM.home_team_name || currentM.opponent_name || 'حریف مسابقه');
          const resolvedOpponentLogo = isHome 
            ? (currentM.away_team_logo || currentM.opponent_logo) 
            : (currentM.home_team_logo || currentM.opponent_logo);

          const formattedMatch = {
            id: currentM.id,
            home_team: currentM.home_team,
            away_team: currentM.away_team,
            home_team_name: isHome ? teamData.name : resolvedOpponentName,
            away_team_name: !isHome ? teamData.name : resolvedOpponentName,
            home_team_logo: isHome ? teamData.logo : resolvedOpponentLogo,
            away_team_logo: !isHome ? teamData.logo : resolvedOpponentLogo,
            home_score: currentM.home_score ?? 0,
            away_score: currentM.away_score ?? 0,
            round_name: currentM.round_name || 'هفته اول لیگ برتر',
            date: currentM.date,
            status: currentM.status,
            half_status: currentM.half_status,
            opponent_name: resolvedOpponentName,
            opponent_logo: resolvedOpponentLogo,
          };

          setTeamNextMatch(formattedMatch);

          if (currentM.status === 'LIVE' || !activeMatch) {
            setActiveMatch((prev) => prev || formattedMatch);
          }
        }
      }).catch((_e) => {});
    }
  }, [teamData?.id, teamData?.name, teamData?.logo]);

  // 3. Real-Time WebSocket Connection to Match Channel
  useEffect(() => {
    const matchId = activeMatch?.id || teamNextMatch?.id || liveContext?.active_match?.id || liveContext?.next_match?.id;
    if (!matchId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/match/${matchId}/`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.match) {
            setActiveMatch(data.match);
            if (data.match.stoppage_time !== undefined) {
              setStoppageTime(data.match.stoppage_time);
            }
            if (data.match.team_stats) {
              setMatchTelemetryStats(data.match.team_stats);
            }
          }

          if (data.type === 'match_status') {
            setMatchState(data.half_status || '1ST_HALF');
            if (onMatchStatusChange) onMatchStatusChange(data.half_status);
            notificationSoundService.playMatchAlertChime();
          } else if (data.type === 'half_time') {
            setMatchState('HALF_TIME');
            setHalfTimeSeconds(data.break_duration_seconds || 30);
            if (onMatchStatusChange) onMatchStatusChange('HALF_TIME');
            notificationSoundService.playMatchAlertChime();
          } else if (data.type === 'second_half_started') {
            setMatchState('2ND_HALF');
            if (onMatchStatusChange) onMatchStatusChange('2ND_HALF');
            notificationSoundService.playMatchAlertChime();
          } else if (data.type === 'match_finished') {
            setMatchState('FINISHED');
            if (onMatchStatusChange) onMatchStatusChange('FINISHED');
            notificationSoundService.playMatchAlertChime();
          } else if (data.type === 'stoppage_time_update') {
            setStoppageTime(data.stoppage_time || 0);
          } else if (data.type === 'clock_sync') {
            if (data.current_minute !== undefined) setMatchMinutes(data.current_minute);
            if (data.stoppage_time !== undefined) setStoppageTime(data.stoppage_time);
          }

          if (data.message || data.event || data.custom_text) {
            const ev = data.event;
            const evType = ev?.event_type || data.type;
            const icon = evType === 'GOAL' ? '⚽' 
              : evType === 'OWN_GOAL' ? '🤦‍♂️' 
              : evType === 'PENALTY_SCORED' ? '🎯'
              : evType === 'PENALTY_MISSED' ? '❌'
              : evType === 'YELLOW' ? '🟨'
              : evType === 'SECOND_YELLOW' ? '🟨🟥'
              : evType === 'RED' ? '🟥'
              : evType === 'SUB_IN' || data.type === 'substitution' ? '🔄'
              : evType === 'VAR' ? '🖥️'
              : '📢';

            const evText = data.custom_text || data.message || (ev ? `${ev.player_name}: ${ev.detail || ev.event_type_display || ev.event_type}` : 'رویداد زنده مسابقه');
            const newEv = {
              id: Date.now() + Math.random(),
              type: data.type || 'LIVE_EVENT',
              text: evText,
              team: ev?.player_team_name || data.team_name || 'سیستم داوری',
              icon: icon,
              minute: ev?.minute || matchMinutes,
              color: evType.includes('GOAL') 
                ? 'text-[#00ff87] border-emerald-500/40 bg-emerald-950/40' 
                : evType.includes('RED') || evType === 'SECOND_YELLOW'
                ? 'text-rose-400 border-rose-500/40 bg-rose-950/40'
                : evType === 'VAR'
                ? 'text-amber-300 border-amber-500/40 bg-amber-950/40'
                : 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
            };
            setEvents((prev) => [newEv, ...prev]);
            if (onAddEvent) onAddEvent(newEv);
          }

          // Update scores if provided
          if (data.home_score != null && data.away_score != null) {
            setActiveMatch((prev) => prev ? { ...prev, home_score: data.home_score, away_score: data.away_score } : prev);
          }
        } catch (_err) {
          // parse error
        }
      };

      ws.onerror = () => {
        // Fallback polling will handle updates
      };
    } catch (_err) {
      // ws unsupported or connect failed
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [activeMatch?.id, teamNextMatch?.id, liveContext?.active_match?.id, liveContext?.next_match?.id, onAddEvent, onMatchStatusChange, matchMinutes]);

  // 4. Reactive Polling Fallback (every 4s during live match)
  useEffect(() => {
    const matchId = activeMatch?.id || teamNextMatch?.id || liveContext?.active_match?.id;
    if (!matchId) return;

    const pollTimer = setInterval(async () => {
      try {
        const res = await matchApi.getMatchLiveState(matchId);
        if (res.data?.match) {
          setActiveMatch(res.data.match);
          if (res.data.match.half_status && res.data.match.half_status !== matchState) {
            setMatchState(res.data.match.half_status);
          }
        }
      } catch (_e) {
        // quiet fallback
      }
    }, 4000);

    return () => clearInterval(pollTimer);
  }, [activeMatch?.id, teamNextMatch?.id, liveContext?.active_match?.id, matchState]);

  // 5. Half-Time 30-Second Countdown Timer Logic
  useEffect(() => {
    let interval = null;
    if (matchState === 'HALF_TIME') {
      setHalfTimeSeconds(30);
      interval = setInterval(() => {
        setHalfTimeSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setMatchState('SECOND_HALF');
            if (onMatchStatusChange) onMatchStatusChange('SECOND_HALF');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [matchState, onMatchStatusChange]);

  // 6. Real-Time Active Match Clock (00:00 -> 90:00)
  useEffect(() => {
    if (matchState === 'FIRST_HALF' || matchState === '1ST_HALF') {
      setIsClockRunning(true);
      setMatchMinutes((prev) => (prev >= 45 ? 18 : Math.max(1, prev)));
    } else if (matchState === 'HALF_TIME') {
      setIsClockRunning(false);
      setMatchMinutes(45);
      setMatchSeconds(0);
    } else if (matchState === 'SECOND_HALF' || matchState === '2ND_HALF') {
      setIsClockRunning(true);
      setMatchMinutes((prev) => (prev < 45 ? 46 : prev));
    } else if (matchState === 'FINISHED') {
      setIsClockRunning(false);
      setMatchMinutes(90);
      setMatchSeconds(0);
    }
  }, [matchState]);

  useEffect(() => {
    if (!isClockRunning) return;

    const timer = setInterval(() => {
      setMatchSeconds((sec) => {
        if (sec >= 59) {
          setMatchMinutes((min) => {
            if ((matchState === 'FIRST_HALF' || matchState === '1ST_HALF') && min >= 45) {
              return 45;
            }
            if ((matchState === 'SECOND_HALF' || matchState === '2ND_HALF') && min >= 90) {
              return 90;
            }
            return min + 1;
          });
          return 0;
        }
        return sec + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isClockRunning, matchState]);

  const formattedMatchTimer = useMemo(() => {
    const mm = String(matchMinutes).padStart(2, '0');
    const ss = String(matchSeconds).padStart(2, '0');
    if (matchState === 'HALF_TIME') {
      return `HT 45:00 (${halfTimeSeconds}s)`;
    }
    if (matchState === 'FINISHED') {
      return 'FT 90:00';
    }
    if (stoppageTime > 0) {
      if (matchMinutes >= 45 && (matchState === 'FIRST_HALF' || matchState === '1ST_HALF')) {
        return `45'+${matchMinutes - 45}:${ss}`;
      }
      if (matchMinutes >= 90 && (matchState === 'SECOND_HALF' || matchState === '2ND_HALF')) {
        return `90'+${matchMinutes - 90}:${ss}`;
      }
    }
    return `${mm}:${ss}'`;
  }, [matchMinutes, matchSeconds, matchState, halfTimeSeconds, stoppageTime]);

  const homeStatsObj = useMemo(() => {
    const sList = matchTelemetryStats.length > 0 ? matchTelemetryStats : (activeMatch?.team_stats || []);
    return sList.find(s => s.team === activeMatch?.home_team) || {
      possession_percent: 50, shots: 0, shots_on_target: 0, fouls: 0, corners: 0, offsides: 0, saves: 0
    };
  }, [matchTelemetryStats, activeMatch?.team_stats, activeMatch?.home_team]);

  const awayStatsObj = useMemo(() => {
    const sList = matchTelemetryStats.length > 0 ? matchTelemetryStats : (activeMatch?.team_stats || []);
    return sList.find(s => s.team === activeMatch?.away_team) || {
      possession_percent: 50, shots: 0, shots_on_target: 0, fouls: 0, corners: 0, offsides: 0, saves: 0
    };
  }, [matchTelemetryStats, activeMatch?.team_stats, activeMatch?.away_team]);

  // Process initial players
  const players = useMemo(() => {
    const sourcePlayers = serverPlayers || initialPlayers;
    return sourcePlayers.map((p) => ({
      ...p,
      id: p.id.toString(),
      stamina: p.virtual_stamina || 90,
      status: p.is_injured ? 'مصدوم' : (p.virtual_stamina || 90) < 50 ? 'خسته' : 'سالم',
      trend: '▲',
      age: p.age || 26,
      consecutive_games: p.consecutive_games || 3,
      base_stamina: p.base_stamina || 80,
      position_group: p.position_group || 'CMF',
    }));
  }, [initialPlayers, serverPlayers]);

  const startingXi = useMemo(() => players.filter((p) => p.is_starting), [players]);
  const nonStarting = useMemo(() => players.filter((p) => !p.is_starting), [players]);
  const substitutes = useMemo(() => nonStarting.slice(0, 11), [nonStarting]);
  const reserves = useMemo(() => nonStarting.slice(11), [nonStarting]);
  const formation = serverFormation || teamData?.default_formation || '4-3-3 (4-2-1-3)';

  const aparatEmbedSrc = liveStreamUrl || "https://www.aparat.com/embed/live/VML.Emad";

  const handleSaveGamePlan = async (updatedPlan) => {
    const newSubsCount = Math.min(5, subsCount + 1);
    try {
      await matchApi.updateLiveTactics({
        formation: updatedPlan.currentFormation,
        subsUsed: newSubsCount,
        startingXi: updatedPlan.startingXi.map((p) => p.id),
      });

      setSubsCount(newSubsCount);

      const newEv = {
        id: Date.now(),
        type: 'TACTICS',
        text: `بروزرسانی تاکتیک مربی: چیدمان (${updatedPlan.currentFormation}) اعمال شد (تعویض ${newSubsCount} از ۵) ⚡`,
        team: teamData?.name || 'تیم شما',
        icon: '⚡',
        color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
      };

      setEvents((prev) => [newEv, ...prev]);
      if (onAddEvent) onAddEvent(newEv);

      setSaveToast(`تغییرات ترکیبی با موفقیت ثبت شد (تعویض‌های مصرف‌شده: ${newSubsCount} از ۵).`);
      setTimeout(() => setSaveToast(''), 4500);
      setIsTacticsExpanded(false);
    } catch (_error) {
      setSaveToast('خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.');
      setTimeout(() => setSaveToast(''), 4500);
    }
  };

  // -------------------------------------------------------------
  // TIME-GATING CHECK: Render Standby Screen if not active & not bypassed
  // -------------------------------------------------------------
  const isMatchLive = isStandbyBypassed || Boolean(liveContext?.has_active_match) || activeMatch?.status === 'LIVE';
  
  if (loadingContext && !liveContext) {
    return (
      <div className="p-16 text-center text-cyan-400 font-bold flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-sport tracking-wider text-slate-300">در حال دریافت وضعیت زمان‌بندی رسمی مسابقه...</span>
      </div>
    );
  }

  if (!isMatchLive && !isStandbyBypassed) {
    const displayMatch = teamNextMatch || liveContext?.next_match;
    let displaySeconds = liveContext?.time_to_kickoff_seconds;
    if (teamNextMatch?.date) {
      displaySeconds = Math.max(0, Math.floor((new Date(teamNextMatch.date).getTime() - Date.now()) / 1000));
    }

    return (
      <LiveMatchStandby
        nextMatch={displayMatch}
        initialSeconds={displaySeconds}
        isWithinReminder={displaySeconds != null && displaySeconds <= 900 && displaySeconds > 0}
        onUnlockLive={() => setIsStandbyBypassed(true)}
        isAdmin={isAdmin}
        teamName={teamData?.name}
        onAdminOverride={() => {
          if (onOpenAdminControl) {
            onOpenAdminControl();
          } else {
            setIsStandbyBypassed(true);
          }
        }}
      />
    );
  }

  // -------------------------------------------------------------
  // ACTIVE LIVE MATCH BROADCAST VIEW
  // -------------------------------------------------------------
  const currentMatch = activeMatch || teamNextMatch || liveContext?.active_match || liveContext?.next_match;

  const isUserHome = teamData?.id ? (currentMatch?.home_team === teamData.id || currentMatch?.home_team_name === teamData.name) : true;

  const homeName = currentMatch?.home_team_name || (isUserHome ? (teamData?.name || 'تیم میزبان') : (currentMatch?.opponent_name || 'تیم میزبان'));
  const awayName = currentMatch?.away_team_name || (!isUserHome ? (teamData?.name || 'تیم میهمان') : (currentMatch?.opponent_name || 'حریف مسابقه'));

  const homeLogo = currentMatch?.home_team_logo || (isUserHome ? teamData?.logo : currentMatch?.opponent_logo);
  const awayLogo = currentMatch?.away_team_logo || (!isUserHome ? teamData?.logo : currentMatch?.opponent_logo);

  const homeScore = currentMatch?.home_score ?? 0;
  const awayScore = currentMatch?.away_score ?? 0;

  return (
    <div className="space-y-4 pb-20 font-sans dir-rtl">
      {/* Live Match Top Scoreboard Banner (FC 2026 Broadcast Style) */}
      <div className="fc-card-elevated p-4 sm:p-5 rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-[#080c14] via-[#0d162a] to-[#080c14] flex flex-col md:flex-row items-center justify-between shadow-2xl gap-4">
        {/* Teams and Score Clash */}
        <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            {/* Home Team */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl team-crest-badge p-1 flex items-center justify-center shrink-0 shadow-lg relative">
                {getTeamLogoUrl(homeLogo || homeName) ? (
                  <img src={getTeamLogoUrl(homeLogo || homeName)} alt={homeName} className="w-full h-full object-contain" />
                ) : (
                  <span className="font-sport font-black text-slate-800 text-xs">{homeName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <span className="text-xs sm:text-sm font-black text-white tracking-tight">{homeName}</span>
            </div>

            {/* Score Box */}
            <div className="flex flex-col items-center px-2">
              <span className="text-base sm:text-lg font-sport font-black text-cyan-300 bg-[#05080e] px-3.5 py-0.5 rounded-xl border border-cyan-500/40 shadow-inner tracking-wider">
                {homeScore} - {awayScore}
              </span>
            </div>

            {/* Away Team */}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-white tracking-tight">{awayName}</span>
              <div className="w-10 h-10 rounded-2xl team-crest-badge p-1 flex items-center justify-center shrink-0 shadow-lg relative">
                {getTeamLogoUrl(awayLogo || awayName) ? (
                  <img src={getTeamLogoUrl(awayLogo || awayName)} alt={awayName} className="w-full h-full object-contain" />
                ) : (
                  <span className="font-sport font-black text-slate-800 text-xs">{awayName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Match Clock and Live Indicator */}
        <div className="flex items-center gap-2.5 self-end md:self-auto font-sport">
          {/* Active Live Match Clock */}
          <div className="flex items-center gap-2 bg-[#05080e]/95 px-4 py-2 rounded-2xl border border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-sm sm:text-base font-black text-amber-300 tracking-wider">
              {formattedMatchTimer}
            </span>
            <span className="text-[10px] text-cyan-300 font-black font-sans px-1.5 py-0.5 bg-cyan-950/80 rounded-md border border-cyan-500/30">
              {matchState === 'FIRST_HALF' || matchState === '1ST_HALF' ? 'نیمه اول' : matchState === 'HALF_TIME' ? 'بین دو نیمه' : matchState === 'SECOND_HALF' || matchState === '2ND_HALF' ? 'نیمه دوم' : 'پایان بازی'}
            </span>
          </div>

          <span className="text-xs font-black text-rose-300 bg-rose-950/90 px-3.5 py-2 rounded-2xl border border-rose-500/50 flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
            <Radio size={14} className="animate-pulse text-rose-400" />
            <span>LIVE</span>
          </span>
        </div>
      </div>

      {saveToast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-cyan-300 font-black bg-cyan-950/95 p-3 rounded-2xl border border-cyan-400/50 text-center shadow-lg flex items-center justify-center gap-2 font-sport"
        >
          <CheckCircle2 size={16} className="text-cyan-400" />
          <span>{saveToast}</span>
        </motion.div>
      )}

      {/* 1. APARAT LIVE VIDEO STREAM PLAYER CONTAINER */}
      <div className="fc-card-elevated p-2 md:p-3 rounded-3xl border border-slate-700/60 space-y-2 shadow-2xl relative overflow-hidden bg-[#05080e]">
        <div className="flex justify-between items-center px-2 py-1.5 text-xs text-slate-300">
          <span className="font-black text-white flex items-center gap-2">
            <Radio size={16} className="animate-pulse text-rose-500" />
            <span>استریم زنده مسابقه مستر لیگ</span>
            <span className="text-amber-300 font-sport font-black bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-500/40 text-[11px]">
              ⏱️ {formattedMatchTimer}
            </span>
          </span>
          <span className="text-[10.5px] text-cyan-300 font-sport font-bold bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
            1080p 60FPS • APARAT LIVE
          </span>
        </div>

        {/* Official Aparat Live Video Embed Frame */}
        <div className="h_iframe-aparat_embed_frame relative w-full rounded-2xl overflow-hidden border border-slate-700/60 bg-black shadow-inner">
          <span style={{ display: 'block', paddingTop: '57%' }}></span>
          <iframe
            src={aparatEmbedSrc}
            title="Aparat Live Stream VML.Emad"
            className="absolute top-0 left-0 w-full h-full border-0"
            scrolling="no"
            allowFullScreen={true}
            webkitallowfullscreen="true"
            mozallowfullscreen="true"
          ></iframe>
        </div>
      </div>

      {/* 2. REAL-TIME LIVE MATCH EVENTS TICKER */}
      <div className="fc-card p-4 sm:p-5 rounded-3xl border border-slate-700/60 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
          <h3 className="text-xs font-black text-white flex items-center gap-2">
            <Activity size={17} className="text-cyan-400" />
            <span>اتفاقات و گزارش لحظه‌ای مسابقه (MATCHDAY TIMELINE)</span>
          </h3>
          <span className="text-[10px] text-cyan-300 font-sport bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30 font-bold">
            {events.length} EVENTS RECORDED
          </span>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1 text-xs">
          {events.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              مسابقه در حال برگزاری است. رویدادهای مهم (گل، اخطار، تعویض) به صورت زنده در این قسمت ثبت خواهند شد.
            </div>
          ) : (
            events.map((ev) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-3 rounded-2xl border flex items-center justify-between shadow-sm ${ev.color || 'text-cyan-300 border-cyan-500/30 bg-[#080c14]/70'}`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className="text-base shrink-0">{ev.icon || '📢'}</span>
                  <span className="font-bold text-white text-xs truncate">{ev.text}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-sport font-bold shrink-0">{ev.team}</span>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* 2.5 LIVE MATCH TELEMETRY & STATS BARS (FotMob Style) */}
      <div className="fc-card p-4 sm:p-5 rounded-3xl border border-slate-700/60 space-y-4 shadow-xl bg-[#080c14]/80">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
          <h3 className="text-xs font-black text-white flex items-center gap-2">
            <Sliders size={17} className="text-purple-400" />
            <span>آمار مقایسه‌ای و تله‌متری زنده بازی (LIVE MATCH STATS)</span>
          </h3>
          <div className="flex items-center gap-3 text-[11px] font-bold font-sport">
            <span className="text-cyan-400">{homeName}</span>
            <span className="text-slate-500">VS</span>
            <span className="text-purple-400">{awayName}</span>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          {/* Possession Bar */}
          <div className="space-y-1">
            <div className="flex justify-between font-sport font-black text-xs">
              <span className="text-cyan-400">{homeStatsObj.possession_percent}%</span>
              <span className="text-slate-300 text-[11px] font-sans">درصد مالکیت توپ</span>
              <span className="text-purple-400">{awayStatsObj.possession_percent}%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden flex bg-purple-900/60">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-500" 
                style={{ width: `${homeStatsObj.possession_percent}%` }}
              />
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" 
                style={{ width: `${awayStatsObj.possession_percent}%` }}
              />
            </div>
          </div>

          {/* Metric Comparison Rows */}
          {[
            { label: 'شوت در چارچوب', h: homeStatsObj.shots_on_target, a: awayStatsObj.shots_on_target },
            { label: 'کل شوت‌ها', h: homeStatsObj.shots, a: awayStatsObj.shots },
            { label: 'خطاها', h: homeStatsObj.fouls, a: awayStatsObj.fouls },
            { label: 'کرنرها', h: homeStatsObj.corners, a: awayStatsObj.corners },
            { label: 'آفسایدها', h: homeStatsObj.offsides, a: awayStatsObj.offsides },
            { label: 'سیوهای دروازه‌بان', h: homeStatsObj.saves, a: awayStatsObj.saves },
          ].map((row, idx) => {
            const total = (row.h || 0) + (row.a || 0) || 1;
            const hPercent = Math.round(((row.h || 0) / total) * 100);
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between font-sport font-bold text-[11px]">
                  <span className="text-cyan-400 w-6 text-left">{row.h || 0}</span>
                  <span className="text-slate-400 text-[10px] font-sans">{row.label}</span>
                  <span className="text-purple-400 w-6 text-right">{row.a || 0}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-purple-950/60 border border-slate-800">
                  <div 
                    className="h-full bg-cyan-400 transition-all duration-500" 
                    style={{ width: `${(row.h || 0) === 0 && (row.a || 0) === 0 ? 50 : hPercent}%` }}
                  />
                  <div 
                    className="h-full bg-purple-500 transition-all duration-500" 
                    style={{ width: `${(row.h || 0) === 0 && (row.a || 0) === 0 ? 50 : 100 - hPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. COACH TACTICAL OVERVIEW & LIVE ADJUSTMENT DRAWER */}
      <div className="fc-card-elevated rounded-3xl border border-slate-700/60 overflow-hidden shadow-2xl">
        <button
          onClick={() => setIsTacticsExpanded(!isTacticsExpanded)}
          className="w-full p-4 sm:p-5 flex items-center justify-between bg-gradient-to-r from-[#080c14] to-[#0d162a] text-right hover:bg-slate-800/80 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(0,243,255,0.3)]">
              <Sliders size={20} />
            </div>
            <div>
              <span className="font-black text-white text-sm sm:text-base block tracking-tight">
                میز تعویض و تغییرات تاکتیکی زنده (TACTICS DESK)
              </span>
              <span className="text-xs text-cyan-300 font-medium">
                {matchState === 'HALF_TIME'
                  ? '⚡ استراحت بین دو نیمه: تعویض نامحدود و تغییر فرمیشن بدون قفل'
                  : 'در جریان مسابقه: امکان انجام تعویض‌های فوری با ۵ سهمیه رسمی'}
              </span>
            </div>
          </div>
          <span className="text-xs font-black text-cyan-300 font-sport bg-cyan-950/80 px-3 py-1 rounded-xl border border-cyan-500/40">
            {isTacticsExpanded ? 'بستن پنل ▲' : 'مشاهده و تغییر تاکتیک ▼'}
          </span>
        </button>

        <AnimatePresence>
          {isTacticsExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 sm:p-6 border-t border-slate-700/60 bg-[#05080e]/95 space-y-6"
            >
              {/* Tactical Instructions Tabs */}
              <div className="space-y-4">
                <div className="flex bg-[#080c14] p-1 rounded-2xl border border-slate-700/60 gap-1 text-xs">
                  <button
                    onClick={() => setTacticTab('attack')}
                    className={`flex-1 py-2.5 rounded-xl font-black transition-all ${
                      tacticTab === 'attack'
                        ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚔️ دستورات تهاجمی
                  </button>
                  <button
                    onClick={() => setTacticTab('defense')}
                    className={`flex-1 py-2.5 rounded-xl font-black transition-all ${
                      tacticTab === 'defense'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🛡️ دستورات دفاعی
                  </button>
                  <button
                    onClick={() => setTacticTab('advanced')}
                    className={`flex-1 py-2.5 rounded-xl font-black transition-all ${
                      tacticTab === 'advanced'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚙️ تاکتیک‌های پیشرفته
                  </button>
                </div>

                {/* Tactical Tab 1: Attack */}
                {tacticTab === 'attack' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="fc-card p-4 rounded-2xl border border-slate-700/60 space-y-2">
                      <label className="font-black text-rose-300 block">۱. سبک حمله (Attacking Style):</label>
                      <CustomSelect
                        value={tactics.attacking_style}
                        onChange={(val) => setTactics({ ...tactics, attacking_style: val })}
                        colorTheme="rose"
                        options={[
                          { value: 'بازی مالکانه', label: 'بازی مالکانه (Possession Game)' },
                          { value: 'ضد حمله', label: 'ضد حمله (Counter Attack)' },
                        ]}
                      />
                    </div>
                    <div className="fc-card p-4 rounded-2xl border border-slate-700/60 space-y-2">
                      <label className="font-black text-cyan-300 block">۲. بازیسازی (Build Up):</label>
                      <CustomSelect
                        value={tactics.build_up}
                        onChange={(val) => setTactics({ ...tactics, build_up: val })}
                        colorTheme="cyan"
                        options={[
                          { value: 'پاس کوتاه', label: 'پاس کوتاه (Short Pass)' },
                          { value: 'پاس بلند', label: 'پاس بلند (Long Pass)' },
                        ]}
                      />
                    </div>
                    <div className="fc-card p-4 rounded-2xl border border-slate-700/60 space-y-2">
                      <label className="font-black text-[#00ff87] block">۳. منطقه حمله (Attacking Area):</label>
                      <CustomSelect
                        value={tactics.attacking_area}
                        onChange={(val) => setTactics({ ...tactics, attacking_area: val })}
                        colorTheme="emerald"
                        options={[
                          { value: 'مرکز', label: 'مرکز (Center)' },
                          { value: 'کناره', label: 'کناره‌ها (Wide)' },
                        ]}
                      />
                    </div>
                    <div className="fc-card p-4 rounded-2xl border border-slate-700/60 space-y-2">
                      <label className="font-black text-cyan-300 block">۴. جای‌گیری (Positioning):</label>
                      <CustomSelect
                        value={tactics.positioning}
                        onChange={(val) => setTactics({ ...tactics, positioning: val })}
                        colorTheme="cyan"
                        options={[
                          { value: 'شناور', label: 'شناور (Flexible)' },
                          { value: 'حفظ ترکیب', label: 'حفظ ترکیب (Maintain Formation)' },
                        ]}
                      />
                    </div>
                  </div>
                )}

                {/* Tactical Tab 2: Defense */}
                {tacticTab === 'defense' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="fc-card p-4 rounded-2xl border border-slate-700/60 space-y-2">
                      <label className="font-black text-cyan-300 block">۱. سبک دفاعی (Defensive Style):</label>
                      <CustomSelect
                        value={tactics.defensive_style}
                        onChange={(val) => setTactics({ ...tactics, defensive_style: val })}
                        colorTheme="cyan"
                        options={[
                          { value: 'فشار خط مقدم', label: 'فشار خط مقدم (Frontline Pressure)' },
                          { value: 'تمام تدافعی', label: 'تمام تدافعی (All-out Defence)' },
                        ]}
                      />
                    </div>
                    <div className="fc-card p-4 rounded-2xl border border-slate-700/60 space-y-2">
                      <label className="font-black text-purple-300 block">۲. منطقه مهار (Containment Area):</label>
                      <CustomSelect
                        value={tactics.containment_area}
                        onChange={(val) => setTactics({ ...tactics, containment_area: val })}
                        colorTheme="cyan"
                        options={[
                          { value: 'مرکز', label: 'مرکز (Middle)' },
                          { value: 'کناره', label: 'کناره‌ها (Wide)' },
                        ]}
                      />
                    </div>
                    <div className="fc-card p-4 rounded-2xl border border-slate-700/60 space-y-2">
                      <label className="font-black text-[#00ff87] block">۳. فشار (Pressing):</label>
                      <CustomSelect
                        value={tactics.pressing}
                        onChange={(val) => setTactics({ ...tactics, pressing: val })}
                        colorTheme="emerald"
                        options={[
                          { value: 'تهاجمی', label: 'تهاجمی (Aggressive)' },
                          { value: 'محافظه‌کار', label: 'محافظه‌کار (Conservative)' },
                        ]}
                      />
                    </div>
                  </div>
                )}

                {/* Tactical Tab 3: Advanced */}
                {tacticTab === 'advanced' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="fc-card p-4 rounded-2xl border border-slate-700/60 space-y-2">
                      <label className="font-black text-rose-300 block">۱. تاکتیک پیشرفته حمله:</label>
                      <CustomSelect
                        value={tactics.adv_offense_1}
                        onChange={(val) => setTactics({ ...tactics, adv_offense_1: val })}
                        colorTheme="rose"
                        options={[
                          { value: 'هیچکدام', label: 'هیچکدام (None)' },
                          { value: 'تیکی تاکا', label: 'تیکی تاکا (Tiki-Taka)' },
                          { value: 'بال غلط', label: 'بال غلط (False Wingers)' },
                          { value: 'دوران بال‌ها', label: 'دوران بال‌ها (Wing Rotation)' },
                        ]}
                      />
                    </div>
                    <div className="fc-card p-4 rounded-2xl border border-slate-700/60 space-y-2">
                      <label className="font-black text-cyan-300 block">۲. تاکتیک پیشرفته دفاع:</label>
                      <CustomSelect
                        value={tactics.adv_defense_1}
                        onChange={(val) => setTactics({ ...tactics, adv_defense_1: val })}
                        colorTheme="cyan"
                        options={[
                          { value: 'هیچکدام', label: 'هیچکدام (None)' },
                          { value: 'خط دفاعی عمیق', label: 'خط دفاعی عمیق (Deep Defensive Line)' },
                          { value: 'شلوغی در محوطه جریمه', label: 'شلوغی در محوطه (Box Crowding)' },
                        ]}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Full Interactive Pitch with Live Sub Capabilities */}
              <EFootballGamePlan
                key={`${formation}-${startingXi.length}`}
                initialFormationProp={formation}
                initialStartingXi={startingXi}
                initialSubstitutes={substitutes}
                initialReserves={reserves}
                onSaveGamePlan={handleSaveGamePlan}
                readOnly={false}
                isAdminMode={false}
                isLiveMode={true}
                matchState={matchState}
                halfTimeSeconds={halfTimeSeconds}
                subsUsed={subsCount}
                maxSubs={5}
                teamName={teamData?.name}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
