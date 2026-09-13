import React from 'react';
import { motion } from 'framer-motion';
import { User, Plus, AlertTriangle } from 'lucide-react';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import { isPackPlayer, getPackTierConfig } from '../common/PackPlayerCard';

// Color theme map for position badges matching site official positions
const POSITION_COLORS = {
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

  // Sizing definitions (Calibrated for zero overlap across all 14 formations)
  const widthClass = isBench
    ? 'w-[54px] sm:w-[62px] md:w-[72px]'
    : 'w-[56px] sm:w-[68px] md:w-[82px] lg:w-[88px]';
  const heightClass = isBench
    ? 'h-[74px] sm:h-[84px] md:h-[98px]'
    : 'h-[78px] sm:h-[94px] md:h-[114px] lg:h-[122px]';

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
              ? 'filter drop-shadow-[0_0_15px_rgba(0,255,135,0.8)] scale-105'
              : 'hover:filter hover:drop-shadow-[0_0_12px_rgba(0,243,255,0.5)] group-hover:scale-102'
          }`}
        >
          {/* SVG Shield Base */}
          <svg
            viewBox="0 0 100 132"
            className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
          >
            <defs>
              <linearGradient id="emptyCardBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1a202c" />
                <stop offset="50%" stopColor="#0d131f" />
                <stop offset="100%" stopColor="#060911" />
              </linearGradient>
              <linearGradient id="emptyCardBorder" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={isGreenSlot ? '#00ff87' : 'rgba(255,255,255,0.2)'} />
                <stop offset="100%" stopColor={isGreenSlot ? '#00ff87' : 'rgba(255,255,255,0.05)'} />
              </linearGradient>
              <pattern id="diagonalStripes" width="8" height="8" patternUnits="userSpaceOnUse">
                <line x1="0" y1="8" x2="8" y2="0" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
              </pattern>
            </defs>

            {/* Shield Outline Path */}
            <path
              d="M 50,2 C 72,2 96,10 98,22 L 98,96 C 96,114 50,130 50,130 C 50,130 4,114 2,96 L 2,22 C 4,10 28,2 50,2 Z"
              fill="url(#emptyCardBg)"
              stroke="url(#emptyCardBorder)"
              strokeWidth={isGreenSlot ? '2.5' : '1.5'}
            />
            {/* Pattern Overlay */}
            <path
              d="M 50,2 C 72,2 96,10 98,22 L 98,96 C 96,114 50,130 50,130 C 50,130 4,114 2,96 L 2,22 C 4,10 28,2 50,2 Z"
              fill="url(#diagonalStripes)"
            />

            {/* Central Neon Green Hexagon & Plus Icon */}
            <g transform="translate(50, 66)">
              {/* Outer Hexagon */}
              <polygon
                points="0,-18 15.5,-9 15.5,9 0,18 -15.5,9 -15.5,-9"
                fill="none"
                stroke={isGreenSlot ? '#00ff87' : '#00e676'}
                strokeWidth="1.8"
                className="filter drop-shadow-[0_0_6px_#00ff87]"
              />
              {/* Plus Sign */}
              <line x1="0" y1="-7" x2="0" y2="7" stroke={isGreenSlot ? '#00ff87' : '#00e676'} strokeWidth="2" strokeLinecap="round" />
              <line x1="-7" y1="0" x2="7" y2="0" stroke={isGreenSlot ? '#00ff87' : '#00e676'} strokeWidth="2" strokeLinecap="round" />
            </g>
          </svg>
        </div>

        {/* Position Pill Badge directly below the card */}
        {showPillUnderCard && (
          <div className="mt-1 flex items-center justify-center">
            <span className="px-2 py-0.5 rounded-full bg-slate-950/90 border border-slate-700/80 text-[9px] sm:text-[10px] md:text-[11px] font-black text-slate-300 shadow-md font-sport tracking-wider">
              {slotPos}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Manager Card Slot
  if (isManager) {
    const managerName = managerData?.name || managerData?.full_name || managerData?.username || 'سرمربی تیم';
    const managerAvatar = managerData?.avatar;

    return (
      <div
        onClick={onClick}
        className="flex flex-col items-center cursor-pointer select-none group transition-transform duration-150 active:scale-95"
      >
        <div className={`relative ${widthClass} ${heightClass} flex items-center justify-center drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]`}>
          <svg viewBox="0 0 100 132" className="w-full h-full">
            <defs>
              <linearGradient id="managerBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="60%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>
              <clipPath id="managerClip">
                <path d="M 50,4 C 70,4 94,11 96,23 L 96,94 C 94,111 50,127 50,127 C 50,127 6,111 4,94 L 4,23 C 6,11 30,4 50,4 Z" />
              </clipPath>
            </defs>

            {/* Base Shield */}
            <path
              d="M 50,2 C 72,2 96,10 98,22 L 98,96 C 96,114 50,130 50,130 C 50,130 4,114 2,96 L 2,22 C 4,10 28,2 50,2 Z"
              fill="url(#managerBg)"
              stroke="#38bdf8"
              strokeWidth="1.5"
              className="filter drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]"
            />

            {/* Avatar image clipped inside */}
            <g clipPath="url(#managerClip)">
              {managerAvatar ? (
                <image
                  href={managerAvatar}
                  x="5"
                  y="10"
                  width="90"
                  height="90"
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <g transform="translate(50, 58)">
                  <polygon
                    points="0,-18 15.5,-9 15.5,9 0,18 -15.5,9 -15.5,-9"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.8"
                  />
                  <line x1="0" y1="-7" x2="0" y2="7" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                  <line x1="-7" y1="0" x2="7" y2="0" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                </g>
              )}
            </g>
          </svg>

          {/* Name overlay at bottom */}
          <div className="absolute bottom-2 left-1 right-1 text-center truncate">
            <span className="text-[8px] sm:text-[9px] font-black text-slate-200 bg-slate-950/80 px-1 py-0.5 rounded-md border border-slate-700/50">
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
  const packConfig = isPack ? getPackTierConfig(player.pack_tier || player.rarity) : null;
  const ovr = player.overall || 75;
  const isSuspended = Boolean((player.suspension_matches > 0) || player.is_suspended || player.isSuspended);
  const isInjured = Boolean(player.is_injured || player.isInjured || (player.injury_matches > 0));

  // Stamina calculation
  const staminaPercent = Math.max(5, Math.min(100, Math.round(Number(player.stamina ?? player.virtual_stamina ?? 90))));
  const staminaColorClass =
    staminaPercent >= 80 ? 'bg-[#00ff87]' :
    staminaPercent >= 50 ? 'bg-cyan-400' :
    staminaPercent >= 30 ? 'bg-amber-400' : 'bg-rose-500';

  // Overall Color styling
  const ovrColor =
    ovr >= 90 ? 'text-amber-300' :
    ovr >= 85 ? 'text-cyan-300' :
    ovr >= 80 ? 'text-emerald-300' : 'text-slate-200';

  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center cursor-pointer select-none group transition-all duration-150 ${
        isDimmed ? 'opacity-35' : 'opacity-100'
      } ${isSelected ? 'scale-105' : 'hover:scale-103'}`}
    >
      <div
        className={`relative ${widthClass} ${heightClass} flex items-center justify-center transition-all ${
          isSelected
            ? 'filter drop-shadow-[0_0_18px_rgba(0,243,255,0.9)] ring-2 ring-cyan-400 rounded-[18px]'
            : isGreenSlot
            ? 'filter drop-shadow-[0_0_16px_rgba(0,255,135,0.9)] ring-2 ring-[#00ff87] rounded-[18px]'
            : isPack
            ? `${packConfig.glowShadow}`
            : 'drop-shadow-[0_8px_18px_rgba(0,0,0,0.85)]'
        }`}
      >
        {/* SVG Shield Base with Card Art */}
        <svg viewBox="0 0 100 132" className="w-full h-full">
          <defs>
            <linearGradient id={`cardBg-${player.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              {isPack ? (
                <>
                  <stop offset="0%" stopColor="#1e1b4b" />
                  <stop offset="50%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#020617" />
                </>
              ) : isSuspended ? (
                <>
                  <stop offset="0%" stopColor="#450a0a" />
                  <stop offset="100%" stopColor="#1c0404" />
                </>
              ) : isInjured ? (
                <>
                  <stop offset="0%" stopColor="#451a03" />
                  <stop offset="100%" stopColor="#1c0701" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#1a2234" />
                  <stop offset="45%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#050812" />
                </>
              )}
            </linearGradient>

            <linearGradient id={`cardBorder-${player.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              {isSelected ? (
                <>
                  <stop offset="0%" stopColor="#00f3ff" />
                  <stop offset="100%" stopColor="#0066ff" />
                </>
              ) : isGreenSlot ? (
                <>
                  <stop offset="0%" stopColor="#00ff87" />
                  <stop offset="100%" stopColor="#00a854" />
                </>
              ) : isPack ? (
                <>
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                </>
              )}
            </linearGradient>

            <clipPath id={`playerClip-${player.id}`}>
              <path d="M 50,4 C 70,4 94,11 96,23 L 96,94 C 94,111 50,127 50,127 C 50,127 6,111 4,94 L 4,23 C 6,11 30,4 50,4 Z" />
            </clipPath>
          </defs>

          {/* Shield Outer Path */}
          <path
            d="M 50,2 C 72,2 96,10 98,22 L 98,96 C 96,114 50,130 50,130 C 50,130 4,114 2,96 L 2,22 C 4,10 28,2 50,2 Z"
            fill={`url(#cardBg-${player.id})`}
            stroke={`url(#cardBorder-${player.id})`}
            strokeWidth={isSelected || isGreenSlot ? '2.5' : '1.5'}
          />

          {/* Player Photo (Positioned at Top-Center inside shield) */}
          <g clipPath={`url(#playerClip-${player.id})`}>
            {photoUrl ? (
              <image
                href={photoUrl}
                x="12"
                y="10"
                width="76"
                height="80"
                preserveAspectRatio="xMidYMid slice"
                className={isSuspended ? 'grayscale opacity-60' : ''}
              />
            ) : (
              <g transform="translate(50, 52)">
                <circle cx="0" cy="-6" r="14" fill="#334155" />
                <path d="M -18,18 C -18,6 18,6 18,18 Z" fill="#334155" />
              </g>
            )}
          </g>

          {/* Subtle bottom gradient to ensure text readability */}
          <path
            d="M 4,70 L 96,70 L 96,96 C 94,111 50,127 50,127 C 50,127 6,111 4,94 Z"
            fill="url(#cardBg-bottom)"
            opacity="0.8"
          />
        </svg>

        {/* Card Header Info (Overall & Position in Top-Left) */}
        <div className="absolute top-2 left-2 flex flex-col items-center leading-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          <span className={`text-[11px] sm:text-[13px] md:text-[15px] font-black font-sport ${ovrColor}`}>
            {ovr}
          </span>
          <span className="text-[7.5px] sm:text-[8.5px] md:text-[9.5px] font-black text-slate-300 uppercase tracking-tighter">
            {slotPos}
          </span>
        </div>

        {/* Special Indicators in Top-Right */}
        <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-0.5 pointer-events-none">
          {hasStarRating && (
            <span className="text-amber-400 text-xs sm:text-sm drop-shadow-[0_0_6px_#f59e0b] animate-bounce">
              ⭐
            </span>
          )}
          {isOutOfPosition && !hasStarRating && (
            <span
              className="bg-amber-500 text-black text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center leading-none shadow-md animate-pulse"
              title="پست غیرتخصصی"
            >
              ⚠️
            </span>
          )}
          {isPack && (
            <span className="text-[9px] text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]">
              ✨
            </span>
          )}
        </div>

        {/* Live / Admin Mode Badges */}
        {(isLiveMode || isAdminMode) && ((player.in_match_goals || 0) > 0 || player.yellowCards > 0 || player.isRed) && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 pointer-events-none drop-shadow">
            {(player.in_match_goals || 0) > 0 && (
              <span className="px-1 rounded-full bg-slate-950 text-emerald-300 text-[8px] font-black border border-emerald-400 font-sport">
                ⚽{player.in_match_goals > 1 ? `×${player.in_match_goals}` : ''}
              </span>
            )}
            {player.yellowCards === 1 && <span className="text-[8px]">🟨</span>}
            {(player.yellowCards === 2 || player.isRed) && <span className="text-[8px]">🟥</span>}
          </div>
        )}

        {/* In-Game Status (Injured / Suspended) */}
        {(isSuspended || isInjured) && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
            {isSuspended ? (
              <span className="px-1.5 py-0.5 rounded-md bg-red-950/95 border border-red-500 text-red-300 font-black text-[8px] sm:text-[9px] whitespace-nowrap shadow-lg">
                🟥 محروم
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-md bg-rose-950/95 border border-rose-500 text-rose-300 font-black text-[8px] sm:text-[9px] whitespace-nowrap shadow-lg">
                🩹 مصدوم
              </span>
            )}
          </div>
        )}

        {/* Player Name Banner at Bottom of Card */}
        <div className="absolute bottom-2.5 left-1 right-1 flex flex-col items-center leading-none px-1">
          <div className="text-[8px] sm:text-[9px] md:text-[10.5px] font-black text-white truncate max-w-full text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            {player.isCaptain && <span className="text-amber-400 ml-0.5">©</span>}
            {player.name}
          </div>

          {/* Micro Stamina Bar */}
          <div
            className="w-10 sm:w-12 md:w-14 h-1 bg-black/80 rounded-full overflow-hidden border border-white/10 p-0.2 mt-0.5 shadow-inner"
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
        <div className="mt-1 flex items-center justify-center pointer-events-none">
          <span
            className={`px-2 py-0.5 rounded-full bg-slate-950/95 border text-[9px] sm:text-[10px] md:text-[11px] font-black shadow-md font-sport tracking-wider ${
              POSITION_COLORS[slotPos] || 'border-slate-700/80 text-slate-300'
            }`}
          >
            {slotPos}
          </span>
        </div>
      )}
    </div>
  );
}
