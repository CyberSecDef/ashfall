// Background story events: wordless moments that play out in a distant layer.
// Each kind is a small procedural scene that runs once over `duration`
// seconds, started by a signal ('activate') or by the child passing
// `autoplayAt`.
//
//   convoy   - a line of headlights crawls along a far ridge, then every light cuts out at once
//   marchers - a silent line of masked figures herded east by taller guards
//   airship  - a huge dark airship drifts across, its searchlight sweeping the hills

import * as THREE from 'three';
import { depthForSpeed, layerColor } from '../fx/layers';
import type { EntityDefinition, LevelContext } from './types';

interface Scene {
  group: THREE.Group;
  /** t runs 0..1 over the event's duration. */
  play(t: number): void;
}

const LIGHT = 0xd9d5cb; // pale, desaturated: headlights through ash

function dot(size: number, color: number, opacity = 1): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.CircleGeometry(size, 10),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
}

function convoy(span: number): Scene {
  const group = new THREE.Group();
  const trucks: THREE.Group[] = [];
  for (let i = 0; i < 7; i++) {
    const t = new THREE.Group();
    const a = dot(0.22, LIGHT);
    const b = dot(0.22, LIGHT);
    a.position.x = 0.5;
    b.position.x = 0.9;
    const glow = dot(1.1, LIGHT, 0.12);
    glow.position.x = 0.7;
    t.add(a, b, glow);
    t.position.x = -i * 4.5;
    trucks.push(t);
    group.add(t);
  }
  return {
    group,
    play(t) {
      const lead = t * span;
      const cut = t > 0.72; // all at once
      for (const truck of trucks) {
        const x = truck.userData.base ?? (truck.userData.base = truck.position.x);
        truck.position.x = x + lead;
        truck.position.y = Math.sin((x + lead) * 0.15) * 0.6; // following the ridge
        truck.visible = !cut && t > 0;
      }
    },
  };
}

function marchers(span: number, color: THREE.Color): Scene {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, fog: false });
  const people: THREE.Group[] = [];
  for (let i = 0; i < 14; i++) {
    const guard = i % 5 === 0;
    const h = guard ? 2.0 : 1.6 + Math.sin(i * 3.7) * 0.12;
    const p = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, h - 0.7, 3, 6), mat);
    body.position.y = h / 2;
    const head = new THREE.Mesh(new THREE.CircleGeometry(0.2, 10), mat);
    head.position.y = h + 0.05;
    p.add(body, head);
    if (guard) {
      const rifle = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1.1), mat);
      rifle.position.set(0.25, h * 0.75, 0);
      rifle.rotation.z = 0.5;
      p.add(rifle);
    }
    p.position.x = -i * 1.6;
    p.userData.phase = i * 1.3;
    people.push(p);
    group.add(p);
  }
  return {
    group,
    play(t) {
      for (const p of people) {
        const base = p.userData.base ?? (p.userData.base = p.position.x);
        p.position.x = base + t * span;
        // A tired, uneven bob.
        p.position.y = Math.abs(Math.sin(t * 60 + p.userData.phase)) * 0.06;
        p.visible = t > 0 && t < 1;
      }
    },
  };
}

function airship(span: number, color: THREE.Color): Scene {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, fog: false });
  const hull = new THREE.Mesh(new THREE.CircleGeometry(1, 32), mat);
  hull.scale.set(14, 3.4, 1);
  const gondola = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), mat);
  gondola.position.y = -3.6;
  const fin = new THREE.Mesh(new THREE.CircleGeometry(2.4, 3), mat);
  fin.position.set(-13, 0.6, 0);
  // Searchlight: a long soft additive cone.
  const coneGeo = new THREE.PlaneGeometry(1, 1);
  coneGeo.translate(0, -0.5, 0);
  const beam = new THREE.Mesh(
    coneGeo,
    new THREE.MeshBasicMaterial({ color: LIGHT, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
  );
  beam.scale.set(4, 30, 1);
  beam.position.set(1, -4, 0);
  group.add(hull, gondola, fin, beam);
  return {
    group,
    play(t) {
      group.position.x = (t - 0.5) * span;
      beam.rotation.z = Math.sin(t * Math.PI * 6) * 0.45;
      group.visible = t > 0 && t < 1;
    },
  };
}

function buildScene(kind: string, span: number, color: THREE.Color): Scene {
  if (kind === 'convoy') return convoy(span);
  if (kind === 'marchers') return marchers(span, color);
  return airship(span, color);
}

export const background_event: EntityDefinition<'background_event'> = {
  create(spec, ctx: LevelContext) {
    const z = depthForSpeed(spec.speed, ctx.cameraDistance);
    const color = layerColor(ctx.level.palette, z, ctx.cameraDistance).multiplyScalar(0.8);
    const scene = buildScene(spec.kind, spec.span, color);
    // Height: explicit y, or a little above the ground at that x (distant ridges sit higher on screen).
    const baseY = spec.y ?? ctx.terrain.heightAt(spec.x) + (spec.kind === 'airship' ? 14 : 2 + -z * 0.05);
    scene.group.position.set(spec.x - spec.span / 2, baseY, z);
    if (spec.kind === 'airship') scene.group.position.x = spec.x;
    ctx.group.add(scene.group);
    scene.play(0);

    let t = -1; // -1 = waiting
    const start = () => {
      if (t < 0) t = 0;
    };
    return {
      type: 'background_event',
      id: spec.id,
      x: spec.x,
      signal: (name) => {
        if (name === 'activate') start();
        // Respawned past this event: it already happened.
        if (name === 'skip' && (spec.autoplayAt === undefined || spec.autoplayAt < ctx.player.x)) {
          t = 1;
          scene.play(1);
        }
      },
      update(dt) {
        if (t < 0 && spec.autoplayAt !== undefined && ctx.player.x >= spec.autoplayAt) start();
        if (t >= 0 && t < 1) {
          t = Math.min(1, t + dt / spec.duration);
          scene.play(t);
        }
      },
    };
  },
};
