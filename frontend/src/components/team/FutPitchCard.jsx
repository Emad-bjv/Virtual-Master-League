import React from 'react';
import { motion } from 'framer-motion';
import { User, Plus, AlertTriangle } from 'lucide-react';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import { isPackPlayer, getPackTierConfig } from '../common/PackPlayerCard';
import futCardBaseImg from '../../assets/fut_card_base.png';
import legendaryCardBg from '../../assets/cards/legendary_card_bg.png';
import epicCardBg from '../../assets/cards/epic_card_bg.png';
import rareCardBg from '../../assets/cards/rare_card_bg.png';
import { getCardKitName, getCardNameTypography } from '../../utils/playerNameUtils';

// Contour silhouette glow shadows per pack tier
const PACK_GLOW_SHADOWS = {
  LEGENDARY: 'drop-shadow-[0_0_10px_rgba(245,158,11,0.65)] hover:drop-shadow-[0_0_16px_rgba(251,191,36,0.85)]',
  EPIC: 'drop-shadow-[0_0_10px_rgba(217,70,239,0.65)] hover:drop-shadow-[0_0_16px_rgba(232,121,249,0.85)]',
  RARE: 'drop-shadow-[0_0_10px_rgba(6,182,212,0.65)] hover:drop-shadow-[0_0_16px_rgba(103,232,249,0.85)]',
};

// Color theme map for position badges matching site official positions
export const POSITION_COLORS = {
  GK: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  CB: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  LB: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  RB: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  DMF: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  CMF: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  AMF: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  LMF: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  RMF: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  LWF: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  RWF: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  SS: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  CF: 'bg-red-500/20 text-red-300 border-red-500/40',
};

// Clean Authentic Soccer Ball Icon matching FotMob / Sofascore
export const SoccerBallIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
    <polygon points="12,7 15.5,9.5 14,14 10,14 8.5,9.5" fill="#0f172a" />
    <line x1="12" y1="7" x2="12" y2="2" stroke="#0f172a" strokeWidth="1.5" />
    <line x1="15.5" y1="9.5" x2="20.5" y2="7.5" stroke="#0f172a" strokeWidth="1.5" />
    <line x1="14" y1="14" x2="18.5" y2="18" stroke="#0f172a" strokeWidth="1.5" />
    <line x1="10" y1="14" x2="5.5" y2="18" stroke="#0f172a" strokeWidth="1.5" />
    <line x1="8.5" y1="9.5" x2="3.5" y2="7.5" stroke="#0f172a" strokeWidth="1.5" />
  </svg>
);

// Clean Authentic Soccer Cleat / Boot Icon matching Sofascore Assist Badge
export const SoccerCleatIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.5 13.2c-.3-.8-1-1.4-1.8-1.7l-4.2-1.4c-1.1-.4-2.2-.9-3.2-1.6l-1.5-1.1c-.6-.4-1.4-.7-2.1-.7H6.2c-.8 0-1.5.4-1.9 1.1L3.1 9.4C2.4 10.5 2 11.7 2 13v1c0 .6.4 1 1 1h16.8c.8 0 1.5-.5 1.7-1.3l.2-.5h-.2z" />
    <rect x="4.5" y="15.5" width="2" height="2" rx="0.5" />
    <rect x="8.5" y="15.5" width="2" height="2" rx="0.5" />
    <rect x="14" y="15.5" width="2" height="2" rx="0.5" />
    <rect x="17.5" y="15.5" width="2" height="2" rx="0.5" />
  </svg>
);

/**
 * High-performance FUT Shield Card for Squad Builder Pitch & Bench
 * Powered by authentic EA FC / FUT card frame asset
 */
