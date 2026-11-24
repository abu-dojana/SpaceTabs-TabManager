import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { Scene1HookIntro } from './scenes/Scene1HookIntro';
import { Scene2SpacesDemo } from './scenes/Scene2SpacesDemo';
import { Scene3PowerActions } from './scenes/Scene3PowerActions';
import { Scene4FloatingAndMultiWindow } from './scenes/Scene4FloatingAndMultiWindow';
import { Scene3WorkspaceSuite } from './scenes/Scene3WorkspaceSuite';
import { Scene4ThemesShowcase } from './scenes/Scene4ThemesShowcase';
import { Scene5MemoryAndSync } from './scenes/Scene5MemoryAndSync';
import { Scene6OutroCTA } from './scenes/Scene6OutroCTA';

// Total: 1710 frames @ 30fps = 57.0 seconds
export const SpaceTabsPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#050712' }}>
      {/* Synthesized ambient cosmic soundtrack + frame-synced UI sound effects */}
      <Audio src={staticFile('audio/soundtrack.wav')} volume={0.92} />

      {/* Scene 1: Tab Chaos Hook + SpaceTabs Logo Reveal (0:00 – 0:06 | 180f) */}
      <Sequence from={0} durationInFrames={180} name="Hook & Brand Reveal">
        <Scene1HookIntro />
      </Sequence>

      {/* Scene 2: Live Spaces, Dynamic Tab Title & Global Search (0:06 – 0:13.5 | 225f) */}
      <Sequence from={180} durationInFrames={225} name="Spaces, Dynamic Title & Search">
        <Scene2SpacesDemo />
      </Sequence>

      {/* Scene 3: Duplicate Tab Closing, Drag & Drop, Archive (0:13.5 – 0:22.0 | 255f) */}
      <Sequence from={405} durationInFrames={255} name="Deduplicate, Drag & Drop & Archive">
        <Scene3PowerActions />
      </Sequence>

      {/* Scene 4: Right Floating Panel + Multi-Window Side-by-Side (0:22.0 – 0:30.0 | 240f) */}
      <Sequence from={660} durationInFrames={240} name="Right Floating Panel & Multi-Window">
        <Scene4FloatingAndMultiWindow />
      </Sequence>

      {/* Scene 5: Live Resources, Markdown Split Notes & Tasks (0:30.0 – 0:37.0 | 210f) */}
      <Sequence from={900} durationInFrames={210} name="Resources, Notes & Tasks">
        <Scene3WorkspaceSuite />
      </Sequence>

      {/* Scene 6: Appearance Live Theme Switching + 6 Full Dashboard Themes (0:37.0 – 0:45.5 | 255f) */}
      <Sequence from={1110} durationInFrames={255} name="Appearance & Multi-Theme Showcase">
        <Scene4ThemesShowcase />
      </Sequence>

      {/* Scene 7: Memory Saver, Google Drive Sync & Support Creator Donations (0:45.5 – 0:52.5 | 210f) */}
      <Sequence from={1365} durationInFrames={210} name="Memory Saver, Drive Sync & Support Creator">
        <Scene5MemoryAndSync />
      </Sequence>

      {/* Scene 8: Hero 3D Theme Fan Outro & Chrome Web Store CTA (0:52.5 – 0:57.0 | 135f) */}
      <Sequence from={1575} durationInFrames={135} name="Chrome Web Store CTA">
        <Scene6OutroCTA />
      </Sequence>
    </AbsoluteFill>
  );
};
