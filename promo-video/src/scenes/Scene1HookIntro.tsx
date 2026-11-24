import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { CosmicBackdrop } from '../components/CosmicBackdrop';
import { SpaceTabsLogo } from '../components/SpaceTabsLogo';

const CHAOS_TABS = [
  { label: 'PR #418', color: '#6366f1' },
  { label: 'Docs v4', color: '#3b82f6' },
  { label: 'Figma...', color: '#ec4899' },
  { label: 'StackO...', color: '#f97316' },
  { label: 'ArXiv...', color: '#ef4444' },
  { label: 'AWS...', color: '#f59e0b' },
  { label: 'Slack', color: '#8b5cf6' },
  { label: 'Jira #...', color: '#0ea5e9' },
  { label: 'Notion', color: '#94a3b8' },
  { label: 'Stripe', color: '#6366f1' },
  { label: 'Vercel', color: '#e2e8f0' },
  { label: 'GitHub', color: '#22c55e' },
  { label: 'YouTu...', color: '#ef4444' },
  { label: 'Linear', color: '#818cf8' },
  { label: 'Mail (9)', color: '#f43f5e' },
  { label: 'Sheet...', color: '#10b981' },
  { label: 'ChatG...', color: '#14b8a6' },
  { label: 'MDN...', color: '#38bdf8' },
  { label: 'Redis', color: '#ef4444' },
  { label: 'Docker', color: '#0284c7' },
  { label: 'Grafan...', color: '#f97316' },
  { label: 'Local...', color: '#a855f7' },
];

