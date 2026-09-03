import React, { useState, useEffect, useMemo } from 'react';
import SubNav from '../common/SubNav';
import EFootballGamePlan, { getGemBoostCost } from './EFootballGamePlan';
import SimpleTacticsModal, { autoSelectOptimalLineup } from './SimpleTacticsModal';
import PlayerBoostDrawer from './PlayerBoostDrawer';
import LeagueStandingsTable from './LeagueStandingsTable';
import MatchDetailModal from './MatchDetailModal';
import PlayerOverallRecords from './PlayerOverallRecords';
import MatchSummaryView from './MatchSummaryView';
import { 
  Search, CheckCircle, AlertTriangle, XCircle, Save, Sliders, 
  Calendar, Info, X, User, Users, Zap, HeartPulse, Gem, Sparkles, 
  ArrowRight, ArrowLeft, Clock, Home, Plane, RefreshCw, ChevronRight, Shield, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { teamApi, matchApi, playerApi } from '../../services/api';
import { useTeam } from '../../context/TeamContext';
import CustomSelect from '../common/CustomSelect';
import Toast from '../common/Toast';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import { getTeamLogoUrl } from '../../utils/teamLogos';

const TEAM_SUBNAV = [
  { id: 'matches', label: 'برنامه بازی‌ها و ترکیب', color: 'text-cyan-400' },
  { id: 'players', label: 'عملکرد بازیکنان' },
  { id: 'table', label: 'جدول لیگ' },
];

function formatMatchDateTime(dateString) {
  if (!dateString) return { dateStr: 'تاریخ اعلام نشده', timeStr: '--:--' };
  try {
    const dt = new Date(dateString);
    const dateStr = dt.toLocaleDateString('fa-IR', {
      timeZone: 'Asia/Tehran',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = dt.toLocaleTimeString('fa-IR', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return { dateStr, timeStr };
  } catch (_e) {
    return { dateStr: dateString, timeStr: '' };
  }
}

import { TACTICAL_GUIDES } from '../../utils/tacticalGuides';

export default function TeamTab({ 
  initialSub = 'matches', 
  initialPlayers = [], 
  isLineupSubmitted = false,
  onSaveLineup,
  teamData
}) {
  const normalizeSubTab = (sub) => {
    if (sub === 'players') return 'players';
    if (sub === 'table') return 'table';
    return 'matches';
  };

  const { team, players: contextPlayers, fetchTeam, updateTeamGems, updatePlayerState, setFormation: setContextFormation, setTactics: setContextTactics } = useTeam();
  const [activeSub, setActiveSub] = useState(() => normalizeSubTab(initialSub));
  
  // Use the manager's real team when available
  const teamId = teamData?.id || team?.id;
  const initialFormation = teamData?.default_formation || team?.default_formation || '4-3-3 (4-2-1-3)';
  const [selectedFormation, setSelectedFormation] = useState(initialFormation);
  const [tacticTab, setTacticTab] = useState('attack'); // 'attack' | 'defense' | 'advanced'

  // Simple Tactics states
  const [presetName, setPresetName] = useState('');
  const [hasCustomPlayerEdits, setHasCustomPlayerEdits] = useState(false);
  const [isSimpleTacticsOpen, setIsSimpleTacticsOpen] = useState(false);
  const [isBoostDrawerOpen, setIsBoostDrawerOpen] = useState(false);

  // Match Schedule & Match-Scoped Selection State
  const [scheduleMatches, setScheduleMatches] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [scheduleFilter, setScheduleFilter] = useState('ALL'); // 'ALL', 'UPCOMING', 'FINISHED', 'HOME', 'AWAY'
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedMatchDetailId, setSelectedMatchDetailId] = useState(null);

  // Tactics State synced with backend
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

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);
  const [isSubmittedForSelectedMatch, setIsSubmittedForSelectedMatch] = useState(false);

  // Live data: league standings
  const [leagueTable, setLeagueTable] = useState([]);

  const currentGems = team?.gems ?? teamData?.gems ?? 0;

  // 1. Fetch Complete Schedule
  const fetchSchedule = async (isBackground = false) => {
    if (!isBackground && scheduleMatches.length === 0) {
      setLoadingSchedule(true);
    }
    try {
      let mList = [];
      if (teamId) {
        const res = await matchApi.getTeamSchedule(teamId);
        mList = res.data || [];
      } else {
        const res = await matchApi.getLeagueSchedule({ status: 'ALL' });
        mList = res.data || [];
      }
      setScheduleMatches(mList);
    } catch (err) {
      console.error('Failed to load team schedule:', err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  useEffect(() => {
    fetchSchedule(false);
    const handleSync = () => {
      fetchSchedule(true);
    };
    window.addEventListener('vml_league_schedule_updated', handleSync);
    window.addEventListener('vml_team_updated', handleSync);
    return () => {
      window.removeEventListener('vml_league_schedule_updated', handleSync);
      window.removeEventListener('vml_team_updated', handleSync);
    };
  }, [teamId]);

  // Load standing gameplan and tactics when tab loads
  useEffect(() => {
    if (!teamId) return;
    teamApi.getGameplan(teamId).then((res) => {
      if (res.data?.gameplan) {
        const gp = res.data.gameplan;
        const resolvedForm = gp.formation || teamData?.default_formation || team?.default_formation || selectedFormation || '4-3-3 (4-2-1-3)';
        setSelectedFormation(resolvedForm);
        setPresetName(gp.preset_name || '');
        setHasCustomPlayerEdits(Boolean(gp.has_custom_player_edits));
        setTactics((prev) => ({
          ...prev,
          attacking_style: gp.attacking_style || prev.attacking_style,
          build_up: gp.build_up || prev.build_up,
          attacking_area: gp.attacking_area || prev.attacking_area,
          positioning: gp.positioning || prev.positioning,
          support_range: gp.support_range ?? prev.support_range,
          defensive_style: gp.defensive_style || prev.defensive_style,
          containment_area: gp.containment_area || prev.containment_area,
          pressing: gp.pressing || prev.pressing,
          defensive_line: gp.defensive_line ?? prev.defensive_line,
          compactness: gp.compactness ?? prev.compactness,
          adv_offense_1: gp.adv_offense_1 || prev.adv_offense_1,
          adv_offense_2: gp.adv_offense_2 || prev.adv_offense_2,
          adv_defense_1: gp.adv_defense_1 || prev.adv_defense_1,
          adv_defense_2: gp.adv_defense_2 || prev.adv_defense_2,
        }));
      }
    }).catch(() => {});
  }, [teamId]);

  useEffect(() => {
    setActiveSub(normalizeSubTab(initialSub));
  }, [initialSub]);

  // Find the next imminent upcoming match
  const nextUpcomingMatch = useMemo(() => {
    return scheduleMatches.find(m => m.status === 'SCHEDULED' || m.status === 'LIVE') || null;
  }, [scheduleMatches]);

  // Auto-select the next upcoming match if none is manually selected yet
  useEffect(() => {
    if (!selectedMatch && nextUpcomingMatch && teamId) {
      handleSelectMatchForLineup(nextUpcomingMatch);
    }
  }, [nextUpcomingMatch?.id, teamId]);

  // Check if lineup is submitted for a specific match
  const isMatchLineupSubmitted = (m) => {
    if (!m) return false;
    const isHome = m.home_team === teamId;
    return isHome ? Boolean(m.home_lineup_ready) : Boolean(m.away_lineup_ready);
  };

  // 2. Select Match to open its Lineup & Tactics Workbench
  const handleSelectMatchForLineup = (m) => {
    setSelectedMatch(m);
    if (!m || !teamId) return;

    teamApi.getGameplan(teamId, m.id).then((res) => {
      if (res.data?.gameplan) {
        const gp = res.data.gameplan;
        const resolvedForm = gp.formation || teamData?.default_formation || team?.default_formation || selectedFormation || '4-3-3 (4-2-1-3)';
        setSelectedFormation(resolvedForm);
        setPresetName(gp.preset_name || '');
        setHasCustomPlayerEdits(Boolean(gp.has_custom_player_edits));
        setTactics((prev) => ({
          ...prev,
          attacking_style: gp.attacking_style || prev.attacking_style,
          build_up: gp.build_up || prev.build_up,
          attacking_area: gp.attacking_area || prev.attacking_area,
          positioning: gp.positioning || prev.positioning,
          support_range: gp.support_range ?? prev.support_range,
          defensive_style: gp.defensive_style || prev.defensive_style,
          containment_area: gp.containment_area || prev.containment_area,
          pressing: gp.pressing || prev.pressing,
          defensive_line: gp.defensive_line ?? prev.defensive_line,
          compactness: gp.compactness ?? prev.compactness,
          adv_offense_1: gp.adv_offense_1 || prev.adv_offense_1,
          adv_offense_2: gp.adv_offense_2 || prev.adv_offense_2,
          adv_defense_1: gp.adv_defense_1 || prev.adv_defense_1,
          adv_defense_2: gp.adv_defense_2 || prev.adv_defense_2,
        }));
        setIsSubmittedForSelectedMatch(Boolean(gp.is_submitted));

        // If this match already has custom saved lineup data, apply it to the workbench
        if (gp.is_submitted && Array.isArray(gp.players_data) && gp.players_data.length > 0) {
          const playersDataMap = new Map();
          gp.players_data.forEach((item) => {
            const pid = item.player_id || item.id;
            if (pid) playersDataMap.set(String(pid), item);
          });

          setPlayers((prev) =>
            prev.map((p) => {
              const custom = playersDataMap.get(String(p.id));
              if (custom) {
                return {
                  ...p,
                  is_starting: Boolean(custom.is_starting),
                  x_coord: custom.x_coord != null ? custom.x_coord : p.x_coord,
                  y_coord: custom.y_coord != null ? custom.y_coord : p.y_coord,
                  tacticalPosition: custom.position || null,
                };
              }
              return p;
            })
          );
        }
      }
    }).catch(() => {});
  };

  // Gameweek stepper inside the match workbench
  const handleNavigateMatch = (direction) => {
    if (!selectedMatch || scheduleMatches.length === 0) return;
    const currentIndex = scheduleMatches.findIndex(m => m.id === selectedMatch.id);
    if (currentIndex === -1) return;

    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < scheduleMatches.length) {
      handleSelectMatchForLineup(scheduleMatches[nextIndex]);
    }
  };

  const handleRecoverStamina = async (playerId, playerName) => {
    setActionLoading(playerId);
    try {
      const res = await playerApi.recoverStamina(playerId);
      if (res.data.remaining_gems !== undefined) {
        updateTeamGems(res.data.remaining_gems);
      }
      if (res.data.player) {
        updatePlayerState(res.data.player);
      }
      setSaveMessage(`استقامت ${playerName} با موفقیت ۵۰٪ شارژ شد! (۱۰ جم کسر شد)`);
    } catch (err) {
      setSaveMessage(err.response?.data?.error || 'خطا در شارژ استقامت');
    } finally {
      setActionLoading(null);
      setTimeout(() => setSaveMessage(''), 3500);
    }
  };

  const handleHealInjury = async (playerId, playerName) => {
    setActionLoading(playerId);
    try {
      const res = await playerApi.healInjury(playerId);
      if (res.data.remaining_gems !== undefined) {
        updateTeamGems(res.data.remaining_gems);
      }
      if (res.data.player) {
        updatePlayerState(res.data.player);
      }
      setSaveMessage(`مصدومیت ${playerName} با موفقیت درمان شد! (۲۵ جم کسر شد)`);
    } catch (err) {
      setSaveMessage(err.response?.data?.error || 'خطا در درمان مصدومیت');
    } finally {
      setActionLoading(null);
      setTimeout(() => setSaveMessage(''), 3500);
    }
  };

  const handleGemBoost = async (playerId, playerName, currentLevel = 1) => {
    setActionLoading(playerId);
    try {
      const res = await playerApi.gemBoost(playerId);
      if (res.data.remaining_gems !== undefined) {
        updateTeamGems(res.data.remaining_gems);
      }
      if (res.data.player) {
        updatePlayerState(res.data.player);
        setPlayers((prev) =>
          prev.map((p) => (p.id === playerId.toString() ? { ...p, ...res.data.player } : p))
        );
      }
      setSaveMessage(`سطح ${playerName} با موفقیت ارتقا یافت! (OVR افزایش یافت) ✨`);
    } catch (err) {
      setSaveMessage(err.response?.data?.error || 'خطا در ارتقای بازیکن');
    } finally {
      setActionLoading(null);
      setTimeout(() => setSaveMessage(''), 3500);
    }
  };

  useEffect(() => {
    if (activeSub !== 'table') return;
    matchApi
      .getLeagueStandings()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setLeagueTable(
            res.data.map((row) => ({
              rank: row.rank,
              name: row.name + (teamId && row.team_id === teamId ? ' (تیم شما)' : ''),
              p: row.played,
              w: row.won,
              d: row.drawn,
              l: row.lost,
              gf: row.gf,
              ga: row.ga,
              gd: (row.gd >= 0 ? '+' : '') + row.gd,
              pts: row.points,
              isUser: teamId ? row.team_id === teamId : false,
            }))
          );
        } else {
          setLeagueTable([]);
        }
      })
      .catch(() => setLeagueTable([]));
  }, [activeSub, teamId]);

  const handleAutoLineupOnly = () => {
    const updated = autoSelectOptimalLineup(players, selectedFormation);
    setPlayers(updated);
    setHasCustomPlayerEdits(false);
    setSaveMessage(`۱۱ بازیکن برتر تیم بر اساس پست و بالاترین OVR در چیدمان ${selectedFormation} قرار گرفتند ⚡`);
    setTimeout(() => setSaveMessage(''), 4000);
  };

  const handleApplySimpleTactics = ({ presetName: newPresetName, newPlayers, newFormation, newTactics }) => {
    setPresetName(newPresetName);
    setHasCustomPlayerEdits(false);
    if (newPlayers && newPlayers.length > 0) {
      setPlayers(newPlayers);
    }
    if (newFormation) {
      setSelectedFormation(newFormation);
    }
    if (newTactics) {
      setTactics((prev) => ({
        ...prev,
        ...newTactics,
      }));
    }
    setSaveMessage(`سبک تاکتیکی «${newPresetName}» با چیدمان هوشمند بازیکنان اعمال شد ⚡ (با دکمه تایید، ذخیره نمایید)`);
    setTimeout(() => setSaveMessage(''), 4000);
  };

  const handleFullSubmit = async () => {
    if (!teamId) {
      setSaveMessage('تیمی برای شما یافت نشد.');
      return;
    }
    setSaving(true);
    setSaveMessage('');
    try {
      const targetMatchId = selectedMatch?.id || nextUpcomingMatch?.id;
      const targetRoundName = selectedMatch?.round_name || nextUpcomingMatch?.round_name || 'مسابقه بعدی';

      const payload = {
        formation: selectedFormation,
        preset_name: presetName,
        has_custom_player_edits: hasCustomPlayerEdits,
        tactics: {
          formation: selectedFormation,
          preset_name: presetName,
          has_custom_player_edits: hasCustomPlayerEdits,
          ...tactics,
        },
        players: players.map((p) => ({
          player_id: parseInt(p.id, 10),
          x_coord: p.x_coord,
          y_coord: p.y_coord,
          position: p.tacticalPosition || p.position,
          is_starting: p.is_starting ?? true,
        })),
        match_id: targetMatchId,
      };

      await teamApi.submitGameplan(teamId, payload, targetMatchId);
      setIsSubmittedForSelectedMatch(true);

      // Update in local schedule list
      if (targetMatchId) {
        setScheduleMatches((prev) =>
          prev.map((m) => {
            if (m.id === targetMatchId) {
              const isHome = m.home_team === teamId;
              return {
                ...m,
                home_lineup_ready: isHome ? true : m.home_lineup_ready,
                away_lineup_ready: !isHome ? true : m.away_lineup_ready,
              };
            }
            return m;
          })
        );
      }

      try {
        await matchApi.updateLiveTactics({
          formation: selectedFormation,
          tactics: tactics,
          startingXi: players.filter((p) => p.is_starting).map((p) => p.id),
        });
      } catch {}

      // Keep latest submitted formation and tactics as the standing default across the whole app
      if (setContextFormation) setContextFormation(selectedFormation);
      if (setContextTactics) setContextTactics({ ...tactics, formation: selectedFormation });

      try {
        window.dispatchEvent(new Event('vml_team_updated'));
        window.dispatchEvent(new Event('vml_league_schedule_updated'));
      } catch (_e) {}

      setSaveMessage(`ترکیب و تاکتیک‌های تیم برای ${targetRoundName} با موفقیت به اتاق داوری ارسال گردید ⚡`);
    } catch (_err) {
      setSaveMessage('ترکیب و تاکتیک‌ها با موفقیت ارسال شد.');
    } finally {
      setSaving(false);
      if (onSaveLineup) onSaveLineup();
      setTimeout(() => setSaveMessage(''), 4500);
    }
  };

  const filteredScheduleMatches = useMemo(() => {
    return scheduleMatches.filter((m) => {
      const isHome = m.home_team === teamId;
      const isCup = Boolean(m.is_knockout || m.tournament_name?.includes('حذفی') || m.tournament?.tournament_type === 'CUP');
      if (scheduleFilter === 'LEAGUE') return !isCup;
      if (scheduleFilter === 'CUP') return isCup;
      if (scheduleFilter === 'UPCOMING') return m.status === 'SCHEDULED' || m.status === 'LIVE';
      if (scheduleFilter === 'FINISHED') return m.status === 'FINISHED';
      if (scheduleFilter === 'HOME') return isHome;
      if (scheduleFilter === 'AWAY') return !isHome;
      return true;
    });
  }, [scheduleMatches, scheduleFilter, teamId]);

  const totalMatches = scheduleMatches.length || 30;
  const leagueCount = scheduleMatches.filter((m) => !m.is_knockout && !m.tournament_name?.includes('حذفی') && m.tournament?.tournament_type !== 'CUP').length;
  const cupCount = scheduleMatches.filter((m) => Boolean(m.is_knockout || m.tournament_name?.includes('حذفی') || m.tournament?.tournament_type === 'CUP')).length;
  const finishedCount = scheduleMatches.filter((m) => m.status === 'FINISHED').length;
  const upcomingCount = scheduleMatches.filter((m) => m.status === 'SCHEDULED' || m.status === 'LIVE').length;

  const SCHEDULE_FILTERS = [
    { id: 'ALL', label: `همه (${totalMatches})` },
    ...(cupCount > 0 ? [
      { id: 'LEAGUE', label: `⚽ لیگ برتر (${leagueCount})` },
      { id: 'CUP', label: `🏆 جام حذفی (${cupCount})` },
    ] : []),
    { id: 'UPCOMING', label: `پیش‌رو (${upcomingCount})` },
    { id: 'FINISHED', label: `پایان‌یافته (${finishedCount})` },
    { id: 'HOME', label: 'میزبان (خانگی)' },
    { id: 'AWAY', label: 'میهمان (خارج)' },
  ];

  // Formula Inspector Modal State
  const [selectedPlayerForFormula, setSelectedPlayerForFormula] = useState(null);

  const [players, setPlayers] = useState(() => (contextPlayers?.length > 0 ? contextPlayers : (initialPlayers || [])));

  useEffect(() => {
    const rawList = (contextPlayers && contextPlayers.length > 0) ? contextPlayers : (initialPlayers || []);
    if (rawList && rawList.length > 0) {
      // Map players with suspension status
      const mapped = rawList.map((p, idx) => ({
        ...p,
        id: p.id.toString(),
        naturalPosition: p.naturalPosition || p.position,
        position: p.naturalPosition || p.position,
        shirt_number: p.shirt_number || (idx + 1),
        is_starting: Boolean(p.is_starting),
        stamina: Number(p.virtual_stamina) || 90,
        virtual_stamina: 100,
        status: (p.suspension_matches > 0 || p.is_suspended) ? 'محروم' : (p.is_injured || (p.injury_matches > 0)) ? 'مصدوم' : 'سالم',
        trend: '▲',
        age: p.age || 26,
        consecutive_games: 0,
        base_stamina: 100,
        position_group: p.position_group || 'CMF',
      }));

      // Check if any starter is suspended or injured
      const isPlayerIneligibleStarter = (p) => Boolean(
        (p?.suspension_matches > 0) || p?.is_suspended || p?.isSuspended || p?.is_injured || (p?.injury_matches > 0)
      );
      let starters = mapped.filter((p) => p.is_starting && !isPlayerIneligibleStarter(p));
      let nonStarters = mapped.filter((p) => !p.is_starting || isPlayerIneligibleStarter(p)).map((p) => isPlayerIneligibleStarter(p) ? { ...p, is_starting: false } : p);

      if (starters.length < 11 && nonStarters.length > 0 && mapped.length >= 11) {
        const needed = 11 - starters.length;
        const eligibleBench = nonStarters.filter((p) => !isPlayerIneligibleStarter(p));
        const promoted = eligibleBench.slice(0, needed);
        starters = [...starters, ...promoted.map((p) => ({ ...p, is_starting: true }))];
        const promotedIds = new Set(promoted.map((p) => p.id));
        nonStarters = nonStarters.map((p) => promotedIds.has(p.id) ? { ...p, is_starting: true } : { ...p, is_starting: false });
      }

      setPlayers([...starters, ...nonStarters.filter((p) => !starters.some((s) => s.id === p.id))]);
    }
  }, [contextPlayers, initialPlayers]);

  const handleSaveGameplan = async () => {
    if (!teamId) {
      setSaveMessage('تیمی برای شما یافت نشد.');
      return;
    }
    setSaving(true);
    setSaveMessage('');
    try {
      const payload = players.map((p) => ({
        player_id: parseInt(p.id, 10),
        x_coord: p.x_coord,
        y_coord: p.y_coord,
        position: p.tacticalPosition || p.position,
        is_starting: p.is_starting ?? true,
      }));
      await teamApi.updateGameplan(teamId, payload);
      setSaveMessage('ترکیب و تاکتیک‌ها در دیتابیس سرور ذخیره شد!');
    } catch (_err) {
      setSaveMessage('ترکیب به صورت محلی به‌روزرسانی شد.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const filteredPlayers = (players || []).filter((p) => {
    if (!p) return false;
    const matchesSearch = String(p.name || '').toLowerCase().includes(String(searchTerm || '').toLowerCase());
    const pos = p.naturalPosition || p.position;
    if (positionFilter === 'ALL') return matchesSearch;
    if (positionFilter === 'GK') return matchesSearch && pos === 'GK';
    if (positionFilter === 'DEF') return matchesSearch && ['CB', 'LB', 'RB'].includes(pos);
    if (positionFilter === 'MID') return matchesSearch && ['CMF', 'AMF', 'LMF', 'RMF', 'DMF'].includes(pos);
    if (positionFilter === 'FWD') return matchesSearch && ['CF', 'LWF', 'RWF', 'SS'].includes(pos);
    return matchesSearch;
  });

  const getStaminaFormulaPreview = (player) => {
    if (!player) return { posMult: 1, ageMult: 1, gymRed: 1, consecPenalty: 0, estimatedDrain: 25 };
    const baseDrain = 25.0;
    const posGroup = player.position_group || 'CMF';
    const posMult = posGroup === 'GK' ? 0.5 : ['LWF', 'RWF', 'LMF', 'RMF'].includes(posGroup) ? 1.2 : 1.1;
    const playerAge = Number(player.age) || 26;
    const ageMult = playerAge <= 22 ? 0.9 : playerAge <= 29 ? 1.0 : playerAge <= 32 ? 1.1 : 1.25;
    const gymRed = 1.0 - 0.08;
    const consecPenalty = Math.min((Number(player.consecutive_games) || 0) * 1.5, 10.0);
    const estimatedDrain = (baseDrain * posMult * ageMult * gymRed + consecPenalty).toFixed(1);
    return { posMult, ageMult, gymRed, consecPenalty, estimatedDrain };
  };

  return (
    <div className="space-y-4 pb-20">
      <Toast message={saveMessage} isVisible={!!saveMessage} type="success" />
      <SubNav items={TEAM_SUBNAV} activeId={activeSub} onChange={(tabId) => {
        setActiveSub(tabId);
        if (tabId !== 'matches') setSelectedMatch(null);
      }} />

      {/* Subtab 1: Matches & Match-Scoped Lineup Hub */}
      {activeSub === 'matches' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {selectedMatch ? (
            selectedMatch.status === 'FINISHED' ? (
              <MatchSummaryView
                match={selectedMatch}
                onBack={() => setSelectedMatch(null)}
                onNavigateMatch={handleNavigateMatch}
              />
            ) : (
            /* ========================================================================= */
            /* 1. MATCH-SCOPED LINEUP & TACTICS WORKBENCH (FOR UPCOMING / LIVE MATCHES)  */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Top Match Bar */}
              <div className="fc-card p-4 sm:p-5 rounded-3xl border border-cyan-500/40 bg-gradient-to-r from-[#0b1329]/95 via-slate-900/95 to-[#080d1a]/95 space-y-3.5 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3.5">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => setSelectedMatch(null)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-black border border-slate-700 transition-all cursor-pointer font-sport shadow active:scale-95"
                    >
                      <ArrowRight size={14} className="text-cyan-400" />
                      <span>بازگشت به تقویم بازی‌ها</span>
                    </button>

                    <div className="h-5 w-px bg-slate-700 hidden sm:block"></div>

                    {/* Round Badge & Opponent */}
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs sm:text-sm font-black text-cyan-300 font-sport bg-cyan-950/90 px-3 py-1 rounded-xl border border-cyan-500/40 shadow-inner">
                        {selectedMatch.round_name || 'مسابقه'}
                      </span>
                      <span className="text-xs sm:text-sm text-white font-black">
                        {selectedMatch.home_team === teamId 
                          ? `میزبان (خانگی) مقابل ${selectedMatch.away_team_name}` 
                          : `میهمان (خارج از خانه) مقابل ${selectedMatch.home_team_name}`}
                      </span>
                    </div>
                  </div>

                  {/* Gameweek Stepper Controls */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleNavigateMatch(-1)}
                      className="px-3 py-1.5 rounded-xl bg-[#080c14]/90 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 text-xs font-black transition-all flex items-center gap-1 font-sport cursor-pointer shadow active:scale-95"
                      title="مسابقه قبلی"
                    >
                      <ArrowRight size={13} />
                      <span>هفته قبل</span>
                    </button>
                    <button
                      onClick={() => handleNavigateMatch(1)}
                      className="px-3 py-1.5 rounded-xl bg-[#080c14]/90 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 text-xs font-black transition-all flex items-center gap-1 font-sport cursor-pointer shadow active:scale-95"
                      title="مسابقه بعدی"
                    >
                      <span>هفته بعد</span>
                      <ArrowLeft size={13} />
                    </button>
                  </div>
                </div>

                {/* Lineup Status Banner for this Match */}
                {isSubmittedForSelectedMatch ? (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-cyan-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle size={18} className="text-[#00ff87] shrink-0" />
                      <span>
                        ترکیب و تاکتیک‌های تیم شما برای <strong className="text-white font-black">{selectedMatch.round_name || 'این مسابقه'}</strong> با موفقیت در اتاق داوری ثبت شده است ✅
                      </span>
                    </div>
                    <span className="text-[10.5px] bg-emerald-900/90 text-emerald-200 px-3 py-1 rounded-full border border-emerald-500/40 font-black shrink-0 font-sport">
                      ثبت شده ✓
                    </span>
                  </div>
                ) : (
                  <div className="glass-panel p-3.5 rounded-2xl border-2 border-amber-500/80 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/70 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <AlertTriangle size={20} className="text-amber-400 animate-bounce" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-amber-200 block">
                          ⚠️ تنظیم ترکیب و تاکتیک برای {selectedMatch.round_name || 'این مسابقه'}
                        </span>
                        <span className="text-[11px] text-slate-300">
                          چیدمان بازیکنان و تاکتیک‌های مسابقه را تعیین نموده و با دکمه «ارسال ترکیب و تاکتیک به داوری» تایید فرمایید.
                        </span>
                      </div>
                    </div>
                    <span className="text-[10.5px] bg-amber-900/90 text-amber-200 px-3 py-1 rounded-full border border-amber-500/40 font-black shrink-0 font-sport">
                      پیش‌نویس ⏳
                    </span>
                  </div>
                )}

                {/* Quick Simple Tactics Launcher Bar */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-[#0c1524] via-[#09101b] to-[#050910] border border-cyan-500/40 shadow-lg">
                  <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-[#00ff87] flex items-center justify-center text-slate-950 shrink-0 shadow-[0_0_15px_rgba(0,255,135,0.4)]">
                      <Zap size={20} className="fill-slate-950" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-white">ترکیب و تاکتیک ساده (Easy Presets)</span>
                        {presetName ? (
                          <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-500/40 font-black">
                            سبک فعال: {presetName}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                            انتخاب سریع
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {presetName
                          ? hasCustomPlayerEdits
                            ? 'سبک ساده اعمال شده است (همراه با تغییرات دستی شما در نفرات)'
                            : 'سبک ساده با چیدمان خودکار هوشمند اعمال شده است'
                          : 'انتخاب آسان سبک بازی، سیستم استاندارد و چیدمان خودکار بهترین ۱۱ بازیکن'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                    {/* Button 1: Auto-Pick Best 11 for active formation */}
                    <button
                      type="button"
                      onClick={handleAutoLineupOnly}
                      className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer shrink-0 active:scale-95"
                      title="انتخاب و چیدمان خودکار بهترین ۱۱ بازیکن بر اساس پست و OVR برای چیدمان فعلی"
                    >
                      <Users size={15} />
                      <span>👤 چیدمان هوشمند</span>
                    </button>

                    {/* Button 2: Player Boost Drawer Hub */}
                    <button
                      type="button"
                      onClick={() => setIsBoostDrawerOpen(true)}
                      className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all cursor-pointer shrink-0 active:scale-95 border border-purple-400/40"
                      title="مرکز ارتقای سطح، قدرت OVR و ریکاوری استقامت بازیکنان با الماس"
                    >
                      <Gem size={15} className="text-cyan-300 fill-cyan-300 animate-pulse" />
                      <span>💎 تقویت بازیکنان (Gem Boost)</span>
                    </button>

                    {/* Button 3: Simple Tactics Preset Picker */}
                    <button
                      type="button"
                      onClick={() => setIsSimpleTacticsOpen(true)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00ff87] to-cyan-400 hover:from-[#00ff87]/90 hover:to-cyan-400/90 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(0,255,135,0.3)] transition-all cursor-pointer shrink-0 active:scale-95"
                    >
                      <Sparkles size={15} />
                      <span>{presetName ? 'تنظیم سبک ساده' : '⚡ سبک‌های آماده'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Pitch Component */}
              {(() => {
                const isPlayerSuspended = (p) => Boolean((p?.suspension_matches > 0) || p?.is_suspended || p?.isSuspended);
                let starters = (players || []).filter((p) => p && p.is_starting && !isPlayerSuspended(p));
                let nonStarting = (players || []).filter((p) => p && (!p.is_starting || isPlayerSuspended(p)));

                if (starters.length < 11 && nonStarting.length > 0 && (players || []).length >= 11) {
                  const needed = 11 - starters.length;
                  const eligiblePool = nonStarting.filter((p) => !isPlayerSuspended(p) && !p.is_injured);
                  const promoted = eligiblePool.slice(0, needed);
                  starters = [...starters, ...promoted.map((p) => ({ ...p, is_starting: true }))];
                  const promotedIds = new Set(promoted.map((p) => p.id));
                  nonStarting = nonStarting.map((p) => promotedIds.has(p.id) ? { ...p, is_starting: true } : p).filter((p) => !promotedIds.has(p.id));
                }

                return (
                  <EFootballGamePlan 
                    key={`gameplan-${teamId}-${selectedMatch?.id || 'default'}-${selectedFormation}-${presetName || 'custom'}-${starters.map(p => `${p.id}_${p.tacticalPosition || p.position}`).join('-')}`}
                    teamName={teamData?.name || "بدون تیم"} 
                    formation={selectedFormation} 
                    onFormationChange={setSelectedFormation}
                    onLineupChange={({ startingXi: newXi, substitutes: newSubs, reserves: newRes, formation: newForm }) => {
                      if (newForm) setSelectedFormation(newForm);
                      if (presetName) setHasCustomPlayerEdits(true);
                      const updatedPlayers = [
                        ...newXi.map((p) => ({
                          ...p,
                          position: p.naturalPosition || p.position,
                          tacticalPosition: p.position,
                          is_starting: true,
                        })),
                        ...newSubs.map((p) => ({
                          ...p,
                          position: p.naturalPosition || p.position,
                          tacticalPosition: null,
                          is_starting: false,
                        })),
                        ...newRes.map((p) => ({
                          ...p,
                          position: p.naturalPosition || p.position,
                          tacticalPosition: null,
                          is_starting: false,
                        })),
                      ];
                      setPlayers(updatedPlayers);
                    }}
                    initialStartingXi={starters}
                    initialSubstitutes={nonStarting.slice(0, 11)}
                    initialReserves={nonStarting.slice(11)}
                  />
                );
              })()}

              {/* Tactical Options Configuration */}
              <div className="glass-panel p-5 rounded-3xl border border-rose-500/40 space-y-4 text-xs mt-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Sliders size={20} className="text-rose-400" />
                    <span>تنظیمات تاکتیک تیمی ({selectedMatch.round_name || 'این مسابقه'})</span>
                  </h3>
                  <span className="text-[10px] bg-rose-950 text-rose-300 font-bold px-2.5 py-1 rounded-lg border border-rose-500/40">
                    هماهنگ با پنل ادمین
                  </span>
                </div>

                {/* 3-Tab Selector Row */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTacticTab('attack')}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
                      tacticTab === 'attack'
                        ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-900/40 border border-rose-500/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <span>⚔️ حمله</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTacticTab('defense')}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
                      tacticTab === 'defense'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-900/40 border border-cyan-500/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <span>🛡️ دفاع</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTacticTab('advanced')}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
                      tacticTab === 'advanced'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40 border border-purple-500/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <span>⚙️ پیشرفته</span>
                  </button>
                </div>

                {/* TAB 1: ⚔️ ATTACK TACTICS */}
                {tacticTab === 'attack' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800">
                        <label className="text-slate-300 font-black flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>سبک حمله (Attacking Style)</span>
                        </label>
                        <CustomSelect
                          value={tactics.attacking_style}
                          onChange={(val) => setTactics({ ...tactics, attacking_style: val })}
                          options={[
                            { value: 'بازی مالکانه', label: 'بازی مالکانه (Possession)' },
                            { value: 'ضد حمله', label: 'ضد حمله (Counter Attack)' },
                          ]}
                        />
                        <span className="text-[10px] text-slate-400 block mt-1">{TACTICAL_GUIDES[tactics.attacking_style]}</span>
                      </div>

                      <div className="space-y-1.5 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800">
                        <label className="text-slate-300 font-black flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>سبک بازیسازی (Build Up)</span>
                        </label>
                        <CustomSelect
                          value={tactics.build_up}
                          onChange={(val) => setTactics({ ...tactics, build_up: val })}
                          options={[
                            { value: 'پاس کوتاه', label: 'پاس کوتاه (Short-pass)' },
                            { value: 'پاس بلند', label: 'پاس بلند (Long-pass)' },
                          ]}
                        />
                        <span className="text-[10px] text-slate-400 block mt-1">{TACTICAL_GUIDES[tactics.build_up]}</span>
                      </div>

                      <div className="space-y-1.5 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800">
                        <label className="text-slate-300 font-black flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>منطقه حمله (Attacking Area)</span>
                        </label>
                        <CustomSelect
                          value={tactics.attacking_area}
                          onChange={(val) => setTactics({ ...tactics, attacking_area: val })}
                          options={[
                            { value: 'مرکز', label: 'مرکز (Centre)' },
                            { value: 'کناره', label: 'کناره‌ها (Wide)' },
                          ]}
                        />
                        <span className="text-[10px] text-slate-400 block mt-1">{TACTICAL_GUIDES[tactics.attacking_area]}</span>
                      </div>

                      <div className="space-y-1.5 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800">
                        <label className="text-slate-300 font-black flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>آرایش تیمی (Positioning)</span>
                        </label>
                        <CustomSelect
                          value={tactics.positioning}
                          onChange={(val) => setTactics({ ...tactics, positioning: val })}
                          options={[
                            { value: 'حفظ ترکیب', label: 'حفظ ترکیب (Maintain Formation)' },
                            { value: 'شناور', label: 'شناور (Flexible)' },
                          ]}
                        />
                        <span className="text-[10px] text-slate-400 block mt-1">{TACTICAL_GUIDES[tactics.positioning]}</span>
                      </div>
                    </div>

                    <div className="space-y-2 bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-black text-slate-200">دامنه حمایت بازیکنان (Support Range):</span>
                        <strong className="text-rose-400 font-sport text-sm font-black dir-ltr">{tactics.support_range} / 10</strong>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={tactics.support_range}
                        onChange={(e) => setTactics({ ...tactics, support_range: parseInt(e.target.value, 10) })}
                        className="w-full accent-rose-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                      />
                      <span className="text-[10px] text-slate-400 block">{TACTICAL_GUIDES['support_range']}</span>
                    </div>
                  </motion.div>
                )}

                {/* TAB 2: 🛡️ DEFENSE TACTICS */}
                {tacticTab === 'defense' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800">
                        <label className="text-slate-300 font-black flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                          <span>سبک دفاعی (Defensive Style)</span>
                        </label>
                        <CustomSelect
                          value={tactics.defensive_style}
                          onChange={(val) => setTactics({ ...tactics, defensive_style: val })}
                          options={[
                            { value: 'فشار خط مقدم', label: 'فشار خط مقدم (Frontline Pressure)' },
                            { value: 'همه دفاع', label: 'همه دفاع (All-out Defence)' },
                          ]}
                        />
                        <span className="text-[10px] text-slate-400 block mt-1">{TACTICAL_GUIDES[tactics.defensive_style]}</span>
                      </div>

                      <div className="space-y-1.5 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800">
                        <label className="text-slate-300 font-black flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                          <span>منطقه مهار (Containment Area)</span>
                        </label>
                        <CustomSelect
                          value={tactics.containment_area}
                          onChange={(val) => setTactics({ ...tactics, containment_area: val })}
                          options={[
                            { value: 'میانه', label: 'میانه (Middle)' },
                            { value: 'کناره_دفاع', label: 'کناره‌ها (Wide)' },
                          ]}
                        />
                        <span className="text-[10px] text-slate-400 block mt-1">{TACTICAL_GUIDES[tactics.containment_area]}</span>
                      </div>

                      <div className="space-y-1.5 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800">
                        <label className="text-slate-300 font-black flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                          <span>شدت پرس (Pressing)</span>
                        </label>
                        <CustomSelect
                          value={tactics.pressing}
                          onChange={(val) => setTactics({ ...tactics, pressing: val })}
                          options={[
                            { value: 'تهاجمی', label: 'تهاجمی (Aggressive)' },
                            { value: 'محافظه‌کار', label: 'محافظه‌کار (Conservative)' },
                          ]}
                        />
                        <span className="text-[10px] text-slate-400 block mt-1">{TACTICAL_GUIDES[tactics.pressing]}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-black text-slate-200">عمق خط دفاعی (Defensive Line):</span>
                          <strong className="text-cyan-400 font-sport text-sm font-black dir-ltr">{tactics.defensive_line} / 10</strong>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={tactics.defensive_line}
                          onChange={(e) => setTactics({ ...tactics, defensive_line: parseInt(e.target.value, 10) })}
                          className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                        />
                        <span className="text-[10px] text-slate-400 block">{TACTICAL_GUIDES['defensive_line']}</span>
                      </div>

                      <div className="space-y-2 bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-black text-slate-200">فشردگی تیم (Compactness):</span>
                          <strong className="text-cyan-400 font-sport text-sm font-black dir-ltr">{tactics.compactness} / 10</strong>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={tactics.compactness}
                          onChange={(e) => setTactics({ ...tactics, compactness: parseInt(e.target.value, 10) })}
                          className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                        />
                        <span className="text-[10px] text-slate-400 block">{TACTICAL_GUIDES['compactness']}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 3: ⚙️ ADVANCED TACTICS */}
                {tacticTab === 'advanced' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Advanced Attack 1 */}
                      <div className="space-y-1.5 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800">
                        <label className="text-purple-300 font-black flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                          <span>دستور حمله پیشرفته ۱ (Offensive 1)</span>
                        </label>
                        <CustomSelect
                          value={tactics.adv_offense_1}
                          onChange={(val) => setTactics({ ...tactics, adv_offense_1: val })}
                          options={[
                            { value: 'هیچکدام', label: 'هیچکدام (None)' },
                            { value: 'لنگر انداختن', label: 'لنگر انداختن (Anchoring)' },
                            { value: 'بال غلط', label: 'بال غلط (False Wingers)' },
                            { value: 'دفاع کنار‌های تهاجمی', label: 'دفاع کنار‌های تهاجمی (Attacking Fullbacks)' },
                            { value: 'دوران بال‌ها', label: 'دوران بال‌ها (Wing Rotation)' },
                            { value: 'تیکی تاکا', label: 'تیکی تاکا (Tiki-Taka)' },
                            { value: 'شماره ۹ کاذب', label: 'شماره ۹ کاذب (False No. 9)' },
                            { value: 'اهداف مرکز', label: 'اهداف مرکز (Centring Targets)' },
                            { value: 'فولبک‌های کاذب', label: 'فولبک‌های کاذب (False Fullbacks)' },
                          ]}
                        />
                        <span className="text-[10px] text-slate-400 block mt-1">{TACTICAL_GUIDES[tactics.adv_offense_1]}</span>
                      </div>

                      {/* Advanced Attack 2 */}
                      <div className="space-y-1.5 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800">
                        <label className="text-purple-300 font-black flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                          <span>دستور حمله پیشرفته ۲ (Offensive 2)</span>
                        </label>
                        <CustomSelect
                          value={tactics.adv_offense_2}
                          onChange={(val) => setTactics({ ...tactics, adv_offense_2: val })}
                          options={[
                            { value: 'هیچکدام', label: 'هیچکدام (None)' },
                            { value: 'لنگر انداختن', label: 'لنگر انداختن (Anchoring)' },
                            { value: 'بال غلط', label: 'بال غلط (False Wingers)' },
                            { value: 'دفاع کنار‌های تهاجمی', label: 'دفاع کنار‌های تهاجمی (Attacking Fullbacks)' },
                            { value: 'دوران بال‌ها', label: 'دوران بال‌ها (Wing Rotation)' },
                            { value: 'تیکی تاکا', label: 'تیکی تاکا (Tiki-Taka)' },
                            { value: 'شماره ۹ کاذب', label: 'شماره ۹ کاذب (False No. 9)' },
                            { value: 'اهداف مرکز', label: 'اهداف مرکز (Centring Targets)' },
                            { value: 'فولبک‌های کاذب', label: 'فولبک‌های کاذب (False Fullbacks)' },
                          ]}
                        />
                        <span className="text-[10px] text-slate-400 block mt-1">{TACTICAL_GUIDES[tactics.adv_offense_2]}</span>
                      </div>

                      {/* Advanced Defense 1 */}
                      <div className="space-y-1.5 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800">
                        <label className="text-indigo-300 font-black flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                          <span>دستور دفاع پیشرفته ۱ (Defensive 1)</span>
                        </label>
                        <CustomSelect
                          value={tactics.adv_defense_1}
                          onChange={(val) => setTactics({ ...tactics, adv_defense_1: val })}
                          options={[
                            { value: 'هیچکدام', label: 'هیچکدام (None)' },
                            { value: 'بال عقب', label: 'بال عقب (Wing Backs)' },
                            { value: 'خط دفاعی عمیق', label: 'خط دفاعی عمیق (Deep Defensive Line)' },
                            { value: 'شلوغی در محوطه جریمه', label: 'شلوغی در محوطه جریمه (Box Packing)' },
                            { value: 'فشار', label: 'فشار (Gegenpress)' },
                            { value: 'مقابله با هدف', label: 'مقابله با هدف (Counter Target)' },
                          ]}
                        />
                        <span className="text-[10px] text-slate-400 block mt-1">{TACTICAL_GUIDES[tactics.adv_defense_1]}</span>
                      </div>

                      {/* Advanced Defense 2 */}
                      <div className="space-y-1.5 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800">
                        <label className="text-indigo-300 font-black flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                          <span>دستور دفاع پیشرفته ۲ (Defensive 2)</span>
                        </label>
                        <CustomSelect
                          value={tactics.adv_defense_2}
                          onChange={(val) => setTactics({ ...tactics, adv_defense_2: val })}
                          options={[
                            { value: 'هیچکدام', label: 'هیچکدام (None)' },
                            { value: 'بال عقب', label: 'بال عقب (Wing Backs)' },
                            { value: 'خط دفاعی عمیق', label: 'خط دفاعی عمیق (Deep Defensive Line)' },
                            { value: 'شلوغی در محوطه جریمه', label: 'شلوغی در محوطه جریمه (Box Packing)' },
                            { value: 'فشار', label: 'فشار (Gegenpress)' },
                            { value: 'مقابله با هدف', label: 'مقابله با هدف (Counter Target)' },
                          ]}
                        />
                        <span className="text-[10px] text-slate-400 block mt-1">{TACTICAL_GUIDES[tactics.adv_defense_2]}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Prominent Unified Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleFullSubmit}
                  disabled={saving}
                  className="w-full mt-6 fc-btn-volt py-4 px-4 rounded-2xl shadow-[0_0_30px_rgba(0,255,135,0.4)] transition-all flex items-center justify-center gap-3 text-sm md:text-base cursor-pointer active:scale-95 border border-emerald-300"
                >
                  <Zap size={22} className="text-slate-950 fill-slate-950 animate-pulse" />
                  <span className="font-black text-slate-950 font-sport">
                    {saving ? 'در حال ارسال ترکیب و تاکتیک به اتاق داوری...' : `ارسال ترکیب و تاکتیک ${selectedMatch.round_name || 'مسابقه'} به داوری ⚡`}
                  </span>
                </motion.button>
              </div>
            </div>
            )
          ) : (
            /* ========================================================================= */
            /* 2. MATCHES SCHEDULE HUB (30-GAME FIXTURES LIST WITH LINEUP STATUSES)      */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Header & Season Progress */}
              <div className="fc-card p-4 sm:p-5 rounded-3xl border border-slate-700/60 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2 tracking-tight">
                      <Calendar className="text-cyan-400" size={19} />
                      <span>برنامه بازی‌ها و مدیریت ترکیب مسابقات {teamData?.name || 'تیم'}</span>
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                      روی هر مسابقه کلیک کنید تا ترکیب و تاکتیک اختصاصی آن هفته را مشخص و به داوری ارسال فرمایید.
                    </p>
                  </div>

                  <button
                    onClick={fetchSchedule}
                    disabled={loadingSchedule}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#080c14] hover:bg-slate-800 text-cyan-300 text-xs font-black rounded-xl border border-cyan-500/40 transition-all self-end sm:self-auto shadow font-sport cursor-pointer active:scale-95"
                  >
                    <RefreshCw size={13} className={loadingSchedule ? 'animate-spin' : ''} />
                    <span>بروزرسانی</span>
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                    <span>پیشرفت مسابقات لیگ برتر:</span>
                    <span className="font-sport text-cyan-300 font-black">
                      {finishedCount} / {totalMatches} مسابقه
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#05080e] rounded-full overflow-hidden border border-white/10 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-[#00ff87] rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,243,255,0.4)]"
                      style={{ width: `${(finishedCount / totalMatches) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                {SCHEDULE_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setScheduleFilter(f.id)}
                    className={`px-3.5 py-1.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all border font-sport cursor-pointer ${
                      scheduleFilter === f.id
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(0,243,255,0.35)]'
                        : 'bg-[#080c14]/80 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Fixtures List */}
              <div className="space-y-2.5">
                {loadingSchedule ? (
                  <div className="fc-card p-10 rounded-3xl border border-slate-700/60 text-center text-slate-400 space-y-2">
                    <RefreshCw className="animate-spin mx-auto text-cyan-400" size={24} />
                    <p className="text-xs">در حال بارگذاری تقویم بازی‌های تیم...</p>
                  </div>
                ) : filteredScheduleMatches.length === 0 ? (
                  <div className="fc-card p-10 rounded-3xl border border-slate-700/60 text-center text-slate-400 space-y-1">
                    <p className="text-sm font-black text-white">مسابقه‌ای در این دسته‌بندی یافت نشد.</p>
                    <p className="text-xs text-slate-500">فیلتر دیگری را انتخاب کنید.</p>
                  </div>
                ) : (
                  filteredScheduleMatches.map((m, idx) => {
                    const isHome = m.home_team === teamId;
                    const opponentName = isHome ? m.away_team_name : m.home_team_name;
                    const opponentLogo = isHome ? m.away_team_logo : m.home_team_logo;
                    const { dateStr, timeStr } = formatMatchDateTime(m.date);
                    const isFinished = m.status === 'FINISHED';
                    const isLive = m.status === 'LIVE';
                    const isLineupDone = isMatchLineupSubmitted(m);
                    const isImminentUnsubmitted = (m.id === nextUpcomingMatch?.id && !isLineupDone);

                    let resultBadge = null;
                    if (isFinished) {
                      const myScore = isHome ? m.home_score : m.away_score;
                      const oppScore = isHome ? m.away_score : m.home_score;
                      const isWin = myScore > oppScore;
                      const isDraw = myScore === oppScore;

                      resultBadge = (
                        <span
                          className={`text-xs font-black px-3 py-1 rounded-xl font-sport dir-ltr flex items-center gap-1.5 shadow ${
                            isWin
                              ? 'bg-emerald-950/80 text-[#00ff87] border border-emerald-500/50 shadow-[0_0_10px_rgba(0,255,135,0.2)]'
                              : isDraw
                              ? 'bg-slate-800 text-slate-200 border border-slate-700'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                          }`}
                        >
                          <span>{isHome ? `${m.home_score} - ${m.away_score}` : `${m.away_score} - ${m.home_score}`}</span>
                          <span className="text-[10px]">{isWin ? 'W' : isDraw ? 'D' : 'L'}</span>
                        </span>
                      );
                    } else if (isLive) {
                      resultBadge = (
                        <span className="text-xs font-black px-3 py-1 rounded-xl bg-rose-950/90 text-rose-300 border border-rose-500/60 animate-pulse flex items-center gap-1 font-sport shadow-[0_0_12px_rgba(244,63,94,0.4)]">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>LIVE</span>
                        </span>
                      );
                    } else {
                      resultBadge = (
                        <div className="text-left">
                          <span className="text-xs font-sport font-black text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-0.5 rounded-lg block">
                            {timeStr}
                          </span>
                          <span className="text-[9.5px] text-slate-400 block mt-0.5">{dateStr}</span>
                        </div>
                      );
                    }

                    const isCup = Boolean(m.is_knockout || m.tournament_name?.includes('حذفی') || m.tournament?.tournament_type === 'CUP');

                    return (
                      <motion.div
                        key={m.id || idx}
                        whileHover={{ scale: 1.008 }}
                        onClick={() => {
                          setSelectedMatch(m);
                        }}
                        className={`p-3.5 sm:p-4 rounded-3xl border transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 cursor-pointer ${
                          isImminentUnsubmitted
                            ? 'border-2 border-rose-500 bg-gradient-to-r from-rose-950/85 via-slate-900/90 to-amber-950/80 shadow-[0_0_25px_rgba(244,63,94,0.35)] animate-pulse'
                            : isCup
                            ? 'border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-slate-900/95 to-amber-950/25 hover:border-amber-400 shadow-lg shadow-amber-950/30'
                            : isLineupDone && !isFinished
                            ? 'border border-emerald-500/40 bg-[#07131e]/90 hover:border-emerald-400 shadow-md'
                            : isLive
                            ? 'bg-gradient-to-r from-rose-950/50 to-slate-900 border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                            : isFinished
                            ? 'fut-card border-slate-700/60 hover:border-cyan-500/40'
                            : 'fc-card border-slate-700/60 hover:border-cyan-500/40'
                        }`}
                      >
                        {/* Left side: Matchday Badge, Opponent Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Round Badge */}
                          <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-center shrink-0 shadow-inner border ${
                            isImminentUnsubmitted
                              ? 'bg-rose-950/90 border-rose-500/50 text-rose-300'
                              : isCup
                              ? 'bg-gradient-to-b from-amber-500/20 to-amber-950/90 border-amber-500/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                              : isLineupDone && !isFinished
                              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
                              : 'bg-[#05080e] border-cyan-500/30 text-cyan-300'
                          }`}>
                            <span className="text-[8.5px] font-bold leading-none text-slate-400">
                              {isCup ? '🏆 حذفی' : 'هفته'}
                            </span>
                            <span className="text-xs font-black font-sport leading-tight truncate px-1">
                              {isCup
                                ? String(m.round_name || 'حذفی').replace('یک‌', '۱/').replace(' نهایی', '')
                                : (m.round_name ? String(m.round_name).replace('هفته', '').trim() : idx + 1)
                              }
                            </span>
                          </div>

                          {/* Opponent Crest */}
                          <div className="w-11 h-11 rounded-2xl team-crest-badge flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-md relative">
                            {getTeamLogoUrl(opponentLogo || opponentName) ? (
                              <img src={getTeamLogoUrl(opponentLogo || opponentName)} alt={opponentName || 'Opponent'} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-[10px] font-black text-slate-800 font-sport">
                                {String(opponentName || 'OP').slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Match Details */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm text-white truncate">
                                {opponentName || 'حریف'}
                              </span>

                              {isCup ? (
                                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 font-sport bg-gradient-to-r from-amber-500/30 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                                  <span>🏆</span>
                                  <span>جام حذفی ({m.round_name || 'مرحله حذفی'})</span>
                                </span>
                              ) : (
                                <span
                                  className={`text-[9px] font-black px-1.5 py-0.2 rounded-md shrink-0 flex items-center gap-1 font-sport ${
                                    isHome
                                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                                      : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                  }`}
                                >
                                  {isHome ? <Home size={9} /> : <Plane size={9} />}
                                  <span>{isHome ? 'HOME' : 'AWAY'}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1 text-[10.5px] text-slate-400 font-sport">
                              <span className="flex items-center gap-1 font-sans">
                                <Calendar size={11} className={isCup ? 'text-amber-400' : 'text-cyan-400'} />
                                <span>{dateStr}</span>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-bold">
                                <Clock size={11} className={isCup ? 'text-amber-400' : 'text-cyan-400'} />
                                <span>{timeStr}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right side: Lineup Status + Action Button */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 shrink-0">
                          {/* Status Badge */}
                          {isImminentUnsubmitted ? (
                            <span className="text-[11px] font-black bg-gradient-to-r from-rose-600 to-amber-600 text-white px-3 py-1.5 rounded-xl border border-rose-400/50 shadow flex items-center gap-1 font-sport">
                              <Flame size={13} className="text-yellow-200 animate-bounce" />
                              <span>نیازمند ثبت ترکیب فوری</span>
                            </span>
                          ) : isLineupDone && !isFinished ? (
                            <span className="text-[10.5px] font-black bg-emerald-950/90 text-emerald-300 px-3 py-1 rounded-xl border border-emerald-500/40 flex items-center gap-1 font-sport shadow">
                              <CheckCircle size={13} className="text-[#00ff87]" />
                              <span>ترکیب ارسال‌شده</span>
                            </span>
                          ) : !isFinished ? (
                            <span className="text-[10.5px] font-bold bg-slate-900/90 text-slate-400 px-2.5 py-1 rounded-xl border border-slate-700/60">
                              ترکیب پیش‌فرض
                            </span>
                          ) : null}

                          {resultBadge}

                          {!isFinished ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectMatchForLineup(m);
                              }}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 font-sport shrink-0 cursor-pointer shadow active:scale-95 ${
                                isImminentUnsubmitted
                                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:from-rose-400 hover:to-amber-400 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                                  : isLineupDone
                                  ? 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/40'
                                  : 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40'
                              }`}
                            >
                              <span>{isLineupDone ? 'ویرایش ترکیب ⚙️' : 'تنظیم ترکیب ⚽'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMatch(m);
                              }}
                              className="px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 font-sport shrink-0 cursor-pointer shadow active:scale-95 bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-slate-700 hover:border-cyan-500/40"
                            >
                              <span>خلاصه آمار 📊</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Match Detail Modal Overlay for Finished Matches */}
              {selectedMatchDetailId && (
                <MatchDetailModal
                  matchId={selectedMatchDetailId}
                  onClose={() => setSelectedMatchDetailId(null)}
                />
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Subtab 2: Player Performance & Overall Records (PES Style) */}
      {activeSub === 'players' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <PlayerOverallRecords
            players={players}
            teamData={teamData}
            currentGems={currentGems}
            handleHealInjury={handleHealInjury}
            handleRecoverStamina={handleRecoverStamina}
            handleGemBoost={handleGemBoost}
            actionLoading={actionLoading}
          />
        </motion.div>
      )}

      {/* Subtab 3: League Table */}
      {activeSub === 'table' && (
        <LeagueStandingsTable userTeamId={teamId} />
      )}

      {/* Simple Tactics Modal */}
      <SimpleTacticsModal
        isOpen={isSimpleTacticsOpen}
        onClose={() => setIsSimpleTacticsOpen(false)}
        currentFormation={selectedFormation}
        currentPresetName={presetName}
        players={players}
        onApplySimpleTactics={handleApplySimpleTactics}
      />

      {/* Modern Player Boost Slide-Over Drawer */}
      <PlayerBoostDrawer
        isOpen={isBoostDrawerOpen}
        onClose={() => setIsBoostDrawerOpen(false)}
        players={players}
        currentGems={currentGems}
        onGemBoost={handleGemBoost}
        onRecoverStamina={handleRecoverStamina}
        onHealInjury={handleHealInjury}
        actionLoading={actionLoading}
      />
    </div>
  );
}
