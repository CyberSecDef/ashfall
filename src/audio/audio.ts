// The audio engine: one AudioContext, created/resumed on the first touch or
// key (iOS requires a gesture). Ambience per level (filtered wind with gusts,
// a low drone, occasional distant sounds), a tension pad, and positioned cues
// panned and attenuated by distance from the listener (the camera's focus).
// Silent and inert where Web Audio doesn't exist (tests).

import type { Ambience } from '../levels/types';
import { cueFor } from './cues';
import { type Kit, makeNoiseBuffer, noise, tone } from './synth';

interface Bed {
  windGain: GainNode;
  windFilter: BiquadFilterNode;
  drone: GainNode;
  pad: GainNode;
  stop(): void;
}

/** Drone voicings per level mood (Hz). Unknown names fall back to `low_wind`. */
const DRONES: Record<string, number[]> = {
  low_wind: [55, 82.4],
  shelter_night: [49, 73.4, 98],
  dead_suburb: [65.4, 77.8, 98],
  rail_yard: [61.7, 92.5, 123.5],
  signal: [65.4, 98, 130.8, 196],
};

export class AudioEngine {
  ctx: AudioContext | null = null;
  muted = false;
  /** Cues played (for debug and tests). */
  readonly played: string[] = [];
  private master!: GainNode;
  private sfx!: GainNode;
  private noiseBuf!: AudioBuffer;
  private bed: Bed | null = null;
  private ambience: Ambience | null = null;
  private listenerX = 0;
  private gust = 0;
  private gustTarget = 0;
  private distantIn = 6;

  constructor() {
    if (typeof window === 'undefined') return;
    const unlock = () => this.unlock();
    for (const ev of ['touchend', 'pointerdown', 'keydown', 'mousedown']) window.addEventListener(ev, unlock, { passive: true });
  }

  get available(): boolean {
    return typeof window !== 'undefined' && !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);
  }

  unlock(): void {
    if (!this.available) return;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.9;
        // Gentle compression keeps crashes and gunshots from clipping on phone speakers.
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 4;
        this.master.connect(comp).connect(this.ctx.destination);
        this.sfx = this.ctx.createGain();
        this.sfx.connect(this.master);
        this.noiseBuf = makeNoiseBuffer(this.ctx);
        if (this.ambience) this.setAmbience(this.ambience);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      // No audio: play on silently.
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.1);
  }

  /** Start (or crossfade to) a level's ambience. */
  setAmbience(a: Ambience): void {
    this.ambience = a;
    const ctx = this.ctx;
    if (!ctx) return;
    const old = this.bed;
    if (old) {
      const t = ctx.currentTime;
      for (const g of [old.windGain, old.drone, old.pad]) g.gain.setTargetAtTime(0, t, 0.8);
      setTimeout(() => old.stop(), 4000);
    }
    this.bed = this.makeBed(a);
  }

  private makeBed(a: Ambience): Bed {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const stops: Array<() => void> = [];

    // Wind: looping noise through a wandering bandpass.
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 400;
    windFilter.Q.value = 0.7;
    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0, t);
    windGain.gain.setTargetAtTime(0.06 + a.wind * 0.12, t, 1.5);
    src.connect(windFilter).connect(windGain).connect(this.master);
    src.start();
    stops.push(() => src.stop());

    // Drone: a few low sines, slowly beating against each other.
    const drone = ctx.createGain();
    drone.gain.setValueAtTime(0, t);
    drone.gain.setTargetAtTime(0.035, t, 3);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    drone.connect(lp).connect(this.master);
    for (const f of DRONES[a.drone] ?? DRONES.low_wind) {
      for (const detune of [-4, 5]) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        o.detune.value = detune;
        o.connect(drone);
        o.start();
        stops.push(() => o.stop());
      }
    }

    // Tension pad: two detuned saws, silent until a level pushes tension.
    const pad = ctx.createGain();
    pad.gain.value = 0;
    const padLp = ctx.createBiquadFilter();
    padLp.type = 'lowpass';
    padLp.frequency.value = 700;
    pad.connect(padLp).connect(this.master);
    for (const [f, d] of [[110, -9], [116.5, 7], [164.8, 3]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = d;
      o.connect(pad);
      o.start();
      stops.push(() => o.stop());
    }
    return { windGain, windFilter, drone, pad, stop: () => stops.forEach((s) => s()) };
  }

  /** Play a cue, positioned at x if given. */
  play(name: string, x?: number): void {
    this.played.push(name);
    if (this.played.length > 200) this.played.splice(0, 100);
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const synth = cueFor(name);
    if (!synth) return;
    let out: AudioNode = this.sfx;
    if (x !== undefined) {
      const dx = x - this.listenerX;
      if (Math.abs(dx) > 45) return;
      const g = ctx.createGain();
      g.gain.value = 1 / (1 + Math.pow(Math.abs(dx) / 7, 1.5));
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-0.85, Math.min(0.85, dx / 12));
      g.connect(pan).connect(this.sfx);
      out = g;
    }
    const k: Kit = { ctx, noise: this.noiseBuf, out, t: ctx.currentTime + 0.005 };
    try {
      synth(k);
    } catch {
      // A broken synth never breaks the game.
    }
  }

  /** Per-frame: listener position, wind gusts, tension, and random distant sounds. */
  update(dt: number, listenerX: number, tension: number): void {
    this.listenerX = listenerX;
    const ctx = this.ctx;
    const bed = this.bed;
    const a = this.ambience;
    if (!ctx || !bed || !a) return;
    const t = ctx.currentTime;
    // Gusts: wander toward a new target every few seconds.
    if (Math.random() < dt * 0.3) this.gustTarget = Math.random();
    this.gust += (this.gustTarget - this.gust) * Math.min(1, dt * 0.6);
    bed.windGain.gain.setTargetAtTime((0.05 + a.wind * 0.12) * (0.6 + this.gust * 0.8), t, 0.3);
    bed.windFilter.frequency.setTargetAtTime(280 + this.gust * 520 + a.wind * 200, t, 0.4);
    bed.pad.gain.setTargetAtTime(Math.min(1, tension) * 0.035, t, 0.6);

    // Now and then, something far off: a metal groan, a rumble, a falling slab.
    this.distantIn -= dt;
    if (this.distantIn <= 0) {
      this.distantIn = 9 + Math.random() * 16;
      const k: Kit = { ctx, noise: this.noiseBuf, out: this.master, t: t + 0.01 };
      const pick = Math.random();
      if (pick < 0.4) tone(k, { type: 'sawtooth', freq: 70 + Math.random() * 40, freqEnd: 55, attack: 0.6, decay: 2.2, gain: 0.015, lowpass: 300, vibrato: { rate: 3, depth: 4 } });
      else if (pick < 0.7) noise(k, { type: 'lowpass', freq: 140, decay: 2.5, gain: 0.08, attack: 0.5, rate: 0.5 });
      else noise(k, { type: 'bandpass', freq: 900, q: 5, decay: 0.6, gain: 0.02, attack: 0.02 });
    }
  }
}
