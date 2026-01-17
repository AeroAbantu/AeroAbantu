
import React from 'react';

interface CosmoLogoProps {
  className?: string;
  size?: number;
}

const CosmoLogo: React.FC<CosmoLogoProps> = ({ className = "", size = 32 }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]"
      >
        {/* Outer Hexagon Frame */}
        <path
          d="M50 5L89.5 27.5V72.5L50 95L10.5 72.5V27.5L50 5Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
          className="text-cyan-500/50"
        />
        
        {/* Inner Glowing Hexagon */}
        <path
          d="M50 15L80.5 32.5V67.5L50 85L19.5 67.5V32.5L50 15Z"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-cyan-400 animate-pulse"
        />

        {/* The 'C' and 'G' Fusion / Planet Shield */}
        <path
          d="M35 40C35 32 42 25 50 25C58 25 65 32 65 40V60C65 68 58 75 50 75C42 75 35 68 35 60"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          className="text-white"
        />
        
        {/* Crosshair / Target Detail */}
        <line x1="50" y1="20" x2="50" y2="80" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-cyan-500/30" />
        <line x1="20" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-cyan-500/30" />

        {/* Central Core */}
        <circle cx="50" cy="50" r="6" fill="currentColor" className="text-red-500 shadow-lg" />
        <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="1" className="text-red-400/50 animate-ping" />
      </svg>
      
      {/* Absolute glow background */}
      <div className="absolute inset-0 bg-cyan-400 blur-xl opacity-10 animate-pulse -z-10"></div>
    </div>
  );
};

export default CosmoLogo;
