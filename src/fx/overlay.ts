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

const vignetteFrag = /* glsl */ `
  uniform float uAspect;
  uniform float uStrength;
  uniform float uFade;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float d = length(p) / length(vec2(uAspect, 1.0) * 0.5);
    float a = smoothstep(0.45, 1.05, d) * uStrength;
    // Fade to black (level changes, respawns) rides on the same pass.
    gl_FragColor = vec4(0.0, 0.0, 0.0, max(a, uFade));
  }
`;

const grainFrag = /* glsl */ `
  uniform float uTime;
  uniform float uAmount;
  uniform vec2 uRes;
  varying vec2 vUv;
  float hash(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  void main() {
    // Grain cells of ~1.5 CSS px, re-rolled every frame.
    vec2 cell = floor(vUv * uRes / 1.5);
    float n = hash(vec3(cell, floor(uTime * 24.0)));
    gl_FragColor = vec4(vec3(n), uAmount);
  }
`;

const flashFrag = /* glsl */ `
  uniform float uFlash;
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4(vec3(0.62, 0.65, 0.68) * uFlash * (0.6 + 0.4 * vUv.y), 1.0);
  }
`;

function fullscreen(frag: string, uniforms: Record<string, THREE.IUniform>, blending: THREE.Blending): THREE.Mesh {
  const geo = new THREE.BufferGeometry();
  // One oversized triangle covers the screen.
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

export class Overlay {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  /** Extra darkening and grain the game can push (radiation, tension). 0 = normal. */
  intensity = 0;
  /** Black fade, 0 (clear) to 1 (black). */
  fade = 0;

  private readonly vignette = { uAspect: { value: 1 }, uStrength: { value: 0.75 }, uFade: { value: 0 } };
  private readonly grain = { uTime: { value: 0 }, uAmount: { value: 0.07 }, uRes: { value: new THREE.Vector2(1, 1) } };
  private readonly flash = { uFlash: { value: 0 } };

  constructor() {
    this.scene.add(
      fullscreen(vignetteFrag, this.vignette, THREE.NormalBlending),
      fullscreen(grainFrag, this.grain, THREE.NormalBlending),
      fullscreen(flashFrag, this.flash, THREE.AdditiveBlending),
    );
  }

  update(time: number, width: number, height: number, flash: number): void {
    this.vignette.uAspect.value = width / height;
    this.vignette.uStrength.value = 0.75 + this.intensity * 0.2;
    this.vignette.uFade.value = this.fade;
    this.grain.uTime.value = time;
    this.grain.uRes.value.set(width, height);
    this.grain.uAmount.value = 0.065 + this.intensity * 0.12;
    this.flash.uFlash.value = flash * 0.35;
  }

  render(renderer: THREE.WebGLRenderer): void {
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(this.scene, this.camera);
    renderer.autoClear = auto;
  }
}
