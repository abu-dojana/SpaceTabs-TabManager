import React from 'react';

interface SpaceTabsLogoProps {
  size?: number;
  glow?: boolean;
}

export const SpaceTabsLogo: React.FC<SpaceTabsLogoProps> = ({ size = 128, glow = true }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: glow ? 'drop-shadow(0 20px 55px rgba(244, 63, 94, 0.55))' : undefined,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 128 128"
      >
        <defs>
          <linearGradient id="st-logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FB7185" />
            <stop offset="45%" stopColor="#F43F5E" />
            <stop offset="100%" stopColor="#BE123C" />
          </linearGradient>
          <linearGradient id="st-logo-shine" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.0)" />
          </linearGradient>
        </defs>
        <rect width="128" height="128" rx="30" fill="url(#st-logo-bg)" />
        <rect
          x="1.5"
          y="1.5"
          width="125"
          height="125"
          rx="28.5"
          fill="url(#st-logo-shine)"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="2"
        />
        <g
          transform="translate(24, 24) scale(3.333)"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9A1 1 0 0 0 22 7.91a1 1 0 0 0 0-1.83z" />
          <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
          <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
        </g>
      </svg>
    </div>
  );
};
