// Small synthesis helpers on top of Web Audio: filtered noise bursts and
// enveloped tones, scheduled at a time and routed to an output node. Every
// sound in the game is built from these; there are no audio files.

export interface Kit {
  ctx: AudioContext;
  noise: AudioBuffer;
  out: AudioNode;
  /** Start time for this sound. */
  t: number;
}

export interface NoiseOpts {
  /** Filter type and frequency (Hz). */
  type?: BiquadFilterType;
  freq?: number;
  freqEnd?: number;
  q?: number;
  attack?: number;
  decay: number;
  gain: number;
  delay?: number;
  rate?: number;
}

export function noise(k: Kit, o: NoiseOpts): void {
  const { ctx } = k;
  const t = k.t + (o.delay ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = k.noise;
  src.playbackRate.value = o.rate ?? 1;
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.setValueAtTime(o.freq ?? 1000, t);
  if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t + (o.attack ?? 0.005) + o.decay);
  f.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  const a = o.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.gain, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + o.decay);
  src.connect(f).connect(g).connect(k.out);
  // Random start into the buffer so repeats don't sound identical.
  src.start(t, Math.random() * (k.noise.duration - 1));
  src.stop(t + a + o.decay + 0.05);
}

export interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  freqEnd?: number;
  attack?: number;
  decay: number;
  gain: number;
  delay?: number;
  /** Optional lowpass on the tone. */
  lowpass?: number;
  vibrato?: { rate: number; depth: number };
}

export function tone(k: Kit, o: ToneOpts): void {
  const { ctx } = k;
  const t = k.t + (o.delay ?? 0);
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t);
  const a = o.attack ?? 0.005;
  if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, t + a + o.decay);
  let node: AudioNode = osc;
  if (o.lowpass) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lowpass;
    node = osc.connect(f);
  }
  if (o.vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = o.vibrato.rate;
    depth.gain.value = o.vibrato.depth;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + a + o.decay + 0.05);
  }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.gain, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + o.decay);
  node.connect(g).connect(k.out);
  osc.start(t);
  osc.stop(t + a + o.decay + 0.05);
}

export function makeNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
