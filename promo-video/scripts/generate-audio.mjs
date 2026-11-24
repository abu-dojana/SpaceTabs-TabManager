import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.resolve(__dirname, '../public/audio/soundtrack.wav');

const SAMPLE_RATE = 44100;
const DURATION_SEC = 57.0;
const TOTAL_SAMPLES = Math.floor(SAMPLE_RATE * DURATION_SEC);

const left = new Float32Array(TOTAL_SAMPLES);
const right = new Float32Array(TOTAL_SAMPLES);

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Deterministic pseudo-random for silky filtered noise
let seed = 133742;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 0xffffffff) * 2 - 1;
}

// 100 BPM -> 1 beat = 0.6s, 1 bar (4 beats) = 2.4s
const BEAT = 0.6;
const BAR = BEAT * 4;

// Uplifting dark-cosmic ambient chord progression: Am9 -> Fmaj7 -> Cmaj7 -> G6
const CHORDS = [
  { root: 45, notes: [57, 64, 67, 71, 72] }, // Am9
  { root: 41, notes: [53, 60, 64, 69, 72] }, // Fmaj7
  { root: 48, notes: [60, 67, 71, 76, 79] }, // Cmaj7
  { root: 43, notes: [55, 62, 64, 71, 74] }, // G6
];

// 1. Lush detuned cosmic ambient pad + warm sub bass
console.log('Synthesizing cosmic ambient pad & bass...');
const padL = new Float32Array(TOTAL_SAMPLES);
const padR = new Float32Array(TOTAL_SAMPLES);

for (let barIdx = 0; barIdx < Math.ceil(DURATION_SEC / BAR); barIdx++) {
  const chord = CHORDS[barIdx % CHORDS.length];
  const barStart = barIdx * BAR;
  const barEnd = Math.min(DURATION_SEC, barStart + BAR + 0.35);
  const startS = Math.floor(barStart * SAMPLE_RATE);
  const endS = Math.min(TOTAL_SAMPLES, Math.floor(barEnd * SAMPLE_RATE));

  // Intensity curve: gentle intro, energetic middle showcase, warm outro
  const isFinalBar = barStart >= 52.2;

  for (let i = startS; i < endS; i++) {
    const t = i / SAMPLE_RATE;
    const localT = t - barStart;
    const attack = Math.min(1, localT / 0.45);
    const release = localT > BAR - 0.15 ? Math.max(0, 1 - (localT - (BAR - 0.15)) / 0.5) : 1;
    const env = attack * release;

    // Gentle sidechain ducking when beat pulse is active (6.0s to 52.5s)
    let sidechain = 1.0;
    if (t >= 6.0 && t < 52.5) {
      const beatPhase = ((t - 6.0) % BEAT) / BEAT;
      sidechain = 0.72 + 0.28 * Math.min(1, beatPhase / 0.35);
    }

    // Lush 5-voice stereo detuned pad
    let sumL = 0;
    let sumR = 0;
    const notes = isFinalBar ? [57, 64, 69, 71, 76] : chord.notes; // resolve on Aadd9
    for (let n = 0; n < notes.length; n++) {
      const f = midiToFreq(notes[n]);
      const detune = (n % 2 === 0 ? 1 : -1) * 0.0028;
      const slowLfo = 0.85 + 0.15 * Math.sin(2 * Math.PI * (0.22 + n * 0.05) * t);
      const s1 =
        Math.sin(2 * Math.PI * f * (1 + detune) * t) * 0.72 +
        Math.sin(2 * Math.PI * f * 2 * (1 + detune) * t) * 0.18 +
        Math.sin(2 * Math.PI * f * 3 * t) * 0.05;
      const s2 =
        Math.sin(2 * Math.PI * f * (1 - detune) * t) * 0.72 +
        Math.sin(2 * Math.PI * f * 2 * (1 - detune) * t) * 0.18 +
        Math.sin(2 * Math.PI * f * 3 * t) * 0.05;
      const pan = n / Math.max(1, notes.length - 1); // 0..1
      sumL += (s1 * (1 - pan * 0.45) + s2 * (pan * 0.45)) * slowLfo;
      sumR += (s2 * (1 - pan * 0.45) + s1 * (pan * 0.45)) * slowLfo;
    }

    const padGain = (t < 3.0 ? 0.055 : t < 52.5 ? 0.075 : 0.065) * env * sidechain;
    padL[i] += (sumL / notes.length) * padGain;
    padR[i] += (sumR / notes.length) * padGain;

    // Warm sub bass (starts gently at 3.0s, fuller from 6.0s to 52.5s)
    if (t >= 2.8) {
      const bassMidi = isFinalBar ? 45 : chord.root;
      const bf = midiToFreq(bassMidi);
      const bassLevel = t < 6.0 ? 0.08 : t < 52.5 ? 0.15 : 0.09;
      const bWave =
        Math.sin(2 * Math.PI * bf * t) * 0.85 +
        Math.sin(2 * Math.PI * bf * 2 * t) * 0.15;
      const bVal = bWave * bassLevel * env * sidechain;
      padL[i] += bVal;
      padR[i] += bVal;
    }
  }
}

