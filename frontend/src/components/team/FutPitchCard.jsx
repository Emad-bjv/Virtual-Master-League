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

        {/* Live / Admin Mode Badges */}
        {(isLiveMode || isAdminMode) && ((player.in_match_goals || 0) > 0 || player.yellowCards > 0 || player.isRed) && (
          <div className="absolute top-0.5 sm:top-1 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 pointer-events-none drop-shadow">
            {(player.in_match_goals || 0) > 0 && (
              <span className="px-1 rounded-full bg-slate-950 text-emerald-300 text-[7px] sm:text-[8px] font-black border border-emerald-400 font-sport">
                ⚽{player.in_match_goals > 1 ? `×${player.in_match_goals}` : ''}
              </span>
            )}
            {player.yellowCards === 1 && <span className="text-[7px] sm:text-[8px]">🟨</span>}
            {(player.yellowCards === 2 || player.isRed) && <span className="text-[7px] sm:text-[8px]">🟥</span>}
          </div>
        )}

        {/* In-Game Status (Injured / Suspended) */}
        {(isSuspended || isInjured) && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
            {isSuspended ? (
              <span className="px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded-md bg-red-950/95 border border-red-500 text-red-300 font-black text-[7px] sm:text-[9px] whitespace-nowrap shadow-lg">
                🟥 محروم
              </span>
            ) : (
              <span className="px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded-md bg-rose-950/95 border border-rose-500 text-rose-300 font-black text-[7px] sm:text-[9px] whitespace-nowrap shadow-lg">
                🩹 مصدوم
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
