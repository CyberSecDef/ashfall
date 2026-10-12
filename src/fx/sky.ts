// Sky: a camera-attached backdrop with a vertical gradient, a faint moon or
// sun, and slow-moving bomb-scar clouds. It scrolls at ~0.05 of the play
// layer by offsetting its pattern with the camera's x.

import * as THREE from 'three';
import type { Palette } from '../levels/types';

const frag = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform float uTime;
  uniform float uScroll;
  uniform float uFlash;
  uniform vec2 uMoon;
  uniform float uAspect;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    // Broad horizon glow through the lower two thirds; only the top darkens to uTop.
    float h = smoothstep(0.5, 1.05, uv.y);
    vec3 col = mix(uHorizon, uTop, h);

    vec2 p = vec2((uv.x - 0.5) * uAspect + uScroll, uv.y);

    // Faint moon or hazy sun, glowing through the murk.
    vec2 m = vec2((uMoon.x - 0.5) * uAspect + uScroll * 0.6, uMoon.y);
    float d = distance(p, m);
    col += vec3(0.75, 0.78, 0.74) * (smoothstep(0.045, 0.038, d) * 0.22 + exp(-d * 9.0) * 0.07);

    // Bomb-scar clouds: dark, smeared bands that drift slowly.
    vec2 cp = vec2(p.x * 1.6 + uTime * 0.004, p.y * 4.0);
    float c = fbm(cp * 1.4) * 0.65 + fbm(cp * 3.1 + 7.0) * 0.35;
    float band = smoothstep(0.35, 0.95, uv.y) * smoothstep(0.42, 0.75, c);
    col = mix(col, uTop * 0.55, band * 0.75);
    // Lighter undersides near the horizon.
    col += uHorizon * 0.08 * smoothstep(0.55, 0.8, c) * (1.0 - h);

    col += vec3(0.55, 0.58, 0.6) * uFlash * (0.4 + 0.6 * (1.0 - band));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * The sky is drawn into a small render target (a fraction of the screen
 * resolution) and upscaled: the clouds are soft, and per-pixel fractal noise
 * at full phone resolution was the single most expensive thing in the frame.
 */
export class Sky {
  readonly mesh: THREE.Mesh;
  private readonly mat: THREE.ShaderMaterial;
  private readonly target: THREE.WebGLRenderTarget;
  private readonly scene = new THREE.Scene();
  private readonly cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  /** Render-target size divisor (higher = cheaper, softer). Set by the quality tier. */
  downscale = 3;

  constructor(palette: Palette, camera: THREE.PerspectiveCamera) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = position.xy * 0.5 + 0.5;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: frag,
      depthWrite: false,
      depthTest: false,
      fog: false,
      uniforms: {
        uTop: { value: new THREE.Color(palette.sky) },
        uHorizon: { value: new THREE.Color(palette.fog) },
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uFlash: { value: 0 },
        uMoon: { value: new THREE.Vector2(0.72, 0.78) },
        uAspect: { value: 1 },
      },
    });
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const quad = new THREE.Mesh(tri, this.mat);
    quad.frustumCulled = false;
    this.scene.add(quad);

    this.target = new THREE.WebGLRenderTarget(64, 32, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ map: this.target.texture, depthWrite: false, depthTest: false, fog: false, toneMapped: false }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -100;
    // Lives just inside the far plane, sized to fill the view.
    camera.add(this.mesh);
  }

  setPalette(palette: Palette): void {
    (this.mat.uniforms.uTop.value as THREE.Color).set(palette.sky);
    (this.mat.uniforms.uHorizon.value as THREE.Color).set(palette.fog);
  }

  update(camera: THREE.PerspectiveCamera, time: number, flash: number): void {
    const dist = camera.far * 0.9;
    const h = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    this.mesh.position.set(0, 0, -dist);
    this.mesh.scale.set((h * camera.aspect) / 2, h / 2, 1);
    const u = this.mat.uniforms;
    u.uTime.value = time;
    u.uScroll.value = camera.position.x * 0.004;
    u.uFlash.value = flash;
    u.uAspect.value = camera.aspect;
  }

  /** Draw the sky into its small target. Call before rendering the scene. */
  render(renderer: THREE.WebGLRenderer): void {
    const buf = renderer.getDrawingBufferSize(new THREE.Vector2());
    const w = Math.max(16, Math.ceil(buf.x / this.downscale));
    const h = Math.max(8, Math.ceil(buf.y / this.downscale));
    if (this.target.width !== w || this.target.height !== h) this.target.setSize(w, h);
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(this.target);
    renderer.render(this.scene, this.cam);
    renderer.setRenderTarget(prev);
  }
}