// Gentle 1-pole low-pass on pad to keep it super warm & silky
let lpL = 0;
let lpR = 0;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;
  // Brightness opens during middle feature showcase
  const cutoff = t < 6.0 ? 0.12 : t < 52.5 ? 0.22 : 0.14;
  lpL += cutoff * (padL[i] - lpL);
  lpR += cutoff * (padR[i] - lpR);
  left[i] += lpL;
  right[i] += lpR;
}

// 2. Crystalline soft electric-piano / pluck arpeggio (6.0s to 41.0s)
console.log('Synthesizing Rhodes-style crystalline arpeggio...');
const arpStep = BEAT / 2; // 8th notes = 0.3s
const arpPattern = [0, 2, 1, 3, 4, 3, 2, 1];
const arpL = new Float32Array(TOTAL_SAMPLES);
const arpR = new Float32Array(TOTAL_SAMPLES);

for (let step = 0; ; step++) {
  const t0 = 6.0 + step * arpStep;
  if (t0 >= 52.5) break;
  const barIdx = Math.floor(t0 / BAR);
  const chord = CHORDS[barIdx % CHORDS.length];
  const noteMidi = chord.notes[arpPattern[step % arpPattern.length]] + 12;
  const freq = midiToFreq(noteMidi);
  const startS = Math.floor(t0 * SAMPLE_RATE);
  const noteDur = 0.55;
  const len = Math.min(TOTAL_SAMPLES - startS, Math.floor(noteDur * SAMPLE_RATE));
  const pan = 0.28 + 0.44 * ((step % 4) / 3);
  const accent = step % 4 === 0 ? 1.0 : 0.72;

  for (let k = 0; k < len; k++) {
    const lt = k / SAMPLE_RATE;
    const env = Math.min(1, lt / 0.008) * Math.exp(-lt * 6.5);
    const wave =
      Math.sin(2 * Math.PI * freq * lt) * 0.78 +
      Math.sin(2 * Math.PI * freq * 2 * lt) * 0.16 * Math.exp(-lt * 10) +
      Math.sin(2 * Math.PI * freq * 3 * lt) * 0.06 * Math.exp(-lt * 16);
    const val = wave * env * 0.055 * accent;
    arpL[startS + k] += val * (1 - pan);
    arpR[startS + k] += val * pan;
  }
}

// Subtle stereo ping-pong echo on arpeggio
const delaySamplesL = Math.floor(0.3 * SAMPLE_RATE);
const delaySamplesR = Math.floor(0.45 * SAMPLE_RATE);
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const dL = i >= delaySamplesL ? arpR[i - delaySamplesL] * 0.32 : 0;
  const dR = i >= delaySamplesR ? arpL[i - delaySamplesR] * 0.28 : 0;
  left[i] += arpL[i] + dL;
  right[i] += arpR[i] + dR;
}

