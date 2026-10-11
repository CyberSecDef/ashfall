// Builds the depth layers from a level's LayerSpecs. Each spec's scroll speed
// (relative to the play layer) is turned into a real z depth for the
// perspective camera, so parallax is physically correct and fog falls off
// naturally with distance.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { LayerSpec, Palette } from '../levels/types';
import type { Terrain } from '../engine/terrain';
import { makeRng, noise1, pick, range } from '../engine/rng';
import { PROP_GENERATORS, sag, thickLine, type V2 } from './props';
import { buildGodRays, type GodRay } from './godrays';
import { FOREGROUND_EDGE, FOREGROUND_KINDS, foregroundPlaneSize, foregroundTexture, type ForegroundKind } from './foreground';

/**
 * Depth for a scroll speed. A point at depth z seen from a camera at distance
 * D scrolls at D / (D - z) of the play layer's speed, so z = D (1 - 1/speed).
 */
export function depthForSpeed(speed: number, cameraDistance: number): number {
  return cameraDistance * (1 - 1 / speed);
}

/** Half-width of the view at depth z, for the widest supported aspect. */
function halfViewWidth(z: number, cameraDistance: number, fovDeg: number, aspect = 2.4): number {
  return (cameraDistance - z) * Math.tan(((fovDeg / 2) * Math.PI) / 180) * aspect;
}

export interface ForegroundItem {
  mesh: THREE.Mesh;
  edge: 'top' | 'bottom';
  phase: number;
}

export interface World {
  group: THREE.Group;
  foreground: ForegroundItem[];
  godRays: GodRay[];
}

/**
 * Silhouette color per layer, baked instead of using scene fog: distant
 * layers fade toward a dimmed horizon color but always stay darker than the
 * sky behind them, so the skyline never reads as a light cut-out.
 */
export function layerColor(palette: Palette, z: number, cameraDistance: number): THREE.Color {
  const base = new THREE.Color(0x0b0c0b);
  if (palette.tint) base.lerp(new THREE.Color(palette.tint), 0.15);
  const haze = new THREE.Color(palette.fog).multiplyScalar(0.62);
  const t = THREE.MathUtils.clamp((cameraDistance - z - 8) / 100, 0, 1);
  return base.lerp(haze, Math.pow(t, 0.7) * 0.9);
}

export function buildWorld(
  levelId: string,
  layers: LayerSpec[],
  palette: Palette,
  terrain: Terrain,
  camera: { distance: number; fov: number },
  groundBackZ: number,
): World {
  const group = new THREE.Group();
  const foreground: ForegroundItem[] = [];
  const godRays: GodRay[] = [];
  const avgY = terrain.samples.reduce((s, p) => s + p.y, 0) / terrain.samples.length;

  layers.forEach((spec, li) => {
    const r = makeRng(`${levelId}:layer:${li}`);
    const z = depthForSpeed(spec.speed, camera.distance);

    if (spec.kind === 'foreground') {
      buildForeground(spec, z, r, terrain, camera, foreground, group);
      return;
    }

    // The camera's line of sight passes through x = camera.x at every depth, so a
    // layer at depth z must cover the level plus that depth's half view width.
    const hw = halfViewWidth(z, camera.distance, camera.fov);
    const x0 = terrain.minX - hw - 5;
    const x1 = terrain.maxX + hw + 5;

    // Layers in front of the ground strip's back edge stand on the terrain itself;
    // layers behind it get their own rolling ground band.
    const onTerrain = z > groundBackZ;
    const hills = spec.hills ?? 1;
    const n = noise1(Math.floor(r() * 1e9));
    const groundY = (x: number) =>
      onTerrain ? terrain.heightAt(x) : avgY - 0.5 - hills * 0.4 + n(x / 14) * hills + n(x / 4.3) * hills * 0.25;

    const geos: THREE.BufferGeometry[] = [];
    if (!onTerrain) {
      const pts: V2[] = [];
      for (let x = x0; x <= x1; x += 1.5) pts.push([x, groundY(x)]);
      const shape = new THREE.Shape([new THREE.Vector2(x0, avgY - 40), ...pts.map(([x, y]) => new THREE.Vector2(x, y)), new THREE.Vector2(x1, avgY - 40)]);
      geos.push(new THREE.ShapeGeometry(shape));
    }

    const spacing = 10 / Math.max(spec.density, 0.01);
    const anchors: V2[] = [];
    let prevPylon: [V2, V2] | null = null;
    for (let x = x0 + r() * spacing; x < x1; x += spacing * range(r, 0.5, 1.5)) {
      const kind = pick(r, spec.props);
      const gen = PROP_GENERATORS[kind];
      if (!gen) continue;
      anchors.length = 0;
      geos.push(...gen(r, x, groundY(x), anchors));
      if (kind === 'pylons' && anchors.length === 2) {
        const pair: [V2, V2] = [anchors[0], anchors[1]];
        if (prevPylon && pair[0][0] - prevPylon[1][0] < 45) {
          for (let k = 0; k < 2; k++) geos.push(thickLine(sag(prevPylon[k], pair[k], 1.4, 16), 0.04));
        }
        prevPylon = pair;
      }
    }

    // Light shafts among the mid-layer trees.
    if (spec.kind === 'mid' && spec.props.includes('dead_trees')) {
      for (const g of buildGodRays(r, x0, x1, z, groundY)) {
        godRays.push(g);
        group.add(g.mesh);
      }
    }

    if (geos.length === 0) return;
    // Silhouettes are unlit, so position is the only attribute that matters.
    const flat = geos.map((g) => {
      const ni = g.index ? g.toNonIndexed() : g;
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', ni.getAttribute('position'));
      return out;
    });
    const merged = mergeGeometries(flat);
    geos.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ color: layerColor(palette, z, camera.distance), fog: false }));
    mesh.position.z = z;
    mesh.name = `layer-${spec.kind}-${li}`;
    group.add(mesh);
  });

  return { group, foreground, godRays };
}

