"use strict";

const TAU = Math.PI * 2;
const demos = [];
const demoMap = new Map();

const motionQuery =
  typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };
let prefersReducedMotion = motionQuery.matches;
if (typeof motionQuery.addEventListener === "function") {
  motionQuery.addEventListener("change", (event) => {
    prefersReducedMotion = event.matches;
    markAllDemosDirty();
  });
} else if (typeof motionQuery.addListener === "function") {
  motionQuery.addListener((event) => {
    prefersReducedMotion = event.matches;
    markAllDemosDirty();
  });
}

const vectorControls = {
  rotation: document.getElementById("vector-rotation"),
  scaleX: document.getElementById("vector-scale-x"),
  scaleY: document.getElementById("vector-scale-y"),
};

const spaceControls = {
  rotation: document.getElementById("space-rotation"),
};

const normalControls = {
  azimuth: document.getElementById("light-azimuth"),
  elevation: document.getElementById("light-elevation"),
  showNormals: document.getElementById("show-normals"),
};

const shaderControls = {
  amplitude: document.getElementById("shader-amplitude"),
  density: document.getElementById("shader-density"),
  shift: document.getElementById("shader-shift"),
};

const pipelineControls = {
  separation: document.getElementById("pipeline-separation"),
  spin: document.getElementById("pipeline-spin"),
  depth: document.getElementById("pipeline-depth"),
};

const projectionControls = {
  fov: document.getElementById("projection-fov"),
  distance: document.getElementById("projection-distance"),
  ortho: document.getElementById("projection-ortho"),
};

const textureControls = {
  scale: document.getElementById("texture-scale"),
  tilt: document.getElementById("texture-tilt"),
  linear: document.getElementById("texture-linear"),
};

const materialControls = {
  specular: document.getElementById("material-specular"),
  shininess: document.getElementById("material-shininess"),
  light: document.getElementById("material-light"),
};

const colorControls = {
  exposure: document.getElementById("color-exposure"),
  gamma: document.getElementById("color-gamma"),
  tonemap: document.getElementById("color-tonemap"),
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function vec3(x = 0, y = 0, z = 0) {
  return [x, y, z];
}

function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtract3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale3(v, scalar) {
  return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
}

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize3(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function mat4Identity() {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

function mat4Multiply(a, b) {
  const out = new Float32Array(16);

  const a00 = a[0];
  const a01 = a[1];
  const a02 = a[2];
  const a03 = a[3];
  const a10 = a[4];
  const a11 = a[5];
  const a12 = a[6];
  const a13 = a[7];
  const a20 = a[8];
  const a21 = a[9];
  const a22 = a[10];
  const a23 = a[11];
  const a30 = a[12];
  const a31 = a[13];
  const a32 = a[14];
  const a33 = a[15];

  const b00 = b[0];
  const b01 = b[1];
  const b02 = b[2];
  const b03 = b[3];
  const b10 = b[4];
  const b11 = b[5];
  const b12 = b[6];
  const b13 = b[7];
  const b20 = b[8];
  const b21 = b[9];
  const b22 = b[10];
  const b23 = b[11];
  const b30 = b[12];
  const b31 = b[13];
  const b32 = b[14];
  const b33 = b[15];

  out[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;

  out[4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;

  out[8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;

  out[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
  out[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
  out[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
  out[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;

  return out;
}

function mat4Translation(tx, ty, tz) {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    tx, ty, tz, 1,
  ]);
}

function mat4Scaling(sx, sy, sz) {
  return new Float32Array([
    sx, 0, 0, 0,
    0, sy, 0, 0,
    0, 0, sz, 0,
    0, 0, 0, 1,
  ]);
}

function mat4RotationX(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1,
  ]);
}

function mat4RotationY(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1,
  ]);
}

function mat4RotationZ(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

function mat4Perspective(fieldOfView, aspect, near, far) {
  const f = 1 / Math.tan(fieldOfView / 2);
  const rangeInv = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0,
  ]);
}

function mat4Orthographic(left, right, bottom, top, near, far) {
  return new Float32Array([
    2 / (right - left), 0, 0, 0,
    0, 2 / (top - bottom), 0, 0,
    0, 0, 2 / (near - far), 0,
    (left + right) / (left - right),
    (bottom + top) / (bottom - top),
    (near + far) / (near - far),
    1,
  ]);
}

function mat4LookAt(eye, target, up) {
  const zAxis = normalize3(subtract3(eye, target));
  const xAxis = normalize3(cross3(up, zAxis));
  const yAxis = cross3(zAxis, xAxis);

  return new Float32Array([
    xAxis[0], yAxis[0], zAxis[0], 0,
    xAxis[1], yAxis[1], zAxis[1], 0,
    xAxis[2], yAxis[2], zAxis[2], 0,
    -dot3(xAxis, eye), -dot3(yAxis, eye), -dot3(zAxis, eye), 1,
  ]);
}

function upperLeftMat3(matrix) {
  return new Float32Array([
    matrix[0], matrix[1], matrix[2],
    matrix[4], matrix[5], matrix[6],
    matrix[8], matrix[9], matrix[10],
  ]);
}

function transformPoint(matrix, point) {
  const x = point[0];
  const y = point[1];
  const z = point[2];
  const w = 1;

  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12] * w,
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13] * w,
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14] * w,
    matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15] * w,
  ];
}

function resizeCanvasToDisplaySize(canvas) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.floor(canvas.clientWidth * pixelRatio);
  const height = Math.floor(canvas.clientHeight * pixelRatio);
  if (canvas.width === width && canvas.height === height) {
    return false;
  }
  canvas.width = width;
  canvas.height = height;
  return true;
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(info || "Shader compilation failed.");
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(info || "Program link failed.");
  }

  return program;
}

function createArrayBuffer(gl, data, usage = gl.STATIC_DRAW) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  return buffer;
}

function createIndexBuffer(gl, data) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

function createCheckerTexture(gl, size, cells) {
  const texture = gl.createTexture();
  const pixels = new Uint8Array(size * size * 4);
  const cellSize = size / cells;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cellX = Math.floor(x / cellSize);
      const cellY = Math.floor(y / cellSize);
      const isDark = (cellX + cellY) % 2 === 0;
      const offset = (y * size + x) * 4;

      if (isDark) {
        pixels[offset] = 21;
        pixels[offset + 1] = 65;
        pixels[offset + 2] = 91;
      } else {
        pixels[offset] = 236;
        pixels[offset + 1] = 209;
        pixels[offset + 2] = 142;
      }
      pixels[offset + 3] = 255;
    }
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    size,
    size,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return texture;
}

function getGlContext(canvas) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    return null;
  }

  const gl = canvas.getContext("webgl", {
    antialias: true,
    alpha: true,
    premultipliedAlpha: false,
  });

  if (!gl) {
    markCanvasFailure(canvas, "WebGL is unavailable in this browser.");
    return null;
  }

  return gl;
}

function registerDemo(demo) {
  demos.push(demo);
  demoMap.set(demo.canvas, demo);
}

const observer =
  typeof window.IntersectionObserver === "function"
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const demo = demoMap.get(entry.target);
            if (!demo) {
              continue;
            }
            demo.visible = entry.isIntersecting;
            demo.needsRender = true;
          }
        },
        { threshold: 0.08 }
      )
    : null;

function setupReveals() {
  const revealBlocks = document.querySelectorAll(".reveal-block");

  if (prefersReducedMotion || typeof window.IntersectionObserver !== "function") {
    revealBlocks.forEach((element) => {
      element.classList.add("is-visible");
    });
    return;
  }

  revealBlocks.forEach((element) => {
    element.classList.add("reveal-enabled");
  });

  const revealObserver = new IntersectionObserver(
    (entries, currentObserver) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      }
    },
    { threshold: 0.16 }
  );

  revealBlocks.forEach((element) => {
    revealObserver.observe(element);
  });
}

