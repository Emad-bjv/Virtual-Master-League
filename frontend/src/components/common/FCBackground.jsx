import React from 'react';

export default function FCBackground() {
  return (
    <div className="fixed inset-0 w-screen h-screen pointer-events-none -z-10 overflow-hidden bg-[#05080e]">
      {/* Layer 1: High-Resolution Stadium Atmospheric Base Image */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-40 scale-105"
        style={{ 
          backgroundImage: "url('/images/360_F_924834315_LMSw527EXDbJ1VOtebeYiALAw9qbWQF8.webp')",
          backgroundAttachment: "fixed"
        }}
      />

      {/* Layer 2: Geometric FC Diagonal Mesh & Triangular Wireframe Pattern */}
      <div className="absolute inset-0 fc-polygon-mesh opacity-60"></div>
      <div className="absolute inset-0 cyber-grid opacity-40"></div>

      {/* Layer 3: Stadium Floodlight Radial Spotlight Glows */}
      {/* Top-Left: Cyber Cyan Stadium Spotlight */}
      <div 
        className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0, 243, 255, 0.18) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 75%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Top-Right: Hyper Violet & Magenta Stadium Spotlight */}
      <div 
        className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, rgba(236, 72, 153, 0.06) 50%, transparent 75%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Bottom: Electric Volt Green Pitch Turf Glow Reflection */}
      <div 
        className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[800px] h-[450px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(0, 255, 135, 0.12) 0%, rgba(16, 185, 129, 0.03) 60%, transparent 80%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Layer 4: Deep Obsidian Vignette & Carbon Shading to Guarantee 100% UI Contrast */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(5, 8, 14, 0.5) 0%, rgba(5, 8, 14, 0.88) 80%, rgba(3, 5, 10, 0.96) 100%)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)'
        }}
      />
    </div>
  );
}
