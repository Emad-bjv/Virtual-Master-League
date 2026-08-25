import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Calendar, Clock, RefreshCw, Lock, Unlock, Bell, AlertTriangle,
  Play, CheckCircle2, Shield, Settings, ChevronDown, ChevronRight, ChevronUp,
  Plus, Trash2, ArrowLeftRight, Check, Sparkles, Sliders, Eye, Award,
  Users, Zap, ShieldAlert, X, RotateCcw, SlidersHorizontal, Layers, Flame
} from 'lucide-react';
import { adminApi, matchApi, teamApi } from '../../services/api';
import { getTeamLogoUrl } from '../../utils/teamLogos';

const TIME_SLOT_PRESET_TEMPLATES = [
  {
    id: 'evening_standard',
    name: 'شبانه استاندارد (۸ بازی - ۵۰ دقیقه)',
    badge: 'پیش‌فرض مسابقات',
    desc: '۱۸:۰۰ تا ۲۳:۳۰ - فاصله ۵۰ دقیقه مناسب ۱۶ تیم',
    slots: ['18:00', '18:50', '19:40', '20:30', '21:15', '22:00', '22:45', '23:30']
  },
  {
    id: 'hourly_regular',
    name: 'ساعتی منظم (هر ۱ ساعت یک مسابقه)',
    badge: 'فاصله ۶۰ دقیقه',
    desc: '۱۷:۰۰ تا ۰۰:۰۰ - ۸ مسابقه رأس ساعت',
    slots: ['17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00']
  },
  {
    id: 'afternoon_compact',
    name: 'عصرگاهی فشرده (فاصله ۴۵ دقیقه)',
    badge: 'شروع از عصر',
    desc: '۱۶:۰۰ تا ۲۱:۱۵ - ۸ بازی سریع',
    slots: ['16:00', '16:45', '17:30', '18:15', '19:00', '19:45', '20:30', '21:15']
  },
  {
    id: 'night_compact',
    name: 'شبانه فشرده (فاصله ۴۰ دقیقه)',
    badge: 'سریع و بدون وقفه',
    desc: '۱۹:۰۰ تا ۲۳:۴۰ - ۸ بازی پشت سر هم',
    slots: ['19:00', '19:40', '20:20', '21:00', '21:40', '22:20', '23:00', '23:40']
  },
  {
    id: 'marathon_10',
    name: 'ماراتن آخر هفته (۱۰ مسابقه)',
    badge: '۱۰ بازی روزانه',
    desc: '۱۴:۰۰ تا ۲۳:۰۰ - مسابقات گسترده',
    slots: ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00']
  }
];

const DEFAULT_TIME_SLOTS = TIME_SLOT_PRESET_TEMPLATES[0].slots;

