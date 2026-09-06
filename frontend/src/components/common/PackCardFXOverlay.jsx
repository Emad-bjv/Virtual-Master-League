import React from 'react';
import { motion } from 'framer-motion';

// Four-pointed star SVG component (Iconic EA FC Sparkle)
function SparkleStar({ className, size = 16, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}

// Spark Particle positions and movement parameters
const PARTICLES = [
  { id: 1, left: '15%', bottom: '10%', size: 3, delay: 0, duration: 3.2, xDrift: -8 },
  { id: 2, left: '28%', bottom: '15%', size: 4, delay: 0.8, duration: 3.8, xDrift: 10 },
  { id: 3, left: '45%', bottom: '8%', size: 3, delay: 1.5, duration: 4.2, xDrift: -6 },
  { id: 4, left: '62%', bottom: '12%', size: 5, delay: 0.4, duration: 3.5, xDrift: 12 },
  { id: 5, left: '80%', bottom: '18%', size: 3, delay: 2.1, duration: 4.0, xDrift: -10 },
  { id: 6, left: '20%', bottom: '35%', size: 4, delay: 1.2, duration: 3.6, xDrift: 8 },
  { id: 7, left: '72%', bottom: '30%', size: 3, delay: 2.5, duration: 3.9, xDrift: -12 },
  { id: 8, left: '50%', bottom: '25%', size: 4, delay: 0.2, duration: 4.4, xDrift: 6 },
];

const TIER_FX_CONFIG = {
  LEGENDARY: {
    starColor: 'text-amber-300',
    starGlow: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.85)) drop-shadow(0 0 16px rgba(245, 158, 11, 0.6))',
    particleBg: 'bg-amber-300',
    particleShadow: '0 0 10px #fbbf24, 0 0 20px #f59e0b',
    sheenGradient: 'linear-gradient(105deg, transparent 20%, rgba(254, 240, 138, 0.35) 45%, rgba(245, 158, 11, 0.45) 50%, rgba(254, 240, 138, 0.35) 55%, transparent 80%)',
    ambientAura: 'radial-gradient(ellipse at 50% 50%, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
  },
  SILVER: {
    starColor: 'text-fuchsia-300',
    starGlow: 'drop-shadow(0 0 8px rgba(232, 121, 249, 0.85)) drop-shadow(0 0 16px rgba(168, 85, 247, 0.6))',
    particleBg: 'bg-fuchsia-300',
    particleShadow: '0 0 10px #e879f9, 0 0 20px #a855f7',
    sheenGradient: 'linear-gradient(105deg, transparent 20%, rgba(245, 208, 254, 0.35) 45%, rgba(192, 132, 252, 0.45) 50%, rgba(245, 208, 254, 0.35) 55%, transparent 80%)',
    ambientAura: 'radial-gradient(ellipse at 50% 50%, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
  },
  BRONZE: {
    starColor: 'text-cyan-300',
    starGlow: 'drop-shadow(0 0 8px rgba(103, 232, 249, 0.85)) drop-shadow(0 0 16px rgba(14, 165, 233, 0.6))',
    particleBg: 'bg-cyan-300',
    particleShadow: '0 0 10px #67e8f9, 0 0 20px #0ea5e9',
    sheenGradient: 'linear-gradient(105deg, transparent 20%, rgba(207, 250, 254, 0.35) 45%, rgba(56, 189, 248, 0.45) 50%, rgba(207, 250, 254, 0.35) 55%, transparent 80%)',
    ambientAura: 'radial-gradient(ellipse at 50% 50%, rgba(14, 165, 233, 0.15) 0%, transparent 70%)',
  }
};

