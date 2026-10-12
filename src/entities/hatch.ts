// A buried fallout-shelter hatch overhead. Closed, its lid is a ceiling; tap
// it from below to heave it open (it swings up on its hinge).

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { PALE, addSolid, addUse, glowMaterial, silhouetteMaterial, zAt } from './visuals';

export const hatch: EntityDefinition<'hatch'> = {
  create(spec, ctx) {
    const y = entityY(spec, ctx);
    let open = false;
    let swing = 0;
    const lid = addSolid(ctx, {
      minX: spec.x - spec.w / 2,
      maxX: spec.x + spec.w / 2,
      minY: y - 0.04,
      maxY: y + 0.1,
      climbable: false,
      tag: 'hatch',
    });
    const mat = silhouetteMaterial(0x121412);
    const hinge = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(spec.w, 0.1, 1.2), mat);
    plate.position.x = spec.w / 2;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 5, 10, Math.PI), mat);
    handle.position.set(spec.w * 0.8, -0.08, 0);
    handle.rotation.x = Math.PI;
    hinge.add(plate, handle);
    hinge.position.set(spec.x - spec.w / 2, y + 0.03, zAt(ctx, spec.x, -0.2));
    const frame = new THREE.Mesh(new THREE.BoxGeometry(spec.w + 0.3, 0.12, 1.4), silhouetteMaterial());
    frame.position.set(spec.x, y - 0.02, zAt(ctx, spec.x, -0.2));
    ctx.group.add(hinge, frame);

    // Moonlight: a thin bright seam around the closed lid, then a soft shaft spilling in once it's open.
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(spec.w + 0.1, 0.03), glowMaterial(PALE, 0.5));
    seam.position.set(spec.x, y - 0.05, zAt(ctx, spec.x, 0.45));
    const shaftGeo = new THREE.PlaneGeometry(spec.w * 0.9, 1.6);
    shaftGeo.translate(0, -0.8, 0);
    const shaftMat = glowMaterial(PALE, 0);
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.set(spec.x + 0.15, y + 0.05, zAt(ctx, spec.x, 0.3));
    shaft.rotation.z = -0.18;
    ctx.group.add(seam, shaft);
    // A dim lamp somewhere below lights the shelter's back wall, so the child reads against it.
    const back = new THREE.Mesh(new THREE.PlaneGeometry(spec.w * 0.95, 1.25), glowMaterial(PALE, 0.09));
    back.position.set(spec.x, y - 0.62, zAt(ctx, spec.x, -0.9));
    ctx.group.add(back);

    addUse(
      ctx,
      {
        x: () => spec.x,
        y: () => y - 0.9,
        range: spec.w / 2 + 0.3,
        enabled: () => !open,
        use: () => {
          open = true;
          lid.enabled = false;
          ctx.sound('hatch_open', spec.x);
        },
      },
      [mat],
    );

    return {
      type: 'hatch',
      id: spec.id,
      x: spec.x,
      frame(dt) {
        swing += ((open ? 1 : 0) - swing) * (1 - Math.exp(-dt * 3));
        hinge.rotation.z = swing * 1.9;
        (seam.material as THREE.MeshBasicMaterial).opacity = (1 - swing) * (0.35 + 0.15 * Math.sin(ctx.time * 2.3));
        shaftMat.opacity = swing * 0.14;
      },
      snapshot: () => open,
      restore: (s) => {
        open = s as boolean;
        lid.enabled = !open;
        swing = open ? 1 : 0;
      },
    };
  },
};
