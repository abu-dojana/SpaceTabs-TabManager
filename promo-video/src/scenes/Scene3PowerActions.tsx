import React from 'react';
import {
  AbsoluteFill,
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

export const Scene3PowerActions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 115, mass: 0.9 },
  });

  const frameY = interpolate(enter, [0, 1], [54, 0]);
  const baseScale = interpolate(enter, [0, 1], [0.93, 1]);

  // 3 beats across 255 frames (8.5s) synced to clip-power-actions.mp4 (24.9s @ 2.92x):
  // 0..66: Close Duplicate Tabs | 66..154: Drag & Drop Tab to Space | 154..255: Archive & Restore
  const activeStage = frame < 66 ? 0 : frame < 154 ? 1 : 2;
  const accent = activeStage === 0 ? '#38bdf8' : activeStage === 1 ? '#60a5fa' : '#f59e0b';

  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [242, 255], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      <CosmicBackdrop primaryGlow="#3b82f6" secondaryGlow={accent} intensity={1.08} />

      <TopHeadline
        eyebrow="Effortless Tab Control"
        title="Deduplicate, Drag & Drop, Archive"
        accentWord="Drag & Drop, Archive"
        accentColor={accent}
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
        <div style={{ transform: `translateY(${frameY}px) scale(${baseScale})` }}>
          <BrowserFrame
            width={1360}
            height={765}
            accentColor={accent}
            dynamicTab={{
              title: '🚀 Product Launch — SpaceTabs',
              secondaryTabs: ['React', 'Figma', 'WXT', 'Linear'],
            }}
          >
            <OffthreadVideo
              src={staticFile('footage/clip-power-actions.mp4')}
              playbackRate={2.92}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              muted
            />
          </BrowserFrame>
        </div>
      </div>

      <BottomPills
        delay={6}
        items={[
          {
            label:
              activeStage === 0
                ? '▸ 1-Click Close Duplicate Tabs'
                : 'Close Duplicate Tabs',
            color: activeStage === 0 ? '#38bdf8' : '#475569',
          },
          {
            label:
              activeStage === 1
                ? '▸ Drag & Drop Tabs to Any Space'
                : 'Drag & Drop Organization',
            color: activeStage === 1 ? '#60a5fa' : '#475569',
          },
          {
            label:
              activeStage === 2
                ? '▸ Safe Space Archive & 1-Click Restore'
                : 'Space Archive Drawer',
            color: activeStage === 2 ? '#f59e0b' : '#475569',
          },
        ]}
      />
    </AbsoluteFill>
  );
};
