import React from 'react';
import {
  AbsoluteFill,
  Easing,
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

// 210 frames (7.0s)
export const Scene3WorkspaceSuite: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 115, mass: 0.9 },
  });

  const frameY = interpolate(enter, [0, 1], [54, 0]);
  const baseScale = interpolate(enter, [0, 1], [0.93, 1]);

  const innerZoom = interpolate(frame, [0, 70, 140, 210], [1.0, 1.018, 1.022, 1.01], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.sin),
  });

  // Synced with Resources -> Notes -> Tasks inside clip-workspace.mp4 (~14.4s at 2.04x = 7.0s)
  const activeStage = frame < 48 ? 0 : frame < 148 ? 1 : 2;

  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [197, 210], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      <CosmicBackdrop primaryGlow="#8b5cf6" secondaryGlow="#3b82f6" intensity={1.05} />

      <TopHeadline
        eyebrow="All-in-One Space Canvas"
        title="Resources, Markdown Notes & Tasks"
        accentWord="Markdown Notes & Tasks"
        accentColor="#a78bfa"
      />

      <div
        style={{
          position: 'absolute',
          top: 140,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          perspective: 1800,
        }}
      >
        <div
          style={{
            transform: `translateY(${frameY}px) scale(${baseScale})`,
            transformOrigin: 'center center',
          }}
        >
          <BrowserFrame
            width={1360}
            height={765}
            accentColor="#8b5cf6"
            dynamicTab={{
              title: '🚀 Product Launch — SpaceTabs',
              secondaryTabs: ['Resources', 'Notes', 'Tasks'],
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                transform: `scale(${innerZoom})`,
                transformOrigin: '58% 45%',
              }}
            >
              <OffthreadVideo
                src={staticFile('footage/clip-workspace.mp4')}
                playbackRate={2.04}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                muted
              />
            </div>
          </BrowserFrame>
        </div>
      </div>

      <BottomPills
        delay={8}
        items={[
          {
            label: activeStage === 0 ? '▸ Resources Hub — Pinned Docs & Links' : 'Resources Hub',
            color: activeStage === 0 ? '#38bdf8' : '#475569',
          },
          {
            label:
              activeStage === 1
                ? '▸ Split-Pane Markdown Notes (Auto-Saved)'
                : 'Markdown Notes Editor',
            color: activeStage === 1 ? '#a78bfa' : '#475569',
          },
          {
            label:
              activeStage === 2
                ? '▸ Live Tasks & Progress Tracking'
                : 'Space Task Checklists',
            color: activeStage === 2 ? '#34d399' : '#475569',
          },
        ]}
      />
    </AbsoluteFill>
  );
};
