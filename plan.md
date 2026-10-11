# ASHFALL — Plan

The spec is [ASHFALL-Game-Build-Handoff.md](ASHFALL-Game-Build-Handoff.md). This file tracks progress against it.

## Decisions

- **Renderer:** Three.js with a perspective camera. Gameplay is locked to the x/y plane at z = 0. This gives real parallax, fog and depth with no faking, and the sparse foreground layer is just geometry placed between the camera and the child.
- **Hosting:** GitHub Pages during development (https://cybersecdef.github.io/ashfall/). It will later move to trackr.live. The Vite `base` is `./`, so the same build works from any path.
- **Workflow:** small commits pushed as each step works, with this file updated in the same commit. Work stops after each milestone for testing on a phone.
- **Units:** world units are meters. The child is about 1.1 m tall, and +x is east, along the path.

## Done

- Repo created, with the MIT license and the handoff spec.
- **M1 — Scaffold** (code complete, waiting for the owner's iPhone check):
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

## In progress

- Waiting for the owner to test M1 on an iPhone: https://cybersecdef.github.io/ashfall/

## Left to do

- [x] M1 — Scaffold (waiting for phone check)
- [ ] M2 — World and depth: all depth layers including the sparse foreground, fog, ash, grain, vignette, camera follow, blue scarf animation
- [ ] M3 — Data-driven levels: level schema with validation, entity registry, triggers, checkpoints, save/continue, `L00` sandbox
- [ ] M4 — Mechanics: tap-to-interact, drag/push/pull, levers and gates, hazards, threats, relay control, death and respawn
- [ ] M5 — Levels L01–L03, playable start to finish, with procedural audio and the title fade-in
- [ ] M6 — Polish and performance: 60 fps on iPhone, quality tiers, PWA fullscreen, README

## Open questions

- Final URL on trackr.live (root or a subpath)? Not needed until deploy time.
- Keep the name ASHFALL? Assumed yes for now.
