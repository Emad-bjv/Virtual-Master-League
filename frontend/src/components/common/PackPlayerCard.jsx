import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Star, Zap, Award, Coins } from 'lucide-react';
import PackCardFXOverlay from './PackCardFXOverlay';
import legendaryCardBg from '../../assets/cards/legendary_card_bg.png';
import epicCardBg from '../../assets/cards/epic_card_bg.png';
import rareCardBg from '../../assets/cards/rare_card_bg.png';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';

const TIER_CONFIG = {
  LEGENDARY: {
    name: 'طلایی (Legendary)',
    badgeName: 'پک طلایی',
    bgImage: legendaryCardBg,
    borderColor: 'border-amber-400/80',
    hoverBorder: 'group-hover:border-amber-300',
    ringColor: 'ring-amber-400',
    glowShadow: 'shadow-[0_0_25px_rgba(245,158,11,0.55)]',
    hoverGlow: 'hover:shadow-[0_0_35px_rgba(251,191,36,0.8)]',
    accentText: 'text-amber-300',
    badgeBg: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950',
    numberBadge: 'bg-amber-400 text-slate-950',
    ovrColor: 'text-amber-300',
    fxTier: 'LEGENDARY',
  },
  EPIC: {
    name: 'بنفش (Epic)',
    badgeName: 'پک بنفش',
    bgImage: epicCardBg,
    borderColor: 'border-fuchsia-400/80',
    hoverBorder: 'group-hover:border-fuchsia-300',
    ringColor: 'ring-fuchsia-400',
    glowShadow: 'shadow-[0_0_25px_rgba(217,70,239,0.55)]',
    hoverGlow: 'hover:shadow-[0_0_35px_rgba(232,121,249,0.8)]',
    accentText: 'text-fuchsia-300',
    badgeBg: 'bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white',
    numberBadge: 'bg-fuchsia-400 text-slate-950',
    ovrColor: 'text-fuchsia-300',
    fxTier: 'SILVER',
  },
  RARE: {
    name: 'فیروزه‌ای (Rare)',
    badgeName: 'پک فیروزه‌ای',
    bgImage: rareCardBg,
    borderColor: 'border-cyan-400/80',
    hoverBorder: 'group-hover:border-cyan-300',
    ringColor: 'ring-cyan-400',
    glowShadow: 'shadow-[0_0_25px_rgba(6,182,212,0.55)]',
    hoverGlow: 'hover:shadow-[0_0_35px_rgba(103,232,249,0.8)]',
    accentText: 'text-cyan-300',
    badgeBg: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950',
    numberBadge: 'bg-cyan-400 text-slate-950',
    ovrColor: 'text-cyan-300',
    fxTier: 'BRONZE',
  },
};

export function isPackPlayer(player) {
  if (!player) return false;
  return Boolean(player.is_from_pack || (player.custom_photo && String(player.custom_photo).includes('packs/')));
}

export function getPackTierConfig(tierRaw = 'LEGENDARY') {
  const norm = String(tierRaw || 'LEGENDARY').toUpperCase();
  if (norm.includes('SILVER') || norm.includes('EPIC')) return TIER_CONFIG.EPIC;
  if (norm.includes('BRONZE') || norm.includes('RARE')) return TIER_CONFIG.RARE;
  return TIER_CONFIG.LEGENDARY;
}

