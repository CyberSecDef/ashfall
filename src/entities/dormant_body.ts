// A dormant body: a pre-war worker drone or a hollow survivor standing inert.
// With the relay, tapping it (or E with nothing else nearby) takes control:
// it moves with the same controls while the child stands frozen. Bodies are
// heavy and strong (they push faster), can't crawl or jump, and can walk
// into danger. Tap the child (or E) to return.

import * as THREE from 'three';
import { CHILD, type ActorParams } from '../engine/player';
import type { EntityDefinition } from './types';
import { PALE, glowMaterial, silhouetteMaterial, zAt } from './visuals';

export const BODY: ActorParams = {
  ...CHILD,
  height: 1.45,
  crawlHeight: 1.45,
  halfWidth: 0.24,
  walkSpeed: 1.15,
  runSpeed: 1.15,
  canRun: false,
  canCrawl: false,
  canJump: false,
  scrambleMax: 0.5,
  airGrabMax: 0,
  scrambleTime: 0.7,
  pushSpeed: 1.6,
  safeFall: 2.6,
};

export const dormant_body: EntityDefinition<'dormant_body'> = {
  create(spec, ctx) {
    const body = ctx.addRelayBody(spec.x, BODY);
    body.facing = -1;
    const mat = silhouetteMaterial();
    const g = new THREE.Group();
    const inner = new THREE.Group();
    g.add(inner);
    if (spec.kind === 'drone') {
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.6, 0.4), mat);
      torso.position.y = 0.95;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.26), mat);
      head.position.y = 1.36;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.1), mat);
      arm.position.set(0.3, 0.85, 0.12);
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.34), mat);
      pack.position.set(-0.3, 1.0, 0);
      inner.add(torso, head, arm, pack);
    } else {
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.55, 4, 8), mat);
      torso.position.y = 1.0;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat);
      head.position.set(0.05, 1.42, 0);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.55, 3, 6), mat);
      arm.position.set(0.05, 0.85, 0.15);
      inner.add(torso, head, arm);
    }
    const legGeo = new THREE.CapsuleGeometry(0.07, 0.5, 3, 6);
    legGeo.translate(0, -0.33, 0);
    const legs = [0.09, -0.09].map((z) => {
      const l = new THREE.Mesh(legGeo, mat);
      l.position.set(0, 0.68, z);
      inner.add(l);
      return l;
    });
    // The relay collar: a faint pale ring that lights while the body is controlled.
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 16), glowMaterial(PALE, 0.8));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.26;
    inner.add(collar);
    ctx.group.add(g);
    let phase = 0;
    let slump = 1;
    let deadTime = 0;

    return {
      type: 'dormant_body',
      id: spec.id,
      x: spec.x,
      frame(dt) {
        const controlled = ctx.controlled === body;
        const speed = Math.abs(body.vx);
        phase += dt * (2 + speed * 5);
        slump += ((controlled ? 0 : 1) - slump) * (1 - Math.exp(-dt * 4));
        g.position.set(body.x, body.y, zAt(ctx, body.x, -0.05));
        g.scale.x = body.facing;
        collar.visible = controlled || (ctx.hasRelay && Math.abs(body.x - ctx.player.x) < 9 && Math.sin(ctx.time * 3) > 0.7);
        (collar.material as THREE.MeshBasicMaterial).opacity = controlled ? 0.85 : 0.25;
        if (body.dead) {
          deadTime += dt;
          inner.rotation.z = -1.4 * Math.min(1, deadTime * 2.5);
          inner.position.y = -0.7 * Math.min(1, deadTime * 2.5);
          collar.visible = false;
          return;
        }
        // Dormant: head bowed, shoulders slumped. Controlled: upright, heavy steps.
        inner.rotation.z = -0.25 * slump + (body.mode === 'push' ? -0.35 : body.mode === 'pull' ? 0.3 : 0);
        legs[0].rotation.z = Math.sin(phase) * 0.45 * Math.min(1, speed);
        legs[1].rotation.z = -Math.sin(phase) * 0.45 * Math.min(1, speed);
      },
      snapshot: () => ({ x: body.x, y: body.y, dead: body.dead }),
      restore(s) {
        const st = s as { x: number; y: number; dead: boolean };
        body.place(st.x, st.y);
        if (st.dead) body.die();
      },
    };
  },
};
