// Drifting ash. All motion runs in the vertex shader: each flake has a base
// position, fall speed and sway phase, and wraps inside a box that follows the
// camera, so there is no per-frame CPU work.

import * as THREE from 'three';

const vert = /* glsl */ `
  attribute vec4 aSeed; // fall speed, sway phase, size, brightness
  uniform float uTime;
  uniform vec3 uCenter;
  uniform vec3 uBox;
  uniform float uWind;
  uniform float uScale; // drawing-buffer pixels per meter at 1 m distance
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y -= uTime * aSeed.x;
    p.x -= uTime * uWind * (0.6 + aSeed.x);
    p.x += sin(uTime * 0.7 + aSeed.y) * 0.35;
    p.z += cos(uTime * 0.5 + aSeed.y * 1.3) * 0.2;
    // Wrap into the box around the camera's focus.
    p = uCenter + mod(p - uCenter + uBox * 0.5, uBox) - uBox * 0.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = aSeed.z * uScale / -mv.z;
    gl_PointSize = clamp(size, 1.0, 64.0);
    // Flakes very near the camera are big, blurred and faint; far ones fade into the fog.
    vAlpha = aSeed.w * smoothstep(0.6, 2.5, -mv.z) * (1.0 - smoothstep(25.0, 45.0, -mv.z));
  }
`;

const frag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uFlash;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor + uFlash * 0.4, a);
  }
`;

export class Ash {
  readonly points: THREE.Points;
  private readonly mat: THREE.ShaderMaterial;

  constructor(density: number, maxCount = 900) {
    const count = maxCount;
    const box = new THREE.Vector3(36, 18, 34);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * box.x;
      pos[i * 3 + 1] = (Math.random() - 0.5) * box.y;
      pos[i * 3 + 2] = (Math.random() - 0.5) * box.z;
      seed[i * 4] = 0.15 + Math.random() * 0.35;
      seed[i * 4 + 1] = Math.random() * Math.PI * 2;
      seed[i * 4 + 2] = 0.025 + Math.random() * 0.05; // flake size in meters
      seed[i * 4 + 3] = 0.25 + Math.random() * 0.45;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uCenter: { value: new THREE.Vector3() },
        uBox: { value: box },
        uWind: { value: 0.3 },
        uScale: { value: 500 },
        uColor: { value: new THREE.Color(0xb9bcb6) },
        uFlash: { value: 0 },
      },
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    this.setDensity(density);
  }

  /** `bufferHeight` is the drawing buffer height in pixels; `fov` the camera's vertical fov in degrees. */
  /** Show a fraction of the flakes (level ash density, quality tiers). */
  setDensity(density: number): void {
    const total = this.points.geometry.getAttribute('position').count;
    this.points.geometry.setDrawRange(0, Math.round(total * THREE.MathUtils.clamp(density, 0, 1)));
  }

  update(time: number, focus: THREE.Vector3, wind: number, bufferHeight: number, fov: number, flash: number): void {
    const u = this.mat.uniforms;
    u.uTime.value = time;
    // Box centered a bit in front of the play layer so flakes surround the camera's view.
    u.uCenter.value.set(focus.x, focus.y + 1.5, -6);
    u.uWind.value = 0.15 + wind * 0.9;
    u.uScale.value = bufferHeight / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
    u.uFlash.value = flash;
  }
}
