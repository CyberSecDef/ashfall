// Screen-space finishing: soft vignette, animated film grain, and the white
// lift of a distant flash. Drawn after the scene as full-screen triangles (no
// render targets), which keeps it cheap on phones.

import * as THREE from 'three';

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// One full-screen pass for all finishing, with premultiplied blending:
//   result = scene * (1 - a) + rgb
// `a` darkens (vignette, fade to black, the dark half of the grain); `rgb`
// lightens (the light half of the grain, and the white of a flash).
const frag = /* glsl */ `
  uniform float uAspect;
  uniform float uStrength;
  uniform float uFade;
  uniform float uTime;
  uniform float uGrain;
  uniform vec2 uRes;
  uniform float uFlash;
  varying vec2 vUv;
  float hash(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float d = length(p) / length(vec2(uAspect, 1.0) * 0.5);
    float vig = smoothstep(0.45, 1.05, d) * uStrength;
    float dark = max(vig, uFade);
    // Grain cells of ~1.5 CSS px, re-rolled 24 times a second.
    vec2 cell = floor(vUv * uRes / 1.5);
    float n = hash(vec3(cell, floor(uTime * 24.0))) - 0.5;
    float grainDark = max(0.0, -n) * 2.0 * uGrain;
    float grainLight = max(0.0, n) * 2.0 * uGrain * 0.55;
    float a = clamp(dark + grainDark * (1.0 - dark), 0.0, 1.0);
    vec3 flash = vec3(0.62, 0.65, 0.68) * uFlash * (0.6 + 0.4 * vUv.y);
    vec3 rgb = (vec3(grainLight) + flash) * (1.0 - uFade);
    gl_FragColor = vec4(rgb, a);
  }
`;

export class Overlay {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  /** Extra darkening and grain the game can push (radiation, tension). 0 = normal. */
  intensity = 0;
  /** Black fade, 0 (clear) to 1 (black). */
  fade = 0;
  /** Grain strength multiplier (quality tiers may lower it). */
  grainScale = 1;

  private readonly uniforms = {
    uAspect: { value: 1 },
    uStrength: { value: 0.75 },
    uFade: { value: 0 },
    uTime: { value: 0 },
    uGrain: { value: 0.07 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uFlash: { value: 0 },
  };

  constructor() {
    const geo = new THREE.BufferGeometry();
    // One oversized triangle covers the screen.
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: this.uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  update(time: number, width: number, height: number, flash: number): void {
    const u = this.uniforms;
    u.uAspect.value = width / height;
    u.uStrength.value = 0.75 + this.intensity * 0.2;
    u.uFade.value = this.fade;
    u.uTime.value = time;
    u.uRes.value.set(width, height);
    u.uGrain.value = (0.065 + this.intensity * 0.12) * this.grainScale;
    u.uFlash.value = flash * 0.35;
  }

  render(renderer: THREE.WebGLRenderer): void {
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(this.scene, this.camera);
    renderer.autoClear = auto;
  }
}