function markCanvasFailure(canvas, label) {
  const parent = canvas.parentElement;
  if (!parent) {
    return;
  }

  parent.classList.add("webgl-fallback");
  parent.setAttribute("data-webgl-fallback", label);
}

function safeSetup(label, setupFn) {
  const canvas = document.getElementById(label);
  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }

  try {
    setupFn();
  } catch (error) {
    console.error(`Failed to initialize ${label}.`, error);
    markCanvasFailure(canvas, `Unable to initialize ${label}.`);
  }
}

const lineVertexSource = `
attribute vec3 aPosition;
attribute vec3 aColor;
uniform mat4 uMatrix;
varying vec3 vColor;

void main() {
  vColor = aColor;
  gl_Position = uMatrix * vec4(aPosition, 1.0);
}
`;

const lineFragmentSource = `
precision mediump float;
varying vec3 vColor;

void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
`;

const flatVertexSource = `
attribute vec3 aPosition;
uniform mat4 uMatrix;

void main() {
  gl_Position = uMatrix * vec4(aPosition, 1.0);
}
`;

const flatFragmentSource = `
precision mediump float;
uniform vec4 uColor;

void main() {
  gl_FragColor = uColor;
}
`;

const litVertexSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;

varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vec4 worldPosition = uModel * vec4(aPosition, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  gl_Position = uProjection * uView * worldPosition;
}
`;

const litFragmentSource = `
precision mediump float;

varying vec3 vWorldPosition;
varying vec3 vNormal;

uniform vec3 uLightDirection;
uniform vec3 uBaseColor;
uniform vec3 uAccentColor;
uniform vec3 uCameraPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDirection = normalize(uLightDirection);
  vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.0);
  float rim = smoothstep(0.2, 1.0, fresnel);

  vec3 color = uBaseColor * (0.24 + diffuse * 0.92) + uAccentColor * rim * 0.22;
  gl_FragColor = vec4(color, 1.0);
}
`;

const waveVertexSource = `
attribute vec3 aPosition;
attribute vec2 aUv;

uniform mat4 uViewProjection;
uniform float uTime;
uniform float uAmplitude;
uniform float uDensity;

varying vec2 vUv;
varying float vWave;

void main() {
  float wave = sin((aPosition.x * uDensity) + uTime * 0.65) *
               cos((aPosition.z * uDensity * 0.72) - uTime * 0.33);
  vec3 displaced = aPosition + vec3(0.0, wave * uAmplitude, 0.0);
  vUv = aUv;
  vWave = wave;
  gl_Position = uViewProjection * vec4(displaced, 1.0);
}
`;

const waveFragmentSource = `
precision mediump float;

varying vec2 vUv;
varying float vWave;

uniform float uTime;
uniform float uShift;

void main() {
  float stripes = 0.5 + 0.5 * sin(vUv.x * 48.0 + uTime * 1.2 + vWave * 3.4);
  float bands = 0.5 + 0.5 * sin(vUv.y * 24.0 - uTime * 0.85 + uShift * 5.0);

  vec3 cool = vec3(0.10, 0.53, 0.70);
  vec3 mint = vec3(0.14, 0.83, 0.66);
  vec3 warm = vec3(0.95, 0.63, 0.34);
  vec3 dusk = vec3(0.32, 0.16, 0.47);

  vec3 mixA = mix(cool, mint, 0.5 + 0.5 * vWave);
  vec3 mixB = mix(dusk, warm, bands);
  vec3 color = mix(mixA, mixB, stripes * 0.55 + 0.15);

  float vignette = smoothstep(1.18, 0.18, length(vUv - 0.5));
  gl_FragColor = vec4(color * vignette, 1.0);
}
`;

const texturedVertexSource = `
attribute vec3 aPosition;
attribute vec2 aUv;

uniform mat4 uModel;
uniform mat4 uViewProjection;

varying vec2 vUv;

void main() {
  vUv = aUv;
  gl_Position = uViewProjection * uModel * vec4(aPosition, 1.0);
}
`;

const texturedFragmentSource = `
precision mediump float;

varying vec2 vUv;

uniform sampler2D uTexture;
uniform float uUvScale;

void main() {
  vec2 uv = vUv * uUvScale;
  vec4 sampleColor = texture2D(uTexture, uv);
  float edge = 0.5 + 0.5 * sin(vUv.x * 3.14159) * sin(vUv.y * 3.14159);
  vec3 color = mix(sampleColor.rgb * 0.88, sampleColor.rgb, edge);
  gl_FragColor = vec4(color, 1.0);
}
`;

const materialVertexSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;

varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vec4 worldPosition = uModel * vec4(aPosition, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  gl_Position = uProjection * uView * worldPosition;
}
`;

const materialFragmentSource = `
precision mediump float;

varying vec3 vWorldPosition;
varying vec3 vNormal;

uniform vec3 uLightDirection;
uniform vec3 uBaseColor;
uniform vec3 uCameraPosition;
uniform float uSpecularStrength;
uniform float uShininess;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDirection = normalize(uLightDirection);
  vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
  vec3 halfVector = normalize(lightDirection + viewDirection);

  float diffuse = max(dot(normal, lightDirection), 0.0);
  float specular = pow(max(dot(normal, halfVector), 0.0), uShininess) * uSpecularStrength;
  float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.0);

  vec3 ambient = uBaseColor * 0.18;
  vec3 diffuseColor = uBaseColor * diffuse * 0.92;
  vec3 specularColor = vec3(1.0, 0.96, 0.88) * specular;
  vec3 rimColor = vec3(0.28, 0.72, 0.95) * fresnel * 0.18;

  gl_FragColor = vec4(ambient + diffuseColor + specularColor + rimColor, 1.0);
}
`;

const colorVertexSource = `
attribute vec2 aPosition;
attribute vec2 aUv;

varying vec2 vUv;

void main() {
  vUv = aUv;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const colorFragmentSource = `
precision mediump float;

varying vec2 vUv;

uniform float uTime;
uniform float uExposure;
uniform float uGamma;
uniform float uToneMap;

