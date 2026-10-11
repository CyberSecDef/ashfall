// The blue scarf: a short verlet chain pinned at the child's neck. It trails
// behind movement, sags at rest, and flutters with wind and gusts. Pure
// simulation, so tests can check it; child.ts turns it into a ribbon mesh.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const SCARF = {
  segments: 9,
  segmentLength: 0.068,
  /** Lighter-than-real gravity keeps the cloth floaty. */
  gravity: 5.5,
  damping: 0.94,
  iterations: 5,
  /** Wind push at strength 1, in m/s^2. */
  windForce: 9,
};

export class Scarf {
  readonly points: Vec3[];
  private readonly prev: Vec3[];
  private time = 0;

  constructor(anchor: Vec3) {
    this.points = [];
    this.prev = [];
    for (let i = 0; i <= SCARF.segments; i++) {
      const p = { x: anchor.x - i * SCARF.segmentLength, y: anchor.y, z: anchor.z };
      this.points.push(p);
      this.prev.push({ ...p });
    }
  }

  /**
   * Step the cloth. `wind` is 0 to 1 and blows west (against the walking
   * direction), so walking east into it streams the scarf back.
   */
  update(anchor: Vec3, dt: number, wind: number): void {
    this.time += dt;
    const t = this.time;
    const pts = this.points;
    const prev = this.prev;
    const n = pts.length;
    const gust = 0.6 + 0.4 * Math.sin(t * 0.7) * Math.sin(t * 1.9 + 1.3);
    const dt2 = dt * dt;

    for (let i = 1; i < n; i++) {
      const p = pts[i];
      const q = prev[i];
      const vx = (p.x - q.x) * SCARF.damping;
      const vy = (p.y - q.y) * SCARF.damping;
      const vz = (p.z - q.z) * SCARF.damping;
      q.x = p.x;
      q.y = p.y;
      q.z = p.z;
      // Flutter grows toward the free end.
      const tip = i / (n - 1);
      const flutter = Math.sin(t * 11 + i * 0.9) * 2.2 + Math.sin(t * 17.3 + i * 1.7) * 1.1;
      const ax = -SCARF.windForce * wind * gust;
      const ay = -SCARF.gravity + flutter * (0.4 + wind) * tip;
      const az = Math.sin(t * 6.1 + i * 1.3) * 1.4 * (0.3 + wind) * tip;
      p.x += vx + ax * dt2;
      p.y += vy + ay * dt2;
      p.z += vz + az * dt2;
    }

    pts[0].x = anchor.x;
    pts[0].y = anchor.y;
    pts[0].z = anchor.z;
    prev[0].x = anchor.x;
    prev[0].y = anchor.y;
    prev[0].z = anchor.z;

    for (let k = 0; k < SCARF.iterations; k++) {
      for (let i = 0; i < n - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dy, dz) || 1e-6;
        const diff = (d - SCARF.segmentLength) / d;
        if (i === 0) {
          b.x -= dx * diff;
          b.y -= dy * diff;
          b.z -= dz * diff;
        } else {
          a.x += dx * diff * 0.5;
          a.y += dy * diff * 0.5;
          a.z += dz * diff * 0.5;
          b.x -= dx * diff * 0.5;
          b.y -= dy * diff * 0.5;
          b.z -= dz * diff * 0.5;
        }
      }
    }
  }

  /** Teleport (respawn, level load) without the cloth whipping across the screen. */
  reset(anchor: Vec3): void {
    for (let i = 0; i < this.points.length; i++) {
      const p = { x: anchor.x - i * SCARF.segmentLength, y: anchor.y - i * 0.01, z: anchor.z };
      Object.assign(this.points[i], p);
      Object.assign(this.prev[i], p);
    }
  }
}
