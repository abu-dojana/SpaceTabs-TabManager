import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface TopHeadlineProps {
  eyebrow?: string;
  title: string;
  accentWord?: string;
  accentColor?: string;
  delay?: number;
}

export const TopHeadline: React.FC<TopHeadlineProps> = ({
  eyebrow,
  title,
  accentWord,
  accentColor = '#10b981',
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const prog = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 130, mass: 0.8 },
  });

  const translateY = interpolate(prog, [0, 1], [-22, 0]);
  const opacity = interpolate(prog, [0, 0.7], [0, 1], { extrapolateRight: 'clamp' });

  const renderTitle = () => {
    if (!accentWord || !title.includes(accentWord)) return title;
    const parts = title.split(accentWord);
    return (
      <>
        {parts[0]}
        <span
          key={`${accentWord}-${accentColor}`}
          style={{
            backgroundImage: `linear-gradient(120deg, ${accentColor}, #ffffff)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
          }}
        >
          {accentWord}
        </span>
        {parts.slice(1).join(accentWord)}
      </>
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 30,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        zIndex: 30,
        transform: `translateY(${translateY}px)`,
        opacity,
        fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
      }}
    >
      {eyebrow && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 14px',
            borderRadius: 999,
            background: `${accentColor}1c`,
            border: `1px solid ${accentColor}4d`,
            color: accentColor,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 10,
            backdropFilter: 'blur(8px)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: accentColor,
              boxShadow: `0 0 10px ${accentColor}`,
            }}
          />
          {eyebrow}
        </div>
      )}
      <div
        style={{
          fontSize: 44,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: '#f8fafc',
          textShadow: '0 8px 32px rgba(0, 0, 0, 0.65)',
          lineHeight: 1.1,
        }}
      >
        {renderTitle()}
      </div>
    </div>
  );
};

interface BottomPillsProps {
  items: { label: string; color?: string }[];
  delay?: number;
}

export const BottomPills: React.FC<BottomPillsProps> = ({ items, delay = 10 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: 14,
        zIndex: 30,
        fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
      }}
    >
      {items.map((item, idx) => {
        const p = spring({
          frame: frame - delay - idx * 5,
          fps,
          config: { damping: 16, stiffness: 150 },
        });
        const ty = interpolate(p, [0, 1], [24, 0]);
        const c = item.color || '#38bdf8';
        return (
          <div
            key={item.label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              padding: '9px 18px',
              borderRadius: 999,
              background: 'rgba(10, 15, 32, 0.84)',
              border: `1px solid ${c}44`,
              boxShadow: `0 12px 32px rgba(0, 0, 0, 0.55), 0 0 20px ${c}18`,
              color: '#f1f5f9',
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              transform: `translateY(${ty}px)`,
              opacity: interpolate(p, [0, 0.6], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: c,
                boxShadow: `0 0 10px ${c}`,
              }}
            />
            {item.label}
          </div>
        );
      })}
    </div>
  );
};
