// A feral dog. Lies still until the child comes within `range` (and isn't
// hidden), then chases at a run. It can hop low obstacles but can't crawl or
// climb, so a pipe, a crawlspace or a high ledge is safety. Gives up after
// being stuck for `giveUpAfter` seconds and returns to its spot.

import * as THREE from 'three';
import { emptyInput } from '../engine/input';
import { Player, type ActorParams, CHILD } from '../engine/player';
import { canSeeChild } from './sight';
import type { EntityDefinition } from './types';
import { silhouetteMaterial, zAt } from './visuals';

const DOG: ActorParams = {
  ...CHILD,
  height: 0.62,
  crawlHeight: 0.62,
  halfWidth: 0.34,
  walkSpeed: 1.3,
  runSpeed: 3.9,
  runAfter: 0,
  canCrawl: false,
  canRun: true,
  scrambleMax: 0.45,
  airGrabMax: 0.3,
  jumpSpeed: 5.0,
  safeFall: 6,
};

export const feral_dog: EntityDefinition<'feral_dog'> = {
  create(spec, ctx) {
    const dog = new Player(ctx.terrain, spec.x, { ...DOG, runSpeed: spec.speed }, { collision: ctx.collision });
    dog.facing = -1;
    let state: 'sleep' | 'chase' | 'return' = 'sleep';
    let stuck = 0;
    let lastX = dog.x;
    let barkAt = 0;
    const input = emptyInput();

    const mat = silhouetteMaterial();
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.5, 4, 8), mat);
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.42;
    const head = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), mat);
    snout.rotation.z = -Math.PI / 2;
    snout.position.x = 0.14;
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 4), mat);
    ear.position.set(-0.03, 0.12, 0);
    head.add(skull, snout, ear);
    head.position.set(0.38, 0.55, 0);
    const legs: THREE.Mesh[] = [];
    const legGeo = new THREE.CylinderGeometry(0.03, 0.025, 0.36, 4);
    legGeo.translate(0, -0.18, 0);
    for (const [lx, lz] of [[0.25, 0.08], [0.25, -0.08], [-0.25, 0.08], [-0.25, -0.08]]) {
      const l = new THREE.Mesh(legGeo, mat);
      l.position.set(lx, 0.38, lz);
      legs.push(l);
      g.add(l);
    }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.3, 4), mat);
    tail.position.set(-0.42, 0.5, 0);
    tail.rotation.z = 1.0;
    g.add(body, head, tail);
    ctx.group.add(g);
    let phase = 0;

    return {
      type: 'feral_dog',
      id: spec.id,
      x: spec.x,
      update(dt) {
        const c = ctx.player;
        const dx = c.x - dog.x;
        input.left = input.right = input.up = false;
        if (state === 'sleep') {
          if (Math.abs(dx) < spec.range && canSeeChild(ctx, dog.x, dog.y + 0.5)) {
            state = 'chase';
            stuck = 0;
            ctx.sound('dog_bark');
          }
        } else if (state === 'chase') {
          if (c.dead) state = 'return';
          input.right = dx > 0.2;
          input.left = dx < -0.2;
          // Hop when blocked by something low.
          if (Math.abs(dog.x - lastX) < 0.002 && Math.abs(dx) > 0.6) {
            stuck += dt;
            input.up = stuck > 0.15 && stuck < 0.3;
          } else stuck = Math.max(0, stuck - dt);
          if (stuck > spec.giveUpAfter || Math.abs(dx) > spec.range * 3) {
            state = 'return';
            ctx.sound('dog_whine');
          }
          barkAt -= dt;
          if (barkAt <= 0) {
            ctx.sound('dog_bark');
            barkAt = 1.2 + Math.random();
          }
          // Caught: the child can't be reached inside a crawl-only space (the dog is blocked before it).
          if (!c.dead && Math.abs(dx) < 0.45 && Math.abs(c.y - dog.y) < 0.6 && !(c.crawling && ctx.collision.ceiling(c.x - 0.2, c.x + 0.2, c.y + 0.05) - c.y < DOG.height)) {
            ctx.kill(c, 'dog');
            state = 'return';
          }
        } else {
          const home = spec.x - dog.x;
          input.right = home > 0.2;
          input.left = home < -0.2;
          if (Math.abs(home) <= 0.2) state = 'sleep';
          if (Math.abs(dx) < spec.range * 0.6 && canSeeChild(ctx, dog.x, dog.y + 0.5) && !c.dead) state = 'chase';
        }
        lastX = dog.x;
        dog.update(input, dt);
      },
      frame(dt) {
        const speed = Math.abs(dog.vx);
        phase += dt * (3 + speed * 5);
        g.position.set(dog.x, dog.y, zAt(ctx, dog.x, 0.05));
        g.scale.x = dog.facing;
        const asleep = state === 'sleep' && speed < 0.05;
        body.position.y = asleep ? 0.2 : 0.42 + Math.abs(Math.sin(phase)) * 0.03 * Math.min(1, speed);
        head.position.y = asleep ? 0.25 : 0.55;
        legs.forEach((l, i) => {
          l.visible = !asleep;
          l.rotation.z = Math.sin(phase + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0)) * 0.7 * Math.min(1, speed / 2);
        });
        tail.rotation.z = asleep ? 1.4 : 0.8 + Math.sin(phase * 2) * 0.2;
      },
    };
  },
};
