'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * ヒーローセクションから毎フレーム共有されるポインタ状態。
 * 座標は section 矩形に対する正規化値（0〜1、y は下向き）。
 */
export interface RipplePointer {
  x: number;
  y: number;
  /** 前回のシミュレーションフレーム以降にポインタが動いたか。 */
  moved: boolean;
  /** pointerdown 発生時に立てる。大きめのスプラッシュとして消費される。 */
  splash: boolean;
}

interface Props {
  pointer: RefObject<RipplePointer>;
  /** WebGL 水面が実際に描画されているかを親へ通知する。 */
  onActiveChange?: (active: boolean) => void;
  className?: string;
}

/** シミュレーション解像度の上限（最大辺）。波紋は低周波なので十分。 */
const SIM_MAX = 512;
/** 無操作時に小さな雨滴を落とす間隔。水面が生きている感を出す。 */
const AUTO_DROP_INTERVAL_MS = 2600;

/** gl_VertexID によるフルスクリーン三角形。頂点バッファ不要。 */
const VERT_SRC = `#version 300 es
out vec2 vUv;
void main() {
  vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = pos;
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}
`;

/**
 * 高さフィールドの波動伝播。r = 高さ, g = 速度。
 * 近傍4点ラプラシアンで伝播し、減衰で自然に静まる。
 */
const SIM_FRAG_SRC = `#version 300 es
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform float uAspect;
uniform vec3 uDrop;   // xy: uv 位置, z: 強さ（0 = なし）
uniform float uRadius;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec2 hv = texture(uPrev, vUv).rg;
  float sum = texture(uPrev, vUv + vec2(uTexel.x, 0.0)).r
            + texture(uPrev, vUv - vec2(uTexel.x, 0.0)).r
            + texture(uPrev, vUv + vec2(0.0, uTexel.y)).r
            + texture(uPrev, vUv - vec2(0.0, uTexel.y)).r;
  float vel = hv.g + (sum * 0.25 - hv.r) * 1.8;
  vel *= 0.986;
  float h = (hv.r + vel) * 0.999;
  if (uDrop.z != 0.0) {
    vec2 d = (vUv - uDrop.xy) * vec2(uAspect, 1.0);
    h += uDrop.z * exp(-dot(d, d) / (uRadius * uRadius));
  }
  outColor = vec4(h, vel, 0.0, 1.0);
}
`;

/**
 * 水面の描画。高さ勾配から法線を求め、ブランド配色のベースグラデを
 * 屈折させてスペキュラ／フレネルを加えることで「澄んだ透明な水」を表現する。
 * ベース色は lp-hero-gradient / lp-aurora の配色を踏襲。
 */