export default function AdminTournamentHub({ onNotification, onOpenRefereeRoom }) {
  const [hubTab, setHubTab] = useState('league'); // 'league' | 'cup' | 'sync'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Teams & Matches State
  const [teams, setTeams] = useState([]);
  const [leagueMatches, setLeagueMatches] = useState([]);
  const [gameweekStatus, setGameweekStatus] = useState(null);
  const [selectedGameweek, setSelectedGameweek] = useState('هفته ۱');
  
  // League Config Form State
  const [leagueName, setLeagueName] = useState('مستر لیگ مجازی');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [daysBetweenRounds, setDaysBetweenRounds] = useState(1);
  const [isDoubleRoundRobin, setIsDoubleRoundRobin] = useState(true);
  const [reserveCupDays, setReserveCupDays] = useState(true);
  const [cupIntervalGameweeks, setCupIntervalGameweeks] = useState(6);

  // Time Slots State & Persistence
  const [timeSlots, setTimeSlots] = useState(() => {
    try {
      const saved = localStorage.getItem('vml_admin_daily_time_slots');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not read saved time slots:', e);
    }
    return DEFAULT_TIME_SLOTS;
  });

  const [newSlotInput, setNewSlotInput] = useState('19:00');
  const [autoStartHour, setAutoStartHour] = useState('18:00');
  const [autoMatchDuration, setAutoMatchDuration] = useState(50);
  const [autoSlotsCount, setAutoSlotsCount] = useState(8);
  const [isTimeSlotEditorOpen, setIsTimeSlotEditorOpen] = useState(true);
  const [activeSlotConfigTab, setActiveSlotConfigTab] = useState('auto'); // 'auto' | 'manual' | 'presets'

  // Persist timeSlots to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vml_admin_daily_time_slots', JSON.stringify(timeSlots));
    } catch (e) {
      console.warn('Could not persist time slots:', e);
    }
  }, [timeSlots]);

  // Add individual slot with validation and chronological sorting
  const handleAddSlot = (slotToAdd) => {
    const raw = String(slotToAdd || newSlotInput).trim();
    if (!raw || !/^\d{1,2}:\d{2}$/.test(raw)) {
      notify('فرمت ساعت معتبر نیست (مثال صحیح: 19:30)', 'error');
      return;
    }
    const [hStr, mStr] = raw.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      notify('ساعت باید بین 00:00 تا 23:59 باشد.', 'error');
      return;
    }
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (timeSlots.includes(formatted)) {
      notify(`اسلات زمانی ${formatted} قبلاً در لیست وجود دارد.`, 'warning');
      return;
    }
    const updated = [...timeSlots, formatted].sort((a, b) => {
      const [ah, am] = a.split(':').map(Number);
      const [bh, bm] = b.split(':').map(Number);
      return ah * 60 + am - (bh * 60 + bm);
    });
    setTimeSlots(updated);
    notify(`اسلات زمانی ${formatted} با موفقیت به برنامه اضافه شد.`, 'success');
  };

  // Remove slot
  const handleRemoveSlot = (indexToRemove) => {
    if (timeSlots.length <= 1) {
      notify('حداقل باید یک اسلات زمانی برای برگزاری مسابقات وجود داشته باشد.', 'warning');
      return;
    }
    const removedSlot = timeSlots[indexToRemove];
    const updated = timeSlots.filter((_, i) => i !== indexToRemove);
    setTimeSlots(updated);
    notify(`اسلات ${removedSlot} حذف شد.`, 'info');
  };

  // Generate conflict-free sequential schedule slots
  const handleGenerateSequentialSlots = () => {
    const rawStart = String(autoStartHour || '18:00').trim();
    const parts = rawStart.split(':');
    const startH = parseInt(parts[0] || '18', 10);
    const startM = parseInt(parts[1] || '0', 10);
    const count = Math.max(1, parseInt(autoSlotsCount, 10) || 8);
    const duration = Math.max(10, parseInt(autoMatchDuration, 10) || 50);

    let currentTotalMinutes = startH * 60 + startM;
    const generated = [];

    for (let i = 0; i < count; i++) {
      const h = Math.floor(currentTotalMinutes / 60) % 24;
      const m = currentTotalMinutes % 60;
      const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      if (!generated.includes(formatted)) {
        generated.push(formatted);
      }
      currentTotalMinutes += duration;
    }

    setTimeSlots(generated);
    notify(`زنجیره ${generated.length} اسلات زمانی بدون تداخل با موفقیت تولید شد.`, 'success');
  };

  // Apply preset
  const handleApplyPreset = (presetSlots, presetName) => {
    setTimeSlots(presetSlots);
    notify(`قالب «${presetName}» با موفقیت اعمال شد.`, 'success');
  };

  // Reset to default
  const handleResetSlots = () => {
    setTimeSlots(DEFAULT_TIME_SLOTS);
    notify('اسلات‌های زمانی به حالت پیش‌فرض بازگردانی شدند.', 'info');
  };

  // Clear all
  const handleClearAllSlots = () => {
    if (window.confirm('آیا از پاک‌سازی تمام اسلات‌های زمانی اطمینان دارید؟')) {
      setTimeSlots(['18:00']);
      notify('اسلات‌ها پاک شدند و به یک اسلات پایه محدود شدند.', 'info');
    }
  };

  // Cup State
  const [cupsList, setCupsList] = useState([]);
  const [selectedCupId, setSelectedCupId] = useState(null);
  const [cupBracketData, setCupBracketData] = useState(null);
  const [newCupName, setNewCupName] = useState('جام حذفی مستر لیگ');
  const [newCupStartDate, setNewCupStartDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [newCupTeamCount, setNewCupTeamCount] = useState(16);
  const [newCupDaysBetween, setNewCupDaysBetween] = useState(3);

  // Sync State
  const [syncInterval, setSyncInterval] = useState(4);

  // Match Editing State
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState('SCHEDULED');

  const notify = (msg, type = 'success') => {
    if (onNotification) {
      onNotification(msg, type);
    } else {
      alert(msg);
    }
  };

  // Initial Fetch
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsRes, gwRes, matchesRes, cupsRes] = await Promise.all([
        teamApi.getTeams().catch(() => ({ data: [] })),
        matchApi.getGameweeksStatus().catch(() => ({ data: { gameweeks: [], active_gameweek: 'هفته ۱' } })),
        adminApi.getMatches().catch(() => ({ data: [] })),
        adminApi.getCups().catch(() => ({ data: [] })),
      ]);

      setTeams(teamsRes.data || []);
      setGameweekStatus(gwRes.data || null);
      if (gwRes.data?.active_gameweek) {
        setSelectedGameweek(gwRes.data.active_gameweek);
      }
      setLeagueMatches(matchesRes.data || []);
      
      const cups = cupsRes.data || [];
      setCupsList(cups);
      if (cups.length > 0 && !selectedCupId) {
        setSelectedCupId(cups[0].id);
      }
    } catch (err) {
      console.error('Error loading tournament hub data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCupId]);

  // Filter matches for selected gameweek (sorted chronologically by match date/time)
  const currentGameweekMatches = useMemo(() => {
    return (leagueMatches || [])
      .filter(
        (m) => String(m.round_name || '').trim().toLowerCase() === String(selectedGameweek || '').trim().toLowerCase()
      )
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  }, [leagueMatches, selectedGameweek]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Bracket when selectedCupId changes
  useEffect(() => {
    if (selectedCupId) {
      adminApi.getCupBracket(selectedCupId)
        .then((res) => setCupBracketData(res.data))
        .catch((err) => console.error('Error loading cup bracket:', err));
    } else {
      setCupBracketData(null);
    }
  }, [selectedCupId]);



  // Handle Complete League Reset (Purge all fixtures and standings)
  const handleResetLeague = async () => {
    const confirmMsg = `⚠️ هشدار مهم:\nآیا از پاک‌سازی کامل تمام مسابقات لیگ و صفر کردن جدول رده‌بندی اطمینان دارید؟\n\nتمامی بازی‌های ساخته‌شده، نتایج و رکوردهای لیگ حذف خواهند شد و سیستم به صورت کاملاً خام آماده ساخت مجدد تحویل داده می‌شود.`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await adminApi.resetLeague({});
      notify(res.data?.message || 'تمامی مسابقات لیگ با موفقیت پاک‌سازی شدند و سیستم به حالت خام بازگشت.', 'success');
      setSelectedGameweek('هفته ۱');
      try {
        window.dispatchEvent(new CustomEvent('vml_league_schedule_updated'));
        localStorage.setItem('vml_last_schedule_update', Date.now().toString());
      } catch (_e) {}
      await loadData();
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در پاک‌سازی مسابقات لیگ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const activeTeams = useMemo(() => (teams || []).filter(t => t.is_active !== false), [teams]);

  // Handle Configure / Generate League Fixtures
  const handleGenerateLeague = async () => {
    if (activeTeams.length < 2) {
      notify('حداقل ۲ تیم فعال برای تولید مسابقات لیگ مورد نیاز است.', 'error');
      return;
    }
    if (!window.confirm(`آیا از بازتولید برنامه مسابقات لیگ با ${activeTeams.length} تیم فعال اطمینان دارید؟ تمام مسابقات قبلی لیگ پاک و مجدداً طبق تنظیمات زمان‌بندی می‌شوند.`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await adminApi.configureLeague({
        name: leagueName,
        start_date: startDate,
        days_between_rounds: parseInt(daysBetweenRounds, 10),
        is_double_round_robin: isDoubleRoundRobin,
        reserve_cup_days: reserveCupDays,
        interval_gameweeks: cupIntervalGameweeks,
        time_slots: timeSlots,
        team_ids: activeTeams.map(t => t.id),
        clear_existing: true,
      });
      notify(res.data?.message || 'برنامه لیگ با موفقیت تولید شد.', 'success');
      setSelectedGameweek('هفته ۱');
      try {
        window.dispatchEvent(new CustomEvent('vml_league_schedule_updated'));
        localStorage.setItem('vml_last_schedule_update', Date.now().toString());
      } catch (_e) {}
      await loadData();
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در تولید برنامه مسابقات لیگ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Gameweek Bulk Actions
  const handleGameweekAction = async (action) => {
    setActionLoading(true);
    try {
      const res = await adminApi.gameweekAction({
        action,
        gameweek: selectedGameweek,
      });
      notify(res.data?.message || 'عملیات با موفقیت انجام شد.', 'success');
      try {
        window.dispatchEvent(new CustomEvent('vml_league_schedule_updated'));
        localStorage.setItem('vml_last_schedule_update', Date.now().toString());
      } catch (_e) {}
      await loadData();
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در انجام عملیات روی هفته', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Quick Forfeit (3-0)
  const handleForfeit = async (matchId, forfeitTeam) => {
    const teamLabel = forfeitTeam === 'home' ? 'میزبان' : 'میهمان';
    if (!window.confirm(`ثبت باخت فنی ۳-۰ به ضرر تیم ${teamLabel}؟`)) return;

    setActionLoading(true);
    try {
      const res = await adminApi.forfeitMatch(matchId, { forfeit_team: forfeitTeam });
      notify(res.data?.message || 'باخت فنی ثبت شد.', 'success');
      try {
        window.dispatchEvent(new CustomEvent('vml_league_schedule_updated'));
        localStorage.setItem('vml_last_schedule_update', Date.now().toString());
      } catch (_e) {}
      await loadData();
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در ثبت باخت فنی', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Match Date & Status Update
  const handleSaveMatchEdit = async (matchId) => {
    setActionLoading(true);
    try {
      await adminApi.updateMatch(matchId, {
        date: editDate ? new Date(editDate).toISOString() : undefined,
        status: editStatus,
      });
      notify('تغییرات مسابقه ذخیره و به پنل مربیان ارسال گردید.', 'success');
      setEditingMatchId(null);
      await loadData();
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در ویرایش مسابقه', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Create Cup Tournament
  const handleCreateCup = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await adminApi.createCup({
        name: newCupName,
        start_date: newCupStartDate,
        days_between_rounds: parseInt(newCupDaysBetween, 10),
        interval_gameweeks: cupIntervalGameweeks || 6,
        time_slots: timeSlots,
      });
      notify(res.data?.message || 'تورنمنت جام حذفی ساخته شد.', 'success');
      await loadData();
      if (res.data?.tournament_id) {
        setSelectedCupId(res.data.tournament_id);
      }
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در ساخت جام حذفی', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Cup Tournament
  const handleDeleteCup = async (cupId) => {
    if (!window.confirm('آیا از حذف این تورنمنت جام حذفی و تمام مسابقات آن اطمینان دارید؟')) return;
    setActionLoading(true);
    try {
      const res = await adminApi.deleteCup(cupId);
      notify(res.data?.message || 'جام حذفی حذف شد.', 'success');
      setSelectedCupId(null);
      await loadData();
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در حذف جام حذفی', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Complete Cup Reset (Purge all cup fixtures and tournaments)
  const handleResetCup = async () => {
    const confirmMsg = `⚠️ هشدار مهم:\nآیا از پاک‌سازی کامل تمام مسابقات جام حذفی و ریست کردن درخت براکت اطمینان دارید؟\n\nتمامی بازی‌های حذفی ساخته‌شده و نتایج حذف خواهند شد و سیستم به صورت کاملاً خام تحویل داده می‌شود.`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await adminApi.resetCup({ cup_id: selectedCupId });
      notify(res.data?.message || 'تمامی مسابقات جام حذفی با موفقیت پاک‌سازی شدند و سیستم به حالت خام بازگشت.', 'success');
      setSelectedCupId(null);
      setCupBracketData(null);
      try {
        window.dispatchEvent(new CustomEvent('vml_league_schedule_updated'));
        localStorage.setItem('vml_last_schedule_update', Date.now().toString());
      } catch (_e) {}
      await loadData();
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در پاک‌سازی مسابقات جام حذفی', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Advance Knockout Winner
  const handleAdvanceWinner = async (matchId) => {
    setActionLoading(true);
    try {
      const res = await adminApi.advanceCupWinner(matchId);
      notify(`تیم ${res.data?.winner || ''} با موفقیت به مرحله بعدی صعود کرد!`, 'success');
      if (selectedCupId) {
        const bRes = await adminApi.getCupBracket(selectedCupId);
        setCupBracketData(bRes.data);
      }
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در صعود تیم', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Sync Cup with League Calendar
  const handleSyncCalendar = async () => {
    if (!selectedCupId) {
      notify('لطفاً ابتدا یک جام حذفی را انتخاب کنید.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const res = await adminApi.syncCupWithLeague({
        cup_id: selectedCupId,
        interval_gameweeks: parseInt(syncInterval, 10),
        time_slots: timeSlots,
      });
      notify(
        `سینک هوشمند با موفقیت انجام شد! ${res.data?.updated_matches_count || 0} مسابقه جام حذفی بین هفته‌های لیگ زمان‌بندی شدند.`,
        'success'
      );
      await loadData();
      if (selectedCupId) {
        const bRes = await adminApi.getCupBracket(selectedCupId);
        setCupBracketData(bRes.data);
      }
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در سینک تقویم', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Combined All-Matches Calendar (League + Cup) - Strictly deduplicated by unique match ID
  const combinedCalendar = useMemo(() => {
    const matchMap = new Map();
    (leagueMatches || []).forEach((m) => {
      if (m && m.id) {
        matchMap.set(m.id, {
          ...m,
          is_cup: Boolean(m.is_knockout || m.tournament?.tournament_type === 'CUP')
        });
      }
    });

    if (cupBracketData?.rounds) {
      cupBracketData.rounds.forEach((rnd) => {
        (rnd.matches || []).forEach((m) => {
          if (m && m.id) {
            matchMap.set(m.id, {
              ...m,
              is_cup: true,
              tournament_name: cupBracketData.tournament?.name || 'جام حذفی'
            });
          }
        });
      });
    }

    return Array.from(matchMap.values()).sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  }, [leagueMatches, cupBracketData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="font-medium text-sm">در حال بارگذاری مرکز مدیریت مسابقات و تورنمنت‌ها...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Hub Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/20 p-6 shadow-2xl shadow-indigo-950/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400">
                <Trophy className="w-7 h-7" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                مرکز برگزاری و مدیریت لیگ و جام حذفی
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  سیستم خودکار داوری و سینک مربیان
                </span>
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                برنامه‌ریزی مسابقات، کنترل مهلت ارسال ترکیب، درخت براکت حذفی و تقویم یکپارچه
              </p>
            </div>
          </div>

          {/* Action Hub Tabs */}
          <div className="flex items-center bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 self-start md:self-auto">
            <button
              onClick={() => setHubTab('league')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                hubTab === 'league'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              مدیریت و برنامه‌ریزی لیگ
            </button>

            <button
              onClick={() => setHubTab('cup')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                hubTab === 'cup'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4" />
              جام حذفی و براکت
            </button>

            <button
              onClick={() => setHubTab('sync')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                hubTab === 'sync'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              تقویم تلفیقی و سینک
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: LEAGUE MANAGEMENT */}
      {hubTab === 'league' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block mb-1">تیم‌های فعال در لیگ</span>
                <span className="text-2xl font-black text-emerald-400">
                  {activeTeams.length} <span className="text-xs font-normal text-gray-400">از {teams.length}</span>
                </span>
              </div>
              <Users className="w-8 h-8 text-blue-400/50" />
            </div>

            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block mb-1">هفته فعال فعلی</span>
                <span className="text-2xl font-black text-emerald-400">{gameweekStatus?.active_gameweek || 'هفته ۱'}</span>
              </div>
              <Clock className="w-8 h-8 text-emerald-400/50" />
            </div>

            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block mb-1">مسابقات لیگ</span>
                <span className="text-2xl font-black text-indigo-400">{leagueMatches.length}</span>
              </div>
              <Calendar className="w-8 h-8 text-indigo-400/50" />
            </div>

            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block mb-1">بازی‌های انجام‌شده</span>
                <span className="text-2xl font-black text-amber-400">
                  {leagueMatches.filter((m) => m.status === 'FINISHED').length}
                </span>
              </div>
              <CheckCircle2 className="w-8 h-8 text-amber-400/50" />
            </div>
          </div>

          {/* League Generator Card */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <Sliders className="w-6 h-6 text-indigo-400" />
                <div>
                  <h2 className="text-lg font-bold text-white">تنظیمات و تولید هوشمند برنامه مسابقات لیگ</h2>
                  <p className="text-xs text-gray-400">تولید خودکار جدول رفت و برگشت با اختصاص اسلات‌های زمانی بدون تداخل</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleResetLeague}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-500/50 shadow-lg shadow-rose-950/30 transition-all disabled:opacity-50"
                  title="حذف کامل تمام مسابقات لیگ و بازگردانی سیستم به حالت اولیه و خام"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  پاک‌سازی و ریست مسابقات لیگ
                </button>

                <button
                  type="button"
                  onClick={handleGenerateLeague}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                  تولید و ثبت برنامه مسابقات
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">نام تورنمنت لیگ</label>
                <input
                  type="text"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">تاریخ شروع مسابقات (میلادی)</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">فاصله بین هر هفته (روز)</label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={daysBetweenRounds}
                  onChange={(e) => setDaysBetweenRounds(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">فرمت برگزاری</label>
                <select
                  value={isDoubleRoundRobin ? 'double' : 'single'}
                  onChange={(e) => setIsDoubleRoundRobin(e.target.value === 'double')}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="double">رفت و برگشت (۳۰ هفته - ۲۴۰ مسابقه)</option>
                  <option value="single">تک‌بازی (۱۵ هفته - ۱۲۰ مسابقه)</option>
                </select>
              </div>
            </div>

            {/* Cup Day Reservation Switch & Config */}
            <div className="p-4 bg-slate-950/90 border border-amber-500/30 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      رزرو خودکار روز مسابقات جام حذفی پس از هر دوره لیگ
                      <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-sport font-black">
                        پیش‌فرض فعال
                      </span>
                    </span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      هر <strong>{cupIntervalGameweeks} هفته</strong> لیگ روزانه برگزار شده، سپس <strong>۱ روز برای مرحله حذفی</strong> خالی می‌ماند و روز بعد هفته بعدی لیگ آغاز می‌شود (از هر روز شروع شود، این الگو منظم تکرار می‌شود).
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 self-end sm:self-auto">
                  <input
                    type="checkbox"
                    checked={reserveCupDays}
                    onChange={(e) => setReserveCupDays(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {reserveCupDays && (
                <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                  <label className="text-xs text-gray-300 font-semibold shrink-0">
                    فاصله برگزاری مراحل جام حذفی (هر چند هفته لیگ، ۱ روز بازی حذفی؟):
                  </label>
                  <select
                    value={cupIntervalGameweeks}
                    onChange={(e) => setCupIntervalGameweeks(Number(e.target.value))}
                    className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="4">هر ۴ هفته لیگ (۱ روز مسابقه حذفی، سپس شروع هفته ۵)</option>
                    <option value="5">هر ۵ هفته لیگ (۱ روز مسابقه حذفی، سپس شروع هفته ۶)</option>
                    <option value="6">هر ۶ هفته لیگ (۱ روز مسابقه حذفی، سپس شروع هفته ۷ - استاندارد)</option>
                    <option value="7">هر ۷ هفته لیگ (۱ روز مسابقه حذفی، سپس شروع هفته ۸)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Dedicated Interactive Daily Time Slots Configurator */}
            <div className="bg-slate-950/80 border border-indigo-500/20 rounded-2xl p-4 sm:p-5 space-y-4 shadow-inner">
              {/* Header & Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      اسلات‌های زمانی روزانه مسابقات (ساعت‌های برگزاری بدون تداخل)
                      <span className="text-[11px] font-normal text-indigo-300 bg-indigo-950/70 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                        {timeSlots.length} اسلات فعال
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      هر مسابقه در روز به ترتیب در یکی از این ساعت‌ها برگزار می‌شود بدون اینکه همپوشانی زمانی رخ دهد
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsTimeSlotEditorOpen(!isTimeSlotEditorOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {isTimeSlotEditorOpen ? 'بستن پنل تنظیمات' : 'تنظیم و ویرایش اسلات‌ها'}
                    {isTimeSlotEditorOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Active Slots Visual Timeline / Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="font-medium">ترتیب ساعات مسابقات در طول روز:</span>
                  <span className="text-[11px] text-gray-400">
                    {activeTeams.length > 0
                      ? `نیاز روزانه برای ${activeTeams.length} تیم فعال: ${Math.floor(activeTeams.length / 2)} مسابقه ${
                          timeSlots.length >= Math.floor(activeTeams.length / 2)
                            ? '✅ (پوشش کامل)'
                            : '⚠️ (تکرار اسلات‌ها)'
                        }`
                      : `${timeSlots.length} بازی در روز`}
                  </span>
                </div>

                {timeSlots.length === 0 ? (
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-red-500/20 text-center text-xs text-red-300">
                    هیچ اسلات زمانی تعریف نشده است! لطفاً حداقل یک ساعت برگزاری مسابقه اضافه کنید یا از دکمه بازنشانی استفاده نمایید.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {timeSlots.map((slot, i) => {
                      // Calculate gap to next slot if available
                      let gapText = null;
                      if (i < timeSlots.length - 1) {
                        const [h1, m1] = slot.split(':').map(Number);
                        const [h2, m2] = timeSlots[i + 1].split(':').map(Number);
                        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                        if (diff < 0) diff += 24 * 60;
                        if (diff > 0) gapText = `${diff} دقیقه`;
                      }

                      return (
                        <div
                          key={i}
                          className="group relative flex items-center bg-slate-900 border border-indigo-500/30 hover:border-indigo-400 rounded-xl p-1.5 pl-2.5 transition-all shadow-sm hover:shadow-md hover:shadow-indigo-950/40"
                        >
                          <span className="text-[10px] font-black text-indigo-400 bg-indigo-950/80 px-1.5 py-0.5 rounded-md ml-1.5 border border-indigo-500/20">
                            #{i + 1}
                          </span>
                          <span className="text-xs font-mono font-bold text-white flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-400" />
                            {slot}
                          </span>
                          {gapText && (
                            <span className="text-[9px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.2 rounded mr-1.5">
                              +{gapText}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(i)}
                            className="mr-2 text-gray-500 hover:text-red-400 transition-colors p-0.5 rounded-full hover:bg-red-500/10"
                            title="حذف این اسلات زمانی"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Collapsible Editor Subpanel */}
              <AnimatePresence>
                {isTimeSlotEditorOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-4 pt-3 border-t border-white/5"
                  >
                    {/* Sub-tabs */}
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <button
                        type="button"
                        onClick={() => setActiveSlotConfigTab('auto')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          activeSlotConfigTab === 'auto'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-900 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        تولید خودکار زنجیره بدون تداخل (پیشنهادی)
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSlotConfigTab('manual')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          activeSlotConfigTab === 'manual'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-900 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        افزودن دستی ساعت
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSlotConfigTab('presets')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          activeSlotConfigTab === 'presets'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-900 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        قالب‌های آماده مسابقات
                      </button>
                    </div>

                    {/* TAB 1: Auto Sequential Generator */}
                    {activeSlotConfigTab === 'auto' && (
                      <div className="p-4 bg-slate-900/90 border border-indigo-500/20 rounded-2xl space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-300 block mb-1">ساعت شروع اولین بازی</label>
                            <input
                              type="time"
                              value={autoStartHour}
                              onChange={(e) => setAutoStartHour(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-300 block mb-1">
                              مدت هر بازی + وقفه (دقیقه)
                            </label>
                            <div className="flex gap-1.5 items-center">
                              <input
                                type="number"
                                min="10"
                                max="180"
                                value={autoMatchDuration}
                                onChange={(e) => setAutoMatchDuration(e.target.value)}
                                className="w-20 bg-slate-950 border border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono text-white text-center focus:outline-none focus:border-indigo-500"
                              />
                              <div className="flex gap-1 flex-1">
                                {[40, 45, 50, 60].map((m) => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => setAutoMatchDuration(m)}
                                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex-1 transition-all ${
                                      parseInt(autoMatchDuration, 10) === m
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-950 text-gray-400 hover:text-white border border-white/5'
                                    }`}
                                  >
                                    {m}د
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-300 block mb-1">
                              تعداد مسابقات روزانه
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={autoSlotsCount}
                              onChange={(e) => setAutoSlotsCount(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-gray-400">
                            فرمول: بازی اول در {autoStartHour || '18:00'} و هر {autoMatchDuration} دقیقه مسابقه بعدی شروع خواهد شد.
                          </span>

                          <button
                            type="button"
                            onClick={handleGenerateSequentialSlots}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 shadow-md shadow-indigo-600/30 transition-all"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                            محاسبه و تولید خودکار زنجیره بدون تداخل
                          </button>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: Manual Add */}
                    {activeSlotConfigTab === 'manual' && (
                      <div className="p-4 bg-slate-900/90 border border-indigo-500/20 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex-1 w-full">
                          <label className="text-xs font-semibold text-gray-300 block mb-1">انتخاب ساعت برگزاری بازی</label>
                          <input
                            type="time"
                            value={newSlotInput}
                            onChange={(e) => setNewSlotInput(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="w-full sm:w-auto self-end">
                          <button
                            type="button"
                            onClick={() => handleAddSlot(newSlotInput)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all"
                          >
                            <Plus className="w-4 h-4" />
                            افزودن به لیست اسلات‌ها
                          </button>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: Presets */}
                    {activeSlotConfigTab === 'presets' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {TIME_SLOT_PRESET_TEMPLATES.map((preset) => (
                          <div
                            key={preset.id}
                            className="p-3 bg-slate-900/90 border border-white/10 hover:border-indigo-500/40 rounded-2xl space-y-2 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-white">{preset.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                                  {preset.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400 mb-2">{preset.desc}</p>
                              <div className="flex flex-wrap gap-1">
                                {preset.slots.map((s, idx) => (
                                  <span key={idx} className="text-[10px] font-mono bg-slate-950 px-1.5 py-0.5 rounded text-gray-300 border border-white/5">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleApplyPreset(preset.slots, preset.name)}
                              className="mt-2 w-full py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold border border-indigo-500/30 transition-all flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              اعمال این قالب
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bottom Quick Tools */}
                    <div className="flex items-center justify-between pt-1 text-xs text-gray-400">
                      <button
                        type="button"
                        onClick={handleResetSlots}
                        className="flex items-center gap-1.5 text-gray-400 hover:text-indigo-400 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        بازنشانی به اسلات‌های پیش‌فرض
                      </button>

                      <button
                        type="button"
                        onClick={handleClearAllSlots}
                        className="flex items-center gap-1.5 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        پاک‌سازی اسلات‌ها
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Gameweek Selector & Control Center */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  مدیریت هفته‌ها و کنترل وضعیت بازی‌ها
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  انتخاب هفته، قفل تاکتیک، ارسال نوتیفیکیشن مربیان و ویرایش زمان مسابقات
                </p>
              </div>

              {/* Gameweek Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleGameweekAction('LOCK_TACTICS')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-300 transition-all"
                  title="قفل کردن ثبت ترکیب توسط مربیان برای مسابقات این هفته"
                >
                  <Lock className="w-3.5 h-3.5" />
                  قفل مهلت ترکیب
                </button>

                <button
                  onClick={() => handleGameweekAction('UNLOCK_TACTICS')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-xs font-bold text-blue-300 transition-all"
                  title="باز کردن مجدد ارسال ترکیب"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  باز کردن ترکیب
                </button>

                <button
                  onClick={() => handleGameweekAction('NOTIFY_COACHES')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-xs font-bold text-purple-300 transition-all"
                  title="ارسال اعلان به مربیان تیم‌های این هفته"
                >
                  <Bell className="w-3.5 h-3.5" />
                  ارسال پیامک/اعلان مربیان
                </button>

                <button
                  onClick={() => handleGameweekAction('AUTO_FORFEIT_UNSUBMITTED')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-xs font-bold text-red-300 transition-all"
                  title="اعمال باخت فنی ۳-۰ به تیم‌هایی که تا شروع بازی ترکیب نداده‌اند"
                >
                  <Zap className="w-3.5 h-3.5" />
                  باخت فنی تیم‌های بدون ترکیب
                </button>
              </div>
            </div>

            {/* Gameweek Tabs Carousel */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {(gameweekStatus?.gameweeks || []).map((gw) => {
                const isSelected = gw.round_name === selectedGameweek;
                const isFinished = gw.is_finished;
                return (
                  <button
                    key={gw.round_name}
                    onClick={() => setSelectedGameweek(gw.round_name)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 scale-105'
                        : isFinished
                        ? 'bg-slate-950 border-white/5 text-gray-500 hover:text-gray-300'
                        : 'bg-slate-950/80 border-white/10 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    <span>{gw.round_name}</span>
                    <span className="text-[10px] opacity-75">
                      {isFinished ? 'پایان‌یافته' : `${gw.finished_matches || 0}/${gw.total_matches || 0}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Current Gameweek Matches List */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-300 flex items-center justify-between">
                <span>مسابقات {selectedGameweek} ({currentGameweekMatches.length} مسابقه):</span>
              </h4>

              {currentGameweekMatches.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-slate-950/50 rounded-2xl border border-white/5">
                  هیچ مسابقه‌ای برای این هفته یافت نشد. لطفاً از دکمه «تولید و ثبت برنامه مسابقات» استفاده کنید.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentGameweekMatches.map((match) => {
                    const isEditing = editingMatchId === match.id;
                    const isFinished = match.status === 'FINISHED';
                    const isLive = match.status === 'LIVE';

                    return (
                      <div
                        key={match.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isLive
                            ? 'bg-red-950/20 border-red-500/50 shadow-lg shadow-red-950/30'
                            : isFinished
                            ? 'bg-slate-950/60 border-white/5'
                            : 'bg-slate-950/90 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
                          <span className="font-mono flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            {match.date ? new Date(match.date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : 'زمان نامشخص'}
                            {' - '}
                            {match.date ? new Date(match.date).toLocaleDateString('fa-IR') : ''}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isLive
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                                : isFinished
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-gray-300'
                            }`}
                          >
                            {isLive ? '🔴 در حال برگزاری' : isFinished ? 'پایان‌یافته' : 'برنامه‌ریزی‌شده'}
                          </span>
                        </div>

                        {/* Match Teams Row */}
                        <div className="flex items-center justify-between py-2 border-y border-white/5">
                          {/* Home Team */}
                          <div className="flex items-center gap-2 flex-1">
                            <img
                              src={getTeamLogoUrl(match.home_team_name, match.home_team_logo)}
                              alt={match.home_team_name}
                              className="w-7 h-7 object-contain"
                            />
                            <span className="text-sm font-bold text-white truncate">{match.home_team_name}</span>
                          </div>

                          {/* Score / VS */}
                          <div className="px-3 py-1 bg-slate-900 rounded-xl font-mono font-black text-sm text-white">
                            {isFinished || isLive ? `${match.home_score} - ${match.away_score}` : 'VS'}
                          </div>

                          {/* Away Team */}
                          <div className="flex items-center justify-end gap-2 flex-1">
                            <span className="text-sm font-bold text-white truncate">{match.away_team_name}</span>
                            <img
                              src={getTeamLogoUrl(match.away_team_name, match.away_team_logo)}
                              alt={match.away_team_name}
                              className="w-7 h-7 object-contain"
                            />
                          </div>
                        </div>

                        {/* Match Actions */}
                        <div className="mt-3 flex items-center justify-between gap-2 pt-1 text-xs">
                          {isEditing ? (
                            <div className="w-full space-y-2 bg-slate-900 p-2.5 rounded-xl border border-indigo-500/30">
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="datetime-local"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                                />
                                <select
                                  value={editStatus}
                                  onChange={(e) => setEditStatus(e.target.value)}
                                  className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                                >
                                  <option value="SCHEDULED">برنامه‌ریزی شده</option>
                                  <option value="LIVE">در حال برگزاری</option>
                                  <option value="FINISHED">پایان یافته</option>
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveMatchEdit(match.id)}
                                  className="flex-1 py-1 bg-emerald-600 rounded-lg text-white font-bold text-[11px]"
                                >
                                  ذخیره
                                </button>
                                <button
                                  onClick={() => setEditingMatchId(null)}
                                  className="px-3 py-1 bg-slate-800 rounded-lg text-gray-300 text-[11px]"
                                >
                                  لغو
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 flex-wrap">
                                {onOpenRefereeRoom && (
                                  <button
                                    onClick={() => onOpenRefereeRoom(match)}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-[11px] shadow-md shadow-cyan-600/30 transition-all cursor-pointer font-sport active:scale-95"
                                    title="ورود مستقیم به اتاق داوری و کنترل زنده این مسابقه"
                                  >
                                    <span>⚖️</span>
                                    <span>ورود به اتاق داوری</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setEditingMatchId(match.id);
                                    setEditDate(match.date ? match.date.substring(0, 16) : '');
                                    setEditStatus(match.status || 'SCHEDULED');
                                  }}
                                  className="text-gray-300 hover:text-indigo-300 font-medium text-[11px] px-2 py-1 bg-slate-900/90 rounded-xl border border-white/10 transition-all hover:border-indigo-500/40"
                                >
                                  ✏️ ویرایش ساعت/وضعیت
                                </button>
                              </div>

                              {!isFinished && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleForfeit(match.id, 'away')}
                                    className="px-2 py-0.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/50 text-[10px] font-bold"
                                    title="ثبت باخت فنی ۳-۰ به نفع میزبان"
                                  >
                                    باخت فنی میهمان (۳-۰)
                                  </button>
                                  <button
                                    onClick={() => handleForfeit(match.id, 'home')}
                                    className="px-2 py-0.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/50 text-[10px] font-bold"
                                    title="ثبت باخت فنی ۳-۰ به نفع میهمان"
                                  >
                                    باخت فنی میزبان (۰-۳)
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KNOCKOUT CUP & BRACKET */}
      {hubTab === 'cup' && (
        <div className="space-y-6">
          {/* Create Cup Form Card */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-amber-400" />
                <div>
                  <h2 className="text-lg font-bold text-white">برگزاری و ایجاد جام حذفی جدید (Knockout Cup)</h2>
                  <p className="text-xs text-gray-400">قرعه‌کشی خودکار، ساخت درخت براکت و تعیین زمان‌بندی مراحل</p>
                </div>
              </div>

              {/* Reset / Purge Cup Button */}
              <button
                type="button"
                onClick={handleResetCup}
                disabled={actionLoading || cupsList.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-300 bg-red-950/50 hover:bg-red-900/60 border border-red-500/40 transition-all shadow-md shadow-red-950/50 active:scale-95 disabled:opacity-40"
                title="حذف کامل تمام مسابقات جام حذفی و بازنشانی به سیستم خام"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>پاکسازی و ریست مسابقات جام حذفی</span>
              </button>
            </div>

            <form onSubmit={handleCreateCup} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">نام جام حذفی</label>
                <input
                  type="text"
                  value={newCupName}
                  onChange={(e) => setNewCupName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">تاریخ شروع مرحله اول</label>
                <input
                  type="date"
                  value={newCupStartDate}
                  onChange={(e) => setNewCupStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">فاصله بین مراحل (روز)</label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={newCupDaysBetween}
                  onChange={(e) => setNewCupDaysBetween(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  ایجاد و قرعه‌کشی جام حذفی
                </button>
              </div>
            </form>
          </div>

          {/* Active Cup Tournaments Picker */}
          {cupsList.length > 0 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              <span className="text-xs font-bold text-gray-400 flex-shrink-0">جام‌های حذفی موجود:</span>
              {cupsList.map((cup) => (
                <div
                  key={cup.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedCupId === cup.id
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <button onClick={() => setSelectedCupId(cup.id)} className="flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" />
                    {cup.name}
                  </button>
                  <button
                    onClick={() => handleDeleteCup(cup.id)}
                    className="text-gray-500 hover:text-red-400 ml-1"
                    title="حذف این جام حذفی"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Interactive Knockout Bracket Display */}
          {cupBracketData?.rounds && cupBracketData.rounds.length > 0 ? (
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6 overflow-x-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    درخت براکت حذفی: {cupBracketData.tournament?.name}
                  </h3>
                  <p className="text-xs text-gray-400">مسیر پیشروی تیم‌ها از مرحله اول تا فینال و کسب جام قهرمانی</p>
                </div>
              </div>

              {/* Bracket Columns */}
              <div className="flex items-start gap-8 min-w-[800px] py-4">
                {cupBracketData.rounds.map((rnd, rIndex) => (
                  <div key={rnd.name} className="flex-1 flex flex-col items-center space-y-4">
                    {/* Round Header */}
                    <div className="w-full text-center py-2 px-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl">
                      <span className="text-xs font-black text-amber-300 block">{rnd.name}</span>
                      <span className="text-[10px] text-gray-400">{rnd.matches?.length || 0} مسابقه</span>
                    </div>

                    {/* Round Matches */}
                    <div className="w-full space-y-4 flex flex-col justify-around h-full">
                      {(rnd.matches || []).map((m) => {
                        const isFinished = m.status === 'FINISHED';
                        const hasWinner = isFinished && (m.home_score !== m.away_score || m.home_penalties !== m.away_penalties);

                        return (
                          <div
                            key={m.id}
                            className={`w-full p-3 bg-slate-950/90 rounded-2xl border transition-all shadow-md ${
                              isFinished ? 'border-amber-500/30 bg-slate-950/60' : 'border-white/10'
                            }`}
                          >
                            <div className="text-[10px] text-gray-400 mb-1.5 flex items-center justify-between">
                              <span>مسابقه #{m.id}</span>
                              <span className="font-mono">
                                {m.date ? new Date(m.date).toLocaleDateString('fa-IR') : 'زمان تعیین‌نشده'}
                              </span>
                            </div>

                            {/* Home Team */}
                            <div className="flex items-center justify-between py-1">
                              <div className="flex items-center gap-1.5 truncate">
                                {m.home_team_logo && (
                                  <img src={getTeamLogoUrl(m.home_team_name, m.home_team_logo)} alt="" className="w-4 h-4 object-contain" />
                                )}
                                <span className={`text-xs font-bold truncate ${m.home_score > m.away_score ? 'text-amber-300' : 'text-gray-300'}`}>
                                  {m.home_team_name || 'در انتظار برنده...'}
                                </span>
                              </div>
                              <span className="font-mono text-xs font-bold text-white px-1.5">{isFinished ? m.home_score : '-'}</span>
                            </div>

                            {/* Away Team */}
                            <div className="flex items-center justify-between py-1 border-t border-white/5">
                              <div className="flex items-center gap-1.5 truncate">
                                {m.away_team_logo && (
                                  <img src={getTeamLogoUrl(m.away_team_name, m.away_team_logo)} alt="" className="w-4 h-4 object-contain" />
                                )}
                                <span className={`text-xs font-bold truncate ${m.away_score > m.home_score ? 'text-amber-300' : 'text-gray-300'}`}>
                                  {m.away_team_name || 'در انتظار برنده...'}
                                </span>
                              </div>
                              <span className="font-mono text-xs font-bold text-white px-1.5">{isFinished ? m.away_score : '-'}</span>
                            </div>

                            {/* Advance Winner Action */}
                            {isFinished && !m.next_match_id && rIndex === cupBracketData.rounds.length - 1 ? (
                              <div className="mt-2 text-center text-[11px] font-black text-amber-400 bg-amber-500/10 py-1 rounded-lg border border-amber-500/20">
                                🏆 قهرمان جام: {m.home_score > m.away_score ? m.home_team_name : m.away_team_name}
                              </div>
                            ) : isFinished && m.next_match_id ? (
                              <button
                                onClick={() => handleAdvanceWinner(m.id)}
                                className="w-full mt-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-all"
                              >
                                صعود برنده به مرحله بعد ➔
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 bg-slate-900/60 rounded-3xl border border-white/10">
              هنوز هیچ تورنمنت جام حذفی فعالی ایجاد نشده است. از فرم بالا برای ایجاد اولین جام حذفی استفاده نمایید.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMBINED SYNC CALENDAR */}
      {hubTab === 'sync' && (
        <div className="space-y-6">
          {/* Sync Controller Box */}
          <div className="bg-slate-900/90 border border-emerald-500/20 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
                  <ArrowLeftRight className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">موتور سینک و تلفیق هوشمند جام حذفی با لیگ</h2>
                  <p className="text-xs text-gray-400">جاگذاری مراحل جام حذفی در میان هفته‌های لیگ بدون تداخل زمانی</p>
                </div>
              </div>

              <button
                onClick={handleSyncCalendar}
                disabled={actionLoading || !selectedCupId}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                اجرای سینک و ادغام تقویم مسابقات
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">انتخاب جام حذفی برای سینک با لیگ</label>
                <select
                  value={selectedCupId || ''}
                  onChange={(e) => setSelectedCupId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- انتخاب جام حذفی --</option>
                  {cupsList.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">فاصله زمانی جاگذاری (هر چند هفته لیگ، یک مرحله حذفی؟)</label>
                <select
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="2">هر ۲ هفته لیگ (فشرده)</option>
                  <option value="3">هر ۳ هفته لیگ</option>
                  <option value="4">هر ۴ هفته لیگ (استاندارد)</option>
                  <option value="5">هر ۵ هفته لیگ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Unified Master Timeline Calendar */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              گاه‌شمار یکپارچه فصل (تقویم کلی مسابقات لیگ + جام حذفی)
            </h3>

            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
              {combinedCalendar.map((m) => {
                const isCup = m.is_cup || m.is_knockout;
                const isFinished = m.status === 'FINISHED';

                return (
                  <div key={`${isCup ? 'cup' : 'league'}-${m.id}`} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${
                          isCup
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {isCup ? '🏆 جام حذفی' : '⚽ لیگ'}
                      </span>

                      <div>
                        <span className="text-xs font-bold text-white block">
                          {m.home_team_name || 'TBD'} vs {m.away_team_name || 'TBD'}
                        </span>
                        <span className="text-[11px] text-gray-400">{m.round_name}</span>
                      </div>
                    </div>

                    <div className="text-left font-mono text-xs">
                      <span className="text-gray-300 block">
                        {m.date ? new Date(m.date).toLocaleDateString('fa-IR') : 'تعیین‌نشده'}
                      </span>
                      <span className="text-gray-500 text-[10px]">
                        {m.date ? new Date(m.date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