export default function PackCardFXOverlay({
  tier = 'LEGENDARY',
  intensity = 'normal', // 'subtle' | 'normal' | 'high'
  showSheen = true,
  showStars = true,
  showSparks = true,
  className = '',
}) {
  const normTier = String(tier || 'LEGENDARY').toUpperCase();
  const config = TIER_FX_CONFIG[normTier] || TIER_FX_CONFIG.LEGENDARY;

  const isHigh = intensity === 'high';
  const isSubtle = intensity === 'subtle';

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-20 ${className}`}
      style={{ isolation: 'isolate' }}
    >
      {/* 1. Ambient Breathing Aura */}
      <motion.div
        className="absolute inset-0"
        style={{ background: config.ambientAura }}
        animate={{
          opacity: isSubtle ? [0.3, 0.5, 0.3] : [0.4, 0.8, 0.4],
          scale: [0.98, 1.02, 0.98],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* 2. Holographic Light Sweep / Sheen */}
      {showSheen && (
        <motion.div
          className="absolute -inset-full opacity-0 group-hover:opacity-100"
          style={{
            background: config.sheenGradient,
            width: '250%',
            height: '250%',
          }}
          animate={{
            x: ['-100%', '100%'],
            opacity: [0, 0.85, 0],
          }}
          transition={{
            duration: isHigh ? 2.5 : 4,
            repeat: Infinity,
            repeatDelay: isHigh ? 1.5 : 3,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* 3. Rising Floating Sparks / Embers */}
      {showSparks &&
        PARTICLES.slice(0, isSubtle ? 4 : isHigh ? 8 : 6).map((p) => (
          <motion.div
            key={p.id}
            className={`absolute rounded-full ${config.particleBg}`}
            style={{
              left: p.left,
              bottom: p.bottom,
              width: p.size,
              height: p.size,
              boxShadow: config.particleShadow,
            }}
            animate={{
              y: [0, -60, -110],
              x: [0, p.xDrift, p.xDrift * 1.5],
              opacity: [0, 0.9, 0],
              scale: [0.6, 1.2, 0.3],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        ))}

      {/* 4. Orbiting & Rotating Sparkle Stars */}
      {showStars && (
        <>
          {/* Top-Right Star */}
          <motion.div
            className="absolute top-2 right-2 flex items-center justify-center"
            animate={{
              rotate: [0, 180, 360],
              scale: [0.85, 1.25, 0.85],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              rotate: { duration: 6, repeat: Infinity, ease: 'linear' },
              scale: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <SparkleStar
              size={isHigh ? 22 : 18}
              className={config.starColor}
              style={{ filter: config.starGlow }}
            />
          </motion.div>

          {/* Top-Left Star */}
          <motion.div
            className="absolute top-3 left-3 flex items-center justify-center"
            animate={{
              rotate: [360, 180, 0],
              scale: [0.75, 1.15, 0.75],
              opacity: [0.5, 0.95, 0.5],
            }}
            transition={{
              rotate: { duration: 7.5, repeat: Infinity, ease: 'linear' },
              scale: { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
              opacity: { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
            }}
          >
            <SparkleStar
              size={isHigh ? 18 : 14}
              className={config.starColor}
              style={{ filter: config.starGlow }}
            />
          </motion.div>

          {/* Mid-Left Star */}
          <motion.div
            className="absolute top-1/3 left-1.5 flex items-center justify-center"
            animate={{
              rotate: [0, 360],
              scale: [0.7, 1.1, 0.7],
              opacity: [0.4, 0.9, 0.4],
            }}
            transition={{
              rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
              scale: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 },
              opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 },
            }}
          >
            <SparkleStar
              size={isHigh ? 16 : 12}
              className={config.starColor}
              style={{ filter: config.starGlow }}
            />
          </motion.div>

          {/* Mid-Right Star */}
          <motion.div
            className="absolute top-1/2 right-1.5 flex items-center justify-center"
            animate={{
              rotate: [360, 0],
              scale: [0.8, 1.2, 0.8],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              rotate: { duration: 6.5, repeat: Infinity, ease: 'linear' },
              scale: { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 1.4 },
              opacity: { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 1.4 },
            }}
          >
            <SparkleStar
              size={isHigh ? 18 : 13}
              className={config.starColor}
              style={{ filter: config.starGlow }}
            />
          </motion.div>

          {/* Bottom-Left Star */}
          <motion.div
            className="absolute bottom-6 left-2.5 flex items-center justify-center"
            animate={{
              rotate: [0, 360],
              scale: [0.7, 1.15, 0.7],
              opacity: [0.4, 0.85, 0.4],
            }}
            transition={{
              rotate: { duration: 9, repeat: Infinity, ease: 'linear' },
              scale: { duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
              opacity: { duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
            }}
          >
            <SparkleStar
              size={13}
              className={config.starColor}
              style={{ filter: config.starGlow }}
            />
          </motion.div>

          {/* Bottom-Right Star */}
          <motion.div
            className="absolute bottom-7 right-2.5 flex items-center justify-center"
            animate={{
              rotate: [360, 0],
              scale: [0.75, 1.2, 0.75],
              opacity: [0.5, 0.9, 0.5],
            }}
            transition={{
              rotate: { duration: 7, repeat: Infinity, ease: 'linear' },
              scale: { duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1.8 },
              opacity: { duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1.8 },
            }}
          >
            <SparkleStar
              size={14}
              className={config.starColor}
              style={{ filter: config.starGlow }}
            />
          </motion.div>
        </>
      )}
    </div>
  );
}
