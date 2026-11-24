import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { CosmicBackdrop } from '../components/CosmicBackdrop';
import { BrowserFrame } from '../components/BrowserFrame';

// 210 frames (7.0s):
// Act 1 (0..70): Smart Memory Saver
// Act 2 (70..140): Private Google Drive Sync
// Act 3 (140..210): Free Forever & Support Creator (Donations)
const ACT2_START = 70;
const ACT3_START = 140;

export const Scene5MemoryAndSync: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const act = frame < ACT2_START ? 1 : frame < ACT3_START ? 2 : 3;
  const actStart = act === 1 ? 0 : act === 2 ? ACT2_START : ACT3_START;
  const actFrame = frame - actStart;

  const actSpring = spring({
    frame: actFrame,
    fps,
    config: { damping: 16, stiffness: 125, mass: 0.9 },
  });

  const ramNow = interpolate(frame, [10, 56], [4.8, 0.9], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const ramPct = interpolate(frame, [10, 56], [92, 18], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [198, 210], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const act1Opacity = interpolate(frame, [ACT2_START - 8, ACT2_START], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const act2Opacity =
    interpolate(frame, [ACT2_START - 4, ACT2_START + 6], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) *
    interpolate(frame, [ACT3_START - 8, ACT3_START], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  const act3Opacity = interpolate(frame, [ACT3_START - 4, ACT3_START + 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const accent = act === 1 ? '#06b6d4' : act === 2 ? '#10b981' : '#f43f5e';
  const accent2 = act === 1 ? '#f59e0b' : act === 2 ? '#38bdf8' : '#ec4899';

  return (
    <AbsoluteFill
      style={{
        opacity: fadeIn * fadeOut,
        fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
      }}
    >
      <CosmicBackdrop primaryGlow={accent} secondaryGlow={accent2} intensity={1.12} />

      {/* ACT 1: SMART MEMORY SAVER */}
      {frame < ACT2_START + 4 && (
        <AbsoluteFill
          style={{
            opacity: act1Opacity,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 54,
            padding: '0 76px',
          }}
        >
          <div
            style={{
              width: 560,
              transform: `translateX(${interpolate(actSpring, [0, 1], [-44, 0])}px)`,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 15px',
                borderRadius: 999,
                background: 'rgba(6, 182, 212, 0.16)',
                border: '1px solid rgba(6, 182, 212, 0.45)',
                color: '#22d3ee',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 20,
              }}
            >
              ⚡ Smart Memory Saver
            </div>

            <div
              style={{
                fontSize: 54,
                fontWeight: 900,
                letterSpacing: '-0.035em',
                lineHeight: 1.07,
                color: '#f8fafc',
                marginBottom: 20,
              }}
            >
              Keep 100 tabs.{' '}
              <span
                style={{
                  backgroundImage: 'linear-gradient(120deg, #22d3ee, #34d399)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Use 80% less RAM.
              </span>
            </div>

            <div style={{ fontSize: 20, lineHeight: 1.55, color: '#cbd5e1', marginBottom: 30 }}>
              Cold-restores dormant placeholders and uses Chromium&apos;s native{' '}
              <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>
                tabs.discard()
              </span>{' '}
              — zero tab loss, zero slowdowns.
            </div>

            <div
              style={{
                padding: '22px 24px',
                borderRadius: 18,
                background: 'rgba(10, 17, 34, 0.88)',
                border: '1px solid rgba(56, 189, 248, 0.32)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 12,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>
                  BROWSER MEMORY FOOTPRINT
                </span>
                <span
                  style={{
                    fontSize: 30,
                    fontWeight: 900,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    color: ramNow < 2.0 ? '#34d399' : '#fb7185',
                  }}
                >
                  {ramNow.toFixed(1)} GB
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 14,
                  borderRadius: 999,
                  background: 'rgba(30, 41, 59, 0.9)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${ramPct}%`,
                    height: '100%',
                    borderRadius: 999,
                    background:
                      ramNow < 2.0
                        ? 'linear-gradient(90deg, #06b6d4, #10b981)'
                        : 'linear-gradient(90deg, #f43f5e, #f97316)',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#94a3b8',
                }}
              >
                <span>Pinned &amp; audible tabs protected</span>
                <span style={{ color: '#34d399' }}>Zero Tab Loss ✓</span>
              </div>
            </div>
          </div>

          <div
            style={{
              perspective: 1800,
              transform: `translateX(${interpolate(actSpring, [0, 1], [60, 0])}px)`,
            }}
          >
            <div style={{ transform: 'rotateY(-6deg)' }}>
              <BrowserFrame
                width={1080}
                height={608}
                accentColor="#06b6d4"
                urlLabel="Settings → Chromium Native Memory Saver"
              >
                <Img
                  src={staticFile('screenshots/settings-memory-saver.png')}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scale(1.14)',
                    transformOrigin: '52% 48%',
                  }}
                />
              </BrowserFrame>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ACT 2: PRIVATE GOOGLE DRIVE SYNC */}
      {frame >= ACT2_START - 6 && frame < ACT3_START + 4 && (
        <AbsoluteFill
          style={{
            opacity: act2Opacity,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 54,
            padding: '0 76px',
          }}
        >
          <div
            style={{
              perspective: 1800,
              transform: `translateX(${interpolate(actSpring, [0, 1], [-60, 0])}px)`,
            }}
          >
            <div style={{ transform: 'rotateY(6deg)' }}>
              <BrowserFrame
                width={1080}
                height={608}
                accentColor="#10b981"
                urlLabel="Settings → Direct Google Drive Cloud Sync"
              >
                <Img
                  src={staticFile('screenshots/settings-drive-sync.png')}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scale(1.13)',
                    transformOrigin: '52% 48%',
                  }}
                />
              </BrowserFrame>
            </div>
          </div>

          <div
            style={{
              width: 560,
              transform: `translateX(${interpolate(actSpring, [0, 1], [44, 0])}px)`,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 15px',
                borderRadius: 999,
                background: 'rgba(16, 185, 129, 0.16)',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                color: '#34d399',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 20,
              }}
            >
              ☁️ Private Cloud Sync
            </div>

            <div
              style={{
                fontSize: 54,
                fontWeight: 900,
                letterSpacing: '-0.035em',
                lineHeight: 1.07,
                color: '#f8fafc',
                marginBottom: 20,
              }}
            >
              Sync straight to{' '}
              <span
                style={{
                  backgroundImage: 'linear-gradient(120deg, #34d399, #38bdf8)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                your Google Drive.
              </span>
            </div>

            <div style={{ fontSize: 20, lineHeight: 1.55, color: '#cbd5e1', marginBottom: 26 }}>
              Direct browser-to-Drive backup in{' '}
              <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>
                SpaceTabs_Data
              </span>{' '}
              across Chrome, Brave &amp; Edge. Zero third-party servers.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {[
                {
                  title: 'Zero Middleman Servers',
                  desc: 'Direct OAuth2 drive.file scope — your data stays 100% yours',
                  color: '#34d399',
                },
                {
                  title: 'Tombstone-Aware Multi-Device Merge',
                  desc: 'Spaces, tabs, notes, tasks & resources stay cleanly in sync',
                  color: '#38bdf8',
                },
                {
                  title: '1-Click Local JSON & HTML Export',
                  desc: 'Instant offline backup anytime with zero lock-in',
                  color: '#a78bfa',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '13px 18px',
                    borderRadius: 14,
                    background: 'rgba(10, 17, 34, 0.78)',
                    border: `1px solid ${item.color}38`,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: item.color,
                      boxShadow: `0 0 12px ${item.color}`,
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ACT 3: FREE & OPEN SOURCE — COMMUNITY DONATIONS / SUPPORT CREATOR */}
      {frame >= ACT3_START - 6 && (
        <AbsoluteFill
          style={{
            opacity: act3Opacity,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 54,
            padding: '0 76px',
          }}
        >
          <div
            style={{
              width: 560,
              transform: `translateX(${interpolate(actSpring, [0, 1], [-44, 0])}px)`,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 15px',
                borderRadius: 999,
                background: 'rgba(244, 63, 94, 0.18)',
                border: '1px solid rgba(244, 63, 94, 0.5)',
                color: '#fb7185',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 20,
              }}
            >
              ❤️ Open Source • Community Powered
            </div>

            <div
              style={{
                fontSize: 52,
                fontWeight: 900,
                letterSpacing: '-0.035em',
                lineHeight: 1.08,
                color: '#f8fafc',
                marginBottom: 20,
              }}
            >
              Zero paywalls.{' '}
              <span
                style={{
                  backgroundImage: 'linear-gradient(120deg, #fb7185, #f59e0b)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Support the Creator.
              </span>
            </div>

            <div style={{ fontSize: 19.5, lineHeight: 1.55, color: '#cbd5e1', marginBottom: 26 }}>
              SpaceTabs is independently built, open-source (GPL-3.0), and{' '}
              <strong style={{ color: '#ffffff' }}>free forever</strong>. Optional community
              donations fuel continuous updates.
            </div>

            {/* Donation Channels Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { name: 'SupportKori', sub: 'bKash • Nagad • Rocket', color: '#f43f5e' },
                { name: 'bKash Direct', sub: 'Instant Local Tip', color: '#ec4899' },
                { name: 'Patreon', sub: 'Monthly or One-Time', color: '#f59e0b' },
                { name: 'SociaBuzz', sub: 'Global Cards & Tips', color: '#38bdf8' },
              ].map((ch) => (
                <div
                  key={ch.name}
                  style={{
                    padding: '13px 16px',
                    borderRadius: 14,
                    background: 'rgba(10, 17, 34, 0.84)',
                    border: `1px solid ${ch.color}48`,
                    boxShadow: `0 10px 26px rgba(0,0,0,0.35), 0 0 18px ${ch.color}16`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 15,
                      fontWeight: 800,
                      color: '#f8fafc',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: ch.color,
                        boxShadow: `0 0 10px ${ch.color}`,
                      }}
                    />
                    {ch.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{ch.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              perspective: 1800,
              transform: `translateX(${interpolate(actSpring, [0, 1], [60, 0])}px)`,
            }}
          >
            <div style={{ transform: 'rotateY(-6deg)' }}>
              <BrowserFrame
                width={1080}
                height={608}
                accentColor="#f43f5e"
                urlLabel="Settings → Support Creator & Donations"
              >
                <Img
                  src={staticFile('screenshots/settings-support-creator.png')}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scale(1.14)',
                    transformOrigin: '52% 48%',
                  }}
                />
              </BrowserFrame>
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
