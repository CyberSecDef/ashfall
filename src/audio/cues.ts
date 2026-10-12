// Every sound cue in the game, synthesized. Cue names come from entities
// (ctx.sound), the runtime (deaths, relay) and the game (footsteps, landings,
// thunder). `cueFor` resolves families (step_*, death_*) to their synths, and
// a test checks every cue the levels fire has an entry here.

import { type Kit, noise, tone } from './synth';

type Synth = (k: Kit) => void;

const step = (freq: number, q: number, gain: number, decay = 0.07, extra?: Synth): Synth => (k) => {
  const f = freq * (0.85 + Math.random() * 0.3);
  noise(k, { type: 'bandpass', freq: f, q, decay, gain });
  noise(k, { type: 'lowpass', freq: 220, decay: decay * 0.8, gain: gain * 0.6 });
  extra?.(k);
};

const sting: Synth = (k) => {
  // A low, dissonant swell that falls away.
  for (const [f, g] of [[55, 0.22], [58.3, 0.18], [82.4, 0.1]] as const) tone(k, { type: 'sawtooth', freq: f, freqEnd: f * 0.7, attack: 0.08, decay: 2.2, gain: g, lowpass: 420 });
};

const gunshot: Synth = (k) => {
  noise(k, { type: 'lowpass', freq: 3500, freqEnd: 300, decay: 0.35, gain: 0.9 });
  noise(k, { type: 'bandpass', freq: 160, q: 0.7, decay: 0.6, gain: 0.6 });
  // Echo off the far hills.
  noise(k, { type: 'lowpass', freq: 900, decay: 0.8, gain: 0.18, delay: 0.42 });
};

const bark: Synth = (k) => {
  for (const d of [0, 0.22]) {
    tone(k, { type: 'square', freq: 320, freqEnd: 180, attack: 0.01, decay: 0.12, gain: 0.16, lowpass: 1400, delay: d });
    noise(k, { type: 'bandpass', freq: 900, q: 2, decay: 0.1, gain: 0.25, delay: d });
  }
};

const clank = (freq: number, gain = 0.5): Synth => (k) => {
  noise(k, { type: 'bandpass', freq, q: 8, decay: 0.35, gain });
  noise(k, { type: 'bandpass', freq: freq * 1.52, q: 10, decay: 0.25, gain: gain * 0.6 });
  noise(k, { type: 'lowpass', freq: 300, decay: 0.08, gain: gain * 0.8 });
};

const rumble = (decay: number, gain: number, freq = 120): Synth => (k) => {
  noise(k, { type: 'lowpass', freq, decay, gain, attack: decay * 0.15, rate: 0.5 });
};

