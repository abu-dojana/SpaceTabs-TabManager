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

export const Scene2SpacesDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 110, mass: 0.9 },
  });

  const frameY = interpolate(enter, [0, 1], [60, 0]);
  const rotateX = interpolate(enter, [0, 1], [6, 0]);
  const baseScale = interpolate(enter, [0, 1], [0.92, 1]);

  // Dynamic tab title switches cleanly in sync with clicking "Product Launch" in clip-spaces.mp4
  const switchedToLaunch = frame >= 36;
  const isTitleFlash = frame >= 34 && frame <= 62;

  // Subtle dynamic zoom toward center search bar & results when typing "launch" (frames 138..225)
  const searchZoom = interpolate(frame, [138, 175, 215], [1, 1.035, 1.03], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const searchPanX = interpolate(frame, [138, 175], [0, -10], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const searchPanY = interpolate(frame, [138, 175], [0, 12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [212, 225], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      <CosmicBackdrop primaryGlow="#10b981" secondaryGlow="#0ea5e9" intensity={1.0} />

      <TopHeadline
        eyebrow="Workspaces • Dynamic Title • Global Search"
        title="Organize every project into Spaces"
        accentWord="Spaces"
        accentColor="#34d399"
      />

      {/* Centered Live Extension Recording inside Sleek Browser Frame with Live Dynamic Tab Strip */}
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
            transform: `translateY(${frameY}px) scale(${baseScale}) rotateX(${rotateX}deg)`,
            transformOrigin: 'center center',
          }}
        >
          <BrowserFrame
            width={1360}
            height={765}
            accentColor="#10b981"
            dynamicTab={{
              title: switchedToLaunch
                ? '🚀 Product Launch — SpaceTabs'
                : '🔥 AI Research — SpaceTabs',
              highlightDynamic: true,
              isTransitioning: isTitleFlash,
              secondaryTabs: switchedToLaunch
                ? ['React', 'Figma', 'WXT', 'Linear']
                : ['arXiv', 'Hugging Face', 'PyTorch'],
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                transform: `scale(${searchZoom}) translate(${searchPanX}px, ${searchPanY}px)`,
                transformOrigin: '55% 20%',
              }}
            >
              <OffthreadVideo
                src={staticFile('footage/clip-spaces.mp4')}
                playbackRate={1.68}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                muted
              />
            </div>
          </BrowserFrame>
        </div>
      </div>

      <BottomPills
        delay={12}
        items={[
          { label: 'Unlimited Categorized Spaces', color: '#34d399' },
          { label: 'Dynamic Browser Tab Titles', color: '#f59e0b' },
          { label: 'Instant Cross-Space Global Search', color: '#a78bfa' },
        ]}
      />
    </AbsoluteFill>
  );
};
