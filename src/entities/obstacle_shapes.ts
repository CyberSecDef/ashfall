// Silhouette shapes for static obstacles, sized to w x h with the bottom-left at the origin.

import * as THREE from 'three';
import { jagged, shape } from './visuals';

export type ObstacleLook = 'rubble' | 'car' | 'wall' | 'barrel' | 'slab';

export function obstacleShape(look: ObstacleLook, w: number, h: number, seed: number): THREE.Shape {
  switch (look) {
    case 'car':
      // A burned-out car body: low hood, cabin, trunk; no wheels left.
      return shape([
        [0, 0.08 * h], [0.02 * w, 0.55 * h], [0.25 * w, 0.62 * h], [0.38 * w, h], [0.72 * w, h],
        [0.82 * w, 0.62 * h], [w, 0.55 * h], [w, 0.08 * h], [0.8 * w, 0], [0.2 * w, 0],
      ]);
    case 'barrel': {
      const s = new THREE.Shape();
      const r = Math.min(w, h) * 0.15;
      s.moveTo(r, 0);
      s.lineTo(w - r, 0);
      s.quadraticCurveTo(w, 0, w, r);
      s.lineTo(w, h - r);
      s.quadraticCurveTo(w, h, w - r, h);
      s.lineTo(r, h);
      s.quadraticCurveTo(0, h, 0, h - r);
      s.lineTo(0, r);
      s.quadraticCurveTo(0, 0, r, 0);
      return s;
    }
    case 'slab':
      return shape([[0, 0], [0.04 * w, h], [w, h * 0.9], [w * 0.97, 0]]);
    case 'wall':
      return jagged(w, h, seed, 4);
    default:
      return jagged(w, h, seed, 6);
  }
}
