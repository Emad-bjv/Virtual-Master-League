import React from 'react';
import { motion } from 'framer-motion';

export default function FCBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#050711] select-none">
      {/* 1. EA FC 26 Base Radial Gradient Field */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-[#060814] to-[#04050b]"></div>

      {/* 2. Floating Ambient Neon Aurora Orbs (GPU Accelerated) */}
      <motion.div
        animate={{
          x: [0, 60, -40, 0],
          y: [0, -50, 40, 0],
          scale: [1, 1.2, 0.9, 1],
          opacity: [0.35, 0.5, 0.35, 0.35],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ willChange: 'transform, opacity' }}
        className="absolute -top-32 -left-32 w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-[#00f3ff]/25 to-[#a855f7]/20 blur-[100px] transform-gpu"
      />

      <motion.div
        animate={{
          x: [0, -70, 50, 0],
          y: [0, 50, -60, 0],
          scale: [1, 1.25, 0.95, 1],
          opacity: [0.3, 0.45, 0.3, 0.3],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ willChange: 'transform, opacity' }}
        className="absolute -bottom-40 -right-40 w-[550px] h-[550px] rounded-full bg-gradient-to-br from-[#e6007e]/20 via-[#a855f7]/25 to-[#00f3ff]/15 blur-[120px] transform-gpu"
      />

      {/* 3. EA FC 26 Signature Grid Motif */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-60"></div>

      {/* 4. Lightweight Prism Sweep Beam */}
      <motion.div
        animate={{
          x: ['-100%', '200%'],
          opacity: [0, 0.4, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatDelay: 4,
        }}
        style={{ willChange: 'transform, opacity' }}
        className="absolute top-0 left-0 w-[500px] h-full bg-gradient-to-r from-transparent via-[#00f3ff]/10 to-transparent -skew-x-45 transform-gpu"
      />
    </div>
  );
}
