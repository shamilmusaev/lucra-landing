// Shared WebGL orb module (ported from the legacy module, index.html 4919–5277).
// `mountOrb(containerId, opts)` mounts an animated <canvas> into the given
// element (e.g. the hero's `#hero-orb` span or the CTA's `#cta-orb` span).
//
// The hero load-intro orchestrator (Hero.astro) calls the guarded
// `window.lucraOrbIntro()` / `window.lucraOrbPulse()` hooks. When mounted with
// `opts.registerGlobalPulse`/`opts.intro`, this module defines those exact
// hooks (behaviour identical to the legacy inline module).
import { Renderer, Program, Mesh, Triangle, Vec3 } from 'ogl';

export interface MountOpts {
  intro?: boolean;
  registerGlobalPulse?: boolean;
}

export function mountOrb(containerId: string, opts: MountOpts = {}): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  const COLOR_LIGHT = '#56B3EB'; // voiceOrbLight
  const COLOR_START = '#3B82F6'; // voiceOrbStart
  const COLOR_BRAND = '#3D506D'; // brand
  const HUE = 0;
  const BASE_ROTATION_SPEED = 0.3;

  const hexToVec3 = (hex: string): InstanceType<typeof Vec3> => {
    hex = hex.replace(/^#/, '');
    let r = 0, g = 0, b = 0;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) / 255;
      g = parseInt(hex[1] + hex[1], 16) / 255;
      b = parseInt(hex[2] + hex[2], 16) / 255;
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
    }
    return new Vec3(r, g, b);
  };

  const vertexShader = /* glsl */ `
    precision highp float;
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;

    uniform float iTime;
    uniform vec3 iResolution;
    uniform float hue;
    uniform float rot;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform float uPulse;   // click-ripple envelope (0..1, decays)
    uniform float uPulseT;  // seconds since the click (drives the wavefront)
    uniform float uIntro;   // load entrance 0..1 (orb grows + fades in)
    varying vec2 vUv;

    vec3 rgb2yiq(vec3 c) {
      float y = dot(c, vec3(0.299, 0.587, 0.114));
      float i = dot(c, vec3(0.596, -0.274, -0.322));
      float q = dot(c, vec3(0.211, -0.523, 0.312));
      return vec3(y, i, q);
    }

    vec3 yiq2rgb(vec3 c) {
      float r = c.x + 0.956 * c.y + 0.621 * c.z;
      float g = c.x - 0.272 * c.y - 0.647 * c.z;
      float b = c.x - 1.106 * c.y + 1.703 * c.z;
      return vec3(r, g, b);
    }

    vec3 adjustHue(vec3 color, float hueDeg) {
      float hueRad = hueDeg * 3.14159265 / 180.0;
      vec3 yiq = rgb2yiq(color);
      float cosA = cos(hueRad);
      float sinA = sin(hueRad);
      float i = yiq.y * cosA - yiq.z * sinA;
      float q = yiq.y * sinA + yiq.z * cosA;
      yiq.y = i;
      yiq.z = q;
      return yiq2rgb(yiq);
    }

    vec3 hash33(vec3 p3) {
      p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
      p3 += dot(p3, p3.yxz + 19.19);
      return -1.0 + 2.0 * fract(vec3(
        p3.x + p3.y,
        p3.x + p3.z,
        p3.y + p3.z
      ) * p3.zyx);
    }

    float snoise3(vec3 p) {
      const float K1 = 0.333333333;
      const float K2 = 0.166666667;
      vec3 i = floor(p + (p.x + p.y + p.z) * K1);
      vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
      vec3 e = step(vec3(0.0), d0 - d0.yzx);
      vec3 i1 = e * (1.0 - e.zxy);
      vec3 i2 = 1.0 - e.zxy * (1.0 - e);
      vec3 d1 = d0 - (i1 - K2);
      vec3 d2 = d0 - (i2 - K1);
      vec3 d3 = d0 - 0.5;
      vec4 h = max(0.6 - vec4(
        dot(d0, d0),
        dot(d1, d1),
        dot(d2, d2),
        dot(d3, d3)
      ), 0.0);
      vec4 n = h * h * h * h * vec4(
        dot(d0, hash33(i)),
        dot(d1, hash33(i + i1)),
        dot(d2, hash33(i + i2)),
        dot(d3, hash33(i + 1.0))
      );
      return dot(vec4(31.316), n);
    }

    vec4 extractAlpha(vec3 colorIn) {
      float a = max(max(colorIn.r, colorIn.g), colorIn.b);
      return vec4(colorIn.rgb / (a + 1e-5), a);
    }

    const float innerRadius = 0.6;
    const float noiseScale = 0.65;

    float light1(float intensity, float attenuation, float dist) {
      return intensity / (1.0 + dist * attenuation);
    }

    float light2(float intensity, float attenuation, float dist) {
      return intensity / (1.0 + dist * dist * attenuation);
    }

    vec4 draw(vec2 uv) {
      vec3 color1 = adjustHue(uColor1, hue);
      vec3 color2 = adjustHue(uColor2, hue);
      vec3 color3 = adjustHue(uColor3, hue);

      float ang = atan(uv.y, uv.x);
      float len = length(uv);
      float invLen = len > 0.0 ? 1.0 / len : 0.0;

      float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
      float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
      float d0 = distance(uv, (r0 * invLen) * uv);
      float v0 = light1(1.0, 10.0, d0);
      v0 *= smoothstep(r0 * 1.05, r0, len);
      float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;

      float a = iTime * -1.0;
      vec2 pos = vec2(cos(a), sin(a)) * r0;
      float d = distance(uv, pos);
      float v1 = light2(1.5, 5.0, d);
      v1 *= light1(1.0, 50.0, d0);

      float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
      float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);

      vec3 col = mix(color1, color2, cl);
      col = mix(color3, col, v0);
      col = (col + v1) * v2 * v3;
      col = clamp(col, 0.0, 1.0);

      return extractAlpha(col);
    }

    vec4 mainImage(vec2 fragCoord) {
      vec2 center = iResolution.xy * 0.5;
      float size = min(iResolution.x, iResolution.y);
      vec2 uv = (fragCoord - center) / size * 2.0;

      // Load entrance — grows small→normal, pops a touch BIGGER, then settles
      // back to normal (uIntro eases 0→~1.1→1; no clamp here so it can overshoot).
      uv /= mix(0.45, 1.0, uIntro);

      // Click ripple — a smooth concentric wave radiates from the centre and
      // travels out through the rim, with a gentle low-frequency undulation so
      // the orb breathes like water. Kept low-amplitude and coherent so the
      // shape stays round (no lumps), then settles as uPulse decays.
      if (uPulse > 0.001) {
        float L = length(uv);
        vec2 dir = L > 0.0001 ? uv / L : vec2(0.0);
        float front = uPulseT * 1.9;                        // wavefront travels outward
        float dd = L - front;
        float ripple = sin(dd * 15.0) * exp(-dd * dd * 8.0); // smooth crest at the front
        float undul = 0.32 * sin(L * 5.5 - uPulseT * 9.0);   // gentle global undulation
        float radial = (ripple + undul) * uPulse;
        uv += dir * radial * 0.13;
        uv += vec2(-dir.y, dir.x) * sin(L * 7.0 - uPulseT * 8.0) * uPulse * 0.03; // faint swirl
        uv *= (1.0 - uPulse * 0.04);                        // subtle swell
      }

      float angle = rot;
      float s = sin(angle);
      float c = cos(angle);
      uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

      return draw(uv);
    }

    void main() {
      vec2 fragCoord = vUv * iResolution.xy;
      vec4 col = mainImage(fragCoord);
      col.rgb *= 1.0 + uPulse * 0.18;   // subtle flash while it ripples
      col.a *= smoothstep(0.0, 1.0, uIntro);   // fade in on load
      gl_FragColor = vec4(col.rgb * col.a, col.a);
    }
  `;

  let renderer: InstanceType<typeof Renderer> | null = null;
  let program: InstanceType<typeof Program> | null = null;
  let rafId = 0;
  let resizeTimeoutId = 0;

  try {
    renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
      dpr: window.devicePixelRatio || 1,
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: new Vec3(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height),
        },
        hue: { value: HUE },
        rot: { value: 0 },
        uColor1: { value: hexToVec3(COLOR_LIGHT) },
        uColor2: { value: hexToVec3(COLOR_START) },
        uColor3: { value: hexToVec3(COLOR_BRAND) },
        uPulse: { value: 0 },
        uPulseT: { value: 0 },
        // Start hidden only if this instance arms a load-intro; otherwise fully visible.
        uIntro: { value: (opts.intro && document.documentElement.classList.contains('hero-intro')) ? 0 : 1 },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    const resize = (): void => {
      if (!container || !renderer) return;
      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width < 1 || height < 1) {
        resizeTimeoutId = window.setTimeout(resize, 100);
        return;
      }
      renderer.setSize(width * dpr, height * dpr);
      gl.canvas.style.width = width + 'px';
      gl.canvas.style.height = height + 'px';
      if (program) {
        program.uniforms.iResolution.value.set(
          gl.canvas.width,
          gl.canvas.height,
          gl.canvas.width / gl.canvas.height,
        );
      }
    };
    window.addEventListener('resize', resize);
    resize();

    let lastTime = 0;
    let currentRot = 0;
    let pulseStart = -1;
    let introStart = -1;
    const PULSE_DUR = 1.25; // seconds the ripple takes to travel + settle
    const INTRO_DUR = 0.8;  // seconds the orb takes to grow + fade in
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Instance-scoped ripple trigger (decoupled from any global).
    const pulse = function (): void {
      if (reduceMotion) return;
      pulseStart = lastTime * 0.001;
    };
    // Instance-scoped intro — the orb grows + fades in.
    const intro = function (): void {
      if (reduceMotion) { if (program) program.uniforms.uIntro.value = 1; return; }
      introStart = lastTime * 0.001;
    };

    if (opts.registerGlobalPulse) {
      // Hero orb wires into the shared fog-wipe orchestration.
      (window as any).lucraOrbPulse = pulse;   // fired from the fog-wipe script on orb click
      (window as any).lucraOrbIntro = intro;   // fired by the load-intro orchestrator
      // Watchdog: if the orchestrator never fires, the orb must still appear.
      setTimeout(function () {
        if (program && program.uniforms.uIntro.value < 1 && introStart < 0) {
          (window as any).lucraOrbIntro();
        }
      }, 2500);
    } else {
      // Secondary orbs (e.g. CTA): ripple on direct click, no global coupling.
      container.addEventListener('click', pulse);
    }

    const update = (time: number): void => {
      rafId = requestAnimationFrame(update);
      if (!program) return;
      const deltaTime = (time - lastTime) * 0.001;
      lastTime = time;
      const tSec = time * 0.001;
      program.uniforms.iTime.value = tSec;
      program.uniforms.hue.value = HUE;
      currentRot += deltaTime * BASE_ROTATION_SPEED;
      program.uniforms.rot.value = currentRot;

      // Load entrance: ease uIntro 0→1 (ease-out).
      if (introStart >= 0) {
        const ei = tSec - introStart;
        if (ei >= INTRO_DUR) { program.uniforms.uIntro.value = 1; introStart = -1; }
        else {
          const ki = ei / INTRO_DUR;            // ease-out-back: grows, pops a touch, settles
          const c1 = 2.2, c3 = c1 + 1, k1 = ki - 1;
          program.uniforms.uIntro.value = 1 + c3 * k1 * k1 * k1 + c1 * k1 * k1;
        }
      }

      // Click ripple: quick attack, smooth decay; uPulseT drives the wavefront.
      if (pulseStart >= 0) {
        const e = tSec - pulseStart;
        if (e >= PULSE_DUR) {
          pulseStart = -1;
          program.uniforms.uPulse.value = 0;
          program.uniforms.uPulseT.value = 0;
        } else {
          const k = e / PULSE_DUR;
          program.uniforms.uPulse.value = Math.pow(1 - k, 1.5) * Math.min(1, e / 0.06);
          program.uniforms.uPulseT.value = e;
        }
      }

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (renderer) renderer.render({ scene: mesh });
    };
    rafId = requestAnimationFrame(update);
    void rafId;
    void resizeTimeoutId;
  } catch (e) {
    console.warn('Orb failed to init:', e);
  }
}
