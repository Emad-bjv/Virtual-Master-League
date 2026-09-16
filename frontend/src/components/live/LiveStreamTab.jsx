import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Tv, Radio, Activity, CheckCircle2, Sliders, X, Shield, Clock, Timer, Lock, Info, Play, AlertCircle, RefreshCw, ArrowLeftRight, Check, CheckCircle, AlertTriangle, Layers, ListChecks, ChevronUp, ChevronDown, Zap, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EFootballGamePlan from '../team/EFootballGamePlan';
import LiveMatchStandby from './LiveMatchStandby';
import PostMatchRecapView from './PostMatchRecapView';
import api, { matchApi, teamApi } from '../../services/api';
import { setScreenKeepAwake } from '../../services/nativeApp';
import CustomSelect from '../common/CustomSelect';
import { TACTICAL_GUIDES } from '../../utils/tacticalGuides';
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
  const [isRecapFinished, setIsRecapFinished] = useState(false);

  // Active Match State
  const [activeMatch, setActiveMatch] = useState(null);
  const [events, setEvents] = useState(liveEvents);
  const [rawMatchEvents, setRawMatchEvents] = useState([]);
  const [matchState, setMatchState] = useState(currentMatchStatus || 'SCHEDULED');
  const [halfTimeSeconds, setHalfTimeSeconds] = useState(30);
  const [subsCount, setSubsCount] = useState(0);
  const [saveToast, setSaveToast] = useState('');
  const [stoppageTime, setStoppageTime] = useState(0);
  const [matchTelemetryStats, setMatchTelemetryStats] = useState([]);
  
  // Event Deduplication Ref
  const seenEventKeysRef = useRef(new Set());

  // In-Game Changes & Smart Diff State
  const [inGameChangesList, setInGameChangesList] = useState([]);
  const [showInGameChangesModal, setShowInGameChangesModal] = useState(false);
  const [inGameChangesFilter, setInGameChangesFilter] = useState('all');
  const [isSubmittingChanges, setIsSubmittingChanges] = useState(false);
  const [liveWorkingLineup, setLiveWorkingLineup] = useState(null);
  const initialBaselineRef = useRef({ tactics: null, formation: null, startingXi: null });
  
  // Tactical Attack/Defense Attitude Level State (-1 Defensive, 0 Balanced, +1 Attacking, +2 All-Out Attack)
  const [showAttitudeGuideModal, setShowAttitudeGuideModal] = useState(false);
  const [isUpdatingAttitude, setIsUpdatingAttitude] = useState(false);

  // Keep screen awake during live match on mobile devices
  useEffect(() => {
    if (activeMatch) {
      setScreenKeepAwake(true);
    } else {
      setScreenKeepAwake(false);
    }
    return () => {
      setScreenKeepAwake(false);
    };
  }, [Boolean(activeMatch)]);
  
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
      const res = await matchApi.getLiveMatchContext(teamData?.id);
      setLiveContext(res.data);

      const isCoachWithTeam = !!teamData?.id && userRole !== 'admin';

      if (isCoachWithTeam) {
        // Coach view: scope strictly to this coach's team
        if (res.data?.has_team_active_match && res.data?.team_active_match) {
          setActiveMatch(res.data.team_active_match);
          if (res.data.team_active_match.half_status) {
            setMatchState(res.data.team_active_match.half_status);
          } else {
            setMatchState(res.data.team_active_match.status || 'LIVE');
          }
        } else {
          setActiveMatch(null);
          if (res.data?.team_next_match) {
            setMatchState(res.data.team_next_match.half_status || 'SCHEDULED');
          } else {
            setMatchState('SCHEDULED');
          }
        }
      } else {
        // Admin / neutral viewer: show global match context
        if (res.data?.has_active_match && res.data.active_match) {
          setActiveMatch(res.data.active_match);
          if (res.data.active_match.half_status) {
            setMatchState(res.data.active_match.half_status);
          } else {
            setMatchState(res.data.active_match.status || 'LIVE');
          }
        } else if (res.data?.next_match) {
          setActiveMatch(null);
          setMatchState(res.data.next_match.half_status || 'SCHEDULED');
        } else {
          setActiveMatch(null);
          setMatchState('SCHEDULED');
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
  }, [teamData?.id, userRole]);

  // 2. Fetch Team Tactical GamePlan and Team's Matches with in-game persistence
  const [teamNextMatch, setTeamNextMatch] = useState(null);

  const fetchLiveGameplan = async (targetMatchId) => {
    if (!teamData?.id) return;
    try {
      if (targetMatchId) {
        try {
          localStorage.removeItem(`vml_live_lineup_${targetMatchId}_${teamData.id}`);
        } catch (_e) {}
      }

      let res = null;
      if (targetMatchId) {
        try {
          res = await teamApi.getGameplan(teamData.id, targetMatchId);
        } catch (_e) {}
      }
      if (!res || !res.data) {
        res = await teamApi.getGameplan(teamData.id);
      }

      if (res?.data) {
        const teamPlayers = res.data.team?.players || [];
        const gp = res.data.gameplan || null;
        let finalPlayers = teamPlayers;

        if (gp && Array.isArray(gp.players_data) && gp.players_data.length > 0) {
          const pMap = new Map();
          gp.players_data.forEach((item, index) => {
            const pid = item.player_id || item.id;
            if (pid) pMap.set(String(pid), { ...item, _order: item.order !== undefined ? Number(item.order) : index });
          });
          finalPlayers = (teamPlayers || []).map((p) => {
            const custom = pMap.get(String(p.id));
            if (custom) {
              return {
                ...p,
                is_starting: Boolean(custom.is_starting),
                x_coord: custom.x_coord != null ? custom.x_coord : p.x_coord,
                y_coord: custom.y_coord != null ? custom.y_coord : p.y_coord,
                position: custom.position || p.position,
                _order: custom._order,
              };
            }
            return { ...p, _order: 999 };
          });
          finalPlayers.sort((a, b) => (a._order ?? 999) - (b._order ?? 999));
        }

        setServerPlayers(finalPlayers);
        setLiveWorkingLineup(null);

        if (gp) {
          const resolvedForm = gp.formation || teamData?.default_formation || '4-3-3 (4-2-1-3)';
          setServerFormation(resolvedForm);
          setTactics((prev) => ({
            ...prev,
            ...gp,
          }));

          const starters = finalPlayers.filter((p) => p.is_starting);
          initialBaselineRef.current = {
            tactics: { ...gp },
            formation: resolvedForm,
            startingXi: starters.map((p) => ({ ...p })),
          };
        }
      }
    } catch (err) {
      console.log('Failed to fetch live gameplan', err);
    }
  };

  useEffect(() => {
    if (teamData?.id) {
      matchApi.getTeamSchedule(teamData.id).then((res) => {
        const matches = res.data || [];
        if (matches.length > 0) {
          const liveM = matches.find((m) => m.status === 'LIVE');
          const schedM = matches.find((m) => m.status === 'SCHEDULED');
          const recentFinM = matches.find((m) => m.status === 'FINISHED');
          const currentM = liveM || schedM || recentFinM || matches[0];

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
            home_team_name: isHome ? (teamData.name || 'تیم خودی') : resolvedOpponentName,
            away_team_name: !isHome ? (teamData.name || 'تیم خودی') : resolvedOpponentName,
            home_team_logo: isHome ? teamData.logo : resolvedOpponentLogo,
            away_team_logo: !isHome ? teamData.logo : resolvedOpponentLogo,
            home_score: currentM.home_score ?? 0,
            away_score: currentM.away_score ?? 0,
            round_name: currentM.round_name || 'هفته مسابقه لیگ برتر',
            date: currentM.date,
            status: currentM.status,
            half_status: currentM.half_status,
            opponent_name: resolvedOpponentName,
            opponent_logo: resolvedOpponentLogo,
          };

          setTeamNextMatch(formattedMatch);
          if (liveM) {
            setActiveMatch(formattedMatch);
          }

          fetchLiveGameplan(currentM.id);
        } else {
          fetchLiveGameplan(null);
        }
      }).catch((_e) => {
        fetchLiveGameplan(null);
      });
    }
  }, [teamData?.id, teamData?.name, teamData?.logo]);

  useEffect(() => {
    if (activeMatch?.id && teamData?.id) {
      fetchLiveGameplan(activeMatch.id);
    }
  }, [activeMatch?.id, teamData?.id]);

  // Helper to process & deduplicate live events with sensory chimes
  const handleProcessLiveEvent = (data) => {
    if (!data) return;
    const ev = data.event;
    const evType = ev?.event_type || data.type || 'LIVE_EVENT';
    const uniqueKey = data.event_id || ev?.id || data.id || `${evType}_${ev?.minute || ''}_${ev?.player_name || ''}_${data.message || data.custom_text || ''}`;

    if (seenEventKeysRef.current.has(uniqueKey)) {
      return;
    }
    seenEventKeysRef.current.add(uniqueKey);

    // Audio chime for Goals and Red Cards using Web Audio API
    const isGoal = ['GOAL', 'OWN_GOAL', 'PENALTY_SCORED'].includes(evType);
    const isRedCard = ['RED', 'SECOND_YELLOW'].includes(evType);
    if (isGoal || isRedCard) {
      notificationSoundService.playMatchAlertChime(true);
    }

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

    const evText = data.custom_text || data.message || (ev ? `${ev.player_name || ''}: ${ev.detail || ev.event_type_display || ev.event_type}` : 'رویداد زنده مسابقه');

    const newEv = {
      id: uniqueKey,
      type: evType,
      text: evText,
      team: ev?.player_team_name || data.team_name || 'سیستم داوری',
      icon: icon,
      minute: ev?.minute || (matchState === '2ND_HALF' ? 65 : 25),
      color: isGoal
        ? 'text-[#00ff87] border-emerald-500/60 bg-emerald-950/70 shadow-[0_0_15px_rgba(0,255,135,0.25)]'
        : isRedCard
        ? 'text-rose-300 border-rose-500/70 bg-rose-950/80 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
        : evType === 'VAR'
        ? 'text-amber-300 border-amber-500/70 bg-amber-950/80 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
        : evType === 'SUB_IN' || data.type === 'substitution'
        ? 'text-cyan-300 border-cyan-500/60 bg-cyan-950/70 shadow-[0_0_15px_rgba(0,243,255,0.2)]'
        : 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
    };

    setEvents((prev) => [newEv, ...prev]);
    if (onAddEvent) onAddEvent(newEv);
  };

  // 3. Real-Time WebSocket Connection to Match Channel
  useEffect(() => {
    const isCoach = !!teamData?.id && userRole !== 'admin';
    const matchId = isCoach
      ? (activeMatch?.id || teamNextMatch?.id || liveContext?.team_active_match?.id || liveContext?.team_next_match?.id)
      : (activeMatch?.id || teamNextMatch?.id || liveContext?.active_match?.id || liveContext?.next_match?.id);
    if (!matchId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? '127.0.0.1:8000'
      : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/match/${matchId}/`;

    // Fetch initial in-game changes list
    if (teamData?.id) {
      matchApi.getInGameChanges(matchId, teamData.id).then((res) => {
        if (res.data) setInGameChangesList(res.data);
      }).catch(() => {});
    }

    // Immediate and background fallback sync interval (fast 2.5s interval) to ensure instant FotMob badge sync
    const pollLiveState = async () => {
      try {
        const res = await matchApi.getMatchLiveState(matchId);
        if (res.data?.match) {
          setActiveMatch((prev) => ({ ...prev, ...res.data.match }));
          if (res.data.match.half_status) {
            setMatchState(res.data.match.half_status);
          }
          if (res.data.match.stoppage_time !== undefined) {
            setStoppageTime(res.data.match.stoppage_time);
          }
          if (res.data.match.team_stats) {
            setMatchTelemetryStats(res.data.match.team_stats);
          }
          if (res.data.match.in_game_changes) {
            setInGameChangesList(res.data.match.in_game_changes);
          }
        }
        if (res.data?.events && Array.isArray(res.data.events)) {
          setRawMatchEvents(res.data.events);
          res.data.events.forEach((ev) => handleProcessLiveEvent({ event: ev }));
        }
      } catch (_e) {}
    };

    pollLiveState();
    const syncInterval = setInterval(pollLiveState, 2500);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.match) {
            setActiveMatch((prev) => ({ ...prev, ...data.match }));
            if (data.match.half_status) {
              setMatchState(data.match.half_status);
            }
            if (data.match.stoppage_time !== undefined) {
              setStoppageTime(data.match.stoppage_time);
            }
            if (data.match.team_stats) {
              setMatchTelemetryStats(data.match.team_stats);
            }
            if (data.match.in_game_changes) {
              setInGameChangesList(data.match.in_game_changes);
            }
          }

          // Handle live stats updates broadcast (Immediate reflection on coach panel)
          if (data.type === 'team_stats_update') {
            if (data.team_stats && Array.isArray(data.team_stats)) {
              setMatchTelemetryStats(data.team_stats);
            } else if (data.stats) {
              setMatchTelemetryStats((prev) => {
                const list = Array.isArray(prev) ? [...prev] : [];
                const targetTeamId = Number(data.team_id || data.stats.team_id || data.stats.team);
                const idx = list.findIndex((s) => Number(s.team?.id || s.team || s.team_id) === targetTeamId);
                if (idx >= 0) {
                  list[idx] = { ...list[idx], ...data.stats };
                } else {
                  list.push(data.stats);
                }
                return list;
              });
            }
          }

          // Handle In-Game Changes broadcast events
          if (data.type === 'new_in_game_change') {
            if (data.team_id === teamData?.id && Array.isArray(data.changes)) {
              setInGameChangesList((prev) => [
                ...data.changes.filter((c) => !prev.some((p) => p.id === c.id)),
                ...prev,
              ]);
            }
          } else if (data.type === 'in_game_change_applied') {
            if (data.team_id === teamData?.id) {
              setInGameChangesList((prev) =>
                prev.map((c) =>
                  c.id === data.change_id
                    ? { ...c, status: 'APPLIED', applied_at: new Date().toISOString() }
                    : c
                )
              );
              notificationSoundService.playMatchAlertChime();
              setSaveToast(data.message || data.custom_text || 'پیغام انجام شد: تغییرات شما با موفقیت توسط داور در زمین مسابقه اعمال و تیک خورد ✅');
              setTimeout(() => setSaveToast(''), 7000);
              const curId = activeMatch?.id || teamNextMatch?.id;
              if (curId) fetchLiveGameplan(curId);
            }
          } else if (data.type === 'substitution') {
            if (data.team_id === teamData?.id) {
              const curId = activeMatch?.id || teamNextMatch?.id;
              if (curId) fetchLiveGameplan(curId);
            }
          } else if (data.type === 'in_game_change_rejected') {
            if (data.team_id === teamData?.id) {
              setInGameChangesList((prev) =>
                prev.map((c) =>
                  c.id === data.change_id ? { ...c, status: 'REJECTED' } : c
                )
              );
            }
          } else if (data.type === 'attitude_level_changed') {
            setActiveMatch((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                home_attitude_level: data.home_attitude_level !== undefined ? data.home_attitude_level : (data.is_home ? data.level : prev.home_attitude_level),
                away_attitude_level: data.away_attitude_level !== undefined ? data.away_attitude_level : (!data.is_home ? data.level : prev.away_attitude_level),
              };
            });
            handleProcessLiveEvent({
              type: 'ATTITUDE',
              custom_text: data.message || `تغییر فاز تاکتیکی تیم ${data.team_name}: ${data.level_name}`,
              team_name: data.team_name,
            });
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
            const curId = activeMatch?.id || teamNextMatch?.id;
            if (curId && teamData?.id) {
              try {
                localStorage.removeItem(`vml_live_lineup_${curId}_${teamData.id}`);
              } catch (_e) {}
            }
          } else if (data.type === 'stoppage_time_update') {
            setStoppageTime(data.stoppage_time || 0);
          } else if (data.type === 'clock_sync') {
            if (data.stoppage_time !== undefined) setStoppageTime(data.stoppage_time);
            if (data.half_status) setMatchState(data.half_status);
          }

          if (data.type === 'coach_tactics_applied' || data.type === 'in_game_change_applied' || data.custom_text?.includes('پیغام انجام شد') || data.message?.includes('پیغام انجام شد')) {
            const toastMsg = data.message || data.custom_text || 'پیغام انجام شد: تعویض و تغییرات تاکتیکی شما با موفقیت توسط داور در زمین مسابقه اعمال گردید ✅';
            setSaveToast(toastMsg);
            notificationSoundService.playMatchAlertChime();
            setTimeout(() => setSaveToast(''), 7000);
            const curMatchId = activeMatch?.id || teamNextMatch?.id;
            if (curMatchId) {
              fetchLiveGameplan(curMatchId);
            }
          }

          if (data.event) {
            setRawMatchEvents((prev) => {
              const evId = data.event.id;
              if (prev.some((e) => e.id === evId)) return prev;
              return [data.event, ...prev];
            });
          }

          if (data.type === 'event_deleted' && data.event_id) {
            setRawMatchEvents((prev) => prev.filter((e) => String(e.id) !== String(data.event_id)));
            setEvents((prev) => prev.filter((e) => !String(e.id).includes(String(data.event_id))));
          }

          if (data.message || data.event || data.custom_text) {
            handleProcessLiveEvent(data);
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
      clearInterval(syncInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [activeMatch?.id, teamNextMatch?.id, liveContext?.team_active_match?.id, liveContext?.team_next_match?.id, liveContext?.active_match?.id, liveContext?.next_match?.id, onAddEvent, onMatchStatusChange, teamData?.id, userRole]);

  // 5. Half-Time 30-Second Countdown Timer Logic
  useEffect(() => {
    let interval = null;
    if (matchState === 'HALF_TIME') {
      setHalfTimeSeconds(30);
      interval = setInterval(() => {
        setHalfTimeSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [matchState]);

  // Official Match Status Display Text (Persian)
  const officialMatchStatusText = useMemo(() => {
    if (matchState === 'FIRST_HALF' || matchState === '1ST_HALF') {
      return 'شروع نیمه اول';
    }
    if (matchState === 'HALF_TIME') {
      return `بین دو نیمه (${halfTimeSeconds} ثانیه)`;
    }
    if (matchState === 'SECOND_HALF' || matchState === '2ND_HALF') {
      return 'شروع نیمه دوم';
    }
    if (matchState === 'EXTRA_TIME') {
      return 'وقت اضافه';
    }
    if (matchState === 'PENALTIES') {
      return 'ضربات پنالتی';
    }
    if (matchState === 'FINISHED') {
      return 'پایان بازی';
    }
    return 'در انتظار شروع مسابقه';
  }, [matchState, halfTimeSeconds]);

  const homeStatsObj = useMemo(() => {
    const sList = matchTelemetryStats.length > 0 ? matchTelemetryStats : (activeMatch?.team_stats || []);
    return sList.find(s => s.team === activeMatch?.home_team) || {
      possession_percent: 50, shots: 0, shots_on_target: 0, fouls: 0, offsides: 0, corners: 0, free_kicks: 0, passes: 0, passes_completed: 0, crosses: 0, interceptions: 0, tackles: 0, saves: 0
    };
  }, [matchTelemetryStats, activeMatch?.team_stats, activeMatch?.home_team]);

  const awayStatsObj = useMemo(() => {
    const sList = matchTelemetryStats.length > 0 ? matchTelemetryStats : (activeMatch?.team_stats || []);
    return sList.find(s => s.team === activeMatch?.away_team) || {
      possession_percent: 50, shots: 0, shots_on_target: 0, fouls: 0, offsides: 0, corners: 0, free_kicks: 0, passes: 0, passes_completed: 0, crosses: 0, interceptions: 0, tackles: 0, saves: 0
    };
  }, [matchTelemetryStats, activeMatch?.team_stats, activeMatch?.away_team]);

  // Process initial players
  const players = useMemo(() => {
    const sourcePlayers = serverPlayers || initialPlayers;
    return sourcePlayers.map((p) => ({
      ...p,
      id: p.id.toString(),
      stamina: 100,
      status: (p.is_injured || (p.injury_matches > 0)) ? 'مصدوم' : 'سالم',
      trend: '▲',
      age: p.age || 26,
      consecutive_games: p.consecutive_games || 0,
      base_stamina: p.base_stamina || 85,
      position_group: p.position_group || 'CMF',
    }));
  }, [initialPlayers, serverPlayers]);

  const startingXi = useMemo(() => players.filter((p) => p.is_starting), [players]);
  const nonStarting = useMemo(() => players.filter((p) => !p.is_starting), [players]);
  const substitutes = useMemo(() => nonStarting.slice(0, 11), [nonStarting]);
  const reserves = useMemo(() => nonStarting.slice(11), [nonStarting]);
  const formation = serverFormation || teamData?.default_formation || '4-3-3 (4-2-1-3)';

  // Helper to compute live badges for players based on match event history (FotMob style)
  const computePlayerMatchBadges = (player, eventList = []) => {
    if (!player) return player;
    const pId = String(player.id || player.player_id || '');
    let in_match_goals = 0;
    let in_match_assists = 0;
    let yellowCards = 0;
    let isRed = false;
    let isInjured = false;
    let subMinute = null;

    (eventList || []).forEach((ev) => {
      if (ev.is_undone) return;
      const evPlayerId = String(ev.player_id || ev.player?.id || ev.player || '');
      const evAssistId = String(ev.assist_player_id || ev.assist_player?.id || ev.assist_player || '');
      const evType = ev.event_type || ev.type;

      if (evPlayerId === pId) {
        if (evType === 'GOAL' || evType === 'PENALTY_SCORED') {
          in_match_goals += 1;
        } else if (evType === 'YELLOW') {
          yellowCards += 1;
          if (yellowCards >= 2) isRed = true;
        } else if (evType === 'SECOND_YELLOW' || evType === 'RED') {
          isRed = true;
          yellowCards = Math.max(yellowCards, evType === 'SECOND_YELLOW' ? 2 : 1);
        } else if (evType === 'INJURY') {
          isInjured = true;
        } else if (evType === 'SUB' || evType === 'SUB_OUT') {
          subMinute = ev.minute;
        }
      }

      if (evAssistId === pId || (evType === 'ASSIST' && evPlayerId === pId)) {
        in_match_assists += 1;
      }
    });

    return {
      ...player,
      in_match_goals,
      goals: in_match_goals,
      in_match_assists,
      assists: in_match_assists,
      yellowCards,
      isRed,
      isInjured,
      subMinute: subMinute || player.subMinute,
    };
  };

  const decoratedStartingXi = useMemo(() => {
    const baseList = liveWorkingLineup?.startingXi || startingXi;
    return (baseList || []).map((p) => computePlayerMatchBadges(p, rawMatchEvents));
  }, [liveWorkingLineup?.startingXi, startingXi, rawMatchEvents]);

  const decoratedSubstitutes = useMemo(() => {
    const baseList = liveWorkingLineup?.substitutes || substitutes;
    return (baseList || []).map((p) => computePlayerMatchBadges(p, rawMatchEvents));
  }, [liveWorkingLineup?.substitutes, substitutes, rawMatchEvents]);

  const decoratedReserves = useMemo(() => {
    const baseList = liveWorkingLineup?.reserves || reserves;
    return (baseList || []).map((p) => computePlayerMatchBadges(p, rawMatchEvents));
  }, [liveWorkingLineup?.reserves, reserves, rawMatchEvents]);

  const aparatEmbedSrc = liveStreamUrl || "https://www.aparat.com/embed/live/VML.Emad";

  // Smart Diff Lineup & Tactics Submission Handler (Only sends actual modifications)
  const handleSaveGamePlan = async (updatedPlan) => {
    const targetFormation = updatedPlan?.currentFormation || liveWorkingLineup?.formation || serverFormation || formation;
    const targetStartingXi = updatedPlan?.startingXi || liveWorkingLineup?.startingXi || decoratedStartingXi;
    const targetSubs = updatedPlan?.substitutes || liveWorkingLineup?.substitutes || decoratedSubstitutes;
    const currentMatchId = activeMatch?.id || teamNextMatch?.id;

    // 1. Smart Tactical Diffing: Compare current tactics vs baseline tactics
    const baselineTactics = initialBaselineRef.current?.tactics || {};
    const tacticKeyTitles = {
      attacking_style: 'سبک حمله',
      build_up: 'بازیسازی (Build Up)',
      attacking_area: 'منطقه حمله',
      positioning: 'جای‌گیری',
      support_range: 'محدوده پشتیبانی',
      defensive_style: 'سبک دفاعی',
      containment_area: 'منطقه مهار',
      pressing: 'فشار (Pressing)',
      defensive_line: 'خط دفاعی',
      compactness: 'تراکم دفاعی',
      adv_offense_1: 'تاکتیک پیشرفته حمله ۱',
      adv_offense_2: 'تاکتیک پیشرفته حمله ۲',
      adv_defense_1: 'تاکتیک پیشرفته دفاع ۱',
      adv_defense_2: 'تاکتیک پیشرفته دفاع ۲',
    };

    const changesToSubmit = [];

    // Check changed tactics ONLY
    Object.keys(tacticKeyTitles).forEach((key) => {
      const newVal = tactics[key];
      const oldVal = baselineTactics[key];
      if (newVal !== undefined && oldVal !== undefined && String(newVal) !== String(oldVal)) {
        changesToSubmit.push({
          category: 'TACTIC',
          title: `تغییر ${tacticKeyTitles[key]}`,
          detail: `تغییر ${tacticKeyTitles[key]}: از «${oldVal}» به «${newVal}»`,
          diff_data: { key, oldVal, newVal }
        });
      }
    });

    // Check formation change
    const oldFormation = initialBaselineRef.current?.formation || formation;
    if (targetFormation && oldFormation && targetFormation !== oldFormation) {
      changesToSubmit.push({
        category: 'FORMATION',
        title: 'تغییر سیستم بازی',
        detail: `تغییر سیستم آرایش تیمی از ${oldFormation} به ${targetFormation}`,
        diff_data: { oldFormation, newFormation: targetFormation }
      });
    }

    // Check player substitutions & position/coordinate changes
    const baselinePlayers = initialBaselineRef.current?.startingXi || startingXi;
    const baselineStartersMap = new Map(baselinePlayers.map((p) => [String(p.id), p]));
    const newStartersMap = new Map(targetStartingXi.map((p) => [String(p.id), p]));

    // Substitutions: Players in baselineStarters but missing in newStarters
    const subbedOutList = baselinePlayers.filter((p) => !newStartersMap.has(String(p.id)));
    const subbedInList = targetStartingXi.filter((p) => !baselineStartersMap.has(String(p.id)));

    for (let i = 0; i < Math.min(subbedOutList.length, subbedInList.length); i++) {
      const pOut = subbedOutList[i];
      const pIn = subbedInList[i];
      changesToSubmit.push({
        category: 'SUBSTITUTION',
        title: `تعویض بازیکن: ورود ${pIn.name}`,
        detail: `خروج: ${pOut.name} (${pOut.position || 'بازیکن'}) ⬅️ ورود: ${pIn.name} (${pIn.position || 'بازیکن'})`,
        diff_data: {
          player_out_id: parseInt(pOut.id),
          player_out_name: pOut.name,
          player_in_id: parseInt(pIn.id),
          player_in_name: pIn.name
        }
      });
    }

    // Detect positional / coordinate moves for players who stayed in starting XI
    const movedPlayers = [];
    targetStartingXi.forEach((p) => {
      const oldP = baselineStartersMap.get(String(p.id));
      if (oldP) {
        const posChanged = p.position && oldP.position && p.position !== oldP.position;
        const xDiff = Math.abs((p.x_coord || 50) - (oldP.x_coord || 50));
        const yDiff = Math.abs((p.y_coord || 50) - (oldP.y_coord || 50));
        if (posChanged || xDiff > 6 || yDiff > 6) {
          movedPlayers.push({
            current: p,
            old: oldP,
            posChanged,
            xDiff,
            yDiff,
          });
        }
      }
    });

    // Pair up direct position / coordinate swaps between 2 players
    const pairedPlayerIds = new Set();

    for (let i = 0; i < movedPlayers.length; i++) {
      const p1 = movedPlayers[i];
      if (pairedPlayerIds.has(String(p1.current.id))) continue;

      for (let j = i + 1; j < movedPlayers.length; j++) {
        const p2 = movedPlayers[j];
        if (pairedPlayerIds.has(String(p2.current.id))) continue;

        // Check if p1 and p2 swapped positions or took each other's coordinates
        const isPositionSwap = (p1.old.position && p2.old.position) &&
          (p1.old.position === p2.current.position && p2.old.position === p1.current.position);

        const coordDist1 = Math.hypot((p1.current.x_coord || 50) - (p2.old.x_coord || 50), (p1.current.y_coord || 50) - (p2.old.y_coord || 50));
        const coordDist2 = Math.hypot((p2.current.x_coord || 50) - (p1.old.x_coord || 50), (p2.current.y_coord || 50) - (p1.old.y_coord || 50));
        const isCoordSwap = coordDist1 < 12 && coordDist2 < 12;

        if (isPositionSwap || isCoordSwap) {
          pairedPlayerIds.add(String(p1.current.id));
          pairedPlayerIds.add(String(p2.current.id));

          changesToSubmit.push({
            category: 'POSITION',
            title: `جابجایی بازیکن ${p1.current.name} با بازیکن ${p2.current.name}`,
            detail: `جابجایی بازیکن ${p1.current.name} (${p1.old.position || 'پست سابق'} ⬅️ ${p1.current.position || 'پست جدید'}) با بازیکن ${p2.current.name} (${p2.old.position || 'پست سابق'} ⬅️ ${p2.current.position || 'پست جدید'})`,
            diff_data: {
              swap: true,
              player_a_id: parseInt(p1.current.id),
              player_a_name: p1.current.name,
              player_a_old_pos: p1.old.position,
              player_a_new_pos: p1.current.position,
              player_b_id: parseInt(p2.current.id),
              player_b_name: p2.current.name,
              player_b_old_pos: p2.old.position,
              player_b_new_pos: p2.current.position,
            }
          });
          break;
        }
      }
    }

    // Add remaining solo moved players (not part of a pair swap)
    movedPlayers.forEach((item) => {
      if (!pairedPlayerIds.has(String(item.current.id))) {
        const p = item.current;
        const oldP = item.old;
        changesToSubmit.push({
          category: 'POSITION',
          title: `جابجایی پستی «${p.name}»`,
          detail: item.posChanged
            ? `تغییر پست ${p.name} از ${oldP.position} به ${p.position}`
            : `جابجایی مختصات ${p.name} در زمین به (X: ${Math.round(p.x_coord)}%, Y: ${Math.round(p.y_coord)}%)`,
          diff_data: {
            player_id: parseInt(p.id),
            player_name: p.name,
            old_pos: oldP.position,
            new_pos: p.position,
            x_coord: p.x_coord,
            y_coord: p.y_coord
          }
        });
      }
    });

    if (changesToSubmit.length === 0) {
      setSaveToast('⚠️ هیچ تغییری در تاکتیک‌ها، سیستم یا ترکیب بازیکنان ایجاد نشده است.');
      setTimeout(() => setSaveToast(''), 4500);
      return;
    }

    try {
      setIsSubmittingChanges(true);

      // Save Gameplan to Team in DB specifically for this match
      if (teamData?.id) {
        await teamApi.submitGameplan(teamData.id, {
          match_id: currentMatchId,
          tactics: {
            ...tactics,
            formation: targetFormation,
          },
          players: [
            ...targetStartingXi.map((p, idx) => ({
              player_id: parseInt(p.id),
              x_coord: p.x_coord,
              y_coord: p.y_coord,
              position: p.position,
              is_starting: true,
              order: idx,
            })),
            ...targetSubs.map((p, idx) => ({
              player_id: parseInt(p.id),
              position: p.naturalPosition || p.position,
              is_starting: false,
              order: targetStartingXi.length + idx,
            })),
          ],
        }, currentMatchId);
      }

      // Submit In-Game Changes to Match Referee Room
      if (currentMatchId) {
        const res = await matchApi.submitInGameChanges(currentMatchId, {
          team_id: teamData?.id,
          minute: activeMatch?.current_minute || 45,
          changes: changesToSubmit,
        });

        if (res.data?.changes) {
          setInGameChangesList((prev) => [
            ...res.data.changes.filter((c) => !prev.some((p) => p.id === c.id)),
            ...prev,
          ]);
        }

        try {
          localStorage.removeItem(`vml_live_lineup_${currentMatchId}_${teamData?.id}`);
        } catch (_e) {}
      }

      // Update baseline snapshot
      initialBaselineRef.current = {
        tactics: { ...tactics },
        formation: targetFormation,
        startingXi: targetStartingXi.map((p) => ({ ...p })),
      };

      const newEv = {
        id: Date.now(),
        type: 'TACTICS',
        text: `ثبت تغییرات مربی: تعداد ${changesToSubmit.length} مورد تغییر تاکتیکی/ترکیب برای اتاق داوری ارسال شد ⚡`,
        team: teamData?.name || 'تیم شما',
        icon: '⚡',
        color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
      };

      setEvents((prev) => [newEv, ...prev]);
      if (onAddEvent) onAddEvent(newEv);

      setSaveToast(`✅ تعداد ${changesToSubmit.length} مورد تغییر با موفقیت به اتاق داوری ارسال شد.`);
      notificationSoundService.playMatchAlertChime();
      setTimeout(() => setSaveToast(''), 6000);
    } catch (_error) {
      setSaveToast('خطا در ارسال تغییرات به داوری. لطفاً دوباره تلاش کنید.');
      setTimeout(() => setSaveToast(''), 4500);
    } finally {
      setIsSubmittingChanges(false);
    }
  };

  const handleUpdateAttitudeLevel = async (newLevel) => {
    if (!currentMatch?.id) return;
    if (newLevel < -1 || newLevel > 2) return;
    
    const isHome = isUserHome;
    const previousHomeLevel = currentMatch.home_attitude_level ?? 0;
    const previousAwayLevel = currentMatch.away_attitude_level ?? 0;

    // Optimistic UI update
    setActiveMatch((prev) => ({
      ...(prev || {}),
      home_attitude_level: isHome ? newLevel : (prev?.home_attitude_level ?? 0),
      away_attitude_level: !isHome ? newLevel : (prev?.away_attitude_level ?? 0),
    }));

    const LEVEL_TITLES = {
      '-1': 'دفاعی 🛡️',
      '0': 'عادی و متعادل ⚖️',
      '1': 'هجومی ⚡',
      '2': 'تمام‌تهاجمی (مدافع جلو) ⚔️',
    };

    try {
      setIsUpdatingAttitude(true);
      await matchApi.updateAttitudeLevel(currentMatch.id, {
        team_id: teamData?.id,
        level: newLevel,
      });

      notificationSoundService.playMatchAlertChime();
      setSaveToast(`⚡ فاز تاکتیکی به «${LEVEL_TITLES[newLevel]}» تغییر یافت و فوراً به اتاق داوری اعلام شد.`);
      setTimeout(() => setSaveToast(''), 5000);
    } catch (err) {
      console.error('Failed to update attitude level:', err);
      setActiveMatch((prev) => ({
        ...(prev || {}),
        home_attitude_level: previousHomeLevel,
        away_attitude_level: previousAwayLevel,
      }));
      setSaveToast('خطا در تغییر فاز بازی. لطفاً دوباره تلاش نمایید.');
      setTimeout(() => setSaveToast(''), 4000);
    } finally {
      setIsUpdatingAttitude(false);
    }
  };

  // -------------------------------------------------------------
  // CURRENT MATCH SELECTION & 3-PHASE SMART STATE MACHINE
  // -------------------------------------------------------------
  const isCoachWithTeam = !!teamData?.id && userRole !== 'admin';

  const currentMatch = isCoachWithTeam
    ? (activeMatch || teamNextMatch || liveContext?.team_active_match || liveContext?.team_next_match || liveContext?.team_recent_finished_match)
    : (activeMatch || teamNextMatch || liveContext?.active_match || liveContext?.next_match || liveContext?.recent_finished_match);
  const displayMatch = currentMatch;

  let displaySeconds = isCoachWithTeam
    ? (liveContext?.team_time_to_kickoff_seconds ?? liveContext?.time_to_kickoff_seconds)
    : liveContext?.time_to_kickoff_seconds;
  if (displayMatch?.date) {
    displaySeconds = Math.max(0, Math.floor((new Date(displayMatch.date).getTime() - Date.now()) / 1000));
  }

  const isMatchFinished = matchState === 'FINISHED' || currentMatch?.status === 'FINISHED' || currentMatch?.half_status === 'FINISHED';
  // A match is LIVE strictly when admin has started it (status === 'LIVE' or active half_status). Never auto-start on time reached!
  // For coaches, ensure the match actually belongs to this coach's team!
  const isMatchLive = !isMatchFinished && (
    currentMatch?.status === 'LIVE' ||
    ['1ST_HALF', 'HALF_TIME', '2ND_HALF', 'EXTRA_TIME', 'PENALTIES'].includes(matchState) ||
    ['1ST_HALF', 'HALF_TIME', '2ND_HALF', 'EXTRA_TIME', 'PENALTIES'].includes(currentMatch?.half_status)
  ) && (
    !isCoachWithTeam ||
    currentMatch?.home_team === teamData.id ||
    currentMatch?.away_team === teamData.id ||
    currentMatch?.home_team_name === teamData.name ||
    currentMatch?.away_team_name === teamData.name
  );

  if (loadingContext && !liveContext) {
    return (
      <div className="p-16 text-center text-cyan-400 font-bold flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-sport tracking-wider text-slate-300">در حال دریافت وضعیت زمان‌بندی رسمی مسابقه...</span>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PHASE 3: POST-MATCH 10-MINUTE RECAP COUNTDOWN & FULL-TIME STATS
  // -------------------------------------------------------------
  if (isMatchFinished && !isRecapFinished) {
    return (
      <PostMatchRecapView
        match={currentMatch}
        userTeamData={teamData}
        initialCountdownSeconds={600}
        onReturnToStandby={() => {
          setIsRecapFinished(true);
          setIsStandbyBypassed(false);
          setMatchState('SCHEDULED');
          if (teamData?.id) {
            matchApi.getTeamSchedule(teamData.id).then((res) => {
              const matches = res.data || [];
              const nextSched = matches.find((m) => m.status === 'SCHEDULED' && m.id !== currentMatch?.id) || matches[0];
              if (nextSched) {
                setActiveMatch(nextSched);
                setTeamNextMatch(nextSched);
              }
            }).catch(() => {});
          }
        }}
      />
    );
  }

  // -------------------------------------------------------------
  // PHASE 1: PRE-MATCH STANDBY COUNTDOWN SCREEN
  // -------------------------------------------------------------
  if (!isMatchLive && !isStandbyBypassed) {
    return (
      <LiveMatchStandby
        nextMatch={displayMatch}
        initialSeconds={displaySeconds}
        isWithinReminder={displaySeconds != null && displaySeconds <= 900 && displaySeconds > 0}
        onUnlockLive={() => {
          if (currentMatch?.status === 'LIVE') {
            setIsStandbyBypassed(true);
          }
        }}
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
  // PHASE 2: ACTIVE LIVE MATCH BROADCAST & TACTICS VIEW
  // -------------------------------------------------------------

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

        {/* Official Match Status Badge and Live Indicator */}
        <div className="flex items-center gap-2.5 self-end md:self-auto font-sport">
          {/* Coach In-Game Changes Desk Modal Trigger */}
          <button
            onClick={() => setShowInGameChangesModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs font-black transition-all shadow-lg active:scale-95 cursor-pointer font-sans"
          >
            <ListChecks size={16} className="text-cyan-400" />
            <span>تغییرات حین بازی</span>
            {inGameChangesList.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-sport font-black ${
                inGameChangesList.some((c) => c.status === 'PENDING')
                  ? 'bg-amber-400 text-slate-950 animate-pulse'
                  : 'bg-emerald-400 text-slate-950'
              }`}>
                {inGameChangesList.length}
              </span>
            )}
          </button>

          {/* Active Live Match Status */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border shadow-lg ${
            matchState === 'HALF_TIME'
              ? 'bg-amber-950/90 border-amber-400/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : matchState === 'FINISHED'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-[#05080e]/95 border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(0,243,255,0.25)]'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${
              matchState === 'HALF_TIME' ? 'bg-amber-400 animate-ping' : matchState === 'FINISHED' ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'
            }`}></span>
            <span className="text-xs sm:text-sm font-black font-sans tracking-wide">
              {officialMatchStatusText}
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

      {/* REAL-TIME PES/EFOOTBALL 4-STEP TACTICAL ATTITUDE HUD */}
      {(() => {
        const userTeamAttitudeLevel = isUserHome
          ? (currentMatch?.home_attitude_level ?? 0)
          : (currentMatch?.away_attitude_level ?? 0);
        const activeTeamTitle = isCoachWithTeam ? (teamData?.name || 'تیم شما') : (isUserHome ? homeName : awayName);

        return (
          <div className={`fc-card-elevated p-3.5 sm:p-4 rounded-3xl border transition-all duration-500 shadow-2xl relative overflow-hidden ${
            userTeamAttitudeLevel === 2
              ? 'bg-gradient-to-r from-rose-950/80 via-[#0a050e] to-rose-950/80 border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.35)]'
              : userTeamAttitudeLevel === 1
              ? 'bg-gradient-to-r from-amber-950/70 via-[#0d0c05] to-amber-950/70 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
              : userTeamAttitudeLevel === -1
              ? 'bg-gradient-to-r from-blue-950/70 via-[#050a14] to-blue-950/70 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.25)]'
              : 'bg-gradient-to-r from-emerald-950/50 via-[#05080e] to-slate-900 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
          }`}>
            <div className="flex flex-col lg:flex-row items-center justify-between gap-3.5">
              {/* Left Side: Status & Description */}
              <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner transition-all duration-300 shrink-0 ${
                    userTeamAttitudeLevel === 2
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                      : userTeamAttitudeLevel === 1
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : userTeamAttitudeLevel === -1
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  }`}>
                    {userTeamAttitudeLevel === 2 ? (
                      <Swords size={20} className="animate-bounce" />
                    ) : userTeamAttitudeLevel === 1 ? (
                      <Zap size={20} />
                    ) : userTeamAttitudeLevel === -1 ? (
                      <Shield size={20} />
                    ) : (
                      <Sliders size={20} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-black text-white">
                        تنظیم فاز تیمی: {activeTeamTitle}
                      </span>
                      <span className={`text-[10.5px] font-sport font-black px-2.5 py-0.5 rounded-full border shadow-sm ${
                        userTeamAttitudeLevel === 2
                          ? 'bg-rose-500 text-slate-950 border-rose-300 animate-pulse'
                          : userTeamAttitudeLevel === 1
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : userTeamAttitudeLevel === -1
                          ? 'bg-blue-500 text-white border-blue-300'
                          : 'bg-emerald-400 text-slate-950 border-emerald-300'
                      }`}>
                        {userTeamAttitudeLevel === 2 ? 'LEVEL +2 • تمام‌تهاجمی' : userTeamAttitudeLevel === 1 ? 'LEVEL +1 • هجومی' : userTeamAttitudeLevel === -1 ? 'LEVEL -1 • دفاعی' : 'LEVEL 0 • عادی و متعادل'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-300 font-medium mt-0.5">
                      {userTeamAttitudeLevel === 2
                        ? '⚔️ فاز تمام‌تهاجمی: هجوم سراسری + مدافع وسط به خط حمله اضافه شد!'
                        : userTeamAttitudeLevel === 1
                        ? '⚡ فاز هجومی: پرس خط مقدم تشدید شده و آهنگ بازی تهاجمی است.'
                        : userTeamAttitudeLevel === -1
                        ? '🛡️ فاز دفاعی: عقب‌نشینی خطوط و تمرکز حداکثری بر دفاع و ضدحمله.'
                        : '⚖️ فاز عادی: توازن میان دفاع و حمله طبق تاکتیک اصلی مسابقه.'}
                    </p>
                  </div>
                </div>

                {/* Tactical Guide Button */}
                <button
                  onClick={() => setShowAttitudeGuideModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                  title="مشاهده راهنمای کامل ۴ سطح فاز بازی"
                >
                  <Info size={14} className="text-cyan-400" />
                  <span>راهنما</span>
                </button>
              </div>

              {/* Right Side: 4-Step Segmented Bar & Steppers */}
              <div className="flex items-center gap-2 w-full lg:w-auto justify-center lg:justify-end">
                {/* Step Down (Less Attacking / More Defensive) */}
                <button
                  onClick={() => handleUpdateAttitudeLevel(Math.max(-1, userTeamAttitudeLevel - 1))}
                  disabled={isUpdatingAttitude || userTeamAttitudeLevel <= -1 || (!isCoachWithTeam && !isAdmin)}
                  className="p-2 sm:p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-90 shadow-md cursor-pointer"
                  title="یک سطح دفاعی‌تر (پایین)"
                >
                  <ChevronDown size={18} />
                </button>

                {/* 4 Interactive Segmented Level Pills */}
                <div className="flex items-center bg-[#05080e]/95 p-1 rounded-2xl border border-slate-800 shadow-inner gap-1">
                  {[
                    { level: -1, label: 'دفاعی', num: '-1', icon: Shield, activeClass: 'bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)]' },
                    { level: 0, label: 'متعادل', num: '0', icon: Check, activeClass: 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.6)]' },
                    { level: 1, label: 'هجومی', num: '+1', icon: Zap, activeClass: 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)]' },
                    { level: 2, label: 'تمام‌تهاجمی', num: '+2', icon: Swords, activeClass: 'bg-rose-600 text-white border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.7)] animate-pulse' },
                  ].map((item) => {
                    const isCurrent = userTeamAttitudeLevel === item.level;
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.level}
                        onClick={() => handleUpdateAttitudeLevel(item.level)}
                        disabled={isUpdatingAttitude || (!isCoachWithTeam && !isAdmin)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer disabled:cursor-not-allowed ${
                          isCurrent
                            ? item.activeClass
                            : 'bg-transparent text-slate-400 hover:text-white border-transparent hover:bg-slate-900/60'
                        }`}
                      >
                        <IconComp size={13} />
                        <span>{item.label}</span>
                        <span className="font-sport font-black text-[11px] opacity-80">{item.num}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Step Up (More Attacking / Up) */}
                <button
                  onClick={() => handleUpdateAttitudeLevel(Math.min(2, userTeamAttitudeLevel + 1))}
                  disabled={isUpdatingAttitude || userTeamAttitudeLevel >= 2 || (!isCoachWithTeam && !isAdmin)}
                  className="p-2 sm:p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-90 shadow-md cursor-pointer"
                  title="یک سطح هجومی‌تر (بالا)"
                >
                  <ChevronUp size={18} />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 1. APARAT LIVE VIDEO STREAM PLAYER CONTAINER */}
      <div className="fc-card-elevated p-2 md:p-3 rounded-3xl border border-slate-700/60 space-y-2 shadow-2xl relative overflow-hidden bg-[#05080e]">
        <div className="flex justify-between items-center px-2 py-1.5 text-xs text-slate-300">
          <span className="font-black text-white flex items-center gap-2">
            <Radio size={16} className="animate-pulse text-rose-500" />
            <span>استریم زنده مسابقه مستر لیگ</span>
            <span className="text-cyan-300 font-sans font-black bg-cyan-950/80 px-2.5 py-0.5 rounded-lg border border-cyan-500/40 text-[11px]">
              📢 {officialMatchStatusText}
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


        {/* Live Score & In-Game Changes Monitor Trigger Bar */}
        <div className="p-4 bg-gradient-to-b from-[#080c14] to-[#04060a] flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-start">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm md:text-base text-white">{homeName}</span>
              <span className="font-sport font-black text-2xl md:text-3xl text-cyan-400 px-3 py-1 rounded-xl bg-slate-900/90 border border-cyan-500/30">
                {homeScore}
              </span>
            </div>
            <span className="font-sport text-slate-500 font-black text-lg">:</span>
            <div className="flex items-center gap-2">
              <span className="font-sport font-black text-2xl md:text-3xl text-purple-400 px-3 py-1 rounded-xl bg-slate-900/90 border border-purple-500/30">
                {awayScore}
              </span>
              <span className="font-black text-sm md:text-base text-white">{awayName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowInGameChangesModal(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 text-cyan-300 font-bold px-4 py-2 rounded-xl border border-cyan-500/40 text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <ListChecks size={16} className="text-cyan-400" />
              <span>وضعیت تغییرات و داوری</span>
              {inGameChangesList.filter(c => c.status === 'PENDING').length > 0 && (
                <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">
                  {inGameChangesList.filter(c => c.status === 'PENDING').length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. MATCH TELEMETRY & STATS (REALTIME SYNCED) */}
      <div className="fc-card-elevated p-4 sm:p-5 rounded-3xl border border-slate-700/60 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-cyan-400" />
            <span className="font-black text-sm sm:text-base text-white">آمار زنده و تله‌متری مسابقه (Match Stats)</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-black font-sport">
            <span className="text-cyan-400">{homeName}</span>
            <span className="text-slate-500">VS</span>
            <span className="text-purple-400">{awayName}</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Possession Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-sport font-black text-xs">
              <span className="text-cyan-400">{homeStatsObj.possession_percent}%</span>
              <span className="text-slate-300">درصد مالکیت توپ</span>
              <span className="text-purple-400">{awayStatsObj.possession_percent}%</span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-900">
              <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${homeStatsObj.possession_percent}%` }} />
              <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${awayStatsObj.possession_percent}%` }} />
            </div>
          </div>

          {/* Stats Grid (PES 2021) */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'شوت (در چارچوب)', h: `${homeStatsObj.shots} (${homeStatsObj.shots_on_target})`, a: `${awayStatsObj.shots} (${awayStatsObj.shots_on_target})` },
              { label: 'خطا (آفساید)', h: `${homeStatsObj.fouls} (${homeStatsObj.offsides})`, a: `${awayStatsObj.fouls} (${awayStatsObj.offsides})` },
              { label: 'کرنر', h: homeStatsObj.corners, a: awayStatsObj.corners },
              { label: 'ضربه آزاد', h: homeStatsObj.free_kicks || 0, a: awayStatsObj.free_kicks || 0 },
              { label: 'پاس (موفق)', h: `${homeStatsObj.passes || 0} (${homeStatsObj.passes_completed || 0})`, a: `${awayStatsObj.passes || 0} (${awayStatsObj.passes_completed || 0})` },
              { label: 'سانتر', h: homeStatsObj.crosses || 0, a: awayStatsObj.crosses || 0 },
              { label: 'سد توپ', h: homeStatsObj.interceptions || 0, a: awayStatsObj.interceptions || 0 },
              { label: 'تکل', h: homeStatsObj.tackles || 0, a: awayStatsObj.tackles || 0 },
              { label: 'شوت گیری دروازبان', h: homeStatsObj.saves || 0, a: awayStatsObj.saves || 0 },
            ].map((stat, i) => (
              <div key={i} className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-cyan-400 font-sport font-black text-xs">{stat.h}</span>
                <span className="text-slate-300 text-[10.5px] font-bold">{stat.label}</span>
                <span className="text-purple-400 font-sport font-black text-xs">{stat.a}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. COACH TACTICAL OVERVIEW & LIVE ADJUSTMENT DRAWER */}
      <div className="fc-card-elevated rounded-3xl border border-slate-700/60 overflow-hidden shadow-2xl">
        <button
          onClick={() => setIsTacticsExpanded(!isTacticsExpanded)}
          className="w-full p-3.5 sm:p-5 flex items-center justify-between bg-gradient-to-r from-[#080c14] to-[#0d162a] text-right hover:bg-slate-800/80 transition-all cursor-pointer gap-2"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(0,243,255,0.3)] shrink-0">
              <Sliders size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-white text-xs sm:text-base block tracking-tight truncate">
                میز تعویض و تغییرات تاکتیکی زنده (TACTICS DESK)
              </span>
              <span className="text-[10px] sm:text-xs text-cyan-300 font-medium block truncate">
                {matchState === 'HALF_TIME'
                  ? '⚡ استراحت بین دو نیمه: تعویض نامحدود و تغییر فرمیشن بدون قفل'
                  : 'در جریان مسابقه: امکان انجام تعویض‌های فوری با ۵ سهمیه رسمی'}
              </span>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-black text-cyan-300 font-sport bg-cyan-950/80 px-2.5 sm:px-3 py-1 rounded-xl border border-cyan-500/40 shrink-0">
            {isTacticsExpanded ? 'بستن پنل ▲' : 'مشاهده و تغییر تاکتیک ▼'}
          </span>
        </button>

        <AnimatePresence>
          {isTacticsExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 sm:p-6 border-t border-slate-700/60 bg-[#05080e]/95 space-y-4 sm:space-y-6"
            >
              {/* Tactical Instructions Tabs */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex bg-[#080c14] p-1 rounded-xl sm:rounded-2xl border border-slate-700/60 gap-1 text-[11px] sm:text-xs">
                  <button
                    onClick={() => setTacticTab('attack')}
                    className={`flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black transition-all text-center ${
                      tacticTab === 'attack'
                        ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚔️ تهاجمی
                  </button>
                  <button
                    onClick={() => setTacticTab('defense')}
                    className={`flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black transition-all text-center ${
                      tacticTab === 'defense'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🛡️ دفاعی
                  </button>
                  <button
                    onClick={() => setTacticTab('advanced')}
                    className={`flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black transition-all text-center ${
                      tacticTab === 'advanced'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚙️ پیشرفته
                  </button>
                </div>

                {/* Tactical Tab 1: Attack */}
                {tacticTab === 'attack' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs">
                    <div className="fc-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-700/60 space-y-1.5 sm:space-y-2">
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
                    <div className="fc-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-700/60 space-y-1.5 sm:space-y-2">
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
                    <div className="fc-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-700/60 space-y-1.5 sm:space-y-2">
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
                    <div className="fc-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-700/60 space-y-1.5 sm:space-y-2">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs">
                    <div className="fc-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-700/60 space-y-1.5 sm:space-y-2">
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
                    <div className="fc-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-700/60 space-y-1.5 sm:space-y-2">
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
                    <div className="fc-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-700/60 space-y-1.5 sm:space-y-2">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs">
                    <div className="fc-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-700/60 space-y-1.5 sm:space-y-2">
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
                    <div className="fc-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-700/60 space-y-1.5 sm:space-y-2">
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

                {/* Unified Single Tactics & Lineup Submit Button */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleSaveGamePlan({ currentFormation: liveWorkingLineup?.formation || serverFormation || formation, startingXi: liveWorkingLineup?.startingXi || decoratedStartingXi, substitutes: liveWorkingLineup?.substitutes || decoratedSubstitutes })}
                    disabled={isSubmittingChanges}
                    className="w-full sm:w-auto min-h-[48px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black px-7 py-3 rounded-2xl shadow-xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-emerald-300 font-sport disabled:opacity-50 select-none touch-manipulation"
                  >
                    <span className="text-sm">⚡</span>
                    <span>{isSubmittingChanges ? 'در حال بررسی تفاوت‌ها و ارسال...' : 'ارسال ترکیب و تاکتیک به داوری'}</span>
                  </button>
                </div>
              </div>

              {/* Full Interactive Pitch with Live Sub Capabilities and Live FotMob Badges */}
              <EFootballGamePlan
                key={`live-pitch-${(decoratedStartingXi || []).map(p => `${p.id}-${p.in_match_goals || 0}-${p.yellowCards || 0}-${p.isRed ? 1 : 0}-${p.isInjured ? 1 : 0}`).join('-')}`}
                initialFormationProp={liveWorkingLineup?.formation || formation}
                initialStartingXi={decoratedStartingXi}
                initialSubstitutes={decoratedSubstitutes}
                initialReserves={decoratedReserves}
                onSaveGamePlan={handleSaveGamePlan}
                onLineupChange={(lineupData) => {
                  setLiveWorkingLineup(lineupData);
                  const curId = activeMatch?.id || teamNextMatch?.id;
                  if (curId && teamData?.id) {
                    try {
                      localStorage.setItem(`vml_live_lineup_${curId}_${teamData.id}`, JSON.stringify(lineupData));
                    } catch (_e) {}
                  }
                }}
                readOnly={false}
                hideReserves={true}
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

      {/* ------------------------------------------------------------- */}
      {/* 4. MODAL: COACH IN-GAME CHANGES LIVE MONITOR                  */}
      {/* ------------------------------------------------------------- */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showInGameChangesModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
              <div
                className="fixed inset-0"
                onClick={() => setShowInGameChangesModal(false)}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative z-10 bg-slate-950 border-2 border-cyan-500/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] space-y-4 max-h-[85vh] flex flex-col p-5 my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                      <ListChecks size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-white">تغییرات حین بازی و وضعیت داوری</h3>
                      <p className="text-[11px] text-slate-400">پیگیری لحظه‌ای وضعیت تایید تعویض‌ها، جابجایی‌ها و تاکتیک‌های ارسالی</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowInGameChangesModal(false)}
                    className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Status Filters */}
                <div className="flex gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs">
                  {[
                    { key: 'all', label: 'همه درخواست‌ها', count: inGameChangesList.length },
                    { key: 'pending', label: 'در انتظار داور', count: inGameChangesList.filter(c => c.status === 'PENDING').length },
                    { key: 'applied', label: 'تایید و اعمال شده ✓', count: inGameChangesList.filter(c => c.status === 'APPLIED').length },
                    { key: 'rejected', label: 'رد شده ✗', count: inGameChangesList.filter(c => c.status === 'REJECTED').length },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setInGameChangesFilter(tab.key)}
                      className={`flex-1 py-1.5 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                        inGameChangesFilter === tab.key
                          ? 'bg-cyan-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="text-[10px] font-sport px-1.5 py-0.2 rounded-full bg-black/40 text-cyan-200">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Changes Feed List */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                  {inGameChangesList
                    .filter(item => {
                      if (inGameChangesFilter === 'pending') return item.status === 'PENDING';
                      if (inGameChangesFilter === 'applied') return item.status === 'APPLIED';
                      if (inGameChangesFilter === 'rejected') return item.status === 'REJECTED';
                      return true;
                    })
                    .map((change) => {
                      const isApplied = change.status === 'APPLIED';
                      const isPending = change.status === 'PENDING';
                      const isRejected = change.status === 'REJECTED';

                      const categoryIcon = change.change_category === 'SUBSTITUTION' ? '🔄'
                        : change.change_category === 'POSITION' ? '📍'
                        : change.change_category === 'FORMATION' ? '⚡'
                        : '⚙️';

                      return (
                        <div
                          key={change.id}
                          className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md ${
                            isApplied
                              ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                              : isPending
                              ? 'bg-amber-950/20 border-amber-500/50 text-amber-200'
                              : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                          }`}
                        >
                          <div className="space-y-1 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="text-base shrink-0">{categoryIcon}</span>
                              <span className="font-black text-xs text-white truncate">{change.title}</span>
                              <span className="text-[10px] font-sport text-slate-400">
                                {change.minute ? `دقیقه '${change.minute}` : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed pr-6">
                              {change.detail}
                            </p>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border flex items-center gap-1 ${
                              isApplied
                                ? 'bg-emerald-900/90 text-emerald-200 border-emerald-400'
                                : isPending
                                ? 'bg-amber-900/90 text-amber-200 border-amber-400 animate-pulse'
                                : 'bg-rose-900/90 text-rose-200 border-rose-400'
                            }`}>
                              {isApplied && <Check size={12} className="text-emerald-300" />}
                              {isPending && <Clock size={12} className="text-amber-300" />}
                              {isRejected && <X size={12} className="text-rose-300" />}
                              <span>{change.status_display || (isApplied ? 'تایید و اعمال شد ✓' : isPending ? 'در انتظار تایید داور ⏳' : 'رد شده ✗')}</span>
                            </span>

                            <span className="text-[9px] text-slate-500 font-sport">
                              {change.created_at ? new Date(change.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                  {inGameChangesList.length === 0 && (
                    <div className="p-8 text-center text-slate-400 space-y-2 bg-slate-900/40 rounded-2xl border border-slate-800">
                      <Info size={28} className="text-cyan-400 mx-auto" />
                      <h4 className="font-bold text-white text-xs">هنوز تغییری ارسال نشده است</h4>
                      <p className="text-[11px] text-slate-500">
                        هرگونه تعویض، جابجایی بازیکن یا تغییر تاکتیکی که در جریان بازی ارسال کنید، در این قسمت وضعیت تایید داور را نشان می‌دهد.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ATTACK/DEFENSE TACTICAL ATTITUDE GUIDE MODAL (PES / EFOOTBALL) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showAttitudeGuideModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
              <div className="fixed inset-0" onClick={() => setShowAttitudeGuideModal(false)} />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 bg-slate-950 rounded-3xl w-full max-w-2xl my-auto p-5 sm:p-6 border border-cyan-500/40 shadow-2xl space-y-4 dir-rtl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
                      <Sliders size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-white">راهنمای سطوح تاکتیکی بازی (PES Attitude Levels)</h3>
                      <p className="text-[11px] text-slate-400">تنظیم بلادرنگ فاز حمله و دفاع توسط سرمربی در جریان پخش زنده مسابقه</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAttitudeGuideModal(false)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* 4 Levels Explanations */}
                <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
                  {/* Level +2 */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/70 to-slate-900 border border-rose-500/40 space-y-1.5 shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400">
                          <Swords size={16} />
                        </span>
                        <span className="font-black text-white text-xs sm:text-sm">سطح ۲+ : تمام‌تهاجمی (All-Out Attack)</span>
                      </div>
                      <span className="text-[10px] font-sport font-black px-2 py-0.5 rounded-md bg-rose-500 text-slate-950 border border-rose-300 animate-pulse">
                        LEVEL +2 • CB FORWARD
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong>مکانیزم تاکتیکی:</strong> بالاترین سطح تهاجمی ممکن در مسابقه. در این حالت، علاوه بر پیشروی حداکثری مهاجمان و هافبک‌ها، <strong>یکی از مدافعان وسط اصلی (CB) رسماً خط دفاع را رها کرده و به خط حمله ملحق می‌شود</strong> تا در محوطه جریمه حریف برای زدن ضربات سر و استفاده از سانترها حضور یابد.
                    </p>
                    <div className="text-[11px] text-rose-300 bg-rose-950/60 p-2 rounded-xl border border-rose-500/30 flex items-center gap-1.5">
                      <Zap size={14} className="shrink-0" />
                      <span><strong>کاربرد کلیدی:</strong> دقایق پایانی بازی وقتی از حریف عقب هستید و برای جبران نتیجه نیاز به ریسک همه‌جانبه دارید.</span>
                    </div>
                  </div>

                  {/* Level +1 */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/40 space-y-1.5 shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-400">
                          <Zap size={16} />
                        </span>
                        <span className="font-black text-white text-xs sm:text-sm">سطح ۱+ : هجومی (Attacking)</span>
                      </div>
                      <span className="text-[10px] font-sport font-black px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 border border-amber-300">
                        LEVEL +1 • HIGH PRESS
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong>مکانیزم تاکتیکی:</strong> خطوط تهاجمی تیم جلوتر کشیده می‌شوند، شدت پرس در زمین حریف افزایش می‌یابد و هافبک‌ها و وینگربک‌ها مشارکت مستقیم‌تری در حملات دارند تا حریف تحت فشار مداوم قرار گیرد.
                    </p>
                    <div className="text-[11px] text-amber-300 bg-amber-950/60 p-2 rounded-xl border border-amber-500/30 flex items-center gap-1.5">
                      <Zap size={14} className="shrink-0" />
                      <span><strong>کاربرد کلیدی:</strong> وقتی به گل نیاز دارید یا حریف در لاک دفاعی رفته و می‌خواهید نبض بازی را در دست بگیرید.</span>
                    </div>
                  </div>

                  {/* Level 0 */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/50 to-slate-900 border border-emerald-500/40 space-y-1.5 shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400">
                          <Check size={16} />
                        </span>
                        <span className="font-black text-white text-xs sm:text-sm">سطح ۰ : عادی و متعادل (Balanced - پیش‌فرض)</span>
                      </div>
                      <span className="text-[10px] font-sport font-black px-2 py-0.5 rounded-md bg-emerald-400 text-slate-950 border border-emerald-300">
                        LEVEL 0 • DEFAULT
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong>مکانیزم تاکتیکی:</strong> ساختار استاندارد و متعادل بازی. تیم دقیقاً طبق چیدمان، سبک بازی و تاکتیک‌های ثبت‌شده در پلن مسابقه کار می‌کند و فواصل خطوط در تعادل ایده‌آل قرار دارند.
                    </p>
                  </div>

                  {/* Level -1 */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-500/40 space-y-1.5 shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500 flex items-center justify-center text-blue-400">
                          <Shield size={16} />
                        </span>
                        <span className="font-black text-white text-xs sm:text-sm">سطح ۱- : دفاعی (Defensive)</span>
                      </div>
                      <span className="text-[10px] font-sport font-black px-2 py-0.5 rounded-md bg-blue-500 text-white border border-blue-300">
                        LEVEL -1 • SOLID DEFENSE
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong>مکانیزم تاکتیکی:</strong> تیم در یک‌سوم دفاعی خودی جمع می‌شود، بلوک دفاعی فشرده تشکیل می‌دهد و اولویت اول حفظ دروازه و ممانعت از نفوذ حریف است. موقعیت‌های گلزنی بیشتر روی ضدحملات سریع برنامه‌ریزی می‌شوند.
                    </p>
                    <div className="text-[11px] text-blue-300 bg-blue-950/60 p-2 rounded-xl border border-blue-500/30 flex items-center gap-1.5">
                      <Shield size={14} className="shrink-0" />
                      <span><strong>کاربرد کلیدی:</strong> برای حفظ نتیجه برد در دقایق حساس پایانی یا کنترل بازی برابر حریفان بسیار قدرتمند.</span>
                    </div>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>⚡ هرگونه تغییر فاز بلافاصله و بدون تاخیر در اتاق داوری ادمین نمایش داده می‌شود.</span>
                  <button
                    onClick={() => setShowAttitudeGuideModal(false)}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer transition-colors shrink-0"
                  >
                    متوجه شدم
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
