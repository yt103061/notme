import { getSettings } from "./settings";

// Web上ではハプティクスに頼れないため、音を触覚の代替チャネルとして設計する(plan.md 5章)。
// 効果音ファイルは使わず、白色ノイズ+フィルタで「紙」の質感をその場合成する。

export type PaperSoundKind =
  | "touch"
  | "lift"
  | "land"
  | "flip"
  | "fan"
  | "invalid"
  | "rare"
  | "victory";

let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!ctx) ctx = new AudioCtor();
  return ctx;
}

/** 初回のユーザー操作で AudioContext を resume するゲート。ページのどこかで一度呼べばよい。 */
export function unlockAudio() {
  const c = getContext();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

function getNoiseBuffer(c: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const length = c.sampleRate * 0.6;
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

interface BurstOpts {
  filterType: BiquadFilterType;
  freq: number;
  freqEnd?: number;
  q?: number;
  duration: number;
  gain: number;
  delay?: number;
}

function playNoiseBurst(c: AudioContext, opts: BurstOpts) {
  const src = c.createBufferSource();
  src.buffer = getNoiseBuffer(c);

  const filter = c.createBiquadFilter();
  filter.type = opts.filterType;
  filter.frequency.setValueAtTime(opts.freq, c.currentTime + (opts.delay ?? 0));
  if (opts.freqEnd !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(opts.freqEnd, 1),
      c.currentTime + (opts.delay ?? 0) + opts.duration,
    );
  }
  filter.Q.value = opts.q ?? 0.7;

  const gainNode = c.createGain();
  const start = c.currentTime + (opts.delay ?? 0);
  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(opts.gain, 0.001), start + 0.006);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);

  src.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(c.destination);
  src.start(start);
  src.stop(start + opts.duration + 0.05);
}

function playTone(c: AudioContext, freq: number, duration: number, gain: number, delay = 0) {
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, c.currentTime + delay);
  const gainNode = c.createGain();
  const start = c.currentTime + delay;
  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(gain, 0.001), start + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gainNode);
  gainNode.connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/**
 * カードの接触音を鳴らす。velocity(0〜1目安)に応じてピッチ・音量が変わり、
 * 固定サンプルの単発再生にならないようにする。
 */
export function playCardSound(kind: PaperSoundKind, velocity = 0.4) {
  if (!getSettings().soundOn) return;
  const c = getContext();
  if (!c) return;
  const v = Math.max(0, Math.min(1, velocity));

  switch (kind) {
    case "touch":
      playNoiseBurst(c, { filterType: "highpass", freq: 3500, duration: 0.05, gain: 0.05 + v * 0.03, q: 0.5 });
      break;
    case "lift":
      playNoiseBurst(c, { filterType: "bandpass", freq: 1800 + v * 900, freqEnd: 2600 + v * 700, duration: 0.09, gain: 0.06 + v * 0.05, q: 0.9 });
      break;
    case "land":
      playNoiseBurst(c, { filterType: "lowpass", freq: 2200 + v * 1400, duration: 0.12 + v * 0.05, gain: 0.12 + v * 0.18, q: 0.6 });
      playNoiseBurst(c, { filterType: "highpass", freq: 4000, duration: 0.03, gain: 0.05 + v * 0.05, delay: 0.005 });
      break;
    case "flip":
      playNoiseBurst(c, { filterType: "bandpass", freq: 2600, freqEnd: 1400, duration: 0.18, gain: 0.08 + v * 0.06, q: 1.2 });
      break;
    case "fan":
      playNoiseBurst(c, { filterType: "highpass", freq: 5000, duration: 0.04, gain: 0.04 + v * 0.04, q: 0.4 });
      break;
    case "invalid":
      playTone(c, 140, 0.14, 0.05);
      break;
    case "rare": {
      playNoiseBurst(c, { filterType: "bandpass", freq: 2200, freqEnd: 3400, duration: 0.4, gain: 0.1, q: 1.5 });
      playTone(c, 880, 0.5, 0.04, 0.05);
      playTone(c, 1320, 0.5, 0.03, 0.12);
      break;
    }
    case "victory": {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => playTone(c, freq, 0.6, 0.05, i * 0.12));
      break;
    }
  }
}
