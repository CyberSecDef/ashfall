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

- **M2 — World and depth** (code complete, waiting for the owner's iPhone check):
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
  - Deferred: the path visually bending toward or away from the camera (the spec marks it "may"). It fits better with M3's level data.

## In progress

- Waiting for the owner to test M2 on an iPhone: https://cybersecdef.github.io/ashfall/

## Left to do

- [x] M1 — Scaffold
- [x] M2 — World and depth (waiting for phone check): all depth layers including the sparse foreground, fog, ash, grain, vignette, camera follow, blue scarf animation
- [ ] M3 — Data-driven levels: level schema with validation, entity registry, triggers, checkpoints, save/continue, `L00` sandbox
- [ ] M4 — Mechanics: tap-to-interact, drag/push/pull, levers and gates, hazards, threats, relay control, death and respawn
- [ ] M5 — Levels L01–L03, playable start to finish, with procedural audio and the title fade-in
- [ ] M6 — Polish and performance: 60 fps on iPhone, quality tiers, PWA fullscreen, README

## Open questions

- Final URL on trackr.live (root or a subpath)? Not needed until deploy time.
- Keep the name ASHFALL? Assumed yes for now.
