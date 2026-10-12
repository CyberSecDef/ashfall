// Somewhere to hide. Tall grass hides a crawling child; deep shadow hides a
// child who keeps still or crawls; a wreck in front of the path always hides.
// The visual sits in front of the path so the child is half-concealed.

import * as THREE from 'three';
import { foregroundTexture } from '../fx/foreground';
import type { EntityDefinition } from './types';
import { extrude, shape, silhouetteMaterial, zAt } from './visuals';

export const cover: EntityDefinition<'cover'> = {
  create(spec, ctx) {
    const x0 = spec.x;
    const x1 = spec.x + spec.w;
    ctx.addCover({ minX: x0, maxX: x1, requires: spec.kind === 'grass' ? 'crawl' : spec.kind === 'shadow' ? 'still_or_crawl' : 'any' });
    const cx = (x0 + x1) / 2;
    const ground = ctx.terrain.heightAt(cx);
    if (spec.kind === 'grass') {
      const tex = foregroundTexture('grass', 0);
      for (let x = x0; x < x1; x += 0.9) {
        const tuft = new THREE.Mesh(
          new THREE.PlaneGeometry(1.4, 0.75),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: 0x0b0c0b }),
        );
        tuft.position.set(x + 0.45, ctx.terrain.heightAt(x) + 0.3, zAt(ctx, x, 0.35));
        tuft.renderOrder = 6;
        ctx.group.add(tuft);
      }
    } else if (spec.kind === 'shadow') {
      // A broken overhang casting a deep shadow over the path.
      const roof = new THREE.Mesh(new THREE.BoxGeometry(spec.w + 1, 0.3, 2), silhouetteMaterial());
      roof.position.set(cx, ground + 2.6, zAt(ctx, cx, -0.3));
      const dark = new THREE.Mesh(
        new THREE.PlaneGeometry(spec.w, 2.6),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }),
      );
      dark.position.set(cx, ground + 1.2, zAt(ctx, cx, 0.4));
      dark.renderOrder = 6;
      ctx.group.add(roof, dark);
    } else {
      const wreck = new THREE.Mesh(
        extrude(shape([[0, 0], [0, 0.6], [0.2 * spec.w, 0.7], [0.35 * spec.w, 1.25], [0.75 * spec.w, 1.25], [0.85 * spec.w, 0.7], [spec.w, 0.6], [spec.w, 0]]), 0.6),
        silhouetteMaterial(),
      );
      wreck.position.set(x0, ground - 0.05, zAt(ctx, cx, 1.1));
      ctx.group.add(wreck);
    }
    return { type: 'cover', id: spec.id, x: spec.x };
  },
};
