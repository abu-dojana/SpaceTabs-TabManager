import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { CosmicBackdrop } from '../components/CosmicBackdrop';
import { BrowserFrame } from '../components/BrowserFrame';
import { TopHeadline } from '../components/CaptionBadge';

const THEME_SHOWCASE = [
  {
    id: 'forest',
    name: 'Forest Dark',
    accentName: 'Emerald Green',
    mode: 'All Dark',
    tabTitle: '🔥 AI Research — SpaceTabs',
    bgHex: '#0b1a13',
    accentHex: '#10b981',
    glow2: '#059669',
    file: 'screenshots/theme-forest-emerald.png',
  },
  {
    id: 'purplespace',
    name: 'Purple Space',
    accentName: 'Violet Purple',
    mode: 'All Dark',
    tabTitle: '🚀 Product Launch — SpaceTabs',
    bgHex: '#1f0430',
    accentHex: '#8b5cf6',
    glow2: '#d946ef',
    file: 'screenshots/theme-purple-space.png',
  },
  {
    id: 'midnight',
    name: 'Midnight OLED',
    accentName: 'Ocean Cyan',
    mode: 'True #000000',
    tabTitle: '🚀 Product Launch — SpaceTabs',
    bgHex: '#000000',
    accentHex: '#06b6d4',
    glow2: '#3b82f6',
    file: 'screenshots/theme-midnight-oled.png',
  },
  {
    id: 'split',
    name: 'Split Mode',
    accentName: 'Space Indigo + Snow',
    mode: 'Dark / Light',
    tabTitle: '🚀 Product Launch — SpaceTabs',
    bgHex: '#13102d',
    accentHex: '#6366f1',
    glow2: '#38bdf8',
    file: 'screenshots/theme-split-indigo.png',
  },
  {
    id: 'sakura',
    name: 'Sakura Blossom',
    accentName: 'Crimson Rose',
    mode: 'All Light',
    tabTitle: '🎨 Brand & UI Kit — SpaceTabs',
    bgHex: '#fff0f3',
    accentHex: '#f43f5e',
    glow2: '#ec4899',
    file: 'screenshots/theme-sakura-rose.png',
  },
  {
    id: 'mint',
    name: 'Fresh Mint',
    accentName: 'Emerald Green',
    mode: 'All Light',
    tabTitle: '🚀 Product Launch — SpaceTabs',
    bgHex: '#f0fdf4',
    accentHex: '#10b981',
    glow2: '#14b8a6',
    file: 'screenshots/theme-fresh-mint.png',
  },
];

// 255 frames (8.5s): 135f live Appearance settings + 120f (6 themes x 20f each)
const PART_A_END = 135;
const SLIDE_FRAMES = 20;

