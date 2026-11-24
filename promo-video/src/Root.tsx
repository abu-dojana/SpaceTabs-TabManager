import React from 'react';
import { Composition } from 'remotion';
import { SpaceTabsPromo } from './SpaceTabsPromo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="SpaceTabsPromo"
      component={SpaceTabsPromo}
      durationInFrames={1710}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