// 3. Soft pulse kick + silky hi-hat texture (6.0s to 39.6s)
console.log('Synthesizing soft electronic groove...');
for (let beatIdx = 0; ; beatIdx++) {
  const t0 = 6.0 + beatIdx * BEAT;
  if (t0 >= 52.5) break;
  const startS = Math.floor(t0 * SAMPLE_RATE);

  // Ultra-soft warm thump kick on beats 0, 2 (and gentle ghost on 1, 3 during theme showcase)
  const isStrong = beatIdx % 2 === 0 || (t0 >= 36.5 && t0 < 45.5);
  if (isStrong) {
    const kickLen = Math.min(TOTAL_SAMPLES - startS, Math.floor(0.16 * SAMPLE_RATE));
    let phase = 0;
    for (let k = 0; k < kickLen; k++) {
      const lt = k / SAMPLE_RATE;
      const freq = 46 + 75 * Math.exp(-lt * 34);
      phase += (2 * Math.PI * freq) / SAMPLE_RATE;
      const env = Math.min(1, lt / 0.004) * Math.exp(-lt * 18);
      const gain = beatIdx % 2 === 0 ? 0.14 : 0.075;
      const v = Math.sin(phase) * env * gain;
      left[startS + k] += v;
      right[startS + k] += v;
    }
  }

  // Soft silky off-beat shaker tick
  const hatT0 = t0 + BEAT * 0.5;
  if (hatT0 < 52.5) {
    const hatS = Math.floor(hatT0 * SAMPLE_RATE);
    const hatLen = Math.min(TOTAL_SAMPLES - hatS, Math.floor(0.035 * SAMPLE_RATE));
    let prev = 0;
    for (let k = 0; k < hatLen; k++) {
      const lt = k / SAMPLE_RATE;
      const n = rand();
      const hp = n - prev * 0.85;
      prev = n;
      const env = Math.min(1, lt / 0.002) * Math.exp(-lt * 95);
      const v = hp * env * 0.018;
      left[hatS + k] += v * 0.85;
      right[hatS + k] += v * 1.15;
    }
  }
}

// 4. Helper functions for crisp, tasteful UI sound effects
function addWhoosh(centerSec, duration = 0.42, gain = 0.075, panStart = -0.35, panEnd = 0.35) {
  const startSec = Math.max(0, centerSec - duration * 0.5);
  const startS = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.min(TOTAL_SAMPLES - startS, Math.floor(duration * SAMPLE_RATE));
  let lp = 0;
  let lp2 = 0;
  for (let k = 0; k < len; k++) {
    const p = k / len; // 0..1
    const env = Math.sin(Math.PI * p) ** 1.8;
    const cutoff = 0.03 + 0.24 * Math.sin(Math.PI * p);
    const n = rand();
    lp += cutoff * (n - lp);
    lp2 += cutoff * (lp - lp2);
    const v = lp2 * env * gain;
    const pan = 0.5 + 0.5 * (panStart + (panEnd - panStart) * p);
    left[startS + k] += v * (1 - pan);
    right[startS + k] += v * pan;
  }
}

function addClick(timeSec, pitchHz = 1450, gain = 0.065) {
  const startS = Math.floor(timeSec * SAMPLE_RATE);
  const len = Math.min(TOTAL_SAMPLES - startS, Math.floor(0.024 * SAMPLE_RATE));
  for (let k = 0; k < len; k++) {
    const lt = k / SAMPLE_RATE;
    const env = Math.min(1, lt / 0.0012) * Math.exp(-lt * 210);
    const tone =
      Math.sin(2 * Math.PI * pitchHz * lt) * 0.75 +
      Math.sin(2 * Math.PI * (pitchHz * 1.52) * lt) * 0.25;
    const v = tone * env * gain;
    left[startS + k] += v;
    right[startS + k] += v;
  }
}

function addShimmerChime(timeSec, notes = [69, 76, 81, 83], gain = 0.055) {
  notes.forEach((midi, idx) => {
    const t0 = timeSec + idx * 0.065;
    const startS = Math.floor(t0 * SAMPLE_RATE);
    const freq = midiToFreq(midi);
    const len = Math.min(TOTAL_SAMPLES - startS, Math.floor(1.4 * SAMPLE_RATE));
    const pan = 0.3 + 0.4 * (idx / Math.max(1, notes.length - 1));
    for (let k = 0; k < len; k++) {
      const lt = k / SAMPLE_RATE;
      const env = Math.min(1, lt / 0.012) * Math.exp(-lt * 2.8);
      const wave =
        Math.sin(2 * Math.PI * freq * lt) * 0.8 +
        Math.sin(2 * Math.PI * freq * 2 * lt) * 0.2 * Math.exp(-lt * 5);
      const v = wave * env * gain;
      left[startS + k] += v * (1 - pan);
      right[startS + k] += v * pan;
    }
  });
}