export const Scene4ThemesShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isPartB = frame >= PART_A_END;
  const partBFrame = Math.max(0, frame - PART_A_END);
  const currentIdx = Math.min(
    THEME_SHOWCASE.length - 1,
    Math.floor(partBFrame / SLIDE_FRAMES)
  );
  const localSlideFrame = partBFrame - currentIdx * SLIDE_FRAMES;
  const activeTheme = THEME_SHOWCASE[currentIdx];

  const primaryGlow = isPartB
    ? activeTheme.accentHex
    : frame < 50
      ? '#8b5cf6'
      : frame < 100
        ? '#06b6d4'
        : '#f43f5e';
  const secondaryGlow = isPartB
    ? activeTheme.glow2
    : frame < 50
      ? '#ec4899'
      : frame < 100
        ? '#6366f1'
        : '#10b981';

  const enter = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const frameY = interpolate(enter, [0, 1], [48, 0]);
  const baseScale = interpolate(enter, [0, 1], [0.94, 1]);

  const partAOpacity = interpolate(frame, [PART_A_END - 10, PART_A_END], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const partBOpacity = interpolate(frame, [PART_A_END - 4, PART_A_END + 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const wipeProgress = interpolate(localSlideFrame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const slideZoom = interpolate(localSlideFrame, [0, SLIDE_FRAMES], [1.025, 1.0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [242, 255], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      <CosmicBackdrop primaryGlow={primaryGlow} secondaryGlow={secondaryGlow} intensity={1.15} />

      <TopHeadline
        eyebrow={isPartB ? '14 Curated Palettes • 9 Accent Colors' : 'Appearance & Theme Studio'}
        title={
          isPartB
            ? 'Switch themes in one click'
            : 'Personalize every pixel in Appearance'
        }
        accentWord={isPartB ? 'one click' : 'Appearance'}
        accentColor={primaryGlow}
      />

      <div
        style={{
          position: 'absolute',
          top: 140,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            transform: `translateY(${frameY}px) scale(${baseScale})`,
            position: 'relative',
          }}
        >
          <BrowserFrame
            width={1360}
            height={765}
            accentColor={primaryGlow}
            urlLabel="Settings → Appearance & Color Themes"
            dynamicTab={
              isPartB
                ? {
                    title: activeTheme.tabTitle,
                    secondaryTabs: [activeTheme.name, activeTheme.mode],
                  }
                : undefined
            }
          >
            {frame < PART_A_END + 4 && (
              <AbsoluteFill style={{ opacity: partAOpacity }}>
                <OffthreadVideo
                  src={staticFile('footage/clip-appearance.mp4')}
                  playbackRate={3.25}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  muted
                />
              </AbsoluteFill>
            )}

            {frame >= PART_A_END - 6 && (
              <AbsoluteFill style={{ opacity: partBOpacity }}>
                {currentIdx > 0 && (
                  <Img
                    src={staticFile(THEME_SHOWCASE[currentIdx - 1].file)}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                )}

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath:
                      currentIdx === 0
                        ? 'none'
                        : `polygon(0 0, ${wipeProgress * 120}% 0, ${Math.max(
                            0,
                            wipeProgress * 120 - 18
                          )}% 100%, 0 100%)`,
                    transform: `scale(${slideZoom})`,
                    transformOrigin: 'center center',
                  }}
                >
                  <Img
                    src={staticFile(activeTheme.file)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>

                {/* Floating Theme Name Tag inside bottom-right of viewport */}
                <div
                  style={{
                    position: 'absolute',
                    right: 28,
                    bottom: 62,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 18px',
                    borderRadius: 14,
                    background: 'rgba(6, 10, 22, 0.9)',
                    border: `1.5px solid ${activeTheme.accentHex}88`,
                    boxShadow: `0 16px 40px rgba(0,0,0,0.6), 0 0 28px ${activeTheme.accentHex}38`,
                    backdropFilter: 'blur(10px)',
                    fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 8,
                      background: `linear-gradient(135deg, ${activeTheme.bgHex} 45%, ${activeTheme.accentHex} 100%)`,
                      border: '1.5px solid rgba(255,255,255,0.45)',
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: '#ffffff',
                        lineHeight: 1.15,
                      }}
                    >
                      {activeTheme.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: activeTheme.accentHex,
                        marginTop: 2,
                      }}
                    >
                      {activeTheme.mode} • {activeTheme.accentName}
                    </div>
                  </div>
                </div>
              </AbsoluteFill>
            )}
          </BrowserFrame>
        </div>
      </div>

      {/* Bottom Interactive Theme Swatch Dock */}
      <div
        style={{
          position: 'absolute',
          bottom: 22,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          zIndex: 30,
          fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
        }}
      >
        {THEME_SHOWCASE.map((t, idx) => {
          const isActive = isPartB && currentIdx === idx;
          return (
            <div
              key={t.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
                padding: '9px 16px',
                borderRadius: 999,
                background: isActive
                  ? `${t.accentHex}28`
                  : 'rgba(10, 15, 32, 0.82)',
                border: `1.5px solid ${
                  isActive ? t.accentHex : 'rgba(148, 163, 184, 0.22)'
                }`,
                boxShadow: isActive
                  ? `0 0 26px ${t.accentHex}55`
                  : '0 8px 24px rgba(0,0,0,0.4)',
                color: isActive ? '#ffffff' : '#94a3b8',
                fontSize: 14,
                fontWeight: isActive ? 800 : 600,
                transform: isActive ? 'scale(1.06) translateY(-2px)' : 'scale(1)',
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${t.bgHex} 35%, ${t.accentHex} 100%)`,
                  border: '1.5px solid rgba(255,255,255,0.55)',
                  flexShrink: 0,
                }}
              />
              {t.name}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
