import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Crown,
  TrendingUp,
  Users,
  Megaphone,
  Radio,
  CheckCircle2,
  AlertCircle,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { matchApi, notificationApi, seasonPassApi, newsApi } from '../../services/api';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import { useLanguage } from '../../context/LanguageContext';
import TransferCountdownBanner from '../common/TransferCountdownBanner';
import NewsArticleModal from '../news/NewsArticleModal';

function formatMatchDisplayDate(dateString, isFa = true) {
  if (!dateString) {
    return isFa
      ? { dateStr: 'شنبه، ۲۹ شهریور', timeStr: '۲۲:۰۰' }
      : { dateStr: 'Sat, Sep 20', timeStr: '22:00' };
  }
  try {
    const d = new Date(dateString);
    if (isFa) {
      return {
        dateStr: d.toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran', weekday: 'short', month: 'long', day: 'numeric' }),
        timeStr: d.toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hour12: false }),
      };
    }
    return {
      dateStr: d.toLocaleDateString('en-US', { timeZone: 'Asia/Tehran', weekday: 'short', month: 'short', day: 'numeric' }),
      timeStr: d.toLocaleTimeString('en-US', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hour12: false }),
    };
  } catch {
    return { dateStr: String(dateString), timeStr: '' };
  }
}

export default function HomeTab({ onNavigateTab, isLineupSubmitted = false, teamData }) {
  const { t, lang, isRtl } = useLanguage();

  // Next Match & Live Context
  const [nextMatch, setNextMatch] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  // Selected news modal
  const [selectedNews, setSelectedNews] = useState(null);
  const [realNews, setRealNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoadingNews(true);
    newsApi.getNews({ page_size: 4 })
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res?.data) ? res.data : (res?.data?.results || []);
        setRealNews(list || []);
      })
      .catch((err) => {
        console.error('Failed to load news for home tab:', err);
        if (isMounted) setRealNews([]);
      })
      .finally(() => {
        if (isMounted) setLoadingNews(false);
      });
    return () => { isMounted = false; };
  }, []);

  const handleReact = async (newsId, reactionType) => {
    try {
      const res = await newsApi.reactNews(newsId, reactionType);
      if (res?.data) {
        setRealNews((prev) =>
          prev.map((n) => (n.id === newsId ? { ...n, reactions_count: res.data.reactions_count, user_reaction: res.data.user_reaction } : n))
        );
        if (selectedNews?.id === newsId) {
          setSelectedNews((prev) => ({
            ...prev,
            reactions_count: res.data.reactions_count,
            user_reaction: res.data.user_reaction,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to react in home:', err);
    }
  };

  const teamId = teamData?.id;
  const teamName = teamData?.name || (lang === 'fa' ? 'تیم شما' : 'Your Team');

  // Match-Scoped Lineup Check
  const isLineupSubmittedActual = useMemo(() => {
    if (!nextMatch) return true;
    if (nextMatch.is_lineup_submitted !== undefined) {
      return Boolean(nextMatch.is_lineup_submitted);
    }
    if (teamId) {
      if (nextMatch.home_team === teamId) return Boolean(nextMatch.home_lineup_ready);
      if (nextMatch.away_team === teamId) return Boolean(nextMatch.away_lineup_ready);
    }
    return Boolean(isLineupSubmitted);
  }, [nextMatch, teamId, isLineupSubmitted]);

  // Load Real Match Data from API
  useEffect(() => {
    let isMounted = true;
    async function loadHomeData() {
      setLoadingData(true);
      try {
        const liveRes = await matchApi.getLiveMatchContext(teamId).catch(() => ({ data: null }));
        if (isMounted && liveRes?.data) {
          const match = liveRes.data.team_next_match || liveRes.data.next_match;
          if (match) {
            setNextMatch(match);
            return;
          }
        }

        // Fallback: search matches list
        const matchesRes = await matchApi.getMatches().catch(() => ({ data: [] }));
        if (isMounted) {
          const matchesList = Array.isArray(matchesRes.data)
            ? matchesRes.data
            : matchesRes.data?.results || [];
          const upcoming = matchesList.find((m) => m.status === 'SCHEDULED' || m.status === 'TIMED');
          if (upcoming) {
            setNextMatch(upcoming);
          }
        }
      } catch (err) {
        console.error('Failed to load next match data:', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }
    loadHomeData();
    return () => { isMounted = false; };
  }, [teamId]);

  // Fallback demo match details matching the visual reference (Barcelona vs Real Madrid)
  const homeTeamName = nextMatch?.home_team_name || 'Barcelona';
  const awayTeamName = nextMatch?.away_team_name || 'Real Madrid';
  const homeLogo = nextMatch ? getTeamLogoUrl(nextMatch.home_team_name) : '/assets/logos/barcelona.webp';
  const awayLogo = nextMatch ? getTeamLogoUrl(nextMatch.away_team_name) : '/assets/logos/real-madrid.webp';
  const roundName = nextMatch?.round_name
    ? (lang === 'fa' ? String(nextMatch.round_name) : `Week ${String(nextMatch.round_name).replace(/[^0-9]/g, '') || '5'}`)
    : (lang === 'fa' ? 'هفته ۵' : 'Week 5');

  const { dateStr, timeStr } = formatMatchDisplayDate(nextMatch?.date, lang === 'fa');

  // Authentic real-time news items directly from VML Press & Newsroom
  const displayNews = useMemo(() => {
    if (!Array.isArray(realNews) || realNews.length === 0) {
      return [];
    }
    return realNews.slice(0, 4).map((item) => ({
      id: item.id,
      category: item.category,
      categoryLabel: item.category_display || (item.category === 'TRANSFER' ? t('tagTransfer') : item.category === 'MATCH' ? t('tagLeague') : t('tagTactics')),
      title: item.title,
      subtitle: item.subtitle,
      timeAgo: item.time_ago || (lang === 'fa' ? 'امروز' : 'Today'),
      image: item.image_url || '/images/vml_news_trophy.webp',
      summary: item.summary,
      content: item.content,
      is_breaking: Boolean(item.is_breaking),
      is_pinned: Boolean(item.is_pinned),
      reactions_count: item.reactions_count || {},
      user_reaction: item.user_reaction,
      raw: item,
    }));
  }, [realNews, lang, t]);

  const ArrowIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-5 pb-24 text-slate-100 max-w-md sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-1 sm:px-2">
      {/* Transfer Window Compact Bar */}
      <div
        className="cursor-pointer hover:opacity-95 transition-opacity"
        onClick={() => onNavigateTab?.('market')}
      >
        <TransferCountdownBanner compact={true} />
      </div>

      {/* ================================================================ */}
      {/* 1. HERO STADIUM BANNER (Matching Reference Image) */}
      {/* ================================================================ */}
      <div className="relative w-full rounded-3xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.85)] border border-amber-500/30 bg-slate-950">
        {/* Background Graphic */}
        <div className="relative w-full h-[230px] sm:h-[280px] md:h-[320px]">
          <img
            src="/images/vml_hero_banner.webp"
            alt="VML Hero Banner"
            className="w-full h-full object-cover object-center"
          />
          {/* Overlays for high legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060b17] via-transparent to-black/30" />
        </div>

        {/* Hero Text & CTA Content */}
        <div className="absolute inset-0 p-5 sm:p-7 flex flex-col justify-between z-10">
          <div className="space-y-1.5 max-w-[70%] sm:max-w-[60%]">
            <span className="inline-block text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-cyan-300 drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]">
              {t('heroTagline')}
            </span>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase leading-none tracking-tight">
              <span className="text-white block drop-shadow-md">{t('heroTitlePart1')}</span>
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent block drop-shadow-[0_2px_15px_rgba(245,158,11,0.6)]">
                {t('heroTitlePart2')}
              </span>
            </h1>

            <p className="text-[11px] sm:text-xs text-slate-300 font-medium pt-1">
              {t('heroSub')}
            </p>
          </div>

          {/* Golden Pill CTA Button */}
          <div>
            <button
              onClick={() => onNavigateTab?.('team')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-950/80 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border-2 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.8)] transition-all active:scale-95 cursor-pointer font-black text-xs sm:text-sm group backdrop-blur-md"
            >
              <span>{t('enterLeague')}</span>
              <ArrowIcon size={16} className="text-amber-400 group-hover:text-slate-950 transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 2. FIVE QUICK ACTION CARDS (Neon Grid matching reference) */}
      {/* ================================================================ */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {/* Card 1: My Team (Gold) */}
        <button
          onClick={() => onNavigateTab?.('team')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-amber-950/30 to-slate-950/80 border border-amber-500/40 hover:border-amber-400 shadow-md hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all active:scale-95 cursor-pointer group text-center"
        >
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <Crown size={22} className="fill-amber-400/20" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-white mt-2 leading-tight">
            {t('myTeam')}
          </span>
          <span className="text-[9px] sm:text-[10.5px] text-amber-400/80 truncate w-full mt-0.5">
            {t('myTeamSub')}
          </span>
        </button>

        {/* Card 2: Fixtures (Teal) */}
        <button
          onClick={() => onNavigateTab?.('league')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-teal-950/30 to-slate-950/80 border border-teal-500/40 hover:border-teal-400 shadow-md hover:shadow-[0_0_20px_rgba(20,184,166,0.25)] transition-all active:scale-95 cursor-pointer group text-center"
        >
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-teal-500/15 border border-teal-400/50 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(20,184,166,0.3)]">
            <Calendar size={22} />
          </div>
          <span className="text-xs sm:text-sm font-bold text-white mt-2 leading-tight">
            {t('fixtures')}
          </span>
          <span className="text-[9px] sm:text-[10.5px] text-teal-400/80 truncate w-full mt-0.5">
            {t('fixturesSub')}
          </span>
        </button>

        {/* Card 3: League (Purple) */}
        <button
          onClick={() => onNavigateTab?.('league')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-purple-950/30 to-slate-950/80 border border-purple-500/40 hover:border-purple-400 shadow-md hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] transition-all active:scale-95 cursor-pointer group text-center"
        >
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-purple-500/15 border border-purple-400/50 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Trophy size={22} />
          </div>
          <span className="text-xs sm:text-sm font-bold text-white mt-2 leading-tight">
            {t('league')}
          </span>
          <span className="text-[9px] sm:text-[10.5px] text-purple-400/80 truncate w-full mt-0.5">
            {t('leagueSub')}
          </span>
        </button>

        {/* Card 4: Market (Blue) */}
        <button
          onClick={() => onNavigateTab?.('market')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-blue-950/30 to-slate-950/80 border border-blue-500/40 hover:border-blue-400 shadow-md hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all active:scale-95 cursor-pointer group text-center"
        >
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-blue-500/15 border border-blue-400/50 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <TrendingUp size={22} />
          </div>
          <span className="text-xs sm:text-sm font-bold text-white mt-2 leading-tight">
            {t('market')}
          </span>
          <span className="text-[9px] sm:text-[10.5px] text-blue-400/80 truncate w-full mt-0.5">
            {t('marketSub')}
          </span>
        </button>

        {/* Card 5: Community (Pink) */}
        <button
          onClick={() => onNavigateTab?.('news_channel')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-pink-950/30 to-slate-950/80 border border-pink-500/40 hover:border-pink-400 shadow-md hover:shadow-[0_0_20px_rgba(244,63,94,0.25)] transition-all active:scale-95 cursor-pointer group text-center"
        >
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-pink-500/15 border border-pink-400/50 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(244,63,94,0.3)]">
            <Users size={22} />
          </div>
          <span className="text-xs sm:text-sm font-bold text-white mt-2 leading-tight">
            {t('community')}
          </span>
          <span className="text-[9px] sm:text-[10.5px] text-pink-400/80 truncate w-full mt-0.5">
            {t('communitySub')}
          </span>
        </button>
      </div>

      {/* ================================================================ */}
      {/* 3. NEXT MATCH SECTION (Matching Reference Image) */}
      {/* ================================================================ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-300">
            {t('nextMatch')}
          </h3>
          <button
            onClick={() => onNavigateTab?.('league')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{t('viewAll')}</span>
            <ArrowIcon size={14} />
          </button>
        </div>

        {/* Match Card with Stadium Backdrop */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-700/80 bg-[#070c18] shadow-2xl p-4 sm:p-6">
          {/* Subtle arena background pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/30 via-slate-950/70 to-purple-950/30 pointer-events-none" />
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-6">
            {/* Home Team */}
            <div className="flex-1 flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900/90 border border-slate-700/80 p-2 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <img
                  src={homeLogo}
                  alt={homeTeamName}
                  className="w-full h-full object-contain drop-shadow-md"
                  onError={(e) => { e.currentTarget.src = '/assets/logos/barcelona.webp'; }}
                />
              </div>
              <span className="text-xs sm:text-sm font-black text-white line-clamp-1 max-w-[110px]">
                {homeTeamName}
              </span>
            </div>

            {/* Match Status & Timing Center */}
            <div className="flex flex-col items-center justify-center text-center px-2 space-y-1">
              <span className="text-xl sm:text-3xl font-black text-cyan-300 italic tracking-wider drop-shadow-[0_0_12px_rgba(0,243,255,0.6)]">
                {t('vs')}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold">
                {roundName}
              </span>
              <div className="flex items-center gap-1 bg-black/50 px-2.5 py-1 rounded-full border border-slate-700 text-[10px] sm:text-[11px] text-slate-300 whitespace-nowrap">
                <Clock size={11} className="text-amber-400 shrink-0" />
                <span>{dateStr} • {timeStr}</span>
              </div>
            </div>

            {/* Away Team */}
            <div className="flex-1 flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900/90 border border-slate-700/80 p-2 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <img
                  src={awayLogo}
                  alt={awayTeamName}
                  className="w-full h-full object-contain drop-shadow-md"
                  onError={(e) => { e.currentTarget.src = '/assets/logos/real-madrid.webp'; }}
                />
              </div>
              <span className="text-xs sm:text-sm font-black text-white line-clamp-1 max-w-[110px]">
                {awayTeamName}
              </span>
            </div>
          </div>

          {/* Quick Lineup Action Pill inside Match Card */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {isLineupSubmittedActual ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                  <CheckCircle2 size={14} />
                  <span>{t('lineupReady')}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 font-bold text-[11px] animate-pulse">
                  <AlertCircle size={14} />
                  <span>{lang === 'fa' ? 'ترکیب هنوز تایید نشده' : 'Lineup pending'}</span>
                </span>
              )}
            </div>

            <button
              onClick={() => onNavigateTab?.('team')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {t('submitLineup')}
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 4. LATEST NEWS SECTION (Carousel / Cards matching reference) */}
      {/* ================================================================ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Megaphone size={16} className="text-amber-400" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200">
              {t('latestNews')}
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab?.('news_channel')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{t('viewAll')}</span>
            <ArrowIcon size={14} />
          </button>
        </div>

        {/* Real News Cards / Skeleton / Empty State */}
        {loadingNews ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-slate-900/60 border border-slate-800 p-3 animate-pulse space-y-3">
                <div className="w-full h-32 bg-slate-800/60 rounded-xl" />
                <div className="h-4 bg-slate-800/80 rounded w-3/4" />
                <div className="h-3 bg-slate-800/50 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : displayNews.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-[#0a1226] to-slate-950 border border-slate-800/80 p-5 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Megaphone size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-white text-sm">
                {lang === 'fa' ? 'اتاق خبر و مطبوعات رسمی VML' : 'VML Official Newsroom'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {lang === 'fa'
                  ? 'تمام رویدادهای زنده، مصاحبه‌ها، نقل‌وانتقالات و نتایج بازی‌ها در چنل مطبوعات مخابره می‌شوند.'
                  : 'Live match reports, transfer bombs, and disciplinary updates are broadcasted in the press channel.'}
              </p>
            </div>
            <button
              onClick={() => onNavigateTab?.('news_channel')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all active:scale-95 shadow-md cursor-pointer"
            >
              <span>{lang === 'fa' ? 'ورود به چنل مطبوعات' : 'Enter News Channel'}</span>
              <ArrowIcon size={14} />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(displayNews || []).map((news) => (
              <div
                key={news.id}
                onClick={() => setSelectedNews(news.raw || news)}
                className="group relative rounded-2xl overflow-hidden bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 shadow-lg cursor-pointer transition-all active:scale-[0.98] flex flex-col"
              >
                {/* News Thumbnail */}
                <div className="relative w-full h-36 sm:h-32 bg-slate-950 overflow-hidden">
                  <img
                    src={news.image || news.image_url || '/images/vml_news_trophy.webp'}
                    alt={news.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.currentTarget.src = '/images/vml_news_trophy.webp'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30" />
                  
                  {/* Category Badge */}
                  <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-md bg-amber-500 text-slate-950">
                    {news.categoryLabel || news.category_display || news.category}
                  </span>

                  {news.is_pinned && (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-500/90 text-slate-950 shadow">
                      📌 {lang === 'fa' ? 'سنجاق' : 'PINNED'}
                    </span>
                  )}

                  {news.is_breaking && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[9px] font-black bg-rose-600 text-white animate-pulse">
                      🔥 {lang === 'fa' ? 'فوری' : 'BREAKING'}
                    </span>
                  )}
                </div>

                {/* News Content */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-tight">
                    {news.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="text-amber-400" />
                      {news.timeAgo || news.time_ago}
                    </span>
                    <span className="text-cyan-400 group-hover:underline font-bold">
                      {t('readMore')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive News Reading Modal with Reactions & Real Data */}
      <NewsArticleModal
        isOpen={Boolean(selectedNews)}
        onClose={() => setSelectedNews(null)}
        article={selectedNews?.raw || selectedNews}
        onReact={handleReact}
      />
    </div>
  );
}
