import React from 'react';
import { Shield, User } from 'lucide-react';
import { motion } from 'framer-motion';

// Color map for position badges matching eFootball standard (13 official positions)
export const POSITION_COLORS = {
  GK: 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black',
  CB: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold',
  LB: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold',
  RB: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold',
  DMF: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold',
  CMF: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold',
  AMF: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold',
  LMF: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold',
  RMF: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold',
  LWF: 'bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold',
  RWF: 'bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold',
  SS: 'bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold',
  CF: 'bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold',
};

export default function TacticalPitch({
  players = [],
  selectedPlayerId = null,
  onPlayerClick,
  formation = '4-3-3 (4-2-1-3)',
  readOnly = false,
  pitchTheme = 'neon-purple',
}) {
  return (
    <div className="relative w-full rounded-3xl p-3 md:p-5 border-2 border-cyan-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden fc-pitch-turf min-h-[580px] md:min-h-[660px] flex flex-col justify-between select-none">
      {/* 1. Realistic Stadium Turf Grass Mowing Stripes */}
      <div className="absolute inset-0 fc-pitch-mow-stripes opacity-70 pointer-events-none"></div>

      {/* Stadium Center Floodlight Glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0, 243, 255, 0.08) 0%, rgba(0, 255, 135, 0.04) 50%, transparent 80%)',
        }}
      />

      {/* Pitch Boundary Markings (Neon Cyan & Volt Line Art) */}
      <div className="absolute inset-3 border-2 border-cyan-400/60 rounded-2xl pointer-events-none shadow-[0_0_15px_rgba(0,243,255,0.2)]"></div>

      {/* Top Penalty Box (Away Goal) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-48 md:w-64 h-24 md:h-32 border-2 border-cyan-400/60 border-t-0 rounded-b-2xl pointer-events-none overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-10 border-2 border-cyan-400/40 border-t-0 rounded-b-xl"></div>
      </div>

      {/* Bottom Penalty Box (Home Goal / GK) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-48 md:w-64 h-24 md:h-32 border-2 border-cyan-400/60 border-b-0 rounded-t-2xl pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-10 border-2 border-cyan-400/40 border-b-0 rounded-t-xl"></div>
      </div>

      {/* Halfway Line & Center Circle */}
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-cyan-400/60 pointer-events-none shadow-[0_0_8px_rgba(0,243,255,0.3)]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 md:w-40 h-28 md:h-40 rounded-full border-2 border-cyan-400/60 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-cyan-300 pointer-events-none shadow-[0_0_10px_#00f3ff]"></div>

      {/* Subtle Watermark Shield */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <Shield size={180} className="text-cyan-400" />
      </div>

      {/* 2. Starting XI Players Rendered at Calculated Coordinates */}
      <div className="relative w-full h-[520px] md:h-[600px]">
        {players.map((player) => {
          const isSelected = selectedPlayerId === player.id;
          const isDimmed = selectedPlayerId && !isSelected;
          const posX = player.x_coord != null ? player.x_coord : 50;
          const posY = player.y_coord != null ? player.y_coord : 50;
          const posCode = player.position || player.naturalPosition || 'CMF';

          // Readiness / Stamina Calculation (linked with facilities & fatigue formula)
          const staminaPercent = Math.max(5, Math.min(100, Math.round(Number(player.stamina ?? player.virtual_stamina ?? 90))));
          const staminaColorClass =
            staminaPercent >= 80
              ? 'bg-[#00ff87] shadow-[0_0_8px_#00ff87]'
              : staminaPercent >= 50
              ? 'bg-cyan-400 shadow-[0_0_8px_#00f3ff]'
              : staminaPercent >= 30
              ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
              : 'bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse';

          const photoUrl = player.photo_url || player.image || player.avatar || null;

          return (
            <motion.div
              key={player.id}
              onClick={() => !readOnly && onPlayerClick && onPlayerClick(player)}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                left: `${posX}%`,
                top: `${posY}%`,
                scale: isSelected ? 1.12 : 1,
                opacity: isDimmed ? 0.35 : 1,
              }}
              transition={{
                left: { type: 'spring', stiffness: 95, damping: 14 },
                top: { type: 'spring', stiffness: 95, damping: 14 },
                scale: { duration: 0.15 },
                opacity: { duration: 0.15 },
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-[86px] md:w-[96px] flex flex-col items-center z-10 hover:z-30 transition-all ${
                readOnly ? 'cursor-default' : 'cursor-pointer active:scale-105 group'
              } ${
                isSelected
                  ? 'ring-4 ring-cyan-400 rounded-2xl p-1 bg-cyan-950/90 shadow-[0_0_30px_rgba(0,243,255,0.7)] animate-pulse'
                  : ''
              }`}
            >
              {/* Player Avatar / Photo Card Frame */}
              <div className="relative flex items-center justify-center">
                {/* Floating Event Badges */}
                {(player.goals > 0 ||
                  player.assists > 0 ||
                  player.yellowCards > 0 ||
                  player.isRed ||
                  player.is_injured ||
                  player.isInjured) && (
                  <div className="absolute -top-2 -right-6 flex flex-col items-start gap-0.5 pointer-events-none z-30 drop-shadow-md">
                    {player.goals > 0 && (
                      <span className="text-[9px] bg-emerald-950/95 text-emerald-300 px-1.5 py-0.2 rounded-full border border-emerald-400 font-black font-sport shadow-lg flex items-center gap-0.5 whitespace-nowrap">
                        ⚽🔥{player.goals > 1 ? `x${player.goals}` : ''}
                      </span>
                    )}
                    {player.assists > 0 && (
                      <span className="text-[9px] bg-cyan-950/95 text-cyan-300 px-1.5 py-0.2 rounded-full border border-cyan-400 font-black font-sport shadow-lg flex items-center gap-0.5 whitespace-nowrap">
                        🅰️🎯{player.assists > 1 ? `x${player.assists}` : ''}
                      </span>
                    )}
                    {player.yellowCards === 1 && (
                      <span className="text-[10px] drop-shadow-lg">🟨⚠️</span>
                    )}
                    {player.yellowCards === 2 && (
                      <span className="text-[10px] drop-shadow-lg">🟨🟨 🟥⛔</span>
                    )}
                    {player.isRed && (
                      <span className="text-[10px] drop-shadow-lg">🟥⛔</span>
                    )}
                    {(player.is_injured || player.isInjured) && (
                      <span className="text-[10px] drop-shadow-lg animate-pulse">🚑🩹</span>
                    )}
                  </div>
                )}

                {/* FUT Portrait Photo Card Frame (Proportional Portrait 1:1.15) */}
                <div
                  className={`relative flex items-center justify-center w-12 h-14 md:w-14 md:h-16 rounded-2xl overflow-hidden border-2 shadow-2xl transition-all ${
                    player.isRed
                      ? 'border-rose-600 ring-2 ring-rose-600/80 bg-rose-950/90 text-rose-300 opacity-60 grayscale'
                      : player.is_injured || player.isInjured
                      ? 'border-amber-500 ring-2 ring-amber-500/80 bg-amber-950/90 text-amber-300 animate-pulse'
                      : player.goals > 0
                      ? 'border-emerald-400 ring-2 ring-emerald-400/60 bg-emerald-950/80'
                      : isSelected
                      ? 'border-cyan-400 bg-cyan-900/70 ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(0,243,255,0.6)]'
                      : 'border-slate-400/60 bg-gradient-to-b from-[#0d162a] to-[#05080e] group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(0,243,255,0.4)]'
                  }`}
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={player.name}
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextSibling) {
                          e.currentTarget.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}

                  {/* Fallback Icon Container */}
                  <div
                    className={`w-full h-full flex items-center justify-center bg-gradient-to-b from-[#0f172a] to-[#05080e] ${
                      photoUrl ? 'hidden' : 'flex'
                    }`}
                  >
                    <User size={26} className="text-slate-300 opacity-85" />
                  </div>

                  {/* Shirt Number Tag Overlay */}
                  {player.shirt_number != null && (
                    <span className="absolute bottom-0 right-0 bg-[#05080e]/95 text-cyan-300 text-[8px] md:text-[9px] font-sport font-black px-1 rounded-tl-md border-t border-l border-cyan-500/30">
                      #{player.shirt_number}
                    </span>
                  )}
                </div>
              </div>

              {/* Badge Pill: Position + Championship Gold OVR Rating */}
              <div className="flex items-center gap-1 mt-1 shadow-lg z-10">
                <span
                  className={`text-[8px] md:text-[9px] px-1.5 py-0.2 rounded-md shadow ${
                    POSITION_COLORS[posCode] || 'bg-purple-600 text-white font-bold'
                  }`}
                >
                  {posCode}
                </span>
                <span className="text-[10.5px] md:text-xs font-black text-amber-300 bg-amber-950/90 border border-amber-400/50 px-1 rounded-md drop-shadow font-sport tracking-wide">
                  {player.overall}
                </span>
              </div>

              {/* Player Name Tag (Structured & Truncated to avoid overlap) */}
              <span className="text-[9px] md:text-[10px] font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] text-center whitespace-nowrap leading-none mt-0.5 max-w-[84px] md:max-w-[92px] truncate bg-[#05080e]/80 px-1.5 py-0.5 rounded-md border border-white/10">
                {player.isCaptain && (
                  <span className="bg-amber-400 text-black font-black text-[7.5px] px-1 ml-0.5 rounded">
                    C
                  </span>
                )}
                {player.name}
              </span>

              {/* Stamina / Readiness Bar under Player Name */}
              <div 
                className="w-13 md:w-15 h-1.5 bg-[#05080e]/95 rounded-full overflow-hidden border border-white/15 p-0.2 mt-0.5 shadow-inner"
                title={`میزان آمادگی و استقامت: ${staminaPercent}٪`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${staminaColorClass}`}
                  style={{ width: `${staminaPercent}%` }}
                ></div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 3. Formation Badge in Bottom Right Corner */}
      <div className="relative z-20 text-right pt-1 pr-1 flex justify-between items-end bg-[#080c14]/70 p-2.5 rounded-2xl border border-white/10 backdrop-blur-md">
        <span className="text-xs text-cyan-300 font-bold">ترکیب رسمی ۱۱ نفره (Formation)</span>
        <span className="text-lg md:text-2xl font-black text-white font-sport tracking-wider drop-shadow-md">
          {formation}
        </span>
      </div>
    </div>
  );
}
