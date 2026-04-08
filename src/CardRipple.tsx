




import { useRef, useEffect } from "react";
import { useReducedMotion } from "framer-motion";

const MAX_RIPPLES = 4;


const VERT = `
  attribute vec2 a_pos;
  attribute vec2 a_uv;
  varying   vec2 vUv;
  void main() {
    vUv         = a_uv;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;



const FRAG = `
  precision highp float;

  uniform float u_time;
  uniform vec2  u_ripplePositions[${MAX_RIPPLES}];
  uniform float u_rippleStartTimes[${MAX_RIPPLES}];
  uniform int   u_rippleCount;
  uniform float u_frequency;
  uniform float u_speed;
  uniform float u_easeK;
  uniform float u_fadeRate;
  uniform float u_glowGain;
  uniform float u_aspect;
  uniform vec3  u_glowColor;

  varying vec2 vUv;

  void main() {
    vec2  uv   = vUv;
    float glow = 0.0;

    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
      if (i >= u_rippleCount) break;

      float age = u_time - u_rippleStartTimes[i];
      if (age < 0.0) continue;

      vec2  center     = u_ripplePositions[i];
      vec2  diff       = uv - center;

      /* Aspect-correct diff so rings are circular in screen space */
      vec2  screenDiff = vec2(diff.x * u_aspect, diff.y);
      float dist       = length(screenDiff);
      if (dist < 0.001) continue;

      float waveRadius = u_speed * (1.0 - exp(-u_easeK * age));
      float waveDist   = dist - waveRadius;
      float fade       = exp(-age * u_fadeRate);

      /* Very thick ring — wide halfThick + ±4.0× smoothstep so it's a
       * massive soft wash of color, not a defined ring edge. */
      float halfThick = 0.42;
      float band = smoothstep(-halfThick * 4.0, -halfThick * 0.3, waveDist)
                 * (1.0 - smoothstep(halfThick * 0.3, halfThick * 4.0, waveDist));

      /* Very light vibration — barely perceptible shimmer, not electric. */
      float angle = atan(diff.y, diff.x * u_aspect);
      float v1 = sin(dist * u_frequency - u_time * 6.0);
      float v2 = sin(dist * u_frequency * 0.55 + angle * 3.0 - u_time * 4.0) * 0.4;
      float vibration = (v1 + v2) * 0.10;

      float core    = 1.0 - smoothstep(0.0, halfThick * 0.6, abs(waveDist));
      core          = core * core * 0.18;
      float glowMod = abs(vibration) * 0.2 + 0.75;

      glow += (band * glowMod * 0.70 + core) * fade;
    }

    float g = clamp(glow * u_glowGain, 0.0, 1.0);
    /* Non-premultiplied: color and alpha are separate.
     * Blend func SRC_ALPHA/ONE_MINUS_SRC_ALPHA computes:
     *   result = g × glowColor + (1-g) × background
     * Outputting vec4(glowColor * g, g) would square g → dark. */
    gl_FragColor = vec4(u_glowColor, g);
  }
