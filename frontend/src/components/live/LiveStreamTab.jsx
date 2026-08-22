import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Tv, Radio, Activity, CheckCircle2, Sliders, X, Shield, Clock, Timer, Lock, Info, Play, AlertCircle, RefreshCw, ArrowLeftRight, Check, CheckCircle, AlertTriangle, Layers, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EFootballGamePlan from '../team/EFootballGamePlan';
import LiveMatchStandby from './LiveMatchStandby';
import PostMatchRecapView from './PostMatchRecapView';
import { matchApi, teamApi } from '../../services/api';
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

            // Initialize baseline snapshot for smart diffing
            const starters = (res.data.team?.players || []).filter((p) => p.is_starting);
            initialBaselineRef.current = {
              tactics: { ...res.data.gameplan },
              formation: res.data.gameplan.formation || '4-3-3 (4-2-1-3)',
              startingXi: starters.map((p) => ({ ...p })),
            };
          }
        }
      }).catch((err) => console.log('Failed to fetch live gameplan', err));

      // Fetch Team Schedule to find the exact fixture & opponent details
      matchApi.getTeamSchedule(teamData.id).then((res) => {
        const matches = res.data || [];
        if (matches.length > 0) {
          // Look for LIVE match first, then SCHEDULED, then FINISHED, or fallback to first match
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
        }
      }).catch((_e) => {});
    }
  }, [teamData?.id, teamData?.name, teamData?.logo]);

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

    // Background fallback sync interval (every 6s) to ensure resilience
    const syncInterval = setInterval(async () => {
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
          res.data.events.forEach((ev) => handleProcessLiveEvent({ event: ev }));
        }
      } catch (_e) {}
    }, 6000);

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
            if (data.match.in_game_changes) {
              setInGameChangesList(data.match.in_game_changes);
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
            }
          } else if (data.type === 'in_game_change_rejected') {
            if (data.team_id === teamData?.id) {
              setInGameChangesList((prev) =>
                prev.map((c) =>
                  c.id === data.change_id ? { ...c, status: 'REJECTED' } : c
                )
              );
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
          }

          if (data.type === 'coach_tactics_applied' || data.custom_text?.includes('پیغام انجام شد') || data.message?.includes('پیغام انجام شد')) {
            const toastMsg = data.message || data.custom_text || 'پیغام انجام شد: تعویض و تغییرات تاکتیکی شما با موفقیت توسط داور در زمین مسابقه اعمال گردید ✅';
            setSaveToast(toastMsg);
            notificationSoundService.playMatchAlertChime();
            setTimeout(() => setSaveToast(''), 7000);
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
      stamina: p.virtual_stamina != null ? Math.round(Number(p.virtual_stamina)) : 100,
      status: p.is_injured ? 'مصدوم' : (Number(p.virtual_stamina ?? 100)) < 40 ? 'خسته' : 'سالم',
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

  const aparatEmbedSrc = liveStreamUrl || "https://www.aparat.com/embed/live/VML.Emad";

  // Smart Diff Lineup & Tactics Submission Handler (Only sends actual modifications)
  const handleSaveGamePlan = async (updatedPlan) => {
    const targetFormation = updatedPlan?.currentFormation || liveWorkingLineup?.formation || serverFormation || formation;
    const targetStartingXi = updatedPlan?.startingXi || liveWorkingLineup?.startingXi || startingXi;
    const targetSubs = updatedPlan?.substitutes || liveWorkingLineup?.substitutes || substitutes;
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

      // Save Gameplan to Team in DB
      if (teamData?.id) {
        await teamApi.submitGameplan(teamData.id, {
          tactics: {
            ...tactics,
            formation: targetFormation,
          },
          players: [
            ...targetStartingXi.map((p) => ({
              player_id: parseInt(p.id),
              x_coord: p.x_coord,
              y_coord: p.y_coord,
              position: p.position,
              is_starting: true,
            })),
            ...targetSubs.map((p) => ({
              player_id: parseInt(p.id),
              position: p.naturalPosition || p.position,
              is_starting: false,
            })),
          ],
        });
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

                {/* Unified Single Tactics & Lineup Submit Button */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleSaveGamePlan({ currentFormation: liveWorkingLineup?.formation || serverFormation || formation, startingXi: liveWorkingLineup?.startingXi || startingXi, substitutes: liveWorkingLineup?.substitutes || substitutes })}
                    disabled={isSubmittingChanges}
                    className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black px-7 py-3 rounded-2xl shadow-xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-emerald-300 font-sport disabled:opacity-50"
                  >
                    <span className="text-sm">⚡</span>
                    <span>{isSubmittingChanges ? 'در حال بررسی تفاوت‌ها و ارسال...' : 'ارسال ترکیب و تاکتیک به داوری'}</span>
                  </button>
                </div>
              </div>

              {/* Full Interactive Pitch with Live Sub Capabilities */}
              <EFootballGamePlan
                key={`${formation}-${startingXi.length}`}
                initialFormationProp={formation}
                initialStartingXi={startingXi}
                initialSubstitutes={substitutes}
                initialReserves={reserves}
                onSaveGamePlan={handleSaveGamePlan}
                onLineupChange={(lineupData) => setLiveWorkingLineup(lineupData)}
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
    </div>
  );
}