const RENDER_FRAG_SRC = `#version 300 es
precision highp float;
uniform sampler2D uSim;
uniform vec2 uTexel;
uniform float uAspect;
uniform float uTime;
in vec2 vUv;
out vec4 outColor;

float blob(vec2 p, vec2 c, float r) {
  vec2 d = p - c;
  return exp(-dot(d, d) / (r * r));
}

// lp-hero-gradient / lp-aurora を再現したブランドカラーの水底（uv 原点は左下）。
vec3 baseColor(vec2 uv) {
  vec2 p = vec2(uv.x * uAspect, uv.y);
  float t = uTime * 0.05;
  vec3 col = vec3(0.969, 0.976, 0.984);                                                // #f7f9fb
  col = mix(col, vec3(0.537, 0.961, 0.906),
            0.60 * blob(p, vec2(uAspect * (0.18 + 0.06 * sin(t)), 0.86), 0.55));       // #89f5e7
  col = mix(col, vec3(0.678, 0.776, 1.000),
            0.55 * blob(p, vec2(uAspect * (0.84 + 0.05 * cos(t * 1.3)), 0.76), 0.60)); // #adc6ff
  col = mix(col, vec3(0.000, 0.514, 0.471),
            0.28 * blob(p, vec2(uAspect * 0.62, 0.12 + 0.05 * sin(t * 0.8)), 0.55));   // #008378
  col = mix(col, vec3(0.000, 0.345, 0.745),
            0.20 * blob(p, vec2(uAspect * 0.12, 0.20 + 0.04 * cos(t)), 0.50));         // #0058be
  return col;
}

void main() {
  float hl = texture(uSim, vUv - vec2(uTexel.x, 0.0)).r;
  float hr = texture(uSim, vUv + vec2(uTexel.x, 0.0)).r;
  float hb = texture(uSim, vUv - vec2(0.0, uTexel.y)).r;
  float ht = texture(uSim, vUv + vec2(0.0, uTexel.y)).r;
  vec2 grad = vec2(hr - hl, ht - hb);

  vec3 col = baseColor(vUv - grad * 1.2);                  // 屈折
  vec3 n = normalize(vec3(-grad * 12.0, 1.0));
  vec3 lightDir = normalize(vec3(-0.35, 0.55, 0.75));
  float spec = pow(max(dot(reflect(-lightDir, n), vec3(0.0, 0.0, 1.0)), 0.0), 120.0);
  float fresnel = pow(1.0 - n.z, 1.5);
  // 平水面（dot ≒ 0.755）からの差分で波面に明暗をつける。
  col += (dot(n, lightDir) - 0.755) * 1.4;
  col += spec * 0.9;                                       // 波頭のきらめき
  col = mix(col, vec3(0.42, 0.85, 0.80), fresnel * 0.5);   // 斜面のアクア色
  outColor = vec4(col, 1.0);
}
`;

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('WaterRippleCanvas shader error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function linkProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string
): WebGLProgram | null {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('WaterRippleCanvas link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/**
 * ヒーロー背景のインタラクティブ水面（依存ゼロの生 WebGL2 実装）。
 *
 * RG16F の ping-pong レンダーターゲット2枚で高さフィールドを保持し、
 * ポインタ移動／タップをガウス型ドロップとして注入する。
 * WebGL2 や浮動小数レンダーターゲットが使えない環境では何も描画せず、
 * 親側の CSS フォールバック（lp-hero-gradient / lp-aurora）に任せる。
 */
export function WaterRippleCanvas({ pointer, onActiveChange, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });
    if (!gl) return;
    // RG16F への描画に必須。ほぼ全ての WebGL2 環境で利用可能。
    if (!gl.getExtension('EXT_color_buffer_float')) return;

    const simProg = linkProgram(gl, VERT_SRC, SIM_FRAG_SRC);
    const renderProg = linkProgram(gl, VERT_SRC, RENDER_FRAG_SRC);
    if (!simProg || !renderProg) {
      if (simProg) gl.deleteProgram(simProg);
      if (renderProg) gl.deleteProgram(renderProg);
      return;
    }

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const simU = {
      prev: gl.getUniformLocation(simProg, 'uPrev'),
      texel: gl.getUniformLocation(simProg, 'uTexel'),
      aspect: gl.getUniformLocation(simProg, 'uAspect'),
      drop: gl.getUniformLocation(simProg, 'uDrop'),
      radius: gl.getUniformLocation(simProg, 'uRadius'),
    };
    const renderU = {
      sim: gl.getUniformLocation(renderProg, 'uSim'),
      texel: gl.getUniformLocation(renderProg, 'uTexel'),
      aspect: gl.getUniformLocation(renderProg, 'uAspect'),
      time: gl.getUniformLocation(renderProg, 'uTime'),
    };

    const tex: WebGLTexture[] = [];
    const fb: WebGLFramebuffer[] = [];
    let simW = 0;
    let simH = 0;
    let read = 0;
    let rafId = 0;
    let inView = true;
    let disposed = false;
    let active = false;
    let lastAuto = -Infinity;
    const last = { x: 0.5, y: 0.5 };

    const fail = () => {
      disposed = true;
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      onActiveChange?.(false);
    };

    /** ping-pong ターゲットを（再）生成する。リサイズ時は波面をリセット。 */
    const createTargets = () => {
      for (const t of tex.splice(0)) gl.deleteTexture(t);
      for (const f of fb.splice(0)) gl.deleteFramebuffer(f);
      for (let i = 0; i < 2; i++) {
        const t = gl.createTexture();
        const f = gl.createFramebuffer();
        if (!t || !f) return fail();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, simW, simH, 0, gl.RG, gl.HALF_FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
          gl.deleteTexture(t);
          gl.deleteFramebuffer(f);
          return fail();
        }
        tex.push(t);
        fb.push(f);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      read = 0;
      if (!active) {
        active = true;
        onActiveChange?.(true);
      }
    };

    const resize = () => {
      if (disposed) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);
      if (canvas.width === bw && canvas.height === bh && tex.length === 2) return;
      canvas.width = bw;
      canvas.height = bh;
      const s = Math.min(1, SIM_MAX / Math.max(bw, bh));
      simW = Math.max(64, Math.round(bw * s));
      simH = Math.max(64, Math.round(bh * s));
      createTargets();
    };

    const frame = (tMs: number) => {
      rafId = requestAnimationFrame(frame);
      if (tex.length < 2) return;

      // このフレームで注入するドロップをポインタ状態から決める。
      const p = pointer.current;
      let dropX = 0;
      let dropY = 0;
      let strength = 0;
      let radius = 0.03;
      if (p.moved || p.splash) {
        const dist = Math.hypot(p.x - last.x, p.y - last.y);
        last.x = p.x;
        last.y = p.y;
        dropX = p.x;
        dropY = 1 - p.y; // GL の uv 原点は左下
        if (p.splash) {
          strength = 0.5;
          radius = 0.045;
        } else if (dist > 0.0004) {
          // 移動速度に比例した強さで、軌跡が連続した波紋になる。
          strength = Math.min(0.25, 0.012 + dist * 2.2);
        }
        p.moved = false;
        p.splash = false;
        if (strength > 0) lastAuto = tMs;
      } else if (tMs - lastAuto > AUTO_DROP_INTERVAL_MS) {
        lastAuto = tMs;
        dropX = 0.15 + Math.random() * 0.7;
        dropY = 0.25 + Math.random() * 0.55;
        strength = 0.16;
        radius = 0.05;
      }

      // 伝播を機敏にするため毎フレーム2ステップ進める。
      gl.useProgram(simProg);
      gl.viewport(0, 0, simW, simH);
      gl.uniform1i(simU.prev, 0);
      gl.uniform2f(simU.texel, 1 / simW, 1 / simH);
      gl.uniform1f(simU.aspect, simW / simH);
      gl.uniform1f(simU.radius, radius);
      for (let i = 0; i < 2; i++) {
        const write = 1 - read;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb[write]);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex[read]);
        gl.uniform3f(simU.drop, dropX, dropY, i === 0 ? strength : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        read = write;
      }

      // 水面を画面へ合成。
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(renderProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex[read]);
      gl.uniform1i(renderU.sim, 0);
      gl.uniform2f(renderU.texel, 1 / simW, 1 / simH);
      gl.uniform1f(renderU.aspect, canvas.width / canvas.height);
      gl.uniform1f(renderU.time, tMs / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    /** 画面外・非表示タブでは RAF を完全に止める。 */
    const updateRunning = () => {
      const shouldRun = !disposed && inView && !document.hidden;
      if (shouldRun && rafId === 0) rafId = requestAnimationFrame(frame);
      if (!shouldRun && rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateRunning();
    });
    io.observe(canvas);
    const onVisibility = () => updateRunning();
    document.addEventListener('visibilitychange', onVisibility);
    const onContextLost = () => fail();
    canvas.addEventListener('webglcontextlost', onContextLost);

    updateRunning();

    return () => {
      disposed = true;
      if (rafId !== 0) cancelAnimationFrame(rafId);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      for (const t of tex) gl.deleteTexture(t);
      for (const f of fb) gl.deleteFramebuffer(f);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(simProg);
      gl.deleteProgram(renderProg);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [pointer, onActiveChange]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
