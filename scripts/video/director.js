// In-page director for the sandbox showcase video. It replaces the input
// layer with scripted input and plays each station the way a person would.
// Loaded by scripts/record.mjs; drives window.__ashfall.game.
(() => {
  const A = window.__ashfall;
  const g = A.game;
  const input = g.input;
  const state = input.state;
  const realPoll = input.poll.bind(input);
  const actor = () => g.current.controlled;
  const ent = (type, n = 0) => g.current.entities.filter((e) => e.type === type)[n];

  const steps = [];
  const add = (s) => steps.push(s);

  // ---- step builders ----
  /** Fade to the checkpoint at x (indices include checkpoint entities, so address by position). */
  const fadeTo = (x) => add({ kind: 'load', x });
  const wait = (s) => add({ kind: 'hold', s, input: {} });
  const hold = (s, inp) => add({ kind: 'hold', s, input: inp });
  /** Walk (or run, once held long enough) to x. `walk` keeps it to a walk. */
  const go = (x, o = {}) => add({ kind: 'move', x, ...o });
  const tap = () => add({ kind: 'tap' });
  const until = (fn, inp = {}, timeout = 60) => add({ kind: 'until', fn, input: inp, timeout });

  // ---- the show ----
  add({ kind: 'start' });
  wait(1.5);
  // Opening walk: hills, the convoy on the far ridge, the ditch, the toy rabbit.
  go(24, { walk: true });
  // Run on: grab the concrete ledge, the hollow (camera pulls out), the steep bank, the drop, the path bending away.
  go(112, { jumps: [30.55, 54.55] });
  wait(0.6);

  // Obstacles.
  fadeTo(116);
  go(131.3, { walk: true, jumps: [120.5] });
  go(134.6, { crawl: true });
  go(137.0, { walk: true });
  go(138.2, { crawl: true });
  go(139.6, { walk: true });
  wait(0.4);

  // Water, ladder, rope.
  fadeTo(140);
  go(149.7, { walk: true });
  until(() => actor().y > 2.45 && !actor().ladder, { up: true }, 8);
  go(156.95, { walk: true });
  hold(2.2, { up: true });
  hold(0.3, { right: true });
  go(160.5, { walk: true });
  wait(0.4);

  // Movables and mechanisms.
  fadeTo(162);
  go(163.36, { walk: true });
  go(167.42, { interact: true }); // shove the crate onto the plate
  wait(2.2); // the gate rises
  go(175.0, { walk: true }); // over the crate, through the gate
  go(177.4, { interact: true }); // push the cart; it rolls on
  wait(1.2);
  go(183.25, { walk: true }); // onto the lift
  wait(0.3);
  tap(); // the lever beside it; power runs down the cable
  wait(4.2); // ride up
  go(188.3, { walk: true }); // across the high slab and down
  go(190.42, { walk: true });
  go(189.4, { interact: true }); // drag the log back
  wait(0.3);
  go(194.6, { walk: true });
  go(195.8, { interact: true }); // push the body
  wait(0.3);
  go(197.6, { walk: true });
  tap(); // turn the valve
  wait(1.6);
  go(200.5, { walk: true }); // onto the conveyor, and ride
  wait(3.6);
  go(205.5, { walk: true });
  wait(0.4);

  // Hazards.
  fadeTo(206);
  go(219.0, { walk: true }); // through the radiation; past the creaking slab without stopping
  go(222.5, { walk: true, jumps: [220.45] }); // jump the tripwire
  go(238.6, { jumps: [229.72, 236.75] }); // run and jump the pool and the pit
  go(241.0, { walk: true }); // trip the last wire: a slab drops ahead
  wait(1.4);
  go(243.4, { walk: true }); // and climb over it
  wait(0.4);

  // Threats: the dog.
  fadeTo(243);
  go(254.2); // run: the dog wakes behind
  go(259.6, { crawl: true }); // into the pipe, too narrow for it
  go(262.5, { walk: true });
  wait(0.4);

  // The searchlight: crawl through the grass.
  fadeTo(263);
  go(265.8, { walk: true });
  go(275.4, { crawl: true });
  go(277.5, { walk: true });
  wait(0.4);

  // The drone: wait in the shadow.
  fadeTo(278);
  until(() => ent('patrol_drone').debug().x > 284.5);
  go(283.75, { walk: true });
  until(() => {
    const d = ent('patrol_drone').debug();
    return d.dir < 0 && d.x < 281.8;
  });
  go(290.5, { walk: true });
  wait(0.3);

  // The guard: hide behind the wreck, follow him, hold still in the shadow as he passes, slip away.
  fadeTo(291);
  go(296.8, { walk: true });
  until(() => {
    const d = ent('guard').debug();
    return d.dir > 0 && d.pause <= 0 && d.x > 302.5;
  });
  go(303.0, { walk: true });
  until(() => {
    const d = ent('guard').debug();
    return d.dir < 0 && d.x < 301.4;
  });
  go(313.5, { walk: true });
  wait(0.3);

  // Relay: find the transmitter, send the drone to hold the plate, walk through.
  fadeTo(314);
  go(318.6, { walk: true });
  go(320.5, { walk: true });
  wait(0.8);
  tap(); // take over the drone
  wait(0.6);
  go(327.0); // walk it onto the plate
  wait(2.4);
  tap(); // back to the child
  wait(0.6);
  go(346.5, { walk: true }); // through the gate, past the survivor, to the exit
  add({ kind: 'end' });

  // ---- runner ----
  let i = 0;
  let t = 0;
  let pressed = false;
  let lastJump = -1;
  let ticks = 0;

  function setInput(inp) {
    state.left = !!inp.left;
    state.right = !!inp.right;
    state.up = !!inp.up;
    state.down = !!inp.down;
    state.interactPressed = !!inp.interact && !state.interact;
    state.interact = !!inp.interact;
  }

  input.poll = () => {
    const s = steps[i];
    ticks++;
    if (!s) return setInput({});
    if (s.kind === 'hold' || s.kind === 'until') return setInput(s.input);
    if (s.kind === 'tap') {
      setInput({ interact: !pressed });
      return;
    }
    if (s.kind === 'move') {
      const a = actor();
      const dir = Math.sign(s.x - a.x);
      const inp = { right: dir > 0, left: dir < 0, down: !!s.crawl, interact: !!s.interact };
      // Keep to a walk: let go for a tick before the run kicks in.
      if (s.walk && ticks % 70 === 0) inp.right = inp.left = false;
      for (const jx of s.jumps ?? []) {
        if (a.x >= jx && a.x < jx + 0.4 && lastJump !== jx) {
          lastJump = jx;
          s.jumpTicks = 10;
        }
      }
      if (s.jumpTicks > 0) {
        inp.up = true;
        s.jumpTicks--;
      }
      return setInput(inp);
    }
    setInput({});
  };

  window.__dirWarn = [];
  window.__director = {
    done: false,
    /** Advance the script by dt (called once per fixed step, before game.step). */
    tick(dt) {
      const s = steps[i];
      if (!s) {
        this.done = true;
        return;
      }
      t += dt;
      const next = () => {
        i++;
        t = 0;
        pressed = false;
      };
      switch (s.kind) {
        case 'start':
          g.god = false;
          g.save.reset();
          g.load('L00', -1);
          g.overlay.fade = 1;
          g.fadeTo(0, 2.5);
          next();
          break;
        case 'load':
          if (t === dt) g.transition(() => g.load('L00', g.checkpoints.indexOf(s.x)), 0.9, 1.0);
          if (t > 2.0) next();
          break;
        case 'hold':
          if (t >= s.s) next();
          break;
        case 'until':
          if (t > s.timeout) window.__dirWarn.push(`until timed out (step ${i}) at x=${actor().x.toFixed(2)}`);
          if (s.fn() || t > s.timeout) next();
          break;
        case 'tap':
          if (pressed) next();
          else pressed = true;
          break;
        case 'move': {
          const a = actor();
          s.from ??= a.x;
          const reached = s.x >= s.from ? a.x >= s.x - 0.02 : a.x <= s.x + 0.02;
          if (t > 40) window.__dirWarn.push(`move to ${s.x} timed out at x=${a.x.toFixed(2)}`);
          // Walking out of the exit ends the show (the sandbox loops to its own start).
          if (g.current.exiting) {
            i = steps.length - 1;
            t = 0;
            break;
          }
          if (reached || t > 40) next();
          break;
        }
        case 'end':
          // Hold on the fade to black, then stop before the next level appears.
          if (t > 1.9) {
            this.done = true;
            input.poll = realPoll;
          }
          break;
      }
    },
    get step() {
      return `${i}/${steps.length} ${steps[i]?.kind ?? ''}`;
    },
  };
})();
