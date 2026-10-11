# ASHFALL — Game Build Handoff

Oct 11, 2026 · @Robert Weber

## Purpose of this handoff

Build ASHFALL: a browser game compiled from an npm project, a wordless 2.5D cinematic adventure set after a nuclear war, with an original world and character.

Instructions for the receiving Claude session:

1. Read the whole document before writing code. The sections below are the spec; treat them as requirements unless marked as a suggestion.
2. Build the engine and levels as separate layers (see Architecture). Future sessions will add levels and mechanics one prompt at a time, so this split matters more than anything else.
3. Work in the milestones listed at the end. Get each one running in a phone browser before moving on.
4. Ask the owner before changing anything under Controls, the blue scarf, or the camera feel. Those were explicit requests.
5. Keep this document in sync: when the level schema or entity list changes, update the Architecture section or a README that mirrors it.

## Concept and tone

A lone child in a cracked gas mask and a bright blue scarf walks east through the ruins of a world decades after a nuclear war, drawn toward a distant signal.

- **No words at all:** no dialogue, text, tutorial, HUD, score or menus beyond a title fade-in. Story comes only from environment, lighting, sound and events in the background.
- **Tone:** bleak, quiet, tense, melancholic, with occasional shocking moments. Unsettling rather than jump-scare horror.
- **Pacing:** long stretches of quiet walking and atmosphere, broken by puzzles and short tension sequences such as chases, hiding and timing.
- **Fragility:** the child is weak and dies instantly to falls, hazards and enemies. Death is part of learning, so respawns are fast and checkpoints are frequent.
- **Originality:** all characters, art, names and level layouts are original.
- **Working title:** ASHFALL (the owner may rename it).

## Art direction

The world is near-monochrome with deep silhouettes, and the child's bright blue scarf is the only saturated color in the game.

- **Palette:** ash greys, sickly greens, dusty browns and near-black silhouettes. Each level may tint this palette slightly (colder metro, greener forest) but never adds saturated color.
- **The scarf:** bright, clean blue (start near `#1E90FF` and tune). It trails and flutters with movement and wind, so the player's eye always finds the child. Nothing else in the world uses this blue.
- **Characters and objects:** dark silhouettes with minimal interior detail. Readability comes from shape and rim light, not texture.
- **Atmosphere, always on:** drifting ash particles, layered fog, film grain, a soft vignette and an occasional distant lightning or flash flicker.
- **Animation:** smooth, weighty and procedural. It covers idle breathing, walking, running, jumping, climbing over obstacles, crawling, pushing and pulling, and a limp ragdoll collapse on death.

### Depth layers

The scene is built from depth layers that scroll at different speeds. The key request is a sparse foreground layer between the camera and the child.

| Layer | Scroll speed vs. play layer | Content | Notes |
| --- | --- | --- | --- |
| Sky | \~0.05 | Ash sky, bomb-scar clouds, faint sun or moon | Gradient plus slow-moving shapes |
| Far background | 0.1–0.3 | Ruined skylines, mountains, smokestacks | Hazy, low contrast |
| Mid background | 0.4–0.7 | Tree lines, pylons, wrecked buildings, background story events | Story silhouettes play out here |
| Near background | 0.8–0.95 | Rocks, fences, trunks just behind the path | Slight blur and fog |
| Play layer | 1.0 | The path, the child, interactables, enemies | Sharpest contrast |
| Foreground (sparse) | 1.2–1.6 | Occasional dead branches, grass blades, chain-link, hanging wires, rubble edges | Dark and blurred; must never hide hazards |

Foreground rules: place foreground objects sparsely (roughly one every 1–3 screen widths), keep them mostly at the top and bottom edges of the frame, and let them briefly cross the child to sell depth. Their density is set per level in the level data.

## Camera and world feel

This is a 2.5D cinematic journey along one natural path, not a platformer. It should feel like a 3D world seen from the side.

**What it is**

- One obvious, continuous path that the child follows left to right. It rises and falls over hills, dips into hollows, winds through forest, and crosses streams, ruins and roads.
- The terrain is organic: slopes and uneven ground, not flat tiles or floating blocks. Obstacles are things that belong in the world, such as fallen trees, boulders, car wrecks, fences, collapsed walls, ditches and pipes.
- Climbing is contextual. The child automatically scrambles over knee-to-chest-high obstacles and uses jump for gaps and higher ledges.

**What it is not**

- No floating platforms, coins, power-ups or stacked platform towers.
- No Mega Man or Contra feel: no tight pixel-precise jumping, no shooting, no enemy waves.