export default function PackPlayerCard({
  player,
  size = 'md', // 'sm' | 'md' | 'lg'
  className = '',
  onClick = null,
  showFx = true,
  interactive = true,
}) {
  if (!player) return null;

  const rawTier = player.pack_tier || player.rarity || 'LEGENDARY';
  const config = getPackTierConfig(rawTier);
  const photoUrl = getPlayerPhotoUrl(player);

  // Size specific styles
  const sizeStyles = {
    sm: {
      card: 'w-24 h-36 rounded-xl text-[9px]',
      ovr: 'text-sm font-black',
      pos: 'text-[8px] px-1 py-0.2',
      name: 'text-[10px] font-black line-clamp-1',
      photo: 'w-16 h-20 -mt-1',
      badge: 'text-[7px] px-1 py-0.2',
      badgeIconSize: 8,
    },
    md: {
      card: 'w-36 sm:w-40 h-52 sm:h-56 rounded-2xl text-xs',
      ovr: 'text-xl sm:text-2xl font-black',
      pos: 'text-[10px] px-1.5 py-0.5',
      name: 'text-xs sm:text-sm font-black line-clamp-1',
      photo: 'w-24 sm:w-28 h-28 sm:h-32 -mt-2',
      badge: 'text-[8.5px] px-1.5 py-0.5',
      badgeIconSize: 10,
    },
    lg: {
      card: 'w-56 sm:w-64 h-80 sm:h-92 rounded-3xl text-sm',
      ovr: 'text-3xl sm:text-4xl font-black',
      pos: 'text-xs px-2 py-0.5',
      name: 'text-base sm:text-lg font-black line-clamp-1',
      photo: 'w-36 sm:w-44 h-44 sm:h-52 -mt-4',
      badge: 'text-[10px] px-2 py-0.5',
      badgeIconSize: 12,
    },
  }[size] || sizeStyles.md;

  return (
    <motion.div
      whileHover={interactive ? { scale: 1.04, y: -4 } : {}}
      whileTap={interactive ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`relative select-none overflow-hidden group transition-all duration-300 ${sizeStyles.card} ${config.borderColor} ${config.hoverBorder} ${config.glowShadow} ${config.hoverGlow} border-2 ${interactive ? 'cursor-pointer' : ''} ${className}`}
      style={{
        backgroundImage: `url(${config.bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        isolation: 'isolate',
      }}
    >
      {/* 1. Holographic & Particle Special FX Layer */}
      {showFx && (
        <PackCardFXOverlay
          tier={config.fxTier}
          intensity={size === 'lg' ? 'high' : 'normal'}
          showSheen={true}
          showStars={true}
          showSparks={size !== 'sm'}
        />
      )}

      {/* 2. Top-Right Special Pack Edition Badge */}
      <div className="absolute top-2 left-2 z-30">
        <span className={`inline-flex items-center gap-1 rounded-full font-black shadow-md font-sport tracking-tight ${sizeStyles.badge} ${config.badgeBg}`}>
          <Sparkles size={sizeStyles.badgeIconSize} className="animate-spin" style={{ animationDuration: '4s' }} />
          <span>{config.badgeName}</span>
        </span>
      </div>

      {/* 3. Top-Left OVR & Position Stack */}
      <div className="absolute top-2 right-2.5 z-30 flex flex-col items-center leading-none text-right font-sport">
        <span className={`drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-tight ${sizeStyles.ovr} ${config.ovrColor}`}>
          {player.overall || 75}
        </span>
        <span className={`mt-0.5 rounded-md font-black bg-slate-950/80 border border-white/20 text-white shadow ${sizeStyles.pos}`}>
          {player.position || 'CMF'}
        </span>
        {player.shirt_number != null && (
          <span className="text-[9px] text-slate-300/80 font-sport mt-0.5">
            #{player.shirt_number}
          </span>
        )}
      </div>

      {/* 4. Center Player Cut-Out Photo */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className={`relative flex items-center justify-center ${sizeStyles.photo}`}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={player.name}
              className="w-full h-full object-contain object-bottom drop-shadow-[0_10px_15px_rgba(0,0,0,0.85)] filter contrast-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-40">
              <Award size={size === 'lg' ? 64 : 36} className="text-white" />
            </div>
          )}
        </div>
      </div>

      {/* 5. Bottom Player Name Banner & Details */}
      <div className="absolute bottom-0 inset-x-0 z-30 p-2 pb-2.5 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent text-center flex flex-col items-center">
        {/* Name with text glow */}
        <span
          className={`text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] tracking-tight font-black ${sizeStyles.name}`}
          title={player.name}
        >
          {player.name}
        </span>

        {/* Level & Stars Indicator */}
        <div className="flex items-center justify-center gap-1.5 mt-0.5 text-[9px] text-slate-300 font-sport">
          {(player.level || 1) > 1 ? (
            <span className="inline-flex items-center gap-0.5 text-amber-300 font-bold">
              <Zap size={9} className="text-amber-400" />
              <span>لول {player.level}</span>
            </span>
          ) : (
            <span className="text-slate-400 text-[8.5px]">نسخه اورجینال</span>
          )}

          {/* Optional Nation / Club */}
          {(player.nationality || player.prime_club) && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 text-[8.5px] truncate max-w-[80px]">
                {player.nationality || player.prime_club}
              </span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
