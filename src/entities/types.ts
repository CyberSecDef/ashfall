// The contract between the engine and entity behaviors. The engine knows
// nothing level-specific: it builds entities from level data through the
// registry, routes signals between them by id, and gives them this context to
// register solids, boxes, ladders, hiding spots and interactables, and to
// hurt actors.

import type * as THREE from 'three';
import type { DynBox } from '../engine/bodies';
import type { CameraRig } from '../engine/camera';
import type { Collision } from '../engine/collision';
import type { ActorParams, Ladder, Player } from '../engine/player';
import type { SaveGame } from '../engine/save';
import type { Terrain } from '../engine/terrain';
import type { ForegroundItem } from '../fx/layers';
import type { Lightning } from '../fx/lightning';
import type { Level } from '../levels/schema';
import type { EntitySpecOf, EntityType } from './params';

export interface Interactable {
  x(): number;
  y(): number;
  /** Horizontal reach from the actor, in meters. */
  range: number;
  enabled(): boolean;
  /** Subtle rim highlight while it is the thing a tap would use. */
  highlight(on: boolean): void;
  /** Called on a tap (or E). Omitted for things that are only grabbed (crates). */
  use?(actor: Player): void;
}

/** A place that hides the child from searchlights, drones and guards. */
export interface Cover {
  minX: number;
  maxX: number;
  /** Tall grass only hides a crawling child; deep shadow hides anyone standing still or crawling. */
  requires: 'crawl' | 'still_or_crawl' | 'any';
}

export interface WaterZone {
  minX: number;
  maxX: number;
  /** Surface height. */
  y: number;
  deep: boolean;
}

export interface Effects {
  /** Target tension (grain + vignette), 0..1. */
  tension: number;
  /** Radiation exposure this frame, 0..1, pushes grain and the Geiger cue. */
  radiation: number;
}

export interface LevelContext {
  readonly level: Level;
  /** Group for this level's objects; disposed on unload. */
  readonly group: THREE.Group;
  readonly terrain: Terrain;
  readonly collision: Collision;
  /** The child. */
  readonly player: Player;
  /** Whoever currently takes input: the child, or a relay body. */
  readonly controlled: Player;
  /** Every actor hazards can hurt: the child plus relay bodies. */
  readonly actors: readonly Player[];
  readonly rig: CameraRig;
  readonly lightning: Lightning;
  readonly save: SaveGame;
  readonly effects: Effects;
  /** Depth (z) of the foreground layer, for hand-placed foreground props. */
  readonly foregroundZ: number;
  readonly cameraDistance: number;
  /** Seconds since the level loaded. */
  readonly time: number;
  /** False in headless tests: skip purely visual work that needs a canvas. */
  readonly visuals: boolean;

  /** Send a signal to the entity with this id. */
  signal(targetId: string, signal: string, from?: string): void;
  addForeground(item: ForegroundItem): void;
  addBox(box: DynBox): void;
  addLadder(l: Ladder): void;
  addCover(c: Cover): void;
  addWater(w: WaterZone): void;
  addInteractable(i: Interactable): void;
  /** A controllable relay body. Returns the actor so the entity can draw it. */
  addRelayBody(x: number, params: ActorParams): Player;
  /** Kill an actor (child or relay body). */
  kill(actor: Player, cause: string): void;
  /** Is this actor hidden from sight right now? */
  isHidden(actor: Player): boolean;
  /** Grant the relay ability (saved). */
  grantRelay(): void;
  readonly hasRelay: boolean;
  /** Named sound cue for M5's audio engine. */
  sound(cue: string): void;
}

export interface Entity {
  readonly id?: string;
  readonly type: EntityType;
  readonly x: number;
  /** Called every fixed update. */
  update?(dt: number): void;
  /** Called every rendered frame, for visuals. */
  frame?(dt: number): void;
  /** React to a signal from a trigger or another entity. */
  signal?(name: string, from?: string): void;
  /** Puzzle state to keep across a death (taken when a checkpoint is reached). */
  snapshot?(): unknown;
  restore?(state: unknown): void;
  /** Live state for the debug overlay and scripted playthroughs (positions, facing). */
  debug?(): Record<string, number | string | boolean>;
  dispose?(): void;
}

export interface EntityDefinition<T extends EntityType> {
  create(spec: EntitySpecOf<T>, ctx: LevelContext): Entity;
}

/** Ground height under an entity: its explicit y, or the terrain there. */
export function entityY(spec: { x: number; y?: number }, ctx: LevelContext): number {
  return spec.y ?? ctx.terrain.heightAt(spec.x);
}