function buildForeground(
  spec: LayerSpec,
  z: number,
  r: () => number,
  terrain: Terrain,
  camera: { distance: number; fov: number },
  out: ForegroundItem[],
  group: THREE.Group,
): void {
  // Density is per screen width at the play layer.
  const screen = 2 * halfViewWidth(0, camera.distance, camera.fov, 16 / 9);
  const spacing = screen / Math.max(spec.density, 0.01);
  const kinds = spec.props.filter((k): k is ForegroundKind => (FOREGROUND_KINDS as readonly string[]).includes(k));
  if (kinds.length === 0) return;
  for (let x = terrain.minX + spacing * 0.5 * r(); x < terrain.maxX; x += spacing * range(r, 0.6, 1.4)) {
    const kind = pick(r, kinds);
    const edge = FOREGROUND_EDGE[kind];
    const [w, h] = foregroundPlaneSize(kind);
    const geo = new THREE.PlaneGeometry(w, h);
    // Pivot at the attached edge so sway rotates around it.
    geo.translate(0, edge === 'top' ? -h / 2 : h / 2, 0);
    const mat = new THREE.MeshBasicMaterial({
      map: foregroundTexture(kind, Math.floor(r() * 3)),
      transparent: true,
      depthWrite: false,
      fog: false,
      color: 0x050505,
    });
    const mesh = new THREE.Mesh(geo, mat);
    // Lines of sight meet at the camera, so a prop at world x crosses the child's
    // screen position when the child is near x, whatever its depth.
    const wx = x + (r() - 0.5) * 1.5;
    const ground = terrain.heightAt(x);
    mesh.position.set(wx, edge === 'top' ? ground + 3.9 + r() * 0.4 : ground - 0.55 - r() * 0.15, z);
    if (r() < 0.5) mesh.scale.x = -1;
    mesh.renderOrder = 10;
    group.add(mesh);
    out.push({ mesh, edge, phase: r() * Math.PI * 2 });
  }
}

/** Gentle wind sway for foreground props. */
export function swayForeground(items: ForegroundItem[], time: number, wind: number): void {
  for (const it of items) {
    const amp = (it.edge === 'top' ? 0.05 : 0.035) * (0.3 + wind);
    it.mesh.rotation.z = Math.sin(time * (0.9 + wind) + it.phase) * amp + Math.sin(time * 2.3 + it.phase * 1.7) * amp * 0.3;
  }
}
