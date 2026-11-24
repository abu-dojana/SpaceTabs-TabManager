import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

interface CosmicBackdropProps {
  primaryGlow?: string;
  secondaryGlow?: string;
  intensity?: number;
}

const STARS = Array.from({ length: 48 }, (_, i) => {
  const seed1 = ((i * 7919 + 104729) % 1000) / 1000;
  const seed2 = ((i * 6271 + 32749) % 1000) / 1000;
  const size = 1.4 + ((i * 31) % 24) / 10;
  const phase = (i * 1.37) % (Math.PI * 2);
  return { x: seed1 * 100, y: seed2 * 100, size, phase };
});

export const CosmicBackdrop: React.FC<CosmicBackdropProps> = ({
  primaryGlow = '#6366f1',
  secondaryGlow = '#f43f5e',
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const driftX = Math.sin(frame * 0.015) * 45;
  const driftY = Math.cos(frame * 0.012) * 30;
  const pulse = 0.88 + Math.sin(frame * 0.03) * 0.12;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#050712',
        overflow: 'hidden',
      }}
    >
      {/* Subtle deep cosmic radial base */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 85% 75% at 50% 45%, #0c1228 0%, #050712 65%, #020309 100%)',
        }}
      />

      {/* Primary breathing nebula orb (top-left / drifting) */}
      <div
        style={{
          position: 'absolute',
          width: 1100,
          height: 850,
          left: -180 + driftX,
          top: -220 + driftY,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryGlow}38 0%, ${primaryGlow}12 42%, transparent 72%)`,
          filter: 'blur(40px)',
          opacity: pulse * intensity,
        }}
      />

      {/* Secondary nebula orb (bottom-right / counter-drifting) */}
      <div
        style={{
          position: 'absolute',
          width: 1050,
          height: 820,
          right: -200 - driftX * 0.8,
          bottom: -240 - driftY * 0.8,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${secondaryGlow}30 0%, ${secondaryGlow}0e 45%, transparent 72%)`,
          filter: 'blur(44px)',
          opacity: (1.05 - pulse * 0.15) * intensity,
        }}
      />

      {/* Subtle architectural perspective grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(148, 163, 184, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.045) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0.75) 15%, transparent 85%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0.75) 15%, transparent 85%)',
        }}
      />

      {/* Shimmering starfield dots */}
      {STARS.map((star, idx) => {
        const twinkle = interpolate(
          Math.sin(frame * 0.05 + star.phase),
          [-1, 1],
          [0.15, 0.72]
        );
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              borderRadius: '50%',
              backgroundColor: idx % 5 === 0 ? primaryGlow : '#e2e8f0',
              opacity: twinkle * 0.85,
              boxShadow: star.size > 2.6 ? `0 0 8px ${primaryGlow}` : undefined,
            }}
          />
        );
      })}

      {/* Subtle studio vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 50%, transparent 52%, rgba(2, 4, 12, 0.72) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