console.log('Layering frame-synced UI sound effects...');
// Scene transitions whooshes (57s 8-scene timeline)
addWhoosh(2.8, 0.45, 0.085, -0.4, 0.4);   // Chaos -> Logo reveal
addWhoosh(6.0, 0.42, 0.075, 0.35, -0.35); // Scene 2: Spaces + Dynamic Title + Search
addWhoosh(13.5, 0.4, 0.075, -0.3, 0.3);   // Scene 3: Deduplicate + Drag & Drop + Archive
addWhoosh(22.0, 0.4, 0.075, 0.35, -0.35); // Scene 4A: Right Floating Panel
addWhoosh(25.87, 0.38, 0.07, -0.3, 0.3);  // Scene 4B: Multi-Window Side-by-Side
addWhoosh(29.5, 0.4, 0.075, 0.3, -0.3);   // Scene 5: Resources, Notes & Tasks
addWhoosh(36.5, 0.42, 0.08, -0.35, 0.35); // Scene 6A: Appearance Settings
addWhoosh(41.5, 0.36, 0.068, 0.25, -0.25);// Scene 6B: 6-Theme Rapid Wipe
addWhoosh(45.5, 0.42, 0.075, -0.3, 0.3);  // Scene 7A: Memory Saver
addWhoosh(47.83, 0.34, 0.062, 0.25, -0.25);// Scene 7B: Google Drive Sync
addWhoosh(50.17, 0.34, 0.062, -0.25, 0.25);// Scene 7C: Support Creator Donations
addWhoosh(52.5, 0.5, 0.085, -0.35, 0.35); // Scene 8: Outro CTA

// Brand shimmer reveals
addShimmerChime(2.95, [69, 76, 81, 83], 0.058); // Logo intro
addShimmerChime(52.8, [69, 73, 76, 81, 88], 0.062); // Outro CTA

// Scene 2: Spaces switch + dynamic title + search
addClick(7.2, 1480, 0.055);
addClick(9.2, 1380, 0.05);
addClick(10.8, 1520, 0.05);

// Scene 3: Close Duplicates + Drag & Drop + Archive
addClick(15.2, 1540, 0.055);
addClick(18.5, 1680, 0.06);
addClick(20.6, 1420, 0.055);

// Scene 4: Right Floating Panel clicks + Multi-window pop
addClick(23.1, 1450, 0.055);
addClick(24.7, 1580, 0.055);
addClick(26.1, 1660, 0.06);

// Scene 5: Resources -> Notes -> Tasks checkoffs
addClick(30.9, 1380, 0.052);
addClick(33.2, 1480, 0.052);
addClick(35.1, 1780, 0.058);
addClick(35.8, 1980, 0.062);

// Scene 6A: Appearance live palette clicks
addClick(37.6, 1380, 0.05);
addClick(38.8, 1480, 0.05);
addClick(40.0, 1580, 0.05);

// Scene 6B: 6 full-dashboard theme wipes (every 20/30 = 0.667s from 41.5s to 45.5s)
for (let i = 0; i < 6; i++) {
  addClick(41.5 + i * (20 / 30), 1350 + i * 110, 0.058);
}

// Scene 7: Memory Saver, Drive Sync, Support Creator entrances
addClick(45.8, 1420, 0.055);
addClick(48.1, 1560, 0.055);
addClick(50.5, 1720, 0.06);

// Master fade-in/out & soft clip limiting
console.log('Mastering stereo WAV...');
const fadeInSamples = Math.floor(0.35 * SAMPLE_RATE);
const fadeOutSamples = Math.floor(1.8 * SAMPLE_RATE);

for (let i = 0; i < TOTAL_SAMPLES; i++) {
  let gain = 1.0;
  if (i < fadeInSamples) {
    gain = i / fadeInSamples;
  } else if (i > TOTAL_SAMPLES - fadeOutSamples) {
    gain = (TOTAL_SAMPLES - i) / fadeOutSamples;
  }
  // Soft saturation limiter
  left[i] = Math.tanh(left[i] * gain * 1.15) * 0.88;
  right[i] = Math.tanh(right[i] * gain * 1.15) * 0.88;
}

// Write 16-bit stereo PCM WAV
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
const numChannels = 2;
const bitsPerSample = 16;
const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8);
const blockAlign = numChannels * (bitsPerSample / 8);
const dataSize = TOTAL_SAMPLES * blockAlign;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20); // PCM
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(bitsPerSample, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

let offset = 44;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const sL = Math.max(-1, Math.min(1, left[i]));
  const sR = Math.max(-1, Math.min(1, right[i]));
  buffer.writeInt16LE(Math.round(sL * 32767), offset);
  buffer.writeInt16LE(Math.round(sR * 32767), offset + 2);
  offset += 4;
}

fs.writeFileSync(OUT_PATH, buffer);
console.log(`Audio written successfully to ${OUT_PATH} (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);
