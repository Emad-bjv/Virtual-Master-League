import React, { memo } from 'react';

function FCBackgroundComponent() {
  return (
    <div 
      className="fixed inset-0 w-screen h-screen pointer-events-none -z-10 overflow-hidden bg-[#05080e]"
      style={{
        transform: 'translateZ(0)',
        willChange: 'transform',
        contain: 'strict'
      }}
    >
      {/* Layer 1: High-Resolution Stadium Atmospheric Base Image */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-35"
        style={{ 
          backgroundImage: "url('/images/360_F_924834315_LMSw527EXDbJ1VOtebeYiALAw9qbWQF8.webp')",
          transform: 'translate3d(0, 0, 0)',
        }}
      />

      {/* Layer 2: Geometric FC Diagonal Mesh & Triangular Wireframe Pattern */}
      <div className="absolute inset-0 fc-polygon-mesh opacity-50"></div>
      <div className="absolute inset-0 cyber-grid opacity-30"></div>

      {/* Layer 3: Stadium Floodlight Radial Spotlight Glows (Optimized CSS) */}
      {/* Top-Left: Cyber Cyan Stadium Spotlight */}
      <div 
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0, 243, 255, 0.16) 0%, rgba(6, 182, 212, 0.04) 50%, transparent 75%)',
        }}
      />

      {/* Top-Right: Hyper Violet & Magenta Stadium Spotlight */}
      <div 
        className="absolute -top-32 -right-32 w-[550px] h-[550px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.16) 0%, rgba(236, 72, 153, 0.05) 50%, transparent 75%)',
        }}
      />

      {/* Bottom: Electric Volt Green Pitch Turf Glow Reflection */}
      <div 
        className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(0, 255, 135, 0.10) 0%, rgba(16, 185, 129, 0.02) 60%, transparent 80%)',
        }}
      />

      {/* Layer 4: Deep Obsidian Vignette & Carbon Shading to Guarantee 100% UI Contrast */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(5, 8, 14, 0.45) 0%, rgba(5, 8, 14, 0.85) 80%, rgba(3, 5, 10, 0.95) 100%)',
        }}
      />
    </div>
  );
}

const FCBackground = memo(FCBackgroundComponent);
export default FCBackground;
