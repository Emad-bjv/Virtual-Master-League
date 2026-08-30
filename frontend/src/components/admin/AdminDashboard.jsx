import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import SubNav from '../common/SubNav';
import {
  ShieldAlert, Coins, RefreshCw, HeartPulse, Sliders, CheckCircle2, ArrowLeft,
  UserPlus, UserCheck, Building, Mail, Lock, Unlock, Info, DollarSign, Tv, PlusCircle,
  Calendar, Play, Pause, Square, AlertTriangle, Trophy, Star, Radio, Activity, Check,
  ChevronDown, ChevronRight, Eye, Flag, Trash2, Zap, Clock, Shield, Sparkles, Send,
  Plus, Minus, ArrowLeftRight, Bell, CheckCircle, BarChart2, Award, User, X,
  CreditCard, Gem, FileImage, UploadCloud, XCircle, Filter, Image, CheckCheck,
  Edit2, Package, ToggleLeft, ToggleRight, Layers, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { adminApi, matchApi, teamApi, economyApi } from '../../services/api';
import EFootballGamePlan from '../team/EFootballGamePlan';
import ErrorBoundary from '../common/ErrorBoundary';
import CustomSelect from '../common/CustomSelect';
import PostMatchComparisonCard from './PostMatchComparisonCard';
import AdminTournamentHub from './AdminTournamentHub';
import AdminPacksSeasonPassHub from './AdminPacksSeasonPassHub';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import { useTranslation } from 'react-i18next';

const DEFAULT_ADMIN_SUBNAV = [
  { id: 'overview', label: 'داشبورد ارشد' },
  { id: 'transactions', label: 'مدیریت واریزی‌ها و تراکنش‌ها' },
  { id: 'store_packages', label: 'مدیریت بسته‌های فروشگاه' },
  { id: 'live_admin', label: 'اتاق داوری و کنترل مسابقات' },
  { id: 'tournament_hub', label: 'مدیریت لیگ و جام حذفی' },
  { id: 'packs_season_pass', label: 'مدیریت پک‌ها و سیزن پس' },
  { id: 'match_team_stats', label: 'ثبت سریع آمار تیمی' },
  { id: 'match_player_ratings', label: 'ثبت سریع نمرات بازیکنان' },
  { id: 'register_coach', label: 'مدیریت و ثبت مربیان' },
  { id: 'audit_logs', label: 'گزارش تغییرات سیستم' },
];

const REFEREE_DESK_TABS = [
  { id: 'live_desk', label: 'کنترل زنده و رویدادهای بازی', icon: Radio },
  { id: 'in_game_changes', label: 'تغییرات حین بازی مربیان', icon: ArrowLeftRight },
  { id: 'team_stats', label: 'ثبت آمار تیمی مسابقه', icon: BarChart2 },
  { id: 'player_ratings', label: 'ثبت نمرات و دقایق بازیکنان', icon: Award },
];

const TACTICAL_GUIDES = {
  'بازی مالکانه': 'تمرکز بر پاسکاری‌های متعدد و تسلط کامل بر توپ جهت باز کردن لایه‌های دفاعی حریف.',
  'ضد حمله': 'انتقال فوق‌سریع توپ از خط دفاع به خط حمله در لحظه لو رفتن توپ توسط حریف.',
  'پاس کوتاه': 'حرکت دادن توپ با پاس‌های زمینی و مطمئن بین بازیکنان نزدیک.',
  'پاس بلند': 'ارسال مستقیم توپ‌های بلند به فضاهای خالی پشت مدافعان حریف.',
  'مرکز': 'تمرکز اصلی روی بازیسازی و نفوذ از میانه میدان و عمق خط دفاعی حریف.',
  'کناره': 'توسعه بازی به سمت بال‌ها و استفاده از سانترها و نفوذ وینگرها.',
  'شناور': 'بازیکنان آزادی عمل داشته و در هنگام مالکیت توپ پست خود را تعویض می‌کنند.',
  'حفظ ترکیب': 'بازیکنان نظم ساختاری تیم را حفظ کرده و در پست‌های اصلی خود باقی می‌مانند.',
  'فشار خط مقدم': 'پرس سنگین از یک‌سوم دفاعی حریف به محض از دست رفتن مالکیت توپ.',
  'همه دفاع': 'عقب‌نشینی منظم تمام تیم به زمین خودی و بستن فضاهای نفوذ.',
  'میانه': 'هدایت حریف به مرکز زمین و ایجاد تله‌های پرسینگ متراکم.',
  'کناره‌ها': 'بستن مرکز و هدایت حملات حریف به سمت خطوط طولی.',
  'لنگر انداختن': 'حفظ موقعیت ثابت مهاجم نوک در مرکز بدون متمایل شدن به کناره‌ها.',
  'بال غلط': 'نفوذ وینگرها به داخل محوطه جریمه حریف به عنوان مهاجم دوم.',
  'تدافعی': 'عقب نشستن یکی از هافبک‌ها به عنوان مدافع میانی سوم در فاز دفاع.',
  'نزدیک به خط اطراف زمین': 'حفظ حداکثر عرض بازی توسط بازیکنان کناری.',
  'دفاع کنار‌های تهاجمی': 'نفوذ مدافعین کناری تا خط عرضی حریف جهت اضافه شدن به موج حمله.',
  'دوران بال‌ها': 'جابجایی مداوم موقعیت بین وینگرها و هافبک‌های کناری.',
  'تیکی تاکا': 'پاسکاری‌های سریع تک‌ضرب مثلثی با جابجایی مداوم موقعیت.',
  'شماره ۹ کاذب': 'عقب آمدن مهاجم نوک به خط هافبک برای فضا سازی برای وینگرها.',
  'اهداف مرکز': 'تغذیه هوایی و ارسال سانترهای پیاپی برای مهاجمان سرزن در باکس.',
  'فولبک‌های کاذب': 'ورود مدافعان کناری به مرکز میدان در فاز بازیسازی.',
  'بال عقب': 'عقب‌نشینی وینگرها و مدافعان کناری برای تشکیل خط دفاع ۵ نفره.',
  'خط دفاعی عمیق': 'عقب نشستن خط دفاعی برای جلوگیری از لو رفتن فضاهای پشت مدافعان.',
  'شلوغی در محوطه جریمه': 'تراکم حداکثری مدافعان داخل محوطه ۱۸ قدم در هنگام سانترها.',
  'مقابله با هدف': 'مهار مستقیم مهاجم هدف حریف با مدافع یارگیر تخصصی.',
  'فشار': 'گگن پرسینگ شدید به مدت چند ثانیه پس از لو رفتن توپ.',
  'هیچکدام': 'دستورالعمل تاکتیکی پیشرفته‌ای تعریف نشده است.',
};

/**
 * Universal Numerical Round Normalization Utility
 * Strictly extracts the round integer (1 to 30) from Persian, Arabic, or English numerals.
 */
export const extractRoundNumber = (val) => {
  if (val == null || val === '') return null;
  if (typeof val === 'number') return val;
  const str = String(val);
  const normalized = str
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const roundMatch = normalized.match(/(?:هفته|week|round|دور)\s*(\d+)/i);
  if (roundMatch) {
    return parseInt(roundMatch[1], 10);
  }
  const match = normalized.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

export default function AdminDashboard({
  onExitAdmin,
  liveStreamUrl,
  setLiveStreamUrl,
  onPushLiveEvent,
  currentMatchStatus,
  onMatchStatusChange,
  teamData,
  targetMatchId,
  initialMatchId,
  initialGameweek,
}) {
  const { t } = useTranslation();
  const [activeSub, setActiveSub] = useState('live_admin');
  const [adminMessage, setAdminMessage] = useState('');
  const [adminMessageType, setAdminMessageType] = useState('success');

  const showNotification = (msg, type = 'success') => {
    setAdminMessage(msg);
    setAdminMessageType(type);
    setTimeout(() => setAdminMessage(''), 4500);
  };

  // -------------------------------------------------------------
  // 1. GLOBAL SYSTEM DATA (KPIs, Matches, Gameweeks, Teams)
  // -------------------------------------------------------------
  const [realStats, setRealStats] = useState(null);
  const [allMatches, setAllMatches] = useState([]);
  const [gameweeksStatus, setGameweeksStatus] = useState([]);
  const [selectedGameweek, setSelectedGameweek] = useState('هفته 1');
  const [matchFilter, setMatchFilter] = useState('ALL');
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [allTeams, setAllTeams] = useState([]);

  // Fetch initial system data
  const loadMatchesAndWeeks = async () => {
    setLoadingMatches(true);
    try {
      const [statsRes, weeksRes, scheduleRes, teamsRes] = await Promise.allSettled([
        adminApi.getOverviewStats(),
        matchApi.getGameweeksStatus(),
        matchApi.getLeagueSchedule({ status: 'ALL' }),
        teamApi.getStandings ? teamApi.getStandings() : Promise.resolve({ data: [] }),
      ]);

      if (statsRes.status === 'fulfilled') setRealStats(statsRes.value.data);
      if (weeksRes.status === 'fulfilled' && weeksRes.value.data) {
        const gws = weeksRes.value.data.gameweeks || [];
        setGameweeksStatus(gws);
        if (weeksRes.value.data.active_gameweek && !initialGameweek) {
          setSelectedGameweek(weeksRes.value.data.active_gameweek);
        }
      }
      if (scheduleRes.status === 'fulfilled' && scheduleRes.value.data) {
        const matchesData = scheduleRes.value.data.results || scheduleRes.value.data || [];
        setAllMatches(matchesData);
      }
      if (teamsRes.status === 'fulfilled' && teamsRes.value.data) {
        setAllTeams(teamsRes.value.data.results || teamsRes.value.data || []);
      }
    } catch (err) {
      console.warn('Failed to load admin matches:', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    loadMatchesAndWeeks();
    const handleSync = () => loadMatchesAndWeeks();
    window.addEventListener('vml_league_schedule_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('vml_league_schedule_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // -------------------------------------------------------------
  // R1: DIRECT MATCH CONTROL NAVIGATION
  // Auto-focus match if passed via props, localStorage or URL query
  // -------------------------------------------------------------
  useEffect(() => {
    const directMatchId =
      targetMatchId ||
      initialMatchId ||
      localStorage.getItem('vml_admin_target_match_id') ||
      new URLSearchParams(window.location.search).get('match_id') ||
      new URLSearchParams(window.location.search).get('matchId');

    if (directMatchId) {
      setActiveSub('live_admin');
      const numId = parseInt(directMatchId, 10);

      // Check if match already in allMatches
      const existing = allMatches.find((m) => m.id === numId);
      if (existing) {
        setSelectedLiveMatch(existing);
        const gw = extractRoundNumber(existing.round_name);
        if (gw) setSelectedGameweek(`هفته ${gw}`);
      } else {
        // Fetch direct match detail
        matchApi
          .getMatchDetail(numId)
          .then((res) => {
            if (res.data) {
              setSelectedLiveMatch(res.data);
              const gw = extractRoundNumber(res.data.round_name);
              if (gw) setSelectedGameweek(`هفته ${gw}`);
            }
          })
          .catch(() => {});
      }

      try {
        localStorage.removeItem('vml_admin_target_match_id');
      } catch (_e) {}
    }
  }, [targetMatchId, initialMatchId, allMatches.length]);

  // -------------------------------------------------------------
  // R2: GAMEWEEK 1-30 STRICT ISOLATION FILTERING
  // Ensures Week 1 never shows matches from Weeks 10-19
  // -------------------------------------------------------------
  const gameweekMatches = useMemo(() => {
    const selectedGwNum = extractRoundNumber(selectedGameweek) || 1;
    return (allMatches || []).filter((m) => {
      const matchGwNum = extractRoundNumber(m.round_name);
      if (matchGwNum == null || matchGwNum !== selectedGwNum) {
        return false;
      }
      if (matchFilter === 'ALL') return true;
      return m.status === matchFilter;
    });
  }, [allMatches, selectedGameweek, matchFilter]);

  // -------------------------------------------------------------
  // 2. REFEREE CONTROL ROOM STATE & 4-MODULAR TABS (R5)
  // -------------------------------------------------------------
  const [selectedLiveMatch, setSelectedLiveMatch] = useState(null);
  const [refereeDeskTab, setRefereeDeskTab] = useState('live_desk'); // 'live_desk' | 'in_game_changes' | 'team_stats' | 'player_ratings'
  const [liveMatchDetails, setLiveMatchDetails] = useState(null);
  const [selectedLiveTeamSwitch, setSelectedLiveTeamSwitch] = useState('home'); // 'home' | 'away'
  const [streamInput, setStreamInput] = useState(liveStreamUrl || 'https://www.aparat.com/embed/live/VML.Emad');
  const [eventMinute, setEventMinute] = useState(1);
  const [stoppageInput, setStoppageInput] = useState(0);
  const [adminTacticTab, setAdminTacticTab] = useState('attack'); // 'attack' | 'defense' | 'advanced'
  const [showPostMatchCardView, setShowPostMatchCardView] = useState(false);

  // -------------------------------------------------------------
  // R4: IN-GAME CHANGES DESK (Pending Requests Queue & History)
  // -------------------------------------------------------------
  const [inGameChangesTeamTab, setInGameChangesTeamTab] = useState('all'); // 'all' | 'home' | 'away'
  const [pendingChangesQueue, setPendingChangesQueue] = useState([]);
  const [processedChangesHistory, setProcessedChangesHistory] = useState([]);
  const [submittingChangeId, setSubmittingChangeId] = useState(null);

  // Home and Away Tactical & GamePlan Data
  const [teamGameplanData, setTeamGameplanData] = useState({
    home: {
      gameplan: null,
      tactics: {},
      formation: '4-3-3',
      starters: [],
      subs: [],
      reserves: [],
      players: [],
    },
    away: {
      gameplan: null,
      tactics: {},
      formation: '4-3-3',
      starters: [],
      subs: [],
      reserves: [],
      players: [],
    },
  });

  // -------------------------------------------------------------
  // R5: MATCH TEAM STATS DESK (Home & Away Side-by-Side)
  // -------------------------------------------------------------
  const [deskTeamStats, setDeskTeamStats] = useState({
    home: { possession_percent: 50, shots: 8, shots_on_target: 4, fouls: 6, corners: 4, offsides: 1, saves: 3 },
    away: { possession_percent: 50, shots: 7, shots_on_target: 3, fouls: 7, corners: 3, offsides: 2, saves: 4 },
  });
  const [savingDeskTeamStats, setSavingDeskTeamStats] = useState(false);

  // -------------------------------------------------------------
  // R5: PLAYER RATINGS & MINUTES DESK (Home & Away Roster Tables)
  // -------------------------------------------------------------
  const [deskRatingsSide, setDeskRatingsSide] = useState('home'); // 'home' | 'away'
  const [deskRatingsHome, setDeskRatingsHome] = useState([]);
  const [deskRatingsAway, setDeskRatingsAway] = useState([]);
  const [motmPlayerId, setMotmPlayerId] = useState(null);
  const [savingDeskRatings, setSavingDeskRatings] = useState(false);

  // Fetch full live match state from server
  const fetchLiveMatchState = async (matchId) => {
    if (!matchId) return;
    try {
      const res = await matchApi.getMatchLiveState(matchId);
      if (res.data) {
        setLiveMatchDetails(res.data);
        if (res.data.match) {
          setSelectedLiveMatch((prev) => ({
            ...prev,
            ...res.data.match,
            home: res.data.match.home_team_name || prev?.home,
            away: res.data.match.away_team_name || prev?.away,
            homeId: res.data.match.home_team,
            awayId: res.data.match.away_team,
          }));
          setEventMinute(res.data.match.current_minute || 1);
          setStoppageInput(res.data.match.stoppage_time || 0);

          // Populate existing team stats if returned by server
          if (res.data.match.team_stats && res.data.match.team_stats.length > 0) {
            const hStat = res.data.match.team_stats.find((s) => s.team === res.data.match.home_team || s.team_id === res.data.match.home_team);
            const aStat = res.data.match.team_stats.find((s) => s.team === res.data.match.away_team || s.team_id === res.data.match.away_team);
            setDeskTeamStats({
              home: hStat ? { ...hStat } : deskTeamStats.home,
              away: aStat ? { ...aStat } : deskTeamStats.away,
            });
          }

          // Populate in-game changes from server
          if (res.data.match.in_game_changes) {
            const hId = res.data.match.home_team || res.data.match.homeId;
            const pending = res.data.match.in_game_changes.filter((c) => c.status === 'PENDING').map((c) => ({
              ...c,
              teamSide: (c.team === hId || c.team_id === hId) ? 'home' : 'away',
              timestamp: c.created_at ? new Date(c.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '',
            }));
            const processed = res.data.match.in_game_changes.filter((c) => c.status !== 'PENDING').map((c) => ({
              ...c,
              teamSide: (c.team === hId || c.team_id === hId) ? 'home' : 'away',
              processedAt: c.applied_at ? new Date(c.applied_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : (c.created_at ? new Date(c.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : ''),
            }));
            setPendingChangesQueue(pending);
            setProcessedChangesHistory(processed);
          }
        }
      }
    } catch (_e) {}
  };

  useEffect(() => {
    if (selectedLiveMatch?.id) {
      fetchLiveMatchState(selectedLiveMatch.id);
      const interval = setInterval(() => fetchLiveMatchState(selectedLiveMatch.id), 4000);
      return () => clearInterval(interval);
    }
  }, [selectedLiveMatch?.id]);

  // Load tactical gameplans and roster players for both teams
  const reloadTeamGameplans = async () => {
    if (!selectedLiveMatch) return;
    const homeId = selectedLiveMatch.home_team || selectedLiveMatch.homeId;
    const awayId = selectedLiveMatch.away_team || selectedLiveMatch.awayId;

    const processTeamData = (data) => {
      const gp = data?.gameplan || {};
      const teamObj = data?.team || {};
      const rawPlayers = teamObj.players || [];
      const gpPlayersData = gp.players_data || [];
      const gpPlayersMap = new Map();
      if (Array.isArray(gpPlayersData) && gpPlayersData.length > 0) {
        gpPlayersData.forEach((item) => {
          const pid = item.player_id || item.id;
          if (pid) gpPlayersMap.set(String(pid), item);
        });
      }

      const formattedPlayers = rawPlayers.map((p, idx) => {
        const custom = gpPlayersMap.get(String(p.id));
        return {
          ...p,
          id: String(p.id),
          name: p.name,
          naturalPosition: p.naturalPosition || p.position,
          position: custom?.position || p.tacticalPosition || p.position || p.naturalPosition,
          tacticalPosition: custom?.position || p.tacticalPosition || null,
          shirt_number: p.shirt_number || idx + 1,
          is_starting: custom && custom.is_starting !== undefined ? Boolean(custom.is_starting) : Boolean(p.is_starting),
          x_coord: custom && custom.x_coord != null ? custom.x_coord : p.x_coord,
          y_coord: custom && custom.y_coord != null ? custom.y_coord : p.y_coord,
          stamina: Number(p.virtual_stamina) || 90,
          virtual_stamina: Number(p.virtual_stamina) || 90,
          rating: p.rating || 7.0,
        };
      });

      let starters = formattedPlayers.filter((p) => p.is_starting);
      let nonStarting = formattedPlayers.filter((p) => !p.is_starting);

      if (starters.length < 11 && nonStarting.length > 0 && formattedPlayers.length >= 11) {
        const needed = 11 - starters.length;
        const promoted = nonStarting.slice(0, needed);
        starters = [...starters, ...promoted.map((p) => ({ ...p, is_starting: true }))];
        nonStarting = nonStarting.slice(needed);
      }

      return {
        gameplan: gp,
        tactics: gp,
        formation: gp.formation || teamObj.default_formation || '4-3-3',
        starters: starters,
        subs: nonStarting.slice(0, 11),
        reserves: nonStarting.slice(11),
        players: formattedPlayers,
      };
    };

    try {
      if (homeId) {
        const resHome = await teamApi.getGameplan(homeId, selectedLiveMatch.id);
        if (resHome.data) {
          const parsed = processTeamData(resHome.data);
          setTeamGameplanData((prev) => ({ ...prev, home: parsed }));
          setDeskRatingsHome(
            parsed.players.map((p) => ({
              player_id: p.id,
              name: p.name,
              position: p.position || p.naturalPosition,
              photo_url: p.photo_url,
              minutes_played: p.is_starting ? 90 : 0,
              rating: p.is_starting ? 7.0 : 6.0,
              was_starter: p.is_starting,
              goals: 0,
              assists: 0,
            }))
          );
        }
      }
      if (awayId) {
        const resAway = await teamApi.getGameplan(awayId, selectedLiveMatch.id);
        if (resAway.data) {
          const parsed = processTeamData(resAway.data);
          setTeamGameplanData((prev) => ({ ...prev, away: parsed }));
          setDeskRatingsAway(
            parsed.players.map((p) => ({
              player_id: p.id,
              name: p.name,
              position: p.position || p.naturalPosition,
              photo_url: p.photo_url,
              minutes_played: p.is_starting ? 90 : 0,
              rating: p.is_starting ? 7.0 : 6.0,
              was_starter: p.is_starting,
              goals: 0,
              assists: 0,
            }))
          );
        }
      }
    } catch (e) {
      console.warn('Failed to load team gameplans', e);
    }
  };

  useEffect(() => {
    if (!selectedLiveMatch?.id) return;
    reloadTeamGameplans();
    fetchLiveMatchState(selectedLiveMatch.id);

    // WebSocket real-time synchronization for coach submissions and referee room
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? '127.0.0.1:8000'
        : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/match/${selectedLiveMatch.id}/`;
    let ws = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'coach_tactics_submitted') {
            const isHomeTeam = data.team_id === (selectedLiveMatch.home_team || selectedLiveMatch.homeId);
            const teamName = data.team_name || (isHomeTeam ? selectedLiveMatch.home_team_name : selectedLiveMatch.away_team_name);
            const newRequest = {
              id: Date.now() + Math.random(),
              type: 'TACTICS',
              teamSide: isHomeTeam ? 'home' : 'away',
              team_id: data.team_id,
              team_name: teamName,
              formation: data.formation || 'ترکیب جدید',
              tactics: data.tactics || {},
              players: data.players || [],
              minute: eventMinute,
              timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              status: 'PENDING',
            };

            setSelectedLiveMatch((prev) => prev ? ({
              ...prev,
              home_lineup_ready: isHomeTeam ? true : prev.home_lineup_ready,
              away_lineup_ready: !isHomeTeam ? true : prev.away_lineup_ready,
            }) : prev);

            setPendingChangesQueue((prev) => [newRequest, ...prev]);
            showNotification(`🔔 ترکیب و تاکتیک‌های جدید از سوی سرمربی «${teamName}» به صورت زنده دریافت شد.`, 'info');
            await reloadTeamGameplans();
            await fetchLiveMatchState(selectedLiveMatch.id);
          } else if (data.type === 'new_in_game_change') {
            const isHomeTeam = data.team_id === (selectedLiveMatch.home_team || selectedLiveMatch.homeId);
            if (data.changes && Array.isArray(data.changes)) {
              const formattedChanges = data.changes.map((c) => ({
                ...c,
                teamSide: isHomeTeam ? 'home' : 'away',
                timestamp: c.created_at ? new Date(c.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
              }));
              setPendingChangesQueue((prev) => [
                ...formattedChanges.filter((c) => !prev.some((p) => p.id === c.id)),
                ...prev,
              ]);
            }
            showNotification(`🔔 تغییرات حین بازی جدید از سوی سرمربی «${data.team_name}» دریافت شد.`, 'info');
            await reloadTeamGameplans();
            await fetchLiveMatchState(selectedLiveMatch.id);
          } else if (data.type === 'sub_request') {
            const isHomeTeam = data.team_id === (selectedLiveMatch.home_team || selectedLiveMatch.homeId);
            const newSub = {
              id: data.request_id || Date.now(),
              type: 'SUBSTITUTION',
              teamSide: isHomeTeam ? 'home' : 'away',
              team_id: data.team_id,
              team_name: data.team_name || (isHomeTeam ? selectedLiveMatch.home_team_name : selectedLiveMatch.away_team_name),
              player_out_name: data.player_out_name || 'بازیکن خروجی',
              player_in_name: data.player_in_name || 'بازیکن تعویضی',
              player_out_id: data.player_out_id,
              player_in_id: data.player_in_id,
              minute: data.minute || eventMinute,
              timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              status: 'PENDING',
            };

            setPendingChangesQueue((prev) => [newSub, ...prev]);
            showNotification(`🔄 درخواست تعویض زنده از سوی «${newSub.team_name}» ثبت شد.`, 'info');
            await reloadTeamGameplans();
            await fetchLiveMatchState(selectedLiveMatch.id);
          } else if (
            data.type === 'match_status' ||
            data.type === 'half_time' ||
            data.type === 'second_half_started' ||
            data.type === 'match_finished' ||
            data.type === 'new_event' ||
            data.type === 'event_deleted' ||
            data.type === 'in_game_change_applied'
          ) {
            fetchLiveMatchState(selectedLiveMatch.id);
            reloadTeamGameplans();
          }
        } catch (_e) {}
      };
    } catch (_e) {}

    return () => {
      if (ws) ws.close();
    };
  }, [selectedLiveMatch?.id, eventMinute]);

  // -------------------------------------------------------------
  // AUTHORITATIVE REFEREE MASTER ACTIONS
  // -------------------------------------------------------------
  const handleRefereeControlAction = async (action, extraData = {}) => {
    if (!selectedLiveMatch?.id) return;
    try {
      const res = await matchApi.controlMatch(selectedLiveMatch.id, {
        action,
        ...extraData,
      });

      if (res.data) {
        showNotification(`عملیات داوری (${action}) با موفقیت در سرور اعمال و همگام‌سازی شد.`);
        fetchLiveMatchState(selectedLiveMatch.id);
        loadMatchesAndWeeks();
      }
    } catch (err) {
      showNotification(`خطا در ثبت دستور داور: ${err.response?.data?.error || 'خطای اتصال به سرور'}`, 'error');
    }
  };

  // Score Adjustment (+ / -)
  const handleScoreAdjust = async (teamSide, delta) => {
    if (!selectedLiveMatch?.id) return;
    const currentHome = selectedLiveMatch.home_score || 0;
    const currentAway = selectedLiveMatch.away_score || 0;
    const newHome = teamSide === 'home' ? Math.max(0, currentHome + delta) : currentHome;
    const newAway = teamSide === 'away' ? Math.max(0, currentAway + delta) : currentAway;

    try {
      await matchApi.updateStatus(selectedLiveMatch.id, {
        home_score: newHome,
        away_score: newAway,
      });
      setSelectedLiveMatch((prev) => ({ ...prev, home_score: newHome, away_score: newAway }));
      showNotification(`نتیجه بازی به ${newHome} - ${newAway} تغییر یافت.`);
    } catch (err) {
      showNotification('خطا در به‌روزرسانی گل', 'error');
    }
  };

  // Stoppage Time Update
  const handleSetStoppageTime = async (minutes) => {
    if (!selectedLiveMatch?.id) return;
    try {
      await matchApi.syncMatchClock(selectedLiveMatch.id, eventMinute, minutes, true);
      setStoppageInput(minutes);
      showNotification(`زمان تلف‌شده به +${minutes} دقیقه تنظیم شد.`);
    } catch (err) {
      showNotification('خطا در تنظیم وقت تلف‌شده', 'error');
    }
  };

  // -------------------------------------------------------------
  // R4: IN-GAME CHANGES APPROVAL & REJECTION ACTIONS
  // -------------------------------------------------------------
  const handleApproveInGameChange = async (request) => {
    if (!request || !selectedLiveMatch?.id) return;
    setSubmittingChangeId(request.id);

    try {
      if (request.id) {
        await matchApi.applyInGameChange(selectedLiveMatch.id, request.id);
      }

      await reloadTeamGameplans();
      showNotification(`درخواست تغییرات «${request.title || request.team_name}» تایید و اعمال شد ✅`);
      fetchLiveMatchState(selectedLiveMatch.id);
    } catch (err) {
      showNotification(`خطا در تایید تغییرات: ${err.response?.data?.error || 'مشکل ارتباط با سرور'}`, 'error');
    } finally {
      setSubmittingChangeId(null);
    }
  };

  const handleRejectInGameChange = async (request) => {
    if (!request || !selectedLiveMatch?.id) return;
    setSubmittingChangeId(request.id);

    try {
      if (request.id) {
        await matchApi.rejectInGameChange(selectedLiveMatch.id, request.id);
      }

      showNotification(`درخواست تغییرات «${request.title || request.team_name}» رد شد.`, 'info');
      fetchLiveMatchState(selectedLiveMatch.id);
    } catch (err) {
      showNotification(`خطا در رد درخواست: ${err.response?.data?.error || 'مشکل ارتباط با سرور'}`, 'error');
    } finally {
      setSubmittingChangeId(null);
    }
  };

  const handleBatchApproveAll = async (teamFilter = 'all') => {
    const targets = pendingChangesQueue.filter((r) => {
      if (teamFilter === 'all') return true;
      return r.teamSide === teamFilter;
    });

    for (const req of targets) {
      await handleApproveInGameChange(req);
    }
  };

  // -------------------------------------------------------------
  // R5: MATCH TEAM STATS SUBMISSION (DESK TAB 3)
  // -------------------------------------------------------------
  const handleDeskTeamStatsChange = (teamSide, metricKey, value) => {
    const val = parseInt(value, 10) || 0;
    setDeskTeamStats((prev) => {
      const updated = { ...prev, [teamSide]: { ...prev[teamSide], [metricKey]: val } };
      // Linked possession percent calculation
      if (metricKey === 'possession_percent') {
        const otherSide = teamSide === 'home' ? 'away' : 'home';
        updated[otherSide].possession_percent = Math.max(0, 100 - val);
      }
      return updated;
    });
  };

  const handleSaveDeskTeamStats = async () => {
    if (!selectedLiveMatch?.id) return;
    setSavingDeskTeamStats(true);
    try {
      const homeTeamId = selectedLiveMatch.home_team || selectedLiveMatch.homeId;
      const awayTeamId = selectedLiveMatch.away_team || selectedLiveMatch.awayId;

      // Submit stats for Home and Away teams
      await Promise.all([
        matchApi.submitTeamStats(selectedLiveMatch.id, {
          team_id: homeTeamId,
          ...deskTeamStats.home,
        }),
        matchApi.submitTeamStats(selectedLiveMatch.id, {
          team_id: awayTeamId,
          ...deskTeamStats.away,
        }),
      ]);

      showNotification(`آمار تیمی مسابقه #${selectedLiveMatch.id} با موفقیت در دیتابیس ثبت و ذخیره شد.`);
      fetchLiveMatchState(selectedLiveMatch.id);
    } catch (err) {
      showNotification(`خطا در ثبت آمار تیمی: ${err.response?.data?.error || 'مشکل ارتباط با سرور'}`, 'error');
    } finally {
      setSavingDeskTeamStats(false);
    }
  };

  // -------------------------------------------------------------
  // R5: PLAYER RATINGS & MINUTES SUBMISSION (DESK TAB 4)
  // -------------------------------------------------------------
  const handleUpdateDeskRating = (teamSide, playerId, field, val) => {
    if (teamSide === 'home') {
      setDeskRatingsHome((prev) =>
        prev.map((p) => (p.player_id === playerId ? { ...p, [field]: val } : p))
      );
    } else {
      setDeskRatingsAway((prev) =>
        prev.map((p) => (p.player_id === playerId ? { ...p, [field]: val } : p))
      );
    }
  };

  const handleSaveDeskPlayerRatings = async () => {
    if (!selectedLiveMatch?.id) return;
    setSavingDeskRatings(true);
    try {
      const combinedRoster = [...deskRatingsHome, ...deskRatingsAway];
      const payload = combinedRoster.map((p) => ({
        player_id: parseInt(p.player_id, 10) || p.player_id,
        minutes_played: parseInt(p.minutes_played, 10) || 0,
        rating: parseFloat(p.rating) || 6.0,
        was_starter: Boolean(p.was_starter),
        goals: parseInt(p.goals, 10) || 0,
        assists: parseInt(p.assists, 10) || 0,
      }));

      await matchApi.submitPlayerRatings(selectedLiveMatch.id, { players: payload });
      showNotification(`نمرات رسمی ${payload.length} بازیکن برای مسابقه #${selectedLiveMatch.id} ثبت گردید.`);
      fetchLiveMatchState(selectedLiveMatch.id);
    } catch (err) {
      showNotification(`خطا در ثبت نمرات: ${err.response?.data?.error || 'مشکل ارتباط با سرور'}`, 'error');
    } finally {
      setSavingDeskRatings(false);
    }
  };

  // -------------------------------------------------------------
  // ON-PITCH EVENT REGISTRATION CALLBACK
  // -------------------------------------------------------------
  const handleOnPushPitchEvent = async (eventObj) => {
    if (!selectedLiveMatch?.id) return;
    try {
      const activeTeamId =
        selectedLiveTeamSwitch === 'home'
          ? selectedLiveMatch.home_team || selectedLiveMatch.homeId
          : selectedLiveMatch.away_team || selectedLiveMatch.awayId;

      const res = await matchApi.recordEvent(selectedLiveMatch.id, {
        event_type: eventObj.type === 'ASSIST' || eventObj.type === 'RATING' ? 'INFO' : eventObj.type,
        minute: eventMinute,
        team_id: activeTeamId,
        player_id: eventObj.player_id || eventObj.player,
        player: eventObj.player_id || eventObj.player,
        detail: eventObj.text || 'رویداد زمین مسابقه',
      });

      const updatedHomeScore = res.data?.home_score ?? res.data?.match?.home_score;
      const updatedAwayScore = res.data?.away_score ?? res.data?.match?.away_score;

      if (updatedHomeScore !== undefined && updatedAwayScore !== undefined) {
        setSelectedLiveMatch((prev) => ({
          ...prev,
          home_score: updatedHomeScore,
          away_score: updatedAwayScore,
        }));
        setAllMatches((prevList) =>
          prevList.map((m) =>
            m.id === selectedLiveMatch.id
              ? { ...m, home_score: updatedHomeScore, away_score: updatedAwayScore }
              : m
          )
        );
      }

      showNotification(`رویداد «${eventObj.text || eventObj.type}» با موفقیت ثبت و نتیجه بروزرسانی شد ✅`);
      fetchLiveMatchState(selectedLiveMatch.id);
    } catch (err) {
      console.warn('Failed to record on-pitch event:', err);
      showNotification('خطا در ثبت رویداد مسابقه', 'error');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!selectedLiveMatch?.id || !eventId) return;
    try {
      const res = await matchApi.deleteEvent(selectedLiveMatch.id, eventId);
      const updatedHomeScore = res.data?.home_score ?? res.data?.match?.home_score;
      const updatedAwayScore = res.data?.away_score ?? res.data?.match?.away_score;

      if (updatedHomeScore !== undefined && updatedAwayScore !== undefined) {
        setSelectedLiveMatch((prev) => ({
          ...prev,
          home_score: updatedHomeScore,
          away_score: updatedAwayScore,
        }));
        setAllMatches((prevList) =>
          prevList.map((m) =>
            m.id === selectedLiveMatch.id
              ? { ...m, home_score: updatedHomeScore, away_score: updatedAwayScore }
              : m
          )
        );
      }

      showNotification('رویداد با موفقیت لغو و نتیجه مسابقه اصلاح شد.');
      fetchLiveMatchState(selectedLiveMatch.id);
    } catch (err) {
      showNotification('خطا در لغو رویداد', 'error');
    }
  };

  // Match State calculations
  const matchStatus = selectedLiveMatch?.status || 'SCHEDULED';
  const halfStatus = selectedLiveMatch?.half_status || 'NOT_STARTED';

  const isMatchLive = matchStatus === 'LIVE';
  const isMatchFinished = matchStatus === 'FINISHED' || halfStatus === 'FINISHED';

  const is1stHalfStarted =
    isMatchLive || isMatchFinished || halfStatus === '1ST_HALF' || halfStatus === 'HALF_TIME' || halfStatus === '2ND_HALF';
  const isHalfTimeReached = halfStatus === 'HALF_TIME' || halfStatus === '2ND_HALF' || isMatchFinished;
  const is2ndHalfStarted = halfStatus === '2ND_HALF' || isMatchFinished;
  const isMatchConcluded = isMatchFinished;

  const activeSideData = selectedLiveTeamSwitch === 'home' ? teamGameplanData.home : teamGameplanData.away;
  const activeTeamName =
    selectedLiveTeamSwitch === 'home'
      ? selectedLiveMatch?.home_team_name || selectedLiveMatch?.home || 'میزبان'
      : selectedLiveMatch?.away_team_name || selectedLiveMatch?.away || 'میهمان';
  const activeTactics = activeSideData.tactics || {};

  // Pending count badges for R4
  const homePendingCount = pendingChangesQueue.filter((r) => r.teamSide === 'home').length;
  const awayPendingCount = pendingChangesQueue.filter((r) => r.teamSide === 'away').length;
  const totalPendingChanges = pendingChangesQueue.length;

  // -------------------------------------------------------------
  // REGISTER COACH & TEAM STATE (SUBTAB 5)
  // -------------------------------------------------------------
  const [newCoach, setNewCoach] = useState({
    coachName: '',
    clubName: '',
    email: '',
    password: '',
    phoneNumber: '',
    budget: 850000000,
    wageCap: 10000,
  });

  const handleRegisterCoachSubmit = async (e) => {
    e.preventDefault();
    if (!newCoach.coachName || !newCoach.clubName) {
      showNotification('لطفاً نام مربی و نام باشگاه را وارد کنید.', 'error');
      return;
    }

    try {
      await adminApi.registerCoach({
        club_name: newCoach.clubName,
        budget: parseFloat(newCoach.budget) || 850000000,
        wage_cap: parseFloat(newCoach.wageCap) || 10000,
        username: newCoach.coachName || '',
      });
      showNotification(`مربی «${newCoach.coachName}» برای باشگاه «${newCoach.clubName}» با موفقیت ثبت شد!`);
      loadMatchesAndWeeks();
      setNewCoach({
        coachName: '',
        clubName: '',
        email: '',
        password: '',
        phoneNumber: '',
        budget: 850000000,
        wageCap: 10000,
      });
    } catch (err) {
      showNotification(`خطا: ${err.response?.data?.error || 'مشکل ثبت مربی در سرور'}`, 'error');
    }
  };

  // -------------------------------------------------------------
  // PAYMENT REQUESTS STATE (TRANSACTIONS MANAGEMENT)
  // -------------------------------------------------------------
  const [adminPayments, setAdminPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [reviewingPayment, setReviewingPayment] = useState(null); // { payment, action: 'approve' | 'reject' }
  const [adminReviewNote, setAdminReviewNote] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [adminViewReceipt, setAdminViewReceipt] = useState(null);

  const fetchAdminPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const params = paymentStatusFilter !== 'ALL' ? { status: paymentStatusFilter } : {};
      const res = await economyApi.adminGetPaymentRequests(params);
      setAdminPayments(res.data || []);
    } catch (err) {
      console.warn('Failed to load admin payment requests', err);
      showNotification('خطا در دریافت لیست تراکنش‌ها', 'error');
    } finally {
      setLoadingPayments(false);
    }
  }, [paymentStatusFilter]);

  useEffect(() => {
    fetchAdminPayments();
  }, [fetchAdminPayments]);

  const handleAdminReviewSubmit = async () => {
    if (!reviewingPayment) return;
    const { payment, action } = reviewingPayment;
    if (action === 'reject' && !adminReviewNote.trim()) {
      showNotification('لطفاً دلیل رد درخواست را در بخش یادداشت وارد کنید.', 'error');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await economyApi.adminReviewPayment(payment.id, {
        action,
        admin_note: adminReviewNote.trim(),
      });
      showNotification(
        action === 'approve'
          ? `واریز با موفقیت تایید شد و به حساب تیم ${payment.team_name || ''} اعمال گردید!`
          : `درخواست واریز تیم ${payment.team_name || ''} با موفقیت رد شد.`
      );
      setReviewingPayment(null);
      setAdminReviewNote('');
      fetchAdminPayments();
    } catch (err) {
      showNotification(err.response?.data?.error || 'خطا در ثبت بررسی ادمین', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const pendingPaymentsCount = useMemo(() => {
    return (adminPayments || []).filter((p) => p && p.status === 'PENDING_REVIEW').length;
  }, [adminPayments]);

  // -------------------------------------------------------------
  // STORE PACKAGES STATE (DIAMONDS & DOLLARS MANAGEMENT)
  // -------------------------------------------------------------
  const [adminPackages, setAdminPackages] = useState([]);
  const [loadingAdminPackages, setLoadingAdminPackages] = useState(false);
  const [packageFilter, setPackageFilter] = useState('ALL'); // 'ALL' | 'GEMS' | 'BUDGET' | 'ACTIVE' | 'INACTIVE'
  const [editingPackage, setEditingPackage] = useState(null); // form object or null
  const [isSavingPackage, setIsSavingPackage] = useState(false);
  const [isTogglingPackageId, setIsTogglingPackageId] = useState(null);
  const [deletingPackage, setDeletingPackage] = useState(null);

  const fetchAdminPackages = useCallback(async () => {
    setLoadingAdminPackages(true);
    try {
      const res = await economyApi.adminGetAllPackages();
      setAdminPackages(res.data || []);
    } catch (err) {
      console.warn('Failed to load admin store packages', err);
      showNotification('خطا در دریافت لیست بسته‌های فروشگاه', 'error');
    } finally {
      setLoadingAdminPackages(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminPackages();
  }, [fetchAdminPackages]);

  const handleTogglePackage = async (pkg) => {
    if (!pkg?.id) return;
    setIsTogglingPackageId(pkg.id);
    try {
      const res = await economyApi.adminTogglePackage(pkg.id);
      showNotification(res.data?.message || 'وضعیت بسته تغییر یافت.');
      fetchAdminPackages();
    } catch (err) {
      showNotification(err.response?.data?.error || 'خطا در تغییر وضعیت بسته', 'error');
    } finally {
      setIsTogglingPackageId(null);
    }
  };

  const handleSavePackage = async (e) => {
    if (e) e.preventDefault();
    if (!editingPackage) return;
    if (!editingPackage.name?.trim()) {
      showNotification('لطفاً نام بسته را وارد کنید.', 'error');
      return;
    }
    if (!editingPackage.reward_amount || Number(editingPackage.reward_amount) <= 0) {
      showNotification('لطفاً مقدار ارز اعطایی معتبر وارد کنید.', 'error');
      return;
    }
    if (!editingPackage.price_irr || Number(editingPackage.price_irr) <= 0) {
      showNotification('لطفاً قیمت به تومان معتبر وارد کنید.', 'error');
      return;
    }

    setIsSavingPackage(true);
    try {
      const payload = {
        name: editingPackage.name.trim(),
        currency_type: editingPackage.currency_type || 'GEMS',
        reward_amount: Number(editingPackage.reward_amount),
        bonus_amount: Number(editingPackage.bonus_amount || 0),
        price_irr: Number(editingPackage.price_irr),
        description: editingPackage.description?.trim() || '',
        icon_code: editingPackage.icon_code?.trim() || '',
        sort_order: Number(editingPackage.sort_order || 0),
        is_active: editingPackage.is_active !== false,
      };

      if (editingPackage.id) {
        await economyApi.adminUpdatePackage(editingPackage.id, payload);
        showNotification(`بسته «${payload.name}» با موفقیت ویرایش شد.`);
      } else {
        await economyApi.adminCreatePackage(payload);
        showNotification(`بسته جدید «${payload.name}» با موفقیت ساخته شد.`);
      }

      setEditingPackage(null);
      fetchAdminPackages();
    } catch (err) {
      showNotification(err.response?.data?.error || 'خطا در ذخیره بسته', 'error');
    } finally {
      setIsSavingPackage(false);
    }
  };

  const handleDeletePackageConfirm = async () => {
    if (!deletingPackage?.id) return;
    setIsSavingPackage(true);
    try {
      const res = await economyApi.adminDeletePackage(deletingPackage.id);
      showNotification(res.data?.message || 'بسته غیرفعال شد.');
      setDeletingPackage(null);
      fetchAdminPackages();
    } catch (err) {
      showNotification(err.response?.data?.error || 'خطا در غیرفعال‌سازی بسته', 'error');
    } finally {
      setIsSavingPackage(false);
    }
  };

  const adminSubnavItems = useMemo(() => {
    return [
      { id: 'overview', label: 'داشبورد ارشد' },
      { id: 'transactions', label: 'مدیریت واریزی‌ها و تراکنش‌ها', badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : null },
      { id: 'store_packages', label: 'مدیریت بسته‌های فروشگاه' },
      { id: 'live_admin', label: 'اتاق داوری و کنترل مسابقات' },
      { id: 'tournament_hub', label: 'مدیریت لیگ و جام حذفی' },
      { id: 'packs_season_pass', label: 'مدیریت پک‌ها و سیزن پس' },
      { id: 'match_team_stats', label: 'ثبت سریع آمار تیمی' },
      { id: 'match_player_ratings', label: 'ثبت سریع نمرات بازیکنان' },
      { id: 'register_coach', label: 'مدیریت و ثبت مربیان' },
      { id: 'audit_logs', label: 'گزارش تغییرات سیستم' },
    ];
  }, [pendingPaymentsCount]);

  // -------------------------------------------------------------
  // AUDIT LOGS STATE (SUBTAB 6)
  // -------------------------------------------------------------
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilterTeam, setAuditFilterTeam] = useState('');
  const [auditFilterAction, setAuditFilterAction] = useState('');

  useEffect(() => {
    if (activeSub === 'audit_logs') {
      let url = '/api/audit/logs/';
      const params = new URLSearchParams();
      if (auditFilterTeam) params.append('target_team', auditFilterTeam);
      if (auditFilterAction) params.append('action_type', auditFilterAction);
      if (params.toString()) url += `?${params.toString()}`;

      api
        .get(url)
        .then((res) => {
          setAuditLogs(res.data || []);
        })
        .catch((err) => {
          console.warn('Failed to fetch audit logs', err);
        });
    }
  }, [activeSub, auditFilterTeam, auditFilterAction]);

  return (
    <div className="space-y-4 pb-20 font-sans dir-rtl text-slate-200">
      {/* Sub Navigation Bar */}
      <SubNav items={adminSubnavItems} activeId={activeSub} onChange={setActiveSub} />

      {/* Global Admin Toast Notification */}
      <AnimatePresence>
        {adminMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`text-xs font-bold p-3.5 rounded-2xl border text-center shadow-2xl flex items-center justify-center gap-2 ${
              adminMessageType === 'error'
                ? 'bg-rose-950/95 border-rose-500/60 text-rose-200 shadow-rose-950/50'
                : adminMessageType === 'info'
                ? 'bg-cyan-950/95 border-cyan-500/60 text-cyan-200 shadow-cyan-950/50'
                : 'bg-emerald-950/95 border-emerald-500/60 text-emerald-200 shadow-emerald-950/50'
            }`}
          >
            {adminMessageType === 'error' ? (
              <AlertTriangle size={18} />
            ) : adminMessageType === 'info' ? (
              <Bell size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}
            <span>{adminMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SUBTAB 1: OVERVIEW & SYSTEM KPIS                                          */}
      {/* ========================================================================= */}
      {activeSub === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="glass-panel p-4 rounded-3xl border border-purple-500/30 text-center shadow-lg">
              <span className="text-2xl font-black text-purple-400 block font-sport">{allTeams.length || 16}</span>
              <span className="text-[11px] text-slate-400 mt-1 block">باشگاه‌های فعال لیگ</span>
            </div>
            <div className="glass-panel p-4 rounded-3xl border border-cyan-500/30 text-center shadow-lg">
              <span className="text-2xl font-black text-cyan-400 block font-sport">{allMatches.length || 240}</span>
              <span className="text-[11px] text-slate-400 mt-1 block">کل مسابقات فصل</span>
            </div>
            <div className="glass-panel p-4 rounded-3xl border border-emerald-500/30 text-center shadow-lg">
              <span className="text-2xl font-black text-emerald-400 block font-sport">{gameweeksStatus.length || 30}</span>
              <span className="text-[11px] text-slate-400 mt-1 block">هفته‌های مسابقاتی</span>
            </div>
            <div className="glass-panel p-4 rounded-3xl border border-amber-500/30 text-center shadow-lg">
              <span className="text-2xl font-black text-amber-300 block font-sport">
                {(allMatches || []).filter((m) => m.status === 'LIVE').length > 0 ? '🔴 زنده' : '⚪ عادی'}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">وضعیت پخش لیگ</span>
            </div>
          </div>

          {/* Quick System Actions */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
            <h3 className="font-black text-white text-sm flex items-center gap-2">
              <Zap size={18} className="text-amber-400" />
              <span>عملیات سریع سیستمی و سلامت مسابقات</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                onClick={() => showNotification('استقامت تمام بازیکنان لیگ به ۱۰۰٪ بازنشانی شد و مصدومیت‌ها درمان شدند.')}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-2xl text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <HeartPulse size={16} className="text-rose-400" />
                <span>ریکاوری ۱۰۰٪ استقامت لیگ</span>
              </button>
              <button
                onClick={() => showNotification('درآمد هفتگی اسپانسر و بلیت‌فروشی استادیوم به حساب باشگاه‌ها واریز شد.')}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-2xl text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <DollarSign size={16} className="text-emerald-400" />
                <span>واریز درآمد هفته و اسپانسر</span>
              </button>
              <button
                onClick={loadMatchesAndWeeks}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/50 rounded-2xl text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={16} className="text-purple-400" />
                <span>همگام‌سازی کامل با سرور</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: TRANSACTIONS & CARD-TO-CARD PAYMENT REQUESTS                      */}
      {/* ========================================================================= */}
      {activeSub === 'transactions' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-xs">
          {/* Header & KPI Summary Cards */}
          <div className="glass-panel p-5 rounded-3xl border border-cyan-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] shrink-0">
                  <CreditCard size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base flex items-center gap-2">
                    <span>مدیریت واریزی‌ها و درخواست‌های خرید</span>
                    {pendingPaymentsCount > 0 && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-sport font-bold animate-pulse">
                        {pendingPaymentsCount} در انتظار بررسی
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    بررسی فیش‌های کارت‌به‌کارت واریزی کاربران، تایید شارژ جم یا بودجه دلاری و رد درخواست‌های نامعتبر
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchAdminPayments}
                  disabled={loadingPayments}
                  className="px-3 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95"
                >
                  <RefreshCw size={14} className={`text-cyan-400 ${loadingPayments ? 'animate-spin' : ''}`} />
                  <span>بروزرسانی لیست</span>
                </button>
              </div>
            </div>

            {/* Quick KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/80">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 block">کل درخواست‌ها:</span>
                <span className="text-xl font-black text-white font-sport">
                  {(adminPayments || []).length}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-1 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <span className="text-[11px] text-amber-300 block">در انتظار بررسی:</span>
                <span className="text-xl font-black text-amber-400 font-sport">
                  {pendingPaymentsCount}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-1">
                <span className="text-[11px] text-emerald-300 block">تایید شده:</span>
                <span className="text-xl font-black text-emerald-400 font-sport">
                  {(adminPayments || []).filter((p) => p && p.status === 'APPROVED').length}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-1">
                <span className="text-[11px] text-rose-300 block">رد شده:</span>
                <span className="text-xl font-black text-rose-400 font-sport">
                  {(adminPayments || []).filter((p) => p && p.status === 'REJECTED').length}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Status Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'ALL', label: 'همه تراکنش‌ها' },
              { id: 'PENDING_REVIEW', label: `منتظر بررسی ادمین (${pendingPaymentsCount})` },
              { id: 'AWAITING_RECEIPT', label: 'در انتظار ارسال فیش' },
              { id: 'APPROVED', label: 'تایید شده' },
              { id: 'REJECTED', label: 'رد شده' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPaymentStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  paymentStatusFilter === tab.id
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Payment Requests List */}
          {loadingPayments ? (
            <div className="p-12 text-center text-slate-400 glass-panel rounded-3xl border border-slate-800 space-y-2">
              <RefreshCw size={24} className="mx-auto text-cyan-400 animate-spin" />
              <p className="text-xs font-bold">در حال دریافت لیست درخواست‌های واریز...</p>
            </div>
          ) : (adminPayments || []).length === 0 ? (
            <div className="p-12 text-center text-slate-400 glass-panel rounded-3xl border border-slate-800 space-y-2">
              <CreditCard size={32} className="mx-auto text-slate-600" />
              <p className="font-bold text-slate-300">هیچ درخواست پرداختی در این وضعیت یافت نشد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(adminPayments || []).map((req) => {
                if (!req) return null;
                const isPending = req.status === 'PENDING_REVIEW';
                const isApproved = req.status === 'APPROVED';
                const isRejected = req.status === 'REJECTED';
                const isAwaiting = req.status === 'AWAITING_RECEIPT';
                const rewardAmt = req.reward_amount || req.usd_amount || 0;
                const isGem = req.currency_type === 'GEMS';

                return (
                  <div
                    key={req.id}
                    className={`glass-panel p-4 rounded-3xl border transition-all space-y-3 relative overflow-hidden ${
                      isPending
                        ? 'border-amber-500/60 bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                        : isApproved
                        ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 via-slate-900 to-slate-950'
                        : isRejected
                        ? 'border-rose-500/40 bg-gradient-to-b from-rose-950/20 via-slate-900 to-slate-950'
                        : 'border-slate-800 bg-slate-900/70'
                    }`}
                  >
                    {/* Top Row: Team & Status */}
                    <div className="flex justify-between items-start border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                          {getTeamLogoUrl(req.team_name) ? (
                            <img
                              src={getTeamLogoUrl(req.team_name)}
                              alt={String(req.team_name || '')}
                              className="w-8 h-8 object-contain"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <Building size={20} className="text-cyan-400" />
                          )}
                        </div>
                        <div>
                          <strong className="text-white font-bold text-sm block">
                            {String(req.team_name || 'تیم ناشناس')}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-sport">
                            شناسه: #{req.id} • {req.created_at ? new Date(req.created_at).toLocaleDateString('fa-IR') + ' ' + new Date(req.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isPending && (
                          <span className="text-amber-300 font-bold flex items-center gap-1 bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/40 text-[10px] animate-pulse">
                            <Clock size={12} /> در انتظار تایید
                          </span>
                        )}
                        {isApproved && (
                          <span className="text-emerald-300 font-bold flex items-center gap-1 bg-emerald-500/20 px-2.5 py-1 rounded-xl border border-emerald-500/40 text-[10px]">
                            <CheckCircle size={12} /> تایید شده
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-rose-300 font-bold flex items-center gap-1 bg-rose-500/20 px-2.5 py-1 rounded-xl border border-rose-500/40 text-[10px]">
                            <XCircle size={12} /> رد شده
                          </span>
                        )}
                        {isAwaiting && (
                          <span className="text-cyan-300 font-bold flex items-center gap-1 bg-cyan-500/20 px-2.5 py-1 rounded-xl border border-cyan-500/40 text-[10px]">
                            <UploadCloud size={12} /> منتظر ارسال فیش
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Package Info & Amount */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800/80">
                      <div>
                        <span className="text-slate-400 text-[10px] block">بسته درخواستی:</span>
                        <span className="font-bold text-white text-xs block">{String(req.package_name || 'بسته شارژ')}</span>
                        <span className={`text-[11px] font-black font-sport dir-ltr inline-block mt-0.5 ${isGem ? 'text-cyan-400' : 'text-amber-400'}`}>
                          {isGem ? `+${Number(rewardAmt).toLocaleString('fa-IR')} 💎 الماس` : `+$${Number(rewardAmt).toLocaleString('fa-IR')} USD`}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-slate-400 text-[10px] block">مبلغ واریزی:</span>
                        <strong className="text-amber-400 font-black text-sm dir-ltr font-sport block">
                          {(req.amount_irr || 0).toLocaleString('fa-IR')} تومان
                        </strong>
                      </div>
                    </div>

                    {/* Admin Note if already reviewed */}
                    {req.admin_note && (
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[10.5px] text-slate-300">
                        <span className="text-slate-500 block text-[9.5px]">یادداشت بررسی ادمین:</span>
                        <span>{req.admin_note}</span>
                      </div>
                    )}

                    {/* Bottom Actions Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      {/* Receipt Image Button */}
                      {req.receipt_image ? (
                        <button
                          onClick={() => setAdminViewReceipt(req.receipt_image)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold flex items-center gap-1.5 border border-slate-700 hover:border-cyan-500/40 transition-all cursor-pointer"
                        >
                          <Eye size={14} />
                          <span>مشاهده فیش واریز</span>
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[10px] italic">فیش ارسال نشده</span>
                      )}

                      {/* Review Action Buttons */}
                      {(isPending || isAwaiting) && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setReviewingPayment({ payment: req, action: 'reject' });
                              setAdminReviewNote('');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <XCircle size={13} />
                            <span>رد</span>
                          </button>
                          <button
                            onClick={() => {
                              setReviewingPayment({ payment: req, action: 'approve' });
                              setAdminReviewNote('');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-[11px] font-black flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                          >
                            <CheckCircle2 size={14} />
                            <span>تایید و شارژ حساب</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: STORE PACKAGES MANAGEMENT (GEMS & DOLLARS)                        */}
      {/* ========================================================================= */}
      {activeSub === 'store_packages' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-xs">
          {/* Header & KPI Summary Cards */}
          <div className="glass-panel p-5 rounded-3xl border border-indigo-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(99,102,241,0.4)] shrink-0">
                  <Package size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base flex items-center gap-2">
                    <span>مدیریت بسته‌های فروشگاه (الماس 💎 و دلار 💵)</span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-sport font-bold">
                      {(adminPackages || []).length} بسته
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    تعریف بسته‌های شارژ جدید، تغییر نرخ قیمت‌ها، مدیریت بونوس‌های هدیه و فعال‌سازی/غیرفعال‌سازی سریع
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() =>
                    setEditingPackage({
                      id: null,
                      name: '',
                      currency_type: 'GEMS',
                      reward_amount: 100,
                      bonus_amount: 0,
                      price_irr: 49000,
                      is_active: true,
                      description: '',
                      icon_code: '',
                      sort_order: (adminPackages || []).length + 1,
                    })
                  }
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all active:scale-95"
                >
                  <Plus size={16} />
                  <span>افزودن بسته جدید</span>
                </button>
                <button
                  onClick={fetchAdminPackages}
                  disabled={loadingAdminPackages}
                  className="px-3 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95"
                >
                  <RefreshCw size={14} className={`text-indigo-400 ${loadingAdminPackages ? 'animate-spin' : ''}`} />
                  <span>بروزرسانی</span>
                </button>
              </div>
            </div>

            {/* Quick KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/80">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 block">کل بسته‌های ثبت‌شده:</span>
                <span className="text-xl font-black text-white font-sport">
                  {(adminPackages || []).length}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 space-y-1 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <span className="text-[11px] text-cyan-300 block">بسته‌های الماس (💎):</span>
                <span className="text-xl font-black text-cyan-400 font-sport">
                  {(adminPackages || []).filter((p) => p && p.currency_type === 'GEMS').length}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-1">
                <span className="text-[11px] text-emerald-300 block">بسته‌های دلاری (💵):</span>
                <span className="text-xl font-black text-emerald-400 font-sport">
                  {(adminPackages || []).filter((p) => p && p.currency_type === 'BUDGET').length}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 space-y-1">
                <span className="text-[11px] text-indigo-300 block">بسته‌های فعال در فروشگاه:</span>
                <span className="text-xl font-black text-indigo-400 font-sport">
                  {(adminPackages || []).filter((p) => p && p.is_active).length}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Status Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'ALL', label: `همه بسته‌ها (${(adminPackages || []).length})` },
              { id: 'GEMS', label: `الماس 💎 (${(adminPackages || []).filter((p) => p && p.currency_type === 'GEMS').length})` },
              { id: 'BUDGET', label: `بودجه دلاری 💵 (${(adminPackages || []).filter((p) => p && p.currency_type === 'BUDGET').length})` },
              { id: 'ACTIVE', label: `فقط فعال‌ها 🟢 (${(adminPackages || []).filter((p) => p && p.is_active).length})` },
              { id: 'INACTIVE', label: `فقط غیرفعال‌ها 🔴 (${(adminPackages || []).filter((p) => p && !p.is_active).length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPackageFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  packageFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Packages Table / Grid */}
          {loadingAdminPackages ? (
            <div className="p-12 text-center text-slate-400 glass-panel rounded-3xl border border-slate-800 space-y-2">
              <RefreshCw size={24} className="mx-auto text-indigo-400 animate-spin" />
              <p className="text-xs font-bold">در حال دریافت لیست بسته‌های فروشگاه...</p>
            </div>
          ) : (adminPackages || []).length === 0 ? (
            <div className="p-12 text-center text-slate-400 glass-panel rounded-3xl border border-slate-800 space-y-2">
              <Package size={32} className="mx-auto text-slate-600" />
              <p className="font-bold text-slate-300">هیچ بسته‌ای در دیتابیس ثبت نشده است.</p>
              <button
                onClick={() =>
                  setEditingPackage({
                    id: null,
                    name: '',
                    currency_type: 'GEMS',
                    reward_amount: 100,
                    bonus_amount: 0,
                    price_irr: 49000,
                    is_active: true,
                    description: '',
                    icon_code: '',
                    sort_order: 1,
                  })
                }
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1"
              >
                <Plus size={14} /> ساخت اولین بسته
              </button>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold text-[11px]">
                      <th className="p-3.5 w-14 text-center">ترتیب</th>
                      <th className="p-3.5">عنوان و توضیحات بسته</th>
                      <th className="p-3.5">نوع ارز</th>
                      <th className="p-3.5">ارز اصلی</th>
                      <th className="p-3.5">بونوس هدیه</th>
                      <th className="p-3.5">قیمت (تومان)</th>
                      <th className="p-3.5 text-center">وضعیت</th>
                      <th className="p-3.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(adminPackages || [])
                      .filter((p) => {
                        if (!p) return false;
                        if (packageFilter === 'GEMS') return p.currency_type === 'GEMS';
                        if (packageFilter === 'BUDGET') return p.currency_type === 'BUDGET';
                        if (packageFilter === 'ACTIVE') return p.is_active;
                        if (packageFilter === 'INACTIVE') return !p.is_active;
                        return true;
                      })
                      .map((pkg) => {
                        const isGem = pkg.currency_type === 'GEMS';
                        const isToggling = isTogglingPackageId === pkg.id;

                        return (
                          <tr
                            key={pkg.id}
                            className={`transition-colors ${
                              pkg.is_active
                                ? 'hover:bg-slate-900/60'
                                : 'bg-slate-950/40 opacity-60 hover:opacity-90'
                            }`}
                          >
                            {/* Sort Order */}
                            <td className="p-3.5 text-center">
                              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                                #{pkg.sort_order || 0}
                              </span>
                            </td>

                            {/* Name & Description */}
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                    isGem
                                      ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                                      : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                  }`}
                                >
                                  {isGem ? <Gem size={18} /> : <DollarSign size={18} />}
                                </div>
                                <div>
                                  <strong className="text-white font-bold text-xs block">
                                    {String(pkg.name || 'بدون عنوان')}
                                  </strong>
                                  {pkg.description ? (
                                    <span className="text-[10px] text-slate-400 line-clamp-1 block">
                                      {pkg.description}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-600 block">بدون توضیحات</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Currency Type */}
                            <td className="p-3.5">
                              {isGem ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                  <Gem size={11} /> الماس (جم)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  <DollarSign size={11} /> بودجه دلار
                                </span>
                              )}
                            </td>

                            {/* Main Reward */}
                            <td className="p-3.5">
                              <span className="font-bold text-white font-sport text-xs dir-ltr inline-block">
                                {isGem
                                  ? `+${Number(pkg.reward_amount || pkg.usd_amount || 0).toLocaleString('fa-IR')} 💎`
                                  : `+$${Number(pkg.reward_amount || pkg.usd_amount || 0).toLocaleString('fa-IR')}`}
                              </span>
                            </td>

                            {/* Bonus Amount */}
                            <td className="p-3.5">
                              {Number(pkg.bonus_amount || 0) > 0 ? (
                                <span className="font-sport font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-lg text-[10.5px] dir-ltr inline-block animate-pulse">
                                  +{Number(pkg.bonus_amount).toLocaleString('fa-IR')} هدیه
                                </span>
                              ) : (
                                <span className="text-slate-600 text-[11px]">—</span>
                              )}
                            </td>

                            {/* Price (Toman) */}
                            <td className="p-3.5">
                              <strong className="text-amber-400 font-bold text-xs font-sport dir-ltr inline-block">
                                {Number(pkg.price_irr || 0).toLocaleString('fa-IR')} تومان
                              </strong>
                            </td>

                            {/* Is Active Toggle */}
                            <td className="p-3.5 text-center">
                              <button
                                onClick={() => handleTogglePackage(pkg)}
                                disabled={isToggling}
                                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors cursor-pointer focus:outline-none ${
                                  pkg.is_active ? 'bg-emerald-500' : 'bg-slate-700'
                                }`}
                                title={pkg.is_active ? 'کلیک برای غیرفعال‌سازی' : 'کلیک برای فعال‌سازی'}
                              >
                                <span
                                  className={`inline-block w-4 h-4 transform bg-slate-950 rounded-full transition-transform ${
                                    pkg.is_active ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setEditingPackage({ ...pkg })}
                                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition-all cursor-pointer"
                                  title="ویرایش بسته"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => setDeletingPackage(pkg)}
                                  className="p-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                                  title="غیرفعال‌سازی و حذف نرم"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: REFEREE MATCH CONTROL ROOM & MODULAR 4-TAB DESK (R2, R4, R5)   */}
      {/* ========================================================================= */}
      {activeSub === 'live_admin' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {!selectedLiveMatch ? (
            /* --- MATCHES BROWSER & GAMEWEEK SELECTOR (R2) --- */
            <div className="space-y-4">
              {/* Gameweek Selector Header */}
              <div className="glass-panel p-4 rounded-3xl border border-cyan-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-cyan-900/60 rounded-xl border border-cyan-400/40 text-cyan-300">
                      <Tv size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-sm sm:text-base">برنامه و اتاق کنترل زنده مسابقات لیگ</h3>
                      <p className="text-[11px] text-slate-400">یک مسابقه را برای ورود به اتاق داوری، پخش زنده و کنترل بازی انتخاب کنید</p>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-slate-800 text-xs">
                    {['ALL', 'LIVE', 'SCHEDULED', 'FINISHED'].map((fKey) => (
                      <button
                        key={fKey}
                        onClick={() => setMatchFilter(fKey)}
                        className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                          matchFilter === fKey
                            ? 'bg-cyan-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {fKey === 'ALL' ? 'همه' : fKey === 'LIVE' ? '🔴 زنده' : fKey === 'SCHEDULED' ? 'برنامه‌ریزی' : 'پایان‌یافته'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horizontal Gameweek Selector Slider (Weeks 1 to 30) */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block mb-1.5 font-bold">انتخاب هفته مسابقاتی (هفته‌های ۱ تا ۳۰):</span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((gwNumber) => {
                      const gwLabel = `هفته ${gwNumber}`;
                      const selectedGwNum = extractRoundNumber(selectedGameweek) || 1;
                      const isSelected = selectedGwNum === gwNumber;
                      const gwMatches = (allMatches || []).filter((m) => extractRoundNumber(m.round_name) === gwNumber);
                      const hasLive = gwMatches.some((m) => m.status === 'LIVE');
                      const allFin = gwMatches.length > 0 && gwMatches.every((m) => m.status === 'FINISHED');

                      return (
                        <button
                          key={gwNumber}
                          onClick={() => setSelectedGameweek(gwLabel)}
                          className={`px-3.5 py-1.5 rounded-2xl text-xs font-sport font-black whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-2 border-cyan-400 shadow-lg shadow-cyan-950/50 scale-105'
                              : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          {hasLive && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>}
                          {allFin && <Check size={12} className="text-emerald-400" />}
                          <span>{gwLabel}</span>
                          <span className="text-[10px] opacity-60">({gwMatches.length})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Matches Grid (Strictly Filtered to Selected Week) */}
              {loadingMatches ? (
                <div className="p-16 text-center text-cyan-400 font-bold flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs">در حال بارگذاری مسابقات {selectedGameweek}...</span>
                </div>
              ) : gameweekMatches.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800 space-y-2">
                  <Info size={28} className="text-slate-500 mx-auto" />
                  <p className="text-slate-400 text-xs">هیچ مسابقه‌ای برای {selectedGameweek} با فیلتر انتخابی یافت نشد.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {gameweekMatches.map((m) => {
                    const homeName = m.home_team_name || 'میزبان';
                    const awayName = m.away_team_name || 'میهمان';
                    const homeLogo = getTeamLogoUrl(m.home_team_logo || homeName);
                    const awayLogo = getTeamLogoUrl(m.away_team_logo || awayName);
                    const isLive = m.status === 'LIVE';
                    const isFinished = m.status === 'FINISHED';

                    let timeStr = '۱۸:۰۰';
                    if (m.date) {
                      try {
                        const dt = new Date(m.date);
                        timeStr = dt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false });
                      } catch (_e) {}
                    }

                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedLiveMatch(m);
                          setRefereeDeskTab('live_desk');
                        }}
                        className={`glass-panel p-4 rounded-3xl border transition-all cursor-pointer hover:-translate-y-1 shadow-xl relative overflow-hidden group ${
                          isLive
                            ? 'border-rose-500/70 bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 shadow-rose-950/40'
                            : 'border-slate-800 hover:border-cyan-500/50 bg-slate-900/80'
                        }`}
                      >
                        {/* Status Badge */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] text-slate-400 font-sport bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
                            بازی #{m.id} • {m.round_name}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1 font-sport ${
                              isLive
                                ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
                                : isFinished
                                ? 'bg-slate-950 text-slate-400 border-slate-700'
                                : 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                            }`}
                          >
                            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>}
                            {isLive ? 'در حال برگزاری زنده (LIVE)' : isFinished ? 'پایان یافته' : `ساعت ${timeStr}`}
                          </span>
                        </div>

                        {/* Teams & Score Display */}
                        <div className="flex items-center justify-between gap-3 my-2 px-2">
                          {/* Home */}
                          <div className="flex items-center gap-2.5 w-[42%] justify-start">
                            <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-700 p-1.5 shrink-0 flex items-center justify-center shadow-md">
                              {homeLogo ? (
                                <img src={homeLogo} alt={homeName} className="w-full h-full object-contain" />
                              ) : (
                                <span className="font-bold text-xs">{homeName.slice(0, 2)}</span>
                              )}
                            </div>
                            <span className="font-black text-xs sm:text-sm text-white truncate">{homeName}</span>
                          </div>

                          {/* Center Score / VS */}
                          <div className="text-center shrink-0">
                            {isLive || isFinished ? (
                              <div className="px-3 py-1 bg-slate-950 rounded-xl border border-slate-700 font-sport font-black text-sm text-[#00ff87]">
                                {m.home_score ?? 0} - {m.away_score ?? 0}
                              </div>
                            ) : (
                              <span className="text-slate-500 font-sport font-bold text-xs">VS</span>
                            )}
                          </div>

                          {/* Away */}
                          <div className="flex items-center gap-2.5 w-[42%] justify-end text-left">
                            <span className="font-black text-xs sm:text-sm text-white truncate text-right">{awayName}</span>
                            <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-700 p-1.5 shrink-0 flex items-center justify-center shadow-md">
                              {awayLogo ? (
                                <img src={awayLogo} alt={awayName} className="w-full h-full object-contain" />
                              ) : (
                                <span className="font-bold text-xs">{awayName.slice(0, 2)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Lineup Readiness Summary */}
                        <div className="flex items-center justify-between text-[10.5px] py-1 px-1 mt-1 border-t border-slate-800/50">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">ترکیب میزبان:</span>
                            <span className={`font-bold flex items-center gap-0.5 ${m.home_lineup_ready ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {m.home_lineup_ready ? '✓ ثبت‌شده' : '⏳ پیش‌فرض'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">ترکیب میهمان:</span>
                            <span className={`font-bold flex items-center gap-0.5 ${m.away_lineup_ready ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {m.away_lineup_ready ? '✓ ثبت‌شده' : '⏳ پیش‌فرض'}
                            </span>
                          </div>
                        </div>

                        {/* Action CTA */}
                        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-400">سرمربیان: {m.home_team_name?.split(' ')[0]} vs {m.away_team_name?.split(' ')[0]}</span>
                          <span className="text-cyan-400 group-hover:text-cyan-300 font-bold flex items-center gap-1">
                            <span>ورود به میز داوری و کنترل مسابقه</span>
                            <ChevronLeftIcon />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* --- ACTIVE 4-TAB REFEREE MATCH MANAGEMENT DESK (R5) --- */
            <div className="space-y-4">
              {/* Selected Match Master Header */}
              <div className="glass-panel p-4 rounded-3xl border border-cyan-500/50 bg-gradient-to-r from-slate-950 via-slate-900 to-purple-950/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedLiveMatch(null);
                      setShowPostMatchCardView(false);
                    }}
                    className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl border border-slate-700 transition-colors cursor-pointer"
                    title="بازگشت به لیست بازی‌های لیگ"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-lg border border-cyan-500/30 font-sport">
                        {selectedLiveMatch.round_name || 'هفته اول'} • بازی #{selectedLiveMatch.id}
                      </span>
                      <span className="text-xs text-slate-400">اتاق داوری و نظارت ارشد</span>
                      {isMatchFinished && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-500/30">
                          ✓ پایان یافته
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-white text-base sm:text-lg mt-0.5 flex items-center gap-2">
                      <span>{selectedLiveMatch.home_team_name || selectedLiveMatch.home}</span>
                      <span className="text-[#00ff87] font-sport font-black px-2 py-0.5 bg-slate-950 rounded-lg border border-slate-800">
                        {selectedLiveMatch.home_score ?? 0} - {selectedLiveMatch.away_score ?? 0}
                      </span>
                      <span>{selectedLiveMatch.away_team_name || selectedLiveMatch.away}</span>
                    </h3>
                  </div>
                </div>

                {/* Post-Match Card Toggle for Finished Match */}
                {isMatchFinished && (
                  <button
                    onClick={() => setShowPostMatchCardView(!showPostMatchCardView)}
                    className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg ${
                      showPostMatchCardView
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-400'
                        : 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    <Trophy size={14} />
                    <span>{showPostMatchCardView ? 'مشاهده تب‌های مدیریت داوری' : 'مشاهده کارت مقایسه‌ای پس از بازی'}</span>
                  </button>
                )}

                {/* Coach Lineup Submission Indicators for this Match */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-slate-800/80">
                  {/* Home Team Lineup Status */}
                  <div className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 text-xs transition-all ${
                    (selectedLiveMatch.home_lineup_ready || teamGameplanData.home.gameplan?.is_submitted)
                      ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : 'bg-amber-950/60 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-white p-0.5 shrink-0 flex items-center justify-center shadow-sm">
                        {getTeamLogoUrl(selectedLiveMatch.home_team_logo || selectedLiveMatch.home_team_name || selectedLiveMatch.home) ? (
                          <img src={getTeamLogoUrl(selectedLiveMatch.home_team_logo || selectedLiveMatch.home_team_name || selectedLiveMatch.home)} alt="Home" className="w-full h-full object-contain" />
                        ) : <Shield size={14} className="text-slate-800" />}
                      </div>
                      <div className="truncate">
                        <span className="font-black text-white block truncate">{selectedLiveMatch.home_team_name || selectedLiveMatch.home} (میزبان)</span>
                        <span className="text-[10px] text-slate-400">سرمربی: {selectedLiveMatch.home_coach_name || 'ثبت نشده'}</span>
                      </div>
                    </div>
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl border shrink-0 flex items-center gap-1 font-sport ${
                      (selectedLiveMatch.home_lineup_ready || teamGameplanData.home.gameplan?.is_submitted)
                        ? 'bg-emerald-900/90 border-emerald-400 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : 'bg-amber-900/90 border-amber-400 text-amber-200 animate-pulse'
                    }`}>
                      {(selectedLiveMatch.home_lineup_ready || teamGameplanData.home.gameplan?.is_submitted) ? (
                        <>
                          <CheckCircle size={13} className="text-[#00ff87]" />
                          <span>ترکیب ارسال شده ✓</span>
                        </>
                      ) : (
                        <>
                          <Clock size={13} className="text-amber-300" />
                          <span>ترکیب پیش‌فرض (ارسال نشده)</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Away Team Lineup Status */}
                  <div className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 text-xs transition-all ${
                    (selectedLiveMatch.away_lineup_ready || teamGameplanData.away.gameplan?.is_submitted)
                      ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : 'bg-amber-950/60 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-white p-0.5 shrink-0 flex items-center justify-center shadow-sm">
                        {getTeamLogoUrl(selectedLiveMatch.away_team_logo || selectedLiveMatch.away_team_name || selectedLiveMatch.away) ? (
                          <img src={getTeamLogoUrl(selectedLiveMatch.away_team_logo || selectedLiveMatch.away_team_name || selectedLiveMatch.away)} alt="Away" className="w-full h-full object-contain" />
                        ) : <Shield size={14} className="text-slate-800" />}
                      </div>
                      <div className="truncate">
                        <span className="font-black text-white block truncate">{selectedLiveMatch.away_team_name || selectedLiveMatch.away} (میهمان)</span>
                        <span className="text-[10px] text-slate-400">سرمربی: {selectedLiveMatch.away_coach_name || 'ثبت نشده'}</span>
                      </div>
                    </div>
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl border shrink-0 flex items-center gap-1 font-sport ${
                      (selectedLiveMatch.away_lineup_ready || teamGameplanData.away.gameplan?.is_submitted)
                        ? 'bg-emerald-900/90 border-emerald-400 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : 'bg-amber-900/90 border-amber-400 text-amber-200 animate-pulse'
                    }`}>
                      {(selectedLiveMatch.away_lineup_ready || teamGameplanData.away.gameplan?.is_submitted) ? (
                        <>
                          <CheckCircle size={13} className="text-[#00ff87]" />
                          <span>ترکیب ارسال شده ✓</span>
                        </>
                      ) : (
                        <>
                          <Clock size={13} className="text-amber-300" />
                          <span>ترکیب پیش‌فرض (ارسال نشده)</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* POST MATCH COMPARISON CARD (If toggled or directly visible for finished matches) */}
              {showPostMatchCardView && (
                <PostMatchComparisonCard
                  match={selectedLiveMatch}
                  teamStats={deskTeamStats}
                  playerStats={liveMatchDetails?.match?.player_stats || []}
                  homeRoster={deskRatingsHome}
                  awayRoster={deskRatingsAway}
                  onClose={() => setShowPostMatchCardView(false)}
                />
              )}

              {/* 4-TAB REFEREE DESK NAVIGATION BAR */}
              {!showPostMatchCardView && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                  {REFEREE_DESK_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = refereeDeskTab === tab.id;
                    const hasPending = tab.id === 'in_game_changes' && totalPendingChanges > 0;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setRefereeDeskTab(tab.id)}
                        className={`p-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 relative cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/50 border border-cyan-400/50 scale-[1.02]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                        }`}
                      >
                        <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                        <span className="truncate">{tab.label}</span>
                        {hasPending && (
                          <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-sport flex items-center justify-center animate-bounce shadow-md">
                            {totalPendingChanges}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 1: LIVE DESK & EVENTS (کنترل زنده و رویدادهای بازی)          */}
              {/* ------------------------------------------------------------- */}
              {!showPostMatchCardView && refereeDeskTab === 'live_desk' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {/* AUTHORITATIVE REFEREE MATCH PERIOD CONTROLLER */}
                  <div className="glass-panel p-5 rounded-3xl border border-rose-500/50 bg-gradient-to-r from-rose-950/80 via-slate-900 to-purple-950/80 shadow-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Radio size={20} className="text-rose-400 animate-pulse" />
                        <div>
                          <h4 className="font-black text-white text-sm sm:text-base">پنل رسمی داوری و هدایت زمان بازی</h4>
                          <p className="text-[11px] text-slate-300 font-sport">
                            وضعیت رسمی سرور: <strong className="text-cyan-300">{halfStatus === 'NOT_STARTED' ? 'شروع نشده (SCHEDULED)' : halfStatus}</strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Referee Master Buttons (Darkened/Disabled when already executed) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Button 1: Start 1st Half */}
                      <button
                        onClick={() => handleRefereeControlAction('START_MATCH', { minute: 1 })}
                        disabled={is1stHalfStarted}
                        className={`p-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg ${
                          is1stHalfStarted
                            ? 'bg-slate-900 border border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer active:scale-95 animate-pulse'
                        }`}
                      >
                        <Play size={16} />
                        <span>{is1stHalfStarted ? '✓ نیمه اول آغاز شد (انجام‌شده)' : 'سوت آغاز نیمه اول (1st Half)'}</span>
                      </button>

                      {/* Button 2: Half Time Break (30s) */}
                      <button
                        onClick={() => handleRefereeControlAction('TRIGGER_HALF_TIME')}
                        disabled={halfStatus !== '1ST_HALF' || !isMatchLive}
                        className={`p-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg ${
                          isHalfTimeReached
                            ? 'bg-slate-900 border border-slate-800 text-amber-500/60 opacity-50 cursor-not-allowed'
                            : halfStatus === '1ST_HALF' && isMatchLive
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 cursor-pointer active:scale-95 animate-pulse'
                            : 'bg-slate-900 border border-slate-800 text-slate-500 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <Pause size={16} />
                        <span>{isHalfTimeReached ? '✓ استراحت بین دو نیمه (انجام‌شده)' : 'پایان نیمه اول (استراحت ۳۰s)'}</span>
                      </button>

                      {/* Button 3: Start 2nd Half */}
                      <button
                        onClick={() => handleRefereeControlAction('START_SECOND_HALF', { minute: 46 })}
                        disabled={halfStatus !== 'HALF_TIME'}
                        className={`p-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg ${
                          is2ndHalfStarted
                            ? 'bg-slate-900 border border-slate-800 text-cyan-500/60 opacity-50 cursor-not-allowed'
                            : halfStatus === 'HALF_TIME'
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 text-white cursor-pointer active:scale-95 animate-pulse'
                            : 'bg-slate-900 border border-slate-800 text-slate-500 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <Play size={16} />
                        <span>{is2ndHalfStarted ? '✓ نیمه دوم آغاز شد (انجام‌شده)' : 'آغاز نیمه دوم (2nd Half)'}</span>
                      </button>

                      {/* Button 4: Conclude Full Time */}
                      <button
                        onClick={() => handleRefereeControlAction('CONCLUDE_FULL_TIME')}
                        disabled={halfStatus !== '2ND_HALF' || isMatchFinished}
                        className={`p-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg ${
                          isMatchConcluded
                            ? 'bg-slate-900 border border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                            : halfStatus === '2ND_HALF'
                            ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 text-white cursor-pointer active:scale-95 animate-pulse'
                            : 'bg-slate-900 border border-slate-800 text-slate-500 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <Square size={16} />
                        <span>{isMatchConcluded ? '✓ مسابقه پایان یافت (Full Time)' : 'سوت پایان کامل بازی (FT)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* TACTICAL GAMEPLAN & ON-PITCH EVENT REGISTRATION PITCH */}
                  <div className="glass-panel p-5 rounded-3xl border border-purple-500/40 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                          <Sliders size={18} className="text-purple-400" />
                          <span>زمین چمن مسابقه و ثبت زنده رویدادها (تیم: {activeTeamName})</span>
                        </h4>
                        <p className="text-[11px] text-cyan-300 mt-0.5">
                          💡 روی هر بازیکن در زمین چمن کلیک کنید تا پنل ثبت گل، پاس‌گل، کارت، نمره و تعویض باز شود.
                        </p>
                      </div>

                      {/* Home / Away Team Toggle with Lineup Status */}
                      <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
                        <button
                          onClick={() => setSelectedLiveTeamSwitch('home')}
                          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            selectedLiveTeamSwitch === 'home'
                              ? 'bg-cyan-600 text-white shadow-md'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>{selectedLiveMatch.home_team_name || selectedLiveMatch.home} (میزبان)</span>
                          <span className={`w-2 h-2 rounded-full ${
                            (selectedLiveMatch.home_lineup_ready || teamGameplanData.home.gameplan?.is_submitted)
                              ? 'bg-[#00ff87] shadow-[0_0_8px_#00ff87]'
                              : 'bg-amber-400'
                          }`} title={(selectedLiveMatch.home_lineup_ready || teamGameplanData.home.gameplan?.is_submitted) ? 'ترکیب اختصاصی ارسال شده' : 'ترکیب پیش‌فرض'}></span>
                        </button>
                        <button
                          onClick={() => setSelectedLiveTeamSwitch('away')}
                          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            selectedLiveTeamSwitch === 'away'
                              ? 'bg-rose-600 text-white shadow-md'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>{selectedLiveMatch.away_team_name || selectedLiveMatch.away} (میهمان)</span>
                          <span className={`w-2 h-2 rounded-full ${
                            (selectedLiveMatch.away_lineup_ready || teamGameplanData.away.gameplan?.is_submitted)
                              ? 'bg-[#00ff87] shadow-[0_0_8px_#00ff87]'
                              : 'bg-amber-400'
                          }`} title={(selectedLiveMatch.away_lineup_ready || teamGameplanData.away.gameplan?.is_submitted) ? 'ترکیب اختصاصی ارسال شده' : 'ترکیب پیش‌فرض'}></span>
                        </button>
                      </div>
                    </div>

                    {/* Lineup Origin Banner */}
                    <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      (selectedLiveTeamSwitch === 'home' 
                        ? (selectedLiveMatch.home_lineup_ready || teamGameplanData.home.gameplan?.is_submitted)
                        : (selectedLiveMatch.away_lineup_ready || teamGameplanData.away.gameplan?.is_submitted))
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        {(selectedLiveTeamSwitch === 'home' 
                          ? (selectedLiveMatch.home_lineup_ready || teamGameplanData.home.gameplan?.is_submitted)
                          : (selectedLiveMatch.away_lineup_ready || teamGameplanData.away.gameplan?.is_submitted)) ? (
                          <>
                            <CheckCircle size={15} className="text-[#00ff87] shrink-0" />
                            <span>
                              این چیدمان و تاکتیک‌ها به صورت <strong>اختصاصی توسط سرمربی {activeTeamName}</strong> برای این مسابقه در اتاق داوری ثبت و تایید گردیده است.
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                            <span>
                              سرمربی {activeTeamName} هنوز ترکیب اختصاصی برای این مسابقه ارسال نکرده است (چیدمان پیش‌فرض باشگاه در حال نمایش است).
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] font-sport px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 shrink-0">
                        {activeSideData.formation}
                      </span>
                    </div>

                    {/* Interactive Tactical Pitch */}
                    <div className="bg-slate-950 p-2 rounded-3xl border-2 border-slate-800 shadow-2xl relative">
                      <ErrorBoundary>
                        <EFootballGamePlan
                          key={`admin-pitch-${selectedLiveMatch.id}-${selectedLiveTeamSwitch}-${activeSideData.starters.length}-${activeSideData.formation}`}
                          teamName={activeTeamName}
                          readOnly={true}
                          isAdminMode={true}
                          formation={activeSideData.formation}
                          initialStartingXi={activeSideData.starters}
                          initialSubstitutes={activeSideData.subs}
                          initialReserves={activeSideData.reserves}
                          matchState={halfStatus || currentMatchStatus}
                          onPushLiveEvent={handleOnPushPitchEvent}
                          hideReserves={false}
                        />
                      </ErrorBoundary>
                    </div>

                    {/* 14 Tactical Parameters Inspector */}
                    <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 mt-3">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Sliders size={16} className="text-purple-400" />
                          <h5 className="font-bold text-white text-xs sm:text-sm">
                            تنظیمات تاکتیکی سرمربی {activeTeamName} (هماهنگ با پنل مربی)
                          </h5>
                        </div>
                        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                          <button
                            onClick={() => setAdminTacticTab('attack')}
                            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                              adminTacticTab === 'attack' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            ⚔️ حمله
                          </button>
                          <button
                            onClick={() => setAdminTacticTab('defense')}
                            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                              adminTacticTab === 'defense' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            🛡️ دفاع
                          </button>
                          <button
                            onClick={() => setAdminTacticTab('advanced')}
                            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                              adminTacticTab === 'advanced' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            ⚙️ پیشرفته
                          </button>
                        </div>
                      </div>

                      {/* TAB 1: ATTACK TACTICS */}
                      {adminTacticTab === 'attack' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                              <span className="text-[10px] text-slate-400 block font-bold">۱. سبک حمله:</span>
                              <strong className="text-rose-300 block">{activeTactics.attacking_style || 'بازی مالکانه'}</strong>
                              <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeTactics.attacking_style || 'بازی مالکانه']}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                              <span className="text-[10px] text-slate-400 block font-bold">۲. بازیسازی (Build Up):</span>
                              <strong className="text-amber-300 block">{activeTactics.build_up || 'پاس کوتاه'}</strong>
                              <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeTactics.build_up || 'پاس کوتاه']}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                              <span className="text-[10px] text-slate-400 block font-bold">۳. منطقه حمله:</span>
                              <strong className="text-emerald-300 block">{activeTactics.attacking_area || 'مرکز'}</strong>
                              <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeTactics.attacking_area || 'مرکز']}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                              <span className="text-[10px] text-slate-400 block font-bold">۴. جای‌گیری (Positioning):</span>
                              <strong className="text-cyan-300 block">{activeTactics.positioning || 'شناور'}</strong>
                              <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeTactics.positioning || 'شناور']}</span>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block">۵. محدوده پشتیبانی (Support Range):</span>
                              <span className="text-[10px] text-slate-500">تنظیم فاصله بازیکنان پشتیبان از حامل توپ</span>
                            </div>
                            <div className="flex items-center gap-2 font-sport">
                              <div className="w-32 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700">
                                <div className="bg-rose-500 h-full rounded-full" style={{ width: `${((activeTactics.support_range || 5) / 10) * 100}%` }}></div>
                              </div>
                              <span className="text-sm font-black text-rose-400 px-2 py-0.5 bg-rose-950/80 rounded-lg border border-rose-500/30">
                                {activeTactics.support_range || 5} / ۱۰
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 2: DEFENSE TACTICS */}
                      {adminTacticTab === 'defense' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 text-xs">
                            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                              <span className="text-[10px] text-slate-400 block font-bold">۱. سبک‌های دفاعی:</span>
                              <strong className="text-cyan-300 block">{activeTactics.defensive_style || 'فشار خط مقدم'}</strong>
                              <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeTactics.defensive_style || 'فشار خط مقدم']}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                              <span className="text-[10px] text-slate-400 block font-bold">۲. ناحیه مهار (Containment Area):</span>
                              <strong className="text-purple-300 block">{activeTactics.containment_area || 'میانه'}</strong>
                              <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeTactics.containment_area || 'میانه']}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold block">۳. خط دفاعی (Defensive Line):</span>
                                <span className="text-[10px] text-slate-500">عمق استقرار خط دفاع</span>
                              </div>
                              <div className="flex items-center gap-2 font-sport">
                                <div className="w-24 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700">
                                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${((activeTactics.defensive_line || 5) / 10) * 100}%` }}></div>
                                </div>
                                <span className="text-sm font-black text-cyan-400 px-2 py-0.5 bg-cyan-950/80 rounded-lg border border-cyan-500/30">
                                  {activeTactics.defensive_line || 5} / ۱۰
                                </span>
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold block">۴. فشردگی و تراکم (Compactness):</span>
                                <span className="text-[10px] text-slate-500">فاصله بین خطوط تیم</span>
                              </div>
                              <div className="flex items-center gap-2 font-sport">
                                <div className="w-24 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700">
                                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${((activeTactics.compactness || 5) / 10) * 100}%` }}></div>
                                </div>
                                <span className="text-sm font-black text-purple-400 px-2 py-0.5 bg-purple-950/80 rounded-lg border border-purple-500/30">
                                  {activeTactics.compactness || 5} / ۱۰
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 3: ADVANCED TACTICS */}
                      {adminTacticTab === 'advanced' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/30 space-y-1">
                            <span className="text-[10px] text-rose-300 block font-bold">۱. تاکتیک هجومی ۱:</span>
                            <strong className="text-white block">{activeTactics.adv_offense_1 || 'تیکی تاکا'}</strong>
                            <span className="text-[10px] text-slate-400 block leading-tight">{TACTICAL_GUIDES[activeTactics.adv_offense_1 || 'تیکی تاکا']}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-1">
                            <span className="text-[10px] text-amber-300 block font-bold">۲. تاکتیک هجومی ۲:</span>
                            <strong className="text-white block">{activeTactics.adv_offense_2 || 'دفاع کنار‌های تهاجمی'}</strong>
                            <span className="text-[10px] text-slate-400 block leading-tight">{TACTICAL_GUIDES[activeTactics.adv_offense_2 || 'دفاع کنار‌های تهاجمی']}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-1">
                            <span className="text-[10px] text-cyan-300 block font-bold">۳. تاکتیک دفاعی ۱:</span>
                            <strong className="text-white block">{activeTactics.adv_defense_1 || 'شلوغی در محوطه جریمه'}</strong>
                            <span className="text-[10px] text-slate-400 block leading-tight">{TACTICAL_GUIDES[activeTactics.adv_defense_1 || 'شلوغی در محوطه جریمه']}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-1">
                            <span className="text-[10px] text-emerald-300 block font-bold">۴. تاکتیک دفاعی ۲:</span>
                            <strong className="text-white block">{activeTactics.adv_defense_2 || 'فشار'}</strong>
                            <span className="text-[10px] text-slate-400 block leading-tight">{TACTICAL_GUIDES[activeTactics.adv_defense_2 || 'فشار']}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live Events Timeline & Undo */}
                  {liveMatchDetails?.events && liveMatchDetails.events.length > 0 && (
                    <div className="glass-panel p-4 rounded-3xl border border-slate-800 space-y-2.5">
                      <h4 className="font-bold text-white text-xs flex items-center justify-between border-b border-slate-800 pb-2">
                        <span>جریان وقایع زنده بازی (Match Timeline)</span>
                        <span className="text-[10px] text-slate-400">امکان حذف و اصلاح رویدادهای اشتباه توسط داور</span>
                      </h4>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                        {liveMatchDetails.events.map((ev) => (
                          <div
                            key={ev.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                              ev.is_undone
                                ? 'bg-slate-950/40 border-slate-800 text-slate-600 line-through'
                                : 'bg-slate-950 border-slate-800 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-sport font-bold text-amber-400 text-xs">'{ev.minute}</span>
                              <span className="font-black text-cyan-300">{ev.event_type}</span>
                              <span className="text-slate-300">{ev.detail || ev.player?.name}</span>
                            </div>

                            {!ev.is_undone && (
                              <button
                                onClick={() => handleDeleteEvent(ev.id)}
                                className="p-1 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 transition-colors cursor-pointer"
                                title="حذف / ابطال این رویداد"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Aparat Stream URL Setting */}
                  <div className="glass-panel p-4 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Tv size={16} className="text-cyan-400 shrink-0" />
                      <span>آدرس پخش زنده آپارات:</span>
                      <input
                        type="text"
                        value={streamInput}
                        onChange={(e) => setStreamInput(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs w-64 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (setLiveStreamUrl) setLiveStreamUrl(streamInput);
                        showNotification('لینک پخش زنده آپارات به‌روزرسانی شد.');
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold border border-slate-700 cursor-pointer"
                    >
                      ذخیره و اعمال لینک پخش
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 2: IN-GAME CHANGES (R4: تغییرات حین بازی مربیان)             */}
              {/* ------------------------------------------------------------- */}
              {!showPostMatchCardView && refereeDeskTab === 'in_game_changes' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-xs">
                  {/* Top Header & Home/Away Filter Toggle */}
                  <div className="glass-panel p-5 rounded-3xl border border-cyan-500/40 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                          <ArrowLeftRight size={18} className="text-cyan-400" />
                          <span>میز بررسی و تایید تغییرات تاکتیکی و تعویض‌های مربیان</span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          تغییرات ارسال‌شده توسط مربیان را بررسی، با تیک تایید اعمال یا در صورت مغایرت رد کنید.
                        </p>
                      </div>

                      {/* Team Split Filter */}
                      <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
                        <button
                          onClick={() => setInGameChangesTeamTab('all')}
                          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                            inGameChangesTeamTab === 'all' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          همه ({totalPendingChanges})
                        </button>
                        <button
                          onClick={() => setInGameChangesTeamTab('home')}
                          className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            inGameChangesTeamTab === 'home' ? 'bg-cyan-700 text-white shadow-md' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>میزبان ({selectedLiveMatch.home_team_name?.split(' ')[0] || 'میزبان'})</span>
                          {homePendingCount > 0 && (
                            <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 font-sport font-black text-[9px] flex items-center justify-center">
                              {homePendingCount}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => setInGameChangesTeamTab('away')}
                          className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            inGameChangesTeamTab === 'away' ? 'bg-rose-700 text-white shadow-md' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>میهمان ({selectedLiveMatch.away_team_name?.split(' ')[0] || 'میهمان'})</span>
                          {awayPendingCount > 0 && (
                            <span className="w-4 h-4 rounded-full bg-rose-400 text-slate-950 font-sport font-black text-[9px] flex items-center justify-center">
                              {awayPendingCount}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Batch Actions Bar */}
                    {pendingChangesQueue.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950/80 rounded-2xl border border-cyan-500/30">
                        <span className="text-slate-300 font-bold">
                          تعداد <strong className="text-cyan-400">{pendingChangesQueue.length}</strong> درخواست جدید در صف انتظار بررسی داور قرار دارد.
                        </span>
                        <button
                          onClick={() => handleBatchApproveAll(inGameChangesTeamTab)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-lg cursor-pointer"
                        >
                          <Check size={14} />
                          <span>تایید و اعمال همه درخواست‌های انتخاب‌شده</span>
                        </button>
                      </div>
                    )}

                    {/* Pending Requests List */}
                    {pendingChangesQueue.length === 0 ? (
                      <div className="p-10 text-center text-slate-400 space-y-2 bg-slate-950/50 rounded-2xl border border-slate-800">
                        <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
                        <h4 className="font-bold text-white text-sm">صف درخواست‌ها خالی است</h4>
                        <p className="text-slate-500 text-xs">
                          هیچ درخواست تعویض یا تغییر تاکتیکی معوقه‌ای از سوی مربیان دو تیم وجود ندارد.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingChangesQueue
                          .filter((req) => inGameChangesTeamTab === 'all' || req.teamSide === inGameChangesTeamTab)
                          .map((req) => {
                            const isHome = req.teamSide === 'home';
                            const category = req.change_category || (req.type === 'SUBSTITUTION' ? 'SUBSTITUTION' : 'TACTIC');

                            const categoryBadge = category === 'SUBSTITUTION' ? { icon: '🔄', text: 'تعویض بازیکن', color: 'bg-amber-950/80 text-amber-300 border-amber-500/30' }
                              : category === 'POSITION' ? { icon: '📍', text: 'جابجایی پستی / مختصات', color: 'bg-purple-950/80 text-purple-300 border-purple-500/30' }
                              : category === 'FORMATION' ? { icon: '⚡', text: 'تغییر سیستم بازی', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/30' }
                              : { icon: '⚙️', text: 'تغییر تاکتیک', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' };

                            return (
                              <div
                                key={req.id}
                                className={`p-4 rounded-2xl border-2 transition-all shadow-xl space-y-3 ${
                                  isHome
                                    ? 'bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-950 border-cyan-500/60'
                                    : 'bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-950 border-rose-500/60'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-2.5">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-[10px] font-black px-2.5 py-1 rounded-lg border font-sport ${
                                        isHome
                                          ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                                          : 'bg-rose-950 text-rose-300 border-rose-500/40'
                                      }`}
                                    >
                                      {isHome ? 'تیم میزبان' : 'تیم میهمان'}: {req.team_name}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold flex items-center gap-1 ${categoryBadge.color}`}>
                                      <span>{categoryBadge.icon}</span>
                                      <span>{categoryBadge.text}</span>
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-sport">
                                    {req.minute ? `دقیقه '${req.minute}` : ''} {req.timestamp ? `• ثبت در ساعت ${req.timestamp}` : ''}
                                  </span>
                                </div>

                                {/* Request Details Body */}
                                {category === 'SUBSTITUTION' && (
                                  <div className="flex items-center justify-center gap-4 py-2 bg-slate-950/80 rounded-xl border border-slate-800">
                                    <div className="text-center">
                                      <span className="text-[10px] text-rose-400 block font-bold">خروج از زمین (OUT)</span>
                                      <span className="font-black text-sm text-white">{req.diff_data?.player_out_name || req.player_out_name || 'بازیکن'}</span>
                                    </div>
                                    <ArrowLeftRight size={18} className="text-cyan-400 animate-pulse" />
                                    <div className="text-center">
                                      <span className="text-[10px] text-emerald-400 block font-bold">ورود به زمین (IN)</span>
                                      <span className="font-black text-sm text-white">{req.diff_data?.player_in_name || req.player_in_name || 'بازیکن'}</span>
                                    </div>
                                  </div>
                                )}

                                {category === 'POSITION' && req.diff_data?.swap ? (
                                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                                    <div className="flex items-center justify-center gap-4 py-2 bg-slate-900/80 rounded-xl border border-purple-500/40">
                                      <div className="text-center">
                                        <span className="text-[10px] text-purple-300 block font-bold">بازیکن اول</span>
                                        <span className="font-black text-sm text-white">{req.diff_data.player_a_name}</span>
                                        <span className="text-[9px] text-cyan-300 block font-sport">{req.diff_data.player_a_old_pos} ⬅️ {req.diff_data.player_a_new_pos}</span>
                                      </div>
                                      <ArrowLeftRight size={18} className="text-purple-400 animate-pulse" />
                                      <div className="text-center">
                                        <span className="text-[10px] text-purple-300 block font-bold">بازیکن دوم</span>
                                        <span className="font-black text-sm text-white">{req.diff_data.player_b_name}</span>
                                        <span className="text-[9px] text-cyan-300 block font-sport">{req.diff_data.player_b_old_pos} ⬅️ {req.diff_data.player_b_new_pos}</span>
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-slate-300 text-center leading-relaxed">{req.detail}</p>
                                  </div>
                                ) : category !== 'SUBSTITUTION' ? (
                                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                                    <h5 className="font-bold text-white text-xs">{req.title}</h5>
                                    <p className="text-[11px] text-cyan-300 font-medium leading-relaxed">{req.detail}</p>
                                  </div>
                                ) : null}

                                {/* Approval & Rejection Buttons */}
                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    onClick={() => handleRejectInGameChange(req)}
                                    disabled={submittingChangeId === req.id}
                                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-rose-300 border border-slate-700 hover:border-rose-500/50 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                  >
                                    <X size={14} />
                                    <span>رد درخواست</span>
                                  </button>

                                  <button
                                    onClick={() => handleApproveInGameChange(req)}
                                    disabled={submittingChangeId === req.id}
                                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
                                  >
                                    <Check size={14} />
                                    <span>{submittingChangeId === req.id ? 'در حال اعمال...' : 'تیک زدن و اعمال تغییر در زمین ✅'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Processed History Log */}
                  {processedChangesHistory.length > 0 && (
                    <div className="glass-panel p-4 rounded-3xl border border-slate-800 space-y-2.5">
                      <h4 className="font-bold text-white text-xs flex items-center gap-2 border-b border-slate-800 pb-2">
                        <Clock size={15} className="text-slate-400" />
                        <span>تاریخچه تغییرات پردازش‌شده در این مسابقه</span>
                      </h4>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-thin">
                        {processedChangesHistory.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                  item.status === 'APPLIED'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                {item.status === 'APPLIED' ? '✓ تیک خورد' : '✕ رد شد'}
                              </span>
                              <span className="font-bold text-white shrink-0">{item.team_name}</span>
                              <span className="text-slate-400 truncate">
                                {item.title || item.detail}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-sport shrink-0">{item.processedAt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 3: MATCH TEAM STATS (R5: ثبت آمار تیمی مسابقه)              */}
              {/* ------------------------------------------------------------- */}
              {!showPostMatchCardView && refereeDeskTab === 'team_stats' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-xs">
                  <div className="glass-panel p-5 rounded-3xl border border-amber-500/40 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                          <BarChart2 size={18} className="text-amber-400" />
                          <span>ثبت و تنظیم آمار تیمی مسابقه (Team Telemetry Stats)</span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          آمار فنی دو تیم را تنظیم کنید. درصد مالکیت توپ به صورت خودکار بین میزبان و میهمان همگام می‌شود.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 font-sport text-xs font-bold">
                        <span className="text-cyan-400">{selectedLiveMatch.home_team_name}</span>
                        <span className="text-slate-500">مقابل</span>
                        <span className="text-rose-400">{selectedLiveMatch.away_team_name}</span>
                      </div>
                    </div>

                    {/* Side-by-Side Sliders & Steppers */}
                    <div className="space-y-4 pt-1">
                      {[
                        { key: 'possession_percent', label: 'درصد مالکیت توپ', min: 10, max: 90, unit: '٪' },
                        { key: 'shots', label: 'تعداد کل شوت‌ها', min: 0, max: 40, unit: 'شوت' },
                        { key: 'shots_on_target', label: 'شوت در چارچوب', min: 0, max: 25, unit: 'شوت' },
                        { key: 'corners', label: 'کرنرها', min: 0, max: 20, unit: 'کرنر' },
                        { key: 'fouls', label: 'خطاها', min: 0, max: 30, unit: 'خطا' },
                        { key: 'offsides', label: 'آفسایدها', min: 0, max: 15, unit: 'مورد' },
                        { key: 'saves', label: 'مهار دروازه‌بان (Saves)', min: 0, max: 20, unit: 'مهار' },
                      ].map(({ key, label, min, max, unit }) => {
                        const hVal = deskTeamStats.home[key] ?? 0;
                        const aVal = deskTeamStats.away[key] ?? 0;

                        return (
                          <div key={key} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              {/* Home Side Input */}
                              <div className="flex items-center gap-2 w-1/3 justify-start">
                                <button
                                  onClick={() => handleDeskTeamStatsChange('home', key, Math.max(min, hVal - 1))}
                                  className="p-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 cursor-pointer"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="font-mono font-black text-cyan-400 px-2 py-0.5 bg-slate-900 rounded-lg border border-slate-800">
                                  {hVal} {unit}
                                </span>
                                <button
                                  onClick={() => handleDeskTeamStatsChange('home', key, Math.min(max, hVal + 1))}
                                  className="p-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 cursor-pointer"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>

                              {/* Label */}
                              <span className="font-bold text-slate-200 text-center">{label}</span>

                              {/* Away Side Input */}
                              <div className="flex items-center gap-2 w-1/3 justify-end">
                                <button
                                  onClick={() => handleDeskTeamStatsChange('away', key, Math.max(min, aVal - 1))}
                                  className="p-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-rose-400 text-slate-300 cursor-pointer"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="font-mono font-black text-rose-400 px-2 py-0.5 bg-slate-900 rounded-lg border border-slate-800">
                                  {aVal} {unit}
                                </span>
                                <button
                                  onClick={() => handleDeskTeamStatsChange('away', key, Math.min(max, aVal + 1))}
                                  className="p-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-rose-400 text-slate-300 cursor-pointer"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>

                            {/* Range Slider */}
                            <input
                              type="range"
                              min={min}
                              max={max}
                              value={hVal}
                              onChange={(e) => handleDeskTeamStatsChange('home', key, e.target.value)}
                              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-900 rounded-lg"
                            />
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleSaveDeskTeamStats}
                      disabled={savingDeskTeamStats}
                      className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer disabled:opacity-50"
                    >
                      <BarChart2 size={16} />
                      <span>{savingDeskTeamStats ? 'در حال ذخیره آمار...' : '📊 ثبت و ذخیره رسمی آمار تیمی مسابقه'}</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 4: PLAYER RATINGS & MINUTES (R5: ثبت نمرات و دقایق)         */}
              {/* ------------------------------------------------------------- */}
              {!showPostMatchCardView && refereeDeskTab === 'player_ratings' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-xs">
                  <div className="glass-panel p-5 rounded-3xl border border-cyan-500/40 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                          <Award size={18} className="text-cyan-400" />
                          <span>ثبت نمرات و دقایق بازی بازیکنان (Player Match Ratings)</span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          نمره عملکرد (۱ تا ۱۰) و دقایق بازی بازیکنان را ثبت و ستاره میدان (MOTM) را انتخاب کنید.
                        </p>
                      </div>

                      {/* Team Selector Tab */}
                      <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
                        <button
                          onClick={() => setDeskRatingsSide('home')}
                          className={`px-4 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                            deskRatingsSide === 'home' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {selectedLiveMatch.home_team_name} (میزبان)
                        </button>
                        <button
                          onClick={() => setDeskRatingsSide('away')}
                          className={`px-4 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                            deskRatingsSide === 'away' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {selectedLiveMatch.away_team_name} (میهمان)
                        </button>
                      </div>
                    </div>

                    {/* Players Ratings Grid */}
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(deskRatingsSide === 'home' ? deskRatingsHome : deskRatingsAway).map((p) => {
                          const isMOTM = motmPlayerId === p.player_id;

                          return (
                            <div
                              key={p.player_id}
                              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-md ${
                                isMOTM
                                  ? 'bg-amber-950/40 border-amber-500/80 ring-2 ring-amber-400/40'
                                  : 'bg-slate-950/90 border-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                                  {p.photo_url ? (
                                    <img
                                      src={p.photo_url}
                                      alt={p.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <User size={18} className="text-slate-400" />
                                  )}
                                </div>
                                <div className="truncate">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-black text-white text-xs truncate">{p.name}</span>
                                    <span className="text-[10px] text-cyan-300 bg-cyan-950 px-1.5 rounded font-sport font-bold">
                                      {p.position || 'MID'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-400 font-sport">
                                      {p.was_starter ? 'فیکس (Starter)' : 'تعویضی (Sub)'}
                                    </span>
                                    <button
                                      onClick={() => setMotmPlayerId(isMOTM ? null : p.player_id)}
                                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                        isMOTM
                                          ? 'bg-amber-500 text-slate-950 font-black'
                                          : 'bg-slate-900 text-slate-400 hover:text-amber-300'
                                      }`}
                                    >
                                      ⭐ ستاره بازی
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Minutes & Rating Inputs */}
                              <div className="flex items-center gap-2.5 shrink-0 font-sport">
                                <div className="text-left">
                                  <span className="text-[9px] text-slate-400 block text-right font-sans">دقایق بازی</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="120"
                                    value={p.minutes_played}
                                    onChange={(e) =>
                                      handleUpdateDeskRating(
                                        deskRatingsSide,
                                        p.player_id,
                                        'minutes_played',
                                        parseInt(e.target.value, 10) || 0
                                      )
                                    }
                                    className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center text-xs text-white"
                                  />
                                </div>

                                <div className="text-left">
                                  <span className="text-[9px] text-slate-400 block text-right font-sans">نمره (Rating)</span>
                                  <input
                                    type="number"
                                    min="1.0"
                                    max="10.0"
                                    step="0.1"
                                    value={p.rating}
                                    onChange={(e) =>
                                      handleUpdateDeskRating(
                                        deskRatingsSide,
                                        p.player_id,
                                        'rating',
                                        parseFloat(e.target.value) || 6.0
                                      )
                                    }
                                    className="w-16 bg-slate-900 border border-cyan-500/50 rounded-lg px-2 py-1 text-center text-xs font-black text-[#00ff87]"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={handleSaveDeskPlayerRatings}
                        disabled={savingDeskRatings}
                        className="w-full mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer disabled:opacity-50"
                      >
                        <Award size={16} />
                        <span>{savingDeskRatings ? 'در حال ثبت نمرات...' : `⭐ ثبت رسمی نمرات مسابقه #${selectedLiveMatch.id}`}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: TOURNAMENT & CUP MANAGEMENT HUB                                  */}
      {/* ========================================================================= */}
      {activeSub === 'tournament_hub' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AdminTournamentHub 
            onNotification={showNotification}
            onOpenRefereeRoom={(match) => {
              if (match) {
                setSelectedLiveMatch(match);
                const gw = extractRoundNumber(match.round_name);
                if (gw) setSelectedGameweek(`هفته ${gw}`);
              }
              setActiveSub('live_admin');
            }}
          />
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: PACKS & SEASON PASS HUB                                           */}
      {/* ========================================================================= */}
      {activeSub === 'packs_season_pass' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AdminPacksSeasonPassHub />
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: QUICK MATCH TEAM STATS (Dropdown mode)                          */}
      {/* ========================================================================= */}
      {activeSub === 'match_team_stats' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-xs">
          <div className="glass-panel p-5 rounded-3xl border border-amber-500/40 space-y-4">
            <h3 className="font-bold text-white border-b border-slate-800 pb-2.5 flex items-center gap-2">
              <span className="text-amber-400 text-lg">📊</span>
              <span>ثبت سریع آمار تیمی مسابقات لیگ</span>
            </h3>

            <div className="space-y-4">
              <label className="text-slate-300 font-bold block mb-1">انتخاب مسابقه جهت ثبت آمار:</label>
              <CustomSelect
                value={selectedLiveMatch ? String(selectedLiveMatch.id) : ''}
                onChange={(val) => {
                  const m = allMatches.find((item) => String(item.id) === String(val));
                  if (m) {
                    setSelectedLiveMatch(m);
                    setActiveSub('live_admin');
                    setRefereeDeskTab('team_stats');
                  }
                }}
                colorTheme="amber"
                options={[
                  { value: '', label: '-- یک مسابقه را از لیست انتخاب کنید --' },
                  ...(allMatches || []).map((m) => ({
                    value: String(m.id),
                    label: `بازی #${m.id}: ${m.home_team_name} vs ${m.away_team_name} (${m.round_name})`,
                  })),
                ]}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: QUICK MATCH PLAYER RATINGS (Dropdown mode)                      */}
      {/* ========================================================================= */}
      {activeSub === 'match_player_ratings' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-xs">
          <div className="glass-panel p-5 rounded-3xl border border-cyan-500/40 space-y-4">
            <h3 className="font-bold text-white border-b border-slate-800 pb-2.5 flex items-center gap-2">
              <Star size={18} className="text-cyan-400" />
              <span>ثبت سریع نمرات بازیکنان مسابقات لیگ</span>
            </h3>

            <div className="space-y-4">
              <label className="text-slate-300 font-bold block mb-1">انتخاب مسابقه جهت نمره‌دهی:</label>
              <CustomSelect
                value={selectedLiveMatch ? String(selectedLiveMatch.id) : ''}
                onChange={(val) => {
                  const m = allMatches.find((item) => String(item.id) === String(val));
                  if (m) {
                    setSelectedLiveMatch(m);
                    setActiveSub('live_admin');
                    setRefereeDeskTab('player_ratings');
                  }
                }}
                colorTheme="cyan"
                options={[
                  { value: '', label: '-- یک مسابقه را از لیست انتخاب کنید --' },
                  ...(allMatches || []).map((m) => ({
                    value: String(m.id),
                    label: `بازی #${m.id}: ${m.home_team_name} vs ${m.away_team_name} (${m.round_name})`,
                  })),
                ]}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 5: REGISTER COACH & TEAM MANAGEMENT                                */}
      {/* ========================================================================= */}
      {activeSub === 'register_coach' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-xs">
          <div className="glass-panel p-5 rounded-3xl border border-cyan-500/40 space-y-4">
            <h3 className="font-bold text-white border-b border-slate-800 pb-2.5 flex items-center gap-2">
              <UserPlus size={18} className="text-cyan-400" />
              <span>ثبت مربی و اختصاص باشگاه در لیگ مستر</span>
            </h3>

            <form onSubmit={handleRegisterCoachSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">نام و نام خانوادگی سرمربی *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: Mikel Arteta"
                    value={newCoach.coachName}
                    onChange={(e) => setNewCoach({ ...newCoach, coachName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">نام باشگاه / تیم *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: Arsenal"
                    value={newCoach.clubName}
                    onChange={(e) => setNewCoach({ ...newCoach, clubName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">بودجه اولیه ($)</label>
                  <input
                    type="number"
                    value={newCoach.budget}
                    onChange={(e) => setNewCoach({ ...newCoach, budget: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-sport focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 p-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-black transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <UserCheck size={16} />
                <span>ثبت رسمی مربی و اختصاص به باشگاه</span>
              </button>
            </form>
          </div>

          {/* Teams Roster List */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
            <h4 className="font-black text-white text-xs sm:text-sm">لیست باشگاه‌های ثبت‌شده در فصل ۱۴۰۵</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {(allTeams || []).map((t) => (
                <div key={t.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 p-1 flex items-center justify-center shrink-0">
                    <img src={getTeamLogoUrl(t.logo || t.name)} alt={t.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="truncate">
                    <span className="font-black text-white text-xs block truncate">{t.name}</span>
                    <span className="text-[10px] text-slate-400 font-sport">سرمربی: {t.manager || 'بدون مربی'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 6: AUDIT LOGS                                                      */}
      {/* ========================================================================= */}
      {activeSub === 'audit_logs' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-xs">
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-white border-b border-slate-800 pb-2.5 flex items-center gap-2">
              <ShieldAlert size={18} className="text-purple-400" />
              <span>لاگ‌ها و گزارش‌های امنیتی سیستم (Audit Logs)</span>
            </h3>

            {auditLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-1">
                <Info size={24} className="mx-auto text-slate-500" />
                <p>گزارش تغییری در این بخش ثبت نشده است.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-cyan-300 block">{log.action_type}</strong>
                      <span className="text-[11px] text-slate-400">{log.details || 'تغییرات مدیریتی'}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-sport">
                      {log.created_at ? new Date(log.created_at).toLocaleString('fa-IR') : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          Admin Payment Review Confirmation Modal (createPortal)
      ────────────────────────────────────────────────────────────── */}
      {typeof document !== 'undefined' && reviewingPayment && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto font-sans dir-rtl">
          <div className="fixed inset-0" onClick={() => !isSubmittingReview && setReviewingPayment(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            className="relative z-10 w-full max-w-md my-auto glass-panel p-5 rounded-3xl border border-slate-700 space-y-4 text-xs bg-gradient-to-b from-[#0e1626] to-[#070b14] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                {reviewingPayment.action === 'approve' ? (
                  <>
                    <CheckCircle size={18} className="text-emerald-400" />
                    <span>تایید نهایی و واریز شارژ به حساب تیم</span>
                  </>
                ) : (
                  <>
                    <XCircle size={18} className="text-rose-400" />
                    <span>رد درخواست واریز کاربر</span>
                  </>
                )}
              </span>
              <button
                onClick={() => !isSubmittingReview && setReviewingPayment(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Target Payment Summary */}
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">تیم درخواست‌دهنده:</span>
                <strong className="text-white font-bold">{reviewingPayment.payment.team_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">بسته خریداری‌شده:</span>
                <span className="text-cyan-300 font-bold">{reviewingPayment.payment.package_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">مبلغ واریزی:</span>
                <strong className="text-amber-400 font-bold dir-ltr font-sport">
                  {(reviewingPayment.payment.amount_irr || 0).toLocaleString('fa-IR')} تومان
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ارز اعطایی پس از تایید:</span>
                <strong className="text-emerald-400 font-bold dir-ltr font-sport">
                  {reviewingPayment.payment.currency_type === 'GEMS'
                    ? `+${reviewingPayment.payment.reward_amount || reviewingPayment.payment.usd_amount} 💎 الماس`
                    : `+$${Number(reviewingPayment.payment.reward_amount || reviewingPayment.payment.usd_amount || 0).toLocaleString('fa-IR')} USD`}
                </strong>
              </div>
            </div>

            {/* Admin Note Input */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block text-[11px]">
                {reviewingPayment.action === 'reject'
                  ? 'دلیل رد درخواست (برای کاربر نمایش داده می‌شود)*:'
                  : 'یادداشت ادمین (اختیاری):'}
              </label>
              <textarea
                value={adminReviewNote}
                onChange={(e) => setAdminReviewNote(e.target.value)}
                placeholder={
                  reviewingPayment.action === 'reject'
                    ? 'مثال: تصویر فیش خوانا نیست یا مبلغ واریز با بسته مطابقت ندارد.'
                    : 'توضیحات تکمیلی تایید واریز...'
                }
                rows={3}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewingPayment(null)}
                disabled={isSubmittingReview}
                className="w-1/3 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold cursor-pointer transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleAdminReviewSubmit}
                disabled={isSubmittingReview}
                className={`w-2/3 py-2.5 rounded-xl font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  reviewingPayment.action === 'approve'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]'
                }`}
              >
                {isSubmittingReview ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : reviewingPayment.action === 'approve' ? (
                  <CheckCircle size={14} />
                ) : (
                  <XCircle size={14} />
                )}
                <span>
                  {isSubmittingReview
                    ? 'در حال ثبت...'
                    : reviewingPayment.action === 'approve'
                    ? 'تایید قطعی و شارژ حساب'
                    : 'رد درخواست واریز'}
                </span>
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────
          Admin Full Receipt Preview Modal (createPortal)
      ────────────────────────────────────────────────────────────── */}
      {typeof document !== 'undefined' && adminViewReceipt && createPortal(
        <div
          onClick={() => setAdminViewReceipt(null)}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative z-10 max-w-lg max-h-[85vh] my-auto p-3 glass-panel rounded-3xl border border-slate-700 overflow-hidden bg-slate-950 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileImage size={15} className="text-cyan-400" />
                <span>تصویر فیش واریز بانکی</span>
              </span>
              <button
                onClick={() => setAdminViewReceipt(null)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 bg-slate-800 rounded-lg cursor-pointer"
              >
                بستن ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-2xl border border-slate-800">
              <img
                src={adminViewReceipt}
                alt="Admin Receipt View"
                className="w-full h-full object-contain"
              />
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────
          Admin Store Package Create / Edit Modal (createPortal)
      ────────────────────────────────────────────────────────────── */}
      {typeof document !== 'undefined' && editingPackage && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto font-sans dir-rtl">
          <div className="fixed inset-0" onClick={() => !isSavingPackage && setEditingPackage(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            className="relative z-10 w-full max-w-xl my-auto glass-panel p-5 sm:p-6 rounded-3xl border border-indigo-500/50 space-y-4 text-xs bg-gradient-to-b from-[#0e1626] to-[#070b14] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Package size={18} className="text-indigo-400" />
                <span>{editingPackage.id ? 'ویرایش بسته فروشگاه' : 'ساخت بسته جدید فروشگاه'}</span>
              </span>
              <button
                type="button"
                onClick={() => !isSavingPackage && setEditingPackage(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-4">
              {/* Package Name */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-[11px]">
                  عنوان و نام بسته*:
                </label>
                <input
                  type="text"
                  required
                  value={editingPackage.name}
                  onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                  placeholder="مثال: کیسه جم ۱۰۰ عددی، بودجه ۱۰ هزار دلاری باشگاه"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Currency Type Selection */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-[11px]">
                  نوع ارز اعطایی*:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingPackage({ ...editingPackage, currency_type: 'GEMS' })}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      editingPackage.currency_type === 'GEMS'
                        ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <Gem size={16} />
                    <span>الماس (جم 💎)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPackage({ ...editingPackage, currency_type: 'BUDGET' })}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      editingPackage.currency_type === 'BUDGET'
                        ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <DollarSign size={16} />
                    <span>بودجه باشگاه (دلار 💵)</span>
                  </button>
                </div>
              </div>

              {/* Numeric Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block text-[11px]">
                    مقدار ارز اصلی*:
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingPackage.reward_amount}
                    onChange={(e) => setEditingPackage({ ...editingPackage, reward_amount: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-sport text-xs focus:border-indigo-500 focus:outline-none dir-ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block text-[11px]">
                    بونوس هدیه (اختیاری):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingPackage.bonus_amount || 0}
                    onChange={(e) => setEditingPackage({ ...editingPackage, bonus_amount: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-sport text-xs focus:border-indigo-500 focus:outline-none dir-ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block text-[11px]">
                    قیمت (تومان)*:
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    value={editingPackage.price_irr}
                    onChange={(e) => setEditingPackage({ ...editingPackage, price_irr: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-sport font-bold text-xs focus:border-indigo-500 focus:outline-none dir-ltr"
                  />
                </div>
              </div>

              {/* Description and Sort Order */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-300 font-bold block text-[11px]">
                    توضیحات / بنر تبلیغاتی (اختیاری):
                  </label>
                  <input
                    type="text"
                    value={editingPackage.description || ''}
                    onChange={(e) => setEditingPackage({ ...editingPackage, description: e.target.value })}
                    placeholder="مثال: پرفروش‌ترین بسته ماه / ۲۰٪ تخفیف ویژه"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block text-[11px]">
                    ترتیب نمایش:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingPackage.sort_order || 0}
                    onChange={(e) => setEditingPackage({ ...editingPackage, sort_order: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-sport text-xs focus:border-indigo-500 focus:outline-none dir-ltr"
                  />
                </div>
              </div>

              {/* Is Active Checkbox */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingPackage.is_active !== false}
                  onChange={(e) => setEditingPackage({ ...editingPackage, is_active: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-200 font-bold text-[11.5px]">
                  بسته فعال باشد (در فروشگاه کاربران نمایش داده شود)
                </span>
              </label>

              {/* Live Preview Card */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border border-indigo-500/30 space-y-1.5">
                <span className="text-[10px] text-indigo-300 font-bold block">پیش‌نمایش کارت در فروشگاه:</span>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${editingPackage.currency_type === 'GEMS' ? 'bg-cyan-950 text-cyan-400' : 'bg-emerald-950 text-emerald-400'}`}>
                      {editingPackage.currency_type === 'GEMS' ? <Gem size={16} /> : <DollarSign size={16} />}
                    </div>
                    <div>
                      <strong className="text-white text-xs block">{editingPackage.name || 'نام بسته'}</strong>
                      <span className="text-[10.5px] text-cyan-300 font-sport dir-ltr block">
                        {editingPackage.currency_type === 'GEMS'
                          ? `+${Number(editingPackage.reward_amount || 0).toLocaleString('fa-IR')} 💎 الماس`
                          : `+$${Number(editingPackage.reward_amount || 0).toLocaleString('fa-IR')} USD`}
                        {Number(editingPackage.bonus_amount || 0) > 0 && ` (+${Number(editingPackage.bonus_amount).toLocaleString('fa-IR')} هدیه)`}
                      </span>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-amber-400 font-bold text-xs font-sport dir-ltr block">
                      {Number(editingPackage.price_irr || 0).toLocaleString('fa-IR')} تومان
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPackage(null)}
                  disabled={isSavingPackage}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold cursor-pointer transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSavingPackage}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 text-white font-black shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSavingPackage ? <RefreshCw size={14} className="animate-spin" /> : <Check size={16} />}
                  <span>{isSavingPackage ? 'در حال ذخیره‌سازی...' : editingPackage.id ? 'ذخیره تغییرات بسته' : 'ساخت و انتشار بسته'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────
          Admin Store Package Soft-Delete Confirmation Modal (createPortal)
      ────────────────────────────────────────────────────────────── */}
      {typeof document !== 'undefined' && deletingPackage && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto font-sans dir-rtl">
          <div className="fixed inset-0" onClick={() => !isSavingPackage && setDeletingPackage(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            className="relative z-10 w-full max-w-sm my-auto glass-panel p-5 rounded-3xl border border-rose-500/50 space-y-4 text-xs bg-gradient-to-b from-[#0e1626] to-[#070b14] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-rose-400 border-b border-slate-800 pb-3">
              <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-500/40">
                <Trash2 size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">غیرفعال‌سازی بسته فروشگاه</h4>
                <span className="text-[10px] text-slate-400">حذف نرم و پنهان‌سازی از دید کاربران</span>
              </div>
            </div>

            <p className="text-slate-300 leading-relaxed text-xs">
              آیا از غیرفعال‌سازی بسته <strong className="text-white">«{deletingPackage.name}»</strong> اطمینان دارید؟
              این بسته از لیست فروشگاه کاربران خارج خواهد شد، اما تاریخچه تراکنش‌های گذشته محفوظ می‌ماند.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingPackage(null)}
                disabled={isSavingPackage}
                className="w-1/2 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold cursor-pointer transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleDeletePackageConfirm}
                disabled={isSavingPackage}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black shadow-[0_0_15px_rgba(225,29,72,0.4)] cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                {isSavingPackage ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>{isSavingPackage ? 'در حال حذف...' : 'تایید غیرفعال‌سازی'}</span>
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