void main() {
  vec2 uv = vUv;
  vec2 p = uv * 2.0 - 1.0;

  vec3 skyLow = vec3(0.10, 0.18, 0.42);
  vec3 skyHigh = vec3(0.95, 0.58, 0.22);
  vec3 sky = mix(skyLow, skyHigh, smoothstep(-0.65, 0.9, p.y));

  vec2 sunOffset = p - vec2(0.38, 0.24 + sin(uTime * 0.25) * 0.03);
  float sun = exp(-dot(sunOffset, sunOffset) * 16.0) * 8.0;
  float halo = exp(-dot(sunOffset, sunOffset) * 3.2) * 2.2;

  float bands = 0.5 + 0.5 * sin((uv.x * 10.0) + uTime * 0.25);
  float horizonGlow = smoothstep(0.24, -0.25, abs(p.y + 0.12)) * 1.4;

  vec3 color = sky;
  color += vec3(1.0, 0.86, 0.65) * sun;
  color += vec3(1.0, 0.62, 0.32) * halo;
  color += vec3(0.20, 0.55, 0.92) * bands * horizonGlow * 0.65;

  color *= uExposure;

  if (uToneMap > 0.5) {
    color = color / (1.0 + color);
  }

  color = pow(max(color, 0.0), vec3(1.0 / uGamma));
  gl_FragColor = vec4(color, 1.0);
}
`;

function createCubeData() {
  const positions = new Float32Array([
    -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
    1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1,
    -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1,
    -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1,
    1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1,
    -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1,
  ]);

  const normals = new Float32Array([
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ]);

  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23,
  ]);

  return { positions, normals, indices };
}

function createSphereData(radius, latBands, lonBands) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let lat = 0; lat <= latBands; lat += 1) {
    const v = lat / latBands;
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let lon = 0; lon <= lonBands; lon += 1) {
      const u = lon / lonBands;
      const theta = u * TAU;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      const x = sinPhi * cosTheta;
      const y = cosPhi;
      const z = sinPhi * sinTheta;

      positions.push(x * radius, y * radius, z * radius);
      normals.push(x, y, z);
    }
  }

  for (let lat = 0; lat < latBands; lat += 1) {
    for (let lon = 0; lon < lonBands; lon += 1) {
      const first = lat * (lonBands + 1) + lon;
      const second = first + lonBands + 1;
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

function createPlaneData(size, columns, rows) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      const v = row / rows;
      positions.push((u - 0.5) * size, 0, (v - 0.5) * size);
      uvs.push(u, v);
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const topLeft = row * (columns + 1) + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + columns + 1;
      const bottomRight = bottomLeft + 1;
      indices.push(topLeft, bottomLeft, topRight);
      indices.push(topRight, bottomLeft, bottomRight);
    }
  }

  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}

function createScreenQuadData() {
  return {
    positions: new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1,
    ]),
    uvs: new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1,
    ]),
  };
}

function createGridLines(extent, step) {
  const positions = [];
  const colors = [];

  for (let value = -extent; value <= extent; value += step) {
    const isAxis = value === 0;
    const tone = isAxis ? [0.38, 0.65, 0.73] : [0.45, 0.53, 0.61];
    const weight = isAxis ? 1 : 0.72;
    const color = tone.map((channel) => clamp(channel * weight, 0, 1));

    positions.push(-extent, value, 0, extent, value, 0);
    positions.push(value, -extent, 0, value, extent, 0);
    colors.push(...color, ...color, ...color, ...color);
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
  };
}

function createAxisArrows(length) {
  const positions = new Float32Array([
    0, 0, 0, length, 0, 0,
    length, 0, 0, length - 0.16, 0.1, 0,
    length, 0, 0, length - 0.16, -0.1, 0,

    0, 0, 0, 0, length, 0,
    0, length, 0, 0.1, length - 0.16, 0,
    0, length, 0, -0.1, length - 0.16, 0,
  ]);

  const colors = new Float32Array([
    0.96, 0.53, 0.38, 0.96, 0.53, 0.38,
    0.96, 0.53, 0.38, 0.96, 0.53, 0.38,
    0.96, 0.53, 0.38, 0.96, 0.53, 0.38,

    0.29, 0.86, 0.77, 0.29, 0.86, 0.77,
    0.29, 0.86, 0.77, 0.29, 0.86, 0.77,
    0.29, 0.86, 0.77, 0.29, 0.86, 0.77,
  ]);

  return { positions, colors };
}

function createWorldAxes(length) {
  const positions = new Float32Array([
    -length, 0, 0, length, 0, 0,
    0, -length, 0, 0, length, 0,
    0, 0, -length, 0, 0, length,
  ]);

  const colors = new Float32Array([
    0.95, 0.47, 0.32, 0.95, 0.47, 0.32,
    0.34, 0.88, 0.66, 0.34, 0.88, 0.66,
    0.34, 0.65, 0.98, 0.34, 0.65, 0.98,
  ]);

  return { positions, colors };
}

function createOrbitLines(radiusA, radiusB, segments) {
  const positions = [];
  const colors = [];

  for (let i = 0; i < segments; i += 1) {
    const a0 = (i / segments) * TAU;
    const a1 = ((i + 1) / segments) * TAU;

    positions.push(
      Math.cos(a0) * radiusA, 0, Math.sin(a0) * radiusA,
      Math.cos(a1) * radiusA, 0, Math.sin(a1) * radiusA
    );
    positions.push(
      0, Math.cos(a0) * radiusB, Math.sin(a0) * radiusB,
      0, Math.cos(a1) * radiusB, Math.sin(a1) * radiusB
    );

    colors.push(
      0.46, 0.88, 0.99, 0.46, 0.88, 0.99,
      0.97, 0.68, 0.36, 0.97, 0.68, 0.36
    );
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
  };
}

function createNormalLines(positions, normals, length, step = 6) {
  const linePositions = [];
  const colors = [];

  for (let vertex = 0; vertex < positions.length / 3; vertex += step) {
    const index = vertex * 3;
    const px = positions[index];
    const py = positions[index + 1];
    const pz = positions[index + 2];
    const nx = normals[index];
    const ny = normals[index + 1];
    const nz = normals[index + 2];

    linePositions.push(px, py, pz, px + nx * length, py + ny * length, pz + nz * length);
    colors.push(0.42, 0.92, 0.95, 0.96, 0.65, 0.35);
  }

  return {
    positions: new Float32Array(linePositions),
    colors: new Float32Array(colors),
  };
}

function createLightArrow(length) {
  const positions = new Float32Array([
    0, 0, 0, 0, 0, length,
    0, 0, length, 0.12, 0, length - 0.16,
    0, 0, length, -0.12, 0, length - 0.16,
    0, 0, length, 0, 0.12, length - 0.16,
    0, 0, length, 0, -0.12, length - 0.16,
  ]);

  const colors = new Float32Array([
    1.0, 0.78, 0.38, 1.0, 0.78, 0.38,
    1.0, 0.78, 0.38, 1.0, 0.78, 0.38,
    1.0, 0.78, 0.38, 1.0, 0.78, 0.38,
    1.0, 0.78, 0.38, 1.0, 0.78, 0.38,
  ]);

  return { positions, colors };
}

function bindAttribute(gl, buffer, location, size) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

function setupHeroDemo() {
  const canvas = document.getElementById("hero-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const meshProgram = createProgram(gl, litVertexSource, litFragmentSource);
  const lineProgram = createProgram(gl, lineVertexSource, lineFragmentSource);
  const sphere = createSphereData(1.06, 24, 28);
  const orbits = createOrbitLines(1.8, 1.38, 80);
  const axes = createWorldAxes(1.9);

  const sphereBuffers = {
    position: createArrayBuffer(gl, sphere.positions),
    normal: createArrayBuffer(gl, sphere.normals),
    index: createIndexBuffer(gl, sphere.indices),
    count: sphere.indices.length,
  };

  const orbitBuffers = {
    position: createArrayBuffer(gl, orbits.positions),
    color: createArrayBuffer(gl, orbits.colors),
    count: orbits.positions.length / 3,
  };

  const axisBuffers = {
    position: createArrayBuffer(gl, axes.positions),
    color: createArrayBuffer(gl, axes.colors),
    count: axes.positions.length / 3,
  };

  const meshLocations = {
    position: gl.getAttribLocation(meshProgram, "aPosition"),
    normal: gl.getAttribLocation(meshProgram, "aNormal"),
    model: gl.getUniformLocation(meshProgram, "uModel"),
    view: gl.getUniformLocation(meshProgram, "uView"),
    projection: gl.getUniformLocation(meshProgram, "uProjection"),
    normalMatrix: gl.getUniformLocation(meshProgram, "uNormalMatrix"),
    lightDirection: gl.getUniformLocation(meshProgram, "uLightDirection"),
    baseColor: gl.getUniformLocation(meshProgram, "uBaseColor"),
    accentColor: gl.getUniformLocation(meshProgram, "uAccentColor"),
    cameraPosition: gl.getUniformLocation(meshProgram, "uCameraPosition"),
  };

  const lineLocations = {
    position: gl.getAttribLocation(lineProgram, "aPosition"),
    color: gl.getAttribLocation(lineProgram, "aColor"),
    matrix: gl.getUniformLocation(lineProgram, "uMatrix"),
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const projection = mat4Perspective(degreesToRadians(44), aspect, 0.1, 20);
      const cameraAngle = prefersReducedMotion ? 0.85 : time * 0.18;
      const camera = [
        Math.cos(cameraAngle) * 4.6,
        1.75 + Math.sin(cameraAngle * 0.6) * 0.3,
        Math.sin(cameraAngle) * 4.6,
      ];
      const view = mat4LookAt(camera, [0, 0, 0], [0, 1, 0]);

      const rotationY = prefersReducedMotion ? 0.65 : time * 0.55;
      const rotationX = prefersReducedMotion ? -0.28 : Math.sin(time * 0.42) * 0.18 - 0.3;
      const model = mat4Multiply(mat4RotationY(rotationY), mat4RotationX(rotationX));

      const lineMatrix = mat4Multiply(projection, view);

      gl.useProgram(lineProgram);
      gl.uniformMatrix4fv(lineLocations.matrix, false, lineMatrix);
      bindAttribute(gl, orbitBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, orbitBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, orbitBuffers.count);

      bindAttribute(gl, axisBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, axisBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, axisBuffers.count);

      gl.useProgram(meshProgram);
      gl.uniformMatrix4fv(meshLocations.model, false, model);
      gl.uniformMatrix4fv(meshLocations.view, false, view);
      gl.uniformMatrix4fv(meshLocations.projection, false, projection);
      gl.uniformMatrix3fv(meshLocations.normalMatrix, false, upperLeftMat3(model));
      gl.uniform3fv(meshLocations.lightDirection, normalize3([0.7, 1.0, 0.4]));
      gl.uniform3fv(meshLocations.baseColor, new Float32Array([0.36, 0.82, 0.76]));
      gl.uniform3fv(meshLocations.accentColor, new Float32Array([0.98, 0.72, 0.35]));
      gl.uniform3fv(meshLocations.cameraPosition, new Float32Array(camera));
      bindAttribute(gl, sphereBuffers.position, meshLocations.position, 3);
      bindAttribute(gl, sphereBuffers.normal, meshLocations.normal, 3);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffers.index);
      gl.drawElements(gl.TRIANGLES, sphereBuffers.count, gl.UNSIGNED_SHORT, 0);
    },
  });
}

function setupVectorDemo() {
  const canvas = document.getElementById("vectors-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const lineProgram = createProgram(gl, lineVertexSource, lineFragmentSource);
  const flatProgram = createProgram(gl, flatVertexSource, flatFragmentSource);
  const grid = createGridLines(6, 1);
  const axes = createAxisArrows(1.55);
  const triangle = new Float32Array([
    0.0, 0.0, 0.0,
    1.45, 0.1, 0.0,
    0.35, 1.18, 0.0,
  ]);

  const gridBuffers = {
    position: createArrayBuffer(gl, grid.positions),
    color: createArrayBuffer(gl, grid.colors),
    count: grid.positions.length / 3,
  };

  const axisBuffers = {
    position: createArrayBuffer(gl, axes.positions),
    color: createArrayBuffer(gl, axes.colors),
    count: axes.positions.length / 3,
  };

  const triangleBuffer = createArrayBuffer(gl, triangle);

  const lineLocations = {
    position: gl.getAttribLocation(lineProgram, "aPosition"),
    color: gl.getAttribLocation(lineProgram, "aColor"),
    matrix: gl.getUniformLocation(lineProgram, "uMatrix"),
  };

  const flatLocations = {
    position: gl.getAttribLocation(flatProgram, "aPosition"),
    matrix: gl.getUniformLocation(flatProgram, "uMatrix"),
    color: gl.getUniformLocation(flatProgram, "uColor"),
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const projection = mat4Orthographic(-6 * aspect, 6 * aspect, -6, 6, -1, 1);

      const rotation = degreesToRadians(Number(vectorControls.rotation.value));
      const scaleX = Number(vectorControls.scaleX.value) / 100;
      const scaleY = Number(vectorControls.scaleY.value) / 100;
      const transform = mat4Multiply(
        mat4RotationZ(rotation),
        mat4Scaling(scaleX, scaleY, 1)
      );
      const transformedMatrix = mat4Multiply(projection, transform);

      gl.useProgram(lineProgram);
      gl.uniformMatrix4fv(lineLocations.matrix, false, projection);
      bindAttribute(gl, gridBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, gridBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, gridBuffers.count);

      gl.uniformMatrix4fv(lineLocations.matrix, false, transformedMatrix);
      bindAttribute(gl, axisBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, axisBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, axisBuffers.count);

      gl.useProgram(flatProgram);
      bindAttribute(gl, triangleBuffer, flatLocations.position, 3);

      gl.uniformMatrix4fv(flatLocations.matrix, false, projection);
      gl.uniform4fv(flatLocations.color, new Float32Array([0.85, 0.89, 0.95, 0.18]));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.uniform4fv(flatLocations.color, new Float32Array([0.92, 0.95, 0.99, 0.45]));
      gl.drawArrays(gl.LINE_LOOP, 0, 3);

      gl.uniformMatrix4fv(flatLocations.matrix, false, transformedMatrix);
      gl.uniform4fv(flatLocations.color, new Float32Array([0.24, 0.82, 0.78, 0.3]));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.uniform4fv(flatLocations.color, new Float32Array([0.99, 0.74, 0.35, 1.0]));
      gl.drawArrays(gl.LINE_LOOP, 0, 3);
    },
  });
}

function buildCubeMesh(gl) {
  const cube = createCubeData();
  return {
    position: createArrayBuffer(gl, cube.positions),
    normal: createArrayBuffer(gl, cube.normals),
    index: createIndexBuffer(gl, cube.indices),
    count: cube.indices.length,
    positions: cube.positions,
    indices: cube.indices,
  };
}

function commonSpaceMatrices(canvas) {
  const aspect = canvas.width / Math.max(canvas.height, 1);
  const projection = mat4Perspective(degreesToRadians(48), aspect, 0.1, 20);
  const camera = [3.5, 2.7, 4.8];
  const view = mat4LookAt(camera, [0.2, 0.1, 0], [0, 1, 0]);
  const rawRotation = degreesToRadians(Number(spaceControls.rotation.value));
  const model = mat4Multiply(
    mat4Translation(1.35, 0.55, -0.4),
    mat4Multiply(mat4RotationY(rawRotation), mat4RotationX(rawRotation * 0.45))
  );
  return { aspect, projection, camera, view, model };
}

function setupSpaceObjectDemo() {
  const canvas = document.getElementById("space-object-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const meshProgram = createProgram(gl, litVertexSource, litFragmentSource);
  const lineProgram = createProgram(gl, lineVertexSource, lineFragmentSource);
  const cube = buildCubeMesh(gl);
  const axes = createWorldAxes(1.8);
  const axisBuffers = {
    position: createArrayBuffer(gl, axes.positions),
    color: createArrayBuffer(gl, axes.colors),
    count: axes.positions.length / 3,
  };

  const meshLocations = {
    position: gl.getAttribLocation(meshProgram, "aPosition"),
    normal: gl.getAttribLocation(meshProgram, "aNormal"),
    model: gl.getUniformLocation(meshProgram, "uModel"),
    view: gl.getUniformLocation(meshProgram, "uView"),
    projection: gl.getUniformLocation(meshProgram, "uProjection"),
    normalMatrix: gl.getUniformLocation(meshProgram, "uNormalMatrix"),
    lightDirection: gl.getUniformLocation(meshProgram, "uLightDirection"),
    baseColor: gl.getUniformLocation(meshProgram, "uBaseColor"),
    accentColor: gl.getUniformLocation(meshProgram, "uAccentColor"),
    cameraPosition: gl.getUniformLocation(meshProgram, "uCameraPosition"),
  };

  const lineLocations = {
    position: gl.getAttribLocation(lineProgram, "aPosition"),
    color: gl.getAttribLocation(lineProgram, "aColor"),
    matrix: gl.getUniformLocation(lineProgram, "uMatrix"),
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const projection = mat4Perspective(degreesToRadians(46), aspect, 0.1, 20);
      const camera = [3.4, 2.5, 4.2];
      const view = mat4LookAt(camera, [0, 0, 0], [0, 1, 0]);
      const extra = prefersReducedMotion ? 0 : time * 0.28;
      const model = mat4Multiply(mat4RotationY(extra), mat4RotationX(-0.35));

      gl.useProgram(lineProgram);
      gl.uniformMatrix4fv(lineLocations.matrix, false, mat4Multiply(projection, view));
      bindAttribute(gl, axisBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, axisBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, axisBuffers.count);

      gl.useProgram(meshProgram);
      gl.uniformMatrix4fv(meshLocations.model, false, model);
      gl.uniformMatrix4fv(meshLocations.view, false, view);
      gl.uniformMatrix4fv(meshLocations.projection, false, projection);
      gl.uniformMatrix3fv(meshLocations.normalMatrix, false, upperLeftMat3(model));
      gl.uniform3fv(meshLocations.lightDirection, normalize3([0.7, 0.9, 0.6]));
      gl.uniform3fv(meshLocations.baseColor, new Float32Array([0.31, 0.83, 0.71]));
      gl.uniform3fv(meshLocations.accentColor, new Float32Array([0.98, 0.75, 0.36]));
      gl.uniform3fv(meshLocations.cameraPosition, new Float32Array(camera));
      bindAttribute(gl, cube.position, meshLocations.position, 3);
      bindAttribute(gl, cube.normal, meshLocations.normal, 3);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.index);
      gl.drawElements(gl.TRIANGLES, cube.count, gl.UNSIGNED_SHORT, 0);
    },
  });
}

function setupSpaceWorldDemo() {
  const canvas = document.getElementById("space-world-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const meshProgram = createProgram(gl, litVertexSource, litFragmentSource);
  const lineProgram = createProgram(gl, lineVertexSource, lineFragmentSource);
  const cube = buildCubeMesh(gl);
  const axes = createWorldAxes(2.5);
  const axisBuffers = {
    position: createArrayBuffer(gl, axes.positions),
    color: createArrayBuffer(gl, axes.colors),
    count: axes.positions.length / 3,
  };

  const meshLocations = {
    position: gl.getAttribLocation(meshProgram, "aPosition"),
    normal: gl.getAttribLocation(meshProgram, "aNormal"),
    model: gl.getUniformLocation(meshProgram, "uModel"),
    view: gl.getUniformLocation(meshProgram, "uView"),
    projection: gl.getUniformLocation(meshProgram, "uProjection"),
    normalMatrix: gl.getUniformLocation(meshProgram, "uNormalMatrix"),
    lightDirection: gl.getUniformLocation(meshProgram, "uLightDirection"),
    baseColor: gl.getUniformLocation(meshProgram, "uBaseColor"),
    accentColor: gl.getUniformLocation(meshProgram, "uAccentColor"),
    cameraPosition: gl.getUniformLocation(meshProgram, "uCameraPosition"),
  };

  const lineLocations = {
    position: gl.getAttribLocation(lineProgram, "aPosition"),
    color: gl.getAttribLocation(lineProgram, "aColor"),
    matrix: gl.getUniformLocation(lineProgram, "uMatrix"),
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const { projection, camera, view, model } = commonSpaceMatrices(canvas);
      const matrix = mat4Multiply(projection, view);

      gl.useProgram(lineProgram);
      gl.uniformMatrix4fv(lineLocations.matrix, false, matrix);
      bindAttribute(gl, axisBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, axisBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, axisBuffers.count);

      gl.useProgram(meshProgram);
      gl.uniformMatrix4fv(meshLocations.model, false, model);
      gl.uniformMatrix4fv(meshLocations.view, false, view);
      gl.uniformMatrix4fv(meshLocations.projection, false, projection);
      gl.uniformMatrix3fv(meshLocations.normalMatrix, false, upperLeftMat3(model));
      gl.uniform3fv(meshLocations.lightDirection, normalize3([0.75, 0.8, 0.55]));
      gl.uniform3fv(meshLocations.baseColor, new Float32Array([0.32, 0.77, 0.9]));
      gl.uniform3fv(meshLocations.accentColor, new Float32Array([0.95, 0.66, 0.31]));
      gl.uniform3fv(meshLocations.cameraPosition, new Float32Array(camera));
      bindAttribute(gl, cube.position, meshLocations.position, 3);
      bindAttribute(gl, cube.normal, meshLocations.normal, 3);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.index);
      gl.drawElements(gl.TRIANGLES, cube.count, gl.UNSIGNED_SHORT, 0);
    },
  });
}

function setupSpaceClipDemo() {
  const canvas = document.getElementById("space-clip-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const flatProgram = createProgram(gl, flatVertexSource, flatFragmentSource);
  const lineProgram = createProgram(gl, lineVertexSource, lineFragmentSource);
  const cube = createCubeData();
  const transformedPositions = new Float32Array(cube.positions.length);
  const dynamicBuffer = createArrayBuffer(gl, transformedPositions, gl.DYNAMIC_DRAW);
  const indexBuffer = createIndexBuffer(gl, cube.indices);

  const ndcBounds = new Float32Array([
    -1, -1, 0, 1, -1, 0,
    1, -1, 0, 1, 1, 0,
    1, 1, 0, -1, 1, 0,
    -1, 1, 0, -1, -1, 0,
  ]);

  const ndcColors = new Float32Array([
    0.96, 0.68, 0.34, 0.96, 0.68, 0.34,
    0.96, 0.68, 0.34, 0.96, 0.68, 0.34,
    0.96, 0.68, 0.34, 0.96, 0.68, 0.34,
    0.96, 0.68, 0.34, 0.96, 0.68, 0.34,
  ]);

  const boundBuffers = {
    position: createArrayBuffer(gl, ndcBounds),
    color: createArrayBuffer(gl, ndcColors),
    count: ndcBounds.length / 3,
  };

  const flatLocations = {
    position: gl.getAttribLocation(flatProgram, "aPosition"),
    matrix: gl.getUniformLocation(flatProgram, "uMatrix"),
    color: gl.getUniformLocation(flatProgram, "uColor"),
  };

  const lineLocations = {
    position: gl.getAttribLocation(lineProgram, "aPosition"),
    color: gl.getAttribLocation(lineProgram, "aColor"),
    matrix: gl.getUniformLocation(lineProgram, "uMatrix"),
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const { projection, view, model } = commonSpaceMatrices(canvas);
      const mvp = mat4Multiply(mat4Multiply(projection, view), model);

      for (let index = 0; index < cube.positions.length; index += 3) {
        const point = [
          cube.positions[index],
          cube.positions[index + 1],
          cube.positions[index + 2],
        ];
        const transformed = transformPoint(mvp, point);
        const w = transformed[3] || 1;
        transformedPositions[index] = transformed[0] / w;
        transformedPositions[index + 1] = transformed[1] / w;
        transformedPositions[index + 2] = transformed[2] / w;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, dynamicBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, transformedPositions);

      gl.useProgram(flatProgram);
      bindAttribute(gl, dynamicBuffer, flatLocations.position, 3);
      gl.uniformMatrix4fv(flatLocations.matrix, false, mat4Identity());
      gl.uniform4fv(flatLocations.color, new Float32Array([0.28, 0.82, 0.76, 0.4]));
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, cube.indices.length, gl.UNSIGNED_SHORT, 0);

      gl.useProgram(lineProgram);
      gl.uniformMatrix4fv(lineLocations.matrix, false, mat4Identity());
      bindAttribute(gl, boundBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, boundBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, boundBuffers.count);
    },
  });
}

function setupNormalsDemo() {
  const canvas = document.getElementById("normals-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const meshProgram = createProgram(gl, litVertexSource, litFragmentSource);
  const lineProgram = createProgram(gl, lineVertexSource, lineFragmentSource);
  const sphere = createSphereData(1.15, 18, 20);
  const normalLines = createNormalLines(sphere.positions, sphere.normals, 0.18);
  const lightArrow = createLightArrow(1.8);

  const sphereBuffers = {
    position: createArrayBuffer(gl, sphere.positions),
    normal: createArrayBuffer(gl, sphere.normals),
    index: createIndexBuffer(gl, sphere.indices),
    count: sphere.indices.length,
  };

  const normalBuffers = {
    position: createArrayBuffer(gl, normalLines.positions),
    color: createArrayBuffer(gl, normalLines.colors),
    count: normalLines.positions.length / 3,
  };

  const arrowBuffers = {
    position: createArrayBuffer(gl, lightArrow.positions),
    color: createArrayBuffer(gl, lightArrow.colors),
    count: lightArrow.positions.length / 3,
  };

  const meshLocations = {
    position: gl.getAttribLocation(meshProgram, "aPosition"),
    normal: gl.getAttribLocation(meshProgram, "aNormal"),
    model: gl.getUniformLocation(meshProgram, "uModel"),
    view: gl.getUniformLocation(meshProgram, "uView"),
    projection: gl.getUniformLocation(meshProgram, "uProjection"),
    normalMatrix: gl.getUniformLocation(meshProgram, "uNormalMatrix"),
    lightDirection: gl.getUniformLocation(meshProgram, "uLightDirection"),
    baseColor: gl.getUniformLocation(meshProgram, "uBaseColor"),
    accentColor: gl.getUniformLocation(meshProgram, "uAccentColor"),
    cameraPosition: gl.getUniformLocation(meshProgram, "uCameraPosition"),
  };

  const lineLocations = {
    position: gl.getAttribLocation(lineProgram, "aPosition"),
    color: gl.getAttribLocation(lineProgram, "aColor"),
    matrix: gl.getUniformLocation(lineProgram, "uMatrix"),
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const projection = mat4Perspective(degreesToRadians(46), aspect, 0.1, 20);
      const camera = [0, 0.3, 3.7];
      const view = mat4LookAt(camera, [0, 0, 0], [0, 1, 0]);
      const spin = prefersReducedMotion ? 0.5 : time * 0.35;
      const model = mat4Multiply(mat4RotationY(spin), mat4RotationX(-0.28));

      const azimuth = degreesToRadians(Number(normalControls.azimuth.value));
      const elevation = degreesToRadians(Number(normalControls.elevation.value));
      const lightDirection = normalize3([
        Math.cos(elevation) * Math.cos(azimuth),
        Math.sin(elevation),
        Math.cos(elevation) * Math.sin(azimuth),
      ]);

      gl.useProgram(meshProgram);
      gl.uniformMatrix4fv(meshLocations.model, false, model);
      gl.uniformMatrix4fv(meshLocations.view, false, view);
      gl.uniformMatrix4fv(meshLocations.projection, false, projection);
      gl.uniformMatrix3fv(meshLocations.normalMatrix, false, upperLeftMat3(model));
      gl.uniform3fv(meshLocations.lightDirection, new Float32Array(lightDirection));
      gl.uniform3fv(meshLocations.baseColor, new Float32Array([0.3, 0.76, 0.98]));
      gl.uniform3fv(meshLocations.accentColor, new Float32Array([0.97, 0.73, 0.33]));
      gl.uniform3fv(meshLocations.cameraPosition, new Float32Array(camera));
      bindAttribute(gl, sphereBuffers.position, meshLocations.position, 3);
      bindAttribute(gl, sphereBuffers.normal, meshLocations.normal, 3);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffers.index);
      gl.drawElements(gl.TRIANGLES, sphereBuffers.count, gl.UNSIGNED_SHORT, 0);

      const lineMatrix = mat4Multiply(projection, view);
      gl.useProgram(lineProgram);
      gl.uniformMatrix4fv(lineLocations.matrix, false, mat4Multiply(lineMatrix, model));

      if (normalControls.showNormals.checked) {
        bindAttribute(gl, normalBuffers.position, lineLocations.position, 3);
        bindAttribute(gl, normalBuffers.color, lineLocations.color, 3);
        gl.drawArrays(gl.LINES, 0, normalBuffers.count);
      }

      const arrowRotation = mat4Multiply(
        mat4RotationY(Math.atan2(lightDirection[0], lightDirection[2])),
        mat4RotationX(-Math.asin(lightDirection[1]))
      );

      gl.uniformMatrix4fv(lineLocations.matrix, false, mat4Multiply(lineMatrix, arrowRotation));
      bindAttribute(gl, arrowBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, arrowBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, arrowBuffers.count);
    },
  });
}

function setupShaderDemo() {
  const canvas = document.getElementById("shader-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const waveProgram = createProgram(gl, waveVertexSource, waveFragmentSource);
  const plane = createPlaneData(4.2, 72, 72);

  const buffers = {
    position: createArrayBuffer(gl, plane.positions),
    uv: createArrayBuffer(gl, plane.uvs),
    index: createIndexBuffer(gl, plane.indices),
    count: plane.indices.length,
  };

  const locations = {
    position: gl.getAttribLocation(waveProgram, "aPosition"),
    uv: gl.getAttribLocation(waveProgram, "aUv"),
    viewProjection: gl.getUniformLocation(waveProgram, "uViewProjection"),
    time: gl.getUniformLocation(waveProgram, "uTime"),
    amplitude: gl.getUniformLocation(waveProgram, "uAmplitude"),
    density: gl.getUniformLocation(waveProgram, "uDensity"),
    shift: gl.getUniformLocation(waveProgram, "uShift"),
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const projection = mat4Perspective(degreesToRadians(52), aspect, 0.1, 20);
      const camera = [0, 1.6, 4.8];
      const view = mat4LookAt(camera, [0, 0, 0], [0, 1, 0]);
      const viewProjection = mat4Multiply(projection, view);

      gl.useProgram(waveProgram);
      bindAttribute(gl, buffers.position, locations.position, 3);
      bindAttribute(gl, buffers.uv, locations.uv, 2);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
      gl.uniformMatrix4fv(locations.viewProjection, false, viewProjection);
      gl.uniform1f(locations.time, prefersReducedMotion ? 0.35 : time);
      gl.uniform1f(locations.amplitude, Number(shaderControls.amplitude.value) / 100);
      gl.uniform1f(locations.density, Number(shaderControls.density.value) / 4);
      gl.uniform1f(locations.shift, Number(shaderControls.shift.value) / 100);
      gl.drawElements(gl.TRIANGLES, buffers.count, gl.UNSIGNED_SHORT, 0);
    },
  });
}

function setupProjectionDemo() {
  const canvas = document.getElementById("projection-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const meshProgram = createProgram(gl, litVertexSource, litFragmentSource);
  const cube = buildCubeMesh(gl);

  const locations = {
    position: gl.getAttribLocation(meshProgram, "aPosition"),
    normal: gl.getAttribLocation(meshProgram, "aNormal"),
    model: gl.getUniformLocation(meshProgram, "uModel"),
    view: gl.getUniformLocation(meshProgram, "uView"),
    projection: gl.getUniformLocation(meshProgram, "uProjection"),
    normalMatrix: gl.getUniformLocation(meshProgram, "uNormalMatrix"),
    lightDirection: gl.getUniformLocation(meshProgram, "uLightDirection"),
    baseColor: gl.getUniformLocation(meshProgram, "uBaseColor"),
    accentColor: gl.getUniformLocation(meshProgram, "uAccentColor"),
    cameraPosition: gl.getUniformLocation(meshProgram, "uCameraPosition"),
  };

  function drawCube(model, view, projection, camera, baseColor, accentColor) {
    gl.uniformMatrix4fv(locations.model, false, model);
    gl.uniformMatrix4fv(locations.view, false, view);
    gl.uniformMatrix4fv(locations.projection, false, projection);
    gl.uniformMatrix3fv(locations.normalMatrix, false, upperLeftMat3(model));
    gl.uniform3fv(locations.baseColor, new Float32Array(baseColor));
    gl.uniform3fv(locations.accentColor, new Float32Array(accentColor));
    gl.uniform3fv(locations.cameraPosition, new Float32Array(camera));
    bindAttribute(gl, cube.position, locations.position, 3);
    bindAttribute(gl, cube.normal, locations.normal, 3);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.index);
    gl.drawElements(gl.TRIANGLES, cube.count, gl.UNSIGNED_SHORT, 0);
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const distance = Number(projectionControls.distance.value) / 10;
      const useOrtho = projectionControls.ortho.checked;
      const projection = useOrtho
        ? mat4Orthographic(-3.4 * aspect, 3.4 * aspect, -3.4, 3.4, 0.1, 20)
        : mat4Perspective(degreesToRadians(Number(projectionControls.fov.value)), aspect, 0.1, 20);
      const camera = [0, 1.0, distance];
      const view = mat4LookAt(camera, [0, 0, 0], [0, 1, 0]);
      const spin = prefersReducedMotion ? 0.28 : time * 0.52;

      const frontModel = mat4Multiply(
        mat4Translation(-1.7, -0.15, 1.25),
        mat4Multiply(mat4RotationY(spin + 0.3), mat4Scaling(0.72, 0.72, 0.72))
      );
      const middleModel = mat4Multiply(
        mat4Translation(0.0, -0.15, 0.0),
        mat4Multiply(mat4RotationY(-spin * 0.7), mat4Scaling(0.72, 0.72, 0.72))
      );
      const backModel = mat4Multiply(
        mat4Translation(1.7, -0.15, -1.55),
        mat4Multiply(mat4RotationY(spin * 1.12 - 0.45), mat4Scaling(0.72, 0.72, 0.72))
      );

      gl.useProgram(meshProgram);
      gl.uniform3fv(locations.lightDirection, normalize3([0.58, 0.88, 0.46]));
      drawCube(frontModel, view, projection, camera, [0.28, 0.8, 0.96], [0.98, 0.77, 0.34]);
      drawCube(middleModel, view, projection, camera, [0.24, 0.77, 0.56], [0.95, 0.66, 0.33]);
      drawCube(backModel, view, projection, camera, [0.94, 0.58, 0.33], [0.39, 0.79, 0.97]);
    },
  });
}

function setupTextureDemo() {
  const canvas = document.getElementById("texture-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const program = createProgram(gl, texturedVertexSource, texturedFragmentSource);
  const plane = createPlaneData(5.2, 1, 1);
  const texture = createCheckerTexture(gl, 128, 8);

  const buffers = {
    position: createArrayBuffer(gl, plane.positions),
    uv: createArrayBuffer(gl, plane.uvs),
    index: createIndexBuffer(gl, plane.indices),
    count: plane.indices.length,
  };

  const locations = {
    position: gl.getAttribLocation(program, "aPosition"),
    uv: gl.getAttribLocation(program, "aUv"),
    model: gl.getUniformLocation(program, "uModel"),
    viewProjection: gl.getUniformLocation(program, "uViewProjection"),
    texture: gl.getUniformLocation(program, "uTexture"),
    uvScale: gl.getUniformLocation(program, "uUvScale"),
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const projection = mat4Perspective(degreesToRadians(52), aspect, 0.1, 20);
      const camera = [0, 1.8, 4.7];
      const view = mat4LookAt(camera, [0, -0.2, 0], [0, 1, 0]);
      const tilt = degreesToRadians(Number(textureControls.tilt.value));
      const model = mat4Multiply(
        mat4Translation(0, -0.85, 0),
        mat4RotationX(-tilt)
      );

      gl.useProgram(program);
      bindAttribute(gl, buffers.position, locations.position, 3);
      bindAttribute(gl, buffers.uv, locations.uv, 2);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
      gl.uniformMatrix4fv(locations.model, false, model);
      gl.uniformMatrix4fv(locations.viewProjection, false, mat4Multiply(projection, view));
      gl.uniform1f(locations.uvScale, Number(textureControls.scale.value));
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        textureControls.linear.checked ? gl.LINEAR : gl.NEAREST
      );
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MAG_FILTER,
        textureControls.linear.checked ? gl.LINEAR : gl.NEAREST
      );
      gl.uniform1i(locations.texture, 0);
      gl.drawElements(gl.TRIANGLES, buffers.count, gl.UNSIGNED_SHORT, 0);
    },
  });
}

function setupMaterialDemo() {
  const canvas = document.getElementById("material-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const program = createProgram(gl, materialVertexSource, materialFragmentSource);
  const sphere = createSphereData(1.12, 24, 28);

  const buffers = {
    position: createArrayBuffer(gl, sphere.positions),
    normal: createArrayBuffer(gl, sphere.normals),
    index: createIndexBuffer(gl, sphere.indices),
    count: sphere.indices.length,
  };

  const locations = {
    position: gl.getAttribLocation(program, "aPosition"),
    normal: gl.getAttribLocation(program, "aNormal"),
    model: gl.getUniformLocation(program, "uModel"),
    view: gl.getUniformLocation(program, "uView"),
    projection: gl.getUniformLocation(program, "uProjection"),
    normalMatrix: gl.getUniformLocation(program, "uNormalMatrix"),
    lightDirection: gl.getUniformLocation(program, "uLightDirection"),
    baseColor: gl.getUniformLocation(program, "uBaseColor"),
    cameraPosition: gl.getUniformLocation(program, "uCameraPosition"),
    specularStrength: gl.getUniformLocation(program, "uSpecularStrength"),
    shininess: gl.getUniformLocation(program, "uShininess"),
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const projection = mat4Perspective(degreesToRadians(46), aspect, 0.1, 20);
      const camera = [0, 0.25, 3.75];
      const view = mat4LookAt(camera, [0, 0, 0], [0, 1, 0]);
      const spin = prefersReducedMotion ? 0.4 : time * 0.34;
      const model = mat4Multiply(mat4RotationY(spin), mat4RotationX(-0.22));
      const lightAngle = degreesToRadians(Number(materialControls.light.value));
      const lightDirection = normalize3([
        Math.cos(lightAngle) * 0.82,
        0.58,
        Math.sin(lightAngle) * 0.82,
      ]);

      gl.useProgram(program);
      gl.uniformMatrix4fv(locations.model, false, model);
      gl.uniformMatrix4fv(locations.view, false, view);
      gl.uniformMatrix4fv(locations.projection, false, projection);
      gl.uniformMatrix3fv(locations.normalMatrix, false, upperLeftMat3(model));
      gl.uniform3fv(locations.lightDirection, new Float32Array(lightDirection));
      gl.uniform3fv(locations.baseColor, new Float32Array([0.21, 0.74, 0.93]));
      gl.uniform3fv(locations.cameraPosition, new Float32Array(camera));
      gl.uniform1f(locations.specularStrength, Number(materialControls.specular.value) / 100);
      gl.uniform1f(locations.shininess, Number(materialControls.shininess.value));
      bindAttribute(gl, buffers.position, locations.position, 3);
      bindAttribute(gl, buffers.normal, locations.normal, 3);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
      gl.drawElements(gl.TRIANGLES, buffers.count, gl.UNSIGNED_SHORT, 0);
    },
  });
}

function setupColorDemo() {
  const canvas = document.getElementById("color-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const program = createProgram(gl, colorVertexSource, colorFragmentSource);
  const quad = createScreenQuadData();

  const positions = createArrayBuffer(gl, quad.positions);
  const uvs = createArrayBuffer(gl, quad.uvs);

  const locations = {
    position: gl.getAttribLocation(program, "aPosition"),
    uv: gl.getAttribLocation(program, "aUv"),
    time: gl.getUniformLocation(program, "uTime"),
    exposure: gl.getUniformLocation(program, "uExposure"),
    gamma: gl.getUniformLocation(program, "uGamma"),
    toneMap: gl.getUniformLocation(program, "uToneMap"),
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      bindAttribute(gl, positions, locations.position, 2);
      bindAttribute(gl, uvs, locations.uv, 2);
      gl.uniform1f(locations.time, prefersReducedMotion ? 0.25 : time);
      gl.uniform1f(locations.exposure, Number(colorControls.exposure.value) / 100);
      gl.uniform1f(locations.gamma, Number(colorControls.gamma.value) / 10);
      gl.uniform1f(locations.toneMap, colorControls.tonemap.checked ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  });
}

function setupPipelineDemo() {
  const canvas = document.getElementById("pipeline-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const meshProgram = createProgram(gl, litVertexSource, litFragmentSource);
  const cube = buildCubeMesh(gl);

  const meshLocations = {
    position: gl.getAttribLocation(meshProgram, "aPosition"),
    normal: gl.getAttribLocation(meshProgram, "aNormal"),
    model: gl.getUniformLocation(meshProgram, "uModel"),
    view: gl.getUniformLocation(meshProgram, "uView"),
    projection: gl.getUniformLocation(meshProgram, "uProjection"),
    normalMatrix: gl.getUniformLocation(meshProgram, "uNormalMatrix"),
    lightDirection: gl.getUniformLocation(meshProgram, "uLightDirection"),
    baseColor: gl.getUniformLocation(meshProgram, "uBaseColor"),
    accentColor: gl.getUniformLocation(meshProgram, "uAccentColor"),
    cameraPosition: gl.getUniformLocation(meshProgram, "uCameraPosition"),
  };

  function drawCube(model, view, projection, camera, baseColor, accentColor) {
    gl.uniformMatrix4fv(meshLocations.model, false, model);
    gl.uniformMatrix4fv(meshLocations.view, false, view);
    gl.uniformMatrix4fv(meshLocations.projection, false, projection);
    gl.uniformMatrix3fv(meshLocations.normalMatrix, false, upperLeftMat3(model));
    gl.uniform3fv(meshLocations.lightDirection, normalize3([0.55, 0.88, 0.52]));
    gl.uniform3fv(meshLocations.baseColor, new Float32Array(baseColor));
    gl.uniform3fv(meshLocations.accentColor, new Float32Array(accentColor));
    gl.uniform3fv(meshLocations.cameraPosition, new Float32Array(camera));
    bindAttribute(gl, cube.position, meshLocations.position, 3);
    bindAttribute(gl, cube.normal, meshLocations.normal, 3);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.index);
    gl.drawElements(gl.TRIANGLES, cube.count, gl.UNSIGNED_SHORT, 0);
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      if (pipelineControls.depth.checked) {
        gl.enable(gl.DEPTH_TEST);
      } else {
        gl.disable(gl.DEPTH_TEST);
      }

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const projection = mat4Perspective(degreesToRadians(46), aspect, 0.1, 20);
      const camera = [0, 1.15, 6.1];
      const view = mat4LookAt(camera, [0, 0, 0], [0, 1, 0]);

      const separation = Number(pipelineControls.separation.value) / 100;
      const baseSpin = degreesToRadians(Number(pipelineControls.spin.value));
      const animatedSpin = prefersReducedMotion ? 0.28 : time * 0.52;

      const nearModel = mat4Multiply(
        mat4Translation(-0.18 + separation * 0.62, 0.0, 0.55),
        mat4Multiply(mat4RotationY(baseSpin + animatedSpin), mat4RotationX(-0.34))
      );

      const farModel = mat4Multiply(
        mat4Translation(0.2 - separation * 0.48, 0.0, -0.9),
        mat4Multiply(mat4RotationY(-(baseSpin * 0.72 + animatedSpin * 0.9)), mat4RotationX(0.24))
      );

      gl.useProgram(meshProgram);
      drawCube(
        nearModel,
        view,
        projection,
        camera,
        [0.3, 0.78, 0.96],
        [0.98, 0.75, 0.36]
      );
      drawCube(
        farModel,
        view,
        projection,
        camera,
        [0.18, 0.78, 0.54],
        [0.95, 0.55, 0.33]
      );
    },
  });
}

function markAllDemosDirty() {
  for (const demo of demos) {
    demo.needsRender = true;
  }
}

function setupControlListeners() {
  const inputs = [
    vectorControls.rotation,
    vectorControls.scaleX,
    vectorControls.scaleY,
    spaceControls.rotation,
    normalControls.azimuth,
    normalControls.elevation,
    normalControls.showNormals,
    shaderControls.amplitude,
    shaderControls.density,
    shaderControls.shift,
    pipelineControls.separation,
    pipelineControls.spin,
    pipelineControls.depth,
    projectionControls.fov,
    projectionControls.distance,
    projectionControls.ortho,
    textureControls.scale,
    textureControls.tilt,
    textureControls.linear,
    materialControls.specular,
    materialControls.shininess,
    materialControls.light,
    colorControls.exposure,
    colorControls.gamma,
    colorControls.tonemap,
  ];

  for (const input of inputs) {
    if (!input) {
      continue;
    }

    input.addEventListener("input", markAllDemosDirty);
    input.addEventListener("change", markAllDemosDirty);
  }

  window.addEventListener("resize", markAllDemosDirty, { passive: true });
}

function startRenderLoop() {
  const draw = (frameTime) => {
    const time = frameTime * 0.001;
    for (const demo of demos) {
      if (!demo.visible && !demo.needsRender) {
        continue;
      }
      demo.render(time);
      demo.needsRender = false;
    }
    requestAnimationFrame(draw);
  };

  requestAnimationFrame(draw);
}

function initialize() {
  setupReveals();
  safeSetup("hero-canvas", setupHeroDemo);
  safeSetup("vectors-canvas", setupVectorDemo);
  safeSetup("space-object-canvas", setupSpaceObjectDemo);
  safeSetup("space-world-canvas", setupSpaceWorldDemo);
  safeSetup("space-clip-canvas", setupSpaceClipDemo);
  safeSetup("normals-canvas", setupNormalsDemo);
  safeSetup("shader-canvas", setupShaderDemo);
  safeSetup("pipeline-canvas", setupPipelineDemo);
  safeSetup("projection-canvas", setupProjectionDemo);
  safeSetup("texture-canvas", setupTextureDemo);
  safeSetup("material-canvas", setupMaterialDemo);
  safeSetup("color-canvas", setupColorDemo);
  setupControlListeners();

  for (const demo of demos) {
    if (observer) {
      observer.observe(demo.canvas);
    }
  }

  if (demos.length > 0) {
    startRenderLoop();
  }
}

initialize();
