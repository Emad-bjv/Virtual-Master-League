import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Radio, Calendar, CheckCircle2, Tv, Play, Pause, Square, 
  PlusCircle, RefreshCw, Trophy, Clock, AlertTriangle, Shield,
  Users, ChevronRight, ChevronLeft, Check, Sparkles, Sliders, ExternalLink,
  Trash2, RotateCcw, X, AlertCircle, ArrowRightLeft, Eye, Activity,
  Flame, UserCheck, UserX, Info, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { adminApi, matchApi } from '../../services/api';
import { useToast } from '../components/Toast';
import { getTeamLogoUrl } from '../../utils/teamLogos';

export default function LiveBroadcastControl() {
  const { showToast } = useToast();

  // Navigation & Gameweek State
  const [activeTab, setActiveTab] = useState('live_desk'); // 'live_desk' | 'gameweek_fixtures' | 'stream_config'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [gameweekData, setGameweekData] = useState({ active_gameweek: 'هفته ۱', gameweeks: [] });
  const [selectedGameweek, setSelectedGameweek] = useState('هفته ۱');
  const [gameweekMatches, setGameweekMatches] = useState([]);

  // Selected Active Match & Control State
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [tacticalTeamTab, setTacticalTeamTab] = useState('home'); // 'home' | 'away'
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [homeGameplan, setHomeGameplan] = useState(null);
  const [awayGameplan, setAwayGameplan] = useState(null);

  // Live Timer State (MM:SS)
  const [matchMinutes, setMatchMinutes] = useState(1);
  const [matchSeconds, setMatchSeconds] = useState(0);
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [stoppageTime, setStoppageTime] = useState(0);

  // Live Telemetry Stats State
  const [liveStats, setLiveStats] = useState({
    home: { possession_percent: 50, shots: 0, shots_on_target: 0, fouls: 0, corners: 0, offsides: 0, saves: 0 },
    away: { possession_percent: 50, shots: 0, shots_on_target: 0, fouls: 0, corners: 0, offsides: 0, saves: 0 },
  });
  const [isSavingStats, setIsSavingStats] = useState(false);

  // Modals & Rapid Event State
  const [eventModalType, setEventModalType] = useState(null); // 'GOAL' | 'OWN_GOAL' | 'PENALTY' | 'YELLOW' | 'RED' | 'SUB' | 'VAR'
  const [eventTargetTeam, setEventTargetTeam] = useState('home'); // 'home' | 'away'
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedAssistId, setSelectedAssistId] = useState('');
  const [eventMinuteInput, setEventMinuteInput] = useState(45);
  const [eventDetailText, setEventDetailText] = useState('');
  const [varDecisionType, setVarDecisionType] = useState('GOAL_DISALLOWED');
  const [subOutPlayerId, setSubOutPlayerId] = useState('');
  const [subInPlayerId, setSubInPlayerId] = useState('');
  const [penaltyOutcome, setPenaltyOutcome] = useState('SCORED'); // 'SCORED' | 'MISSED'

  // Stream Configuration State
  const [streamUrl, setStreamUrl] = useState('https://www.aparat.com/embed/live/VML.Emad');

  const wsRef = useRef(null);

  // -------------------------------------------------------------
  // 1. Fetch Gameweek Progression & Fixtures
  // -------------------------------------------------------------
  const fetchGameweeksAndFixtures = async (explicitRound = null) => {
    try {
      setRefreshing(true);
      const gwRes = await matchApi.getGameweeksStatus();
      if (gwRes.data) {
        setGameweekData(gwRes.data);
        const roundToSelect = explicitRound || selectedGameweek || gwRes.data.active_gameweek || 'هفته ۱';
        setSelectedGameweek(roundToSelect);

        // Fetch strictly the fixtures belonging to this gameweek
        const matchesRes = await adminApi.getMatches({ round: roundToSelect });
        const matches = matchesRes.data.results || matchesRes.data || [];
        setGameweekMatches(matches);

        // Only refresh currently selected match details, do NOT auto-select
        // The user must manually click a match to enter the Control Room
        if (selectedMatch) {
          fetchSelectedMatchDetails(selectedMatch.id);
        }
      }
    } catch (err) {
      console.error('Failed to load gameweek status:', err);
      showToast('خطا در بارگذاری تقویم هفته‌های لیگ', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleGameweekSelect = (gwName) => {
    setSelectedGameweek(gwName);
    fetchGameweeksAndFixtures(gwName);
  };

  // -------------------------------------------------------------
  // 2. Fetch Selected Match Deep State & Squad Lineups
  // -------------------------------------------------------------
  const fetchSelectedMatchDetails = async (matchId) => {
    try {
      const res = await matchApi.getMatchDetail(matchId);
      if (res.data) {
        const m = res.data;
        setSelectedMatch(m);
        setStoppageTime(m.stoppage_time || 0);
        setMatchMinutes(m.current_minute || (m.half_status === '2ND_HALF' ? 46 : 1));

        // Sync Clock running state with status
        if (m.status === 'LIVE' && m.half_status !== 'HALF_TIME') {
          setIsClockRunning(true);
        } else {
          setIsClockRunning(false);
        }

        // Initialize Live Telemetry Stats if available
        if (m.team_stats && m.team_stats.length > 0) {
          const homeStat = m.team_stats.find(s => s.team === m.home_team) || {};
          const awayStat = m.team_stats.find(s => s.team === m.away_team) || {};
          setLiveStats({
            home: {
              possession_percent: homeStat.possession_percent ?? 50,
              shots: homeStat.shots ?? 0,
              shots_on_target: homeStat.shots_on_target ?? 0,
              fouls: homeStat.fouls ?? 0,
              corners: homeStat.corners ?? 0,
              offsides: homeStat.offsides ?? 0,
              saves: homeStat.saves ?? 0,
            },
            away: {
              possession_percent: awayStat.possession_percent ?? 50,
              shots: awayStat.shots ?? 0,
              shots_on_target: awayStat.shots_on_target ?? 0,
              fouls: awayStat.fouls ?? 0,
              corners: awayStat.corners ?? 0,
              offsides: awayStat.offsides ?? 0,
              saves: awayStat.saves ?? 0,
            }
          });
        }

        // Fetch lineups from submit_gameplan which stores the coaches' confirmed
        // starting XI (is_starting=true) and bench (is_starting=false).
        // The response is: { gameplan: {...}, team: { players: [...] } }
        if (m.home_team) {
          api.get(`/teams/${m.home_team}/submit_gameplan/`, { params: { match_id: m.id } }).then(gpRes => {
            const gp = gpRes.data.gameplan || null;
            setHomeGameplan(gp);
            const teamPlayers = gpRes.data.team?.players || [];
            let finalPlayers = teamPlayers;
            if (gp && Array.isArray(gp.players_data) && gp.players_data.length > 0) {
              const pMap = new Map();
              gp.players_data.forEach(item => {
                const pid = item.player_id || item.id;
                if (pid) pMap.set(String(pid), item);
              });
              finalPlayers = teamPlayers.map(p => {
                const custom = pMap.get(String(p.id));
                if (custom) {
                  return {
                    ...p,
                    is_starting: Boolean(custom.is_starting),
                    x_coord: custom.x_coord != null ? custom.x_coord : p.x_coord,
                    y_coord: custom.y_coord != null ? custom.y_coord : p.y_coord,
                    tacticalPosition: custom.position || p.position,
                  };
                }
                return p;
              });
            }
            setHomePlayers(finalPlayers);
          }).catch(() => {
            // Fallback: fetch basic team players without lineup status
            api.get(`/teams/${m.home_team}/`).then(tRes => {
              setHomePlayers(tRes.data.players || []);
            }).catch(() => {});
          });
        }

        if (m.away_team) {
          api.get(`/teams/${m.away_team}/submit_gameplan/`, { params: { match_id: m.id } }).then(gpRes => {
            const gp = gpRes.data.gameplan || null;
            setAwayGameplan(gp);
            const teamPlayers = gpRes.data.team?.players || [];
            let finalPlayers = teamPlayers;
            if (gp && Array.isArray(gp.players_data) && gp.players_data.length > 0) {
              const pMap = new Map();
              gp.players_data.forEach(item => {
                const pid = item.player_id || item.id;
                if (pid) pMap.set(String(pid), item);
              });
              finalPlayers = teamPlayers.map(p => {
                const custom = pMap.get(String(p.id));
                if (custom) {
                  return {
                    ...p,
                    is_starting: Boolean(custom.is_starting),
                    x_coord: custom.x_coord != null ? custom.x_coord : p.x_coord,
                    y_coord: custom.y_coord != null ? custom.y_coord : p.y_coord,
                    tacticalPosition: custom.position || p.position,
                  };
                }
                return p;
              });
            }
            setAwayPlayers(finalPlayers);
          }).catch(() => {
            api.get(`/teams/${m.away_team}/`).then(tRes => {
              setAwayPlayers(tRes.data.players || []);
            }).catch(() => {});
          });
        }
      }
    } catch (err) {
      console.error('Failed to load match detail:', err);
    }
  };

  useEffect(() => {
    fetchGameweeksAndFixtures();
    const handleSync = () => fetchGameweeksAndFixtures(selectedGameweek);
    window.addEventListener('vml_league_schedule_updated', handleSync);
    window.addEventListener('storage', handleSync);

    const interval = setInterval(() => {
      if (selectedGameweek) {
        fetchGameweeksAndFixtures(selectedGameweek);
      }
    }, 25000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('vml_league_schedule_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [selectedGameweek]);

  // -------------------------------------------------------------
  // 3. Real-Time WebSocket Bi-Directional Synchronization
  // -------------------------------------------------------------
  useEffect(() => {
    if (!selectedMatch?.id) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/match/${selectedMatch.id}/`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          
          // Handle full match state updates
          if (data.match) {
            setSelectedMatch(data.match);
            if (data.match.stoppage_time !== undefined) {
              setStoppageTime(data.match.stoppage_time);
            }
          }

          if (data.type === 'match_status') {
            setSelectedMatch(prev => prev ? { ...prev, status: data.status, half_status: data.half_status } : prev);
            if (data.half_status === '1ST_HALF') {
              setIsClockRunning(true);
              setMatchMinutes(1);
            }
          } else if (data.type === 'half_time') {
            setSelectedMatch(prev => prev ? { ...prev, half_status: 'HALF_TIME' } : prev);
            setIsClockRunning(false);
            setMatchMinutes(45);
          } else if (data.type === 'second_half_started') {
            setSelectedMatch(prev => prev ? { ...prev, half_status: '2ND_HALF' } : prev);
            setIsClockRunning(true);
            setMatchMinutes(46);
          } else if (data.type === 'match_finished') {
            setSelectedMatch(prev => prev ? { ...prev, status: 'FINISHED', half_status: 'FINISHED' } : prev);
            setIsClockRunning(false);
            setMatchMinutes(90);
          } else if (data.type === 'stoppage_time_update') {
            setStoppageTime(data.stoppage_time || 0);
          } else if (data.type === 'coach_tactics_submitted' || data.type === 'new_in_game_change' || data.type === 'in_game_change_applied') {
            // Instantly synchronize coach's latest live lineup & tactics on admin broadcast room
            if (selectedMatch?.id) {
              fetchMatchDetail(selectedMatch);
            }
          }
        } catch (_err) {}
      };

      ws.onerror = () => {};
    } catch (_e) {}

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [selectedMatch?.id]);

  // -------------------------------------------------------------
  // 4. Live Match Clock Engine (Precise 45-min halves + Stoppage)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isClockRunning) return;

    const timer = setInterval(() => {
      setMatchSeconds(sec => {
        if (sec >= 59) {
          setMatchMinutes(min => {
            const isFirstHalf = selectedMatch?.half_status === '1ST_HALF';
            const isSecondHalf = selectedMatch?.half_status === '2ND_HALF';

            if (isFirstHalf && min >= 45 + stoppageTime) {
              return 45 + stoppageTime;
            }
            if (isSecondHalf && min >= 90 + stoppageTime) {
              return 90 + stoppageTime;
            }
            return min + 1;
          });
          return 0;
        }
        return sec + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isClockRunning, selectedMatch?.half_status, stoppageTime]);

  const formattedMatchClock = useMemo(() => {
    const mm = String(matchMinutes).padStart(2, '0');
    const ss = String(matchSeconds).padStart(2, '0');
    if (selectedMatch?.half_status === 'HALF_TIME') return 'HT 45:00 (استراحت)';
    if (selectedMatch?.status === 'FINISHED') return 'FT 90:00 (پایان بازی)';
    if (stoppageTime > 0) {
      if (matchMinutes >= 45 && selectedMatch?.half_status === '1ST_HALF') {
        return `45'+${matchMinutes - 45}:${ss}`;
      }
      if (matchMinutes >= 90 && selectedMatch?.half_status === '2ND_HALF') {
        return `90'+${matchMinutes - 90}:${ss}`;
      }
    }
    return `${mm}:${ss}'`;
  }, [matchMinutes, matchSeconds, selectedMatch?.half_status, selectedMatch?.status, stoppageTime]);

  // -------------------------------------------------------------
  // 5. Match Control Actions (Clock, Periods, Stoppage)
  // -------------------------------------------------------------
  const handleControlAction = async (action, payload = {}) => {
    if (!selectedMatch) return;
    try {
      const res = await matchApi.controlMatch(selectedMatch.id, { action, ...payload });
      if (res.data?.match) {
        setSelectedMatch(res.data.match);
      }
      showToast(`عملیات ${action} با موفقیت انجام شد`, 'success');
      fetchGameweeksAndFixtures();
    } catch (err) {
      console.error('Match control action error:', err);
      showToast(err.response?.data?.error || 'خطا در اعمال دستور مسابقه', 'error');
    }
  };

  const handleSetStoppage = async (minutes) => {
    setStoppageTime(minutes);
    await handleControlAction('SET_STOPPAGE_TIME', { stoppage_time: minutes });
  };

  // -------------------------------------------------------------
  // 6. Rapid Event Modal Openers & Submissions
  // -------------------------------------------------------------
  const openEventModal = (type, teamSide = 'home') => {
    setEventModalType(type);
    setEventTargetTeam(teamSide);
    setEventMinuteInput(matchMinutes || 45);
    setEventDetailText('');
    setSelectedPlayerId('');
    setSelectedAssistId('');
    setPenaltyOutcome('SCORED');
    setVarDecisionType('GOAL_DISALLOWED');

    const squad = teamSide === 'home' ? homePlayers : awayPlayers;
    const starter = squad.find(p => p.is_starting) || squad[0];
    if (starter) {
      setSelectedPlayerId(starter.id.toString());
    }

    if (type === 'SUB') {
      const activeStarters = squad.filter(p => p.is_starting);
      const activeBench = squad.filter(p => !p.is_starting);
      if (activeStarters.length > 0) setSubOutPlayerId(activeStarters[0].id.toString());
      if (activeBench.length > 0) setSubInPlayerId(activeBench[0].id.toString());
    }
  };

  const handleRecordEventSubmit = async () => {
    if (!selectedMatch) return;
    const isHome = eventTargetTeam === 'home';
    const targetTeamId = isHome ? selectedMatch.home_team : selectedMatch.away_team;
    const squad = isHome ? homePlayers : awayPlayers;

    try {
      if (eventModalType === 'SUB') {
        if (!subOutPlayerId || !subInPlayerId) {
          showToast('لطفاً بازیکن خروجی و ورودی را مشخص کنید.', 'warning');
          return;
        }
        await handleControlAction('RECORD_SUBSTITUTION', {
          team_id: targetTeamId,
          player_out_id: parseInt(subOutPlayerId),
          player_in_id: parseInt(subInPlayerId),
          minute: parseInt(eventMinuteInput) || matchMinutes || 45,
        });
      } else {
        let finalEventType = eventModalType;
        let detail = eventDetailText;

        if (eventModalType === 'PENALTY') {
          finalEventType = penaltyOutcome === 'SCORED' ? 'PENALTY_SCORED' : 'PENALTY_MISSED';
          detail = penaltyOutcome === 'SCORED' ? '⚽ گل از روی نقطه پنالتی' : '❌ پنالتی مهار شد / به بیرون رفت';
        } else if (eventModalType === 'VAR') {
          detail = `🖥️ بررسی VAR: ${varDecisionType === 'GOAL_DISALLOWED' ? 'گل مردود اعلام شد' : varDecisionType === 'PENALTY_OVERTURNED' ? 'پنالتی لغو شد' : 'بازبینی کارت'} - ${eventDetailText}`;
        }

        await handleControlAction('RECORD_EVENT', {
          event_type: finalEventType,
          player_id: selectedPlayerId ? parseInt(selectedPlayerId) : null,
          assist_player_id: selectedAssistId ? parseInt(selectedAssistId) : null,
          team_id: targetTeamId,
          minute: parseInt(eventMinuteInput) || matchMinutes || 45,
          detail: detail,
          var_type: varDecisionType,
        });
      }

      setEventModalType(null);
      showToast('رویداد مسابقه با موفقیت ثبت و مخابره شد!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'خطا در ثبت رویداد', 'error');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('آیا از حذف/ابطال این رویداد اطمینان دارید؟ در صورت گل بودن، نتیجه به صورت خودکار تصحیح خواهد شد.')) return;
    try {
      await matchApi.deleteEvent(selectedMatch.id, eventId);
      showToast('رویداد با موفقیت حذف و نتیجه بروزرسانی شد', 'success');
      fetchSelectedMatchDetails(selectedMatch.id);
    } catch (err) {
      showToast('خطا در حذف رویداد', 'error');
    }
  };

  // -------------------------------------------------------------
  // 7. Coach Substitution Request Approval / Rejection
  // -------------------------------------------------------------
  const handleApproveSubRequest = async (reqId) => {
    try {
      await matchApi.approveSubRequest(selectedMatch.id, reqId);
      showToast('درخواست تعویض مربی تایید و در زمین اعمال شد ✓', 'success');
      fetchSelectedMatchDetails(selectedMatch.id);
    } catch (err) {
      showToast(err.response?.data?.error || 'خطا در تایید تعویض', 'error');
    }
  };

  const handleRejectSubRequest = async (reqId) => {
    try {
      await matchApi.rejectSubRequest(selectedMatch.id, reqId);
      showToast('درخواست تعویض مربی رد شد ✕', 'info');
      fetchSelectedMatchDetails(selectedMatch.id);
    } catch (err) {
      showToast('خطا در رد تعویض', 'error');
    }
  };

  // -------------------------------------------------------------
  // 8. Live Telemetry Match Statistics Submission
  // -------------------------------------------------------------
  const handleStatIncrement = (teamSide, statKey, delta) => {
    setLiveStats(prev => {
      const currentVal = prev[teamSide][statKey] || 0;
      const nextVal = Math.max(0, currentVal + delta);
      return {
        ...prev,
        [teamSide]: {
          ...prev[teamSide],
          [statKey]: nextVal
        }
      };
    });
  };

  const handlePossessionChange = (homeVal) => {
    const homePercent = Math.min(100, Math.max(0, parseInt(homeVal) || 50));
    setLiveStats(prev => ({
      ...prev,
      home: { ...prev.home, possession_percent: homePercent },
      away: { ...prev.away, possession_percent: 100 - homePercent },
    }));
  };

  const handleSaveLiveStats = async () => {
    if (!selectedMatch) return;
    try {
      setIsSavingStats(true);
      await matchApi.updateLiveTelemetryStats(selectedMatch.id, liveStats);
      showToast('آمارهای زنده مسابقه (تله‌متری) ذخیره و مخابره شد 📊', 'success');
      fetchSelectedMatchDetails(selectedMatch.id);
    } catch (err) {
      showToast('خطا در بروزرسانی آمار مسابقه', 'error');
    } finally {
      setIsSavingStats(false);
    }
  };

  // Ejected Players Set (Red Cards)
  const homeRedCardIds = useMemo(() => selectedMatch?.home_red_cards || [], [selectedMatch?.home_red_cards]);
  const awayRedCardIds = useMemo(() => selectedMatch?.away_red_cards || [], [selectedMatch?.away_red_cards]);

  const activeTargetSquad = eventTargetTeam === 'home' ? homePlayers : awayPlayers;
  const availableAssists = activeTargetSquad.filter(p => p.id.toString() !== selectedPlayerId);

  // Countdown timer for scheduled matches (HH:MM:SS until kickoff)
  const [nowTime, setNowTime] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const getCountdown = (dateStr) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - nowTime;
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  return (
    <div className="space-y-6 dir-rtl font-sans text-slate-100 pb-28">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & TOP BANNER
      ───────────────────────────────────────────────────────────── */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 glass-panel p-5 sm:p-6 rounded-3xl border border-slate-700/80 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5 text-xs font-bold font-sport shadow-inner">
              <Radio size={14} className="animate-pulse text-red-500" />
              <span>SUPER ADMIN MATCH CONTROL ROOM & ARBITER HUB</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>مرکز داوری و اتاق فرمان پخش زنده مسابقات</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            مدیریت بلادرنگ تقویم هفتگی، رویدادهای FotMob، تایمر، تعویض‌های مجاز و مخابره همگام به استریم مربیان
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            onClick={() => fetchGameweeksAndFixtures(selectedGameweek)}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border border-slate-700 shadow-sm active:scale-95"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-cyan-400' : ''} />
            <span>بروزرسانی زنده</span>
          </button>

          <button 
            onClick={() => setActiveTab('stream_config')}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Tv size={14} />
            <span>تنظیمات استریم آپارات</span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. GAMEWEEK-BASED MATCHDAY NAVIGATION BAR
      ───────────────────────────────────────────────────────────── */}
      <section className="glass-panel p-4 sm:p-5 rounded-3xl border border-slate-800 bg-slate-950/70 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Calendar size={18} />
            </span>
            <div>
              <span className="text-xs font-bold text-white block">تقویم مسابقات لیگ (هفته به هفته)</span>
              <span className="text-[11px] text-slate-400">
                هفته فعال جاری: <strong className="text-cyan-400 font-sport">{gameweekData.active_gameweek}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-sport">
              نمایش ۸ مسابقه برای {selectedGameweek}
            </span>
          </div>
        </div>

        {/* Gameweek Scrollable Pill Selector (Week 1 to 30) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
          {(gameweekData.gameweeks.length > 0 ? gameweekData.gameweeks : Array.from({ length: 30 }, (_, i) => ({
            round_name: `هفته ${i + 1}`,
            round_number: i + 1,
            is_finished: false,
            is_live: false,
            finished_matches: 0,
            total_matches: 8
          }))).map((gw) => {
            const isSelected = selectedGameweek === gw.round_name;
            const isAutoActive = gameweekData.active_gameweek === gw.round_name;

            return (
              <button
                key={gw.round_name}
                onClick={() => handleGameweekSelect(gw.round_name)}
                className={`px-3.5 py-2 rounded-2xl shrink-0 font-sport text-xs font-black transition-all flex items-center gap-1.5 border relative ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.4)] scale-105 z-10'
                    : gw.is_live
                    ? 'bg-red-950/40 text-red-400 border-red-500/50 hover:bg-red-900/40'
                    : gw.is_finished
                    ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/30 hover:bg-slate-800'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span>{gw.round_name}</span>
                {gw.is_live ? (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                ) : gw.is_finished ? (
                  <span className="text-[10px] text-emerald-400 font-normal">✓</span>
                ) : isAutoActive ? (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">جاری</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Selected Gameweek Fixtures Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {loading ? (
            <div className="col-span-4 py-8 text-center text-slate-500 text-xs">در حال بارگذاری مسابقات...</div>
          ) : gameweekMatches.length === 0 ? (
            <div className="col-span-4 py-8 text-center text-slate-500 text-xs">مسابقه‌ای برای این هفته ثبت نشده است.</div>
          ) : gameweekMatches.map((m, idx) => {
            const isSelected = selectedMatch?.id === m.id;
            const isLive = m.status === 'LIVE';
            const isFinished = m.status === 'FINISHED';
            const isScheduled = m.status === 'SCHEDULED';
            const countdown = isScheduled ? getCountdown(m.date) : null;

            // A match can be entered for control if it's LIVE, or if no other match is LIVE
            // and this is the first SCHEDULED match in the list
            const anyLive = gameweekMatches.some(gm => gm.status === 'LIVE');
            const firstScheduledIdx = gameweekMatches.findIndex(gm => gm.status === 'SCHEDULED');
            const isNextToStart = !anyLive && idx === firstScheduledIdx && !isFinished;

            return (
              <div
                key={m.id}
                onClick={() => {
                  fetchSelectedMatchDetails(m.id);
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative overflow-hidden ${
                  isSelected
                    ? 'bg-purple-950/60 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)] ring-1 ring-purple-400'
                    : isLive
                    ? 'bg-red-950/30 border-red-500/60 hover:bg-red-950/50'
                    : isNextToStart
                    ? 'bg-amber-950/20 border-amber-500/50 hover:bg-amber-950/40'
                    : isFinished
                    ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 opacity-70'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {/* Status Strip */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`px-2 py-0.5 rounded-md font-black font-sport flex items-center gap-1 ${
                    isLive ? 'bg-red-500 text-white animate-pulse'
                    : isFinished ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : isNextToStart ? 'bg-amber-500/30 text-amber-300 border border-amber-500/60'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {isLive ? '🔴 LIVE' : isFinished ? 'FT' : isNextToStart ? '⚡ در نوبت' : `بازی ${idx + 1}`}
                  </span>

                  <span className="text-slate-400 font-sport dir-ltr text-[10px]">
                    {m.date ? new Date(m.date).toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </span>
                </div>

                {/* Score & Logos Clash */}
                <div className="flex items-center justify-between gap-2 py-1">
                  {/* Home */}
                  <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center shadow-sm">
                      {getTeamLogoUrl(m.home_team_logo || m.home_team_name) ? (
                        <img src={getTeamLogoUrl(m.home_team_logo || m.home_team_name)} alt={m.home_team_name} className="w-full h-full object-contain" />
                      ) : <Shield size={16} className="text-slate-800" />}
                    </div>
                    <span className="font-bold text-xs text-white truncate">{m.home_team_name}</span>
                  </div>

                  {/* Score / Countdown */}
                  <div className="font-sport font-black text-sm text-white px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 shrink-0 text-center">
                    {isScheduled && countdown ? (
                      <span className="text-amber-300 text-[11px] font-black">{countdown}</span>
                    ) : (
                      <span>{m.home_score ?? 0} : {m.away_score ?? 0}</span>
                    )}
                  </div>

                  {/* Away */}
                  <div className="flex items-center gap-2 flex-1 justify-end overflow-hidden">
                    <span className="font-bold text-xs text-white truncate text-right">{m.away_team_name}</span>
                    <div className="w-8 h-8 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center shadow-sm">
                      {getTeamLogoUrl(m.away_team_logo || m.away_team_name) ? (
                        <img src={getTeamLogoUrl(m.away_team_logo || m.away_team_name)} alt={m.away_team_name} className="w-full h-full object-contain" />
                      ) : <Shield size={16} className="text-slate-800" />}
                    </div>
                  </div>
                </div>

                {/* Footer Badges */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/60">
                  <span className={m.home_lineup_ready && m.away_lineup_ready ? 'text-emerald-400' : 'text-amber-400'}>
                    {m.home_lineup_ready && m.away_lineup_ready ? '✓ ۲ ترکیب آماده' : '⏳ در انتظار ترکیب'}
                  </span>
                  <span className={`font-bold flex items-center gap-1 ${
                    isSelected ? 'text-purple-400' : isLive ? 'text-red-400' : 'text-cyan-400'
                  }`}>
                    {isSelected ? 'در حال مدیریت ●' : isLive ? 'وارد کنترل شو →' : isFinished ? 'مشاهده جزئیات' : 'انتخاب و شروع →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN DESK (Active Match Command Arena)
      ───────────────────────────────────────────────────────────── */}
      {selectedMatch ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Column: Scoreboard, Clock/Period Controls, FotMob Actions & Pitch */}
          <div className="lg:col-span-8 space-y-6">
            {/* 3.1 FotMob Authoritative Scoreboard */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 bg-gradient-to-b from-slate-900/90 to-slate-950/90 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-all active:scale-95"
                  >
                    <ChevronRight size={14} />
                    <span>بازگشت به نمای کلی هفته</span>
                  </button>
                  <span className={`px-3 py-1 rounded-xl text-xs font-black font-sport ${
                    selectedMatch.status === 'LIVE' 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : selectedMatch.status === 'FINISHED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}>
                    {selectedMatch.status === 'LIVE' ? '🔴 LIVE ON AIR' : selectedMatch.status === 'FINISHED' ? 'FT FINISHED' : 'SCHEDULED'}
                  </span>
                  <span className="text-xs text-slate-300 font-bold">{selectedMatch.round_name || selectedGameweek}</span>
                </div>

                {/* Clock Synchronization Pill */}
                <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-1.5 rounded-2xl border border-slate-700 text-xs font-sport">
                  <Clock size={14} className={isClockRunning ? 'text-cyan-400 animate-spin' : 'text-slate-400'} />
                  <span className="font-black text-cyan-300">{formattedMatchClock}</span>
                  {stoppageTime > 0 && (
                    <span className="text-[10px] text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800">
                      +{stoppageTime}'
                    </span>
                  )}
                </div>
              </div>

              {/* Central Stadium Clash Arena */}
              <div className="grid grid-cols-3 items-center py-4 px-2 sm:px-8 bg-slate-950/60 rounded-2xl border border-slate-800/80 shadow-inner mb-6">
                {/* Home Club */}
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2 shadow-xl flex items-center justify-center relative">
                    {getTeamLogoUrl(selectedMatch.home_team_logo || selectedMatch.home_team_name) ? (
                      <img src={getTeamLogoUrl(selectedMatch.home_team_logo || selectedMatch.home_team_name)} alt={selectedMatch.home_team_name} className="w-full h-full object-contain" />
                    ) : <Shield size={32} className="text-slate-800" />}
                    {homeRedCardIds.length > 0 && (
                      <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-600 text-white rounded-md text-[10px] font-black border border-white">
                        {11 - homeRedCardIds.length} نفر
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-sm sm:text-base text-white">{selectedMatch.home_team_name}</h3>
                  <span className="text-[11px] text-slate-400 font-sport">@{selectedMatch.home_coach_name || 'مربی'}</span>
                  
                  {/* Lineup & Preset Indicator */}
                  <div className="flex flex-col items-center gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 font-sport ${
                      selectedMatch.home_lineup_ready || homeGameplan?.is_submitted
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                        : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                    }`}>
                      {selectedMatch.home_lineup_ready || homeGameplan?.is_submitted ? '✓ ترکیب ارسال شده' : '⏳ ترکیب پیش‌فرض'}
                    </span>

                    {(homeGameplan?.preset_name || selectedMatch.home_preset_name) && (
                      <span className="text-[10px] bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-lg font-black flex items-center gap-1 shadow-sm">
                        <span>⚡ تاکتیک ساده:</span>
                        <strong className="text-white">{homeGameplan?.preset_name || selectedMatch.home_preset_name}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="bg-slate-900 text-cyan-400 px-2 py-0.5 rounded border border-cyan-900/50">
                      تعویض: {selectedMatch.home_subs_count || 0}/5
                    </span>
                    <span className="bg-slate-900 text-purple-400 px-2 py-0.5 rounded border border-purple-900/50">
                      پنجره: {selectedMatch.home_sub_windows_used || 0}/3
                    </span>
                  </div>
                </div>

                {/* Score Clash */}
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-3 sm:gap-5 font-sport font-black text-4xl sm:text-6xl text-white tracking-widest">
                    <span className="text-cyan-400">{selectedMatch.home_score ?? 0}</span>
                    <span className="text-slate-600">:</span>
                    <span className="text-purple-400">{selectedMatch.away_score ?? 0}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 font-sport">
                    STATUS: {selectedMatch.half_status || '1ST_HALF'}
                  </span>
                </div>

                {/* Away Club */}
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2 shadow-xl flex items-center justify-center relative">
                    {getTeamLogoUrl(selectedMatch.away_team_logo || selectedMatch.away_team_name) ? (
                      <img src={getTeamLogoUrl(selectedMatch.away_team_logo || selectedMatch.away_team_name)} alt={selectedMatch.away_team_name} className="w-full h-full object-contain" />
                    ) : <Shield size={32} className="text-slate-800" />}
                    {awayRedCardIds.length > 0 && (
                      <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-600 text-white rounded-md text-[10px] font-black border border-white">
                        {11 - awayRedCardIds.length} نفر
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-sm sm:text-base text-white">{selectedMatch.away_team_name}</h3>
                  <span className="text-[11px] text-slate-400 font-sport">@{selectedMatch.away_coach_name || 'مربی'}</span>

                  {/* Lineup & Preset Indicator */}
                  <div className="flex flex-col items-center gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 font-sport ${
                      selectedMatch.away_lineup_ready || awayGameplan?.is_submitted
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                        : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                    }`}>
                      {selectedMatch.away_lineup_ready || awayGameplan?.is_submitted ? '✓ ترکیب ارسال شده' : '⏳ ترکیب پیش‌فرض'}
                    </span>

                    {(awayGameplan?.preset_name || selectedMatch.away_preset_name) && (
                      <span className="text-[10px] bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-lg font-black flex items-center gap-1 shadow-sm">
                        <span>⚡ تاکتیک ساده:</span>
                        <strong className="text-white">{awayGameplan?.preset_name || selectedMatch.away_preset_name}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="bg-slate-900 text-cyan-400 px-2 py-0.5 rounded border border-cyan-900/50">
                      تعویض: {selectedMatch.away_subs_count || 0}/5
                    </span>
                    <span className="bg-slate-900 text-purple-400 px-2 py-0.5 rounded border border-purple-900/50">
                      پنجره: {selectedMatch.away_sub_windows_used || 0}/3
                    </span>
                  </div>
                </div>
              </div>

              {/* 3.2 Period & Match Clock Arbiter Controls */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Sliders size={14} className="text-cyan-400" />
                    <span>کنترل دوره‌ها و سوت داور:</span>
                  </span>
                  <span className="text-[11px] text-slate-400">وضعیت فعلی: {selectedMatch.half_status}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    onClick={() => handleControlAction('START_MATCH', { minute: 1 })}
                    className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-2xl text-xs font-black transition-all shadow-md active:scale-95"
                  >
                    <Play size={14} />
                    <span>شروع نیمه اول (1st Half)</span>
                  </button>

                  <button
                    onClick={() => handleControlAction('TRIGGER_HALF_TIME')}
                    className="flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white p-3 rounded-2xl text-xs font-black transition-all shadow-md active:scale-95"
                  >
                    <Pause size={14} />
                    <span>پایان نیمه اول (Half-Time)</span>
                  </button>

                  <button
                    onClick={() => handleControlAction('START_SECOND_HALF', { minute: 46 })}
                    className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-2xl text-xs font-black transition-all shadow-md active:scale-95"
                  >
                    <Play size={14} />
                    <span>شروع نیمه دوم (2nd Half)</span>
                  </button>

                  <button
                    onClick={() => handleControlAction('CONCLUDE_FULL_TIME')}
                    className="flex items-center justify-center gap-1.5 bg-rose-700 hover:bg-rose-600 text-white p-3 rounded-2xl text-xs font-black transition-all shadow-md active:scale-95"
                  >
                    <Square size={14} />
                    <span>پایان مسابقه (Full-Time)</span>
                  </button>
                </div>

                {/* Stoppage Time Pills (+1..+5) */}
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-300 ml-2">افزودن وقت اضافه:</span>
                  {[1, 2, 3, 4, 5, 6, 7].map(num => (
                    <button
                      key={num}
                      onClick={() => handleSetStoppage(num)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold font-sport transition-all ${
                        stoppageTime === num 
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      +{num} دقیقه
                    </button>
                  ))}
                  {stoppageTime > 0 && (
                    <button
                      onClick={() => handleSetStoppage(0)}
                      className="px-3 py-1 rounded-xl text-xs text-red-400 bg-red-950/60 hover:bg-red-900/60 border border-red-800 font-bold"
                    >
                      حذف وقت اضافه
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 3.3 FotMob-Style Rapid Event Action Room */}
            <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-700/80 bg-slate-950/70 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <PlusCircle size={18} />
                  </span>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-white">ثبت سریع وقایع مسابقه (FotMob Rapid Event Logger)</h3>
                    <p className="text-[11px] text-slate-400">ثبت گل، پاس گل، کارت‌ها، تعویض‌های مجاز و بازبینی VAR با یک کلیک</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons Grid for Home and Away */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Home Team Rapid Actions */}
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2.5">
                  <div className="flex items-center justify-between font-bold text-xs text-cyan-400 border-b border-cyan-900/40 pb-2">
                    <span>{selectedMatch.home_team_name} (میزبان)</span>
                    <span className="font-sport text-[10px]">تعویض: {selectedMatch.home_subs_count || 0}/5</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openEventModal('GOAL', 'home')}
                      className="p-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>⚽</span>
                      <span>ثبت گل</span>
                    </button>

                    <button
                      onClick={() => openEventModal('PENALTY', 'home')}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold transition-all border border-slate-700 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>🎯</span>
                      <span>پنالتی</span>
                    </button>

                    <button
                      onClick={() => openEventModal('YELLOW', 'home')}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold transition-all border border-slate-700 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>🟨</span>
                      <span>کارت زرد</span>
                    </button>

                    <button
                      onClick={() => openEventModal('RED', 'home')}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-xl text-xs font-bold transition-all border border-slate-700 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>🟥</span>
                      <span>کارت قرمز مستقیم</span>
                    </button>

                    <button
                      onClick={() => openEventModal('SUB', 'home')}
                      disabled={(selectedMatch.home_subs_count || 0) >= 5}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-300 rounded-xl text-xs font-bold transition-all border border-slate-700 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <ArrowRightLeft size={13} />
                      <span>تعویض بازیکن</span>
                    </button>

                    <button
                      onClick={() => openEventModal('OWN_GOAL', 'home')}
                      className="p-2.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 rounded-xl text-xs font-bold transition-all border border-rose-800 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>🤦‍♂️</span>
                      <span>گل به خودی (OG)</span>
                    </button>
                  </div>
                </div>

                {/* Away Team Rapid Actions */}
                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2.5">
                  <div className="flex items-center justify-between font-bold text-xs text-purple-400 border-b border-purple-900/40 pb-2">
                    <span>{selectedMatch.away_team_name} (میهمان)</span>
                    <span className="font-sport text-[10px]">تعویض: {selectedMatch.away_subs_count || 0}/5</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openEventModal('GOAL', 'away')}
                      className="p-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>⚽</span>
                      <span>ثبت گل</span>
                    </button>

                    <button
                      onClick={() => openEventModal('PENALTY', 'away')}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold transition-all border border-slate-700 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>🎯</span>
                      <span>پنالتی</span>
                    </button>

                    <button
                      onClick={() => openEventModal('YELLOW', 'away')}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold transition-all border border-slate-700 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>🟨</span>
                      <span>کارت زرد</span>
                    </button>

                    <button
                      onClick={() => openEventModal('RED', 'away')}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-xl text-xs font-bold transition-all border border-slate-700 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>🟥</span>
                      <span>کارت قرمز مستقیم</span>
                    </button>

                    <button
                      onClick={() => openEventModal('SUB', 'away')}
                      disabled={(selectedMatch.away_subs_count || 0) >= 5}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-300 rounded-xl text-xs font-bold transition-all border border-slate-700 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <ArrowRightLeft size={13} />
                      <span>تعویض بازیکن</span>
                    </button>

                    <button
                      onClick={() => openEventModal('OWN_GOAL', 'away')}
                      className="p-2.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 rounded-xl text-xs font-bold transition-all border border-rose-800 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>🤦‍♂️</span>
                      <span>گل به خودی (OG)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* VAR Global Quick Trigger */}
              <div className="pt-2">
                <button
                  onClick={() => openEventModal('VAR', 'home')}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600/30 via-slate-800 to-amber-600/30 hover:from-amber-600/50 hover:to-amber-600/50 border border-amber-500/50 text-amber-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Eye size={16} />
                  <span>🖥️ بازبینی صحنه توسط VAR (ابطال گل، رد پنالتی، تجدیدنظر کارت)</span>
                </button>
              </div>
            </div>

            {/* 3.4 Dual Tactical Pitch & Incoming Coach Sub Requests Desk */}
            <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-700/80 bg-slate-950/70 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Users size={18} />
                  </span>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-white">ترکیب‌ها، چیدمان تاکتیکی و درخواست‌های تعویض مربیان</h3>
                    <p className="text-[11px] text-slate-400">نظارت بر ۱۱ بازیکن اصلی، نیمکت ذخیره‌ها و تایید تعویض‌های زنده</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setTacticalTeamTab('home')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      tacticalTeamTab === 'home' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{selectedMatch.home_team_name}</span>
                    {homeGameplan?.preset_name && (
                      <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black">
                        ⚡ {homeGameplan.preset_name}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setTacticalTeamTab('away')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      tacticalTeamTab === 'away' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{selectedMatch.away_team_name}</span>
                    {awayGameplan?.preset_name && (
                      <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black">
                        ⚡ {awayGameplan.preset_name}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Pending Coach Sub Requests Alert Box */}
              {selectedMatch.substitution_requests && selectedMatch.substitution_requests.filter(r => r.status === 'PENDING').length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/60 space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-black">
                    <AlertTriangle size={16} className="animate-pulse" />
                    <span>درخواست تعویض زنده ارسال‌شده توسط مربی:</span>
                  </div>

                  {selectedMatch.substitution_requests.filter(r => r.status === 'PENDING').map(req => (
                    <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div>
                        <span className="font-bold text-xs text-white block">{req.team_name}:</span>
                        <div className="text-[11px] text-slate-300 flex items-center gap-2 mt-1">
                          <span className="text-red-400">خروج: {req.player_out_name} ({req.player_out_pos})</span>
                          <span>⬅️</span>
                          <span className="text-emerald-400">ورود: {req.player_in_name} ({req.player_in_pos})</span>
                          <span className="text-slate-500">| دقیقه {req.minute || matchMinutes}'</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveSubRequest(req.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow active:scale-95"
                        >
                          <UserCheck size={14} />
                          <span>تایید و اعمال</span>
                        </button>
                        <button
                          onClick={() => handleRejectSubRequest(req.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 text-xs font-bold transition-all border border-slate-700 active:scale-95"
                        >
                          <UserX size={14} />
                          <span>رد</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tactical Pitch 2D Visualization */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* 2D Pitch Box */}
                <div className="md:col-span-8 aspect-[16/10] bg-emerald-950/80 rounded-2xl border-2 border-emerald-500/40 relative overflow-hidden flex flex-col justify-between p-4 shadow-inner">
                  {/* Pitch Markings */}
                  <div className="absolute inset-0 border-2 border-white/15 m-2 rounded-xl pointer-events-none"></div>
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20 pointer-events-none"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/20 pointer-events-none"></div>

                  {/* Starting Players on Pitch */}
                  <div className="relative z-10 w-full h-full flex flex-col justify-between">
                    {/* Header Badges: Formation + Simple Preset Indicator */}
                    {(() => {
                      const activeGp = tacticalTeamTab === 'home' ? homeGameplan : awayGameplan;
                      const hasPreset = Boolean(activeGp?.preset_name);
                      return (
                        <div className="flex flex-wrap items-center gap-2 self-start">
                          <div className="text-[10.5px] text-emerald-300 font-bold bg-black/60 px-2.5 py-1 rounded-lg border border-emerald-500/40 font-sport shadow">
                            سیستم: {activeGp?.formation || '4-3-3 (4-2-1-3)'}
                          </div>
                          {hasPreset ? (
                            <div className="text-[10px] bg-gradient-to-r from-amber-950/90 to-orange-950/90 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/60 font-black flex items-center gap-1.5 shadow">
                              <span>⚡ سبک ساده:</span>
                              <strong className="text-white">{activeGp.preset_name}</strong>
                              <span className="text-[9px] bg-amber-500/20 text-amber-200 px-1.5 py-0.2 rounded border border-amber-500/30">
                                {activeGp.has_custom_player_edits ? 'با جابجایی دستی بازیکنان' : 'چیدمان خودکار هوشمند'}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[10px] bg-slate-900/80 text-slate-300 px-2 py-1 rounded-lg border border-slate-700 font-bold">
                              🎯 تاکتیک دستی پیشرفته
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  {/* Nodes Cluster - Starting XI from Coach's submitted lineup */}
                  {(() => {
                    const squad = tacticalTeamTab === 'home' ? homePlayers : awayPlayers;
                    const redCards = tacticalTeamTab === 'home' ? homeRedCardIds : awayRedCardIds;
                    const startingXI = squad.filter(p => p.is_starting === true).slice(0, 11);

                    if (startingXI.length === 0) {
                      return (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center text-emerald-300/50 text-xs">
                            <p className="font-bold text-sm">⏳ ترکیب هنوز ارسال نشده</p>
                            <p className="text-[11px] mt-1">مربی باید گیم‌پلن خود را ارسال کند</p>
                          </div>
                        </div>
                      );
                    }

                    // Group players by position row: GK, DEF, MID, FWD
                    const positionOrder = { GK: 0, CB: 1, LB: 1, RB: 1, LWB: 1, RWB: 1, CDM: 2, CM: 2, CAM: 2, LM: 2, RM: 2, LW: 3, RW: 3, ST: 3, CF: 3, SS: 3 };
                    const rows = [[], [], [], []];
                    startingXI.forEach(p => {
                      const pos = (p.position || 'CM').toUpperCase();
                      const row = pos === 'GK' ? 0 : positionOrder[pos] !== undefined ? positionOrder[pos] : 2;
                      rows[row].push(p);
                    });

                    // Render 4 rows from GK (bottom) to FWD (top) using reversed so GK shows at bottom of pitch
                    return rows.map((rowPlayers, rowIdx) => {
                      if (rowPlayers.length === 0) return null;
                      return (
                        <div key={rowIdx} className={`flex justify-center gap-3 ${rowIdx === 0 ? 'mt-auto' : ''}`}>
                          {rowPlayers.map(p => {
                            const isRedCarded = redCards.includes(p.id);
                            return (
                              <div
                                key={p.id}
                                className={`flex flex-col items-center text-center transition-all ${
                                  isRedCarded ? 'opacity-30' : ''
                                }`}
                              >
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-sport font-black text-xs shadow-md border-2 relative ${
                                  isRedCarded
                                    ? 'bg-red-700 text-white border-red-400'
                                    : tacticalTeamTab === 'home'
                                    ? 'bg-cyan-500 text-slate-950 border-cyan-200'
                                    : 'bg-purple-500 text-white border-purple-200'
                                }`}>
                                  {isRedCarded && (
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] flex items-center justify-center text-white">🟥</span>
                                  )}
                                  {p.shirt_number || p.position?.slice(0,2) || '?'}
                                </div>
                                <span className="text-[9px] font-bold text-white bg-black/70 px-1 py-0.5 rounded mt-1 max-w-[56px] truncate leading-tight">
                                  {p.name?.split(' ').pop()}
                                </span>
                                <span className="text-[8px] text-slate-400">{p.position}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    });
                  })()}

                    <div className="text-[10px] text-slate-300 self-end bg-black/40 px-2 py-0.5 rounded-md">
                      🟢 در زمین: {11 - (tacticalTeamTab === 'home' ? homeRedCardIds.length : awayRedCardIds.length)} نفر
                    </div>
                  </div>
                </div>

                {/* Bench & Substitutes Column */}
                <div className="md:col-span-4 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col gap-2 max-h-[340px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white">نیمکت ذخیره‌ها</span>
                    <span className="text-[10px] text-slate-400 font-sport">
                      {(tacticalTeamTab === 'home' ? homePlayers : awayPlayers).filter(p => !p.is_starting).length} نفر
                    </span>
                  </div>
                  {(tacticalTeamTab === 'home' ? homePlayers : awayPlayers)
                    .filter(p => p.is_starting === false)
                    .map(p => (
                      <div key={p.id} className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-slate-950/80 border border-slate-800/60 gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            tacticalTeamTab === 'home' ? 'bg-cyan-800 text-cyan-200' : 'bg-purple-800 text-purple-200'
                          }`}>
                            {p.shirt_number || p.position?.slice(0,1)}
                          </div>
                          <span className="text-white font-bold truncate">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-slate-500 font-sport text-[10px]">{p.position}</span>
                          <span className="text-amber-400 font-sport font-bold text-[10px]">OVR {p.overall}</span>
                        </div>
                      </div>
                    ))}
                  {(tacticalTeamTab === 'home' ? homePlayers : awayPlayers).filter(p => !p.is_starting).length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">نیمکت خالی است</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Side Column: FotMob Graphic Match Timeline & Live Telemetry Desk */}
          <div className="lg:col-span-4 space-y-6">
            {/* 3.5 FotMob Visual Graphic Timeline */}
            <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 bg-slate-950/70 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Activity size={16} />
                  </span>
                  <h3 className="font-bold text-sm text-white">تایم‌لاین زنده مسابقه (FotMob Timeline)</h3>
                </div>
                <span className="text-[11px] text-cyan-400 font-sport">
                  {selectedMatch.events ? selectedMatch.events.length : 0} رویداد
                </span>
              </div>

              {/* Timeline Feed */}
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                {selectedMatch.events && selectedMatch.events.length > 0 ? (
                  selectedMatch.events.map(ev => {
                    const isHome = ev.player_team_id === selectedMatch.home_team;
                    const icon = ev.event_type === 'GOAL' ? '⚽' 
                      : ev.event_type === 'OWN_GOAL' ? '🤦‍♂️' 
                      : ev.event_type === 'PENALTY_SCORED' ? '🎯'
                      : ev.event_type === 'PENALTY_MISSED' ? '❌'
                      : ev.event_type === 'YELLOW' ? '🟨'
                      : ev.event_type === 'SECOND_YELLOW' ? '🟨🟥'
                      : ev.event_type === 'RED' ? '🟥'
                      : ev.event_type === 'SUB_IN' ? '🔄'
                      : ev.event_type === 'SUB_OUT' ? '⬅️'
                      : ev.event_type === 'VAR' ? '🖥️'
                      : '📢';

                    return (
                      <div 
                        key={ev.id}
                        className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-2.5 ${
                          ev.event_type.includes('GOAL')
                            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                            : ev.event_type.includes('RED') || ev.event_type === 'SECOND_YELLOW'
                            ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                            : ev.event_type === 'VAR'
                            ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 overflow-hidden">
                          <span className="font-sport font-black text-xs px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-white shrink-0">
                            {ev.minute}'
                          </span>
                          <span className="text-base shrink-0">{icon}</span>
                          <div className="truncate">
                            <span className="font-bold text-xs text-white block truncate">
                              {ev.player_name || ev.detail || 'رویداد داوری'}
                            </span>
                            {ev.assist_player_name && (
                              <span className="text-[10px] text-emerald-400 block truncate">
                                پاس گل: {ev.assist_player_name}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 truncate block">
                              {ev.detail || ev.event_type_display} • {ev.team_name || (isHome ? selectedMatch.home_team_name : selectedMatch.away_team_name)}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          title="حذف/ابطال رویداد"
                          className="text-slate-500 hover:text-red-400 p-1 transition-colors shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    هنوز رویدادی برای این مسابقه ثبت نشده است.
                  </div>
                )}
              </div>
            </div>

            {/* 3.6 Live Match Telemetry Statistics Counter Desk */}
            <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 bg-slate-950/70 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <Sliders size={16} />
                  </span>
                  <h3 className="font-bold text-sm text-white">آمار زنده مسابقه (تله‌متری)</h3>
                </div>
                <button
                  onClick={handleSaveLiveStats}
                  disabled={isSavingStats}
                  className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1 active:scale-95"
                >
                  <Send size={12} />
                  <span>{isSavingStats ? 'در حال ثبت...' : 'مخابره آمار'}</span>
                </button>
              </div>

              {/* Possession Dual Slider */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-cyan-400">{liveStats.home.possession_percent}% {selectedMatch.home_team_name?.slice(0, 8)}</span>
                  <span className="text-slate-400">مالکیت توپ</span>
                  <span className="text-purple-400">{selectedMatch.away_team_name?.slice(0, 8)} {liveStats.away.possession_percent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={liveStats.home.possession_percent}
                  onChange={(e) => handlePossessionChange(e.target.value)}
                  className="w-full h-2 bg-purple-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Stepper Counters for Telemetry */}
              <div className="space-y-2 text-xs">
                {[
                  { label: 'ضربات در چارچوب', key: 'shots_on_target' },
                  { label: 'کل شوت‌ها', key: 'shots' },
                  { label: 'خطاها', key: 'fouls' },
                  { label: 'کرنرها', key: 'corners' },
                  { label: 'آفسایدها', key: 'offsides' },
                  { label: 'مهارهای دروازه‌بان (Saves)', key: 'saves' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800/60">
                    {/* Home Side +/- */}
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleStatIncrement('home', item.key, -1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 flex items-center justify-center text-xs"
                      >-</button>
                      <span className="font-sport font-black text-cyan-400 w-5 text-center">{liveStats.home[item.key] || 0}</span>
                      <button 
                        onClick={() => handleStatIncrement('home', item.key, 1)}
                        className="w-6 h-6 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 flex items-center justify-center text-xs"
                      >+</button>
                    </div>

                    <span className="text-[11px] text-slate-300 font-medium">{item.label}</span>

                    {/* Away Side +/- */}
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleStatIncrement('away', item.key, 1)}
                        className="w-6 h-6 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-500 flex items-center justify-center text-xs"
                      >+</button>
                      <span className="font-sport font-black text-purple-400 w-5 text-center">{liveStats.away[item.key] || 0}</span>
                      <button 
                        onClick={() => handleStatIncrement('away', item.key, -1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 flex items-center justify-center text-xs"
                      >-</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ─── GAMEWEEK OVERVIEW / MATCH SELECTION PROMPT ───
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-slate-800/80 bg-slate-950/60 shadow-xl">
          <div className="flex flex-col items-center text-center gap-4 max-w-md mx-auto">
            <div className="p-4 rounded-3xl bg-gradient-to-br from-purple-600/20 to-cyan-600/20 border border-purple-500/30">
              <Trophy size={52} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white mb-2">نمای کلی {selectedGameweek}</h2>
              <p className="text-sm text-slate-300 font-bold">
                برای ورود به اتاق فرمان، یک مسابقه را از لیست بالا انتخاب کنید.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                مسابقاتی که در حال برگزاری هستند با نشانگر 🔴 LIVE مشخص شده‌اند.
                بازی‌های منتظر، به ترتیب از اولین مسابقه هفته شروع خواهند شد.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full mt-2">
              <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/30 text-center">
                <span className="text-xl font-black text-red-400 font-sport block">
                  {gameweekMatches.filter(m => m.status === 'LIVE').length}
                </span>
                <span className="text-[11px] text-red-300">🔴 زنده</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700 text-center">
                <span className="text-xl font-black text-amber-400 font-sport block">
                  {gameweekMatches.filter(m => m.status === 'SCHEDULED').length}
                </span>
                <span className="text-[11px] text-amber-300">⏳ در انتظار</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center">
                <span className="text-xl font-black text-emerald-400 font-sport block">
                  {gameweekMatches.filter(m => m.status === 'FINISHED').length}
                </span>
                <span className="text-[11px] text-emerald-300">✓ پایان یافته</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. APARAT LIVE STREAM SETTINGS MODAL/TAB
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'stream_config' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
          <div className="lg:col-span-6 glass-panel p-6 rounded-3xl border border-slate-700/80 bg-slate-950/70 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-lg text-white">تنظیمات لینک پخش زنده آپارات</h3>
              <button 
                onClick={() => setActiveTab('live_desk')} 
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕ بستن
              </button>
            </div>

            <p className="text-xs text-slate-400">
              لینک Embed پخش زنده کانال آپارات مستر لیگ را در این کادر قرار دهید تا به صورت خودکار در پنل زنده تمامی مربیان اعمال گردد.
            </p>

            <div>
              <label className="text-xs text-slate-300 font-bold block mb-2">لینک Embed آپارات</label>
              <input
                type="text"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                dir="ltr"
                placeholder="https://www.aparat.com/embed/live/..."
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white text-xs font-mono"
              />
            </div>

            <button
              onClick={() => showToast('لینک استریم با موفقیت بروزرسانی شد', 'success')}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-3 rounded-2xl font-bold text-xs transition-all shadow-lg active:scale-95"
            >
              ذخیره و انتشار استریم
            </button>
          </div>

          <div className="lg:col-span-6 glass-panel p-6 rounded-3xl border border-slate-700/80 bg-slate-950/70">
            <h3 className="font-black text-lg text-white mb-3">پیش‌نمایش زنده استریم</h3>
            <div className="aspect-video w-full rounded-2xl bg-black border border-slate-800 overflow-hidden relative shadow-2xl">
              <iframe
                src={streamUrl}
                title="Aparat Stream Preview"
                className="w-full h-full border-0"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. FOTMOB RAPID EVENT RECORDING MODAL
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {eventModalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl space-y-4"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {eventModalType === 'GOAL' ? '⚽' : eventModalType === 'PENALTY' ? '🎯' : eventModalType === 'YELLOW' ? '🟨' : eventModalType === 'RED' ? '🟥' : eventModalType === 'SUB' ? '🔄' : '🖥️'}
                  </span>
                  <h3 className="font-black text-base text-white">
                    {eventModalType === 'GOAL' ? 'ثبت گل' : eventModalType === 'OWN_GOAL' ? 'ثبت گل به خودی (OG)' : eventModalType === 'PENALTY' ? 'ثبت ضربه پنالتی' : eventModalType === 'YELLOW' ? 'ثبت کارت زرد' : eventModalType === 'RED' ? 'ثبت کارت قرمز مستقیم' : eventModalType === 'SUB' ? 'ثبت تعویض بازیکن' : 'بررسی صحنه توسط VAR'}
                  </h3>
                </div>
                <button
                  onClick={() => setEventModalType(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Fields */}
              <div className="space-y-3 text-xs">
                {/* Minute Selector */}
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">دقیقه رویداد</label>
                  <input
                    type="number"
                    value={eventMinuteInput}
                    onChange={(e) => setEventMinuteInput(e.target.value)}
                    min="1"
                    max="120"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-sport"
                  />
                </div>

                {/* Sub Modals vs Standard Player Selector */}
                {eventModalType === 'SUB' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-red-400 block mb-1 font-bold">بازیکن خروجی (Player OUT)</label>
                      <select
                        value={subOutPlayerId}
                        onChange={(e) => setSubOutPlayerId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      >
                        {activeTargetSquad.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.position}) {p.suspension_matches > 0 || p.is_suspended ? '• 🟥 محروم' : p.is_starting ? '• فیکس' : '• نیمکت'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-emerald-400 block mb-1 font-bold">بازیکن ورودی (Player IN)</label>
                      <select
                        value={subInPlayerId}
                        onChange={(e) => setSubInPlayerId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      >
                        {activeTargetSquad.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.position}) {p.suspension_matches > 0 || p.is_suspended ? '• 🟥 محروم' : !p.is_starting ? '• نیمکت' : '• فیکس'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-slate-400 block mb-1 font-bold">
                        {eventModalType === 'GOAL' ? 'بازیکن گلزن' : eventModalType === 'OWN_GOAL' ? 'بازیکن زننده گل به خودی' : eventModalType === 'PENALTY' ? 'پنالتی‌زن' : 'بازیکن مورد نظر'}
                      </label>
                      <select
                        value={selectedPlayerId}
                        onChange={(e) => setSelectedPlayerId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      >
                        <option value="">-- انتخاب بازیکن --</option>
                        {activeTargetSquad.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.position}) {p.suspension_matches > 0 || p.is_suspended ? '• 🟥 محروم' : p.is_starting ? '• فیکس' : '• نیمکت'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Optional Assist for Goal */}
                    {eventModalType === 'GOAL' && (
                      <div>
                        <label className="text-emerald-400 block mb-1 font-bold">پاسور گل (اختیاری)</label>
                        <select
                          value={selectedAssistId}
                          onChange={(e) => setSelectedAssistId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        >
                          <option value="">-- بدون پاس گل --</option>
                          {availableAssists.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.position})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Penalty Status */}
                    {eventModalType === 'PENALTY' && (
                      <div>
                        <label className="text-slate-400 block mb-1 font-bold">نتیجه ضربه پنالتی</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPenaltyOutcome('SCORED')}
                            className={`py-2 rounded-xl font-bold transition-all ${
                              penaltyOutcome === 'SCORED' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'
                            }`}
                          >
                            🎯 گل شد (Scored)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPenaltyOutcome('MISSED')}
                            className={`py-2 rounded-xl font-bold transition-all ${
                              penaltyOutcome === 'MISSED' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400'
                            }`}
                          >
                            ❌ مهار شد / از دست رفت
                          </button>
                        </div>
                      </div>
                    )}

                    {/* VAR Decision Selector */}
                    {eventModalType === 'VAR' && (
                      <div className="space-y-2">
                        <label className="text-amber-400 block font-bold">نوع تصمیم VAR</label>
                        <select
                          value={varDecisionType}
                          onChange={(e) => setVarDecisionType(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        >
                          <option value="GOAL_DISALLOWED">❌ گل مردود شد (Goal Disallowed - کسر امتیاز)</option>
                          <option value="PENALTY_OVERTURNED">🚫 لغو پنالتی اعلام شده (Penalty Overturned)</option>
                          <option value="CARD_REVIEW">🟨🟥 بازبینی و تغییر کارت داور</option>
                          <option value="GENERAL">📢 اعلام تایید صحنه پس از چک VAR</option>
                        </select>
                      </div>
                    )}

                    {/* Custom Detail Notes */}
                    <div>
                      <label className="text-slate-400 block mb-1">توضیحات تکمیلی رویداد (اختیاری)</label>
                      <input
                        type="text"
                        value={eventDetailText}
                        onChange={(e) => setEventDetailText(e.target.value)}
                        placeholder="مثال: شوت سرکش از پشت محوطه، خطای هند در محوطه..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={handleRecordEventSubmit}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-xs"
                >
                  ثبت و انتشار فوری در استریم
                </button>
                <button
                  onClick={() => setEventModalType(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
                >
                  انصراف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
