import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Gem, Maximize2, X, Sparkles, Users, GraduationCap, TrendingUp, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../common/ConfirmModal';

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
  youngPlayersList = [],
  phaseBadge = '',
  scenarioText = '',
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [isTalentsModalOpen, setIsTalentsModalOpen] = useState(false);

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

  // Decide image path with clean /facilities/ endpoint
  const primaryImagePath = `/facilities/${imageFolder}/tier${tier}.jpg`;
  const fallbackImagePath = `/facilities/camp/tier${tier}.jpg`;

  const handleImageError = (e) => {
    // Only fallback if the failed src is not already the fallback
    if (!e.target.src.includes(`/facilities/camp/tier${tier}.jpg`)) {
      e.target.src = fallbackImagePath;
    }
  };

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
      <div className="absolute inset-0 bg-gradient-to-t from-amber-500/30 to-transparent mix-blend-overlay animate-[pulse_2s_ease-in-out_infinite] pointer-events-none"></div>
    );
  }

  return (
    <>
      <motion.div
        whileHover={{ y: -4 }}
        className={`fc-card rounded-3xl border ${cardBorderClass} overflow-hidden flex flex-col relative transition-all duration-500 shadow-xl`}
      >
        {/* Image Header section - Increased height (h-48 sm:h-56) for rich display */}
        <div
          className="relative h-48 sm:h-56 w-full overflow-hidden bg-slate-950 cursor-pointer group"
          onClick={() => setIsPreviewOpen(true)}
        >
          <img
            src={primaryImagePath}
            alt={`${facilityName} Tier ${tier}`}
            className={`w-full h-full object-cover object-center ${imageAnimationClass}`}
            onError={handleImageError}
          />
          {glowEffect}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080c14] via-[#080c14]/30 to-transparent"></div>

          {/* Zoom / Lightbox Prompt Button */}
          <div className="absolute top-2.5 left-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              className="p-2 bg-[#05080e]/90 text-cyan-400 hover:text-white rounded-xl backdrop-blur-md border border-cyan-500/40 shadow-lg flex items-center gap-1 text-[11px] font-bold font-sport"
              onClick={(e) => {
                e.stopPropagation();
                setIsPreviewOpen(true);
              }}
            >
              <Maximize2 size={14} />
              <span>مشاهده تصویر کامل</span>
            </button>
          </div>

          <div className="absolute bottom-2.5 left-3.5 right-3.5 flex justify-between items-end">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#05080e]/90 rounded-xl backdrop-blur-md border border-cyan-500/40 shadow-md">
                {Icon ? <Icon size={18} className="text-cyan-400" /> : <div className="w-4 h-4 bg-cyan-400 rounded-full" />}
              </div>
              <div>
                <span className="font-black text-white text-sm sm:text-base tracking-tight drop-shadow-md block">{facilityName}</span>
              </div>
            </div>
            <span className="text-xs font-black text-white bg-[#05080e]/90 border border-slate-700 px-2.5 py-0.5 rounded-full dir-ltr shadow-md font-sport">
              LVL {level} / 20
            </span>
          </div>

          {/* Tier Indicator */}
          <div className="absolute top-2.5 right-2.5">
            <span className="text-[10px] font-black text-amber-300 bg-[#05080e]/90 px-3 py-1 rounded-xl backdrop-blur-md border border-amber-400/50 shadow-md font-sport flex items-center gap-1">
              <Sparkles size={11} className="text-amber-400" />
              TIER {tier}
            </span>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4 flex flex-col gap-2.5 text-xs bg-[#080c14]/80 flex-grow">
          {/* Operational Phase Badge */}
          {phaseBadge && (
            <div className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-700/80 text-[10.5px]">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                {phaseBadge}
              </span>
            </div>
          )}

          {/* Formula Text */}
          <div className="text-[11px] text-cyan-300 font-sport bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-500/30 font-bold">
            {formulaText}
          </div>

          {/* Tactical Scenario Context */}
          {scenarioText && (
            <p className="text-[10.5px] text-slate-300 leading-relaxed bg-[#05080e]/70 p-2 rounded-xl border border-white/5 font-sans">
              {scenarioText}
            </p>
          )}

          {/* Special Youth Academy Talents Pill (Clean & Luxury) */}
          {facilityKey === 'academy_level' && youngPlayersList && youngPlayersList.length > 0 && (
            <button
              type="button"
              onClick={() => setIsTalentsModalOpen(true)}
              className="w-full flex items-center justify-between p-2 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/90 to-purple-950/40 border border-purple-500/30 hover:border-purple-400/60 hover:bg-slate-900 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2 rtl:space-x-reverse items-center">
                  {youngPlayersList.slice(0, 3).map((yp, idx) => (
                    <div
                      key={yp.id || idx}
                      className="w-6 h-6 rounded-full border border-purple-400/80 bg-slate-800 flex items-center justify-center text-[9px] font-bold text-white shadow overflow-hidden"
                    >
                      {yp.photo_url ? (
                        <img src={yp.photo_url} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        yp.name?.charAt(0)
                      )}
                    </div>
                  ))}
                  {youngPlayersList.length > 3 && (
                    <div className="w-6 h-6 rounded-full border border-purple-400/80 bg-purple-900/90 flex items-center justify-center text-[8.5px] font-bold text-purple-200 shadow font-sport">
                      +{youngPlayersList.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-200 group-hover:text-purple-300 transition-colors">
                  {youngPlayersList.length} بازیکن مستعد تحت پوشش
                </span>
              </div>
              <span className="text-[10px] text-purple-300 font-sport bg-purple-900/60 px-2 py-0.5 rounded-lg border border-purple-400/30 flex items-center gap-1 group-hover:bg-purple-800/80">
                <span>مشاهده</span>
                <Users size={11} />
              </span>
            </button>
          )}

          <div className="space-y-1.5">
            <div className="w-full h-2 bg-[#05080e] rounded-full overflow-hidden border border-white/10 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${tier >= 4
                    ? 'bg-gradient-to-r from-purple-500 via-amber-400 to-[#00ff87] shadow-[0_0_10px_rgba(0,255,135,0.4)]'
                    : 'bg-gradient-to-r from-cyan-500 to-[#00ff87]'
                  }`}
                style={{ width: `${(level / 20) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[10.5px] text-slate-400 font-sport">
              <span>منحنی پتانسیل: <strong className="text-cyan-300">{curvePercent}٪</strong></span>
              <span className="text-slate-500 text-[10px]">مرحله {tier} از ۵</span>
            </div>
          </div>

          <div className="flex justify-between items-center mt-auto pt-3 border-t border-slate-800/80">
            <span className="text-[10.5px] text-slate-400 font-medium">{extraDescription}</span>
            <button
              onClick={() => setShowUpgradeConfirm(true)}
              disabled={upgradingFacility === facilityKey || isMaxLevel || !hasEnoughGems}
              className={`font-black px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all text-xs font-sport cursor-pointer ${isMaxLevel
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

      {/* Upgrade Confirmation Modal */}
      <ConfirmModal
        isOpen={showUpgradeConfirm}
        title={`ارتقای ${facilityName}`}
        message={
          facilityKey === 'academy_level'
            ? `آیا از ارتقای سطح آکادمی جوانان به سطح ${(level || 0) + 1} و افزایش سقف پتانسیل بازیکنان جوان تیم اطمینان دارید؟`
            : `آیا از ارتقای سطح این بخش به سطح ${(level || 0) + 1} اطمینان دارید؟`
        }
        details={
          <div className="space-y-2 font-sport text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">هزینه ارتقا:</span>
              <span className="text-amber-400 font-black flex items-center gap-1">
                <Gem size={13} />
                {gemCost} جم
              </span>
            </div>
            {facilityKey === 'academy_level' && youngPlayersList && youngPlayersList.length > 0 && (
              <div className="text-cyan-300 text-[11px] bg-cyan-950/80 p-2 rounded-xl border border-cyan-500/30 leading-relaxed font-sans">
                🌟 با این ارتقا، شتاب رشد و سقف پتانسیل تمام <strong>{youngPlayersList.length}</strong> بازیکن جوان تیم شما (زیر ۲۴ سال) تقویت خواهد شد.
              </div>
            )}
          </div>
        }
        confirmText="بله، ارتقا بده"
        cancelText="خیر، انصراف"
        variant="warning"
        isLoading={upgradingFacility === facilityKey}
        onConfirm={() => {
          setShowUpgradeConfirm(false);
          handleUpgrade(facilityKey);
        }}
        onCancel={() => setShowUpgradeConfirm(false)}
      />

      {/* Young Talents Modal with createPortal */}
      {typeof document !== 'undefined' && isTalentsModalOpen && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
            onClick={() => setIsTalentsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative max-w-2xl w-full max-h-[85vh] bg-[#080c14] border border-purple-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950/80 via-slate-900 to-[#080c14] border-b border-purple-500/30 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-900/60 rounded-2xl border border-purple-400/40 text-purple-300 shadow-md">
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <span>استعدادهای جوان آکادمی</span>
                      <span className="text-[10px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-400/30 font-sport font-bold">
                        {youngPlayersList.length} بازیکن
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-sport mt-0.5">
                      جوانان زیر ۲۴ سال با شتاب رشد XP اختصاصی <strong className="text-purple-300">+{((level || 0) * 2.5).toFixed(1)}٪</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTalentsModalOpen(false)}
                  className="p-2 bg-slate-900/90 text-slate-400 hover:text-white rounded-full border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Player Cards Grid */}
              <div className="p-3 sm:p-4 overflow-y-auto flex-grow space-y-2 scrollbar-thin">
                {youngPlayersList.map((yp) => (
                  <div
                    key={yp.id}
                    className="p-3 rounded-2xl bg-[#0d1422] border border-slate-800/80 hover:border-purple-500/50 flex items-center justify-between transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-slate-950 border border-slate-700/80 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                        {yp.photo_url ? (
                          <img src={yp.photo_url} alt={yp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <span className="font-bold text-white text-sm">{yp.name?.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-xs sm:text-sm">{yp.name}</span>
                          <span className="text-[10px] text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-lg border border-cyan-500/30 font-sport font-bold">
                            {yp.position}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-sport mt-0.5 flex items-center gap-2">
                          <span>سن: <strong className="text-slate-200">{yp.age}</strong> سال</span>
                          <span>•</span>
                          <span>ارزش: <strong className="text-emerald-400">${yp.market_value ? Number(yp.market_value).toLocaleString('fa-IR') : '—'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 font-sport">
                      <div className="text-center px-2 py-1 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[9.5px] text-slate-400 block font-sans">اورال فعلی</span>
                        <span className="font-black text-white text-xs sm:text-sm">OVR {yp.overall}</span>
                      </div>
                      <div className="text-center px-2.5 py-1 rounded-xl bg-purple-950/60 border border-purple-500/40 shadow-sm">
                        <span className="text-[9.5px] text-purple-300 block font-sans">سقف پتانسیل</span>
                        <span className="font-black text-[#00ff87] text-xs sm:text-sm dir-ltr">POT {yp.potential_ovr}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between px-5 shrink-0 text-xs text-slate-400 font-sport">
                <span>وضعیت: تحت پوشش آکادمی تیم</span>
                <button
                  onClick={() => setIsTalentsModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Lightbox Modal for Full Artwork View with createPortal */}
      {typeof document !== 'undefined' && isPreviewOpen && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setIsPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-2xl w-full bg-[#080c14] border border-cyan-500/40 rounded-3xl overflow-hidden shadow-2xl space-y-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="absolute top-3 left-3 z-10 p-2 bg-[#05080e]/80 text-slate-300 hover:text-white rounded-full border border-slate-700 backdrop-blur-md cursor-pointer"
              >
                <X size={20} />
              </button>

              {/* Full Artwork Image */}
              <div className="relative w-full aspect-square bg-slate-950 overflow-hidden">
                <img
                  src={primaryImagePath}
                  alt={facilityName}
                  className="w-full h-full object-contain"
                  onError={handleImageError}
                />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#080c14] to-transparent"></div>
              </div>

              {/* Modal Info Footer */}
              <div className="p-5 space-y-3 bg-[#080c14]">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-white">{facilityName}</h3>
                    <p className="text-xs text-slate-400 font-sport">نمای کامل ارتقاء در سطح {level} (مرحله بصری Tier {tier})</p>
                  </div>
                  <span className="text-sm font-black text-amber-300 bg-amber-950/80 px-3 py-1 rounded-xl border border-amber-400/40 font-sport">
                    TIER {tier}
                  </span>
                </div>
                <div className="text-xs text-cyan-300 font-sport bg-cyan-950/40 p-3 rounded-2xl border border-cyan-500/30">
                  {formulaText}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