export default function FutPitchCard({
  player = null,
  slotPos = 'CMF',
  isSelected = false,
  isGreenSlot = false,
  hasStarRating = false,
  isExactMatch = false,
  isDimmed = false,
  isOutOfPosition = false,
  isManager = false,
  managerData = null,
  onClick,
  isLiveMode = false,
  isAdminMode = false,
  showPillUnderCard = true,
  cardSize = 'normal', // 'normal' | 'bench'
}) {
  const isBench = cardSize === 'bench';

  // Sizing definitions (Calibrated for zero overlap across all 14 formations on mobile & desktop)
  const widthClass = isBench
    ? 'w-[44px] xs:w-[48px] sm:w-[62px] md:w-[70px]'
    : 'w-[46px] xs:w-[50px] sm:w-[68px] md:w-[80px] lg:w-[86px]';
  const heightClass = isBench
    ? 'h-[62px] xs:h-[68px] sm:h-[86px] md:h-[97px]'
    : 'h-[64px] xs:h-[70px] sm:h-[94px] md:h-[111px] lg:h-[119px]';

  // Empty Slot Card (FUT Shield with Carbon Fiber & Neon Hexagon +)
  if (!player && !isManager) {
    return (
      <div
        onClick={onClick}
        className={`flex flex-col items-center cursor-pointer select-none group transition-transform duration-150 active:scale-95 ${
          isDimmed ? 'opacity-35' : 'opacity-100'
        }`}
      >
        <div
          className={`relative ${widthClass} ${heightClass} flex items-center justify-center transition-all ${
            isGreenSlot
              ? 'filter drop-shadow-[0_0_15px_rgba(0,255,135,0.9)] scale-105'
              : 'hover:filter hover:drop-shadow-[0_0_12px_rgba(0,243,255,0.5)] group-hover:scale-102'
          }`}
        >
          {/* Authentic Metallic FUT Card Base */}
          <img
            src={futCardBaseImg}
            alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]"
          />

          {/* Central Neon Green Hexagon & Plus Icon */}
          <svg
            viewBox="0 0 100 132"
            className="w-full h-full relative z-10 pointer-events-none"
          >
            <g transform="translate(50, 66)">
              {/* Outer Hexagon */}
              <polygon
                points="0,-18 15.5,-9 15.5,9 0,18 -15.5,9 -15.5,-9"
                fill="rgba(0, 255, 135, 0.05)"
                stroke={isGreenSlot ? '#00ff87' : '#00e676'}
                strokeWidth="2.2"
                className="filter drop-shadow-[0_0_8px_#00ff87]"
              />
              {/* Plus Sign */}
              <line
                x1="0"
                y1="-7"
                x2="0"
                y2="7"
                stroke={isGreenSlot ? '#00ff87' : '#00e676'}
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <line
                x1="-7"
                y1="0"
                x2="7"
                y2="0"
                stroke={isGreenSlot ? '#00ff87' : '#00e676'}
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>

        {/* Position Pill Badge directly below the card */}
        {showPillUnderCard && (
          <div className="mt-0.5 sm:mt-1 flex items-center justify-center pointer-events-none">
            <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-slate-950/90 border border-slate-700/80 text-[7.5px] xs:text-[8.5px] sm:text-[10px] md:text-[11px] font-black text-slate-300 shadow-md font-sport tracking-wider">
              {slotPos}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Manager Card Slot
  if (isManager) {
    const managerName = String(
      (typeof managerData?.name === 'string' ? managerData.name : null) || 
      managerData?.full_name || 
      managerData?.username || 
      'سرمربی تیم'
    );
    const managerAvatar = managerData?.avatar;

    return (
      <div
        onClick={onClick}
        className="flex flex-col items-center cursor-pointer select-none group transition-transform duration-150 active:scale-95"
      >
        <div
          className={`relative ${widthClass} ${heightClass} flex items-center justify-center drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]`}
        >
          {/* Authentic Metallic Card Base */}
          <img
            src={futCardBaseImg}
            alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          />

          {/* Avatar image placed inside card */}
          <div className="absolute top-[10%] left-[10%] right-[10%] bottom-[24%] overflow-hidden flex items-center justify-center pointer-events-none">
            {managerAvatar ? (
              <img
                src={managerAvatar}
                alt={managerName}
                className="w-full h-full object-cover object-top filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-sky-400">
                <User size={20} />
              </div>
            )}
          </div>

          {/* Name overlay at bottom */}
          <div className="absolute bottom-2 left-1 right-1 text-center truncate z-20">
            <span className="text-[8px] sm:text-[9px] font-black text-slate-200 bg-slate-950/85 px-1 py-0.5 rounded-md border border-slate-700/50 block truncate">
              {managerName}
            </span>
          </div>
        </div>

        {/* Manager label badge below card */}
        <div className="mt-1 flex items-center justify-center">
          <span className="px-2 py-0.5 rounded-full bg-slate-950/95 border border-sky-500/40 text-[9px] sm:text-[10px] md:text-[11px] font-black text-sky-300 shadow-md font-sport">
            Manager
          </span>
        </div>
      </div>
    );
  }

  // Occupied FUT Player Card
  const photoUrl = getPlayerPhotoUrl(player);
  const isPack = isPackPlayer(player);
  const rawTier = player?.pack_tier || player?.rarity || 'LEGENDARY';
  const packConfig = isPack ? getPackTierConfig(rawTier) : null;
  const isCustomPackBg = Boolean(isPack && player?.pack_card_bg);

  // Background selection:
  // 1. Custom uploaded pack card background (if present)
  // 2. Default tier background (legendary, epic, rare)
  // 3. futCardBaseImg for normal non-pack players
  const cardBgImage = isCustomPackBg
    ? player.pack_card_bg
    : isPack
    ? (packConfig?.bgImage || legendaryCardBg)
    : futCardBaseImg;

  const packGlowClass = isPack
    ? (PACK_GLOW_SHADOWS[packConfig?.fxTier] || PACK_GLOW_SHADOWS.LEGENDARY)
    : '';

  const ovr = player?.overall || 75;
  const isSuspended = Boolean((player?.suspension_matches > 0) || player?.is_suspended || player?.isSuspended);
  const isInjured = Boolean(player?.is_injured || player?.isInjured || (player?.injury_matches > 0));

  // In-Match Live Badges data (FotMob / Sofascore style: Goals, Assists, Cards, Sub Minute, Rating)
  const goals = Number(player?.in_match_goals ?? player?.goals ?? 0);
  const assists = Number(player?.in_match_assists ?? player?.assists ?? 0);
  const ownGoals = Number(player?.in_match_own_goals ?? player?.own_goals ?? 0);
  const yellowCards = Number(player?.yellowCards ?? 0);
  const isRed = Boolean(player?.isRed || player?.is_red || yellowCards >= 2);
  const isSubIn = Boolean(player?.isSubIn || player?.sub_in || player?.subInMinute);
  const subInMinute = player?.subInMinute || (isSubIn ? (player?.subMinute || player?.sub_minute) : null);
  const isSubOut = Boolean(player?.isSubOut || player?.sub_out || player?.subOutMinute || (!isSubIn && (player?.subMinute || player?.sub_minute)));
  const subOutMinute = player?.subOutMinute || (!isSubIn ? (player?.subMinute || player?.sub_minute) : null);
  const hasSubIndicator = Boolean(isSubIn || isSubOut || subInMinute || subOutMinute);
  const rawRating = player?.match_rating ?? player?.rating ?? player?.live_rating ?? null;
  const numRating = rawRating != null && !isNaN(Number(rawRating)) ? Number(rawRating) : null;
  const isMotm = Boolean(player?.isMotm || player?.motm || (numRating && numRating >= 8.5));
  const displayRating = numRating != null ? numRating.toFixed(1) : null;

  // Responsive badge scale classes for Normal vs Bench card sizes
  const badgeSizeClass = isBench
    ? 'w-4.5 h-4.5 xs:w-5 xs:h-5 sm:w-6 sm:h-6'
    : 'w-5 h-5 xs:w-5.5 xs:h-5.5 sm:w-6.5 sm:h-6.5 md:w-7 md:h-7';
  const badgeIconSizeClass = isBench
    ? 'w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5'
    : 'w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-4.5 sm:h-4.5';
  const badgeCountSizeClass = isBench
    ? 'text-[6.5px] xs:text-[7px] sm:text-[8px] w-3 h-3 xs:w-3.5 xs:h-3.5'
    : 'text-[7.5px] xs:text-[8px] sm:text-[9px] w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-4.5 sm:h-4.5';

  // Stamina calculation
  const staminaPercent = Math.max(5, Math.min(100, Math.round(Number(player?.stamina ?? player?.virtual_stamina ?? 90))));
  const staminaColorClass =
    staminaPercent >= 80 ? 'bg-[#00ff87]' :
    staminaPercent >= 50 ? 'bg-cyan-400' :
    staminaPercent >= 30 ? 'bg-amber-400' : 'bg-rose-500';

  // Overall Color styling
  const ovrColor = isPack && packConfig?.ovrColor
    ? packConfig.ovrColor
    : ovr >= 90 ? 'text-amber-300'
    : ovr >= 85 ? 'text-cyan-300'
    : ovr >= 80 ? 'text-emerald-300'
    : 'text-slate-200';

  const kitName = getCardKitName(player?.name);
  const fullName = String(player?.name || 'بازیکن');

  return (
    <div
      onClick={onClick}
      title={fullName}
      className={`relative flex flex-col items-center cursor-pointer select-none group transition-all duration-150 ${
        isDimmed ? 'opacity-35' : 'opacity-100'
      } ${isSelected ? 'scale-105' : 'hover:scale-103'}`}
    >
      {/* Sleek Glassmorphism Floating Tooltip on Hover */}
      <div className="hidden md:group-hover:flex absolute -top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex-col items-center animate-in fade-in zoom-in-95 duration-150 drop-shadow-xl">
        <div className="px-2.5 py-1 rounded-xl bg-slate-950/95 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white shadow-2xl flex items-center gap-1.5 whitespace-nowrap">
          <span className={`font-sport font-black ${ovrColor}`}>{ovr}</span>
          <span className="text-slate-500 font-normal">|</span>
          <span dir="ltr" className="text-white font-black">{fullName}</span>
          {player?.isCaptain && <span className="text-amber-400 font-black">©</span>}
        </div>
        <div className="w-1.5 h-1.5 -mt-1 rotate-45 bg-slate-950/95 border-r border-b border-white/20" />
      </div>

      <div
        className={`relative ${widthClass} ${heightClass} flex items-center justify-center transition-all ${
          isSelected
            ? 'filter drop-shadow-[0_0_18px_rgba(0,243,255,0.95)]'
            : isGreenSlot
            ? 'filter drop-shadow-[0_0_16px_rgba(0,255,135,0.95)]'
            : isPack
            ? packGlowClass
            : 'drop-shadow-[0_8px_18px_rgba(0,0,0,0.85)]'
        }`}
      >
        {/* Authentic Card Base Image (Custom Pack BG, Tier Metallic BG, or Default FUT Shield) */}
        {isCustomPackBg ? (
          <div className="absolute inset-0 overflow-hidden rounded-[12px] sm:rounded-[18px]">
            <img
              src={cardBgImage}
              alt=""
              className={`w-full h-full object-cover pointer-events-none select-none ${
                isSuspended ? 'grayscale contrast-125' : ''
              }`}
            />
            {/* Metallic inner edge contour */}
            <div
              className={`absolute inset-0 rounded-[12px] sm:rounded-[18px] border pointer-events-none ${
                packConfig?.borderColor || 'border-amber-400/70'
              }`}
            />
          </div>
        ) : (
          <img
            src={cardBgImage}
            alt=""
            className={`absolute inset-0 w-full h-full object-contain pointer-events-none select-none ${
              isSuspended ? 'grayscale contrast-125' : ''
            }`}
          />
        )}

        {/* Pack Metallic Border contour if not selected/green */}
        {isPack && !isCustomPackBg && !isSelected && !isGreenSlot && (
          <div
            className={`absolute inset-0 pointer-events-none rounded-[14px] sm:rounded-[18px] border transition-all ${
              packConfig?.borderColor ? packConfig.borderColor.replace('/80', '/40') : 'border-amber-400/40'
            }`}
          />
        )}

        {/* Glow border ring if selected or green */}
        {(isSelected || isGreenSlot) && (
          <div
            className={`absolute inset-0 pointer-events-none rounded-[16px] border-2 transition-all ${
              isSelected
                ? 'border-cyan-400 shadow-[0_0_20px_#00f3ff] animate-pulse'
                : 'border-[#00ff87] shadow-[0_0_15px_#00ff87]'
            }`}
          />
        )}

        {/* Selected Swap Indicator Badge */}
        {isSelected && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 px-2 py-0.5 rounded-full font-black text-[8px] sm:text-[9px] shadow-[0_0_12px_#00f3ff] flex items-center gap-1 animate-bounce whitespace-nowrap">
            <span className="text-[10px]">🔄</span>
            <span>آماده جابجایی</span>
          </div>
        )}

        {/* Player Photo (Positioned in Upper Shield Area) */}
        <div className="absolute top-[8%] left-[8%] right-[8%] bottom-[24%] overflow-hidden flex items-center justify-center pointer-events-none z-10">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={player?.name || 'بازیکن'}
              loading="lazy"
              decoding="async"
              className={`w-full h-full object-cover object-top filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.75)] ${
                isSuspended ? 'grayscale opacity-60' : ''
              }`}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400">
              <User size={20} />
            </div>
          )}
        </div>

        {/* Card Header Info (Overall & Position in Top-Left) */}
        <div className="absolute top-1 left-1.5 sm:top-2.5 sm:left-2.5 flex flex-col items-center leading-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] z-20">
          <span className={`text-[10px] xs:text-[11px] sm:text-[14px] md:text-[16px] font-black font-sport ${ovrColor}`}>
            {ovr}
          </span>
          <span className="text-[6px] xs:text-[7px] sm:text-[8.5px] md:text-[9.5px] font-black text-slate-300 uppercase tracking-tighter">
            {slotPos}
          </span>
        </div>

        {/* Special Indicators in Top-Right */}
        <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex flex-col items-end gap-0.5 pointer-events-none z-20">
          {hasStarRating && (
            <span className="text-amber-400 text-[10px] sm:text-sm drop-shadow-[0_0_6px_#f59e0b] animate-bounce">
              ⭐
            </span>
          )}
          {isOutOfPosition && !hasStarRating && (
            <span
              className="bg-amber-500 text-black text-[7px] sm:text-[8px] font-black w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full flex items-center justify-center leading-none shadow-md animate-pulse"
              title="پست غیرتخصصی"
            >
              ⚠️
            </span>
          )}
        </div>

        {/* ========================================================= */}
        {/* FOTMOB / SOFASCORE LIVE MATCH CORNER BADGES               */}
        {/* ========================================================= */}

        {/* 1. GOAL BADGE (Bottom-Right: White circular badge with authentic soccer ball) */}
        {goals > 0 && (
          <div
            className="absolute -bottom-1 -right-1 xs:-bottom-1.5 xs:-right-1.5 sm:-bottom-2 sm:-right-2 z-30 flex items-center pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] select-none"
            title={`${goals} گل ثبت‌شده`}
          >
            <div className={`relative ${badgeSizeClass} rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center`}>
              <SoccerBallIcon className={badgeIconSizeClass} />
              {goals > 1 && (
                <span className={`absolute -top-1 -right-1 bg-emerald-600 text-white font-sport font-black ${badgeCountSizeClass} rounded-full border border-white flex items-center justify-center shadow`}>
                  {goals}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 1.5. OWN GOAL BADGE (Bottom-Right, offset if regular goals present) */}
        {ownGoals > 0 && (
          <div
            className={`absolute z-30 flex items-center pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] select-none ${
              goals > 0
                ? '-bottom-1 right-5 sm:right-6'
                : '-bottom-1 -right-1 xs:-bottom-1.5 xs:-right-1.5 sm:-bottom-2 sm:-right-2'
            }`}
            title={`${ownGoals} گل به خودی`}
          >
            <div className={`relative ${badgeSizeClass} rounded-full bg-slate-950 border-2 border-purple-400 shadow-md flex items-center justify-center text-white`}>
              <span className="text-[10px] xs:text-[11px] sm:text-[13px] leading-none select-none">🤦‍♂️</span>
              {ownGoals > 1 && (
                <span className={`absolute -top-1 -right-1 bg-purple-600 text-white font-sport font-black ${badgeCountSizeClass} rounded-full border border-white flex items-center justify-center shadow`}>
                  {ownGoals}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 2. ASSIST BADGE (Bottom-Left: White circular badge with authentic black soccer boot) */}
        {assists > 0 && (
          <div
            className="absolute -bottom-1 -left-1 xs:-bottom-1.5 xs:-left-1.5 sm:-bottom-2 sm:-left-2 z-30 flex items-center pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] select-none"
            title={`${assists} پاس‌گل ثبت‌شده`}
          >
            <div className={`relative ${badgeSizeClass} rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center text-slate-950`}>
              <SoccerCleatIcon className={`${badgeIconSizeClass} text-slate-950`} />
              {assists > 1 && (
                <span className={`absolute -top-1 -left-1 bg-cyan-600 text-white font-sport font-black ${badgeCountSizeClass} rounded-full border border-white flex items-center justify-center shadow`}>
                  {assists}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 3. SUBSTITUTION BADGES: Green arrow for SUB_IN (on pitch), Red arrow for SUB_OUT (on bench) */}
        {isSubIn && (
          <div
            className="absolute -top-3.5 -left-1.5 sm:-top-4.5 sm:-left-2 z-30 flex flex-col items-center pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] select-none"
            title={`ورود به زمین در دقیقه ${subInMinute || ''}`}
          >
            {subInMinute && (
              <span className="text-[7.5px] xs:text-[8.5px] sm:text-[10px] font-sport font-black text-emerald-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] leading-none mb-0.5">
                {subInMinute}'
              </span>
            )}
            <div className={`${badgeSizeClass} rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center text-white shadow-md`}>
              <svg viewBox="0 0 24 24" className={`${badgeIconSizeClass} text-white stroke-[3.5]`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </div>
          </div>
        )}

        {!isSubIn && isSubOut && (
          <div
            className="absolute -top-3.5 -left-1.5 sm:-top-4.5 sm:-left-2 z-30 flex flex-col items-center pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] select-none"
            title={`خروج از زمین در دقیقه ${subOutMinute || ''}`}
          >
            {subOutMinute && (
              <span className="text-[7.5px] xs:text-[8.5px] sm:text-[10px] font-sport font-black text-rose-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] leading-none mb-0.5">
                {subOutMinute}'
              </span>
            )}
            <div className={`${badgeSizeClass} rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-white shadow-md`}>
              <svg viewBox="0 0 24 24" className={`${badgeIconSizeClass} text-white stroke-[3.5]`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </div>
          </div>
        )}

        {/* 4. YELLOW / RED CARD BADGE (Top-Left, offset if substituted) */}
        {(yellowCards > 0 || isRed) && (
          <div
            className={`absolute z-30 flex items-center pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] select-none ${
              hasSubIndicator
                ? '-top-1 left-3.5 sm:left-4.5'
                : '-top-1.5 -left-1.5 sm:-top-2 sm:-left-2'
            }`}
            title={isRed ? 'کارت قرمز (اخراج)' : 'کارت زرد'}
          >
            {isRed ? (
              <div className="w-4 h-5 xs:w-4.5 xs:h-5.5 sm:w-5 sm:h-6.5 rounded-md bg-rose-600 border-2 border-white shadow-md flex items-center justify-center text-[8px] sm:text-[9px] font-black text-white font-sport">
                {yellowCards === 2 ? '🟨🟥' : '🟥'}
              </div>
            ) : (
              <div className="w-4 h-5 xs:w-4.5 xs:h-5.5 sm:w-5 sm:h-6.5 rounded-md bg-amber-400 border-2 border-white shadow-md flex items-center justify-center text-[8px] sm:text-[9px] font-black text-slate-950 font-sport">
                🟨
              </div>
            )}
          </div>
        )}

        {/* 5. MATCH RATING BADGE (Top-Right: Pill badge like Sofascore 8.7★ / 7.6) */}
        {displayRating && (
          <div
            className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 z-30 pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] select-none"
            title={`نمره فنی مسابقه: ${displayRating}`}
          >
            <div
              className={`px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full border-2 border-white font-sport font-black text-[8px] xs:text-[9px] sm:text-[10.5px] flex items-center gap-0.5 shadow-md ${
                isMotm || numRating >= 8.0
                  ? 'bg-sky-500 text-white shadow-[0_0_8px_rgba(14,165,233,0.7)]'
                  : numRating >= 7.0
                  ? 'bg-[#00d084] text-slate-950 shadow-[0_0_8px_rgba(0,208,132,0.6)]'
                  : numRating >= 6.0
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-rose-500 text-white'
              }`}
            >
              <span>{displayRating}</span>
              {isMotm && <span className="text-[7.5px] sm:text-[9px] leading-none">★</span>}
            </div>
          </div>
        )}

        {/* 6. IN-GAME INJURY / SUSPENSION STATUS (Center Overlay) */}
        {(isSuspended || isInjured) && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none select-none">
            {isSuspended ? (
              <span className="px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded-md bg-red-950/95 border border-red-500 text-red-300 font-black text-[7px] sm:text-[9px] whitespace-nowrap shadow-lg">
                🟥 محروم
              </span>
            ) : (
              <span className="px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded-md bg-rose-950/95 border border-rose-500 text-rose-300 font-black text-[7px] sm:text-[9px] whitespace-nowrap shadow-lg flex items-center gap-0.5">
                <span>🩹</span>
                <span>مصدوم</span>
              </span>
            )}
          </div>
        )}

        {/* Player Name Banner at Bottom of Card */}
        <div className="absolute bottom-1.5 sm:bottom-2.5 left-0.5 right-0.5 sm:left-1 sm:right-1 flex flex-col items-center leading-none px-0.5 sm:px-1 z-20">
          <div
            dir="ltr"
            className={`${getCardNameTypography(kitName)} text-white max-w-full text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] font-sport uppercase truncate select-none`}
          >
            {player?.isCaptain && <span className="text-amber-400 mr-0.5">©</span>}
            {(player?.shirt_number || player?.number) ? (
              <span className="text-cyan-300 font-black mr-1">{player.shirt_number || player.number}</span>
            ) : null}
            {kitName}
          </div>

          {/* Micro Stamina Bar */}
          <div
            className="w-7 xs:w-8 sm:w-12 md:w-14 h-0.5 sm:h-1 bg-black/80 rounded-full overflow-hidden border border-white/10 p-0.2 mt-0.5 shadow-inner"
            title={`استقامت: ${staminaPercent}%`}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${staminaColorClass}`}
              style={{ width: `${staminaPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Position Pill Badge directly below the card */}
      {showPillUnderCard && (
        <div className="mt-0.5 sm:mt-1 flex items-center justify-center pointer-events-none">
          <span
            className={`px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-slate-950/95 border text-[7.5px] xs:text-[8.5px] sm:text-[10px] md:text-[11px] font-black shadow-md font-sport tracking-wider ${
              POSITION_COLORS[String(slotPos || '')] || 'border-slate-700/80 text-slate-300'
            }`}
          >
            {String(slotPos || 'POS')}
          </span>
        </div>
      )}
    </div>
  );
}
