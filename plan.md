# ASHFALL — Plan

The spec is [ASHFALL-Game-Build-Handoff.md](ASHFALL-Game-Build-Handoff.md). This file tracks progress against it.

## Decisions

- **Renderer:** Three.js with a perspective camera. Gameplay is locked to the x/y plane at z = 0. This gives real parallax, fog and depth with no faking, and the sparse foreground layer is just geometry placed between the camera and the child.
- **Hosting:** GitHub Pages during development (https://cybersecdef.github.io/ashfall/). It will later move to trackr.live. The Vite `base` is `./`, so the same build works from any path.
- **Workflow:** small commits pushed as each step works, with this file updated in the same commit. Work stops after each milestone for testing on a phone.
- **Units:** world units are meters. The child is about 1.1 m tall, and +x is east, along the path.

## Done

- Repo created, with the MIT license and the handoff spec.
- **M1 — Scaffold** (owner checked it on an iPhone, 2026-10-11):
  - Vite 8 + TypeScript 7 + Three.js 0.186 project. `npm run dev` serves on the LAN (`--host`) for phone testing; `npm run build` writes static files to `dist/`.
  - Full-screen landscape canvas with `viewport-fit=cover`. Scroll, zoom and the long-press menu are blocked, and portrait shows a wordless rotate-device graphic.
  - One input layer (`src/engine/input.ts`) for:
    - the hidden touch pad on the left half, with a faint ring for the first 6 s
    - tap or hold on the right half to interact
    - keyboard: WASD, arrows, Space, E
    - gamepad: stick, d-pad, South, West
  - Terrain as a smoothed path profile (`src/engine/terrain.ts`), with `sharp` points for ledges and ditches.
  - Child controller (`src/engine/player.ts`):
    - walk, then run after holding a direction for 1.4 s
    - jump with coyote time, crawl
    - follows slopes, walls stop it, falls off edges and records the drop height
  - Placeholder silhouette child with procedural idle, walk, run, crawl and air poses, plus a blue scarf stub.
  - Camera follow with lag and look-ahead. Vertical framing is fixed, so wider phones see more horizontally.
  - Debug overlay (backtick or a four-finger tap): FPS, DPR, position, mode, slope, surface, input and hitbox.
  - The L00 test path has hills, a ditch, a ledge, a too-steep bank and a drop.
  - Tests:
    - `npm test`: 16 Vitest unit tests covering terrain, pad mapping and the controller, including a full traversal of the sandbox.
    - `npm run smoke`: a headless iPhone-landscape check in WebKit (pad walk, jump, crawl, four-finger debug, portrait rotate graphic) plus desktop Chromium keyboard checks.
  - GitHub Actions deploys to Pages on every push to main.

- **M2 — World and depth** (owner checked it on an iPhone, 2026-10-11):
  - Seeded RNG and level look data (palette, ambience, layer specs) in the L00 file (`src/levels/types.ts`)
  - Sky: gradient, faint moon, slow bomb-scar clouds (`src/fx/sky.ts`)
  - Procedural silhouette layers placed at real depths derived from the spec's scroll speeds: z = D(1 - 1/speed) (`src/fx/layers.ts`, `src/fx/props.ts`)
    - far: mountains, ruined skyline, smokestacks
    - mid: dead trees, pylons with sagging cables, wrecked buildings
    - near: rocks, fences, trunks
  - Sparse blurred foreground layer: branches, grass, chain-link, wires, rubble. Blurred canvas textures, hung from the top edge or rising from the bottom, swaying in the wind (`src/fx/foreground.ts`)
  - Haze baked per layer so distant silhouettes stay darker than the sky; ash particles in a GPU shader; film grain; vignette; distant lightning double-flicker (`src/fx/ash.ts`, `overlay.ts`, `lightning.ts`)
  - Camera: lagged follow, lazier vertical follow in the air, slight handheld drift, `hint()` / `clearHint()` for pull-outs and push-ins (debug keys 1, 2 and 0; L strikes lightning)
  - Blue scarf: sub-stepped verlet ribbon pinned at the neck that trails, sags and streams in the wind (`src/engine/scarf.ts`)
  - Tests: 27 unit tests. The smoke run adds camera-hint and draw-call checks (19 draw calls for the full scene).
  - Faint god rays: additive light shafts among the mid-layer trees, pulsing slowly and lifting with lightning (`src/fx/godrays.ts`)
  - Smoke run green (19 draw calls), deployed
  - Fix after owner feedback: the child got stuck in the sandbox ditch (1.3 m deep, jump reach 0.7 m). Added auto-scramble onto ledges up to about 0.6 m when holding toward them, a mid-air edge grab for higher ledges, a footprint-based floor (one foot on an edge counts), and stronger air control. The ditch is now 0.55 m deep and the sandbox ledge 1 m (jump and grab).
  - The path bending in depth was deferred here and delivered in M3.

- **M3 — Data-driven levels** (owner checked it on an iPhone, 2026-10-11):
  - Zod level schema (`src/levels/schema.ts`) plus cross-checks: path order, positions inside the path, unique ids, targets that resolve, at most one memory per level, exit chaining. `npm run build` runs `npm run validate` first, so bad level data fails the build.
  - Entity registry (`src/entities/`): params in `params.ts` (pure Zod), one behavior file per type, and a mapped type in `registry.ts` so a missing behavior is a compile error. Types: `checkpoint`, `camera_hint`, `background_event` (convoy whose lights cut out, marchers, airship with searchlight), `foreground_prop`, `memory_collectible` (faint glint; walk into it to keep it).
  - Triggers (`src/engine/triggers.ts`): x-range zones firing `camera`, `camera_clear`, `signal`, `lightning`, `sound` (cue recorded for M5), and `tension` (grain and vignette). One-shot triggers behind a respawn point are skipped.
  - Level manager (`src/engine/game.ts`):
    - builds a level entirely from its data file and disposes it on unload
    - fades through black between levels
    - `respawn()` returns to the last checkpoint
    - checkpoints come from the level list plus checkpoint entities, and passing one saves
  - Save and continue (`src/engine/save.ts`): level, checkpoint and memories in localStorage under `ashfall.save.v1`. It survives throwing, blocked or corrupt storage, never moves backwards within a level, and a reload resumes at the saved checkpoint.
  - Debug menu: jump to a level or checkpoint, respawn, reset the save. Markers show checkpoints (green), triggers (amber) and the exit (white). R respawns.
  - Path bending in depth: per-point `depth` moves the ground, the child, on-terrain layers and the camera (which follows half the bend), so the path visibly curves away and back.
  - L00 sandbox rebuilt as a full level file with every M3 entity type, triggers, three checkpoints, a memory, and an exit that loops back to L00 (the story levels arrive in M5).
  - Tests: 56 unit tests (schema error cases, save robustness, triggers, registry sync, depth). The smoke run adds a full fast-forwarded playthrough, save/checkpoint/memory persistence, continue after reload, and an exit fade into the next level. 60 unit tests and 18 smoke checks pass.
  - Fix after owner feedback: the screen turned grey and empty mid-play. Camera hint zones passed unset fields as `undefined`, which overwrote the defaults, made the camera position NaN, and left nothing visible but fog and grain. `hint()` now ignores unset or non-finite fields, the camera resets itself if it ever sees a non-finite value, and a regression test covers it. The smoke run now also plays the whole sandbox start to finish (fast-forwarded) and checks the camera every frame; the teleport-based checks had skipped the hint zones.
  - Fix: exiting into the same level (the sandbox loops to itself) kept the old checkpoint, so a reload resumed near the end. Entering a level now always resets its checkpoint (`save.enter`).
  - Note: Zod adds about 34 KB gzipped to the bundle. M6 can move to `zod/mini` or validate only at build time.

- **M4 — Mechanics** (code complete, waiting for the owner's iPhone check):
  - Collision core (`src/engine/collision.ts`):
    - solid boxes: walls, step-ups, scramble targets, ceilings that force a crawl
    - moving solids carry riders
    - line-of-sight tests for watchers
  - Controller (`src/engine/player.ts`):
    - step-ups and scrambles onto boxes and ledges, mid-air grabs
    - crawl forced under low ceilings, head bumps
    - ladders and ropes, push/pull while interact is held
    - shallow-water slowdown, fatal falls above 3.4 m
    - `ActorParams` lets the same code drive the dog and relay bodies
  - Movable boxes (`src/engine/bodies.ts`): gravity, stacking, shoved up small steps and plates, carts that roll on.
  - Level runtime split from rendering (`src/engine/runtime.ts`), so puzzles run in tests with no WebGL. `Game` wraps it: the camera follows the controlled actor, screen taps map onto the gameplay plane, and a death becomes a limp collapse, a 0.7 s pause, a fade, then respawn at the checkpoint with puzzle state restored from a snapshot taken when that checkpoint was reached.
  - Interaction: the nearest interactable gets a faint rim lift; a tap or E uses it. With nothing to use, a tap switches relay control.
  - 33 new entity types, one file each in `src/entities/` (shared helpers in `visuals.ts`, `movable.ts`, `sight.ts`):
    - obstacles: `obstacle_low`, `obstacle_high`, `log`, `boulder`, `fence` (optional crawl gap), `crawlspace`, `pipe`, `water`, `ladder`, `rope`
    - movables: `crate`, `cart`, `draggable_log`, `body`
    - mechanisms: `lever`, `valve`, `pressure_plate`, `gate`, `lift`, `conveyor`, `power_cable` (a visible flicker carries the signal)
    - hazards: `radiation_zone` (no meter; grain and Geiger only), `falling_debris`, `wire_trap`, `deep_water`, `fall_height`
    - threats: `feral_dog` (can't crawl or climb), `searchlight`, `patrol_drone`, `guard`, plus `cover` (grass, shadow, wreck) for the spec's hiding mechanic
    - relay: `relay_transmitter` (ability saved as a flag), `dormant_body` (drone or survivor; heavy, strong, can't crawl or jump)
  - L00 sandbox gallery: checkpointed stations for obstacles, water and climbing, movables and mechanisms, hazards, threats (each with a fair way past), and a relay puzzle where the drone must hold the plate while the child walks through the gate.
  - Debug: `god` toggle (invulnerable child). The smoke bot uses it, with stuck-assist, to traverse the whole sandbox.
  - Tests: 101 unit and integration tests, including 22 puzzle and hazard scenarios run on the real runtime with scripted input. 18 smoke checks pass, including a full ~350 m playthrough.
  - Fixes found along the way: a teleport could trip a wire trap; boxes couldn't be shoved onto plates.
  - Showcase video: `npm run build && npm run record` renders a scripted sandbox playthrough frame by frame (GPU through ANGLE when available) to an MP4. The director lives in `scripts/video/director.js`.
  - Sandbox fixes found while choreographing the video:
    - the dog sat ahead of the child; it now sleeps where you walk past it and wakes on a trigger behind you (`wakeOnSight: false`)
    - the lift lever was out of reach of the lift, and a gap between lift and slab dropped riders
    - the tripwire slab landed on walkers, and its placement left no run-up for the pool
    - lever and valve reach widened to 0.9 m
    - the guard could see the relay checkpoint, and the guard station's own checkpoint wasn't safe to stand at; both fixed, plus a new test that every checkpoint in every level is safe to stand still at for 30 s (no respawn death loops)
  - The recorder aborts on any death, so a broken take can't loop silently.
  - Not yet done: entity art is placeholder silhouettes (an asset pass comes later); sound cues are recorded but silent until M5.

## In progress

- Waiting for the owner to test M4 on an iPhone: https://cybersecdef.github.io/ashfall/

## Left to do

- [x] M1 — Scaffold
- [x] M2 — World and depth: all depth layers including the sparse foreground, fog, ash, grain, vignette, camera follow, blue scarf animation
- [x] M3 — Data-driven levels: level schema with validation, entity registry, triggers, checkpoints, save/continue, `L00` sandbox
- [x] M4 — Mechanics (waiting for phone check): tap-to-interact, drag/push/pull, levers and gates, hazards, threats, relay control, death and respawn
- [ ] M5 — Levels L01–L03, playable start to finish, with procedural audio and the title fade-in
- [ ] M6 — Polish and performance: 60 fps on iPhone, quality tiers, PWA fullscreen, README

## Open questions

- Final URL on trackr.live (root or a subpath)? Not needed until deploy time.
- Keep the name ASHFALL? Assumed yes for now.