**How to make it feel 3D**

- **Real 3D projection:** consider rendering with Three.js using a perspective camera and flat or low-poly geometry, with all gameplay physics locked to a 2D plane. This gives true parallax, perspective and depth of field for free. A 2D canvas with layered parallax is acceptable if it reaches the same feel; the receiving session should pick one and explain why.
- **Depth cues:** fog increases with distance, background layers are lower contrast, and the foreground layer is blurred and dark.
- **Path that bends in depth:** the path may visually curve slightly toward or away from the camera (scale and fog shift) while gameplay stays on one plane.
- **Camera:** smooth follow with lag and easing, gentle look-ahead in the walking direction, slow pull-outs for big reveals, and slight push-ins during tension. Camera hints come from level triggers.
- **Lighting:** directional moonlight or haze light, god rays through trees, and rim light on the child and nearby objects.

## Gameplay and controls

Controls are minimal: four directions plus one tap. Everything else is contextual.

### Controls

| Input | Phone (hidden pad) | Keyboard | Gamepad |
| --- | --- | --- | --- |
| Move left / right | Hold left or right on the hidden pad | A / D or arrow keys | Left stick or d-pad |
| Jump | Up on the pad | W / Up / Space | South button |
| Crawl | Down on the pad (hold to stay low) | S / Down | Down |
| Interact / grab | Tap the screen while standing at an object | E | West button |
| Drag / push / pull | Tap and hold, then move left or right on the pad | Hold E and move | Hold West and move |

**Hidden pad:** an invisible direction pad on the left half of the screen. Touch anywhere there to set its center, then slide in a direction. Show a faint ring under the thumb for the first few seconds of play only, then nothing. The right half of the screen is the tap and hold zone for interaction.

**Tap to interact:** a tap only does something when the child is next to an interactable object. With nothing nearby, a tap does nothing; no menus or icons appear. The object in range gets a very subtle highlight, such as a slight rim light, never an icon.

**Phone details:** lock the game to landscape. In portrait, show only a wordless rotate-device graphic. Prevent scroll, zoom and the long-press menu, and respect safe areas such as the notch and home bar.

### Core mechanics

- **Movement:** walk by default; running is a short burst when holding a direction for a while or during chases. Auto-scramble over low obstacles. Jump only for gaps and ledges.
- **Crawl:** under fences, through pipes and vents, and to hide in tall grass or shadow.
- **Drag, push and pull:** crates, carts, logs, car doors and bodies. They are used to bridge gaps, reach ledges, weigh down plates and block enemies.
- **Levers, switches and valves:** tap to operate. They power doors, lifts, lights and machines.
- **Hiding and stealth:** shadows, grass and cover break the line of sight of searchlights, guards and drones.
- **Relay Collars (signature mechanic):** dormant pre-war worker drones and hollow survivors stand inert. After the child finds a relay transmitter, tapping a dormant body in range takes control of it. The child freezes while the body moves using the same controls. Bodies can work heavy machinery, act as weights or walk into danger. Tapping on the child returns control.
- **Radiation:** glowing fallout zones. Lingering there intensifies film grain and a Geiger crackle, and after about 3 seconds the child collapses. There is no meter, only sound and visuals.
- **Death and respawn:** brief pause, fade to black, then respawn at the last invisible checkpoint within about 1.5 seconds.
- **Hidden memories:** each level has one optional collectible off the main path, such as a child's drawing or a toy. Collecting all of them unlocks an alternate ending.

## Technical stack

The game is an npm project that compiles to a static browser bundle. It plays full-width in landscape on phones and in any desktop browser.

| Area | Requirement | Suggested choice |
| --- | --- | --- |
| Language | Typed, modular source | TypeScript |
| Build | `npm run dev` for a hot-reload dev server, `npm run build` for static files in `dist/` | Vite |
| Rendering | 2.5D look with real depth | Three.js (perspective camera, gameplay on a 2D plane) or PixiJS with manual parallax |
| Physics | Slopes, pushing, stacking, ragdoll collapse | Custom 2D character controller plus a light physics library such as Rapier 2D or Matter.js for objects |
| Audio | Procedural ambience and effects, room for recorded files later | Web Audio API, with an optional wrapper such as Howler for files |
| Input | Touch, keyboard and gamepad behind one input layer | Custom module that outputs left, right, up, down and interact |
| Save | Current level, checkpoint, collected memories | localStorage |
| Tests | Level data validation and core logic | Vitest; a schema check that fails the build on bad level data |

