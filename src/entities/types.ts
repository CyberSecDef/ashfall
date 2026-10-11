// The contract between the engine and entity behaviors. The engine knows
// nothing level-specific: it builds entities from level data through the
// registry and routes signals between them by id.

import type * as THREE from 'three';
import type { CameraRig } from '../engine/camera';
import type { Player } from '../engine/player';
import type { SaveGame } from '../engine/save';
import type { Terrain } from '../engine/terrain';
import type { ForegroundItem } from '../fx/layers';
import type { Lightning } from '../fx/lightning';
import type { Overlay } from '../fx/overlay';
import type { Level } from '../levels/schema';
import type { EntitySpecOf, EntityType } from './params';

export interface LevelContext {
  readonly level: Level;
  /** Group for this level's objects; disposed on unload. */
  readonly group: THREE.Group;
  readonly terrain: Terrain;
  readonly player: Player;
  readonly rig: CameraRig;
  readonly lightning: Lightning;
  readonly overlay: Overlay;
  readonly save: SaveGame;
  /** Depth (z) of the foreground layer, for hand-placed foreground props. */
  readonly foregroundZ: number;
  readonly cameraDistance: number;
  /** Seconds since the level loaded. */
  readonly time: number;
  /** Send a signal to the entity with this id. */
  signal(targetId: string, signal: string, from?: string): void;
  /** Register a swaying foreground prop. */
  addForeground(item: ForegroundItem): void;
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
  dispose?(): void;
}

export interface EntityDefinition<T extends EntityType> {
  create(spec: EntitySpecOf<T>, ctx: LevelContext): Entity;
}

/** Ground height under an entity: its explicit y, or the terrain there. */
export function entityY(spec: { x: number; y?: number }, ctx: LevelContext): number {
  return spec.y ?? ctx.terrain.heightAt(spec.x);
}