`;


function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s) ?? "shader error");
  return s;
}

function hexToGlowRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}


export interface RippleTrigger {
  x:   number;  
  y:   number;  
  key: number;  
}

interface Ripple { x: number; y: number; startTime: number; }

export function CardRipple({
  trigger,
  glowColor = "#E3F7EC",  
}: {
  trigger:    RippleTrigger;
  glowColor?: string;
}) {
  const reduced      = useReducedMotion();
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const glowRgbRef   = useRef<[number, number, number]>(hexToGlowRgb(glowColor));
  const pendingRef   = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef     = useRef(0);
  const ripplesRef   = useRef<Ripple[]>([]);
  const runningRef   = useRef(false);

  useEffect(() => { glowRgbRef.current = hexToGlowRgb(glowColor); }, [glowColor]);

  
  useEffect(() => {
    if (trigger.key > 0) pendingRef.current = { x: trigger.x, y: trigger.y };
  }, [trigger.key, trigger.x, trigger.y]);

  
  useEffect(() => {
    if (reduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    
    const setSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    setSize();

    const gl = canvas.getContext("webgl", {
      antialias:         true,
      alpha:             true,
      premultipliedAlpha: false,
    });
    if (!gl) return;

    gl.viewport(0, 0, canvas.width, canvas.height);
    

    
    const vert = compileShader(gl, gl.VERTEX_SHADER,   VERT);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(prog) ?? "link error");
    gl.useProgram(prog);

    
    const quadVerts = new Float32Array([
      -1, -1,  0, 0,
       1, -1,  1, 0,
      -1,  1,  0, 1,
       1,  1,  1, 1,
    ]);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(prog, "a_pos");
    const aUv  = gl.getAttribLocation(prog, "a_uv");
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(aUv,  2, gl.FLOAT, false, 16, 8);

    
    const uTime      = gl.getUniformLocation(prog, "u_time");
    const uPositions = gl.getUniformLocation(prog, "u_ripplePositions");
    const uTimes     = gl.getUniformLocation(prog, "u_rippleStartTimes");
    const uCount     = gl.getUniformLocation(prog, "u_rippleCount");
    const uGlowColor = gl.getUniformLocation(prog, "u_glowColor");
    const uAspect    = gl.getUniformLocation(prog, "u_aspect");

    
    gl.uniform1f(gl.getUniformLocation(prog, "u_frequency"),  7.0);  
    gl.uniform1f(gl.getUniformLocation(prog, "u_speed"),      2.2);  
    gl.uniform1f(gl.getUniformLocation(prog, "u_easeK"),      1.6);  
    gl.uniform1f(gl.getUniformLocation(prog, "u_fadeRate"),   0.55); 
    gl.uniform1f(gl.getUniformLocation(prog, "u_glowGain"),   0.60);

    
    gl.uniform1f(uAspect, canvas.width / canvas.height);

    const posFlat = new Float32Array(MAX_RIPPLES * 2).fill(0.5);
    const timFlat = new Float32Array(MAX_RIPPLES).fill(-999);

    function stopLoop() {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
      runningRef.current = false;
      
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
    }

    function render(now: number) {
      const t = now / 1000;

      
      if (pendingRef.current) {
        const p = pendingRef.current;
        pendingRef.current = null;
        ripplesRef.current.push({ x: p.x, y: p.y, startTime: t });
        if (ripplesRef.current.length > MAX_RIPPLES) ripplesRef.current.shift();
      }

      
      ripplesRef.current = ripplesRef.current.filter(r => t - r.startTime < 3.5);

      if (ripplesRef.current.length === 0) { stopLoop(); return; }

      
      for (let i = 0; i < MAX_RIPPLES; i++) {
        if (i < ripplesRef.current.length) {
          posFlat[i * 2]     = ripplesRef.current[i].x;
          posFlat[i * 2 + 1] = 1.0 - ripplesRef.current[i].y; 
          timFlat[i]         = ripplesRef.current[i].startTime;
        } else {
          timFlat[i] = -999;
        }
      }

      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.uniform1f(uTime, t);
      gl!.uniform2fv(uPositions, posFlat);
      gl!.uniform1fv(uTimes, timFlat);
      gl!.uniform1i(uCount, ripplesRef.current.length);
      gl!.uniform3f(uGlowColor, ...glowRgbRef.current);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);

      rafIdRef.current = requestAnimationFrame(render);
    }

    
    function maybeStart() {
      if (!runningRef.current && ripplesRef.current.length > 0) {
        runningRef.current = true;
        rafIdRef.current   = requestAnimationFrame(render);
      }
    }

    
    const pollId = setInterval(() => {
      if (pendingRef.current && !runningRef.current) {
        runningRef.current = true;
        rafIdRef.current   = requestAnimationFrame(render);
      }
    }, 16);

    return () => {
      clearInterval(pollId);
      cancelAnimationFrame(rafIdRef.current);
      gl!.deleteBuffer(buf);
      gl!.deleteProgram(prog);
      gl!.deleteShader(vert);
      gl!.deleteShader(frag);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      "absolute",
        inset:         0,
        width:         "100%",
        height:        "100%",
        pointerEvents: "none",
        display:       "block",
      }}
    />
  );
}


export function computeRippleUV(
  e: React.MouseEvent,
  cardEl: HTMLElement | null,
): { x: number; y: number } | null {
  if (!cardEl) return null;
  const rect = cardEl.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left)  / rect.width,
    y: (e.clientY - rect.top)   / rect.height,
  };
}
