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
  /** 波打たせる背景画像の URL（object-fit: cover 相当で描画）。 */
  imageSrc: string;
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
 * 水面の描画。背景の水面写真テクスチャを高さ勾配で屈折させ、波頭の
 * スペキュラと斜面の陰影を重ねることで「写真の水面が実際に波打つ」表現にする。
 * フラット（無波）時は元写真とほぼ同一に見える。
 */
const RENDER_FRAG_SRC = `#version 300 es
precision highp float;
uniform sampler2D uSim;
uniform sampler2D uImage;
uniform vec2 uTexel;
uniform vec2 uResolution; // 表示キャンバスの px サイズ
uniform vec2 uImageSize;  // 画像の自然 px サイズ
in vec2 vUv;
out vec4 outColor;

// object-fit: cover 相当の UV 変換（中央クロップ）。
vec2 coverUv(vec2 uv) {
  float canvasAspect = uResolution.x / uResolution.y;
  float imgAspect = uImageSize.x / uImageSize.y;
  vec2 scale = canvasAspect > imgAspect
    ? vec2(1.0, imgAspect / canvasAspect)
    : vec2(canvasAspect / imgAspect, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  float hl = texture(uSim, vUv - vec2(uTexel.x, 0.0)).r;
  float hr = texture(uSim, vUv + vec2(uTexel.x, 0.0)).r;
  float hb = texture(uSim, vUv - vec2(0.0, uTexel.y)).r;
  float ht = texture(uSim, vUv + vec2(0.0, uTexel.y)).r;
  vec2 grad = vec2(hr - hl, ht - hb);

  // 高さ勾配で写真を屈折させてサンプリング。
  vec2 uv = coverUv(vUv) - grad * 0.9;
  vec3 col = texture(uImage, uv).rgb;

  vec3 n = normalize(vec3(-grad * 10.0, 1.0));
  vec3 lightDir = normalize(vec3(-0.35, 0.55, 0.75));
  float spec = pow(max(dot(reflect(-lightDir, n), vec3(0.0, 0.0, 1.0)), 0.0), 120.0);
  // 平水面（dot ≒ 0.755）からの差分で波面に控えめな明暗をつける。
  col += (dot(n, lightDir) - 0.755) * 0.9;
  col += spec * 0.7;                       // 波頭のきらめき
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
    console.error(
      'WaterRippleCanvas shader error:',
      gl.getShaderInfoLog(shader)
    );
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
    console.error(
      'WaterRippleCanvas link error:',
      gl.getProgramInfoLog(program)
    );
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/**
 * ヒーロー背景のインタラクティブ水面（依存ゼロの生 WebGL2 実装）。
 *
 * RG16F の ping-pong レンダーターゲット2枚で高さフィールドを保持し、
 * ポインタ移動／タップをガウス型ドロップとして注入、その勾配で背景写真
 * （imageSrc）を屈折させて「写真の水面が波打つ」表現にする。
 * WebGL2 や浮動小数レンダーターゲットが使えない環境では何も描画せず、
 * 親側に置いた静的 <img> フォールバックに任せる。
 */
export function WaterRippleCanvas({
  pointer,
  imageSrc,
  onActiveChange,
  className,
}: Props) {
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
      image: gl.getUniformLocation(renderProg, 'uImage'),
      texel: gl.getUniformLocation(renderProg, 'uTexel'),
      resolution: gl.getUniformLocation(renderProg, 'uResolution'),
      imageSize: gl.getUniformLocation(renderProg, 'uImageSize'),
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

    // 背景写真テクスチャ。読み込み完了まで描画は開始しない。
    let imageTex: WebGLTexture | null = null;
    let imageW = 1;
    let imageH = 1;
    const image = new Image();
    image.crossOrigin = 'anonymous';

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
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RG16F,
          simW,
          simH,
          0,
          gl.RG,
          gl.HALF_FLOAT,
          null
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          t,
          0
        );
        if (
          gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE
        ) {
          gl.deleteTexture(t);
          gl.deleteFramebuffer(f);
          return fail();
        }
        tex.push(t);
        fb.push(f);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      read = 0;
      maybeActivate();
    };

    // ping-pong ターゲットと背景写真の両方が揃って初めて描画開始を通知する。
    const maybeActivate = () => {
      if (active || disposed || tex.length < 2 || !imageTex) return;
      active = true;
      onActiveChange?.(true);
    };

    image.onload = () => {
      if (disposed) return;
      imageW = image.naturalWidth || 1;
      imageH = image.naturalHeight || 1;
      imageTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, imageTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      maybeActivate();
    };
    image.onerror = () => fail();
    image.src = imageSrc;

    const resize = () => {
      if (disposed) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);
      if (canvas.width === bw && canvas.height === bh && tex.length === 2)
        return;
      canvas.width = bw;
      canvas.height = bh;
      const s = Math.min(1, SIM_MAX / Math.max(bw, bh));
      simW = Math.max(64, Math.round(bw * s));
      simH = Math.max(64, Math.round(bh * s));
      createTargets();
    };

    const frame = (tMs: number) => {
      rafId = requestAnimationFrame(frame);
      if (tex.length < 2 || !imageTex) return;

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

      // 波打った写真を画面へ合成。
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(renderProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex[read]);
      gl.uniform1i(renderU.sim, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, imageTex);
      gl.uniform1i(renderU.image, 1);
      gl.uniform2f(renderU.texel, 1 / simW, 1 / simH);
      gl.uniform2f(renderU.resolution, canvas.width, canvas.height);
      gl.uniform2f(renderU.imageSize, imageW, imageH);
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
      image.onload = null;
      image.onerror = null;
      if (imageTex) gl.deleteTexture(imageTex);
      for (const t of tex) gl.deleteTexture(t);
      for (const f of fb) gl.deleteFramebuffer(f);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(simProg);
      gl.deleteProgram(renderProg);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [pointer, imageSrc, onActiveChange]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