export const Scene1HookIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Part 1: Tab Chaos (0..82) -> Implosion (74..88)
  // Part 2: Brand Reveal (82..180)
  const isReveal = frame >= 82;

  const chaosFadeOut = interpolate(frame, [74, 86], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const chaosScale = interpolate(frame, [74, 86], [1, 0.22], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });

  // Animated tab count & RAM counter climbing during chaos
  const tabCount = Math.round(
    interpolate(frame, [0, 68], [14, 78], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.quad),
    })
  );
  const ramGb = interpolate(frame, [0, 68], [1.4, 5.2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  const hookTextProg = spring({
    frame: frame - 4,
    fps,
    config: { damping: 16, stiffness: 120 },
  });

  // Brand Reveal springs (starting at frame 84)
  const logoSpring = spring({
    frame: frame - 84,
    fps,
    config: { damping: 13, stiffness: 140, mass: 0.9 },
  });
  const titleSpring = spring({
    frame: frame - 94,
    fps,
    config: { damping: 16, stiffness: 130 },
  });
  const subSpring = spring({
    frame: frame - 104,
    fps,
    config: { damping: 16, stiffness: 120 },
  });
  const badgesSpring = spring({
    frame: frame - 114,
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  // Expanding cosmic halo ring on logo reveal
  const ringScale = interpolate(frame, [84, 128], [0.4, 3.2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const ringOpacity = interpolate(frame, [84, 96, 128], [0, 0.75, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const exitOpacity = interpolate(frame, [168, 180], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      <CosmicBackdrop
        primaryGlow={isReveal ? '#f43f5e' : '#ef4444'}
        secondaryGlow={isReveal ? '#6366f1' : '#f97316'}
        intensity={isReveal ? 1.15 : 0.95}
      />

      {/* PART 1: TAB CHAOS HOOK */}
      {frame < 90 && (
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: chaosFadeOut,
            transform: `scale(${chaosScale})`,
            fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
          }}
        >
          {/* Floating Chaotic Cluttered Browser Bar */}
          <div
            style={{
              width: 1500,
              borderRadius: 20,
              background: 'rgba(15, 20, 36, 0.92)',
              border: '1.5px solid rgba(239, 68, 68, 0.42)',
              boxShadow:
                '0 30px 90px rgba(0,0,0,0.7), 0 0 60px rgba(239, 68, 68, 0.22)',
              padding: '14px 16px',
              marginBottom: 56,
              overflow: 'hidden',
            }}
          >
            {/* Row 1 of squished tabs */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
              {CHAOS_TABS.map((t, i) => {
                const visible = frame >= i * 2;
                const pop = spring({
                  frame: frame - i * 2,
                  fps,
                  config: { damping: 14, stiffness: 200 },
                });
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 36,
                      borderRadius: 8,
                      background:
                        i === 6
                          ? 'rgba(239, 68, 68, 0.22)'
                          : 'rgba(30, 41, 59, 0.85)',
                      border: `1px solid ${
                        i === 6 ? 'rgba(248,113,113,0.5)' : 'rgba(148,163,184,0.16)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '0 7px',
                      opacity: visible ? Math.min(1, pop) : 0,
                      transform: `translateY(${(1 - pop) * -14}px)`,
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: t.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: '#cbd5e1',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Row 2 second cluttered browser window */}
            <div style={{ display: 'flex', gap: 5, opacity: 0.72 }}>
              {[...CHAOS_TABS].reverse().map((t, i) => {
                const pop = spring({
                  frame: frame - 14 - i * 2,
                  fps,
                  config: { damping: 15, stiffness: 190 },
                });
                return (
                  <div
                    key={`r2-${i}`}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 30,
                      borderRadius: 7,
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(148,163,184,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '0 6px',
                      opacity: Math.max(0, Math.min(1, pop)),
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        backgroundColor: t.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        color: '#94a3b8',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                      }}
                    >
                      {t.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kinetic Hook Headline */}
          <div
            style={{
              transform: `translateY(${interpolate(hookTextProg, [0, 1], [30, 0])}px)`,
              opacity: interpolate(hookTextProg, [0, 0.7], [0, 1], {
                extrapolateRight: 'clamp',
              }),
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 78,
                fontWeight: 900,
                letterSpacing: '-0.035em',
                color: '#f8fafc',
                lineHeight: 1.05,
                marginBottom: 26,
              }}
            >
              Drowning in{' '}
              <span
                style={{
                  background: 'linear-gradient(120deg, #fb7185, #f97316)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                browser tabs?
              </span>
            </div>

            {/* Live Climbing Stress Meters */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 24,
                padding: '14px 30px',
                borderRadius: 999,
                background: 'rgba(127, 29, 29, 0.28)',
                border: '1px solid rgba(248, 113, 113, 0.42)',
                boxShadow: '0 0 40px rgba(239, 68, 68, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#ef4444',
                    boxShadow: '0 0 12px #ef4444',
                  }}
                />
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#fecaca',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}
                >
                  {tabCount} Open Tabs
                </span>
              </div>
              <div style={{ width: 1, height: 22, background: 'rgba(248,113,113,0.35)' }} />
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#fca5a5',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
              >
                {ramGb.toFixed(1)} GB RAM
              </div>
              <div style={{ width: 1, height: 22, background: 'rgba(248,113,113,0.35)' }} />
              <div style={{ fontSize: 19, fontWeight: 700, color: '#fda4af' }}>
                Paywalled tab managers?
              </div>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* PART 2: SPACETABS BRAND REVEAL */}
      {isReveal && (
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
          }}
        >
          {/* Expanding Luminous Shockwave Ring */}
          <div
            style={{
              position: 'absolute',
              width: 240,
              height: 240,
              borderRadius: '50%',
              border: '2px solid rgba(244, 63, 94, 0.7)',
              boxShadow: '0 0 60px rgba(244, 63, 94, 0.45)',
              transform: `scale(${ringScale})`,
              opacity: ringOpacity,
              pointerEvents: 'none',
            }}
          />

          {/* Glowing Logo */}
          <div
            style={{
              transform: `scale(${interpolate(logoSpring, [0, 1], [0.35, 1])})`,
              opacity: interpolate(logoSpring, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
              marginBottom: 34,
            }}
          >
            <SpaceTabsLogo size={146} glow />
          </div>

          {/* Product Name */}
          <div
            style={{
              transform: `translateY(${interpolate(titleSpring, [0, 1], [28, 0])}px)`,
              opacity: interpolate(titleSpring, [0, 0.65], [0, 1], { extrapolateRight: 'clamp' }),
              display: 'flex',
              alignItems: 'baseline',
              gap: 18,
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontSize: 94,
                fontWeight: 900,
                letterSpacing: '-0.04em',
                color: '#ffffff',
                textShadow: '0 12px 45px rgba(0, 0, 0, 0.65)',
              }}
            >
              SpaceTabs
            </span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              transform: `translateY(${interpolate(subSpring, [0, 1], [20, 0])}px)`,
              opacity: interpolate(subSpring, [0, 0.7], [0, 1], { extrapolateRight: 'clamp' }),
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: '-0.015em',
              color: '#cbd5e1',
              marginBottom: 38,
            }}
          >
            The workspace &amp; tab manager built for{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #fb7185, #a78bfa, #34d399)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800,
              }}
            >
              deep focus
            </span>
          </div>

          {/* 3 Hero Value Pills */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              transform: `translateY(${interpolate(badgesSpring, [0, 1], [22, 0])}px)`,
              opacity: interpolate(badgesSpring, [0, 0.75], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            {[
              { text: 'Local-First & Unlimited', dot: '#10b981' },
              { text: 'Smart Memory Saver', dot: '#38bdf8' },
              { text: 'Zero Paywalls — Free Forever', dot: '#f43f5e' },
            ].map((pill) => (
              <div
                key={pill.text}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 24px',
                  borderRadius: 999,
                  background: 'rgba(15, 23, 42, 0.78)',
                  border: `1px solid ${pill.dot}55`,
                  boxShadow: `0 12px 35px rgba(0,0,0,0.45), 0 0 25px ${pill.dot}22`,
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#f1f5f9',
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: pill.dot,
                    boxShadow: `0 0 10px ${pill.dot}`,
                  }}
                />
                {pill.text}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
