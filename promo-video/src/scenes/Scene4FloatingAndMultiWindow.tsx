import React from 'react';
import {
  AbsoluteFill,
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
import { BottomPills, TopHeadline } from '../components/CaptionBadge';

const PART_A_END = 140; // 0..140 (4.67s) Right Floating Panel | 140..240 (3.33s) Multi-Window Side-by-Side

export const Scene4FloatingAndMultiWindow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isMultiWin = frame >= PART_A_END;
  const multiFrame = Math.max(0, frame - PART_A_END);

  const enterA = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const enterB = spring({
    frame: multiFrame,
    fps,
    config: { damping: 16, stiffness: 115, mass: 0.9 },
  });

  const partAOpacity = interpolate(frame, [PART_A_END - 10, PART_A_END], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const partBOpacity = interpolate(frame, [PART_A_END - 4, PART_A_END + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Dynamic title in Part A tracks clicking AI Research -> Product Launch from the Right Floating Panel!
  const onAiResearch = frame >= 36 && frame < 108;

  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [227, 240], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = 0.8 + Math.sin(frame * 0.16) * 0.2;

  return (
    <AbsoluteFill
      style={{
        opacity: fadeIn * fadeOut,
        fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
      }}
    >
      <CosmicBackdrop
        primaryGlow={isMultiWin ? '#10b981' : '#8b5cf6'}
        secondaryGlow={isMultiWin ? '#a855f7' : '#38bdf8'}
        intensity={1.12}
      />

      <TopHeadline
        eyebrow={isMultiWin ? 'Multi-Window Architecture' : 'Compact Sidebar Layout'}
        title={
          isMultiWin
            ? 'Run multiple Spaces across Windows'
            : 'Slide-Out Right Floating Panel'
        }
        accentWord={isMultiWin ? 'across Windows' : 'Right Floating Panel'}
        accentColor={isMultiWin ? '#34d399' : '#a78bfa'}
      />

      {/* PART A: LIVE RIGHT FLOATING PANEL RECORDING */}
      {frame < PART_A_END + 4 && (
        <AbsoluteFill style={{ opacity: partAOpacity }}>
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
                transform: `translateY(${interpolate(enterA, [0, 1], [48, 0])}px) scale(${interpolate(
                  enterA,
                  [0, 1],
                  [0.94, 1]
                )})`,
              }}
            >
              <BrowserFrame
                width={1360}
                height={765}
                accentColor="#8b5cf6"
                dynamicTab={{
                  title: onAiResearch
                    ? '🔥 AI Research — SpaceTabs'
                    : '🚀 Product Launch — SpaceTabs',
                  highlightDynamic: true,
                  isTransitioning:
                    (frame >= 36 && frame <= 48) || (frame >= 84 && frame <= 96),
                  secondaryTabs: onAiResearch
                    ? ['arXiv', 'Hugging Face', 'PyTorch']
                    : ['React', 'Figma', 'WXT'],
                }}
              >
                <OffthreadVideo
                  src={staticFile('footage/clip-right-panel.mp4')}
                  playbackRate={3.15}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  muted
                />
              </BrowserFrame>
            </div>
          </div>

          <BottomPills
            delay={4}
            items={[
              { label: 'Compact Left Sections + Live Green Dot', color: '#34d399' },
              { label: 'Right Floating Space Panel', color: '#a78bfa' },
              { label: 'Adjustable Panel Width (200px–360px)', color: '#38bdf8' },
            ]}
          />
        </AbsoluteFill>
      )}

      {/* PART B: SIDE-BY-SIDE REAL MULTI-WINDOW WORKSPACES */}
      {frame >= PART_A_END - 6 && (
        <AbsoluteFill style={{ opacity: partBOpacity }}>
          <div
            style={{
              position: 'absolute',
              top: 215,
              left: 0,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 36,
              padding: '0 44px',
              perspective: 2000,
            }}
          >
            {/* WINDOW 1 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
                transform: `translateX(${interpolate(enterB, [0, 1], [-80, 0])}px) rotateY(4deg)`,
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 16px',
                  borderRadius: 999,
                  background: 'rgba(16, 185, 129, 0.16)',
                  border: '1px solid rgba(16, 185, 129, 0.48)',
                  color: '#6ee7b7',
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 10px #10b981',
                  }}
                />
                WINDOW 1 — 🚀 Product Launch
              </div>

              <BrowserFrame
                width={860}
                height={484}
                accentColor="#10b981"
                dynamicTab={{
                  title: '🚀 Product Launch — SpaceTabs',
                  secondaryTabs: ['React', 'Figma'],
                }}
              >
                <Img
                  src={staticFile('screenshots/multiwin-window1.png')}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </BrowserFrame>
            </div>

            {/* Center Live Multi-Window Sync Bridge */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                opacity: pulse,
                transform: `scale(${interpolate(enterB, [0, 1], [0.5, 1])})`,
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981, #a855f7)',
                  boxShadow: '0 0 32px rgba(168, 85, 247, 0.55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                ⇄
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: '#cbd5e1',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}
              >
                Live Window
                <br />
                Indicators
              </div>
            </div>

            {/* WINDOW 2 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
                transform: `translateX(${interpolate(enterB, [0, 1], [80, 0])}px) rotateY(-4deg)`,
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 16px',
                  borderRadius: 999,
                  background: 'rgba(168, 85, 247, 0.18)',
                  border: '1px solid rgba(168, 85, 247, 0.52)',
                  color: '#d8b4fe',
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#a855f7',
                    boxShadow: '0 0 10px #a855f7',
                  }}
                />
                WINDOW 2 — 🔥 AI Research
              </div>

              <BrowserFrame
                width={860}
                height={484}
                accentColor="#a855f7"
                dynamicTab={{
                  title: '🔥 AI Research — SpaceTabs',
                  secondaryTabs: ['arXiv', 'PyTorch'],
                }}
              >
                <Img
                  src={staticFile('screenshots/multiwin-window2.png')}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </BrowserFrame>
            </div>
          </div>

          <BottomPills
            delay={4}
            items={[
              { label: 'Open Any Space in Separate Window (Ctrl+Click)', color: '#34d399' },
              { label: 'Green & Purple Active-Window Status Dots', color: '#a855f7' },
              { label: 'Dynamic Per-Window Titles', color: '#38bdf8' },
            ]}
          />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
