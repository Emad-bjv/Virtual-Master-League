import React from 'react';
import { ArrowUp, Gem } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FacilityCard({
  facilityKey,
  facilityName,
  level,
  icon: Icon,
  formulaText,
  curvePercent,
  handleUpgrade,
  upgradingFacility,
  extraDescription,
  imageFolder = 'camp',
  currentGems = 0,
}) {
  // Calculate tier (1 to 5)
  const getTier = (lvl) => {
    if (lvl >= 20) return 5;
    if (lvl >= 15) return 4;
    if (lvl >= 10) return 3;
    if (lvl >= 5) return 2;
    return 1;
  };

  const tier = getTier(level);
  const isMaxLevel = level >= 20;
  const gemCost = 15 + ((level || 0) * 15);
  const hasEnoughGems = Number(currentGems) >= gemCost;
  
  // Decide image path
  const imagePath = `/assets/facilities/${imageFolder}/tier${tier}.jpg`;

  // Determine CSS classes for animation based on tier
  let imageAnimationClass = '';
  let cardBorderClass = 'border-slate-700/60';
  let glowEffect = null;

  if (tier === 3) {
    cardBorderClass = 'border-cyan-500/50 shadow-[0_0_15px_rgba(0,243,255,0.2)]';
    imageAnimationClass = 'hover:scale-105 transition-transform duration-700';
  } else if (tier === 4) {
    cardBorderClass = 'border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.3)]';
    imageAnimationClass = 'animate-[pulse_4s_ease-in-out_infinite] hover:scale-105 transition-transform duration-700';
  } else if (tier === 5) {
    cardBorderClass = 'border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)]';
    imageAnimationClass = 'animate-[pulse_3s_ease-in-out_infinite] hover:scale-110 transition-transform duration-700';
    glowEffect = (
      <div className="absolute inset-0 bg-gradient-to-t from-amber-500/30 to-transparent mix-blend-overlay animate-[pulse_2s_ease-in-out_infinite]"></div>
    );
  }

  return (
    <motion.div 
      whileHover={{ y: -3 }}
      className={`fc-card rounded-3xl border ${cardBorderClass} overflow-hidden flex flex-col relative transition-all duration-500`}
    >
      {/* Image Header section */}
      <div className="relative h-32 w-full overflow-hidden bg-slate-950">
        <img 
          src={imagePath} 
          alt={`${facilityName} Tier ${tier}`}
          className={`w-full h-full object-cover ${imageAnimationClass}`}
          onError={(e) => {
            e.target.src = `/assets/facilities/camp/tier${tier}.jpg`;
          }}
        />
        {glowEffect}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080c14] via-[#080c14]/40 to-transparent"></div>
        
        <div className="absolute bottom-2.5 left-3.5 right-3.5 flex justify-between items-end">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#05080e]/90 rounded-xl backdrop-blur-md border border-cyan-500/30 shadow-md">
              {Icon ? <Icon size={16} className="text-cyan-400" /> : <div className="w-4 h-4 bg-cyan-400 rounded-full" />}
            </div>
            <div>
              <span className="font-black text-white text-sm tracking-tight drop-shadow-md">{facilityName}</span>
            </div>
          </div>
          <span className="text-xs font-black text-white bg-[#05080e]/90 border border-slate-700 px-2.5 py-0.5 rounded-full dir-ltr shadow-md font-sport">
            LVL {level} / 20
          </span>
        </div>
        
        {/* Tier Indicator */}
        <div className="absolute top-2 right-2">
          <span className="text-[10px] font-black text-amber-300 bg-[#05080e]/80 px-2.5 py-0.5 rounded-lg backdrop-blur-md border border-amber-400/40 font-sport">
            TIER {tier}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex flex-col gap-3 text-xs bg-[#080c14]/70 flex-grow">
        <div className="text-[10px] text-cyan-300 font-sport bg-cyan-950/40 p-2 rounded-xl border border-cyan-500/30">
          {formulaText}
        </div>

        <div className="space-y-1.5">
          <div className="w-full h-2 bg-[#05080e] rounded-full overflow-hidden border border-white/5 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                tier >= 4 
                  ? 'bg-gradient-to-r from-purple-500 via-amber-400 to-[#00ff87] shadow-[0_0_10px_rgba(0,255,135,0.4)]' 
                  : 'bg-gradient-to-r from-cyan-500 to-[#00ff87]'
              }`}
              style={{ width: `${(level / 20) * 100}%` }}
            ></div>
          </div>
          <div className="text-[10.5px] text-slate-400 font-sport">منحنی پتانسیل: <strong className="text-cyan-300">{curvePercent}٪</strong></div>
        </div>

        <div className="flex justify-between items-center mt-auto pt-2.5 border-t border-slate-800/80">
          <span className="text-[10px] text-slate-400 font-medium">{extraDescription}</span>
          <button
            onClick={() => handleUpgrade(facilityKey)}
            disabled={upgradingFacility === facilityKey || isMaxLevel || !hasEnoughGems}
            className={`font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all text-xs font-sport cursor-pointer ${
              isMaxLevel 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : !hasEnoughGems
                ? 'bg-slate-900 text-amber-400 border border-amber-500/40 hover:bg-slate-800'
                : 'fc-btn-volt text-slate-950 shadow-md active:scale-95'
            }`}
            title={!hasEnoughGems ? `نیاز به ${gemCost} جم دارید (موجودی شما: ${currentGems})` : `ارتقا با هزینه ${gemCost} جم`}
          >
            {isMaxLevel ? (
              <span>MAX LEVEL</span>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <Gem size={12} className={hasEnoughGems ? 'text-slate-950' : 'text-amber-400'} />
                  <span>{gemCost}</span>
                </div>
                <ArrowUp size={13} className={upgradingFacility === facilityKey ? 'animate-bounce' : ''} />
                <span>{upgradingFacility === facilityKey ? 'در حال ارتقا...' : 'ارتقاء'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