**Phone display:**

- Wide view: fill the full landscape screen edge to edge and adjust the visible world width to the aspect ratio. Keep the same vertical framing so taller phones simply see more horizontally.
- Use `viewport-fit=cover`, handle safe-area insets, and add PWA manifest settings for fullscreen landscape when the game is added to the home screen.
- Target 60 fps on a recent iPhone in Safari. Use device-pixel-ratio scaling with a cap, and quality tiers that reduce particles, blur and shadows on slower devices.
- Art starts procedural or as simple vector shapes so nothing blocks progress. Plan for asset files (SVG, PNG or glTF) to be swapped in per entity type later.
- Audio must unlock on the first touch, as iOS requires.

## Architecture for expandable levels

The engine contains no level-specific logic. A new level is one new data file, and a new mechanic is one new entity type.

### Rules

1. Levels are plain data files, one per level, in `src/levels/`. They are listed in order in `src/levels/index.ts`.
2. Every interactable thing is an entity whose behavior comes from a type in the entity registry. Each type defines its own spawn, update, render, collision and interaction logic.
3. Entities connect by `id` and `target`; for example, a lever with `target: "gate2"` opens that gate. Triggers fire actions such as camera moves, sound cues, background events, checkpoints and level exit.
4. Terrain is defined as a path profile (a polyline or spline of ground points) plus obstacle entities, not a tile grid. This keeps the ground natural.
5. Every level file is validated against a schema (for example with Zod) at build time and in tests.
6. Debug mode (backtick key, or a hidden four-finger tap on the phone) shows hitboxes, entity ids, coordinates and FPS, plus a level and checkpoint jump menu. Keep a sandbox level `L00` that contains one of every entity type.

### Suggested layout

```
src/
  engine/     core loop, renderer, camera, physics, audio, input, save
  entities/   one file per entity type + registry.ts
  levels/     L00-sandbox.ts, L01-shelter.ts, ... + index.ts + schema.ts
  fx/         ash, fog, grain, vignette, lighting, foreground layer
  main.ts
```

### Level schema (starting point)

```ts
interface Level {
  id: string;                 // "L01"
  name: string;               // internal only, never shown
  length: number;             // world units along the path
  palette: { sky: string; fog: string; ground: string; tint?: string };
  ambience: { drone: string; wind: number; ash: number; lightning: number };
  layers: LayerSpec[];        // sky, far, mid, near, foreground (density, prop set)
  path: PathPoint[];          // ground profile: [{ x, y, surface: "dirt" | "grass" | "concrete" | "water" ... }]
  spawn: { x: number };
  entities: EntitySpec[];     // [{ type, id?, x, y?, target?, ...params }]
  triggers: TriggerSpec[];    // [{ x, w, once?, action, params }]
  checkpoints: number[];      // x positions
  exit: { x: number; next?: string };
}
```

### Starting entity types

| Group | Types |
| --- | --- |
| Terrain and obstacles | `obstacle_low` (auto-scramble), `obstacle_high` (jump), `log`, `boulder`, `fence`, `crawlspace`, `pipe`, `water`, `ladder`, `rope` |
| Movable | `crate`, `cart`, `draggable_log`, `body` |
| Mechanisms | `lever`, `valve`, `pressure_plate`, `gate`, `lift`, `conveyor`, `power_cable` |
| Hazards | `radiation_zone`, `falling_debris`, `wire_trap`, `deep_water`, `fall_height` |
| Threats | `feral_dog`, `searchlight`, `patrol_drone`, `guard` |
| Relay | `relay_transmitter`, `dormant_body` |
| Meta | `checkpoint`, `memory_collectible`, `background_event`, `foreground_prop`, `camera_hint` |

## Initial levels

Build three levels of about 3–6 minutes each. Each has at least two puzzles, one tension sequence, one background story moment and one hidden memory.

### L01 — The Shelter

- **Setting:** night, falling ash. The child pushes open a buried fallout-shelter hatch on a wooded hillside, then descends through a dead forest toward a collapsed highway.
- **Teaches, without text:** walking, scrambling over logs, jumping a ditch, crawling under a fallen tree, and tap-and-drag on a log to bridge a stream.
- **Puzzle:** drag a rusted cart to the base of a steep embankment to climb it.
- **Tension:** a feral dog appears on the ridge. The child flees down the hill and crawls through a culvert pipe that is too narrow for the dog.
- **Background moment:** a distant convoy of headlights crawls along a far ridge, then the lights cut out all at once.
- **Memory:** a melted toy rabbit inside a burned-out car just off the path.

