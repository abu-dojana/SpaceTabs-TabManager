import React from 'react';

export interface DynamicTabConfig {
  title: string;
  highlightDynamic?: boolean;
  isTransitioning?: boolean;
  secondaryTabs?: string[];
}

interface BrowserFrameProps {
  children: React.ReactNode;
  accentColor?: string;
  urlLabel?: string;
  dynamicTab?: DynamicTabConfig;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  children,
  accentColor = '#10b981',
  urlLabel = 'SpaceTabs — Tab Manager',
  dynamicTab,
  width = 1480,
  height = 832,
  style,
}) => {
  const chromeBarHeight = dynamicTab ? 44 : 40;

  return (
    <div
      style={{
        width,
        height: height + chromeBarHeight,
        borderRadius: 20,
        overflow: 'hidden',
        border: `1.5px solid ${accentColor}55`,
        backgroundColor: '#090d1a',
        boxShadow: `0 38px 110px rgba(0, 0, 0, 0.78), 0 0 70px ${accentColor}26, inset 0 1px 0 rgba(255,255,255,0.14)`,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        ...style,
      }}
    >
      {/* Sleek Studio Browser Top Bar (Standard URL Pill OR Live Dynamic Chromium Tab Strip) */}
      {dynamicTab ? (
        <div
          style={{
            height: chromeBarHeight,
            background: 'linear-gradient(180deg, #111729 0%, #0b0f1d 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            padding: '0 16px',
            flexShrink: 0,
            fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
          }}
        >
          {/* Left: Traffic Lights + Live Dynamic Browser Tabs */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: '100%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                height: '100%',
                marginRight: 6,
              }}
            >
              <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f56' }} />
              <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffbd2e' }} />
              <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#27c93f' }} />
            </div>

            {/* Active Dynamic SpaceTabs Tab */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                height: 35,
                padding: '0 16px',
                borderTopLeftRadius: 11,
                borderTopRightRadius: 11,
                background: dynamicTab.isTransitioning
                  ? `${accentColor}30`
                  : 'rgba(22, 30, 50, 0.96)',
                borderTop: `1.5px solid ${accentColor}`,
                borderLeft: `1px solid ${accentColor}55`,
                borderRight: `1px solid ${accentColor}55`,
                boxShadow: dynamicTab.isTransitioning
                  ? `0 -4px 24px ${accentColor}66`
                  : `0 -2px 14px ${accentColor}28`,
                color: '#f8fafc',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              {/* Tiny SpaceTabs icon mark */}
              <span
                style={{
                  width: 15,
                  height: 15,
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #f43f5e, #be123c)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 12l10 5 10-5" />
                  <path d="M2 17l10 5 10-5" />
                </svg>
              </span>
              <span>{dynamicTab.title}</span>
            </div>

            {/* Subtle Secondary Background Tabs */}
            {(dynamicTab.secondaryTabs || []).map((tabTitle) => (
              <div
                key={tabTitle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 31,
                  padding: '0 13px',
                  borderTopLeftRadius: 9,
                  borderTopRightRadius: 9,
                  background: 'rgba(255, 255, 255, 0.035)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderBottom: 'none',
                  color: '#64748b',
                  fontSize: 11.5,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#475569',
                  }}
                />
                {tabTitle}
              </div>
            ))}

            {/* Optional Dynamic Title Callout Badge */}
            {dynamicTab.highlightDynamic && (
              <div
                style={{
                  alignSelf: 'center',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 11px',
                  borderRadius: 999,
                  background: `${accentColor}24`,
                  border: `1px solid ${accentColor}77`,
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  boxShadow: `0 0 18px ${accentColor}44`,
                  marginLeft: 4,
                }}
              >
                <span style={{ color: accentColor }}>✦</span>
                <span>Dynamic Tab Title</span>
              </div>
            )}
          </div>

          {/* Right: Shortcut Badge */}
          <div
            style={{
              alignSelf: 'center',
              fontSize: 11,
              fontWeight: 600,
              color: '#64748b',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              padding: '3px 8px',
              borderRadius: 6,
              border: '1px solid rgba(148, 163, 184, 0.16)',
              background: 'rgba(15, 23, 42, 0.6)',
            }}
          >
            Alt + Shift + W
          </div>
        </div>
      ) : (
        <div
          style={{
            height: chromeBarHeight,
            background: 'linear-gradient(180deg, #13192b 0%, #0d1220 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 18px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }} />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 18px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.055)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#cbd5e1',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.01em',
              fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: accentColor,
                boxShadow: `0 0 8px ${accentColor}`,
              }}
            />
            <span>{urlLabel}</span>
          </div>

          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#64748b',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              padding: '3px 8px',
              borderRadius: 6,
              border: '1px solid rgba(148, 163, 184, 0.16)',
              background: 'rgba(15, 23, 42, 0.6)',
            }}
          >
            Alt + Shift + W
          </div>
        </div>
      )}

      {/* Content Viewport */}
      <div
        style={{
          width,
          height,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#070a14',
        }}
      >
        {children}
      </div>
    </div>
  );
};