export const CUES: Record<string, Synth> = {
  // ---- the child ----
  step_dirt: step(700, 1.2, 0.18),
  step_grass: step(2400, 0.8, 0.12, 0.09),
  step_gravel: step(3200, 1.5, 0.16, 0.08),
  step_concrete: step(1500, 2.5, 0.16, 0.05),
  step_metal: step(900, 6, 0.18, 0.12, (k) => noise(k, { type: 'bandpass', freq: 2300, q: 12, decay: 0.15, gain: 0.06 })),
  step_wood: step(500, 3, 0.18, 0.08),
  step_water: (k) => {
    noise(k, { type: 'bandpass', freq: 1200, freqEnd: 500, q: 1.5, decay: 0.18, gain: 0.2 });
    noise(k, { type: 'highpass', freq: 3000, decay: 0.12, gain: 0.06, delay: 0.04 });
  },
  step_heavy: (k) => {
    noise(k, { type: 'lowpass', freq: 260, decay: 0.16, gain: 0.45 });
    noise(k, { type: 'bandpass', freq: 700, q: 5, decay: 0.12, gain: 0.12 });
  },
  crawl: (k) => noise(k, { type: 'highpass', freq: 1800, decay: 0.16, gain: 0.07, attack: 0.04 }),
  jump: (k) => noise(k, { type: 'bandpass', freq: 600, freqEnd: 1400, q: 1, decay: 0.15, gain: 0.05, attack: 0.03 }),
  land: (k) => {
    noise(k, { type: 'lowpass', freq: 300, decay: 0.14, gain: 0.4 });
    noise(k, { type: 'bandpass', freq: 1500, q: 1, decay: 0.08, gain: 0.1 });
  },
  scramble: (k) => {
    noise(k, { type: 'bandpass', freq: 1800, q: 1.5, decay: 0.25, gain: 0.1, attack: 0.03 });
    noise(k, { type: 'bandpass', freq: 900, q: 1.5, decay: 0.2, gain: 0.08, delay: 0.18 });
  },
  ladder: clank(1100, 0.08),
  scrape: (k) => noise(k, { type: 'bandpass', freq: 650, q: 3, decay: 0.32, gain: 0.12, attack: 0.08 }),

  // ---- mechanisms ----
  lever: clank(780, 0.4),
  lever_heavy: (k) => {
    clank(420, 0.6)(k);
    rumble(0.5, 0.25, 200)(k);
  },
  strain: (k) => {
    noise(k, { type: 'bandpass', freq: 500, q: 6, decay: 0.3, gain: 0.12, attack: 0.05 });
    tone(k, { type: 'sawtooth', freq: 110, freqEnd: 104, decay: 0.35, gain: 0.04, lowpass: 600 });
  },
  valve: (k) => tone(k, { type: 'sawtooth', freq: 620, freqEnd: 880, attack: 0.1, decay: 1.0, gain: 0.05, lowpass: 2400, vibrato: { rate: 14, depth: 25 } }),
  plate_down: clank(260, 0.35),
  plate_up: clank(340, 0.2),
  gate_open: (k) => {
    rumble(1.6, 0.35, 180)(k);
    for (let i = 0; i < 6; i++) noise(k, { type: 'bandpass', freq: 1800 + Math.random() * 900, q: 9, decay: 0.08, gain: 0.08, delay: i * 0.21 });
  },
  gate_close: (k) => {
    rumble(0.9, 0.3, 160)(k);
    clank(220, 0.55)({ ...k, t: k.t + 0.8 });
  },
  hatch_open: (k) => {
    noise(k, { type: 'bandpass', freq: 380, q: 4, decay: 0.7, gain: 0.25, attack: 0.25 }); // rusted hinge groan
    tone(k, { type: 'sawtooth', freq: 140, freqEnd: 210, attack: 0.3, decay: 0.6, gain: 0.05, lowpass: 900 });
    clank(240, 0.6)({ ...k, t: k.t + 0.95 });
    noise(k, { type: 'highpass', freq: 3500, decay: 1.2, gain: 0.05, delay: 0.95 }); // grit falling
  },
  lift_motor: (k) => {
    tone(k, { type: 'sawtooth', freq: 58, attack: 0.3, decay: 2.6, gain: 0.08, lowpass: 400 });
    tone(k, { type: 'square', freq: 116.5, attack: 0.3, decay: 2.4, gain: 0.025, lowpass: 600 });
  },
  hum: (k) => tone(k, { type: 'sawtooth', freq: 120, attack: 0.05, decay: 0.7, gain: 0.05, lowpass: 900 }),
  train_start: (k) => {
    clank(300, 0.6)(k);
    clank(260, 0.5)({ ...k, t: k.t + 0.5 });
    rumble(3, 0.35, 110)(k);
  },

  // ---- hazards ----
  geiger: (k) => noise(k, { type: 'highpass', freq: 2500, decay: 0.004, gain: 0.25, attack: 0.001 }),
  creak: (k) => tone(k, { type: 'sawtooth', freq: 160, freqEnd: 120, attack: 0.15, decay: 0.6, gain: 0.07, lowpass: 700, vibrato: { rate: 7, depth: 12 } }),
  crash: (k) => {
    noise(k, { type: 'lowpass', freq: 2000, freqEnd: 200, decay: 0.9, gain: 0.8 });
    rumble(1.4, 0.5, 100)(k);
    for (let i = 0; i < 5; i++) noise(k, { type: 'bandpass', freq: 600 + Math.random() * 2000, q: 4, decay: 0.12, gain: 0.12, delay: 0.15 + Math.random() * 0.6 });
  },
  wire_snap: (k) => {
    tone(k, { type: 'triangle', freq: 2600, freqEnd: 1800, decay: 0.25, gain: 0.08 });
    noise(k, { type: 'highpass', freq: 4000, decay: 0.03, gain: 0.2 });
  },
  splash: (k) => {
    noise(k, { type: 'bandpass', freq: 1400, freqEnd: 400, q: 1, decay: 0.35, gain: 0.3 });
    noise(k, { type: 'highpass', freq: 3500, decay: 0.3, gain: 0.08, delay: 0.05 });
  },
  splash_deep: (k) => {
    noise(k, { type: 'lowpass', freq: 900, freqEnd: 180, decay: 0.8, gain: 0.5 });
    tone(k, { type: 'sine', freq: 300, freqEnd: 90, decay: 0.5, gain: 0.08, delay: 0.1 }); // bubble
  },

  // ---- threats ----
  dog_bark: bark,
  dog_whine: (k) => tone(k, { type: 'sine', freq: 1000, freqEnd: 620, attack: 0.05, decay: 0.7, gain: 0.06, vibrato: { rate: 6, depth: 30 } }),
  guard_shout: (k) => {
    // Wordless: a muffled bark of a voice through a mask.
    tone(k, { type: 'sawtooth', freq: 170, freqEnd: 150, attack: 0.02, decay: 0.35, gain: 0.12, lowpass: 900 });
    noise(k, { type: 'bandpass', freq: 750, q: 3, decay: 0.3, gain: 0.08 });
  },

  // ---- relay, memories, world ----
  relay_found: (k) => {
    tone(k, { type: 'sine', freq: 440, freqEnd: 660, attack: 0.2, decay: 1.2, gain: 0.06 });
    tone(k, { type: 'sine', freq: 662, attack: 0.3, decay: 1.4, gain: 0.03, delay: 0.25, vibrato: { rate: 5, depth: 4 } });
  },
  relay_link: (k) => {
    tone(k, { type: 'sine', freq: 880, decay: 0.25, gain: 0.05 });
    tone(k, { type: 'sine', freq: 1318, decay: 0.3, gain: 0.04, delay: 0.08 });
    tone(k, { type: 'square', freq: 55, decay: 0.4, gain: 0.03, lowpass: 300 });
  },
  relay_release: (k) => {
    tone(k, { type: 'sine', freq: 1318, decay: 0.2, gain: 0.04 });
    tone(k, { type: 'sine', freq: 880, decay: 0.3, gain: 0.04, delay: 0.08 });
  },
  memory: (k) => {
    // A music-box phrase, slightly out of tune.
    [523.3, 659.3, 784, 698.5].forEach((f, i) => tone(k, { type: 'sine', freq: f * 1.004, decay: 1.6, gain: 0.05, delay: i * 0.28 }));
  },
  distant_boom: rumble(3.5, 0.35, 80),
  thunder: (k) => {
    rumble(4, 0.45, 90)(k);
    noise(k, { type: 'lowpass', freq: 400, decay: 1.5, gain: 0.15, delay: 0.1 });
  },

  // ---- deaths ----
  death: sting,
  death_shot: (k) => {
    gunshot(k);
    sting({ ...k, t: k.t + 0.15 });
  },
  death_dog: (k) => {
    bark(k);
    noise(k, { type: 'bandpass', freq: 400, q: 2, decay: 0.4, gain: 0.3, delay: 0.1 });
    sting(k);
  },
  death_caught: (k) => {
    noise(k, { type: 'lowpass', freq: 600, decay: 0.2, gain: 0.5 });
    sting(k);
  },
  death_crushed: (k) => sting(k),
  death_fall: (k) => {
    noise(k, { type: 'lowpass', freq: 250, decay: 0.3, gain: 0.6 });
    sting(k);
  },
};

/** The synth for a cue: exact name, else its family (step_x -> step_dirt, death_x -> death). */
export function cueFor(name: string): Synth | null {
  if (CUES[name]) return CUES[name];
  if (name.startsWith('step_')) return CUES.step_dirt;
  if (name.startsWith('death_')) return CUES.death;
  return null;
}