### L02 — The Dead Suburb

- **Setting:** grey dawn. Rows of burned houses on rolling streets, overgrown gardens and swing sets.
- **Puzzle 1:** a radiation pool fills a crater in the road. Drag a car door across a narrow part, or detour through a back garden.
- **Puzzle 2:** a gate is held shut by a chain. Reach a lever on a porch by stacking a crate on a garden bench.
- **Tension:** watchtower searchlights sweep the street. Move between shadows, hedges and wrecks, crawling through tall grass.
- **Background moment:** a silent line of masked people is marched east by guards on a hill behind the houses.
- **Memory:** a crayon drawing of a family, pinned in a basement reached by crawling through a broken window.

### L03 — The Relay Yard

- **Setting:** an industrial rail yard in a valley, with rows of dormant worker drones under sheet-metal sheds.
- **Puzzle 1:** the child finds the first relay transmitter. Control a drone to lift a heavy shutter that the child then crawls under.
- **Puzzle 2:** control a second drone to stand on a pressure plate holding a gate open, then switch back and run through.
- **Tension:** a guard spots the child. A desperate run across the yard ends with a jump onto a moving freight car as the level fades out.
- **Background moment:** a huge, silent airship drifts over the valley, its searchlight sweeping far-off hills.
- **Memory:** a child's knitted mitten caught on the fence behind the sheds.

## Prompt templates for later sessions

Paste one of these into a Claude session working in the repo to grow the game one step at a time.

### Add a level

```markdown
Add a new ASHFALL level. Follow the level schema in src/levels/schema.ts exactly.
Do not change the engine, other levels, or existing entity behavior unless I say so.

Level ID: L04
Name: The Flooded Metro
Setting and layers: [terrain along the path, far/mid/near background, foreground props and density]
Mood: [lighting, fog, ash, ambient sounds]
Puzzles: [2-3 puzzles using existing entity types]
Tension sequence: [chase, hiding, or timing challenge]
Background story moment: [what happens in the distance, wordlessly]
Hidden memory: [where it is and what it is]
Ending: [how it hands off to the next level]

If a new mechanic is needed, add it as a new entity type in src/entities/ with a test,
add one instance to L00-sandbox, and list it at the end of your reply.
Point L03's exit to L04. Run the tests and the build, then tell me how to reach L04 in debug mode.
```

### Add a mechanic

```markdown
Add a new ASHFALL entity type: [name].
Behavior: [what it does, how the child or a relay body interacts with it, how it helps or kills].
Look: [silhouette description]. Sound: [description].
Register it in the entity registry, add it to the level schema, add one instance to L00-sandbox,
and add a test. Do not change any other level.
```

## Milestones and acceptance criteria

Build in this order. Each milestone ends with something the owner can play on an iPhone.

- [ ] **M1 — Scaffold:** npm + Vite + TypeScript project, landscape full-screen canvas, hidden touch pad, keyboard input, debug overlay. Done when a placeholder child walks, jumps and crawls on a sloped path on a phone.
- [ ] **M2 — World and depth:** all depth layers including the sparse foreground, fog, ash, grain, vignette, camera follow, and the blue scarf animation. Done when walking a test path feels 3D on a phone.
- [ ] **M3 — Data-driven levels:** level schema with validation, entity registry, triggers, checkpoints, save/continue, and the `L00` sandbox. Done when a level loads entirely from its data file.
- [ ] **M4 — Mechanics:** tap-to-interact, drag/push/pull, levers and gates, hazards, threats, relay control, death and respawn. Done when every entity type works in `L00`.
- [ ] **M5 — Levels L01–L03:** fully playable start to finish, with procedural audio and title fade-in.
- [ ] **M6 — Polish and performance:** steady 60 fps on a recent iPhone, quality tiers, PWA fullscreen, and a README documenting the schema and how to add levels.

**Constraints that always apply**

- No text in the game itself; the only exception is the title fade-in.
- The blue scarf is the only saturated color.
- Controls stay limited to four directions plus tap, with no visible on-screen buttons during normal play.
- No level-specific code in the engine.
- Original content only.

**Open questions for the owner**

- Where should it be hosted (for example GitHub Pages, or one of the owner's own servers)?
- Should the game keep the name ASHFALL?
- Three.js (true 3D depth) or 2D canvas with parallax? The receiving session should recommend one after a quick prototype.
