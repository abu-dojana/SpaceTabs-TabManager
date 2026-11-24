import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { CosmicBackdrop } from '../components/CosmicBackdrop';
import { SpaceTabsLogo } from '../components/SpaceTabsLogo';

export const Scene6OutroCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardsSpring = spring({
    frame: frame - 2,
    fps,
    config: { damping: 18, stiffness: 95, mass: 1.0 },
  });
  const logoSpring = spring({
    frame: frame - 8,
    fps,
    config: { damping: 14, stiffness: 130 },
  });
  const textSpring = spring({
    frame: frame - 16,
    fps,
    config: { damping: 16, stiffness: 120 },
  });
  const ctaSpring = spring({
    frame: frame - 26,
    fps,
    config: { damping: 14, stiffness: 130 },
  });

  const ctaPulse = 1 + Math.sin(frame * 0.12) * 0.025;
  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [122, 135], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fanSpread = interpolate(cardsSpring, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        opacity: fadeIn * fadeOut,
        fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
      }}
    >
      <CosmicBackdrop primaryGlow="#f43f5e" secondaryGlow="#8b5cf6" intensity={1.25} />

      {/* Subtle 3D Fanned Showcase of 3 SpaceTabs Themes Behind Hero CTA */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          opacity: 0.24 * fanSpread,
          filter: 'blur(1.5px)',
        }}
      >
        {/* Left Fan: Dark Emerald */}
        <div
          style={{
            position: 'absolute',
            width: 780,
            height: 440,
            borderRadius: 20,
            overflow: 'hidden',
            border: '1.5px solid rgba(16, 185, 129, 0.5)',
            boxShadow: '0 30px 90px rgba(0,0,0,0.8)',
            transform: `translateX(${-490 * fanSpread}px) translateY(35px) rotate(${-10 * fanSpread}deg)`,
          }}
        >
          <Img
            src={staticFile('screenshots/theme-forest-emerald.png')}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Right Fan: Sakura Blossom Rose */}
        <div
          style={{
            position: 'absolute',
            width: 780,
            height: 440,
            borderRadius: 20,
            overflow: 'hidden',
            border: '1.5px solid rgba(244, 63, 94, 0.55)',
            boxShadow: '0 30px 90px rgba(0,0,0,0.8)',
            transform: `translateX(${490 * fanSpread}px) translateY(35px) rotate(${10 * fanSpread}deg)`,
          }}
        >
          <Img
            src={staticFile('screenshots/theme-sakura-rose.png')}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Center-Back Fan: Purple Space */}
        <div
          style={{
            position: 'absolute',
            width: 820,
            height: 460,
            borderRadius: 20,
            overflow: 'hidden',
            border: '1.5px solid rgba(139, 92, 246, 0.55)',
            boxShadow: '0 30px 100px rgba(0,0,0,0.85)',
            transform: `translateY(${-70 * fanSpread}px) scale(${0.92 + 0.08 * fanSpread})`,
          }}
        >
          <Img
            src={staticFile('screenshots/theme-purple-space.png')}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </div>

      {/* Dark radial center focus shield so CTA typography pops razor-clean */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 58% 62% at 50% 50%, rgba(5, 7, 18, 0.86) 0%, rgba(5, 7, 18, 0.52) 60%, rgba(5, 7, 18, 0.25) 100%)',
        }}
      />

      {/* Foreground Center Hero CTA */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          zIndex: 20,
        }}
      >
        <div
          style={{
            transform: `scale(${interpolate(logoSpring, [0, 1], [0.55, 1])})`,
            opacity: interpolate(logoSpring, [0, 0.6], [0, 1], { extrapolateRight: 'clamp' }),
            marginBottom: 28,
          }}
        >
          <SpaceTabsLogo size={136} glow />
        </div>

        <div
          style={{
            transform: `translateY(${interpolate(textSpring, [0, 1], [28, 0])}px)`,
            opacity: interpolate(textSpring, [0, 0.7], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 900,
              letterSpacing: '-0.04em',
              color: '#ffffff',
              lineHeight: 1.05,
              marginBottom: 14,
              textShadow: '0 12px 40px rgba(0,0,0,0.65)',
            }}
          >
            SpaceTabs — Tab Manager
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: '#cbd5e1',
              marginBottom: 34,
            }}
          >
            Reclaim your tabs, memory &amp; focus —{' '}
            <span style={{ color: '#34d399', fontWeight: 800 }}>100% Free Forever.</span>
          </div>
        </div>

        {/* Glowing Chrome Web Store CTA Button */}
        <div
          style={{
            transform: `scale(${interpolate(ctaSpring, [0, 1], [0.75, 1]) * ctaPulse})`,
            opacity: interpolate(ctaSpring, [0, 0.6], [0, 1], { extrapolateRight: 'clamp' }),
            marginBottom: 34,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 16,
              padding: '20px 44px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 52%, #7c3aed 100%)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              boxShadow:
                '0 20px 60px rgba(244, 63, 94, 0.5), 0 0 80px rgba(124, 58, 237, 0.35)',
              color: '#ffffff',
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-0.015em',
            }}
          >
            {/* Clean Chrome-style Emblem SVG */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
              <circle cx="12" cy="12" r="4" fill="white" />
              <line x1="21.17" y1="8" x2="12" y2="8" stroke="white" strokeWidth="2" />
              <line x1="3.95" y1="6.06" x2="8.54" y2="14" stroke="white" strokeWidth="2" />
              <line x1="10.88" y1="21.94" x2="15.46" y2="14" stroke="white" strokeWidth="2" />
            </svg>
            <span>Available on Chrome Web Store</span>
          </div>
        </div>

        {/* Bottom Trust Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 26,
            opacity: interpolate(ctaSpring, [0, 1], [0, 0.92]),
            fontSize: 16,
            fontWeight: 600,
            color: '#94a3b8',
          }}
        >
          <span>✓ Chrome • Brave • Edge</span>
          <span>•</span>
          <span>✓ Open Source (GPL-3.0)</span>
          <span>•</span>
          <span>✓ Zero Subscriptions</span>
          <span>•</span>
          <span
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: '#cbd5e1',
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
            }}
          >
            Alt + Shift + W
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
