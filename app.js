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

const computeShaderControls = {
  count: document.getElementById("shader-compute-count"),
  push: document.getElementById("shader-compute-push"),
  viscosity: document.getElementById("shader-compute-viscosity"),
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

const shadowControls = {
  bias: document.getElementById("shadow-bias"),
  resolution: document.getElementById("shadow-resolution"),
  filter: document.getElementById("shadow-filter"),
};

const compareControls = {
  sample: document.getElementById("compare-sample"),
  drift: document.getElementById("compare-drift"),
  secondary: document.getElementById("compare-secondary"),
};

const transparencyControls = {
  alpha: document.getElementById("transparency-alpha"),
  softness: document.getElementById("transparency-softness"),
  sort: document.getElementById("transparency-sort"),
};

const pbrControls = {
  roughness: document.getElementById("pbr-roughness"),
  metalness: document.getElementById("pbr-metalness"),
  environment: document.getElementById("pbr-environment"),
};

const animationControls = {
  pose: document.getElementById("animation-pose"),
  lag: document.getElementById("animation-lag"),
  skinning: document.getElementById("animation-skinning"),
};

const accelerationControls = {
  sweep: document.getElementById("acceleration-sweep"),
  lod: document.getElementById("acceleration-lod"),
  culling: document.getElementById("acceleration-culling"),
};

const basisProbeControls = {
  angle: document.getElementById("basis-angle"),
  translateX: document.getElementById("basis-translate-x"),
  translateY: document.getElementById("basis-translate-y"),
  translateToggle: document.getElementById("basis-translate-toggle"),
};

const spaceProbeControls = {
  stage: document.getElementById("space-probe-stage"),
  x: document.getElementById("space-probe-x"),
  y: document.getElementById("space-probe-y"),
  z: document.getElementById("space-probe-z"),
};

const normalProbeControls = {
  surface: document.getElementById("normal-probe-surface"),
  light: document.getElementById("normal-probe-light"),
  scale: document.getElementById("normal-probe-scale"),
  fix: document.getElementById("normal-probe-fix"),
};

const shaderProbeControls = {
  warp: document.getElementById("shader-probe-warp"),
  bands: document.getElementById("shader-probe-bands"),
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function add2(a, b) {
  return [a[0] + b[0], a[1] + b[1]];
}

function subtract2(a, b) {
  return [a[0] - b[0], a[1] - b[1]];
}

function scale2(v, scalar) {
  return [v[0] * scalar, v[1] * scalar];
}

function scale2Components(v, sx, sy) {
  return [v[0] * sx, v[1] * sy];
}

function rotate2(v, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}

function dot2(a, b) {
  return a[0] * b[0] + a[1] * b[1];
}

function normalize2(v) {
  const length = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / length, v[1] / length];
}

function perpendicular2(v) {
  return [-v[1], v[0]];
}

function reflect2(direction, normal) {
  return subtract2(direction, scale2(normal, 2 * dot2(direction, normal)));
}

function formatNumber(value, digits = 2) {
  const rounded = Math.abs(value) < 10 ** -(digits + 1) ? 0 : value;
  return rounded.toFixed(digits);
}

function formatVector(values, digits = 2) {
  return `(${values.map((value) => formatNumber(value, digits)).join(", ")})`;
}

function rgbToCss(color) {
  return `rgb(${color
    .map((channel) => Math.round(clamp(channel, 0, 1) * 255))
    .join(", ")})`;
}

function cloneLessonDefaults(schema, defaults) {
  const values = {};
  for (const entry of schema) {
    const value = defaults[entry.name];
    values[entry.name] = Array.isArray(value) ? value.slice() : value;
  }
  return values;
}

function findLessonSchemaEntry(schema, name) {
  for (const entry of schema) {
    if (entry.name === name) {
      return entry;
    }
  }
  return null;
}

function lessonVectorSize(type) {
  if (type === "bool") {
    return 0;
  }
  if (type === "vec2") {
    return 2;
  }
  if (type === "vec3") {
    return 3;
  }
  if (type === "vec4") {
    return 4;
  }
  return 0;
}

function lessonComponentIndex(component, size) {
  if (component === "x" && size >= 1) {
    return 0;
  }
  if (component === "y" && size >= 2) {
    return 1;
  }
  if (component === "z" && size >= 3) {
    return 2;
  }
  if (component === "w" && size >= 4) {
    return 3;
  }
  return -1;
}

function stripLessonComment(line) {
  const commentIndex = line.indexOf("#");
  return commentIndex === -1 ? line : line.slice(0, commentIndex);
}

function parseLessonScalar(text, lineNumber) {
  const trimmed = text.trim();
  const value = Number(trimmed);
  if (trimmed === "" || !Number.isFinite(value)) {
    throw new Error(`Line ${lineNumber}: expected a number.`);
  }
  return value;
}

function parseLessonBoolean(text, lineNumber) {
  const trimmed = text.trim().toLowerCase();
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  throw new Error(`Line ${lineNumber}: expected true or false.`);
}

function parseLessonVector(text, size, lineNumber) {
  const match = text.trim().match(/^vec([234])\s*\((.*)\)$/);
  if (!match || Number(match[1]) !== size) {
    throw new Error(`Line ${lineNumber}: expected vec${size}(...).`);
  }

  const parts = match[2].split(",").map((part) => part.trim());
  if (parts.length !== size || parts.some((part) => part === "")) {
    throw new Error(`Line ${lineNumber}: vec${size} needs ${size} numeric values.`);
  }

  return parts.map((part) => parseLessonScalar(part, lineNumber));
}

function parseLessonBindings(source, schema, defaults) {
  const values = cloneLessonDefaults(schema, defaults);
  const lines = source.split(/\r?\n/);
  let appliedCount = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const stripped = stripLessonComment(lines[index]).trim();
    if (!stripped) {
      continue;
    }

    const match = stripped.match(/^([A-Za-z_][A-Za-z0-9_]*(?:\.[xyzw])?)\s*=\s*(.+)$/);
    if (!match) {
      throw new Error(`Line ${lineNumber}: expected name = value.`);
    }

    const lhs = match[1];
    const rhs = match[2].trim();
    const dotIndex = lhs.indexOf(".");
    const name = dotIndex === -1 ? lhs : lhs.slice(0, dotIndex);
    const component = dotIndex === -1 ? "" : lhs.slice(dotIndex + 1);
    const entry = findLessonSchemaEntry(schema, name);

    if (!entry) {
      throw new Error(`Line ${lineNumber}: unknown binding "${name}".`);
    }

    if (component) {
      const size = lessonVectorSize(entry.type);
      const componentIndex = lessonComponentIndex(component, size);
      if (componentIndex === -1) {
        throw new Error(`Line ${lineNumber}: "${name}" has no ".${component}" component.`);
      }
      values[name][componentIndex] = parseLessonScalar(rhs, lineNumber);
      appliedCount += 1;
      continue;
    }

    if (entry.type === "number") {
      values[name] = parseLessonScalar(rhs, lineNumber);
      appliedCount += 1;
      continue;
    }

    if (entry.type === "bool") {
      values[name] = parseLessonBoolean(rhs, lineNumber);
      appliedCount += 1;
      continue;
    }

    const size = lessonVectorSize(entry.type);
    if (!size) {
      throw new Error(`Line ${lineNumber}: unsupported binding type "${entry.type}".`);
    }

    values[name] = parseLessonVector(rhs, size, lineNumber);
    appliedCount += 1;
  }

  return { values, appliedCount };
}

function setCodeStatus(element, message, isError = false) {
  if (!element) {
    return;
  }
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

function renderCodeSteps(list, steps) {
  if (!list) {
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const step of steps) {
    const item = document.createElement("li");
    item.textContent = step;
    fragment.appendChild(item);
  }

  list.replaceChildren(fragment);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function highlightLessonBindingTarget(target) {
  const dotIndex = target.indexOf(".");
  if (dotIndex === -1) {
    return `<span class="token-binding">${escapeHtml(target)}</span>`;
  }

  return [
    `<span class="token-binding">${escapeHtml(target.slice(0, dotIndex))}</span>`,
    `<span class="token-punctuation">.</span>`,
    `<span class="token-property">${escapeHtml(target.slice(dotIndex + 1))}</span>`,
  ].join("");
}

function highlightLessonCodeFragment(text) {
  const pattern = /vec[234]|true|false|-?(?:\d+\.\d+|\d+|\.\d+)|[=(),.]/g;
  let result = "";
  let cursor = 0;
  let match = pattern.exec(text);

  while (match) {
    result += escapeHtml(text.slice(cursor, match.index));
    const token = match[0];
    let className = "token-punctuation";
    if (token === "vec2" || token === "vec3" || token === "vec4") {
      className = "token-builtin";
    } else if (token === "true" || token === "false") {
      className = "token-keyword";
    } else if (/^-?(?:\d+\.\d+|\d+|\.\d+)$/.test(token)) {
      className = "token-number";
    } else if (token === "=") {
      className = "token-operator";
    }
    result += `<span class="${className}">${escapeHtml(token)}</span>`;
    cursor = pattern.lastIndex;
    match = pattern.exec(text);
  }

  result += escapeHtml(text.slice(cursor));
  return result;
}

function highlightLessonBindings(source) {
  const lines = source.split(/\r?\n/);
  const highlighted = [];

  for (const line of lines) {
    const commentIndex = line.indexOf("#");
    const body = commentIndex === -1 ? line : line.slice(0, commentIndex);
    const comment = commentIndex === -1 ? "" : line.slice(commentIndex);
    const assignmentMatch = body.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*(?:\.[xyzw])?)(\s*)=(\s*)(.*)$/);

    let html = "";
    if (assignmentMatch) {
      html =
        `${escapeHtml(assignmentMatch[1])}` +
        `${highlightLessonBindingTarget(assignmentMatch[2])}` +
        `${escapeHtml(assignmentMatch[3])}` +
        `<span class="token-operator">=</span>` +
        `${escapeHtml(assignmentMatch[4])}` +
        `${highlightLessonCodeFragment(assignmentMatch[5])}`;
    } else {
      html = highlightLessonCodeFragment(body);
    }

    if (comment) {
      html += `<span class="token-comment">${escapeHtml(comment)}</span>`;
    }

    highlighted.push(html);
  }

  return highlighted.join("\n");
}

function setupLessonCodeEditor(input, highlight) {
  const noopEditor = { refresh() {} };
  if (!input || !highlight) {
    return noopEditor;
  }

  function syncScroll() {
    highlight.scrollTop = input.scrollTop;
    highlight.scrollLeft = input.scrollLeft;
  }

  function refresh() {
    highlight.innerHTML = highlightLessonBindings(input.value || "");
    syncScroll();
  }

  input.addEventListener("input", refresh);
  input.addEventListener("scroll", syncScroll);
  refresh();

  return { refresh };
}

function highlightShaderSampleCode(source) {
  const lines = source.split(/\r?\n/);
  const keywords = new Set([
    "precision",
    "mediump",
    "attribute",
    "uniform",
    "varying",
    "void",
    "const",
    "layout",
    "in",
    "out",
    "buffer",
    "readonly",
    "writeonly",
    "if",
    "return",
  ]);
  const builtins = new Set([
    "float",
    "vec2",
    "vec3",
    "vec4",
    "mat4",
    "uint",
    "uvec3",
    "sin",
    "cos",
    "mix",
    "smoothstep",
    "length",
    "ceil",
    "max",
  ]);
  const properties = new Set([
    "gl_Position",
    "gl_FragColor",
    "gl_GlobalInvocationID",
    "uniform1f",
    "uniform1i",
    "uniformMatrix4fv",
    "dispatchCompute",
  ]);
  const tokenPattern =
    /\b(?:gl_Position|gl_FragColor|gl_GlobalInvocationID|uniformMatrix4fv|uniform1f|uniform1i|dispatchCompute|[A-Za-z_][A-Za-z0-9_]*)\b|-?(?:\d+\.\d+|\d+|\.\d+)|[{}()[\];,.+\-*/=]/g;
  const highlighted = [];

  for (const line of lines) {
    const commentIndex = line.indexOf("//");
    const body = commentIndex === -1 ? line : line.slice(0, commentIndex);
    const comment = commentIndex === -1 ? "" : line.slice(commentIndex);
    let html = "";
    let cursor = 0;
    let match = tokenPattern.exec(body);

    while (match) {
      html += escapeHtml(body.slice(cursor, match.index));
      const token = match[0];
      let className = "token-punctuation";

      if (/^-?(?:\d+\.\d+|\d+|\.\d+)$/.test(token)) {
        className = "token-number";
      } else if (keywords.has(token)) {
        className = "token-keyword";
      } else if (builtins.has(token)) {
        className = "token-builtin";
      } else if (properties.has(token)) {
        className = "token-property";
      } else if (token === "gl" || /^[auv][A-Z][A-Za-z0-9_]*$/.test(token)) {
        className = "token-binding";
      } else if (/^[=+\-*/]$/.test(token)) {
        className = "token-operator";
      }

      html += `<span class="${className}">${escapeHtml(token)}</span>`;
      cursor = tokenPattern.lastIndex;
      match = tokenPattern.exec(body);
    }

    html += escapeHtml(body.slice(cursor));
    if (comment) {
      html += `<span class="token-comment">${escapeHtml(comment)}</span>`;
    }
    highlighted.push(html);
  }

  return highlighted.join("\n");
}

function getShaderLiveLabState() {
  return {
    amplitude: Number(shaderControls.amplitude?.value || 32) / 100,
    stripeDensity: Number(shaderControls.density?.value || 12),
    shift: Number(shaderControls.shift?.value || 44) / 100,
  };
}

function buildShaderLiveBindingsCode(state) {
  return [
    "// CPU-side bindings for this draw",
    "gl.uniformMatrix4fv(uViewProjection, false, cameraMatrix);",
    "gl.uniform1f(uTime, animatedTime);",
    `gl.uniform1f(uAmplitude, ${formatNumber(state.amplitude, 2)});`,
    `gl.uniform1f(uStripeDensity, ${formatNumber(state.stripeDensity, 2)});`,
    `gl.uniform1f(uShift, ${formatNumber(state.shift, 2)});`,
  ].join("\n");
}

function buildShaderLiveVertexCode() {
  return [
    "precision mediump float;",
    "",
    "attribute vec3 aPosition;",
    "attribute vec2 aUv;",
    "",
    "uniform mat4 uViewProjection;",
    "uniform float uTime;",
    "uniform float uAmplitude;",
    "",
    "varying mediump vec2 vUv;",
    "varying mediump float vWave;",
    "",
    "void main() {",
    "  float wave = sin((aPosition.x * 3.4) + uTime * 0.65) *",
    "               cos((aPosition.z * 2.45) - uTime * 0.33);",
    "  vec3 displaced = aPosition + vec3(0.0, wave * uAmplitude, 0.0);",
    "  vUv = aUv;",
    "  vWave = wave;",
    "  gl_Position = uViewProjection * vec4(displaced, 1.0);",
    "}",
  ].join("\n");
}

function buildShaderLiveFragmentCode() {
  return [
    "precision mediump float;",
    "",
    "varying mediump vec2 vUv;",
    "varying mediump float vWave;",
    "",
    "uniform float uTime;",
    "uniform float uStripeDensity;",
    "uniform float uShift;",
    "",
    "void main() {",
    "  float stripes = 0.5 + 0.5 * sin(vUv.x * (uStripeDensity * 3.6) +",
    "                                  uTime * 1.2 + vWave * 3.4);",
    "  float bands = 0.5 + 0.5 * sin(vUv.y * 24.0 - uTime * 0.85 + uShift * 5.0);",
    "  vec3 cool = vec3(0.10, 0.53, 0.70);",
    "  vec3 mint = vec3(0.14, 0.83, 0.66);",
    "  vec3 warm = vec3(0.95, 0.63, 0.34);",
    "  vec3 dusk = vec3(0.32, 0.16, 0.47);",
    "  vec3 mixA = mix(cool, mint, 0.5 + 0.5 * vWave);",
    "  vec3 mixB = mix(dusk, warm, bands);",
    "  vec3 color = mix(mixA, mixB, stripes * 0.55 + 0.15);",
    "  float vignette = 1.0 - smoothstep(0.18, 0.78, length(vUv - vec2(0.5)));",
    "  gl_FragColor = vec4(color * vignette, 1.0);",
    "}",
  ].join("\n");
}

function getShaderFluidState() {
  const count = Number(computeShaderControls.count?.value || 156);
  const push = Number(computeShaderControls.push?.value || 58) / 100;
  const viscosity = Number(computeShaderControls.viscosity?.value || 46) / 100;
  const workgroupSize = 64;
  const workgroups = Math.ceil(count / workgroupSize);
  return {
    count,
    push,
    viscosity,
    workgroupSize,
    workgroups,
    cpuChecks: (count * (count - 1)) / 2,
  };
}

function buildShaderFluidBindingsCode(state) {
  return [
    "// Frame orchestration",
    `const particleCount = ${state.count};`,
    `const workgroups = ceil(${state.count}.0 / ${state.workgroupSize}.0);`,
    `setUniform(uPushStrength, ${formatNumber(state.push, 2)});`,
    `setUniform(uViscosity, ${formatNumber(state.viscosity, 2)});`,
    "dispatchCompute(workgroups, 1, 1);",
    "memoryBarrier(bufferBits);",
    "drawInstancedSoftSpheres(particleCount);",
  ].join("\n");
}

function buildShaderFluidCpuCode(state) {
  return [
    "for i in range(particle_count):",
    "  pos, vel = particles[i]",
    "  for j in range(particle_count):",
    "    if i == j:",
    "      continue",
    "    vel += pressure_and_viscosity(i, j)",
    `  vel += pointer_impulse(pos) * ${formatNumber(state.push, 2)}`,
    `  vel *= 1.0 - ${formatNumber(state.viscosity * 0.14, 2)}`,
    "  particles[i] = integrate_and_confine(pos, vel)",
  ].join("\n");
}

function buildShaderFluidComputeCode(state) {
  return [
    "layout(local_size_x = 64) in;",
    "",
    "layout(std430, binding = 0) buffer ParticleState {",
    "  vec4 particle[]; // xy = position, zw = velocity",
    "};",
    "",
    "uniform uint uParticleCount;",
    "uniform float uDeltaTime;",
    "uniform vec2 uPointer;",
    "uniform float uPushStrength;",
    "uniform float uViscosity;",
    "",
    "void main() {",
    "  uint id = gl_GlobalInvocationID.x;",
    "  if (id >= uParticleCount) {",
    "    return;",
    "  }",
    "  vec2 pos = particle[id].xy;",
    "  vec2 vel = particle[id].zw;",
    "  vel += neighborPressure(id, pos);",
    "  vel += pointerImpulse(pos, uPointer) * uPushStrength;",
    "  vel *= 1.0 - uViscosity * 0.14;",
    "  pos += vel * uDeltaTime;",
    "  particle[id] = vec4(confine(pos), vel);",
    "}",
  ].join("\n");
}

function updateShaderFluidCodePanel() {
  const bindingsCode = document.getElementById("shader-fluid-bindings-code");
  const cpuCode = document.getElementById("shader-fluid-cpu-code");
  const computeCode = document.getElementById("shader-fluid-compute-code");
  const countBinding = document.getElementById("shader-fluid-binding-count");
  const groupsBinding = document.getElementById("shader-fluid-binding-groups");
  const renderBinding = document.getElementById("shader-fluid-binding-render");
  const readoutParticles = document.getElementById("shader-fluid-readout-particles");
  const readoutCpu = document.getElementById("shader-fluid-readout-cpu");
  const readoutGroups = document.getElementById("shader-fluid-readout-groups");
  const readoutPass = document.getElementById("shader-fluid-readout-pass");
  if (!bindingsCode || !cpuCode || !computeCode) {
    return;
  }

  const state = getShaderFluidState();
  bindingsCode.innerHTML = highlightShaderSampleCode(buildShaderFluidBindingsCode(state));
  cpuCode.innerHTML = highlightShaderSampleCode(buildShaderFluidCpuCode(state));
  computeCode.innerHTML = highlightShaderSampleCode(buildShaderFluidComputeCode(state));

  if (countBinding) {
    countBinding.textContent = `${state.count} particles -> state buffer`;
  }
  if (groupsBinding) {
    groupsBinding.textContent = `${state.workgroups} groups x ${state.workgroupSize} lanes -> update pass`;
  }
  if (renderBinding) {
    renderBinding.textContent = "draw pass reads updated positions";
  }
  if (readoutParticles) {
    readoutParticles.textContent = String(state.count);
  }
  if (readoutCpu) {
    readoutCpu.textContent = `${state.cpuChecks.toLocaleString()} / step`;
  }
  if (readoutGroups) {
    readoutGroups.textContent = `${state.workgroups} groups x ${state.workgroupSize} lanes`;
  }
  if (readoutPass) {
    readoutPass.textContent = "update pass -> render pass";
  }
}

function updateShaderLiveLabCodePanel() {
  const bindingsCode = document.getElementById("shader-live-bindings-code");
  const vertexCode = document.getElementById("shader-live-vertex-code");
  const fragmentCode = document.getElementById("shader-live-fragment-code");
  const waveBinding = document.getElementById("shader-live-binding-wave");
  const stripeBinding = document.getElementById("shader-live-binding-stripe");
  const shiftBinding = document.getElementById("shader-live-binding-shift");
  if (!bindingsCode || !vertexCode || !fragmentCode) {
    return;
  }

  const state = getShaderLiveLabState();
  bindingsCode.innerHTML = highlightShaderSampleCode(buildShaderLiveBindingsCode(state));
  vertexCode.innerHTML = highlightShaderSampleCode(buildShaderLiveVertexCode());
  fragmentCode.innerHTML = highlightShaderSampleCode(buildShaderLiveFragmentCode());

  if (waveBinding) {
    waveBinding.textContent = `Wave height ${formatNumber(state.amplitude, 2)} -> vertex stage`;
  }
  if (stripeBinding) {
    stripeBinding.textContent = `Stripe density ${formatNumber(state.stripeDensity, 2)} -> fragment stage`;
  }
  if (shiftBinding) {
    shiftBinding.textContent = `Color drift ${formatNumber(state.shift, 2)} -> fragment stage`;
  }
}

function setupShaderFluidTabs() {
  const sceneTab = document.getElementById("shader-fluid-tab-scene");
  const codeTab = document.getElementById("shader-fluid-tab-code");
  const scenePanel = document.getElementById("shader-fluid-panel-scene");
  const codePanel = document.getElementById("shader-fluid-panel-code");
  if (!sceneTab || !codeTab || !scenePanel || !codePanel) {
    return;
  }

  function setActiveTab(mode) {
    const showScene = mode === "scene";
    sceneTab.classList.toggle("is-active", showScene);
    sceneTab.setAttribute("aria-selected", showScene ? "true" : "false");
    codeTab.classList.toggle("is-active", !showScene);
    codeTab.setAttribute("aria-selected", showScene ? "false" : "true");
    scenePanel.hidden = !showScene;
    codePanel.hidden = showScene;
    if (showScene) {
      markAllDemosDirty();
    }
  }

  sceneTab.addEventListener("click", () => {
    setActiveTab("scene");
  });
  codeTab.addEventListener("click", () => {
    setActiveTab("code");
  });

  for (const input of [computeShaderControls.count, computeShaderControls.push, computeShaderControls.viscosity]) {
    if (!input) {
      continue;
    }
    input.addEventListener("input", updateShaderFluidCodePanel);
    input.addEventListener("change", updateShaderFluidCodePanel);
  }

  updateShaderFluidCodePanel();
  setActiveTab("scene");
}

function setupShaderLiveLabTabs() {
  const sceneTab = document.getElementById("shader-live-tab-scene");
  const codeTab = document.getElementById("shader-live-tab-code");
  const scenePanel = document.getElementById("shader-live-panel-scene");
  const codePanel = document.getElementById("shader-live-panel-code");
  if (!sceneTab || !codeTab || !scenePanel || !codePanel) {
    return;
  }

  function setActiveTab(mode) {
    const showScene = mode === "scene";
    sceneTab.classList.toggle("is-active", showScene);
    sceneTab.setAttribute("aria-selected", showScene ? "true" : "false");
    codeTab.classList.toggle("is-active", !showScene);
    codeTab.setAttribute("aria-selected", showScene ? "false" : "true");
    scenePanel.hidden = !showScene;
    codePanel.hidden = showScene;
    if (showScene) {
      markAllDemosDirty();
    }
  }

  sceneTab.addEventListener("click", () => {
    setActiveTab("scene");
  });
  codeTab.addEventListener("click", () => {
    setActiveTab("code");
  });

  for (const input of [shaderControls.amplitude, shaderControls.density, shaderControls.shift]) {
    if (!input) {
      continue;
    }
    input.addEventListener("input", updateShaderLiveLabCodePanel);
    input.addEventListener("change", updateShaderLiveLabCodePanel);
  }

  updateShaderLiveLabCodePanel();
  setActiveTab("scene");
}

function wrapUnit(value) {
  return value - Math.floor(value);
}

function drawLessonCanvasBackground(ctx, width, height, top = "#102535", bottom = "#183446") {
  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, top);
  background.addColorStop(1, bottom);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
}

function wrapCanvasTextLine(ctx, text, maxWidth) {
  const normalized = `${text ?? ""}`;
  if (!Number.isFinite(maxWidth) || maxWidth <= 0 || !normalized.includes(" ")) {
    return [normalized];
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [""];
  }

  const lines = [];
  let current = words[0];
  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${current} ${words[index]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[index];
    }
  }
  lines.push(current);
  return lines;
}

function drawLessonCanvasPanel(ctx, rect, title, width) {
  ctx.save();
  ctx.fillStyle = "rgba(8, 21, 30, 0.22)";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
  ctx.font = `${Math.max(11, width * 0.014)}px "Avenir Next", "Segoe UI", sans-serif`;
  drawTextLines(ctx, [title], rect.x + 14, rect.y + 10, Math.max(14, width * 0.014 * 1.18), rect.width - 28);
  ctx.restore();
}

function drawCanvasChip(ctx, text, x, y, options = {}) {
  if (!text) {
    return;
  }

  const fontSize = options.fontSize || 11;
  const paddingX = options.paddingX || Math.max(6, fontSize * 0.52);
  const paddingY = options.paddingY || Math.max(3, fontSize * 0.26);
  const align = options.align || "center";

  ctx.save();
  ctx.font = `${fontSize}px "Avenir Next", "Segoe UI", sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const textWidth = ctx.measureText(text).width;
  const chipWidth = textWidth + paddingX * 2;
  const chipHeight = fontSize + paddingY * 2;

  let chipX = x;
  if (align === "center") {
    chipX -= chipWidth * 0.5;
  } else if (align === "right") {
    chipX -= chipWidth;
  }

  let chipY = y - chipHeight * 0.5;
  chipX = Math.min(Math.max(chipX, 4), Math.max(4, ctx.canvas.width - chipWidth - 4));
  chipY = Math.min(Math.max(chipY, 4), Math.max(4, ctx.canvas.height - chipHeight - 4));

  ctx.fillStyle = options.background || "rgba(8, 21, 30, 0.8)";
  ctx.fillRect(chipX, chipY, chipWidth, chipHeight);
  ctx.strokeStyle = options.border || "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 1;
  ctx.strokeRect(chipX + 0.5, chipY + 0.5, chipWidth - 1, chipHeight - 1);
  ctx.fillStyle = options.color || "rgba(239, 245, 247, 0.94)";
  ctx.fillText(text, chipX + paddingX, chipY + chipHeight * 0.5 + 0.5);
  ctx.restore();
}

function drawArrow2d(ctx, from, to, color, lineWidth = 2.2) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const head = Math.max(7, lineWidth * 3.4);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0], to[1]);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(to[0], to[1]);
  ctx.lineTo(to[0] - ux * head - uy * head * 0.55, to[1] - uy * head + ux * head * 0.55);
  ctx.lineTo(to[0] - ux * head + uy * head * 0.55, to[1] - uy * head - ux * head * 0.55);
  ctx.closePath();
  ctx.fill();
}

function projectRectPoint(rect, point, extentX, extentY, paddingX = 16, paddingY = 18, centerY = 0.56) {
  return [
    rect.x + rect.width * 0.5 + (point[0] / extentX) * (rect.width * 0.5 - paddingX),
    rect.y + rect.height * centerY - (point[1] / extentY) * (rect.height * 0.5 - paddingY),
  ];
}

function drawRectAxesGrid(ctx, rect, extentX, extentY, width, centerY = 0.56) {
  const maxX = Math.max(1, Math.floor(extentX));
  const maxY = Math.max(1, Math.floor(extentY));

  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  for (let index = -maxY; index <= maxY; index += 1) {
    const start = projectRectPoint(rect, [-extentX, index], extentX, extentY, 16, 18, centerY);
    const end = projectRectPoint(rect, [extentX, index], extentX, extentY, 16, 18, centerY);
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
  }

  for (let index = -maxX; index <= maxX; index += 1) {
    const start = projectRectPoint(rect, [index, -extentY], extentX, extentY, 16, 18, centerY);
    const end = projectRectPoint(rect, [index, extentY], extentX, extentY, 16, 18, centerY);
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
  }

  const origin = projectRectPoint(rect, [0, 0], extentX, extentY, 16, 18, centerY);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = Math.max(1.5, width * 0.0028);
  ctx.beginPath();
  ctx.moveTo(rect.x + 14, origin[1]);
  ctx.lineTo(rect.x + rect.width - 14, origin[1]);
  ctx.moveTo(origin[0], rect.y + 16);
  ctx.lineTo(origin[0], rect.y + rect.height - 16);
  ctx.stroke();
  return origin;
}

function drawCanvasDot(ctx, point, radius, fillStyle, strokeStyle = "", lineWidth = 0) {
  ctx.beginPath();
  ctx.arc(point[0], point[1], radius, 0, TAU);
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth || 1.5;
    ctx.stroke();
  }
}

function drawCameraGlyph(ctx, center, angle, size, fillStyle, strokeStyle = "rgba(239, 245, 247, 0.92)") {
  const forward = [Math.cos(angle), -Math.sin(angle)];
  const right = [-forward[1], forward[0]];
  const tip = [center[0] + forward[0] * size * 1.1, center[1] + forward[1] * size * 1.1];
  const left = [
    center[0] - forward[0] * size * 0.68 + right[0] * size * 0.66,
    center[1] - forward[1] * size * 0.68 + right[1] * size * 0.66,
  ];
  const rightPoint = [
    center[0] - forward[0] * size * 0.68 - right[0] * size * 0.66,
    center[1] - forward[1] * size * 0.68 - right[1] * size * 0.66,
  ];

  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = Math.max(1.5, size * 0.14);
  ctx.beginPath();
  ctx.moveTo(tip[0], tip[1]);
  ctx.lineTo(left[0], left[1]);
  ctx.lineTo(rightPoint[0], rightPoint[1]);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawCanvasDot(ctx, center, Math.max(3, size * 0.18), "rgba(8, 21, 30, 0.78)", strokeStyle, Math.max(1.2, size * 0.08));
}

function drawTextLines(ctx, lines, x, y, lineHeight, maxWidth = Infinity) {
  ctx.save();
  ctx.textBaseline = "top";
  let cursorY = y;
  for (let index = 0; index < lines.length; index += 1) {
    const wrapped = wrapCanvasTextLine(ctx, lines[index], maxWidth);
    for (const line of wrapped) {
      ctx.fillText(line, x, cursorY);
      cursorY += lineHeight;
    }
  }
  ctx.restore();
  return cursorY - y;
}

function setupStructuredCodeLab(config) {
  const canvas = document.getElementById(config.canvasId || `${config.prefix}-canvas`);
  const ctx = get2dContext(canvas);
  const input = document.getElementById(config.inputId || `${config.prefix}-input`);
  const highlight = document.getElementById(config.highlightId || `${config.prefix}-highlight`);
  const runButton = document.getElementById(config.runId || `${config.prefix}-run`);
  const resetButton = document.getElementById(config.resetId || `${config.prefix}-reset`);
  const status = document.getElementById(config.statusId || `${config.prefix}-status`);
  const stepList = document.getElementById(config.stepListId || `${config.prefix}-steps`);
  const loweredOutput = document.getElementById(config.loweredId || `${config.prefix}-lowered`);
  if (!ctx || !input || !runButton || !resetButton) {
    return;
  }

  const readouts = {};
  for (const [key, elementId] of Object.entries(config.readoutIds || {})) {
    readouts[key] = document.getElementById(elementId);
  }

  const defaultSource = input.value;
  const state = {
    appliedSource: defaultSource,
    derived: null,
  };
  const pendingMessage = config.pendingMessage || "Edits pending. Press Run or use Cmd/Ctrl+Enter to apply changes.";
  const editor = setupLessonCodeEditor(input, highlight);

  function applySource(source) {
    try {
      const parsed = parseLessonBindings(source, config.schema, config.defaults);
      const derived = config.evaluate(parsed.values);
      state.appliedSource = source;
      state.derived = derived;
      if (config.updateUi) {
        config.updateUi(derived, readouts, stepList, loweredOutput);
      }
      setCodeStatus(
        status,
        config.getStatusMessage
          ? config.getStatusMessage(parsed, derived)
          : `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}.`
      );
      markAllDemosDirty();
    } catch (error) {
      setCodeStatus(status, error instanceof Error ? error.message : "Could not parse the lesson bindings.", true);
    }
  }

  runButton.addEventListener("click", () => {
    applySource(input.value);
  });
  resetButton.addEventListener("click", () => {
    input.value = defaultSource;
    editor.refresh();
    applySource(defaultSource);
  });
  input.addEventListener("input", () => {
    if (input.value !== state.appliedSource) {
      setCodeStatus(status, pendingMessage);
    }
  });
  input.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      applySource(input.value);
    }
  });

  applySource(defaultSource);

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      if (!state.derived) {
        return;
      }
      config.draw(ctx, canvas, state.derived);
    },
  });
}

function getCanvasPointer(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(rect.width, 1);
  const scaleY = canvas.height / Math.max(rect.height, 1);
  return [
    (event.clientX - rect.left) * scaleX,
    (event.clientY - rect.top) * scaleY,
  ];
}

function barycentricCoordinates(point, a, b, c) {
  const denominator =
    (b[1] - c[1]) * (a[0] - c[0]) +
    (c[0] - b[0]) * (a[1] - c[1]);

  if (Math.abs(denominator) < 1e-6) {
    return null;
  }

  const alpha =
    ((b[1] - c[1]) * (point[0] - c[0]) +
      (c[0] - b[0]) * (point[1] - c[1])) /
    denominator;
  const beta =
    ((c[1] - a[1]) * (point[0] - c[0]) +
      (a[0] - c[0]) * (point[1] - c[1])) /
    denominator;
  const gamma = 1 - alpha - beta;

  return [alpha, beta, gamma];
}

function vec2(x = 0, y = 0) {
  return [x, y];
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

function multiply3(a, b) {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}

function mix3(a, b, t) {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];
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

function reflect3(direction, normal) {
  return subtract3(direction, scale3(normal, 2 * dot3(direction, normal)));
}

function colorToRgba(color, alpha = 1) {
  return `rgba(${Math.round(clamp(color[0], 0, 1) * 255)}, ${Math.round(clamp(color[1], 0, 1) * 255)}, ${Math.round(
    clamp(color[2], 0, 1) * 255
  )}, ${alpha})`;
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

function get2dContext(canvas) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    return null;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    markCanvasFailure(canvas, "Canvas is unavailable in this browser.");
    return null;
  }

  return context;
}

function intersectRayCircle(origin, direction, center, radius, maxDistance = Infinity) {
  const offset = subtract2(origin, center);
  const b = 2 * dot2(offset, direction);
  const c = dot2(offset, offset) - radius * radius;
  const discriminant = b * b - 4 * c;
  if (discriminant < 0) {
    return null;
  }

  const root = Math.sqrt(discriminant);
  const near = (-b - root) * 0.5;
  const far = (-b + root) * 0.5;
  const t = near > 0.0001 ? near : far > 0.0001 ? far : null;
  if (t === null || t > maxDistance) {
    return null;
  }

  const point = add2(origin, scale2(direction, t));
  return {
    t,
    point,
    normal: normalize2(subtract2(point, center)),
  };
}

function buildCompareScene(overrides = {}) {
  const sampleValue =
    overrides.sample !== undefined ? overrides.sample : Number(compareControls.sample?.value || 50) / 100;
  const driftValue =
    overrides.drift !== undefined ? overrides.drift : Number(compareControls.drift?.value || 0) / 100;
  const camera = [0, -1.02];
  const screenY = -0.56;
  const screenHalfWidth = 0.84;
  const sampleX = lerp(-screenHalfWidth * 0.9, screenHalfWidth * 0.9, sampleValue);
  const light = [0.88, 0.88];

  const objects = [
    {
      name: "near shape",
      center: [-0.22 + driftValue * 0.46, 0.04 + driftValue * 0.06],
      radius: 0.28,
      fill: "rgba(58, 185, 229, 0.78)",
      stroke: "rgba(166, 241, 255, 0.98)",
      solid: "#34b3de",
    },
    {
      name: "far shape",
      center: [0.24 - driftValue * 0.12, 0.34],
      radius: 0.38,
      fill: "rgba(241, 141, 78, 0.74)",
      stroke: "rgba(255, 216, 181, 0.98)",
      solid: "#ef8d4e",
    },
  ];

  const screenPoint = [sampleX, screenY];
  const primaryDirection = normalize2(subtract2(screenPoint, camera));
  let primaryHit = null;

  for (const object of objects) {
    const hit = intersectRayCircle(camera, primaryDirection, object.center, object.radius);
    if (!hit) {
      continue;
    }

    if (!primaryHit || hit.t < primaryHit.t) {
      primaryHit = {
        ...hit,
        object,
      };
    }
  }

  let shadowQuery = null;
  let reflectionQuery = null;
  let primaryEnd = add2(camera, scale2(primaryDirection, 2.4));

  if (primaryHit) {
    primaryEnd = primaryHit.point;

    const reflectionDirection = normalize2(reflect2(primaryDirection, primaryHit.normal));
    reflectionQuery = {
      direction: reflectionDirection,
      end: add2(primaryHit.point, scale2(reflectionDirection, 0.9)),
    };

    const toLight = subtract2(light, primaryHit.point);
    const lightDistance = Math.hypot(toLight[0], toLight[1]) || 1;
    const shadowDirection = scale2(toLight, 1 / lightDistance);
    let blocker = null;

    for (const object of objects) {
      if (object === primaryHit.object) {
        continue;
      }

      const hit = intersectRayCircle(
        add2(primaryHit.point, scale2(shadowDirection, 0.02)),
        shadowDirection,
        object.center,
        object.radius,
        lightDistance
      );

      if (!hit) {
        continue;
      }

      if (!blocker || hit.t < blocker.t) {
        blocker = {
          ...hit,
          object,
        };
      }
    }

    shadowQuery = {
      direction: shadowDirection,
      light,
      blocked: blocker,
    };
  }

  const projectedObjects = objects
    .map((object) => {
      const projectionScale = (screenY - camera[1]) / (object.center[1] - camera[1]);
      return {
        ...object,
        screenX: camera[0] + (object.center[0] - camera[0]) * projectionScale,
        screenRadius: object.radius * projectionScale,
        depth: object.center[1] - camera[1],
      };
    })
    .sort((a, b) => b.depth - a.depth);

  return {
    camera,
    screenY,
    screenHalfWidth,
    screenPoint,
    light,
    objects,
    projectedObjects,
    primaryDirection,
    primaryHit,
    primaryEnd,
    shadowQuery,
    reflectionQuery,
  };
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
precision mediump float;

attribute vec3 aPosition;
attribute vec3 aColor;
uniform mat4 uMatrix;
varying mediump vec3 vColor;

void main() {
  vColor = aColor;
  gl_Position = uMatrix * vec4(aPosition, 1.0);
}
`;

const lineFragmentSource = `
precision mediump float;
varying mediump vec3 vColor;

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
precision mediump float;

attribute vec3 aPosition;
attribute vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;

varying mediump vec3 vWorldPosition;
varying mediump vec3 vNormal;

void main() {
  vec4 worldPosition = uModel * vec4(aPosition, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  gl_Position = uProjection * uView * worldPosition;
}
`;

const litFragmentSource = `
precision mediump float;

varying mediump vec3 vWorldPosition;
varying mediump vec3 vNormal;

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
precision mediump float;

attribute vec3 aPosition;
attribute vec2 aUv;

uniform mat4 uViewProjection;
uniform float uTime;
uniform float uAmplitude;

varying mediump vec2 vUv;
varying mediump float vWave;

void main() {
  float wave = sin((aPosition.x * 3.4) + uTime * 0.65) *
               cos((aPosition.z * 2.45) - uTime * 0.33);
  vec3 displaced = aPosition + vec3(0.0, wave * uAmplitude, 0.0);
  vUv = aUv;
  vWave = wave;
  gl_Position = uViewProjection * vec4(displaced, 1.0);
}
`;

const waveFragmentSource = `
precision mediump float;

varying mediump vec2 vUv;
varying mediump float vWave;

uniform float uTime;
uniform float uStripeDensity;
uniform float uShift;

void main() {
  float stripes = 0.5 + 0.5 * sin(vUv.x * (uStripeDensity * 3.6) + uTime * 1.2 + vWave * 3.4);
  float bands = 0.5 + 0.5 * sin(vUv.y * 24.0 - uTime * 0.85 + uShift * 5.0);

  vec3 cool = vec3(0.10, 0.53, 0.70);
  vec3 mint = vec3(0.14, 0.83, 0.66);
  vec3 warm = vec3(0.95, 0.63, 0.34);
  vec3 dusk = vec3(0.32, 0.16, 0.47);

  vec3 mixA = mix(cool, mint, 0.5 + 0.5 * vWave);
  vec3 mixB = mix(dusk, warm, bands);
  vec3 color = mix(mixA, mixB, stripes * 0.55 + 0.15);

  vec2 centeredUv = vUv - vec2(0.5);
  float vignette = 1.0 - smoothstep(0.18, 0.78, length(centeredUv));
  gl_FragColor = vec4(color * vignette, 1.0);
}
`;

const texturedVertexSource = `
precision mediump float;

attribute vec3 aPosition;
attribute vec2 aUv;

uniform mat4 uModel;
uniform mat4 uViewProjection;

varying mediump vec2 vUv;

void main() {
  vUv = aUv;
  gl_Position = uViewProjection * uModel * vec4(aPosition, 1.0);
}
`;

const texturedFragmentSource = `
precision mediump float;

varying mediump vec2 vUv;

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
precision mediump float;

attribute vec3 aPosition;
attribute vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;

varying mediump vec3 vWorldPosition;
varying mediump vec3 vNormal;

void main() {
  vec4 worldPosition = uModel * vec4(aPosition, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  gl_Position = uProjection * uView * worldPosition;
}
`;

const materialFragmentSource = `
precision mediump float;

varying mediump vec3 vWorldPosition;
varying mediump vec3 vNormal;

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
precision mediump float;

attribute vec2 aPosition;
attribute vec2 aUv;

varying mediump vec2 vUv;

void main() {
  vUv = aUv;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const colorFragmentSource = `
precision mediump float;

varying mediump vec2 vUv;

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

function setupSpaceContractDemo() {
  const canvas = document.getElementById("space-contract-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const stageColors = ["#f7a04a", "#f4c16e", "#9fd7ff", "#73ddd5"];
  const stageNames = ["Object", "World", "View", "Clip"];
  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.14 : time * 0.7;
      const object = [
        0.82 + Math.sin(phase * 0.92) * 0.18,
        0.42 + Math.cos(phase * 1.06) * 0.12,
        1.04 + Math.sin(phase * 0.64) * 0.14,
        1,
      ];
      const model = mat4Multiply(
        mat4Translation(1.1, -0.18, -0.64),
        mat4Multiply(mat4RotationY(0.42 + Math.sin(phase * 0.56) * 0.14), mat4RotationX(-0.24))
      );
      const view = mat4LookAt([1.95, 1.2, 4.04], [0.35, 0.1, 0], [0, 1, 0]);
      const projection = mat4Perspective(degreesToRadians(52), 1.25, 0.1, 20);
      const world = transformPoint(model, object);
      const viewPoint = transformPoint(view, world);
      const clip = transformPoint(projection, viewPoint);
      const stages = [object, world, viewPoint, clip];
      const margin = 18;
      const gap = 16;
      const panelWidth = (width - margin * 2 - gap) / 2;
      const panelHeight = (height - margin * 2 - gap) / 2;
      const rects = [
        { x: margin, y: margin, width: panelWidth, height: panelHeight },
        { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
        { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight },
        { x: margin + panelWidth + gap, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight },
      ];

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);

      for (let index = 0; index < rects.length; index += 1) {
        const rect = rects[index];
        const stage = stages[index];
        const isClip = index === 3;
        const extentX = isClip ? Math.max(1.25, Math.abs(stage[3]) * 1.18, Math.abs(stage[0]) * 1.1) : Math.max(1.4, Math.abs(stage[0]) * 1.2);
        const extentY = isClip ? Math.max(1.25, Math.abs(stage[3]) * 1.18, Math.abs(stage[1]) * 1.1) : Math.max(1.35, Math.abs(stage[1]) * 1.22);
        drawLessonCanvasPanel(ctx, rect, stageNames[index], width);
        drawRectAxesGrid(ctx, rect, extentX, extentY, width);

        if (isClip) {
          const clipW = Math.max(Math.abs(stage[3]), 0.25);
          const topLeft = projectRectPoint(rect, [-clipW, clipW], extentX, extentY);
          const bottomRight = projectRectPoint(rect, [clipW, -clipW], extentX, extentY);
          ctx.strokeStyle = "rgba(255, 223, 132, 0.92)";
          ctx.lineWidth = Math.max(1.8, width * 0.0028);
          ctx.strokeRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
        }

        const pointCanvas = projectRectPoint(rect, stage, extentX, extentY);
        drawCanvasDot(ctx, pointCanvas, Math.max(6, width * 0.0072), stageColors[index]);
      }
    },
  });
}

function setupCameraFrameStoryDemo() {
  const canvas = document.getElementById("camera-frame-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const worldPoints = [
    { point: [0.72, 0.28], color: "rgba(247, 160, 74, 0.96)" },
    { point: [-0.84, -0.38], color: "rgba(159, 215, 255, 0.96)" },
    { point: [1.38, -0.54], color: "rgba(115, 221, 213, 0.96)" },
  ];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.08 : time * 0.72;
      const margin = 18;
      const gap = 16;
      const stacked = width < 760;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap) / 2;
      const panelHeight = stacked ? (height - margin * 2 - gap) / 2 : height - margin * 2;
      const worldRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const viewRect = stacked
        ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
        : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };
      const camera = [-1.18 + Math.sin(phase * 0.86) * 0.72, -0.64 + Math.cos(phase * 0.58) * 0.18];
      const target = [0.74, 0.22];
      const cameraAngle = Math.atan2(target[1] - camera[1], target[0] - camera[0]);
      const extentX = 2.8;
      const extentY = 2.25;

      function toView(point) {
        return rotate2(subtract2(point, camera), -cameraAngle);
      }

      function drawWorldPanel(rect) {
        drawLessonCanvasPanel(ctx, rect, "World", width);
        drawRectAxesGrid(ctx, rect, extentX, extentY, width);
        const cameraCanvas = projectRectPoint(rect, camera, extentX, extentY);
        const targetCanvas = projectRectPoint(rect, target, extentX, extentY);
        ctx.setLineDash([8, 6]);
        drawArrow2d(ctx, cameraCanvas, targetCanvas, "rgba(255, 223, 132, 0.82)", Math.max(1.8, width * 0.0028));
        ctx.setLineDash([]);
        drawCameraGlyph(ctx, cameraCanvas, cameraAngle, Math.max(10, width * 0.013), "rgba(255, 223, 132, 0.9)");
        for (const entry of worldPoints) {
          drawCanvasDot(
            ctx,
            projectRectPoint(rect, entry.point, extentX, extentY),
            Math.max(5, width * 0.006),
            entry.color
          );
        }
      }

      function drawViewPanel(rect) {
        drawLessonCanvasPanel(ctx, rect, "View", width);
        const origin = drawRectAxesGrid(ctx, rect, extentX, extentY, width);
        const viewTarget = toView(target);
        ctx.setLineDash([8, 6]);
        drawArrow2d(ctx, origin, projectRectPoint(rect, viewTarget, extentX, extentY), "rgba(255, 223, 132, 0.82)", Math.max(1.8, width * 0.0028));
        ctx.setLineDash([]);
        drawCameraGlyph(ctx, origin, 0, Math.max(10, width * 0.013), "rgba(255, 223, 132, 0.9)");
        for (const entry of worldPoints) {
          drawCanvasDot(
            ctx,
            projectRectPoint(rect, toView(entry.point), extentX, extentY),
            Math.max(5, width * 0.006),
            entry.color
          );
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawWorldPanel(worldRect);
      drawViewPanel(viewRect);
    },
  });
}

function setupWorkedExampleStoryDemo() {
  const canvas = document.getElementById("worked-example-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const stageNames = ["Object", "World", "View", "Clip", "NDC"];
  const stageColors = ["#f7a04a", "#f4c16e", "#9fd7ff", "#f8b37d", "#73ddd5"];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 0.6 : time * 0.72;
      const object = [
        0.82 + Math.sin(phase * 0.84) * 0.14,
        0.36 + Math.cos(phase * 1.06) * 0.12,
        1.02 + Math.sin(phase * 0.58) * 0.12,
        1,
      ];
      const model = mat4Multiply(
        mat4Translation(1.18, -0.16, -0.68),
        mat4Multiply(mat4RotationY(0.44 + Math.sin(phase * 0.5) * 0.12), mat4RotationX(-0.24))
      );
      const view = mat4LookAt([1.95, 1.2, 4.05], [0.35, 0.1, 0], [0, 1, 0]);
      const projection = mat4Perspective(degreesToRadians(52), 1.2, 0.1, 20);
      const world = transformPoint(model, object);
      const viewPoint = transformPoint(view, world);
      const clip = transformPoint(projection, viewPoint);
      const safeW = Math.abs(clip[3]) < 1e-6 ? 1e-6 : clip[3];
      const ndc = [clip[0] / safeW, clip[1] / safeW, clip[2] / safeW];
      const stages = [object, world, viewPoint, clip, ndc];
      const currentStage = prefersReducedMotion ? 2 : Math.floor((time * 0.72) % stages.length);
      const margin = 18;
      const gap = 14;
      const footerHeight = 0;
      const columns = width >= 980 ? 5 : 3;
      const rows = Math.ceil(stages.length / columns);
      const boxWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
      const boxHeight = (height - margin * 2 - footerHeight - gap * (rows - 1)) / rows;
      const rects = [];

      for (let index = 0; index < stages.length; index += 1) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        rects.push({
          x: margin + column * (boxWidth + gap),
          y: margin + row * (boxHeight + gap),
          width: boxWidth,
          height: boxHeight,
        });
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);

      if (rows === 1) {
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
        for (let index = 0; index < rects.length - 1; index += 1) {
          const left = rects[index];
          const right = rects[index + 1];
          const start = [left.x + left.width + 6, left.y + left.height * 0.5];
          const end = [right.x - 6, right.y + right.height * 0.5];
          drawArrow2d(ctx, start, end, "rgba(255, 255, 255, 0.16)", Math.max(1.4, width * 0.0024));
        }
      }

      for (let index = 0; index < rects.length; index += 1) {
        const rect = rects[index];
        const stage = stages[index];
        const isClip = index === 3;
        const isNdc = index === 4;
        const isActive = index === currentStage;
        const extentX = isNdc ? 1.1 : isClip ? Math.max(1.2, Math.abs(stage[3]) * 1.15, Math.abs(stage[0]) * 1.1) : Math.max(1.35, Math.abs(stage[0]) * 1.2);
        const extentY = isNdc ? 1.1 : isClip ? Math.max(1.2, Math.abs(stage[3]) * 1.15, Math.abs(stage[1]) * 1.1) : Math.max(1.35, Math.abs(stage[1]) * 1.2);

        ctx.fillStyle = isActive ? "rgba(255, 255, 255, 0.1)" : "rgba(8, 21, 30, 0.22)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = isActive ? "rgba(255, 245, 216, 0.82)" : "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = isActive ? Math.max(2, width * 0.003) : 1;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(stageNames[index], rect.x + 12, rect.y + 18);

        drawRectAxesGrid(ctx, rect, extentX, extentY, width, 0.62);
        if (isClip) {
          const clipW = Math.max(Math.abs(stage[3]), 0.25);
          const topLeft = projectRectPoint(rect, [-clipW, clipW], extentX, extentY, 16, 24, 0.62);
          const bottomRight = projectRectPoint(rect, [clipW, -clipW], extentX, extentY, 16, 24, 0.62);
          ctx.strokeStyle = "rgba(248, 179, 125, 0.9)";
          ctx.lineWidth = Math.max(1.6, width * 0.0026);
          ctx.strokeRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
        }
        if (isNdc) {
          const topLeft = projectRectPoint(rect, [-1, 1], extentX, extentY, 16, 24, 0.62);
          const bottomRight = projectRectPoint(rect, [1, -1], extentX, extentY, 16, 24, 0.62);
          ctx.strokeStyle = "rgba(115, 221, 213, 0.9)";
          ctx.lineWidth = Math.max(1.6, width * 0.0026);
          ctx.strokeRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
        }

        const pointCanvas = projectRectPoint(rect, stage, extentX, extentY, 16, 24, 0.62);
        drawCanvasDot(
          ctx,
          pointCanvas,
          Math.max(5.5, width * 0.0066),
          stageColors[index],
          isActive ? "rgba(255, 245, 216, 0.96)" : "",
          Math.max(2, width * 0.0028)
        );
      }
    },
  });
}

function setupGameSpacesStoryDemo() {
  const canvas = document.getElementById("game-spaces-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const shipLocal = [
    [-0.7, -0.34],
    [0.86, 0],
    [-0.7, 0.34],
    [-0.22, 0],
  ];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.12 : time * 0.76;
      const margin = 18;
      const gap = 16;
      const stacked = width < 920;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap * 2) / 3;
      const panelHeight = stacked ? (height - margin * 2 - gap * 2) / 3 : height - margin * 2;
      const objectRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const worldRect = stacked
        ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
        : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };
      const viewRect = stacked
        ? { x: margin, y: margin + (panelHeight + gap) * 2, width: panelWidth, height: panelHeight }
        : { x: margin + (panelWidth + gap) * 2, y: margin, width: panelWidth, height: panelHeight };
      const worldExtentX = 3.8;
      const worldExtentY = 2.8;
      const objectExtentX = 2.1;
      const objectExtentY = 1.6;

      const shipWorld = [
        0.42 + Math.cos(phase * 0.86) * 1.12,
        -0.1 + Math.sin(phase * 0.94) * 0.84,
      ];
      const shipVelocity = [
        -Math.sin(phase * 0.86) * 1.12 * 0.86,
        Math.cos(phase * 0.94) * 0.84 * 0.94,
      ];
      const shipForward = normalize2(shipVelocity);
      const shipAngle = Math.atan2(shipForward[1], shipForward[0]);
      const cameraWorld = add2(shipWorld, rotate2([-1.26, -0.22], shipAngle));
      const pickupWorld = [
        1.92 + Math.cos(phase * 0.44) * 0.28,
        1.02 + Math.sin(phase * 0.58) * 0.22,
      ];
      const enemyWorld = [
        -1.48 + Math.sin(phase * 0.62) * 0.34,
        1.18 + Math.cos(phase * 0.52) * 0.2,
      ];

      function worldToView(point) {
        return rotate2(subtract2(point, cameraWorld), -shipAngle);
      }

      function projectInRect(rect, point, extentX, extentY) {
        return projectRectPoint(rect, point, extentX, extentY, 16, 22, 0.6);
      }

      function drawShip(rect, center, angle, extentX, extentY, fill, stroke) {
        const points = shipLocal.map((point) => add2(center, rotate2(point, angle)));
        ctx.beginPath();
        for (let index = 0; index < points.length; index += 1) {
          const projected = projectInRect(rect, points[index], extentX, extentY);
          if (index === 0) {
            ctx.moveTo(projected[0], projected[1]);
          } else {
            ctx.lineTo(projected[0], projected[1]);
          }
        }
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = Math.max(1.8, width * 0.0028);
        ctx.fill();
        ctx.stroke();
      }

      function drawPickup(rect, point, extentX, extentY, color) {
        const p = projectInRect(rect, point, extentX, extentY);
        ctx.save();
        ctx.translate(p[0], p[1]);
        ctx.rotate(phase * 0.8);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.8, width * 0.0026);
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 10);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      function drawPanelBackground(rect, title, extentX, extentY) {
        drawLessonCanvasPanel(ctx, rect, title, width);
        drawRectAxesGrid(ctx, rect, extentX, extentY, width, 0.6);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);

      drawPanelBackground(objectRect, "Object", objectExtentX, objectExtentY);
      drawShip(objectRect, [0, 0], 0, objectExtentX, objectExtentY, "rgba(247, 160, 74, 0.24)", "rgba(247, 160, 74, 0.96)");
      const objectOrigin = projectInRect(objectRect, [0, 0], objectExtentX, objectExtentY);
      drawArrow2d(
        ctx,
        objectOrigin,
        projectInRect(objectRect, [1.18, 0], objectExtentX, objectExtentY),
        "rgba(247, 160, 74, 0.94)",
        Math.max(2.1, width * 0.003)
      );
      drawArrow2d(
        ctx,
        objectOrigin,
        projectInRect(objectRect, [0, 0.96], objectExtentX, objectExtentY),
        "rgba(115, 221, 213, 0.94)",
        Math.max(2.1, width * 0.003)
      );
      drawPanelBackground(worldRect, "World", worldExtentX, worldExtentY);
      drawShip(worldRect, shipWorld, shipAngle, worldExtentX, worldExtentY, "rgba(247, 160, 74, 0.22)", "rgba(247, 160, 74, 0.96)");
      drawPickup(worldRect, pickupWorld, worldExtentX, worldExtentY, "rgba(115, 221, 213, 0.94)");
      drawPickup(worldRect, enemyWorld, worldExtentX, worldExtentY, "rgba(159, 215, 255, 0.92)");
      const shipWorldCanvas = projectInRect(worldRect, shipWorld, worldExtentX, worldExtentY);
      const cameraWorldCanvas = projectInRect(worldRect, cameraWorld, worldExtentX, worldExtentY);
      drawCameraGlyph(ctx, cameraWorldCanvas, shipAngle, Math.max(9, width * 0.0115), "rgba(255, 223, 132, 0.88)");
      ctx.setLineDash([8, 6]);
      drawArrow2d(ctx, cameraWorldCanvas, shipWorldCanvas, "rgba(255, 223, 132, 0.82)", Math.max(1.8, width * 0.0027));
      ctx.setLineDash([]);

      drawPanelBackground(viewRect, "View", worldExtentX, worldExtentY);
      const cameraOrigin = projectInRect(viewRect, [0, 0], worldExtentX, worldExtentY);
      drawCameraGlyph(ctx, cameraOrigin, 0, Math.max(9, width * 0.0115), "rgba(255, 223, 132, 0.88)");
      drawShip(
        viewRect,
        worldToView(shipWorld),
        0,
        worldExtentX,
        worldExtentY,
        "rgba(247, 160, 74, 0.22)",
        "rgba(247, 160, 74, 0.96)"
      );
      drawPickup(viewRect, worldToView(pickupWorld), worldExtentX, worldExtentY, "rgba(115, 221, 213, 0.94)");
      drawPickup(viewRect, worldToView(enemyWorld), worldExtentX, worldExtentY, "rgba(159, 215, 255, 0.92)");
      ctx.setLineDash([8, 6]);
      drawArrow2d(
        ctx,
        cameraOrigin,
        projectInRect(viewRect, worldToView(shipWorld), worldExtentX, worldExtentY),
        "rgba(255, 223, 132, 0.82)",
        Math.max(1.8, width * 0.0027)
      );
      ctx.setLineDash([]);
    },
  });
}

function setupSpaceAttachmentUseDemo() {
  const canvas = document.getElementById("space-attachment-use-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const shipLocal = [
    [-0.72, -0.32],
    [0.88, 0],
    [-0.72, 0.32],
    [-0.24, 0],
  ];
  const socketLocal = [0.54, 0];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.12 : time * 0.8;
      const margin = 18;
      const gap = 14;
      const panelWidth = (width - margin * 2 - gap) / 2;
      const panelHeight = height - margin * 2;
      const leftRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const rightRect = { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };
      const worldCenter = [0.12 + Math.cos(phase * 0.74) * 0.44, -0.04 + Math.sin(phase * 0.66) * 0.34];
      const shipAngle = phase * 0.86;
      const socketWorld = add2(worldCenter, rotate2(socketLocal, shipAngle));
      const fontSize = Math.max(10, width * 0.013);

      function project(rect, point, extentX, extentY) {
        return projectRectPoint(rect, point, extentX, extentY, 14, 18, 0.6);
      }

      function drawShip(rect, center, angle, extentX, extentY, fill, stroke) {
        ctx.beginPath();
        for (let index = 0; index < shipLocal.length; index += 1) {
          const point = add2(center, rotate2(shipLocal[index], angle));
          const projected = project(rect, point, extentX, extentY);
          if (index === 0) {
            ctx.moveTo(projected[0], projected[1]);
          } else {
            ctx.lineTo(projected[0], projected[1]);
          }
        }
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = Math.max(1.8, width * 0.0028);
        ctx.fill();
        ctx.stroke();
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);

      drawLessonCanvasPanel(ctx, leftRect, "Local", width);
      drawRectAxesGrid(ctx, leftRect, 1.9, 1.6, width, 0.6);
      drawShip(leftRect, [0, 0], 0, 1.9, 1.6, "rgba(247, 160, 74, 0.22)", "rgba(247, 160, 74, 0.96)");
      const localOrigin = project(leftRect, [0, 0], 1.9, 1.6);
      const localSocketCanvas = project(leftRect, socketLocal, 1.9, 1.6);
      drawArrow2d(ctx, localOrigin, localSocketCanvas, "rgba(115, 221, 213, 0.96)", Math.max(2.1, width * 0.003));
      drawCanvasDot(ctx, localSocketCanvas, Math.max(5.5, width * 0.0065), "rgba(115, 221, 213, 0.96)");
      drawCanvasChip(ctx, "socket", localSocketCanvas[0] + 16, localSocketCanvas[1] - 14, {
        fontSize,
        color: "rgba(115, 221, 213, 0.98)",
      });

      drawLessonCanvasPanel(ctx, rightRect, "World", width);
      drawRectAxesGrid(ctx, rightRect, 2.6, 2.1, width, 0.6);
      ctx.strokeStyle = "rgba(255, 223, 132, 0.22)";
      ctx.lineWidth = Math.max(1.3, width * 0.0022);
      ctx.beginPath();
      for (let step = 0; step <= 18; step += 1) {
        const samplePhase = phase - (18 - step) * 0.12;
        const sampleCenter = [
          0.12 + Math.cos(samplePhase * 0.74) * 0.44,
          -0.04 + Math.sin(samplePhase * 0.66) * 0.34,
        ];
        const sampleSocket = add2(sampleCenter, rotate2(socketLocal, samplePhase * 0.86));
        const projected = project(rightRect, sampleSocket, 2.6, 2.1);
        if (step === 0) {
          ctx.moveTo(projected[0], projected[1]);
        } else {
          ctx.lineTo(projected[0], projected[1]);
        }
      }
      ctx.stroke();
      drawShip(rightRect, worldCenter, shipAngle, 2.6, 2.1, "rgba(247, 160, 74, 0.22)", "rgba(247, 160, 74, 0.96)");
      const socketWorldCanvas = project(rightRect, socketWorld, 2.6, 2.1);
      drawCanvasDot(
        ctx,
        socketWorldCanvas,
        Math.max(6, width * 0.007),
        "rgba(115, 221, 213, 0.98)",
        "rgba(239, 245, 247, 0.94)",
        Math.max(1.6, width * 0.0023)
      );
      drawCanvasChip(ctx, "M*socket", socketWorldCanvas[0] + 18, socketWorldCanvas[1] - 14, {
        fontSize,
        color: "rgba(115, 221, 213, 0.98)",
      });
    },
  });
}

function setupSpaceWorldUseDemo() {
  const canvas = document.getElementById("space-world-use-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.06 : time * 0.8;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const extentX = 3.7;
      const extentY = 2.9;
      const player = [
        -1.52 + Math.cos(phase * 0.74) * 0.4,
        -0.56 + Math.sin(phase * 0.86) * 0.28,
      ];
      const enemy = [
        0.98 + Math.sin(phase * 0.58) * 0.62,
        0.96 + Math.cos(phase * 0.66) * 0.42,
      ];
      const delta = subtract2(enemy, player);
      const distance = Math.hypot(delta[0], delta[1]);
      const inRange = distance < 2.4;
      const color = inRange ? "rgba(115, 221, 213, 0.98)" : "rgba(247, 160, 74, 0.98)";
      const fontSize = Math.max(10, width * 0.013);

      function project(point) {
        return projectRectPoint(rect, point, extentX, extentY, 16, 20, 0.6);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawLessonCanvasPanel(ctx, rect, "Shared scene", width);
      drawRectAxesGrid(ctx, rect, extentX, extentY, width, 0.6);

      const playerCanvas = project(player);
      const enemyCanvas = project(enemy);
      const rangeEdge = project(add2(player, [2.4, 0]));
      ctx.strokeStyle = "rgba(255, 223, 132, 0.24)";
      ctx.lineWidth = Math.max(1.3, width * 0.0023);
      ctx.beginPath();
      ctx.arc(playerCanvas[0], playerCanvas[1], Math.abs(rangeEdge[0] - playerCanvas[0]), 0, TAU);
      ctx.stroke();

      drawArrow2d(ctx, playerCanvas, enemyCanvas, color, Math.max(2.2, width * 0.003));
      drawCanvasDot(ctx, playerCanvas, Math.max(8, width * 0.0092), "rgba(247, 160, 74, 0.96)");
      drawCanvasDot(ctx, enemyCanvas, Math.max(8, width * 0.0092), "rgba(159, 215, 255, 0.96)");
      drawCanvasChip(ctx, `d ${formatNumber(distance, 2)}`, (playerCanvas[0] + enemyCanvas[0]) * 0.5, (playerCanvas[1] + enemyCanvas[1]) * 0.5 - 14, {
        fontSize,
        color,
      });
    },
  });
}

function setupSpaceViewUseDemo() {
  const canvas = document.getElementById("space-view-use-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.12 : time * 0.82;
      const margin = 18;
      const gap = 14;
      const panelWidth = (width - margin * 2 - gap) / 2;
      const panelHeight = height - margin * 2;
      const leftRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const rightRect = { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };
      const camera = [
        0.34 + Math.cos(phase * 0.58) * 0.46,
        -0.24 + Math.sin(phase * 0.74) * 0.24,
      ];
      const cameraAngle = 0.28 + Math.sin(phase * 0.66) * 0.54;
      const targetWorld = [
        1.92 + Math.cos(phase * 0.42) * 0.34,
        0.78 + Math.sin(phase * 0.54) * 0.28,
      ];
      const targetView = rotate2(subtract2(targetWorld, camera), -cameraAngle);
      const fontSize = Math.max(10, width * 0.013);

      function project(rect, point, extentX, extentY) {
        return projectRectPoint(rect, point, extentX, extentY, 14, 18, 0.6);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);

      drawLessonCanvasPanel(ctx, leftRect, "World", width);
      drawRectAxesGrid(ctx, leftRect, 3.2, 2.4, width, 0.6);
      const cameraWorldCanvas = project(leftRect, camera, 3.2, 2.4);
      const targetWorldCanvas = project(leftRect, targetWorld, 3.2, 2.4);
      drawCameraGlyph(ctx, cameraWorldCanvas, cameraAngle, Math.max(9, width * 0.011), "rgba(255, 223, 132, 0.9)");
      drawArrow2d(ctx, cameraWorldCanvas, targetWorldCanvas, "rgba(115, 221, 213, 0.9)", Math.max(2.1, width * 0.0029));
      drawCanvasDot(ctx, targetWorldCanvas, Math.max(7, width * 0.0082), "rgba(159, 215, 255, 0.96)");

      drawLessonCanvasPanel(ctx, rightRect, "View", width);
      drawRectAxesGrid(ctx, rightRect, 3.2, 2.4, width, 0.6);
      const cameraOrigin = project(rightRect, [0, 0], 3.2, 2.4);
      const targetViewCanvas = project(rightRect, targetView, 3.2, 2.4);
      drawCameraGlyph(ctx, cameraOrigin, 0, Math.max(9, width * 0.011), "rgba(255, 223, 132, 0.9)");
      drawArrow2d(ctx, cameraOrigin, targetViewCanvas, "rgba(115, 221, 213, 0.9)", Math.max(2.1, width * 0.0029));
      drawCanvasDot(ctx, targetViewCanvas, Math.max(7, width * 0.0082), "rgba(159, 215, 255, 0.96)");
      drawCanvasChip(ctx, "camera at 0", cameraOrigin[0] + 18, cameraOrigin[1] - 16, {
        fontSize,
        color: "rgba(255, 223, 132, 0.98)",
      });
    },
  });
}

function setupSpaceScreenUseDemo() {
  const canvas = document.getElementById("space-screen-use-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.08 : time * 0.84;
      const margin = 18;
      const gap = 14;
      const panelWidth = (width - margin * 2 - gap) / 2;
      const panelHeight = height - margin * 2;
      const leftRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const rightRect = { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };
      const ndc = [
        Math.sin(phase * 0.82) * 0.78,
        Math.cos(phase * 0.64) * 0.72,
      ];
      const cols = 8;
      const rows = 6;
      const pixel = [
        (ndc[0] * 0.5 + 0.5) * cols,
        (1 - (ndc[1] * 0.5 + 0.5)) * rows,
      ];
      const cell = [
        Math.min(cols - 1, Math.max(0, Math.floor(pixel[0]))),
        Math.min(rows - 1, Math.max(0, Math.floor(pixel[1]))),
      ];
      const fontSize = Math.max(10, width * 0.012);

      function projectNdc(rect, point) {
        return projectRectPoint(rect, point, 1.15, 1.15, 14, 18, 0.6);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);

      drawLessonCanvasPanel(ctx, leftRect, "NDC", width);
      drawRectAxesGrid(ctx, leftRect, 1.15, 1.15, width, 0.6);
      const ndcTopLeft = projectNdc(leftRect, [-1, 1]);
      const ndcBottomRight = projectNdc(leftRect, [1, -1]);
      ctx.strokeStyle = "rgba(115, 221, 213, 0.9)";
      ctx.lineWidth = Math.max(1.6, width * 0.0025);
      ctx.strokeRect(
        ndcTopLeft[0],
        ndcTopLeft[1],
        ndcBottomRight[0] - ndcTopLeft[0],
        ndcBottomRight[1] - ndcTopLeft[1]
      );
      const ndcPoint = projectNdc(leftRect, ndc);
      drawCanvasDot(ctx, ndcPoint, Math.max(6, width * 0.0072), "rgba(115, 221, 213, 0.98)");

      drawLessonCanvasPanel(ctx, rightRect, "Pixels", width);
      const plot = { x: rightRect.x + 16, y: rightRect.y + 34, width: rightRect.width - 32, height: rightRect.height - 48 };
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= cols; x += 1) {
        const px = plot.x + (plot.width / cols) * x;
        ctx.beginPath();
        ctx.moveTo(px, plot.y);
        ctx.lineTo(px, plot.y + plot.height);
        ctx.stroke();
      }
      for (let y = 0; y <= rows; y += 1) {
        const py = plot.y + (plot.height / rows) * y;
        ctx.beginPath();
        ctx.moveTo(plot.x, py);
        ctx.lineTo(plot.x + plot.width, py);
        ctx.stroke();
      }
      const cellWidth = plot.width / cols;
      const cellHeight = plot.height / rows;
      ctx.fillStyle = "rgba(247, 160, 74, 0.28)";
      ctx.fillRect(plot.x + cell[0] * cellWidth, plot.y + cell[1] * cellHeight, cellWidth, cellHeight);
      const pixelPoint = [
        plot.x + (pixel[0] / cols) * plot.width,
        plot.y + (pixel[1] / rows) * plot.height,
      ];
      drawCanvasDot(ctx, pixelPoint, Math.max(5.2, width * 0.0064), "rgba(247, 160, 74, 0.98)");
      drawCanvasChip(ctx, "vp", (leftRect.x + leftRect.width + rightRect.x) * 0.5, height * 0.5, {
        fontSize,
        color: "rgba(255, 245, 216, 0.98)",
      });
    },
  });
}

function setupSpaceMapStoryDemo() {
  const canvas = document.getElementById("space-map-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const stageNames = ["Object", "World", "View", "Clip", "NDC"];
  const transformLabels = ["M", "V", "P", "/w"];
  const stageColors = ["#f7a04a", "#f4c16e", "#9fd7ff", "#f8b37d", "#73ddd5"];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.15 : time * 0.72;
      const object = [
        0.78 + Math.sin(phase * 0.86) * 0.18,
        0.36 + Math.cos(phase * 1.04) * 0.12,
        1.04 + Math.sin(phase * 0.62) * 0.14,
        1,
      ];
      const model = mat4Multiply(
        mat4Translation(1.12, -0.18, -0.62),
        mat4Multiply(mat4RotationY(0.46 + Math.sin(phase * 0.5) * 0.12), mat4RotationX(-0.28))
      );
      const view = mat4LookAt([1.95, 1.25, 4.05], [0.35, 0.1, 0], [0, 1, 0]);
      const projection = mat4Perspective(degreesToRadians(52), Math.max(width / Math.max(height, 1), 1.2), 0.1, 20);
      const world = transformPoint(model, object);
      const viewPoint = transformPoint(view, world);
      const clip = transformPoint(projection, viewPoint);
      const safeW = Math.abs(clip[3]) < 1e-6 ? 1e-6 : clip[3];
      const ndc = [clip[0] / safeW, clip[1] / safeW, clip[2] / safeW];
      const stages = [object, world, viewPoint, clip, ndc];

      const columns = width < 720 ? 3 : 5;
      const gap = 14;
      const margin = 18;
      const rows = Math.ceil(stages.length / columns);
      const boxWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
      const boxHeight = (height - margin * 2 - gap * (rows - 1)) / rows;
      const rects = [];

      for (let index = 0; index < stages.length; index += 1) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        rects.push({
          x: margin + column * (boxWidth + gap),
          y: margin + row * (boxHeight + gap),
          width: boxWidth,
          height: boxHeight,
        });
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#183446");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      if (rows === 1) {
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
        for (let index = 0; index < rects.length - 1; index += 1) {
          const left = rects[index];
          const right = rects[index + 1];
          const startX = left.x + left.width + 6;
          const y = left.y + left.height * 0.5;
          const endX = right.x - 6;

          ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
          ctx.lineWidth = Math.max(1.5, width * 0.0026);
          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
          ctx.stroke();

          const pillWidth = 28;
          const pillX = (startX + endX) * 0.5 - pillWidth * 0.5;
          const pillY = y - 12;
          ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
          ctx.fillRect(pillX, pillY, pillWidth, 24);
          ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
          ctx.fillText(transformLabels[index], pillX + 8, pillY + 16);
        }
      }

      for (let index = 0; index < stages.length; index += 1) {
        const rect = rects[index];
        const stage = stages[index];
        const plotX = rect.x + 12;
        const plotY = rect.y + 30;
        const plotWidth = rect.width - 24;
        const plotHeight = rect.height - 42;

        let extentX = 1.4;
        let extentY = 1.4;
        if (index === 3) {
          extentX = Math.max(1.2, Math.abs(clip[3]) * 1.2, Math.abs(stage[0]) * 1.15);
          extentY = Math.max(1.2, Math.abs(clip[3]) * 1.2, Math.abs(stage[1]) * 1.15);
        } else if (index === 4) {
          extentX = 1.15;
          extentY = 1.15;
        } else {
          extentX = Math.max(1.35, Math.abs(stage[0]) * 1.2, Math.abs(stage[1]) * 1.2);
          extentY = Math.max(1.35, Math.abs(stage[0]) * 0.95, Math.abs(stage[1]) * 1.2);
        }

        function toStageCanvas(point) {
          return [
            plotX + plotWidth * 0.5 + (point[0] / extentX) * (plotWidth * 0.5 - 8),
            plotY + plotHeight * 0.5 - (point[1] / extentY) * (plotHeight * 0.5 - 8),
          ];
        }

        ctx.fillStyle = "rgba(8, 21, 30, 0.24)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
        ctx.font = `${Math.max(10, width * 0.013)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(stageNames[index], rect.x + 12, rect.y + 20);

        const leftAxis = toStageCanvas([-extentX, 0]);
        const rightAxis = toStageCanvas([extentX, 0]);
        const topAxis = toStageCanvas([0, extentY]);
        const bottomAxis = toStageCanvas([0, -extentY]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.beginPath();
        ctx.moveTo(leftAxis[0], leftAxis[1]);
        ctx.lineTo(rightAxis[0], rightAxis[1]);
        ctx.moveTo(topAxis[0], topAxis[1]);
        ctx.lineTo(bottomAxis[0], bottomAxis[1]);
        ctx.stroke();

        if (index === 3) {
          const clipW = Math.max(Math.abs(clip[3]), 0.2);
          const topLeft = toStageCanvas([-clipW, clipW]);
          const bottomRight = toStageCanvas([clipW, -clipW]);
          ctx.strokeStyle = "rgba(248, 179, 125, 0.94)";
          ctx.strokeRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
        }

        if (index === 4) {
          const topLeft = toStageCanvas([-1, 1]);
          const bottomRight = toStageCanvas([1, -1]);
          ctx.strokeStyle = "rgba(115, 221, 213, 0.92)";
          ctx.strokeRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
        }

        const pointCanvas = toStageCanvas(stage);
        ctx.fillStyle = stageColors[index];
        ctx.beginPath();
        ctx.arc(pointCanvas[0], pointCanvas[1], Math.max(4.8, width * 0.0065), 0, TAU);
        ctx.fill();
      }
    },
  });
}

function setupClipStoryDemo() {
  const canvas = document.getElementById("clip-story-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const readouts = {
    view: document.getElementById("clip-story-readout-view"),
    clip: document.getElementById("clip-story-readout-clip"),
    ndc: document.getElementById("clip-story-readout-ndc"),
    pixel: document.getElementById("clip-story-readout-pixel"),
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.2 : time * 0.74;
      const pointView = [
        Math.sin(phase * 0.86) * 0.82,
        0.3 + Math.cos(phase * 1.12) * 0.24,
        -(2.3 + Math.sin(phase * 0.54) * 1.15),
      ];
      const projection = mat4Perspective(degreesToRadians(58), 1.2, 0.5, 6.2);
      const clip = transformPoint(projection, pointView);
      const safeW = Math.abs(clip[3]) < 1e-6 ? 1e-6 : clip[3];
      const ndc = [clip[0] / safeW, clip[1] / safeW, clip[2] / safeW];
      const viewportPoint = [
        (ndc[0] * 0.5 + 0.5) * width,
        (1 - (ndc[1] * 0.5 + 0.5)) * height,
      ];
      const margin = 18;
      const gap = 16;
      const stacked = width < 820;
      const columns = stacked ? 1 : 3;
      const boxWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap * (columns - 1)) / columns;
      const boxHeight = stacked ? (height - margin * 2 - gap * 2) / 3 : height - margin * 2;

      const rects = [
        { x: margin, y: margin, width: boxWidth, height: boxHeight },
        stacked
          ? { x: margin, y: margin + boxHeight + gap, width: boxWidth, height: boxHeight }
          : { x: margin + boxWidth + gap, y: margin, width: boxWidth, height: boxHeight },
        stacked
          ? { x: margin, y: margin + (boxHeight + gap) * 2, width: boxWidth, height: boxHeight }
          : { x: margin + (boxWidth + gap) * 2, y: margin, width: boxWidth, height: boxHeight },
      ];

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      drawLessonCanvasBackground(ctx, width, height);

      function drawConnector(fromRect, toRect, label) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        let start;
        let end;
        if (stacked) {
          start = [fromRect.x + fromRect.width * 0.5, fromRect.y + fromRect.height + 5];
          end = [toRect.x + toRect.width * 0.5, toRect.y - 5];
          drawArrow2d(ctx, start, end, "rgba(255, 255, 255, 0.18)", Math.max(1.6, width * 0.0025));
        } else {
          start = [fromRect.x + fromRect.width + 8, fromRect.y + fromRect.height * 0.5];
          end = [toRect.x - 8, toRect.y + toRect.height * 0.5];
          drawArrow2d(ctx, start, end, "rgba(255, 255, 255, 0.18)", Math.max(1.6, width * 0.0025));
        }
        drawCanvasChip(ctx, label, (start[0] + end[0]) * 0.5, (start[1] + end[1]) * 0.5, {
          fontSize: Math.max(10, width * 0.013),
        });
        ctx.restore();
      }

      function drawPanelFrame(rect, title) {
        drawLessonCanvasPanel(ctx, rect, title, width);
        return {
          x: rect.x + 12,
          y: rect.y + 34,
          width: rect.width - 24,
          height: rect.height - 46,
        };
      }

      drawConnector(rects[0], rects[1], "P");
      drawConnector(rects[1], rects[2], "/w");

      function drawViewSpace(rect) {
        const fov = degreesToRadians(58);
        const near = 0.5;
        const far = 6.2;
        const maxHalfWidth = Math.tan(fov / 2) * far;
        const plot = drawPanelFrame(rect, "View");

        function toCanvas(point) {
          const x = point[0];
          const depth = point[1];
          return [
            plot.x + plot.width * 0.5 + (x / maxHalfWidth) * (plot.width * 0.42),
            plot.y + (depth / far) * plot.height,
          ];
        }

        const eye = toCanvas([0, 0]);
        const nearLeft = toCanvas([-Math.tan(fov / 2) * near, near]);
        const nearRight = toCanvas([Math.tan(fov / 2) * near, near]);
        const farLeft = toCanvas([-Math.tan(fov / 2) * far, far]);
        const farRight = toCanvas([Math.tan(fov / 2) * far, far]);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = Math.max(1.8, width * 0.0028);
        ctx.beginPath();
        ctx.moveTo(eye[0], eye[1]);
        ctx.lineTo(farLeft[0], farLeft[1]);
        ctx.moveTo(eye[0], eye[1]);
        ctx.lineTo(farRight[0], farRight[1]);
        ctx.moveTo(nearLeft[0], nearLeft[1]);
        ctx.lineTo(nearRight[0], nearRight[1]);
        ctx.moveTo(farLeft[0], farLeft[1]);
        ctx.lineTo(farRight[0], farRight[1]);
        ctx.stroke();

        const pointCanvas = toCanvas([pointView[0], -pointView[2]]);
        ctx.fillStyle = "#73ddd5";
        ctx.beginPath();
        ctx.arc(pointCanvas[0], pointCanvas[1], Math.max(6, width * 0.008), 0, TAU);
        ctx.fill();
      }

      function drawClipSpace(rect) {
        const plot = drawPanelFrame(rect, "Clip");
        const extent = Math.max(1.2, Math.abs(clip[3]) * 1.25, Math.abs(clip[0]) * 1.15, Math.abs(clip[1]) * 1.15);

        function toCanvas(point) {
          return [
            plot.x + plot.width * 0.5 + (point[0] / extent) * (plot.width * 0.5 - 8),
            plot.y + plot.height * 0.5 - (point[1] / extent) * (plot.height * 0.5 - 8),
          ];
        }

        const leftAxis = toCanvas([-extent, 0]);
        const rightAxis = toCanvas([extent, 0]);
        const topAxis = toCanvas([0, extent]);
        const bottomAxis = toCanvas([0, -extent]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.beginPath();
        ctx.moveTo(leftAxis[0], leftAxis[1]);
        ctx.lineTo(rightAxis[0], rightAxis[1]);
        ctx.moveTo(topAxis[0], topAxis[1]);
        ctx.lineTo(bottomAxis[0], bottomAxis[1]);
        ctx.stroke();

        const clipW = Math.max(Math.abs(clip[3]), 0.2);
        const topLeft = toCanvas([-clipW, clipW]);
        const bottomRight = toCanvas([clipW, -clipW]);
        ctx.strokeStyle = "rgba(248, 179, 125, 0.94)";
        ctx.lineWidth = Math.max(1.8, width * 0.0028);
        ctx.strokeRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
        drawCanvasChip(ctx, "w-box", plot.x + plot.width - 12, plot.y + 16, {
          align: "right",
          fontSize: Math.max(10, width * 0.0125),
          color: "rgba(248, 179, 125, 0.98)",
        });

        const pointCanvas = toCanvas([clip[0], clip[1]]);
        ctx.fillStyle = "#f8b37d";
        ctx.beginPath();
        ctx.arc(pointCanvas[0], pointCanvas[1], Math.max(6, width * 0.008), 0, TAU);
        ctx.fill();
      }

      function drawNdc(rect) {
        const plot = drawPanelFrame(rect, "NDC");
        const extent = 1.15;

        function toCanvas(point) {
          return [
            plot.x + plot.width * 0.5 + (point[0] / extent) * (plot.width * 0.5 - 8),
            plot.y + plot.height * 0.5 - (point[1] / extent) * (plot.height * 0.5 - 8),
          ];
        }

        const leftAxis = toCanvas([-extent, 0]);
        const rightAxis = toCanvas([extent, 0]);
        const topAxis = toCanvas([0, extent]);
        const bottomAxis = toCanvas([0, -extent]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.beginPath();
        ctx.moveTo(leftAxis[0], leftAxis[1]);
        ctx.lineTo(rightAxis[0], rightAxis[1]);
        ctx.moveTo(topAxis[0], topAxis[1]);
        ctx.lineTo(bottomAxis[0], bottomAxis[1]);
        ctx.stroke();

        const topLeft = toCanvas([-1, 1]);
        const bottomRight = toCanvas([1, -1]);
        ctx.strokeStyle = "rgba(115, 221, 213, 0.92)";
        ctx.lineWidth = Math.max(1.8, width * 0.0028);
        ctx.strokeRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
        drawCanvasChip(ctx, "[-1,1]", plot.x + plot.width - 12, plot.y + 16, {
          align: "right",
          fontSize: Math.max(10, width * 0.0125),
          color: "rgba(115, 221, 213, 0.98)",
        });

        const pointCanvas = toCanvas([ndc[0], ndc[1]]);
        ctx.fillStyle = "#73ddd5";
        ctx.beginPath();
        ctx.arc(pointCanvas[0], pointCanvas[1], Math.max(6, width * 0.008), 0, TAU);
        ctx.fill();
      }

      drawViewSpace(rects[0]);
      drawClipSpace(rects[1]);
      drawNdc(rects[2]);

      if (readouts.view) {
        readouts.view.textContent = formatVector(pointView, 2);
      }
      if (readouts.clip) {
        readouts.clip.textContent = formatVector(clip, 2);
      }
      if (readouts.ndc) {
        readouts.ndc.textContent = formatVector(ndc, 2);
      }
      if (readouts.pixel) {
        readouts.pixel.textContent = `(${Math.round(viewportPoint[0])}, ${Math.round(viewportPoint[1])})`;
      }
    },
  });
}

function setupGameNormalsStoryDemo() {
  const canvas = document.getElementById("game-normals-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.16 : time * 0.84;
      const sceneRect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const extentX = 4.2;
      const extentY = 2.8;
      const flashlight = [-2.5, 0.18 + Math.sin(phase * 0.86) * 0.92];
      const shieldCenter = [1.48, 0];
      const shieldRadius = 1.06;
      const sampleCount = 30;
      const samples = [];
      let best = null;

      function toScene(point) {
        return projectRectPoint(sceneRect, point, extentX, extentY, 18, 22, 0.6);
      }

      for (let index = 0; index <= sampleCount; index += 1) {
        const t = index / sampleCount;
        const phi = -1.08 + t * 2.16;
        const point = [shieldCenter[0] - Math.cos(phi) * shieldRadius, shieldCenter[1] + Math.sin(phi) * shieldRadius];
        const normal = normalize2(subtract2(point, shieldCenter));
        const lightDir = normalize2(subtract2(flashlight, point));
        const brightness = Math.max(dot2(normal, lightDir), 0);
        const sample = { point, normal, lightDir, brightness };
        samples.push(sample);
        if (!best || brightness > best.brightness) {
          best = sample;
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#0f2232", "#182f42");
      drawLessonCanvasPanel(ctx, sceneRect, "Flashlight vs shield", width);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let x = -4; x <= 4; x += 1) {
        const start = toScene([x, -extentY]);
        const end = toScene([x, extentY]);
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
      }
      for (let y = -2; y <= 2; y += 1) {
        const start = toScene([-extentX, y]);
        const end = toScene([extentX, y]);
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
      }

      const floorStart = toScene([-extentX, -1.7]);
      const floorEnd = toScene([extentX, -1.7]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = Math.max(1.6, width * 0.0024);
      ctx.beginPath();
      ctx.moveTo(floorStart[0], floorStart[1]);
      ctx.lineTo(floorEnd[0], floorEnd[1]);
      ctx.stroke();

      const flashCanvas = toScene(flashlight);
      const bestCanvas = toScene(best.point);
      const upperBeam = toScene(samples[Math.max(0, samples.indexOf(best) - 4)].point);
      const lowerBeam = toScene(samples[Math.min(samples.length - 1, samples.indexOf(best) + 4)].point);
      ctx.fillStyle = "rgba(255, 223, 132, 0.08)";
      ctx.beginPath();
      ctx.moveTo(flashCanvas[0], flashCanvas[1]);
      ctx.lineTo(upperBeam[0], upperBeam[1]);
      ctx.lineTo(lowerBeam[0], lowerBeam[1]);
      ctx.closePath();
      ctx.fill();

      for (let index = 0; index < samples.length - 1; index += 1) {
        const a = toScene(samples[index].point);
        const b = toScene(samples[index + 1].point);
        const brightness = (samples[index].brightness + samples[index + 1].brightness) * 0.5;
        ctx.strokeStyle = `rgba(${Math.round(247 - brightness * 32)}, ${Math.round(160 + brightness * 55)}, ${Math.round(74 + brightness * 122)}, 0.95)`;
        ctx.lineWidth = Math.max(12, width * 0.016);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = Math.max(1.2, width * 0.002);
      ctx.beginPath();
      for (let index = 0; index < samples.length; index += 1) {
        const p = toScene(samples[index].point);
        if (index === 0) {
          ctx.moveTo(p[0], p[1]);
        } else {
          ctx.lineTo(p[0], p[1]);
        }
      }
      ctx.stroke();

      drawCanvasDot(ctx, flashCanvas, Math.max(8, width * 0.0094), "rgba(255, 223, 132, 0.96)", "rgba(255, 245, 216, 0.98)", Math.max(1.6, width * 0.0024));
      ctx.fillStyle = "rgba(255, 223, 132, 0.96)";
      ctx.beginPath();
      ctx.moveTo(flashCanvas[0] + 10, flashCanvas[1]);
      ctx.lineTo(flashCanvas[0] - 8, flashCanvas[1] - 8);
      ctx.lineTo(flashCanvas[0] - 8, flashCanvas[1] + 8);
      ctx.closePath();
      ctx.fill();

      for (let index = 4; index < samples.length; index += 5) {
        const sample = samples[index];
        const start = toScene(sample.point);
        const end = toScene(add2(sample.point, scale2(sample.normal, 0.42)));
        drawArrow2d(ctx, start, end, "rgba(255, 255, 255, 0.45)", Math.max(1.4, width * 0.0022));
      }

      drawCanvasDot(ctx, bestCanvas, Math.max(7, width * 0.0082), "rgba(255, 245, 216, 0.98)");
      drawArrow2d(
        ctx,
        bestCanvas,
        toScene(add2(best.point, scale2(best.normal, 0.72))),
        "rgba(255, 255, 255, 0.96)",
        Math.max(2.2, width * 0.003)
      );
      drawArrow2d(
        ctx,
        bestCanvas,
        flashCanvas,
        "rgba(247, 160, 74, 0.92)",
        Math.max(2, width * 0.0028)
      );
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
    stripeDensity: gl.getUniformLocation(waveProgram, "uStripeDensity"),
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
      gl.uniform1f(locations.stripeDensity, Number(shaderControls.density.value));
      gl.uniform1f(locations.shift, Number(shaderControls.shift.value) / 100);
      gl.drawElements(gl.TRIANGLES, buffers.count, gl.UNSIGNED_SHORT, 0);
    },
  });
}

function setupShaderFluidDemo() {
  const canvas = document.getElementById("shader-fluid-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const maxParticles = 240;
  const positionsX = new Float32Array(maxParticles);
  const positionsY = new Float32Array(maxParticles);
  const velocitiesX = new Float32Array(maxParticles);
  const velocitiesY = new Float32Array(maxParticles);
  const state = {
    count: 0,
    lastTime: 0,
    layoutWidth: 0,
    layoutHeight: 0,
    pointerX: 0,
    pointerY: 0,
    pointerDown: false,
    pointerImpulseX: 0,
    pointerImpulseY: 0,
    lastPointerX: 0,
    lastPointerY: 0,
    hasPointer: false,
  };

  function layoutParticles(count, width, height) {
    state.count = count;
    state.layoutWidth = width;
    state.layoutHeight = height;
    const tankX = 34;
    const tankY = 52;
    const tankWidth = Math.max(220, width - 68);
    const tankHeight = Math.max(180, height - 94);
    const regionWidth = tankWidth * 0.48;
    const regionHeight = tankHeight * 0.38;
    const startX = tankX + tankWidth * 0.26;
    const startY = tankY + tankHeight * 0.27;
    const columns = Math.ceil(Math.sqrt(count * (regionWidth / Math.max(regionHeight, 1))));
    const rows = Math.ceil(count / Math.max(columns, 1));
    const spacingX = regionWidth / Math.max(columns, 1);
    const spacingY = regionHeight / Math.max(rows, 1);

    for (let index = 0; index < count; index += 1) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const jitterX = ((index % 7) - 3) * 0.6;
      const jitterY = ((index % 5) - 2) * 0.7;
      positionsX[index] = startX + spacingX * (column + 0.5) + jitterX;
      positionsY[index] = startY + spacingY * (row + 0.5) + jitterY;
      velocitiesX[index] = 0;
      velocitiesY[index] = 0;
    }
  }

  function updatePointer(event) {
    const pointer = getCanvasPointer(event, canvas);
    if (state.hasPointer) {
      state.pointerImpulseX += pointer[0] - state.lastPointerX;
      state.pointerImpulseY += pointer[1] - state.lastPointerY;
    }
    state.pointerX = pointer[0];
    state.pointerY = pointer[1];
    state.lastPointerX = pointer[0];
    state.lastPointerY = pointer[1];
    state.hasPointer = true;
  }

  function endPointer(event) {
    if (event && typeof canvas.releasePointerCapture === "function") {
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Ignore release failures for pointers that were not captured.
      }
    }
    state.pointerDown = false;
  }

  canvas.addEventListener("pointerdown", (event) => {
    updatePointer(event);
    state.pointerDown = true;
    if (typeof canvas.setPointerCapture === "function") {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (error) {
        // Ignore capture failures on unsupported platforms.
      }
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    updatePointer(event);
  });

  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("pointerleave", () => {
    state.pointerDown = false;
  });

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const fluidState = getShaderFluidState();
      if (state.count !== fluidState.count || state.layoutWidth !== width || state.layoutHeight !== height) {
        layoutParticles(fluidState.count, width, height);
      }

      const dt = state.lastTime ? Math.min(0.03, Math.max(0.012, time - state.lastTime)) : 1 / 60;
      state.lastTime = time;
      const dtScale = dt * 60;
      const tank = {
        x: 34,
        y: 52,
        width: Math.max(220, width - 68),
        height: Math.max(180, height - 94),
      };
      const centerX = tank.x + tank.width * 0.5;
      const centerY = tank.y + tank.height * 0.52;
      const interactionRadius = clamp(Math.min(tank.width, tank.height) * 0.11, 38, 68);
      const interactionRadiusSq = interactionRadius * interactionRadius;
      const pointerRadius = interactionRadius * 1.7;
      const pointerRadiusSq = pointerRadius * pointerRadius;
      const sphereRadius = clamp(interactionRadius * 0.24, 7, 13);
      const pressureStrength = 0.012 + fluidState.push * 0.03;
      const viscosityStrength = 0.01 + fluidState.viscosity * 0.045;
      const damping = 0.988 - fluidState.viscosity * 0.012;
      const cpuChecks = fluidState.cpuChecks;

      for (let substep = 0; substep < 2; substep += 1) {
        for (let i = 0; i < state.count; i += 1) {
          for (let j = i + 1; j < state.count; j += 1) {
            const dx = positionsX[j] - positionsX[i];
            const dy = positionsY[j] - positionsY[i];
            const distSq = dx * dx + dy * dy;
            if (distSq <= 0.0001 || distSq > interactionRadiusSq) {
              continue;
            }

            const dist = Math.sqrt(distSq);
            const falloff = 1 - dist / interactionRadius;
            const nx = dx / dist;
            const ny = dy / dist;
            const pressure = falloff * falloff * pressureStrength * dtScale;
            velocitiesX[i] -= nx * pressure;
            velocitiesY[i] -= ny * pressure;
            velocitiesX[j] += nx * pressure;
            velocitiesY[j] += ny * pressure;

            const blend = falloff * viscosityStrength * 0.12;
            const relativeX = velocitiesX[j] - velocitiesX[i];
            const relativeY = velocitiesY[j] - velocitiesY[i];
            velocitiesX[i] += relativeX * blend;
            velocitiesY[i] += relativeY * blend;
            velocitiesX[j] -= relativeX * blend;
            velocitiesY[j] -= relativeY * blend;
          }
        }

        for (let index = 0; index < state.count; index += 1) {
          let vx = velocitiesX[index];
          let vy = velocitiesY[index];
          const offsetX = positionsX[index] - centerX;
          const offsetY = positionsY[index] - centerY;
          vx += -offsetX * 0.00032 * dtScale;
          vy += (-offsetY * 0.00028 + 0.028) * dtScale;

          if (state.pointerDown && state.hasPointer) {
            const dx = positionsX[index] - state.pointerX;
            const dy = positionsY[index] - state.pointerY;
            const distSq = dx * dx + dy * dy;
            if (distSq < pointerRadiusSq) {
              const dist = Math.sqrt(distSq) + 0.0001;
              const falloff = 1 - dist / pointerRadius;
              const tangentX = -dy / dist;
              const tangentY = dx / dist;
              vx += (state.pointerImpulseX * 0.03 + tangentX * fluidState.push * 1.25) * falloff;
              vy += (state.pointerImpulseY * 0.03 + tangentY * fluidState.push * 1.25) * falloff;
            }
          }

          vx *= damping;
          vy *= damping;
          positionsX[index] += vx * dtScale;
          positionsY[index] += vy * dtScale;

          const left = tank.x + sphereRadius + 2;
          const right = tank.x + tank.width - sphereRadius - 2;
          const top = tank.y + sphereRadius + 2;
          const bottom = tank.y + tank.height - sphereRadius - 2;
          if (positionsX[index] < left) {
            positionsX[index] = left;
            vx = Math.abs(vx) * 0.72;
          } else if (positionsX[index] > right) {
            positionsX[index] = right;
            vx = -Math.abs(vx) * 0.72;
          }
          if (positionsY[index] < top) {
            positionsY[index] = top;
            vy = Math.abs(vy) * 0.72;
          } else if (positionsY[index] > bottom) {
            positionsY[index] = bottom;
            vy = -Math.abs(vy) * 0.7;
          }

          velocitiesX[index] = vx;
          velocitiesY[index] = vy;
        }
      }

      state.pointerImpulseX *= 0.72;
      state.pointerImpulseY *= 0.72;

      drawLessonCanvasBackground(ctx, width, height, "#0f2333", "#153344");
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.fillRect(tank.x, tank.y, tank.width, tank.height);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tank.x, tank.y, tank.width, tank.height);

      ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
      ctx.font = `${Math.max(15, width * 0.018)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillText("Particle tank", tank.x + 12, tank.y - 14);
      ctx.fillStyle = "rgba(239, 245, 247, 0.76)";
      ctx.font = `${Math.max(10, width * 0.0115)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillText("Click or drag to inject velocity. Think update pass first, draw pass second.", 22, 24);

      if (state.pointerDown && state.hasPointer) {
        ctx.strokeStyle = "rgba(247, 160, 74, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(state.pointerX, state.pointerY, pointerRadius, 0, TAU);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "lighter";
      for (let index = 0; index < state.count; index += 1) {
        const speed = Math.min(1, Math.hypot(velocitiesX[index], velocitiesY[index]) / 5.5);
        const cool = [0.17, 0.67, 0.92];
        const warm = [0.98, 0.67, 0.31];
        const glowColor = rgbToCss([
          lerp(cool[0], warm[0], speed),
          lerp(cool[1], warm[1], speed * 0.7),
          lerp(cool[2], warm[2], speed * 0.36),
        ]);
        const gradient = ctx.createRadialGradient(
          positionsX[index] - sphereRadius * 0.4,
          positionsY[index] - sphereRadius * 0.45,
          sphereRadius * 0.15,
          positionsX[index],
          positionsY[index],
          sphereRadius * 2.3
        );
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.94)");
        gradient.addColorStop(0.22, glowColor);
        gradient.addColorStop(1, "rgba(16, 39, 55, 0.0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(positionsX[index], positionsY[index], sphereRadius * 2.3, 0, TAU);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      for (let index = 0; index < state.count; index += 1) {
        const speed = Math.min(1, Math.hypot(velocitiesX[index], velocitiesY[index]) / 4.6);
        const coreColor = rgbToCss([
          lerp(0.54, 0.98, speed),
          lerp(0.89, 0.76, speed),
          lerp(0.95, 0.38, speed),
        ]);
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(positionsX[index], positionsY[index], sphereRadius, 0, TAU);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
        ctx.beginPath();
        ctx.arc(positionsX[index] - sphereRadius * 0.35, positionsY[index] - sphereRadius * 0.35, sphereRadius * 0.32, 0, TAU);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(239, 245, 247, 0.74)";
      ctx.font = `${Math.max(10, width * 0.011)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
      ctx.fillText(`CPU serial checks: ${cpuChecks.toLocaleString()} per step`, tank.x + 12, tank.y + tank.height + 20);
      ctx.fillText(
        `Compute-style dispatch: ${fluidState.workgroups} groups x ${fluidState.workgroupSize} lanes`,
        tank.x + Math.max(220, tank.width * 0.46),
        tank.y + tank.height + 20
      );
    },
  });
}

function setupShaderDataflowDemo() {
  const canvas = document.getElementById("shader-dataflow-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const prevButton = document.getElementById("shader-dataflow-prev");
  const nextButton = document.getElementById("shader-dataflow-next");
  const caption = document.getElementById("shader-dataflow-caption");
  const title = document.getElementById("shader-dataflow-step-title");
  const body = document.getElementById("shader-dataflow-step-body");
  const transition = document.getElementById("shader-dataflow-step-transition");
  const vocab = document.getElementById("shader-dataflow-step-vocab");
  const stepButtons = Array.from(document.querySelectorAll("[data-shader-dataflow-step]"));

  const positions = [
    [-0.9, -0.7, 0],
    [0.0, 0.88, 0],
    [0.94, -0.22, 0],
  ];
  const uvs = [
    [0.0, 0.0],
    [0.5, 1.0],
    [1.0, 0.14],
  ];
  const indices = [0, 1, 2];
  const palette = ["#73ddd5", "#f7a04a", "#9fd7ff"];
  const steps = [
    {
      label: "CPU arrays",
      title: "Start with raw vertex data on the CPU",
      body: "Positions, UVs, normals, and indices usually begin as plain arrays of numbers in application memory.",
      transition: "Those numbers have to be uploaded into GPU buffers before the draw call can reference them.",
      vocab: "CPU memory / typed arrays: the host-side copy of your vertex data before upload.",
      caption: "The draw starts in application memory. The GPU still cannot read positions or UVs until you upload them.",
    },
    {
      label: "GPU buffers",
      title: "Upload those arrays into GPU buffers",
      body: "A vertex buffer stores per-vertex attributes. An index buffer stores which existing vertices should be reused to build triangles.",
      transition: "After upload, the bytes are on the GPU, but the shader still does not know which numbers mean position versus UV.",
      vocab: "VBO / EBO: GPU-side storage for vertex attributes and index order.",
      caption: "Uploading moves the data onto the GPU, but storage alone is not enough. The attribute layout still has to explain how to read it.",
    },
    {
      label: "Attribute layout",
      title: "Describe how each attribute should be read",
      body: "The GPU needs a read recipe: which buffer feeds aPosition, which feeds aUv, how many components to read, and where each attribute begins.",
      transition: "Once the layout is wired, the draw call can launch the vertex shader with meaningful inputs.",
      vocab: "Attribute pointer / VAO: the binding recipe that maps buffer bytes into named shader inputs.",
      caption: "The layout step gives meaning to raw bytes: these 3 floats are position, these 2 are UV, and this index order defines the triangle.",
    },
    {
      label: "Draw + shaders",
      title: "Issue the draw call and launch the shader stages",
      body: "Only after data upload and attribute wiring can the GPU assemble triangles, run the vertex shader, rasterize them, and shade fragments.",
      transition: "Now the pipeline moves from resource setup into actual per-vertex and per-fragment work.",
      vocab: "Draw call: the command that tells the GPU to interpret the current buffers, layout, and program as renderable geometry.",
      caption: "The draw call is the handoff from setup into execution: vertices run first, then rasterization creates fragment work, then the fragment shader finishes the image.",
    },
  ];
  const state = {
    step: 0,
  };

  function drawSubPanel(rect, heading, bodyLines, accent = "rgba(255, 255, 255, 0.08)") {
    ctx.save();
    ctx.fillStyle = accent;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    const insetX = 12;
    const insetTop = 10;
    const insetBottom = 12;
    const textWidth = rect.width - insetX * 2;
    const headingLineHeight = Math.max(14, canvas.width * 0.0105 * 1.22);
    const bodyLineHeight = Math.max(15, canvas.width * 0.0098 * 1.38);
    ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
    ctx.font = `${Math.max(10, canvas.width * 0.0105)}px "Avenir Next", "Segoe UI", sans-serif`;
    const headingHeight = drawTextLines(
      ctx,
      [heading],
      rect.x + insetX,
      rect.y + insetTop,
      headingLineHeight,
      textWidth
    );
    ctx.fillStyle = "rgba(239, 245, 247, 0.76)";
    ctx.font = `${Math.max(9, canvas.width * 0.0098)}px "Avenir Next", "Segoe UI", sans-serif`;
    const bodyHeight = drawTextLines(
      ctx,
      bodyLines,
      rect.x + insetX,
      rect.y + insetTop + headingHeight + 8,
      bodyLineHeight,
      textWidth
    );
    ctx.restore();
    const contentY = rect.y + insetTop + headingHeight + 8 + bodyHeight + 12;
    return {
      x: rect.x + insetX,
      y: contentY,
      width: textWidth,
      height: Math.max(24, rect.y + rect.height - insetBottom - contentY),
    };
  }

  function updateUi() {
    const step = steps[state.step];
    if (title) {
      title.textContent = step.title;
    }
    if (body) {
      body.textContent = step.body;
    }
    if (transition) {
      transition.textContent = step.transition;
    }
    if (vocab) {
      vocab.textContent = step.vocab;
    }
    if (caption) {
      caption.textContent = step.caption;
    }
    if (prevButton) {
      prevButton.disabled = state.step === 0;
    }
    if (nextButton) {
      nextButton.disabled = state.step === steps.length - 1;
    }
    stepButtons.forEach((button) => {
      const stepIndex = Number(button.dataset.shaderDataflowStep);
      const active = stepIndex === state.step;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setStep(nextStep) {
    state.step = clamp(nextStep, 0, steps.length - 1);
    updateUi();
    markAllDemosDirty();
  }

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      setStep(state.step - 1);
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      setStep(state.step + 1);
    });
  }

  stepButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setStep(Number(button.dataset.shaderDataflowStep));
    });
  });

  updateUi();

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 0.75 : time * 0.88;
      const pulse = 0.5 + Math.sin(phase * 2.1) * 0.5;
      const activeVertex = Math.min(2, Math.floor(((Math.sin(phase) + 1) * 0.5) * 3));
      const detailRect = {
        x: 22,
        y: 18,
        width: width - 44,
        height: height - 36,
      };
      const isNarrow = width < 900;

      function drawCpuArrays(rect) {
        drawLessonCanvasPanel(ctx, rect, "CPU arrays in application memory", width);
        const left = {
          x: rect.x + 18,
          y: rect.y + 40,
          width: rect.width * (isNarrow ? 0.56 : 0.61),
          height: rect.height - 58,
        };
        const right = {
          x: left.x + left.width + 16,
          y: left.y,
          width: rect.x + rect.width - 18 - (left.x + left.width + 16),
          height: left.height,
        };
        const labelX = left.x + 12;
        const blockX = left.x + left.width * 0.24;
        const blockGap = 10;
        const blockWidth = (left.width - (blockX - left.x) - 18 - blockGap * 2) / 3;
        const rowGap = 10;
        const rows = [
          { label: "positions", values: positions.map((entry) => formatVector(entry, 1)) },
          { label: "uvs", values: uvs.map((entry) => formatVector(entry, 2)) },
          { label: "indices", values: indices.map((entry) => `i${entry}`) },
        ];

        const leftContent = drawSubPanel(
          left,
          "Host-side data",
          ["Your app still owns these arrays.", "Nothing here is a shader input yet."],
          "rgba(255, 255, 255, 0.06)"
        );
        const rowHeight = Math.max(42, (leftContent.height - rowGap * (rows.length - 1)) / rows.length);
        rows.forEach((row, rowIndex) => {
          const rowY = leftContent.y + rowIndex * (rowHeight + rowGap);
          ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
          ctx.font = `${Math.max(10, width * 0.0105)}px "Avenir Next", "Segoe UI", sans-serif`;
          ctx.fillText(row.label, labelX, rowY + 16);

          row.values.forEach((value, valueIndex) => {
            const isActive = valueIndex === activeVertex;
            const cellX = blockX + valueIndex * (blockWidth + blockGap);
            ctx.fillStyle = isActive ? "rgba(115, 221, 213, 0.18)" : "rgba(255, 255, 255, 0.08)";
            ctx.fillRect(cellX, rowY, blockWidth, rowHeight - 14);
            ctx.strokeStyle = isActive ? palette[valueIndex] : "rgba(255, 255, 255, 0.14)";
            ctx.lineWidth = isActive ? 2 : 1;
            ctx.strokeRect(cellX, rowY, blockWidth, rowHeight - 14);
            ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
            ctx.font = `${Math.max(9, width * 0.0094)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
            drawTextLines(ctx, [`v${valueIndex}`, value], cellX + 8, rowY + 15, 15);
          });
        });

        drawSubPanel(
          right,
          "Nothing GPU-visible yet",
          [
            "The CPU can inspect and edit these values freely.",
            "The GPU still needs an explicit upload step.",
            "",
            "Typical source:",
            "Float32Array positions",
            "Float32Array uvs",
            "Uint16Array indices",
          ],
          "rgba(19, 37, 53, 0.16)"
        );

        drawArrow2d(
          ctx,
          [left.x + left.width + 8, rect.y + rect.height * 0.52],
          [right.x - 8, rect.y + rect.height * 0.52],
          "rgba(247, 244, 234, 0.6)",
          2.2
        );
      }

      function drawGpuBuffers(rect) {
        drawLessonCanvasPanel(ctx, rect, "Upload into GPU buffers", width);
        const leftCard = {
          x: rect.x + 18,
          y: rect.y + 52,
          width: rect.width * 0.24,
          height: rect.height - 80,
        };
        const rightCard = {
          x: rect.x + rect.width * 0.315,
          y: rect.y + 52,
          width: rect.width * 0.645,
          height: rect.height - 80,
        };
        const uploadFrom = [leftCard.x + leftCard.width + 10, rect.y + rect.height * 0.5];
        const uploadTo = [rightCard.x - 14, rect.y + rect.height * 0.5];
        const labels = ["position VBO", "uv VBO", "index buffer"];
        const rowGap = 12;
        const blockGap = 5;

        drawSubPanel(
          leftCard,
          "CPU source",
          [
            "positions[]",
            "uvs[]",
            "indices[]",
            "",
            "bufferData(upload)",
            "copies bytes to GPU storage",
          ],
          "rgba(255, 255, 255, 0.06)"
        );

        drawArrow2d(ctx, uploadFrom, uploadTo, "rgba(247, 244, 234, 0.7)", 2.6);
        ctx.fillStyle = "rgba(247, 244, 234, 0.82)";
        ctx.font = `${Math.max(10, width * 0.0102)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
        ctx.fillText("upload", (uploadFrom[0] + uploadTo[0]) * 0.5 - 18, uploadFrom[1] - 10);

        const rightContent = drawSubPanel(
          rightCard,
          "GPU-side storage",
          [
            "The bytes live on the GPU now.",
            "Attribute layout still decides",
            "how the shader interprets them.",
          ],
          "rgba(19, 37, 53, 0.16)"
        );

        const rowBoxHeight = Math.max(34, (rightContent.height - rowGap * (labels.length - 1)) / labels.length);
        const stripWidth = rightContent.width;
        const segmentWidth = (stripWidth - blockGap * 2) / 3;
        const barHeight = Math.min(20, Math.max(14, rowBoxHeight - 22));

        labels.forEach((label, rowIndex) => {
          const rowTop = rightContent.y + rowIndex * (rowBoxHeight + rowGap);
          const y = rowTop + 18;
          ctx.fillStyle = "rgba(239, 245, 247, 0.9)";
          ctx.font = `${Math.max(10, width * 0.0105)}px "Avenir Next", "Segoe UI", sans-serif`;
          ctx.fillText(label, rightContent.x + 2, rowTop + 2);

          for (let index = 0; index < 3; index += 1) {
            const x = rightContent.x + index * (segmentWidth + blockGap);
            const highlight = rowIndex !== 2 && index === activeVertex;
            ctx.fillStyle =
              rowIndex === 2
                ? "rgba(247, 160, 74, 0.18)"
                : highlight
                  ? `rgba(115, 221, 213, ${0.22 + pulse * 0.08})`
                  : "rgba(255, 255, 255, 0.08)";
            ctx.fillRect(x, y, segmentWidth, barHeight);
            ctx.strokeStyle =
              rowIndex === 2 ? "rgba(247, 160, 74, 0.58)" : highlight ? palette[index] : "rgba(255, 255, 255, 0.14)";
            ctx.lineWidth = highlight ? 2 : 1;
            ctx.strokeRect(x, y, segmentWidth, barHeight);
          }
        });
      }

      function drawLayout(rect) {
        drawLessonCanvasPanel(ctx, rect, "Attribute layout: which bytes feed which input?", width);
        const topCard = {
          x: rect.x + 18,
          y: rect.y + 48,
          width: rect.width - 36,
          height: rect.height * 0.34,
        };
        const lowerY = topCard.y + topCard.height + 16;
        const lowerHeight = rect.y + rect.height - 18 - lowerY;
        const leftCard = {
          x: rect.x + 18,
          y: lowerY,
          width: rect.width * 0.46,
          height: lowerHeight,
        };
        const rightCard = {
          x: leftCard.x + leftCard.width + 16,
          y: lowerY,
          width: rect.x + rect.width - 18 - (leftCard.x + leftCard.width + 16),
          height: lowerHeight,
        };
        const recordX = topCard.x + 18;
        const recordWidth = topCard.width - 36;
        const segmentWidth = recordWidth / 5;
        const labels = ["x", "y", "z", "u", "v"];

        const topContent = drawSubPanel(
          topCard,
          `vertex record v${activeVertex}`,
          ["A single vertex still looks like raw numbers until the attribute layout names each slice."],
          "rgba(19, 37, 53, 0.16)"
        );
        const recordY = topContent.y + 8;
        const recordHeight = Math.min(54, Math.max(42, topContent.height - 10));

        for (let index = 0; index < 5; index += 1) {
          const x = recordX + segmentWidth * index;
          const isPosition = index < 3;
          ctx.fillStyle = isPosition ? "rgba(115, 221, 213, 0.18)" : "rgba(247, 160, 74, 0.18)";
          ctx.fillRect(x, recordY, segmentWidth - 4, recordHeight);
          ctx.strokeStyle = isPosition ? "rgba(115, 221, 213, 0.78)" : "rgba(247, 160, 74, 0.78)";
          ctx.lineWidth = 1.6;
          ctx.strokeRect(x, recordY, segmentWidth - 4, recordHeight);
          ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
          ctx.font = `${Math.max(12, width * 0.0112)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
          ctx.fillText(labels[index], x + 12, recordY + 21);
          ctx.font = `${Math.max(9, width * 0.0094)}px "Avenir Next", "Segoe UI", sans-serif`;
          ctx.fillStyle = "rgba(239, 245, 247, 0.78)";
          ctx.fillText(index < 3 ? "position" : "uv", x + 12, recordY + Math.min(recordHeight - 10, 40));
        }

        const leftContent = drawSubPanel(
          leftCard,
          "Attribute pointers",
          [
            "aPosition -> size 3, stride 20, offset 0",
            "aUv -> size 2, stride 20, offset 12",
            "",
            "Now the shader input names match real slices of buffer data.",
          ],
          "rgba(255, 255, 255, 0.06)"
        );
        drawSubPanel(
          rightCard,
          "Saved recipe",
          [
            "VAO-like idea:",
            "which buffer is bound",
            "which attribute reads it",
            "how many components",
            "where each attribute starts",
          ],
          "rgba(19, 37, 53, 0.16)"
        );

        drawArrow2d(
          ctx,
          [recordX + segmentWidth * 1.5, recordY + recordHeight + 4],
          [leftContent.x + leftContent.width * 0.32, leftContent.y - 6],
          "rgba(115, 221, 213, 0.72)",
          2.2
        );
        drawArrow2d(
          ctx,
          [recordX + segmentWidth * 4.05, recordY + recordHeight + 4],
          [leftContent.x + leftContent.width * 0.42, leftContent.y + 16],
          "rgba(247, 160, 74, 0.72)",
          2.2
        );
      }

      function drawShaders(rect) {
        drawLessonCanvasPanel(ctx, rect, "Draw call launches the rendering stages", width);
        const stages = [
          { title: "vertex shader", note: "runs once per vertex", color: "rgba(115, 221, 213, 0.2)" },
          { title: "rasterizer", note: "fills covered fragments", color: "rgba(159, 215, 255, 0.18)" },
          { title: "fragment shader", note: "runs once per fragment", color: "rgba(247, 160, 74, 0.18)" },
        ];
        const callRect = {
          x: rect.x + 18,
          y: rect.y + 44,
          width: rect.width - 36,
          height: 56,
        };
        const stageY = callRect.y + callRect.height + 18;
        const stageWidth = rect.width - 36;
        const boxGap = 12;
        const boxWidth = (stageWidth - boxGap * 2) / 3;
        const boxHeight = 62;
        const lowerY = stageY + boxHeight + 24;
        const triangleArea = {
          x: rect.x + 28,
          y: lowerY,
          width: rect.width * 0.34,
          height: rect.y + rect.height - 24 - lowerY,
        };
        const pixelArea = {
          x: rect.x + rect.width * 0.52,
          y: lowerY,
          width: rect.width * 0.38,
          height: triangleArea.height,
        };

        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(callRect.x, callRect.y, callRect.width, callRect.height);
        ctx.strokeStyle = "rgba(247, 244, 234, 0.7)";
        ctx.lineWidth = 1.6;
        ctx.strokeRect(callRect.x, callRect.y, callRect.width, callRect.height);
        ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
        ctx.font = `${Math.max(13, width * 0.0115)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
        ctx.fillText("gl.drawElements(GL_TRIANGLES, 3, GL_UNSIGNED_SHORT, 0)", callRect.x + 14, callRect.y + 34);

        stages.forEach((stage, index) => {
          const x = rect.x + 18 + index * (boxWidth + boxGap);
          ctx.fillStyle = stage.color;
          ctx.fillRect(x, stageY, boxWidth, boxHeight);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
          ctx.strokeRect(x, stageY, boxWidth, boxHeight);
          ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
          ctx.font = `${Math.max(11, width * 0.0105)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
          ctx.fillText(stage.title, x + 10, stageY + 22);
          ctx.font = `${Math.max(9, width * 0.0096)}px "Avenir Next", "Segoe UI", sans-serif`;
          ctx.fillStyle = "rgba(239, 245, 247, 0.8)";
          ctx.fillText(stage.note, x + 10, stageY + 42);
        });

        drawArrow2d(
          ctx,
          [rect.x + 18 + boxWidth, stageY + boxHeight * 0.5],
          [rect.x + 18 + boxWidth + boxGap, stageY + boxHeight * 0.5],
          "rgba(247, 244, 234, 0.7)",
          2.2
        );
        drawArrow2d(
          ctx,
          [rect.x + 18 + boxWidth * 2 + boxGap, stageY + boxHeight * 0.5],
          [rect.x + 18 + boxWidth * 2 + boxGap * 2, stageY + boxHeight * 0.5],
          "rgba(247, 244, 234, 0.7)",
          2.2
        );

        const triangle = [
          [triangleArea.x + triangleArea.width * 0.18, triangleArea.y + triangleArea.height * 0.8],
          [triangleArea.x + triangleArea.width * 0.5, triangleArea.y + triangleArea.height * 0.18],
          [triangleArea.x + triangleArea.width * 0.82, triangleArea.y + triangleArea.height * 0.68],
        ];
        ctx.fillStyle = "rgba(115, 221, 213, 0.16)";
        ctx.strokeStyle = "rgba(115, 221, 213, 0.82)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(triangle[0][0], triangle[0][1]);
        ctx.lineTo(triangle[1][0], triangle[1][1]);
        ctx.lineTo(triangle[2][0], triangle[2][1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        triangle.forEach((point, index) => {
          ctx.fillStyle = palette[index];
          ctx.beginPath();
          ctx.arc(point[0], point[1], index === activeVertex ? 7 + pulse * 1.8 : 6, 0, TAU);
          ctx.fill();
        });
        ctx.fillStyle = "rgba(239, 245, 247, 0.8)";
        ctx.font = `${Math.max(10, width * 0.01)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText("assembled triangle", triangleArea.x, triangleArea.y + triangleArea.height + 18);

        const pixelRows = 4;
        const pixelColumns = 5;
        const cell = Math.min(pixelArea.width / (pixelColumns + 1.5), pixelArea.height / (pixelRows + 1.4));
        for (let row = 0; row < pixelRows; row += 1) {
          for (let column = 0; column < pixelColumns; column += 1) {
            const x = pixelArea.x + column * (cell + 8);
            const y = pixelArea.y + row * (cell + 8);
            const hit = row >= 1 && column >= 1 && column <= 3;
            ctx.fillStyle = hit ? `rgba(247, 160, 74, ${0.26 + (row === 2 && column === 2 ? 0.5 : 0)})` : "rgba(255, 255, 255, 0.08)";
            ctx.fillRect(x, y, cell, cell);
            ctx.strokeStyle = hit ? "rgba(247, 160, 74, 0.74)" : "rgba(255, 255, 255, 0.12)";
            ctx.strokeRect(x, y, cell, cell);
          }
        }
        ctx.fillStyle = "rgba(239, 245, 247, 0.8)";
        ctx.fillText("fragments after coverage", pixelArea.x, pixelArea.y + pixelArea.height + 18);

        drawArrow2d(
          ctx,
          [triangleArea.x + triangleArea.width + 10, triangleArea.y + triangleArea.height * 0.48],
          [pixelArea.x - 16, pixelArea.y + pixelArea.height * 0.48],
          "rgba(247, 244, 234, 0.68)",
          2.2
        );
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);

      if (state.step === 0) {
        drawCpuArrays(detailRect);
      } else if (state.step === 1) {
        drawGpuBuffers(detailRect);
      } else if (state.step === 2) {
        drawLayout(detailRect);
      } else {
        drawShaders(detailRect);
      }
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

function setupCameraCompareStoryDemo() {
  const canvas = document.getElementById("camera-compare-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const objects = [
    { depth: 1.2, color: "#73ddd5" },
    { depth: 2.1, color: "#f7a04a" },
    { depth: 3.15, color: "#9fd7ff" },
  ];
  const objectHeight = 0.62;

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 0.72 : time * 0.42;
      const margin = 18;
      const gap = 16;
      const stacked = width < 760;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap) / 2;
      const panelHeight = stacked ? (height - margin * 2 - gap) / 2 : height - margin * 2;
      const fov = degreesToRadians(lerp(42, 72, (Math.sin(phase) + 1) * 0.5));
      const orthoHalfHeight = lerp(1.55, 2.05, (Math.cos(phase * 0.86) + 1) * 0.5);

      function drawPanel(rect, title, perspective) {
        const diagramX = rect.x + 14;
        const diagramY = rect.y + 34;
        const diagramWidth = rect.width * 0.62;
        const diagramHeight = rect.height - 50;
        const screenX = rect.x + rect.width * 0.71;
        const screenY = rect.y + 48;
        const screenWidth = rect.width * 0.21;
        const screenHeight = rect.height - 78;
        const maxDepth = 3.8;

        function toDiagram(point) {
          return [
            diagramX + (point[0] / maxDepth) * diagramWidth,
            diagramY + diagramHeight * 0.5 - point[1] * (diagramHeight * 0.28),
          ];
        }

        ctx.fillStyle = "rgba(8, 21, 30, 0.22)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
        ctx.font = `${Math.max(11, width * 0.014)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(title, rect.x + 14, rect.y + 22);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.lineWidth = Math.max(1.6, width * 0.0025);
        ctx.beginPath();
        ctx.moveTo(diagramX, diagramY + diagramHeight * 0.5);
        ctx.lineTo(diagramX + diagramWidth, diagramY + diagramHeight * 0.5);
        ctx.stroke();

        const imagePlaneDepth = 0.9;
        const imagePlane = toDiagram([imagePlaneDepth, 0]);
        const topPlane = toDiagram([imagePlaneDepth, 1.05]);
        const bottomPlane = toDiagram([imagePlaneDepth, -1.05]);

        ctx.strokeStyle = perspective ? "rgba(247, 160, 74, 0.82)" : "rgba(115, 221, 213, 0.84)";
        ctx.beginPath();
        ctx.moveTo(topPlane[0], topPlane[1]);
        ctx.lineTo(bottomPlane[0], bottomPlane[1]);
        ctx.stroke();

        if (perspective) {
          const farHalfHeight = Math.tan(fov / 2) * maxDepth;
          const eye = toDiagram([0, 0]);
          const farTop = toDiagram([maxDepth, farHalfHeight]);
          const farBottom = toDiagram([maxDepth, -farHalfHeight]);

          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
          ctx.beginPath();
          ctx.moveTo(eye[0], eye[1]);
          ctx.lineTo(farTop[0], farTop[1]);
          ctx.moveTo(eye[0], eye[1]);
          ctx.lineTo(farBottom[0], farBottom[1]);
          ctx.stroke();

          ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
          ctx.beginPath();
          ctx.arc(eye[0], eye[1], Math.max(4.5, width * 0.006), 0, TAU);
          ctx.fill();
        } else {
          const volumeTop = toDiagram([maxDepth, orthoHalfHeight]);
          const volumeBottom = toDiagram([maxDepth, -orthoHalfHeight]);
          const nearTop = toDiagram([0, orthoHalfHeight]);
          const nearBottom = toDiagram([0, -orthoHalfHeight]);

          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
          ctx.beginPath();
          ctx.moveTo(nearTop[0], nearTop[1]);
          ctx.lineTo(volumeTop[0], volumeTop[1]);
          ctx.moveTo(nearBottom[0], nearBottom[1]);
          ctx.lineTo(volumeBottom[0], volumeBottom[1]);
          ctx.moveTo(nearTop[0], nearTop[1]);
          ctx.lineTo(nearBottom[0], nearBottom[1]);
          ctx.moveTo(volumeTop[0], volumeTop[1]);
          ctx.lineTo(volumeBottom[0], volumeBottom[1]);
          ctx.stroke();
        }

        ctx.fillStyle = "rgba(239, 245, 247, 0.16)";
        ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);

        const imageCenterY = screenY + screenHeight * 0.5;

        objects.forEach((object, index) => {
          const halfHeight = objectHeight * 0.5;
          const top = toDiagram([object.depth, halfHeight]);
          const bottom = toDiagram([object.depth, -halfHeight]);
          const barWidth = 12;

          ctx.fillStyle = object.color;
          ctx.globalAlpha = 0.86;
          ctx.fillRect(top[0] - barWidth * 0.5, top[1], barWidth, bottom[1] - top[1]);
          ctx.globalAlpha = 1;

          if (perspective) {
            const eye = toDiagram([0, 0]);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
            ctx.beginPath();
            ctx.moveTo(eye[0], eye[1]);
            ctx.lineTo(top[0], top[1]);
            ctx.moveTo(eye[0], eye[1]);
            ctx.lineTo(bottom[0], bottom[1]);
            ctx.stroke();
          } else {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
            ctx.beginPath();
            ctx.moveTo(top[0], top[1]);
            ctx.lineTo(imagePlane[0], top[1]);
            ctx.moveTo(bottom[0], bottom[1]);
            ctx.lineTo(imagePlane[0], bottom[1]);
            ctx.stroke();
          }

          const projectedHeight = perspective
            ? objectHeight * (0.95 / object.depth) / Math.tan(fov / 2)
            : objectHeight / orthoHalfHeight;
          const clamped = clamp(projectedHeight, 0.12, 0.94);
          const screenBarHeight = clamped * (screenHeight * 0.68);
          const screenBarWidth = screenWidth * 0.22;
          const screenBarX = screenX + screenWidth * (0.16 + index * 0.27);

          ctx.fillStyle = object.color;
          ctx.fillRect(screenBarX, imageCenterY - screenBarHeight * 0.5, screenBarWidth, screenBarHeight);
        });

        ctx.fillStyle = "rgba(239, 245, 247, 0.84)";
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(perspective ? "converging rays" : "parallel rays", rect.x + 14, rect.y + rect.height - 14);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#183446");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      drawPanel({ x: margin, y: margin, width: panelWidth, height: panelHeight }, "Perspective camera", true);
      drawPanel(
        stacked
          ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
          : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
        "Orthographic camera",
        false
      );
    },
  });
}

function setupDepthPrecisionStoryDemo() {
  const canvas = document.getElementById("depth-precision-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  function encodeDepth(distance, near, far) {
    return (1 / distance - 1 / near) / (1 / far - 1 / near);
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 0.7 : time * 0.74;
      const far = 40;
      const surfaceA = 18.2 + Math.sin(phase) * 0.35;
      const surfaceB = surfaceA + 0.48 + Math.cos(phase * 1.13) * 0.08;
      const margin = 18;
      const gap = 16;
      const stacked = width < 820;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap) / 2;
      const panelHeight = stacked ? (height - margin * 2 - gap) / 2 : height - margin * 2;
      const panels = [
        { x: margin, y: margin, width: panelWidth, height: panelHeight, near: 0.6, title: "Near plane at 0.60" },
        stacked
          ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight, near: 0.02, title: "Near plane at 0.02" }
          : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight, near: 0.02, title: "Near plane at 0.02" },
      ];

      function drawPanel(panel) {
        drawLessonCanvasPanel(ctx, panel, panel.title, width);
        const inner = {
          x: panel.x + 16,
          y: panel.y + 34,
          width: panel.width - 32,
          height: panel.height - 48,
        };
        const axisY = inner.y + inner.height * 0.28;
        const axisX0 = inner.x + 26;
        const axisX1 = inner.x + inner.width * 0.58;
        const axisWidth = axisX1 - axisX0;
        const depthA = encodeDepth(surfaceA, panel.near, far);
        const depthB = encodeDepth(surfaceB, panel.near, far);
        const gapValue = depthB - depthA;
        const zoomMin = 0.98;
        const zoomMax = 1.0;
        const zoomRect = {
          x: inner.x + inner.width * 0.08,
          y: inner.y + inner.height * 0.58,
          width: inner.width * 0.84,
          height: inner.height * 0.2,
        };
        const markerA = zoomRect.x + clamp((depthA - zoomMin) / (zoomMax - zoomMin), 0, 1) * zoomRect.width;
        const markerB = zoomRect.x + clamp((depthB - zoomMin) / (zoomMax - zoomMin), 0, 1) * zoomRect.width;
        const overlapRisk = markerB - markerA < 8;
        const quantizationBins = 20;

        function worldX(distance) {
          return axisX0 + (distance / far) * axisWidth;
        }

        ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
        ctx.font = `${Math.max(11, width * 0.0125)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText("camera", inner.x, axisY - 18);

        ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
        ctx.beginPath();
        ctx.arc(inner.x + 8, axisY, 6, 0, TAU);
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(axisX0, axisY);
        ctx.lineTo(axisX1, axisY);
        ctx.stroke();

        const nearX = worldX(panel.near);
        ctx.strokeStyle = "rgba(115, 221, 213, 0.8)";
        ctx.beginPath();
        ctx.moveTo(nearX, axisY - 18);
        ctx.lineTo(nearX, axisY + 18);
        ctx.stroke();
        ctx.fillStyle = "rgba(115, 221, 213, 0.92)";
        ctx.font = `${Math.max(10, width * 0.0108)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
        ctx.fillText(`near ${formatNumber(panel.near, 2)}`, nearX - 18, axisY - 28);

        const farX = worldX(far);
        ctx.strokeStyle = "rgba(247, 160, 74, 0.62)";
        ctx.beginPath();
        ctx.moveTo(farX, axisY - 18);
        ctx.lineTo(farX, axisY + 18);
        ctx.stroke();
        ctx.fillStyle = "rgba(247, 160, 74, 0.94)";
        ctx.fillText(`far ${formatNumber(far, 0)}`, farX - 22, axisY - 28);

        const surfaces = [
          { depth: surfaceA, color: "#73ddd5", label: "surface A" },
          { depth: surfaceB, color: "#f7a04a", label: "surface B" },
        ];

        surfaces.forEach((surface, index) => {
          const x = worldX(surface.depth);
          ctx.strokeStyle = surface.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, axisY - 22);
          ctx.lineTo(x, axisY + 22);
          ctx.stroke();

          ctx.fillStyle = "rgba(239, 245, 247, 0.88)";
          ctx.font = `${Math.max(10, width * 0.0105)}px "Avenir Next", "Segoe UI", sans-serif`;
          ctx.fillText(surface.label, x - 20, axisY + 38 + index * 16);
        });

        ctx.fillStyle = "rgba(239, 245, 247, 0.78)";
        drawTextLines(
          ctx,
          [
            "The world-space gap stays the same.",
            "Only the near plane changes how tightly those far depths get packed.",
          ],
          inner.x,
          inner.y + inner.height * 0.42,
          16
        );

        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fillRect(zoomRect.x, zoomRect.y, zoomRect.width, zoomRect.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.strokeRect(zoomRect.x, zoomRect.y, zoomRect.width, zoomRect.height);

        for (let index = 0; index <= quantizationBins; index += 1) {
          const x = zoomRect.x + (zoomRect.width / quantizationBins) * index;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, zoomRect.y);
          ctx.lineTo(x, zoomRect.y + zoomRect.height);
          ctx.stroke();
        }

        ctx.fillStyle = "rgba(239, 245, 247, 0.9)";
        ctx.font = `${Math.max(10, width * 0.0105)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
        ctx.fillText("stored depth zoom: 0.98 .. 1.00", zoomRect.x, zoomRect.y - 10);

        const markers = [
          { x: markerA, color: "#73ddd5", value: depthA },
          { x: markerB, color: "#f7a04a", value: depthB },
        ];
        markers.forEach((marker, index) => {
          ctx.strokeStyle = marker.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(marker.x, zoomRect.y - 6);
          ctx.lineTo(marker.x, zoomRect.y + zoomRect.height + 6);
          ctx.stroke();

          ctx.fillStyle = "rgba(239, 245, 247, 0.84)";
          ctx.font = `${Math.max(9, width * 0.0098)}px "Avenir Next", "Segoe UI", sans-serif`;
          ctx.fillText(
            index === 0 ? formatNumber(marker.value, 4) : formatNumber(marker.value, 4),
            marker.x - 18,
            zoomRect.y + zoomRect.height + 20 + index * 14
          );
        });

        const binA = Math.floor(depthA * quantizationBins);
        const binB = Math.floor(depthB * quantizationBins);
        ctx.fillStyle = overlapRisk ? "rgba(247, 160, 74, 0.92)" : "rgba(115, 221, 213, 0.92)";
        ctx.font = `${Math.max(10, width * 0.0108)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(
          overlapRisk
            ? `far values crowd together -> z-fighting risk`
            : `more room between stored depths`,
          zoomRect.x,
          zoomRect.y + zoomRect.height + 54
        );
        ctx.fillStyle = "rgba(239, 245, 247, 0.78)";
        ctx.fillText(
          `gap ${formatNumber(gapValue, 5)}  |  bins ${binA} and ${binB}`,
          zoomRect.x,
          zoomRect.y + zoomRect.height + 72
        );
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawPanel(panels[0]);
      drawPanel(panels[1]);
    },
  });
}

function setupTriangleStoryDemo() {
  const canvas = document.getElementById("triangle-story-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  function clipPolygonToRect(points, rect) {
    const edges = [
      { inside: (point) => point[0] >= rect.x, intersect: (a, b) => [rect.x, a[1] + ((b[1] - a[1]) * (rect.x - a[0])) / (b[0] - a[0] || 1)] },
      { inside: (point) => point[0] <= rect.x + rect.width, intersect: (a, b) => [rect.x + rect.width, a[1] + ((b[1] - a[1]) * ((rect.x + rect.width) - a[0])) / (b[0] - a[0] || 1)] },
      { inside: (point) => point[1] >= rect.y, intersect: (a, b) => [a[0] + ((b[0] - a[0]) * (rect.y - a[1])) / (b[1] - a[1] || 1), rect.y] },
      { inside: (point) => point[1] <= rect.y + rect.height, intersect: (a, b) => [a[0] + ((b[0] - a[0]) * ((rect.y + rect.height) - a[1])) / (b[1] - a[1] || 1), rect.y + rect.height] },
    ];

    let output = points.slice();
    for (const edge of edges) {
      const input = output.slice();
      output = [];
      for (let index = 0; index < input.length; index += 1) {
        const current = input[index];
        const previous = input[(index + input.length - 1) % input.length];
        const currentInside = edge.inside(current);
        const previousInside = edge.inside(previous);

        if (currentInside) {
          if (!previousInside) {
            output.push(edge.intersect(previous, current));
          }
          output.push(current);
        } else if (previousInside) {
          output.push(edge.intersect(previous, current));
        }
      }
    }
    return output;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 0.68 : time * 0.76;
      const wobble = Math.sin(phase) * 0.04;
      const margin = 18;
      const gap = 16;
      const panelWidth = (width - margin * 2 - gap) / 2;
      const panelHeight = (height - margin * 2 - gap) / 2;
      const panels = [
        { x: margin, y: margin, width: panelWidth, height: panelHeight },
        { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
        { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight },
        { x: margin + panelWidth + gap, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight },
      ];

      function drawPolygon(points, fill, stroke) {
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let index = 1; index < points.length; index += 1) {
          ctx.lineTo(points[index][0], points[index][1]);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      function drawClipping(rect) {
        drawLessonCanvasPanel(ctx, rect, "1. Clipping", width);
        const clipRect = {
          x: rect.x + rect.width * 0.14,
          y: rect.y + 44,
          width: rect.width * 0.72,
          height: rect.height * 0.56,
        };
        const triangle = [
          [clipRect.x + clipRect.width * 0.12, clipRect.y + clipRect.height * 0.84],
          [clipRect.x + clipRect.width * (0.52 + wobble), clipRect.y - 18],
          [clipRect.x + clipRect.width * 1.14, clipRect.y + clipRect.height * 0.56],
        ];
        const clipped = clipPolygonToRect(triangle, clipRect);

        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.fillRect(clipRect.x, clipRect.y, clipRect.width, clipRect.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.strokeRect(clipRect.x, clipRect.y, clipRect.width, clipRect.height);
        ctx.fillStyle = "rgba(239, 245, 247, 0.78)";
        ctx.font = `${Math.max(10, width * 0.0108)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText("clip volume", clipRect.x, clipRect.y - 10);

        ctx.setLineDash([6, 6]);
        drawPolygon(triangle, "rgba(247, 160, 74, 0.12)", "rgba(247, 160, 74, 0.72)");
        ctx.setLineDash([]);
        drawPolygon(clipped, "rgba(115, 221, 213, 0.22)", "rgba(115, 221, 213, 0.88)");

        ctx.fillStyle = "rgba(239, 245, 247, 0.76)";
        drawTextLines(
          ctx,
          ["Only the part inside the clip box survives.", "The rasterizer never sees the trimmed-away area."],
          rect.x + 14,
          rect.y + rect.height - 36,
          16
        );
      }

      function drawCulling(rect) {
        drawLessonCanvasPanel(ctx, rect, "2. Back-face culling", width);
        const leftTriangle = [
          [rect.x + rect.width * 0.18, rect.y + rect.height * 0.72],
          [rect.x + rect.width * 0.36, rect.y + rect.height * 0.28],
          [rect.x + rect.width * 0.52, rect.y + rect.height * 0.68],
        ];
        const rightTriangle = [
          [rect.x + rect.width * 0.84, rect.y + rect.height * 0.72],
          [rect.x + rect.width * 0.66, rect.y + rect.height * 0.28],
          [rect.x + rect.width * 0.52, rect.y + rect.height * 0.68],
        ];

        drawPolygon(leftTriangle, "rgba(115, 221, 213, 0.22)", "rgba(115, 221, 213, 0.88)");
        drawPolygon(rightTriangle, "rgba(247, 160, 74, 0.18)", "rgba(247, 160, 74, 0.5)");

        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rect.x + rect.width * 0.34, rect.y + rect.height * 0.52, 18, Math.PI * 0.1, Math.PI * 1.65);
        ctx.stroke();
        drawArrow2d(
          ctx,
          [rect.x + rect.width * 0.69, rect.y + rect.height * 0.34],
          [rect.x + rect.width * 0.81, rect.y + rect.height * 0.77],
          "rgba(247, 160, 74, 0.54)",
          2
        );
        ctx.strokeStyle = "rgba(255, 245, 216, 0.84)";
        ctx.beginPath();
        ctx.moveTo(rect.x + rect.width * 0.62, rect.y + rect.height * 0.26);
        ctx.lineTo(rect.x + rect.width * 0.88, rect.y + rect.height * 0.78);
        ctx.moveTo(rect.x + rect.width * 0.88, rect.y + rect.height * 0.26);
        ctx.lineTo(rect.x + rect.width * 0.62, rect.y + rect.height * 0.78);
        ctx.stroke();

        ctx.fillStyle = "rgba(239, 245, 247, 0.88)";
        ctx.font = `${Math.max(10, width * 0.0108)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText("front-facing -> keep", rect.x + rect.width * 0.14, rect.y + rect.height - 36);
        ctx.fillText("back-facing -> discard", rect.x + rect.width * 0.54, rect.y + rect.height - 36);
      }

      function drawCoverage(rect) {
        drawLessonCanvasPanel(ctx, rect, "3. Pixel coverage", width);
        const inner = {
          x: rect.x + 18,
          y: rect.y + 42,
          width: rect.width - 36,
          height: rect.height - 60,
        };
        const columns = 8;
        const rows = 5;
        const triangle = [
          [inner.x + inner.width * 0.12, inner.y + inner.height * 0.8],
          [inner.x + inner.width * 0.48, inner.y + inner.height * (0.16 + wobble * 0.5)],
          [inner.x + inner.width * 0.86, inner.y + inner.height * 0.7],
        ];

        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1;
        for (let column = 0; column <= columns; column += 1) {
          const x = inner.x + (inner.width / columns) * column;
          ctx.beginPath();
          ctx.moveTo(x, inner.y);
          ctx.lineTo(x, inner.y + inner.height);
          ctx.stroke();
        }
        for (let row = 0; row <= rows; row += 1) {
          const y = inner.y + (inner.height / rows) * row;
          ctx.beginPath();
          ctx.moveTo(inner.x, y);
          ctx.lineTo(inner.x + inner.width, y);
          ctx.stroke();
        }

        drawPolygon(triangle, "rgba(159, 215, 255, 0.18)", "rgba(159, 215, 255, 0.82)");

        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const cellX = inner.x + (inner.width / columns) * column;
            const cellY = inner.y + (inner.height / rows) * row;
            const samplePoint = [cellX + inner.width / columns / 2, cellY + inner.height / rows / 2];
            const bary = barycentricCoordinates(samplePoint, triangle[0], triangle[1], triangle[2]);
            const covered = bary && bary.every((value) => value >= 0);
            if (covered) {
              ctx.fillStyle = "rgba(115, 221, 213, 0.2)";
              ctx.fillRect(cellX + 2, cellY + 2, inner.width / columns - 4, inner.height / rows - 4);
            }
            ctx.fillStyle = covered ? "rgba(247, 244, 234, 0.92)" : "rgba(255, 255, 255, 0.34)";
            ctx.beginPath();
            ctx.arc(samplePoint[0], samplePoint[1], 2.2, 0, TAU);
            ctx.fill();
          }
        }
      }

      function drawInterpolation(rect) {
        drawLessonCanvasPanel(ctx, rect, "4. Barycentric blend", width);
        const triangle = [
          [rect.x + rect.width * 0.16, rect.y + rect.height * 0.76],
          [rect.x + rect.width * 0.48, rect.y + rect.height * 0.24],
          [rect.x + rect.width * 0.78, rect.y + rect.height * 0.68],
        ];
        let weights = [
          0.28 + Math.sin(phase * 0.8) * 0.12,
          0.36 + Math.cos(phase * 1.02) * 0.1,
          0.34 + Math.sin(phase * 1.4 + 1.2) * 0.08,
        ];
        const total = weights[0] + weights[1] + weights[2];
        weights = weights.map((value) => value / total);
        const samplePoint = [
          triangle[0][0] * weights[0] + triangle[1][0] * weights[1] + triangle[2][0] * weights[2],
          triangle[0][1] * weights[0] + triangle[1][1] * weights[1] + triangle[2][1] * weights[2],
        ];
        const colors = [
          [0.96, 0.42, 0.36],
          [0.19, 0.82, 0.76],
          [0.35, 0.58, 0.98],
        ];
        const mixed = [0, 0, 0];
        for (let index = 0; index < 3; index += 1) {
          mixed[0] += colors[index][0] * weights[index];
          mixed[1] += colors[index][1] * weights[index];
          mixed[2] += colors[index][2] * weights[index];
        }

        drawPolygon(triangle, "rgba(255, 255, 255, 0.06)", "rgba(255, 255, 255, 0.16)");
        triangle.forEach((point, index) => {
          ctx.fillStyle = rgbToCss(colors[index]);
          ctx.beginPath();
          ctx.arc(point[0], point[1], 8, 0, TAU);
          ctx.fill();
        });

        ctx.fillStyle = rgbToCss(mixed);
        ctx.beginPath();
        ctx.arc(samplePoint[0], samplePoint[1], 8, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(247, 244, 234, 0.9)";
        ctx.lineWidth = 2;
        ctx.stroke();

        const swatch = {
          x: rect.x + rect.width * 0.62,
          y: rect.y + rect.height * 0.18,
          size: rect.width * 0.18,
        };
        ctx.fillStyle = rgbToCss(mixed);
        ctx.fillRect(swatch.x, swatch.y, swatch.size, swatch.size);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.strokeRect(swatch.x, swatch.y, swatch.size, swatch.size);

        ctx.fillStyle = "rgba(239, 245, 247, 0.9)";
        ctx.font = `${Math.max(9, width * 0.0102)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
        drawTextLines(
          ctx,
          [
            `a ${formatNumber(weights[0], 2)}`,
            `b ${formatNumber(weights[1], 2)}`,
            `c ${formatNumber(weights[2], 2)}`,
          ],
          rect.x + rect.width * 0.62,
          rect.y + rect.height * 0.56,
          16
        );
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawClipping(panels[0]);
      drawCulling(panels[1]);
      drawCoverage(panels[2]);
      drawInterpolation(panels[3]);
    },
  });
}

function setupVisibilityStoryDemo() {
  const canvas = document.getElementById("visibility-story-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.1 : time * 0.78;
      const frontDepth = 0.28 + (Math.sin(phase * 1.08) + 1) * 0.045;
      const backDepth = 0.62 + (Math.cos(phase * 0.82) + 1) * 0.035;
      const winnerIsFront = frontDepth < backDepth;
      const margin = 18;
      const gap = 16;
      const stacked = width < 860;
      const columns = stacked ? 1 : 3;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap * (columns - 1)) / columns;
      const panelHeight = stacked ? (height - margin * 2 - gap * 2) / 3 : height - margin * 2;
      const rects = [
        { x: margin, y: margin, width: panelWidth, height: panelHeight },
        stacked
          ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
          : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
        stacked
          ? { x: margin, y: margin + (panelHeight + gap) * 2, width: panelWidth, height: panelHeight }
          : { x: margin + (panelWidth + gap) * 2, y: margin, width: panelWidth, height: panelHeight },
      ];

      function drawPanelFrame(rect, title) {
        ctx.fillStyle = "rgba(8, 21, 30, 0.22)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
        ctx.font = `${Math.max(11, width * 0.014)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(title, rect.x + 14, rect.y + 22);
      }

      function fillPolygon(points, fill, stroke) {
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = Math.max(1.8, width * 0.0028);
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let index = 1; index < points.length; index += 1) {
          ctx.lineTo(points[index][0], points[index][1]);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      function drawCoverage(rect) {
        drawPanelFrame(rect, "Screen coverage");
        const inner = {
          x: rect.x + 14,
          y: rect.y + 34,
          width: rect.width - 28,
          height: rect.height - 48,
        };
        const gridX = 8;
        const gridY = 6;
        const wobble = Math.sin(phase * 0.9) * 0.03;
        const farShape = [
          [inner.x + inner.width * 0.14, inner.y + inner.height * 0.26],
          [inner.x + inner.width * 0.82, inner.y + inner.height * (0.18 + wobble)],
          [inner.x + inner.width * 0.74, inner.y + inner.height * 0.78],
          [inner.x + inner.width * 0.18, inner.y + inner.height * 0.84],
        ];
        const frontShape = [
          [inner.x + inner.width * 0.26, inner.y + inner.height * 0.18],
          [inner.x + inner.width * 0.92, inner.y + inner.height * 0.32],
          [inner.x + inner.width * 0.72, inner.y + inner.height * 0.88],
          [inner.x + inner.width * 0.18, inner.y + inner.height * 0.68],
        ];

        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        ctx.fillRect(inner.x, inner.y, inner.width, inner.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        for (let x = 1; x < gridX; x += 1) {
          const drawX = inner.x + (inner.width / gridX) * x;
          ctx.beginPath();
          ctx.moveTo(drawX, inner.y);
          ctx.lineTo(drawX, inner.y + inner.height);
          ctx.stroke();
        }
        for (let y = 1; y < gridY; y += 1) {
          const drawY = inner.y + (inner.height / gridY) * y;
          ctx.beginPath();
          ctx.moveTo(inner.x, drawY);
          ctx.lineTo(inner.x + inner.width, drawY);
          ctx.stroke();
        }

        fillPolygon(farShape, "rgba(115, 221, 213, 0.34)", "rgba(115, 221, 213, 0.9)");
        fillPolygon(frontShape, "rgba(247, 160, 74, 0.36)", "rgba(247, 160, 74, 0.94)");

        const pixelSize = Math.min(inner.width / gridX, inner.height / gridY) * 0.92;
        const pixelCenter = [
          inner.x + inner.width * 0.58,
          inner.y + inner.height * 0.48,
        ];
        ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
        ctx.lineWidth = Math.max(2, width * 0.0032);
        ctx.strokeRect(pixelCenter[0] - pixelSize * 0.5, pixelCenter[1] - pixelSize * 0.5, pixelSize, pixelSize);

        ctx.fillStyle = "rgba(247, 160, 74, 0.98)";
        ctx.beginPath();
        ctx.arc(pixelCenter[0] - pixelSize * 0.14, pixelCenter[1] + pixelSize * 0.08, pixelSize * 0.12, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "rgba(115, 221, 213, 0.98)";
        ctx.beginPath();
        ctx.arc(pixelCenter[0] + pixelSize * 0.14, pixelCenter[1] - pixelSize * 0.08, pixelSize * 0.12, 0, TAU);
        ctx.fill();

        ctx.fillStyle = "rgba(239, 245, 247, 0.84)";
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText("same pixel center sees two surfaces", inner.x + 8, inner.y + inner.height - 12);
      }

      function drawCandidates(rect) {
        drawPanelFrame(rect, "Fragment candidates");
        const cardWidth = rect.width - 28;
        const cardHeight = (rect.height - 74) / 2;
        const topY = rect.y + 38;
        const cards = [
          {
            y: topY,
            label: "Orange fragment",
            depth: frontDepth,
            color: "rgba(247, 160, 74, 0.96)",
            fill: "rgba(247, 160, 74, 0.18)",
            winner: winnerIsFront,
          },
          {
            y: topY + cardHeight + 10,
            label: "Teal fragment",
            depth: backDepth,
            color: "rgba(115, 221, 213, 0.96)",
            fill: "rgba(115, 221, 213, 0.18)",
            winner: !winnerIsFront,
          },
        ];

        for (const card of cards) {
          const cardX = rect.x + 14;
          ctx.fillStyle = card.fill;
          ctx.fillRect(cardX, card.y, cardWidth, cardHeight);
          ctx.strokeStyle = card.winner ? "rgba(255, 245, 216, 0.94)" : "rgba(255, 255, 255, 0.12)";
          ctx.lineWidth = card.winner ? Math.max(2.2, width * 0.0034) : 1;
          ctx.strokeRect(cardX, card.y, cardWidth, cardHeight);

          ctx.fillStyle = card.color;
          ctx.fillRect(cardX + 12, card.y + 12, 24, 24);
          ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
          ctx.font = `${Math.max(11, width * 0.013)}px "Avenir Next", "Segoe UI", sans-serif`;
          ctx.fillText(card.label, cardX + 48, card.y + 28);
          ctx.fillStyle = "rgba(239, 245, 247, 0.82)";
          ctx.font = `${Math.max(10, width * 0.012)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
          ctx.fillText(`depth = ${formatNumber(card.depth, 2)}`, cardX + 12, card.y + cardHeight - 18);
          if (card.winner) {
            ctx.fillStyle = "rgba(255, 245, 216, 0.92)";
            ctx.fillText("passes depth test", cardX + cardWidth - 144, card.y + cardHeight - 18);
          }
        }

        ctx.fillStyle = "rgba(239, 245, 247, 0.86)";
        ctx.font = `${Math.max(11, width * 0.013)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText("Smaller depth wins for opaque surfaces.", rect.x + 14, rect.y + rect.height - 12);
      }

      function drawBuffers(rect) {
        drawPanelFrame(rect, "Depth and color buffers");
        const trackX = rect.x + 20;
        const trackY = rect.y + 58;
        const trackWidth = rect.width - 40;
        const swatchSize = Math.min(rect.width * 0.34, rect.height * 0.32);
        const winnerColor = winnerIsFront ? "rgba(247, 160, 74, 0.96)" : "rgba(115, 221, 213, 0.96)";
        const loserColor = winnerIsFront ? "rgba(115, 221, 213, 0.66)" : "rgba(247, 160, 74, 0.66)";
        const winnerDepth = winnerIsFront ? frontDepth : backDepth;
        const loserDepth = winnerIsFront ? backDepth : frontDepth;

        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fillRect(trackX, trackY, trackWidth, 18);
        ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
        for (let tick = 0; tick <= 4; tick += 1) {
          const x = trackX + (trackWidth / 4) * tick;
          ctx.fillRect(x - 0.5, trackY - 6, 1, 30);
        }

        const winnerX = trackX + trackWidth * winnerDepth;
        const loserX = trackX + trackWidth * loserDepth;
        ctx.fillStyle = loserColor;
        ctx.beginPath();
        ctx.arc(loserX, trackY + 9, 7, 0, TAU);
        ctx.fill();
        ctx.fillStyle = winnerColor;
        ctx.beginPath();
        ctx.arc(winnerX, trackY + 9, 8.5, 0, TAU);
        ctx.fill();

        ctx.fillStyle = "rgba(239, 245, 247, 0.9)";
        ctx.font = `${Math.max(11, width * 0.013)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText("stored depth", trackX, trackY - 12);
        ctx.font = `${Math.max(10, width * 0.012)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
        ctx.fillText(formatNumber(winnerDepth, 2), winnerX - 12, trackY + 40);

        const swatchX = rect.x + 20;
        const swatchY = rect.y + 112;
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fillRect(swatchX, swatchY, swatchSize, swatchSize);
        ctx.fillStyle = winnerColor;
        ctx.fillRect(swatchX + 8, swatchY + 8, swatchSize - 16, swatchSize - 16);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.strokeRect(swatchX, swatchY, swatchSize, swatchSize);

        ctx.fillStyle = "rgba(239, 245, 247, 0.9)";
        ctx.font = `${Math.max(11, width * 0.013)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText("final pixel color", swatchX, swatchY - 12);

        const rejectX = swatchX + swatchSize + 26;
        ctx.fillStyle = loserColor;
        ctx.fillRect(rejectX, swatchY + 18, 30, 30);
        ctx.strokeStyle = "rgba(255, 245, 216, 0.74)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rejectX - 4, swatchY + 14);
        ctx.lineTo(rejectX + 34, swatchY + 52);
        ctx.moveTo(rejectX + 34, swatchY + 14);
        ctx.lineTo(rejectX - 4, swatchY + 52);
        ctx.stroke();

        ctx.fillStyle = "rgba(239, 245, 247, 0.82)";
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText("rejected fragment", rejectX - 6, swatchY + 72);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      const background = ctx.createLinearGradient(0, 0, 0, height)
      background.addColorStop(0, "#102535")
      background.addColorStop(1, "#183446")
      ctx.fillStyle = background
      ctx.fillRect(0, 0, width, height)

      drawCoverage(rects[0])
      drawCandidates(rects[1])
      drawBuffers(rects[2])
    },
  })
}

function setupSamplingStoryDemo() {
  const canvas = document.getElementById("sampling-story-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const gridSize = 6

  function mixColor(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
  }

  function colorToCss(color, alpha = 1) {
    return `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)}, ${alpha})`
  }

  function texelColor(x, y) {
    const u = x / Math.max(gridSize - 1, 1)
    const v = y / Math.max(gridSize - 1, 1)
    if ((x + y) % 2 === 0) {
      return [0.16 + u * 0.18, 0.5 + v * 0.16, 0.84 - u * 0.12]
    }
    return [0.96, 0.7 - v * 0.14, 0.28 + u * 0.1]
  }

  function sampleNearest(uv) {
    const x = clamp(Math.round(clamp(uv[0], 0, 1) * (gridSize - 1)), 0, gridSize - 1)
    const y = clamp(Math.round(clamp(uv[1], 0, 1) * (gridSize - 1)), 0, gridSize - 1)
    return texelColor(x, y)
  }

  function sampleLinear(uv) {
    const x = clamp(uv[0], 0, 1) * (gridSize - 1)
    const y = clamp(uv[1], 0, 1) * (gridSize - 1)
    const x0 = clamp(Math.floor(x), 0, gridSize - 1)
    const y0 = clamp(Math.floor(y), 0, gridSize - 1)
    const x1 = clamp(x0 + 1, 0, gridSize - 1)
    const y1 = clamp(y0 + 1, 0, gridSize - 1)
    const tx = x - x0
    const ty = y - y0
    const c00 = texelColor(x0, y0)
    const c10 = texelColor(x1, y0)
    const c01 = texelColor(x0, y1)
    const c11 = texelColor(x1, y1)
    const top = mixColor(c00, c10, tx)
    const bottom = mixColor(c01, c11, tx)
    return mixColor(top, bottom, ty)
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.12 : time * 0.82;
      let weight1 = 0.22 + (Math.sin(phase * 1.06) + 1) * 0.17;
      let weight2 = 0.18 + (Math.cos(phase * 0.84) + 1) * 0.18;
      const sum = weight1 + weight2;
      if (sum > 0.82) {
        const scale = 0.82 / sum;
        weight1 *= scale;
        weight2 *= scale;
      }
      const weight0 = 1 - weight1 - weight2;

      const trianglePoints = [
        [0.14, 0.76],
        [0.86, 0.64],
        [0.3, 0.18],
      ];
      const triangleUvs = [
        [0.08, 0.12],
        [0.92, 0.24],
        [0.24, 0.88],
      ];
      const point = add2(
        scale2(trianglePoints[0], weight0),
        add2(scale2(trianglePoints[1], weight1), scale2(trianglePoints[2], weight2))
      );
      const uv = add2(scale2(triangleUvs[0], weight0), add2(scale2(triangleUvs[1], weight1), scale2(triangleUvs[2], weight2)));
      const nearestColor = sampleNearest(uv);
      const linearColor = sampleLinear(uv);
      const sampleX = clamp(uv[0], 0, 1) * (gridSize - 1);
      const sampleY = clamp(uv[1], 0, 1) * (gridSize - 1);
      const x0 = clamp(Math.floor(sampleX), 0, gridSize - 1);
      const y0 = clamp(Math.floor(sampleY), 0, gridSize - 1);
      const x1 = clamp(x0 + 1, 0, gridSize - 1)
      const y1 = clamp(y0 + 1, 0, gridSize - 1)
      const nearestX = clamp(Math.round(sampleX), 0, gridSize - 1)
      const nearestY = clamp(Math.round(sampleY), 0, gridSize - 1)

      const margin = 18;
      const gap = 16;
      const stacked = width < 860;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap * 2) / 3;
      const panelHeight = stacked ? (height - margin * 2 - gap * 2) / 3 : height - margin * 2;
      const rects = [
        { x: margin, y: margin, width: panelWidth, height: panelHeight },
        stacked
          ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
          : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
        stacked
          ? { x: margin, y: margin + (panelHeight + gap) * 2, width: panelWidth, height: panelHeight }
          : { x: margin + (panelWidth + gap) * 2, y: margin, width: panelWidth, height: panelHeight },
      ];

      function drawPanelFrame(rect, title) {
        ctx.fillStyle = "rgba(8, 21, 30, 0.22)"
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
        ctx.lineWidth = 1
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
        ctx.fillStyle = "rgba(239, 245, 247, 0.94)"
        ctx.font = `${Math.max(11, width * 0.014)}px "Avenir Next", "Segoe UI", sans-serif`
        ctx.fillText(title, rect.x + 14, rect.y + 22)
      }

      function drawTrianglePanel(rect) {
        drawPanelFrame(rect, "Screen fragment")
        const inner = {
          x: rect.x + 14,
          y: rect.y + 34,
          width: rect.width - 28,
          height: rect.height - 50,
        }

        function toCanvas(point2) {
          return [inner.x + point2[0] * inner.width, inner.y + point2[1] * inner.height]
        }

        const p0 = toCanvas(trianglePoints[0])
        const p1 = toCanvas(trianglePoints[1])
        const p2 = toCanvas(trianglePoints[2])
        const p = toCanvas(point)

        ctx.fillStyle = "rgba(255, 255, 255, 0.04)"
        ctx.fillRect(inner.x, inner.y, inner.width, inner.height)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)"
        ctx.lineWidth = Math.max(1.8, width * 0.0028)
        ctx.beginPath()
        ctx.moveTo(p0[0], p0[1])
        ctx.lineTo(p1[0], p1[1])
        ctx.lineTo(p2[0], p2[1])
        ctx.closePath()
        ctx.fillStyle = "rgba(115, 221, 213, 0.16)"
        ctx.fill()
        ctx.stroke()

        const vertices = [
          { point: p0, uv: triangleUvs[0] },
          { point: p1, uv: triangleUvs[1] },
          { point: p2, uv: triangleUvs[2] },
        ]
        for (const vertex of vertices) {
          ctx.fillStyle = "rgba(247, 160, 74, 0.94)"
          ctx.beginPath()
          ctx.arc(vertex.point[0], vertex.point[1], Math.max(5, width * 0.007), 0, TAU)
          ctx.fill()
          ctx.fillStyle = "rgba(239, 245, 247, 0.84)"
          ctx.font = `${Math.max(10, width * 0.012)}px "IBM Plex Mono", "SFMono-Regular", monospace`
          ctx.fillText(`(${formatNumber(vertex.uv[0], 2)}, ${formatNumber(vertex.uv[1], 2)})`, vertex.point[0] + 10, vertex.point[1] - 10)
        }

        ctx.setLineDash([8, 6])
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
        ctx.beginPath()
        ctx.moveTo(p[0], p[1])
        ctx.lineTo(p0[0], p0[1])
        ctx.moveTo(p[0], p[1])
        ctx.lineTo(p1[0], p1[1])
        ctx.moveTo(p[0], p[1])
        ctx.lineTo(p2[0], p2[1])
        ctx.stroke()
        ctx.setLineDash([])

        ctx.fillStyle = "rgba(255, 245, 216, 0.98)"
        ctx.beginPath()
        ctx.arc(p[0], p[1], Math.max(6.5, width * 0.0095), 0, TAU)
        ctx.fill()

        ctx.fillStyle = "rgba(239, 245, 247, 0.88)"
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`
        ctx.fillText(`interpolated uv = (${formatNumber(uv[0], 2)}, ${formatNumber(uv[1], 2)})`, inner.x + 6, inner.y + inner.height - 12)
      }

      function drawTexturePanel(rect) {
        drawPanelFrame(rect, "Texel grid")
        const gridRect = {
          x: rect.x + 24,
          y: rect.y + 42,
          width: rect.width - 48,
          height: rect.height - 72,
        }
        const cellWidth = gridRect.width / gridSize
        const cellHeight = gridRect.height / gridSize

        for (let y = 0; y < gridSize; y += 1) {
          for (let x = 0; x < gridSize; x += 1) {
            const drawX = gridRect.x + x * cellWidth
            const drawY = gridRect.y + (gridSize - 1 - y) * cellHeight
            ctx.fillStyle = colorToCss(texelColor(x, y))
            ctx.fillRect(drawX, drawY, cellWidth, cellHeight)
            ctx.strokeStyle = "rgba(8, 21, 30, 0.24)"
            ctx.lineWidth = 1
            ctx.strokeRect(drawX, drawY, cellWidth, cellHeight)
          }
        }

        const sampleCanvas = [
          gridRect.x + (sampleX / Math.max(gridSize - 1, 1)) * gridRect.width,
          gridRect.y + gridRect.height - (sampleY / Math.max(gridSize - 1, 1)) * gridRect.height,
        ]
        const nearestRect = {
          x: gridRect.x + nearestX * cellWidth,
          y: gridRect.y + (gridSize - 1 - nearestY) * cellHeight,
          width: cellWidth,
          height: cellHeight,
        }
        const blendRect = {
          x: gridRect.x + x0 * cellWidth,
          y: gridRect.y + (gridSize - 1 - y1) * cellHeight,
          width: Math.max((x1 - x0 + 1) * cellWidth, cellWidth),
          height: Math.max((y1 - y0 + 1) * cellHeight, cellHeight),
        }

        ctx.strokeStyle = "rgba(247, 160, 74, 0.96)"
        ctx.lineWidth = Math.max(2, width * 0.003)
        ctx.strokeRect(nearestRect.x + 1, nearestRect.y + 1, nearestRect.width - 2, nearestRect.height - 2)
        ctx.strokeStyle = "rgba(115, 221, 213, 0.96)"
        ctx.lineWidth = Math.max(2, width * 0.003)
        ctx.strokeRect(blendRect.x + 1, blendRect.y + 1, blendRect.width - 2, blendRect.height - 2)

        ctx.fillStyle = "rgba(255, 245, 216, 0.98)"
        ctx.beginPath()
        ctx.arc(sampleCanvas[0], sampleCanvas[1], Math.max(5.5, width * 0.008), 0, TAU)
        ctx.fill()
        ctx.strokeStyle = "rgba(255, 255, 255, 0.88)"
        ctx.beginPath()
        ctx.moveTo(sampleCanvas[0] - 8, sampleCanvas[1])
        ctx.lineTo(sampleCanvas[0] + 8, sampleCanvas[1])
        ctx.moveTo(sampleCanvas[0], sampleCanvas[1] - 8)
        ctx.lineTo(sampleCanvas[0], sampleCanvas[1] + 8)
        ctx.stroke()

        ctx.fillStyle = "rgba(239, 245, 247, 0.84)"
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`
        ctx.fillText("orange = nearest texel", gridRect.x, rect.y + rect.height - 14)
        ctx.fillText("teal = texels blended by linear filter", gridRect.x, rect.y + rect.height - 28)
      }

      function drawOutputPanel(rect) {
        drawPanelFrame(rect, "Output pixel")
        const swatchGap = 16
        const swatchWidth = (rect.width - 42 - swatchGap) / 2
        const swatchHeight = rect.height * 0.38
        const swatchY = rect.y + 44
        const nearestRect = { x: rect.x + 14, y: swatchY, width: swatchWidth, height: swatchHeight }
        const linearRect = { x: rect.x + 14 + swatchWidth + swatchGap, y: swatchY, width: swatchWidth, height: swatchHeight }

        for (const swatch of [
          { rect: nearestRect, color: nearestColor, label: "Nearest" },
          { rect: linearRect, color: linearColor, label: "Linear" },
        ]) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.08)"
          ctx.fillRect(swatch.rect.x, swatch.rect.y, swatch.rect.width, swatch.rect.height)
          ctx.fillStyle = colorToCss(swatch.color)
          ctx.fillRect(swatch.rect.x + 8, swatch.rect.y + 8, swatch.rect.width - 16, swatch.rect.height - 16)
          ctx.strokeStyle = "rgba(255, 255, 255, 0.16)"
          ctx.strokeRect(swatch.rect.x, swatch.rect.y, swatch.rect.width, swatch.rect.height)
          ctx.fillStyle = "rgba(239, 245, 247, 0.92)"
          ctx.font = `${Math.max(11, width * 0.013)}px "Avenir Next", "Segoe UI", sans-serif`
          ctx.fillText(swatch.label, swatch.rect.x, swatch.rect.y - 10)
        }

        const previewY = swatchY + swatchHeight + 26
        const previewWidth = (rect.width - 44) / 4
        const previewColors = [
          texelColor(x0, y1),
          texelColor(x1, y1),
          texelColor(x0, y0),
          texelColor(x1, y0),
        ]
        for (let index = 0; index < previewColors.length; index += 1) {
          const previewX = rect.x + 14 + index * previewWidth
          ctx.fillStyle = colorToCss(previewColors[index])
          ctx.fillRect(previewX, previewY, previewWidth - 6, 26)
        }

        ctx.fillStyle = "rgba(239, 245, 247, 0.84)"
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`
        ctx.fillText("Linear blends this 2x2 neighborhood instead of picking one texel.", rect.x + 14, previewY + 46)
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      const background = ctx.createLinearGradient(0, 0, 0, height)
      background.addColorStop(0, "#102535")
      background.addColorStop(1, "#183446")
      ctx.fillStyle = background
      ctx.fillRect(0, 0, width, height)

      drawTrianglePanel(rects[0])
      drawTexturePanel(rects[1])
      drawOutputPanel(rects[2])
    },
  })
}

function setupLightResponseStoryDemo() {
  const canvas = document.getElementById("light-response-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.08 : time * 0.72;
      const margin = 18;
      const gap = 16;
      const stacked = width < 760;
      const leftWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap) * 0.54;
      const rightWidth = stacked ? width - margin * 2 : width - margin * 2 - gap - leftWidth;
      const panelHeight = stacked ? (height - margin * 2 - gap) / 2 : height - margin * 2;
      const geometryRect = { x: margin, y: margin, width: leftWidth, height: panelHeight };
      const responseRect = stacked
        ? { x: margin, y: margin + panelHeight + gap, width: width - margin * 2, height: panelHeight }
        : { x: margin + leftWidth + gap, y: margin, width: rightWidth, height: panelHeight };

      const sampleAngle = 0.72
      const lightAngle = 2.2 + Math.sin(phase * 0.92) * 0.75
      const viewAngle = 0.2 + Math.cos(phase * 0.74) * 0.48
      const shininess = lerp(10, 72, (Math.sin(phase * 0.58) + 1) * 0.5)

      function drawPanelFrame(rect, title) {
        ctx.fillStyle = "rgba(8, 21, 30, 0.22)"
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
        ctx.lineWidth = 1
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
        ctx.fillStyle = "rgba(239, 245, 247, 0.94)"
        ctx.font = `${Math.max(11, width * 0.014)}px "Avenir Next", "Segoe UI", sans-serif`
        ctx.fillText(title, rect.x + 14, rect.y + 22)
      }

      function drawGeometryPanel(rect) {
        drawPanelFrame(rect, "One shaded point")
        const center = [rect.x + rect.width * 0.48, rect.y + rect.height * 0.58]
        const radius = Math.min(rect.width, rect.height) * 0.28
        const sample = [
          Math.cos(sampleAngle) * radius,
          Math.sin(sampleAngle) * radius,
        ]
        const sampleCanvas = [center[0] + sample[0], center[1] - sample[1]]
        const normal = normalize2(sample)
        const lightPosition = [
          Math.cos(lightAngle) * radius * 2.5,
          Math.sin(lightAngle) * radius * 2.5,
        ]
        const lightCanvas = [center[0] + lightPosition[0], center[1] - lightPosition[1]]
        const viewPosition = [
          Math.cos(viewAngle) * radius * 2.9,
          Math.sin(viewAngle) * radius * 2.9,
        ]
        const viewCanvas = [center[0] + viewPosition[0], center[1] - viewPosition[1]]
        const lightDirection = normalize2(subtract2(lightPosition, sample))
        const viewDirection = normalize2(subtract2(viewPosition, sample))
        const halfVector = normalize2(add2(lightDirection, viewDirection))
        const diffuse = Math.max(dot2(normal, lightDirection), 0)
        const specular = diffuse > 0 ? Math.pow(Math.max(dot2(normal, halfVector), 0), shininess) : 0

        const sphereGradient = ctx.createRadialGradient(center[0] - radius * 0.3, center[1] - radius * 0.35, radius * 0.18, center[0], center[1], radius)
        sphereGradient.addColorStop(0, "rgba(72, 128, 164, 0.66)")
        sphereGradient.addColorStop(1, "rgba(13, 30, 44, 0.9)")
        ctx.fillStyle = sphereGradient
        ctx.beginPath()
        ctx.arc(center[0], center[1], radius, 0, TAU)
        ctx.fill()
        ctx.strokeStyle = "rgba(255, 255, 255, 0.14)"
        ctx.lineWidth = Math.max(2, width * 0.003)
        ctx.stroke()

        for (const marker of [
          { point: lightCanvas, color: "rgba(247, 160, 74, 0.96)", label: "L" },
          { point: viewCanvas, color: "rgba(138, 220, 255, 0.96)", label: "V" },
        ]) {
          ctx.fillStyle = marker.color
          ctx.beginPath()
          ctx.arc(marker.point[0], marker.point[1], Math.max(8, width * 0.01), 0, TAU)
          ctx.fill()
          ctx.fillStyle = "rgba(8, 21, 30, 0.9)"
          ctx.font = `${Math.max(10, width * 0.012)}px "IBM Plex Mono", "SFMono-Regular", monospace`
          ctx.fillText(marker.label, marker.point[0] - 4, marker.point[1] + 4)
        }

        ctx.fillStyle = "rgba(255, 245, 216, 0.98)"
        ctx.beginPath()
        ctx.arc(sampleCanvas[0], sampleCanvas[1], Math.max(6, width * 0.009), 0, TAU)
        ctx.fill()

        const arrows = [
          { vector: normal, color: "rgba(115, 221, 213, 0.98)", label: "N", length: radius * 0.78, dash: [] },
          { vector: lightDirection, color: "rgba(247, 160, 74, 0.98)", label: "L", length: radius * 1.08, dash: [] },
          { vector: viewDirection, color: "rgba(138, 220, 255, 0.96)", label: "V", length: radius * 1.08, dash: [] },
          { vector: halfVector, color: "rgba(255, 245, 216, 0.84)", label: "H", length: radius * 0.7, dash: [8, 6] },
        ]

        for (const arrow of arrows) {
          const end = [sampleCanvas[0] + arrow.vector[0] * arrow.length, sampleCanvas[1] - arrow.vector[1] * arrow.length]
          ctx.setLineDash(arrow.dash)
          ctx.strokeStyle = arrow.color
          ctx.lineWidth = Math.max(2.2, width * 0.0032)
          ctx.beginPath()
          ctx.moveTo(sampleCanvas[0], sampleCanvas[1])
          ctx.lineTo(end[0], end[1])
          ctx.stroke()
          ctx.setLineDash([])
          ctx.fillStyle = arrow.color
          ctx.font = `${Math.max(10, width * 0.012)}px "IBM Plex Mono", "SFMono-Regular", monospace`
          ctx.fillText(arrow.label, end[0] + 6, end[1] - 4)
        }

        ctx.fillStyle = "rgba(239, 245, 247, 0.84)"
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`
        ctx.fillText("Diffuse uses N and L. Specular also cares about V.", rect.x + 14, rect.y + rect.height - 14)

        return { diffuse, specular, shininess }
      }

      function drawBar(rect, label, value, color, y) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)"
        ctx.fillRect(rect.x, y, rect.width, 18)
        ctx.fillStyle = color
        ctx.fillRect(rect.x, y, rect.width * clamp(value, 0, 1), 18)
        ctx.fillStyle = "rgba(239, 245, 247, 0.9)"
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`
        ctx.fillText(label, rect.x, y - 8)
        ctx.font = `${Math.max(10, width * 0.012)}px "IBM Plex Mono", "SFMono-Regular", monospace`
        ctx.fillText(formatNumber(value, 2), rect.x + rect.width - 36, y - 8)
      }

      function drawResponsePanel(rect, response) {
        drawPanelFrame(rect, "Response breakdown")
        const swatchRect = {
          x: rect.x + 16,
          y: rect.y + 42,
          width: rect.width - 32,
          height: rect.height * 0.24,
        }
        const baseColor = [0.21, 0.74, 0.93]
        const shade = [
          clamp(baseColor[0] * (0.18 + response.diffuse * 0.72) + response.specular * 0.92, 0, 1),
          clamp(baseColor[1] * (0.18 + response.diffuse * 0.72) + response.specular * 0.92, 0, 1),
          clamp(baseColor[2] * (0.18 + response.diffuse * 0.72) + response.specular * 0.92, 0, 1),
        ]

        ctx.fillStyle = "rgba(255, 255, 255, 0.08)"
        ctx.fillRect(swatchRect.x, swatchRect.y, swatchRect.width, swatchRect.height)
        ctx.fillStyle = `rgba(${Math.round(shade[0] * 255)}, ${Math.round(shade[1] * 255)}, ${Math.round(shade[2] * 255)}, 1)`
        ctx.fillRect(swatchRect.x + 8, swatchRect.y + 8, swatchRect.width - 16, swatchRect.height - 16)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)"
        ctx.strokeRect(swatchRect.x, swatchRect.y, swatchRect.width, swatchRect.height)

        drawBar(
          { x: rect.x + 16, width: rect.width - 32 },
          "Diffuse",
          response.diffuse,
          "rgba(247, 160, 74, 0.96)",
          swatchRect.y + swatchRect.height + 34
        )
        drawBar(
          { x: rect.x + 16, width: rect.width - 32 },
          "Specular",
          clamp(response.specular * 2.2, 0, 1),
          "rgba(255, 245, 216, 0.98)",
          swatchRect.y + swatchRect.height + 76
        )

        const stripRect = {
          x: rect.x + 16,
          y: swatchRect.y + swatchRect.height + 116,
          width: rect.width - 32,
          height: Math.max(34, rect.height * 0.16),
        }
        const shininessNorm = clamp((response.shininess - 10) / 62, 0, 1)
        const highlightCenter = 0.54
        const highlightWidth = lerp(0.26, 0.07, shininessNorm)

        ctx.fillStyle = "rgba(255, 255, 255, 0.06)"
        ctx.fillRect(stripRect.x, stripRect.y, stripRect.width, stripRect.height)
        for (let index = 0; index < stripRect.width; index += 1) {
          const x = index / Math.max(stripRect.width - 1, 1)
          const distance = Math.abs(x - highlightCenter)
          const highlight = Math.pow(clamp(1 - distance / highlightWidth, 0, 1), 2 + shininessNorm * 8) * response.specular * 2.2
          const diffuseBand = 0.14 + response.diffuse * 0.34
          const r = clamp(baseColor[0] * diffuseBand + highlight, 0, 1)
          const g = clamp(baseColor[1] * diffuseBand + highlight, 0, 1)
          const b = clamp(baseColor[2] * diffuseBand + highlight, 0, 1)
          ctx.fillStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 1)`
          ctx.fillRect(stripRect.x + index, stripRect.y, 1.5, stripRect.height)
        }

        ctx.fillStyle = "rgba(239, 245, 247, 0.84)"
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`
        ctx.fillText(`shininess = ${formatNumber(response.shininess, 0)}`, stripRect.x, stripRect.y - 8)
        ctx.fillText("Higher shininess concentrates the highlight into a tighter strip.", stripRect.x, stripRect.y + stripRect.height + 18)
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      const background = ctx.createLinearGradient(0, 0, 0, height)
      background.addColorStop(0, "#102535")
      background.addColorStop(1, "#183446")
      ctx.fillStyle = background
      ctx.fillRect(0, 0, width, height)

      const response = drawGeometryPanel(geometryRect)
      drawResponsePanel(responseRect, response)
    },
  })
}

function setupDisplayStoryDemo() {
  const canvas = document.getElementById("display-story-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  function luminanceColor(value) {
    const v = clamp(value, 0, 1)
    return [
      0.18 + v * 0.78,
      0.24 + v * 0.62,
      0.42 + v * 0.34,
    ]
  }

  function colorToCss(color, alpha = 1) {
    return `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)}, ${alpha})`
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.06 : time * 0.68;
      const exposure = lerp(0.82, 1.56, (Math.sin(phase * 0.94) + 1) * 0.5)
      const gamma = 2.2
      const baseSamples = [0.08, 0.2, 0.46, 0.95, 1.8, 3.8]
      const linearSamples = baseSamples.map((value) => value * exposure)
      const toneMappedSamples = linearSamples.map((value) => value / (1 + value))
      const displaySamples = toneMappedSamples.map((value) => Math.pow(clamp(value, 0, 1), 1 / gamma))
      const margin = 18
      const gap = 16
      const stacked = width < 860
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap * 2) / 3
      const panelHeight = stacked ? (height - margin * 2 - gap * 2) / 3 : height - margin * 2
      const rects = [
        { x: margin, y: margin, width: panelWidth, height: panelHeight },
        stacked
          ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
          : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
        stacked
          ? { x: margin, y: margin + (panelHeight + gap) * 2, width: panelWidth, height: panelHeight }
          : { x: margin + (panelWidth + gap) * 2, y: margin, width: panelWidth, height: panelHeight },
      ]

      function drawPanel(rect, title, values, maxValue, footer, clampPreview) {
        ctx.fillStyle = "rgba(8, 21, 30, 0.22)"
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
        ctx.lineWidth = 1
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
        ctx.fillStyle = "rgba(239, 245, 247, 0.94)"
        ctx.font = `${Math.max(11, width * 0.014)}px "Avenir Next", "Segoe UI", sans-serif`
        ctx.fillText(title, rect.x + 14, rect.y + 22)

        const chartRect = {
          x: rect.x + 18,
          y: rect.y + 42,
          width: rect.width - 36,
          height: rect.height * 0.48,
        }
        const swatchRect = {
          x: rect.x + 18,
          y: chartRect.y + chartRect.height + 24,
          width: rect.width - 36,
          height: 28,
        }
        const barGap = 8
        const barWidth = (chartRect.width - barGap * (values.length - 1)) / values.length
        const displayMaxLine = chartRect.y + chartRect.height - (chartRect.height / maxValue)

        ctx.fillStyle = "rgba(255, 255, 255, 0.04)"
        ctx.fillRect(chartRect.x, chartRect.y, chartRect.width, chartRect.height)
        ctx.strokeStyle = "rgba(255, 245, 216, 0.24)"
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(chartRect.x, displayMaxLine)
        ctx.lineTo(chartRect.x + chartRect.width, displayMaxLine)
        ctx.stroke()
        ctx.fillStyle = "rgba(239, 245, 247, 0.76)"
        ctx.font = `${Math.max(10, width * 0.012)}px "IBM Plex Mono", "SFMono-Regular", monospace`
        ctx.fillText("1.0", chartRect.x + chartRect.width - 28, displayMaxLine - 8)

        values.forEach((value, index) => {
          const clampedValue = clamp(value, 0, maxValue)
          const barHeight = (clampedValue / maxValue) * chartRect.height
          const x = chartRect.x + index * (barWidth + barGap)
          const y = chartRect.y + chartRect.height - barHeight
          const barColor = luminanceColor(maxValue === 1 ? value : Math.min(value / maxValue, 1))

          ctx.fillStyle = colorToCss(barColor)
          ctx.fillRect(x, y, barWidth, barHeight)

          if (value > 1 && maxValue > 1) {
            const overflowHeight = ((Math.min(value, maxValue) - 1) / maxValue) * chartRect.height
            ctx.fillStyle = colorToCss([1, 0.86, 0.46], 0.42)
            ctx.fillRect(x, displayMaxLine - overflowHeight, barWidth, overflowHeight)
          }
        })

        const swatchWidth = swatchRect.width / values.length
        values.forEach((value, index) => {
          const previewValue = clampPreview ? clamp(value, 0, 1) : value
          ctx.fillStyle = colorToCss(luminanceColor(previewValue))
          ctx.fillRect(swatchRect.x + index * swatchWidth, swatchRect.y, swatchWidth - 2, swatchRect.height)
        })

        ctx.fillStyle = "rgba(239, 245, 247, 0.84)"
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`
        ctx.fillText(footer, rect.x + 18, rect.y + rect.height - 14)
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      const background = ctx.createLinearGradient(0, 0, 0, height)
      background.addColorStop(0, "#102535")
      background.addColorStop(1, "#183446")
      ctx.fillStyle = background
      ctx.fillRect(0, 0, width, height)

      drawPanel(rects[0], "Linear working values", linearSamples, Math.max(4.5, linearSamples[linearSamples.length - 1]), "Raw light values can exceed the display range.", true)
      drawPanel(rects[1], "After tone mapping", toneMappedSamples, 1, "Range is compressed into a viewable interval.", false)
      drawPanel(rects[2], "After display encoding", displaySamples, 1, "Midtones shift again for the monitor response.", false)
    },
  })
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

function setupFoundationTypesDemo() {
  const canvas = document.getElementById("foundation-types-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.1 : time * 0.82;
      const margin = 18;
      const gap = 16;
      const stacked = width < 900;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap * 2) / 3;
      const panelHeight = stacked ? (height - margin * 2 - gap * 2) / 3 : height - margin * 2;
      const translation = [Math.sin(phase * 0.9) * 0.62, 0.32 + Math.cos(phase * 0.68) * 0.22];
      const pointStart = [0.92, 0.42];
      const pointEnd = add2(pointStart, scale2(translation, 0.92));
      const offsetStart = [-1.4, -0.72];
      const offsetDelta = [1.42, 0.88];
      const offsetEnd = add2(offsetStart, offsetDelta);
      const movedOffsetStart = add2(offsetStart, scale2(translation, 0.76));
      const movedOffsetEnd = add2(offsetEnd, scale2(translation, 0.76));
      const direction = normalize2([1, 0.34 + Math.sin(phase * 1.18) * 0.26]);
      const directionVector = scale2(direction, 1.38);
      const directionAnchorA = [-1.18, -0.44];
      const directionAnchorB = add2(directionAnchorA, scale2(translation, 0.9));
      const rects = [
        { x: margin, y: margin, width: panelWidth, height: panelHeight },
        stacked
          ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
          : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
        stacked
          ? { x: margin, y: margin + (panelHeight + gap) * 2, width: panelWidth, height: panelHeight }
          : { x: margin + (panelWidth + gap) * 2, y: margin, width: panelWidth, height: panelHeight },
      ];

      function drawPointPanel(rect) {
        const extentX = 2.9;
        const extentY = 2.4;
        drawLessonCanvasPanel(ctx, rect, "Point", width);
        drawRectAxesGrid(ctx, rect, extentX, extentY, width);
        const startCanvas = projectRectPoint(rect, pointStart, extentX, extentY);
        const endCanvas = projectRectPoint(rect, pointEnd, extentX, extentY);

        ctx.setLineDash([8, 6]);
        drawArrow2d(ctx, startCanvas, endCanvas, "rgba(255, 223, 132, 0.88)", Math.max(1.8, width * 0.0028));
        ctx.setLineDash([]);

        drawCanvasDot(ctx, startCanvas, Math.max(5, width * 0.0065), "rgba(247, 160, 74, 0.92)");
        drawCanvasDot(
          ctx,
          endCanvas,
          Math.max(7, width * 0.0082),
          "rgba(115, 221, 213, 0.3)",
          "rgba(115, 221, 213, 0.98)",
          Math.max(2, width * 0.003)
        );
      }

      function drawOffsetPanel(rect) {
        const extentX = 2.9;
        const extentY = 2.4;
        drawLessonCanvasPanel(ctx, rect, "Offset", width);
        drawRectAxesGrid(ctx, rect, extentX, extentY, width);
        const startCanvas = projectRectPoint(rect, offsetStart, extentX, extentY);
        const endCanvas = projectRectPoint(rect, offsetEnd, extentX, extentY);
        const movedStartCanvas = projectRectPoint(rect, movedOffsetStart, extentX, extentY);
        const movedEndCanvas = projectRectPoint(rect, movedOffsetEnd, extentX, extentY);

        ctx.setLineDash([7, 6]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = Math.max(1.4, width * 0.0024);
        ctx.beginPath();
        ctx.moveTo(startCanvas[0], startCanvas[1]);
        ctx.lineTo(movedStartCanvas[0], movedStartCanvas[1]);
        ctx.moveTo(endCanvas[0], endCanvas[1]);
        ctx.lineTo(movedEndCanvas[0], movedEndCanvas[1]);
        ctx.stroke();
        ctx.setLineDash([]);

        drawArrow2d(ctx, startCanvas, endCanvas, "rgba(247, 160, 74, 0.86)", Math.max(2, width * 0.003));
        drawArrow2d(ctx, movedStartCanvas, movedEndCanvas, "rgba(115, 221, 213, 0.92)", Math.max(2, width * 0.003));
        drawCanvasDot(ctx, startCanvas, Math.max(4.5, width * 0.006), "rgba(247, 160, 74, 0.9)");
        drawCanvasDot(ctx, endCanvas, Math.max(4.5, width * 0.006), "rgba(247, 160, 74, 0.9)");
        drawCanvasDot(ctx, movedStartCanvas, Math.max(4.5, width * 0.006), "rgba(115, 221, 213, 0.92)");
        drawCanvasDot(ctx, movedEndCanvas, Math.max(4.5, width * 0.006), "rgba(115, 221, 213, 0.92)");
      }

      function drawDirectionPanel(rect) {
        const extentX = 2.9;
        const extentY = 2.4;
        drawLessonCanvasPanel(ctx, rect, "Direction", width);
        drawRectAxesGrid(ctx, rect, extentX, extentY, width);
        const anchorACanvas = projectRectPoint(rect, directionAnchorA, extentX, extentY);
        const anchorBCanvas = projectRectPoint(rect, directionAnchorB, extentX, extentY);
        const tipACanvas = projectRectPoint(rect, add2(directionAnchorA, directionVector), extentX, extentY);
        const tipBCanvas = projectRectPoint(rect, add2(directionAnchorB, directionVector), extentX, extentY);

        ctx.setLineDash([8, 6]);
        drawArrow2d(ctx, anchorACanvas, anchorBCanvas, "rgba(255, 223, 132, 0.8)", Math.max(1.6, width * 0.0026));
        ctx.setLineDash([]);

        drawArrow2d(ctx, anchorACanvas, tipACanvas, "rgba(247, 160, 74, 0.88)", Math.max(2.1, width * 0.003));
        drawArrow2d(ctx, anchorBCanvas, tipBCanvas, "rgba(115, 221, 213, 0.94)", Math.max(2.1, width * 0.003));
        drawCanvasDot(ctx, anchorACanvas, Math.max(4, width * 0.0055), "rgba(247, 160, 74, 0.9)");
        drawCanvasDot(ctx, anchorBCanvas, Math.max(4, width * 0.0055), "rgba(115, 221, 213, 0.9)");
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawPointPanel(rects[0]);
      drawOffsetPanel(rects[1]);
      drawDirectionPanel(rects[2]);
    },
  });
}

function setupGameVectorsStoryDemo() {
  const canvas = document.getElementById("game-vectors-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.18 : time * 0.84;
      const arenaRect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const extentX = 4.1;
      const extentY = 3.1;
      const player = [
        -1.28 + Math.cos(phase * 0.82) * 0.62,
        -0.18 + Math.sin(phase * 0.97) * 0.4,
      ];
      const velocityRaw = [
        -Math.sin(phase * 0.82) * 0.62 * 0.82,
        Math.cos(phase * 0.97) * 0.4 * 0.97,
      ];
      const moveDir = normalize2(velocityRaw);
      const velocity = scale2(moveDir, 1.14 + (0.5 + Math.sin(phase * 1.1) * 0.5) * 0.36);
      const nextPoint = add2(player, scale2(velocity, 0.34));
      const enemyBase = [
        1.52 + Math.cos(phase * 0.44) * 0.18,
        0.82 + Math.sin(phase * 0.62) * 0.24,
      ];
      const toEnemy = subtract2(enemyBase, player);
      const aimDir = normalize2(toEnemy);
      const shotCycle = prefersReducedMotion ? 0.52 : (time * 0.92) % 1;
      const knockbackStrength = shotCycle > 0.82 ? (shotCycle - 0.82) / 0.18 : 0;
      const knockback = scale2(aimDir, Math.min(1, knockbackStrength) * 0.26);
      const enemy = add2(enemyBase, knockback);
      const projectileStart = add2(player, scale2(aimDir, 0.4));
      const projectileTravel = Math.max(Math.hypot(toEnemy[0], toEnemy[1]) - 0.65, 0.2);
      const projectile = add2(projectileStart, scale2(aimDir, projectileTravel * Math.min(shotCycle * 1.18, 1)));
      const arrowTipAim = add2(player, scale2(aimDir, 1.35));
      const arrowTipVelocity = add2(player, scale2(velocity, 0.72));
      const obstacleRects = [
        { min: [-0.05, -1.42], max: [0.92, -0.84] },
        { min: [-0.64, 1.02], max: [0.28, 1.5] },
      ];

      function toArena(point) {
        return projectRectPoint(arenaRect, point, extentX, extentY, 18, 22, 0.58);
      }

      function drawObstacle(rect) {
        const topLeft = toArena([rect.min[0], rect.max[1]]);
        const bottomRight = toArena([rect.max[0], rect.min[1]]);
        ctx.fillStyle = "rgba(8, 18, 26, 0.38)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.fillRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
        ctx.strokeRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawLessonCanvasPanel(ctx, arenaRect, "Arena vectors", width);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let x = -4; x <= 4; x += 1) {
        const start = toArena([x, -extentY]);
        const end = toArena([x, extentY]);
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
      }
      for (let y = -3; y <= 3; y += 1) {
        const start = toArena([-extentX, y]);
        const end = toArena([extentX, y]);
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
      }

      for (const rect of obstacleRects) {
        drawObstacle(rect);
      }

      ctx.strokeStyle = "rgba(115, 221, 213, 0.18)";
      ctx.lineWidth = Math.max(1.6, width * 0.0024);
      ctx.beginPath();
      for (let step = 0; step <= 24; step += 1) {
        const samplePhase = phase - (24 - step) * 0.12;
        const samplePoint = [
          -1.28 + Math.cos(samplePhase * 0.82) * 0.62,
          -0.18 + Math.sin(samplePhase * 0.97) * 0.4,
        ];
        const projected = toArena(samplePoint);
        if (step === 0) {
          ctx.moveTo(projected[0], projected[1]);
        } else {
          ctx.lineTo(projected[0], projected[1]);
        }
      }
      ctx.stroke();

      const playerCanvas = toArena(player);
      const nextCanvas = toArena(nextPoint);
      const enemyCanvas = toArena(enemy);
      const enemyBaseCanvas = toArena(enemyBase);
      const projectileCanvas = toArena(projectile);
      const velocityCanvas = toArena(arrowTipVelocity);
      const aimCanvas = toArena(arrowTipAim);

      ctx.setLineDash([8, 6]);
      drawArrow2d(ctx, playerCanvas, enemyCanvas, "rgba(255, 223, 132, 0.82)", Math.max(1.8, width * 0.0028));
      ctx.setLineDash([]);
      drawArrow2d(ctx, playerCanvas, velocityCanvas, "rgba(247, 160, 74, 0.95)", Math.max(2.4, width * 0.0032));
      drawArrow2d(ctx, playerCanvas, aimCanvas, "rgba(115, 221, 213, 0.96)", Math.max(2.3, width * 0.0032));

      if (knockbackStrength > 0) {
        drawArrow2d(ctx, enemyBaseCanvas, enemyCanvas, "rgba(255, 154, 102, 0.94)", Math.max(2, width * 0.003));
      }

      drawCanvasDot(
        ctx,
        nextCanvas,
        Math.max(8, width * 0.0092),
        "rgba(255, 255, 255, 0.08)",
        "rgba(255, 255, 255, 0.22)",
        Math.max(1.4, width * 0.0022)
      );
      drawCanvasDot(ctx, playerCanvas, Math.max(9, width * 0.0104), "rgba(247, 160, 74, 0.96)", "rgba(255, 245, 216, 0.98)", Math.max(1.8, width * 0.0026));
      drawCanvasDot(ctx, enemyCanvas, Math.max(10, width * 0.011), "rgba(115, 221, 213, 0.92)", "rgba(214, 248, 245, 0.96)", Math.max(1.8, width * 0.0026));
      drawCanvasDot(ctx, projectileCanvas, Math.max(4.8, width * 0.0062), "rgba(255, 245, 216, 0.98)");
    },
  });
}

function setupDotCrossStoryDemo() {
  const canvas = document.getElementById("dot-cross-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.06 : time * 0.82;
      const margin = 18;
      const gap = 16;
      const stacked = width < 900;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap) / 2;
      const panelHeight = stacked ? (height - margin * 2 - gap) / 2 : height - margin * 2;
      const dotRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const crossRect = stacked
        ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
        : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };

      const forwardAngle = 0.24 + Math.sin(phase * 0.58) * 0.4;
      const forward = normalize2([Math.cos(forwardAngle), Math.sin(forwardAngle)]);
      const targetAngle = phase * 1.08 + 0.46;
      const targetPoint = [Math.cos(targetAngle) * 1.65, Math.sin(targetAngle) * 1.18];
      const toTarget = normalize2(targetPoint);
      const dotValue = clamp(dot2(forward, toTarget), -1, 1);
      const dotColor =
        dotValue >= 0 ? "rgba(115, 221, 213, 0.98)" : "rgba(247, 160, 74, 0.98)";

      const pointA = [-1.05, -0.64, -0.24];
      const pointB = [1.18, -0.22, 0.12 + Math.sin(phase * 0.72) * 0.22];
      const pointC = [-0.18, 1.02 + Math.cos(phase * 0.66) * 0.14, 0.72 + Math.sin(phase * 0.9) * 0.24];
      const edge1 = subtract3(pointB, pointA);
      const edge2 = subtract3(pointC, pointA);
      let normal = normalize3(cross3(edge1, edge2));
      const viewDirection = normalize3([0.34, 0.42, 1]);
      if (dot3(normal, viewDirection) < 0) {
        normal = scale3(normal, -1);
      }
      const centroid = [
        (pointA[0] + pointB[0] + pointC[0]) / 3,
        (pointA[1] + pointB[1] + pointC[1]) / 3,
        (pointA[2] + pointB[2] + pointC[2]) / 3,
      ];
      const normalTip = add3(centroid, scale3(normal, 0.94));

      function drawDotPanel(rect) {
        const extentX = 2.45;
        const extentY = 2.15;
        const fontSize = Math.max(10, width * 0.013);

        drawLessonCanvasPanel(ctx, rect, "Dot = alignment", width);
        drawRectAxesGrid(ctx, rect, extentX, extentY, width);

        const origin = projectRectPoint(rect, [0, 0], extentX, extentY);
        const forwardTip = projectRectPoint(rect, scale2(forward, 1.35), extentX, extentY);
        const targetCanvas = projectRectPoint(rect, targetPoint, extentX, extentY);
        const directionTip = projectRectPoint(rect, scale2(toTarget, 1.5), extentX, extentY);
        const orbitRadiusX = (1.65 / extentX) * (rect.width * 0.5 - 16);
        const orbitRadiusY = (1.18 / extentY) * (rect.height * 0.5 - 18);
        const spread = 0.62;
        const coneLength = 1.48;

        ctx.fillStyle = "rgba(255, 223, 132, 0.08)";
        ctx.beginPath();
        ctx.moveTo(origin[0], origin[1]);
        for (let step = 0; step <= 16; step += 1) {
          const offset = lerp(-spread, spread, step / 16);
          const ray = rotate2(forward, offset);
          const conePoint = projectRectPoint(rect, scale2(ray, coneLength), extentX, extentY);
          ctx.lineTo(conePoint[0], conePoint[1]);
        }
        ctx.closePath();
        ctx.fill();

        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = Math.max(1.2, width * 0.0022);
        ctx.beginPath();
        ctx.ellipse(origin[0], origin[1], orbitRadiusX, orbitRadiusY, 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.setLineDash([8, 6]);
        drawArrow2d(ctx, origin, targetCanvas, "rgba(255, 223, 132, 0.72)", Math.max(1.8, width * 0.0028));
        ctx.setLineDash([]);
        drawArrow2d(ctx, origin, forwardTip, "rgba(247, 160, 74, 0.96)", Math.max(2.4, width * 0.0032));
        drawArrow2d(ctx, origin, directionTip, "rgba(115, 221, 213, 0.96)", Math.max(2.3, width * 0.0032));

        drawCameraGlyph(
          ctx,
          origin,
          forwardAngle,
          Math.max(10, width * 0.0112),
          "rgba(247, 160, 74, 0.96)",
          "rgba(255, 245, 216, 0.96)"
        );
        drawCanvasDot(
          ctx,
          targetCanvas,
          Math.max(8, width * 0.0094),
          dotColor,
          "rgba(239, 245, 247, 0.95)",
          Math.max(1.6, width * 0.0024)
        );

        drawCanvasChip(ctx, "f", forwardTip[0] + 14, forwardTip[1] - 14, {
          fontSize,
          color: "rgba(247, 160, 74, 0.98)",
        });
        drawCanvasChip(ctx, "to", directionTip[0] + 14, directionTip[1] - 14, {
          fontSize,
          color: "rgba(115, 221, 213, 0.98)",
        });
        drawCanvasChip(ctx, `dot ${formatNumber(dotValue, 2)}`, rect.x + rect.width - 12, rect.y + 16, {
          align: "right",
          fontSize,
          color: dotColor,
        });

        const meterX = rect.x + 18;
        const meterY = rect.y + rect.height - 24;
        const meterWidth = rect.width - 36;
        const meterHeight = 8;
        const markerX = meterX + ((dotValue + 1) * 0.5) * meterWidth;

        ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
        ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
        ctx.fillStyle = dotColor;
        ctx.fillRect(markerX - 4, meterY - 3, 8, meterHeight + 6);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(meterX + meterWidth * 0.5, meterY - 5);
        ctx.lineTo(meterX + meterWidth * 0.5, meterY + meterHeight + 5);
        ctx.stroke();
      }

      function drawCrossPanel(rect) {
        const extentX = 2.75;
        const extentY = 2.2;
        const fontSize = Math.max(10, width * 0.013);

        function project3(point) {
          const flattened = [
            point[0] * 0.92 - point[2] * 0.56,
            point[1] * 0.9 + point[0] * 0.16 + point[2] * 0.26,
          ];
          return projectRectPoint(rect, flattened, extentX, extentY, 16, 20, 0.58);
        }

        drawLessonCanvasPanel(ctx, rect, "Cross = normal", width);
        drawRectAxesGrid(ctx, rect, extentX, extentY, width);

        const aCanvas = project3(pointA);
        const bCanvas = project3(pointB);
        const cCanvas = project3(pointC);
        const centerCanvas = project3(centroid);
        const normalCanvas = project3(normalTip);
        const edge1Mid = [(aCanvas[0] + bCanvas[0]) * 0.5, (aCanvas[1] + bCanvas[1]) * 0.5];
        const edge2Mid = [(aCanvas[0] + cCanvas[0]) * 0.5, (aCanvas[1] + cCanvas[1]) * 0.5];

        ctx.fillStyle = "rgba(115, 221, 213, 0.18)";
        ctx.strokeStyle = "rgba(214, 248, 245, 0.92)";
        ctx.lineWidth = Math.max(2, width * 0.003);
        ctx.beginPath();
        ctx.moveTo(aCanvas[0], aCanvas[1]);
        ctx.lineTo(bCanvas[0], bCanvas[1]);
        ctx.lineTo(cCanvas[0], cCanvas[1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        drawArrow2d(ctx, aCanvas, bCanvas, "rgba(247, 160, 74, 0.96)", Math.max(2.2, width * 0.003));
        drawArrow2d(ctx, aCanvas, cCanvas, "rgba(115, 221, 213, 0.96)", Math.max(2.2, width * 0.003));
        drawArrow2d(ctx, centerCanvas, normalCanvas, "rgba(255, 245, 216, 0.96)", Math.max(2.3, width * 0.0032));

        drawCanvasDot(ctx, aCanvas, Math.max(5.2, width * 0.0065), "rgba(247, 160, 74, 0.96)");
        drawCanvasDot(ctx, bCanvas, Math.max(5.2, width * 0.0065), "rgba(247, 160, 74, 0.82)");
        drawCanvasDot(ctx, cCanvas, Math.max(5.2, width * 0.0065), "rgba(115, 221, 213, 0.9)");

        drawCanvasChip(ctx, "e1", edge1Mid[0], edge1Mid[1] - 16, {
          fontSize,
          color: "rgba(247, 160, 74, 0.98)",
        });
        drawCanvasChip(ctx, "e2", edge2Mid[0], edge2Mid[1] - 16, {
          fontSize,
          color: "rgba(115, 221, 213, 0.98)",
        });
        drawCanvasChip(ctx, "n", normalCanvas[0] + 12, normalCanvas[1] - 14, {
          fontSize,
          color: "rgba(255, 245, 216, 0.98)",
        });
        drawCanvasChip(ctx, "e1 x e2", rect.x + rect.width - 12, rect.y + 16, {
          align: "right",
          fontSize,
          color: "rgba(255, 245, 216, 0.98)",
        });
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawDotPanel(dotRect);
      drawCrossPanel(crossRect);
    },
  });
}

function setupVectorOffsetUseDemo() {
  const canvas = document.getElementById("vector-offset-use-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.08 : time * 0.84;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const extentX = 3.7;
      const extentY = 2.8;
      const player = [
        -1.72 + Math.cos(phase * 0.92) * 0.42,
        -0.86 + Math.sin(phase * 0.78) * 0.28,
      ];
      const pickup = [
        1.12 + Math.sin(phase * 0.44) * 0.22,
        0.72 + Math.cos(phase * 0.58) * 0.18,
      ];
      const offset = subtract2(pickup, player);
      const reusedStart = [-1.32, 1.02];
      const reusedEnd = add2(reusedStart, offset);
      const fontSize = Math.max(10, width * 0.013);

      function project(point) {
        return projectRectPoint(rect, point, extentX, extentY, 16, 20, 0.6);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawLessonCanvasPanel(ctx, rect, "Offset reuse", width);
      drawRectAxesGrid(ctx, rect, extentX, extentY, width, 0.6);

      const playerCanvas = project(player);
      const pickupCanvas = project(pickup);
      const reusedStartCanvas = project(reusedStart);
      const reusedEndCanvas = project(reusedEnd);

      ctx.setLineDash([8, 6]);
      drawArrow2d(ctx, playerCanvas, pickupCanvas, "rgba(247, 160, 74, 0.94)", Math.max(2.1, width * 0.003));
      ctx.setLineDash([]);
      drawArrow2d(ctx, reusedStartCanvas, reusedEndCanvas, "rgba(115, 221, 213, 0.94)", Math.max(2.1, width * 0.003));

      drawCanvasDot(ctx, playerCanvas, Math.max(7.5, width * 0.009), "rgba(247, 160, 74, 0.96)");
      drawCanvasDot(ctx, pickupCanvas, Math.max(7.5, width * 0.009), "rgba(115, 221, 213, 0.96)");
      drawCanvasDot(ctx, reusedStartCanvas, Math.max(4.6, width * 0.006), "rgba(247, 160, 74, 0.76)");
      drawCanvasDot(ctx, reusedEndCanvas, Math.max(4.6, width * 0.006), "rgba(115, 221, 213, 0.76)");

      drawCanvasChip(ctx, "to", (playerCanvas[0] + pickupCanvas[0]) * 0.5, (playerCanvas[1] + pickupCanvas[1]) * 0.5 - 14, {
        fontSize,
        color: "rgba(247, 160, 74, 0.98)",
      });
      drawCanvasChip(ctx, "same offset", (reusedStartCanvas[0] + reusedEndCanvas[0]) * 0.5, (reusedStartCanvas[1] + reusedEndCanvas[1]) * 0.5 - 14, {
        fontSize,
        color: "rgba(115, 221, 213, 0.98)",
      });
    },
  });
}

function setupVectorNormalizeUseDemo() {
  const canvas = document.getElementById("vector-normalize-use-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.14 : time * 0.86;
      const margin = 18;
      const gap = 14;
      const panelWidth = (width - margin * 2 - gap) / 2;
      const panelHeight = height - margin * 2;
      const leftRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const rightRect = { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };
      const direction = normalize2([1, 0.28 + Math.sin(phase * 0.94) * 0.36]);
      const rawLength = 0.48 + (0.5 + Math.sin(phase * 1.16) * 0.5) * 1.2;
      const raw = scale2(direction, rawLength);
      const fontSize = Math.max(10, width * 0.013);

      function project(rect, point) {
        return projectRectPoint(rect, point, 2.15, 2.15, 14, 20, 0.6);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawLessonCanvasPanel(ctx, leftRect, "Raw", width);
      drawLessonCanvasPanel(ctx, rightRect, "Unit", width);
      drawRectAxesGrid(ctx, leftRect, 2.15, 2.15, width, 0.6);
      drawRectAxesGrid(ctx, rightRect, 2.15, 2.15, width, 0.6);

      const rawOrigin = project(leftRect, [0, 0]);
      const rawTip = project(leftRect, raw);
      drawArrow2d(ctx, rawOrigin, rawTip, "rgba(247, 160, 74, 0.96)", Math.max(2.3, width * 0.0031));
      drawCanvasDot(ctx, rawTip, Math.max(5.5, width * 0.0065), "rgba(247, 160, 74, 0.96)");
      drawCanvasChip(ctx, "v", rawTip[0] + 14, rawTip[1] - 14, {
        fontSize,
        color: "rgba(247, 160, 74, 0.98)",
      });

      const unitOrigin = project(rightRect, [0, 0]);
      const circleEdge = project(rightRect, [1, 0]);
      const unitRadius = Math.abs(circleEdge[0] - unitOrigin[0]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = Math.max(1.4, width * 0.0024);
      ctx.beginPath();
      ctx.arc(unitOrigin[0], unitOrigin[1], unitRadius, 0, TAU);
      ctx.stroke();
      const unitTip = project(rightRect, direction);
      drawArrow2d(ctx, unitOrigin, unitTip, "rgba(115, 221, 213, 0.96)", Math.max(2.3, width * 0.0031));
      drawCanvasDot(ctx, unitTip, Math.max(5.5, width * 0.0065), "rgba(115, 221, 213, 0.96)");
      drawCanvasChip(ctx, "norm(v)", unitTip[0] + 18, unitTip[1] - 14, {
        fontSize,
        color: "rgba(115, 221, 213, 0.98)",
      });
    },
  });
}

function setupVectorDotUseDemo() {
  const canvas = document.getElementById("vector-dot-use-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.04 : time * 0.82;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const extentX = 2.55;
      const extentY = 2.15;
      const forwardAngle = 0.22 + Math.sin(phase * 0.62) * 0.42;
      const forward = normalize2([Math.cos(forwardAngle), Math.sin(forwardAngle)]);
      const targetAngle = phase * 1.08 + 0.48;
      const target = [Math.cos(targetAngle) * 1.6, Math.sin(targetAngle) * 1.2];
      const toTarget = normalize2(target);
      const dotValue = clamp(dot2(forward, toTarget), -1, 1);
      const color = dotValue >= 0 ? "rgba(115, 221, 213, 0.98)" : "rgba(247, 160, 74, 0.98)";
      const fontSize = Math.max(10, width * 0.013);

      function project(point) {
        return projectRectPoint(rect, point, extentX, extentY, 16, 18, 0.6);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawLessonCanvasPanel(ctx, rect, "Front test", width);
      drawRectAxesGrid(ctx, rect, extentX, extentY, width, 0.6);

      const origin = project([0, 0]);
      const forwardTip = project(scale2(forward, 1.3));
      const targetTip = project(scale2(toTarget, 1.45));
      const targetCanvas = project(target);
      const coneSpread = 0.58;

      ctx.fillStyle = "rgba(255, 223, 132, 0.08)";
      ctx.beginPath();
      ctx.moveTo(origin[0], origin[1]);
      for (let step = 0; step <= 14; step += 1) {
        const ray = rotate2(forward, lerp(-coneSpread, coneSpread, step / 14));
        const point = project(scale2(ray, 1.5));
        ctx.lineTo(point[0], point[1]);
      }
      ctx.closePath();
      ctx.fill();

      drawCameraGlyph(ctx, origin, forwardAngle, Math.max(10, width * 0.011), "rgba(247, 160, 74, 0.96)", "rgba(255, 245, 216, 0.96)");
      drawArrow2d(ctx, origin, forwardTip, "rgba(247, 160, 74, 0.96)", Math.max(2.3, width * 0.003));
      ctx.setLineDash([8, 6]);
      drawArrow2d(ctx, origin, targetCanvas, "rgba(255, 223, 132, 0.76)", Math.max(1.7, width * 0.0026));
      ctx.setLineDash([]);
      drawArrow2d(ctx, origin, targetTip, "rgba(115, 221, 213, 0.96)", Math.max(2.2, width * 0.003));
      drawCanvasDot(ctx, targetCanvas, Math.max(7.2, width * 0.0086), color, "rgba(239, 245, 247, 0.95)", Math.max(1.6, width * 0.0023));

      drawCanvasChip(ctx, "f", forwardTip[0] + 14, forwardTip[1] - 14, {
        fontSize,
        color: "rgba(247, 160, 74, 0.98)",
      });
      drawCanvasChip(ctx, "to", targetTip[0] + 14, targetTip[1] - 14, {
        fontSize,
        color: "rgba(115, 221, 213, 0.98)",
      });
      drawCanvasChip(ctx, `dot ${formatNumber(dotValue, 2)}`, rect.x + rect.width - 12, rect.y + 16, {
        align: "right",
        fontSize,
        color,
      });

      const meterX = rect.x + 18;
      const meterY = rect.y + rect.height - 22;
      const meterWidth = rect.width - 36;
      const meterHeight = 8;
      const markerX = meterX + ((dotValue + 1) * 0.5) * meterWidth;
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
      ctx.fillStyle = color;
      ctx.fillRect(markerX - 4, meterY - 3, 8, meterHeight + 6);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(meterX + meterWidth * 0.5, meterY - 5);
      ctx.lineTo(meterX + meterWidth * 0.5, meterY + meterHeight + 5);
      ctx.stroke();
    },
  });
}

function setupVectorCrossUseDemo() {
  const canvas = document.getElementById("vector-cross-use-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.1 : time * 0.78;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const extentX = 2.8;
      const extentY = 2.25;
      const pointA = [-1.05, -0.62, -0.2];
      const pointB = [1.18, -0.18, 0.08 + Math.sin(phase * 0.72) * 0.22];
      const pointC = [-0.16, 0.98 + Math.cos(phase * 0.66) * 0.14, 0.72 + Math.sin(phase * 0.86) * 0.24];
      const edge1 = subtract3(pointB, pointA);
      const edge2 = subtract3(pointC, pointA);
      let normal = normalize3(cross3(edge1, edge2));
      if (dot3(normal, normalize3([0.24, 0.4, 1])) < 0) {
        normal = scale3(normal, -1);
      }
      const center = [
        (pointA[0] + pointB[0] + pointC[0]) / 3,
        (pointA[1] + pointB[1] + pointC[1]) / 3,
        (pointA[2] + pointB[2] + pointC[2]) / 3,
      ];
      const normalTip = add3(center, scale3(normal, 0.9));
      const fontSize = Math.max(10, width * 0.013);

      function project3(point) {
        return projectRectPoint(
          rect,
          [point[0] * 0.92 - point[2] * 0.56, point[1] * 0.88 + point[0] * 0.18 + point[2] * 0.28],
          extentX,
          extentY,
          16,
          20,
          0.6
        );
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawLessonCanvasPanel(ctx, rect, "Triangle normal", width);
      drawRectAxesGrid(ctx, rect, extentX, extentY, width, 0.6);

      const aCanvas = project3(pointA);
      const bCanvas = project3(pointB);
      const cCanvas = project3(pointC);
      const centerCanvas = project3(center);
      const normalCanvas = project3(normalTip);
      const edge1Mid = [(aCanvas[0] + bCanvas[0]) * 0.5, (aCanvas[1] + bCanvas[1]) * 0.5];
      const edge2Mid = [(aCanvas[0] + cCanvas[0]) * 0.5, (aCanvas[1] + cCanvas[1]) * 0.5];

      ctx.fillStyle = "rgba(115, 221, 213, 0.18)";
      ctx.strokeStyle = "rgba(214, 248, 245, 0.92)";
      ctx.lineWidth = Math.max(1.9, width * 0.0028);
      ctx.beginPath();
      ctx.moveTo(aCanvas[0], aCanvas[1]);
      ctx.lineTo(bCanvas[0], bCanvas[1]);
      ctx.lineTo(cCanvas[0], cCanvas[1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      drawArrow2d(ctx, aCanvas, bCanvas, "rgba(247, 160, 74, 0.96)", Math.max(2.1, width * 0.003));
      drawArrow2d(ctx, aCanvas, cCanvas, "rgba(115, 221, 213, 0.96)", Math.max(2.1, width * 0.003));
      drawArrow2d(ctx, centerCanvas, normalCanvas, "rgba(255, 245, 216, 0.96)", Math.max(2.2, width * 0.0031));

      drawCanvasChip(ctx, "e1", edge1Mid[0], edge1Mid[1] - 14, {
        fontSize,
        color: "rgba(247, 160, 74, 0.98)",
      });
      drawCanvasChip(ctx, "e2", edge2Mid[0], edge2Mid[1] - 14, {
        fontSize,
        color: "rgba(115, 221, 213, 0.98)",
      });
      drawCanvasChip(ctx, "n", normalCanvas[0] + 12, normalCanvas[1] - 14, {
        fontSize,
        color: "rgba(255, 245, 216, 0.98)",
      });
    },
  });
}

function setupMatrixColumnsDemo() {
  const canvas = document.getElementById("matrix-columns-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const unitSquare = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.15 : time * 0.76;
      const angle = 0.32 + Math.sin(phase * 0.66) * 0.42;
      const scaleX = 1.04 + Math.sin(phase * 1.12) * 0.28;
      const scaleY = 0.9 + Math.cos(phase * 0.82) * 0.2;
      const shear = Math.sin(phase * 0.58) * 0.38;
      const basisI = [Math.cos(angle) * scaleX * 1.12, Math.sin(angle) * scaleX * 1.12];
      const basisJ = [-Math.sin(angle) * scaleY + shear * 0.46, Math.cos(angle) * scaleY];
      const parallelogram = unitSquare.map((point) => add2(scale2(basisI, point[0]), scale2(basisJ, point[1])));
      const stacked = width < 780;
      const margin = 18;
      const gap = 16;
      const plotRect = stacked
        ? { x: margin, y: margin, width: width - margin * 2, height: height * 0.62 - margin }
        : { x: margin, y: margin, width: width * 0.62 - margin - gap * 0.5, height: height - margin * 2 };
      const infoRect = stacked
        ? { x: margin, y: plotRect.y + plotRect.height + gap, width: width - margin * 2, height: height - plotRect.height - margin * 2 - gap }
        : { x: plotRect.x + plotRect.width + gap, y: margin, width: width - plotRect.width - margin * 2 - gap, height: height - margin * 2 };
      const extentX = 2.7;
      const extentY = 2.5;

      function drawPolygon(points, fillStyle, strokeStyle) {
        ctx.beginPath();
        for (let index = 0; index < points.length; index += 1) {
          const projected = projectRectPoint(plotRect, points[index], extentX, extentY);
          if (index === 0) {
            ctx.moveTo(projected[0], projected[1]);
          } else {
            ctx.lineTo(projected[0], projected[1]);
          }
        }
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = Math.max(1.8, width * 0.0028);
        ctx.fill();
        ctx.stroke();
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);

      drawLessonCanvasPanel(ctx, plotRect, "Columns as axes", width);
      drawRectAxesGrid(ctx, plotRect, extentX, extentY, width);
      drawPolygon(unitSquare, "rgba(255, 255, 255, 0.05)", "rgba(255, 255, 255, 0.18)");
      drawPolygon(parallelogram, "rgba(115, 221, 213, 0.22)", "rgba(115, 221, 213, 0.92)");

      const origin = projectRectPoint(plotRect, [0, 0], extentX, extentY);
      const basisICanvas = projectRectPoint(plotRect, basisI, extentX, extentY);
      const basisJCanvas = projectRectPoint(plotRect, basisJ, extentX, extentY);
      const cornerCanvas = projectRectPoint(plotRect, add2(basisI, basisJ), extentX, extentY);
      drawArrow2d(ctx, origin, basisICanvas, "rgba(247, 160, 74, 0.95)", Math.max(2.4, width * 0.0032));
      drawArrow2d(ctx, origin, basisJCanvas, "rgba(115, 221, 213, 0.96)", Math.max(2.4, width * 0.0032));
      drawCanvasDot(ctx, basisICanvas, Math.max(5.5, width * 0.0066), "rgba(247, 160, 74, 0.96)");
      drawCanvasDot(ctx, basisJCanvas, Math.max(5.5, width * 0.0066), "rgba(115, 221, 213, 0.96)");
      drawCanvasDot(ctx, cornerCanvas, Math.max(6.5, width * 0.0076), "rgba(255, 245, 216, 0.96)");
      drawLessonCanvasPanel(ctx, infoRect, "Read it", width);
      ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
      ctx.font = `${Math.max(12, width * 0.015)}px "SFMono-Regular", "Menlo", "Consolas", monospace`;
      drawTextLines(
        ctx,
        [
          `M(1, 0) = ${formatVector(basisI, 2)}`,
          `M(0, 1) = ${formatVector(basisJ, 2)}`,
          `M(1, 1) = ${formatVector(add2(basisI, basisJ), 2)}`,
        ],
        infoRect.x + 16,
        infoRect.y + Math.max(34, infoRect.height * 0.28),
        Math.max(15, width * 0.0145 * 1.3),
        infoRect.width - 32
      );
    },
  });
}

function setupAffineStoryDemo() {
  const canvas = document.getElementById("affine-story-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const triangle = [
    [-0.88, -0.56],
    [0.96, -0.2],
    [-0.18, 0.92],
  ];
  const samplePoint = [0.72, 0.34];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.12 : time * 0.78;
      const angle = 0.26 + Math.sin(phase * 0.74) * 0.44;
      const scaleX = 1 + Math.sin(phase * 0.98) * 0.24;
      const scaleY = 0.86 + Math.cos(phase * 0.88) * 0.18;
      const translation = [0.96 + Math.sin(phase * 0.62) * 0.24, -0.52 + Math.cos(phase * 0.54) * 0.18];
      const basisI = [Math.cos(angle) * scaleX * 1.08, Math.sin(angle) * scaleX * 1.08];
      const basisJ = [-Math.sin(angle) * scaleY, Math.cos(angle) * scaleY];
      const linearTransform = (point) => add2(scale2(basisI, point[0]), scale2(basisJ, point[1]));
      const linearTriangle = triangle.map(linearTransform);
      const affineTriangle = linearTriangle.map((point) => add2(point, translation));
      const linearPoint = linearTransform(samplePoint);
      const affinePoint = add2(linearPoint, translation);
      const margin = 18;
      const gap = 16;
      const stacked = width < 760;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap) / 2;
      const panelHeight = stacked ? (height - margin * 2 - gap) / 2 : height - margin * 2;
      const linearRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const affineRect = stacked
        ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
        : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };
      const extentX = 3.1;
      const extentY = 2.6;

      function drawPolygon(rect, points, fillStyle, strokeStyle, lineWidth) {
        ctx.beginPath();
        for (let index = 0; index < points.length; index += 1) {
          const projected = projectRectPoint(rect, points[index], extentX, extentY);
          if (index === 0) {
            ctx.moveTo(projected[0], projected[1]);
          } else {
            ctx.lineTo(projected[0], projected[1]);
          }
        }
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.fill();
        ctx.stroke();
      }

      function drawPanel(rect, title, showTranslation) {
        drawLessonCanvasPanel(ctx, rect, title, width);
        const origin = drawRectAxesGrid(ctx, rect, extentX, extentY, width);
        drawPolygon(rect, triangle, "rgba(255, 255, 255, 0.05)", "rgba(255, 255, 255, 0.16)", Math.max(1.4, width * 0.0024));
        drawPolygon(
          rect,
          showTranslation ? affineTriangle : linearTriangle,
          showTranslation ? "rgba(247, 160, 74, 0.2)" : "rgba(115, 221, 213, 0.2)",
          showTranslation ? "rgba(247, 160, 74, 0.92)" : "rgba(115, 221, 213, 0.92)",
          Math.max(2, width * 0.003)
        );

        const transformedOrigin = showTranslation ? projectRectPoint(rect, translation, extentX, extentY) : origin;
        const transformedPoint = projectRectPoint(rect, showTranslation ? affinePoint : linearPoint, extentX, extentY);
        if (showTranslation) {
          ctx.setLineDash([8, 6]);
          drawArrow2d(ctx, origin, transformedOrigin, "rgba(255, 223, 132, 0.9)", Math.max(1.8, width * 0.0028));
          ctx.setLineDash([]);
          drawCanvasDot(ctx, transformedOrigin, Math.max(5, width * 0.0065), "rgba(255, 223, 132, 0.94)");
        }

        drawCanvasDot(
          ctx,
          transformedPoint,
          Math.max(6, width * 0.0076),
          showTranslation ? "rgba(247, 160, 74, 0.96)" : "rgba(115, 221, 213, 0.96)"
        );
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawPanel(linearRect, "Linear", false);
      drawPanel(affineRect, "Affine", true);
    },
  });
}

function setupBasisStoryDemo() {
  const canvas = document.getElementById("basis-story-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const weights = [1.2, 0.65];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.1 : time * 0.78;
      const angle = Math.sin(phase * 0.62) * 0.5 + 0.12;
      const scaleX = 1.08 + Math.sin(phase * 0.94) * 0.24;
      const scaleY = 0.88 + Math.cos(phase * 0.71) * 0.16;
      const basisI = [Math.cos(angle) * scaleX * 1.18, Math.sin(angle) * scaleX * 1.18];
      const basisJ = [-Math.sin(angle) * scaleY, Math.cos(angle) * scaleY];
      const weightedI = scale2(basisI, weights[0]);
      const point = add2(weightedI, scale2(basisJ, weights[1]));
      const extentX = 3.3;
      const extentY = 3.0;

      function toCanvas(point2) {
        return [
          width * 0.5 + (point2[0] / extentX) * (width * 0.5 - 26),
          height * 0.5 - (point2[1] / extentY) * (height * 0.5 - 26),
        ];
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#183446");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let index = -3; index <= 3; index += 1) {
        const horizontalStart = toCanvas([-extentX, index]);
        const horizontalEnd = toCanvas([extentX, index]);
        ctx.beginPath();
        ctx.moveTo(horizontalStart[0], horizontalStart[1]);
        ctx.lineTo(horizontalEnd[0], horizontalEnd[1]);
        ctx.stroke();

        const verticalStart = toCanvas([index, -extentY]);
        const verticalEnd = toCanvas([index, extentY]);
        ctx.beginPath();
        ctx.moveTo(verticalStart[0], verticalStart[1]);
        ctx.lineTo(verticalEnd[0], verticalEnd[1]);
        ctx.stroke();
      }

      const origin = toCanvas([0, 0]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = Math.max(1.5, width * 0.003);
      ctx.beginPath();
      ctx.moveTo(origin[0], 18);
      ctx.lineTo(origin[0], height - 18);
      ctx.moveTo(18, origin[1]);
      ctx.lineTo(width - 18, origin[1]);
      ctx.stroke();

      const basisICanvas = toCanvas(basisI);
      const basisJCanvas = toCanvas(basisJ);
      ctx.lineWidth = Math.max(2.2, width * 0.004);
      ctx.strokeStyle = "rgba(247, 160, 74, 0.96)";
      ctx.beginPath();
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(basisICanvas[0], basisICanvas[1]);
      ctx.stroke();

      ctx.strokeStyle = "rgba(115, 221, 213, 0.96)";
      ctx.beginPath();
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(basisJCanvas[0], basisJCanvas[1]);
      ctx.stroke();

      const weightedICanvas = toCanvas(weightedI);
      const pointCanvas = toCanvas(point);
      ctx.setLineDash([8, 7]);
      ctx.lineWidth = Math.max(1.8, width * 0.0032);
      ctx.strokeStyle = "rgba(247, 160, 74, 0.78)";
      ctx.beginPath();
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(weightedICanvas[0], weightedICanvas[1]);
      ctx.stroke();

      ctx.strokeStyle = "rgba(115, 221, 213, 0.78)";
      ctx.beginPath();
      ctx.moveTo(weightedICanvas[0], weightedICanvas[1]);
      ctx.lineTo(pointCanvas[0], pointCanvas[1]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#f7a04a";
      ctx.beginPath();
      ctx.arc(weightedICanvas[0], weightedICanvas[1], Math.max(4.5, width * 0.008), 0, TAU);
      ctx.fill();

      ctx.fillStyle = "#73ddd5";
      ctx.beginPath();
      ctx.arc(pointCanvas[0], pointCanvas[1], Math.max(6.5, width * 0.0115), 0, TAU);
      ctx.fill();
      const chipFont = Math.max(10, width * 0.0135);
      drawCanvasChip(ctx, "i", basisICanvas[0] + 14, basisICanvas[1] - 14, {
        fontSize: chipFont,
        color: "rgba(247, 160, 74, 0.98)",
      });
      drawCanvasChip(ctx, "j", basisJCanvas[0] + 14, basisJCanvas[1] - 14, {
        fontSize: chipFont,
        color: "rgba(115, 221, 213, 0.98)",
      });
      drawCanvasChip(ctx, `${formatNumber(weights[0], 1)}i`, weightedICanvas[0] + 18, weightedICanvas[1] - 14, {
        fontSize: chipFont,
        color: "rgba(247, 160, 74, 0.98)",
      });
      drawCanvasChip(ctx, "p", pointCanvas[0] + 16, pointCanvas[1] - 16, {
        fontSize: chipFont,
        color: "rgba(115, 221, 213, 0.98)",
      });

    },
  });
}

function setupHomogeneousStoryDemo() {
  const canvas = document.getElementById("homogeneous-story-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const localValue = [1.02, 0.72];
  const translateBase = [0.94, -0.42];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const pulse = prefersReducedMotion ? 1 : 0.5 + Math.sin(time * 1.08) * 0.5;
      const translation = scale2(translateBase, pulse);
      const margin = 18;
      const gap = 16;
      const stacked = width < 640;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap) / 2;
      const panelHeight = stacked ? (height - margin * 2 - gap) / 2 : height - margin * 2;

      function panelToCanvas(rect, point2) {
        const extentX = 2.7;
        const extentY = 2.5;
        return [
          rect.x + rect.width * 0.5 + (point2[0] / extentX) * (rect.width * 0.5 - 16),
          rect.y + rect.height * 0.56 - (point2[1] / extentY) * (rect.height * 0.5 - 18),
        ];
      }

      function drawPanel(rect, label, isPoint) {
        const origin = panelToCanvas(rect, [0, 0]);
        const translationCanvas = panelToCanvas(rect, translation);
        const localCanvas = panelToCanvas(rect, localValue);
        const resultValue = isPoint ? add2(localValue, translation) : localValue;
        const resultCanvas = panelToCanvas(rect, resultValue);

        ctx.fillStyle = "rgba(8, 21, 30, 0.22)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        for (let index = 1; index <= 4; index += 1) {
          const x = rect.x + (rect.width / 5) * index;
          ctx.beginPath();
          ctx.moveTo(x, rect.y + 12);
          ctx.lineTo(x, rect.y + rect.height - 12);
          ctx.stroke();
        }
        for (let index = 1; index <= 4; index += 1) {
          const y = rect.y + (rect.height / 5) * index;
          ctx.beginPath();
          ctx.moveTo(rect.x + 12, y);
          ctx.lineTo(rect.x + rect.width - 12, y);
          ctx.stroke();
        }

        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.beginPath();
        ctx.moveTo(rect.x + 14, origin[1]);
        ctx.lineTo(rect.x + rect.width - 14, origin[1]);
        ctx.moveTo(origin[0], rect.y + 16);
        ctx.lineTo(origin[0], rect.y + rect.height - 16);
        ctx.stroke();

        ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
        ctx.font = `${Math.max(11, width * 0.015)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(label, rect.x + 14, rect.y + 22);

        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = "rgba(255, 223, 132, 0.9)";
        ctx.lineWidth = Math.max(1.7, width * 0.0026);
        ctx.beginPath();
        ctx.moveTo(origin[0], origin[1]);
        ctx.lineTo(translationCanvas[0], translationCanvas[1]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = "rgba(247, 160, 74, 0.92)";
        ctx.beginPath();
        ctx.moveTo(origin[0], origin[1]);
        ctx.lineTo(localCanvas[0], localCanvas[1]);
        ctx.stroke();

        if (isPoint) {
          ctx.setLineDash([7, 6]);
          ctx.strokeStyle = "rgba(115, 221, 213, 0.88)";
          ctx.beginPath();
          ctx.moveTo(localCanvas[0], localCanvas[1]);
          ctx.lineTo(resultCanvas[0], resultCanvas[1]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.fillStyle = "#f7a04a";
        ctx.beginPath();
        ctx.arc(localCanvas[0], localCanvas[1], Math.max(5, width * 0.0075), 0, TAU);
        ctx.fill();

        ctx.strokeStyle = "rgba(115, 221, 213, 0.95)";
        ctx.lineWidth = Math.max(2, width * 0.003);
        ctx.beginPath();
        ctx.arc(resultCanvas[0], resultCanvas[1], Math.max(7, width * 0.009), 0, TAU);
        ctx.stroke();
        const chipFont = Math.max(10, width * 0.0135);
        drawCanvasChip(ctx, "t", translationCanvas[0] + 12, translationCanvas[1] - 12, {
          fontSize: chipFont,
          color: "rgba(255, 223, 132, 0.98)",
        });
        drawCanvasChip(ctx, isPoint ? "p" : "d", localCanvas[0] + 14, localCanvas[1] - 14, {
          fontSize: chipFont,
          color: "rgba(247, 160, 74, 0.98)",
        });
        if (isPoint) {
          drawCanvasChip(ctx, "p+t", resultCanvas[0] + 16, resultCanvas[1] + 14, {
            fontSize: chipFont,
            color: "rgba(115, 221, 213, 0.98)",
          });
        }

      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#183446");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      drawPanel({ x: margin, y: margin, width: panelWidth, height: panelHeight }, "w = 1", true);
      drawPanel(
        stacked
          ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
          : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
        "w = 0",
        false
      );
    },
  });
}

function setupOrderStoryDemo() {
  const canvas = document.getElementById("order-story-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const triangle = [
    [-0.82, -0.54],
    [0.98, -0.14],
    [-0.12, 0.96],
  ];

  function transformTriangle(order, angle, sx, sy) {
    return triangle.map((point) =>
      order === "scale-rotate"
        ? rotate2(scale2Components(point, sx, sy), angle)
        : scale2Components(rotate2(point, angle), sx, sy)
    );
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.15 : time * 0.92;
      const margin = 18;
      const gap = 16;
      const stacked = width < 680;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap) / 2;
      const panelHeight = stacked ? (height - margin * 2 - gap) / 2 : height - margin * 2;

      function drawPanel(rect, title, order, accent) {
        function toCanvas(point2) {
          const extentX = 2.8;
          const extentY = 2.5;
          return [
            rect.x + rect.width * 0.5 + (point2[0] / extentX) * (rect.width * 0.5 - 16),
            rect.y + rect.height * 0.56 - (point2[1] / extentY) * (rect.height * 0.5 - 22),
          ];
        }

        ctx.fillStyle = "rgba(8, 21, 30, 0.22)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        for (let index = 1; index <= 4; index += 1) {
          const x = rect.x + (rect.width / 5) * index;
          ctx.beginPath();
          ctx.moveTo(x, rect.y + 12);
          ctx.lineTo(x, rect.y + rect.height - 12);
          ctx.stroke();
        }
        for (let index = 1; index <= 4; index += 1) {
          const y = rect.y + (rect.height / 5) * index;
          ctx.beginPath();
          ctx.moveTo(rect.x + 12, y);
          ctx.lineTo(rect.x + rect.width - 12, y);
          ctx.stroke();
        }

        const origin = toCanvas([0, 0]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.beginPath();
        ctx.moveTo(rect.x + 14, origin[1]);
        ctx.lineTo(rect.x + rect.width - 14, origin[1]);
        ctx.moveTo(origin[0], rect.y + 16);
        ctx.lineTo(origin[0], rect.y + rect.height - 16);
        ctx.stroke();

        ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
        ctx.font = `${Math.max(11, width * 0.015)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(title, rect.x + 14, rect.y + 22);

        ctx.strokeStyle = accent;
        ctx.lineWidth = Math.max(2, width * 0.003);
        ctx.beginPath();
        for (let step = 0; step <= 28; step += 1) {
          const samplePhase = phase - (28 - step) * 0.085;
          const sx = 1.02 + Math.sin(samplePhase * 1.12) * 0.34;
          const sy = 0.84 + Math.cos(samplePhase * 0.88) * 0.24;
          const angle = samplePhase * 0.74;
          const transformed = transformTriangle(order, angle, sx, sy)[2];
          const pointCanvas = toCanvas(transformed);
          if (step === 0) {
            ctx.moveTo(pointCanvas[0], pointCanvas[1]);
          } else {
            ctx.lineTo(pointCanvas[0], pointCanvas[1]);
          }
        }
        ctx.stroke();

        const sx = 1.02 + Math.sin(phase * 1.12) * 0.34;
        const sy = 0.84 + Math.cos(phase * 0.88) * 0.24;
        const angle = phase * 0.74;
        const transformedTriangle = transformTriangle(order, angle, sx, sy);
        const first = toCanvas(transformedTriangle[0]);
        const second = toCanvas(transformedTriangle[1]);
        const third = toCanvas(transformedTriangle[2]);

        ctx.fillStyle = order === "scale-rotate" ? "rgba(65, 203, 189, 0.22)" : "rgba(244, 171, 101, 0.22)";
        ctx.strokeStyle = "rgba(239, 245, 247, 0.92)";
        ctx.lineWidth = Math.max(2, width * 0.0032);
        ctx.beginPath();
        ctx.moveTo(first[0], first[1]);
        ctx.lineTo(second[0], second[1]);
        ctx.lineTo(third[0], third[1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(third[0], third[1], Math.max(6, width * 0.009), 0, TAU);
        ctx.fill();

      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#183446");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      drawPanel(
        { x: margin, y: margin, width: panelWidth, height: panelHeight },
        "S then R",
        "scale-rotate",
        "rgba(115, 221, 213, 0.96)"
      );
      drawPanel(
        stacked
          ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
          : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
        "R then S",
        "rotate-scale",
        "rgba(247, 160, 74, 0.96)"
      );
    },
  });
}

function setupBasisProbeDemo() {
  const canvas = document.getElementById("basis-probe-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const readouts = {
    local: document.getElementById("basis-local-readout"),
    basis: document.getElementById("basis-basis-readout"),
    homogeneous: document.getElementById("basis-homogeneous-readout"),
    world: document.getElementById("basis-world-readout"),
  };

  const state = {
    weights: [1.1, 0.55],
    dragging: null,
  };

  canvas.style.touchAction = "none";

  function getBasis() {
    const angle = degreesToRadians(Number(basisProbeControls.angle?.value || 0));
    return {
      i: [Math.cos(angle) * 1.35, Math.sin(angle) * 1.35],
      j: [-Math.sin(angle) * 0.95, Math.cos(angle) * 0.95],
    };
  }

  function getTranslation() {
    return [
      Number(basisProbeControls.translateX?.value || 0) / 42,
      Number(basisProbeControls.translateY?.value || 0) / 42,
    ];
  }

  function localPoint(basis) {
    return add2(scale2(basis.i, state.weights[0]), scale2(basis.j, state.weights[1]));
  }

  function solveWeights(point, basis) {
    const determinant = basis.i[0] * basis.j[1] - basis.i[1] * basis.j[0] || 1;
    return [
      (point[0] * basis.j[1] - point[1] * basis.j[0]) / determinant,
      (basis.i[0] * point[1] - basis.i[1] * point[0]) / determinant,
    ];
  }

  function updateWeightsFromCanvas(event) {
    const width = canvas.width;
    const height = canvas.height;
    const pointer = getCanvasPointer(event, canvas);
    const world = [
      ((pointer[0] / Math.max(width, 1)) * 2 - 1) * 3.2,
      (1 - (pointer[1] / Math.max(height, 1)) * 2) * 3.2,
    ];
    const basis = getBasis();
    const translation = getTranslation();
    const useTranslation = Boolean(basisProbeControls.translateToggle?.checked);
    const adjustedPoint =
      state.dragging === "translated" && useTranslation ? subtract2(world, translation) : world;
    const weights = solveWeights(adjustedPoint, basis);
    state.weights[0] = clamp(weights[0], -2.4, 2.4);
    state.weights[1] = clamp(weights[1], -2.4, 2.4);
  }

  canvas.addEventListener("pointerdown", (event) => {
    const basis = getBasis();
    const translation = getTranslation();
    const local = localPoint(basis);
    const translated = add2(local, translation);
    const pointer = getCanvasPointer(event, canvas);
    const width = canvas.width;
    const height = canvas.height;
    const toCanvas = (point) => [
      ((point[0] / 3.2 + 1) * 0.5) * width,
      ((1 - point[1] / 3.2) * 0.5) * height,
    ];
    const localCanvas = toCanvas(local);
    const translatedCanvas = toCanvas(translated);
    const localDistance = Math.hypot(pointer[0] - localCanvas[0], pointer[1] - localCanvas[1]);
    const translatedDistance = Math.hypot(pointer[0] - translatedCanvas[0], pointer[1] - translatedCanvas[1]);
    state.dragging =
      basisProbeControls.translateToggle?.checked && translatedDistance < localDistance
        ? "translated"
        : "local";

    updateWeightsFromCanvas(event);
    if (typeof canvas.setPointerCapture === "function") {
      canvas.setPointerCapture(event.pointerId);
    }
    markAllDemosDirty();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.dragging) {
      return;
    }
    updateWeightsFromCanvas(event);
    markAllDemosDirty();
  });

  function endBasisDrag() {
    state.dragging = null;
    markAllDemosDirty();
  }

  canvas.addEventListener("pointerup", endBasisDrag);
  canvas.addEventListener("pointercancel", endBasisDrag);

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const basis = getBasis();
      const translation = getTranslation();
      const useTranslation = Boolean(basisProbeControls.translateToggle?.checked);
      const local = localPoint(basis);
      const result = useTranslation ? add2(local, translation) : local;
      const homogeneous = [state.weights[0], state.weights[1], 0, useTranslation ? 1 : 0];

      function toCanvas(point) {
        return [
          ((point[0] / 3.2 + 1) * 0.5) * width,
          ((1 - point[1] / 3.2) * 0.5) * height,
        ];
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#173345");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let index = -3; index <= 3; index += 1) {
        const start = toCanvas([-3.2, index]);
        const end = toCanvas([3.2, index]);
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
      }
      for (let index = -3; index <= 3; index += 1) {
        const start = toCanvas([index, -3.2]);
        const end = toCanvas([index, 3.2]);
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
      }

      const origin = toCanvas([0, 0]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = Math.max(1.5, width * 0.003);
      ctx.beginPath();
      ctx.moveTo(origin[0], 18);
      ctx.lineTo(origin[0], height - 18);
      ctx.moveTo(18, origin[1]);
      ctx.lineTo(width - 18, origin[1]);
      ctx.stroke();

      if (useTranslation) {
        const translatedOrigin = toCanvas(translation);
        ctx.setLineDash([10, 7]);
        ctx.strokeStyle = "rgba(255, 224, 156, 0.84)";
        ctx.beginPath();
        ctx.moveTo(origin[0], origin[1]);
        ctx.lineTo(translatedOrigin[0], translatedOrigin[1]);
        ctx.stroke();
        ctx.setLineDash([]);

        const translatedI = toCanvas(add2(translation, basis.i));
        const translatedJ = toCanvas(add2(translation, basis.j));
        ctx.strokeStyle = "rgba(116, 221, 218, 0.34)";
        ctx.beginPath();
        ctx.moveTo(translatedOrigin[0], translatedOrigin[1]);
        ctx.lineTo(translatedI[0], translatedI[1]);
        ctx.moveTo(translatedOrigin[0], translatedOrigin[1]);
        ctx.lineTo(translatedJ[0], translatedJ[1]);
        ctx.stroke();
      }

      const basisI = toCanvas(basis.i);
      const basisJ = toCanvas(basis.j);
      ctx.strokeStyle = "rgba(255, 196, 104, 0.94)";
      ctx.lineWidth = Math.max(2.2, width * 0.0046);
      ctx.beginPath();
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(basisI[0], basisI[1]);
      ctx.stroke();

      ctx.strokeStyle = "rgba(110, 226, 201, 0.96)";
      ctx.beginPath();
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(basisJ[0], basisJ[1]);
      ctx.stroke();

      const localCanvas = toCanvas(local);
      const chipFont = Math.max(10, width * 0.0135);
      ctx.fillStyle = "#f7a04a";
      ctx.beginPath();
      ctx.arc(localCanvas[0], localCanvas[1], Math.max(6, width * 0.012), 0, TAU);
      ctx.fill();
      drawCanvasChip(ctx, "i", basisI[0] + 14, basisI[1] - 14, {
        fontSize: chipFont,
        color: "rgba(255, 196, 104, 0.98)",
      });
      drawCanvasChip(ctx, "j", basisJ[0] + 14, basisJ[1] - 14, {
        fontSize: chipFont,
        color: "rgba(110, 226, 201, 0.98)",
      });
      drawCanvasChip(ctx, "p", localCanvas[0] + 16, localCanvas[1] - 16, {
        fontSize: chipFont,
        color: "rgba(247, 160, 74, 0.98)",
      });

      if (useTranslation) {
        const resultCanvas = toCanvas(result);
        ctx.fillStyle = "#73ddd5";
        ctx.beginPath();
        ctx.arc(resultCanvas[0], resultCanvas[1], Math.max(6, width * 0.012), 0, TAU);
        ctx.fill();

        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = "rgba(115, 221, 213, 0.9)";
        ctx.lineWidth = Math.max(1.7, width * 0.0032);
        ctx.beginPath();
        ctx.moveTo(localCanvas[0], localCanvas[1]);
        ctx.lineTo(resultCanvas[0], resultCanvas[1]);
        ctx.stroke();
        ctx.setLineDash([]);
        const translatedOrigin = toCanvas(translation);
        drawCanvasChip(ctx, "t", translatedOrigin[0] + 12, translatedOrigin[1] - 12, {
          fontSize: chipFont,
          color: "rgba(255, 223, 132, 0.98)",
        });
        drawCanvasChip(ctx, "p+t", resultCanvas[0] + 16, resultCanvas[1] - 16, {
          fontSize: chipFont,
          color: "rgba(115, 221, 213, 0.98)",
        });
      }

      if (readouts.local) {
        readouts.local.textContent = formatVector(state.weights, 2);
      }
      if (readouts.basis) {
        readouts.basis.textContent = `i = ${formatVector(basis.i, 2)}, j = ${formatVector(basis.j, 2)}`;
      }
      if (readouts.homogeneous) {
        readouts.homogeneous.textContent = formatVector(homogeneous, 2);
      }
      if (readouts.world) {
        readouts.world.textContent = formatVector(result, 2);
      }
    },
  });
}

function setupSpaceProbeDemo() {
  const canvas = document.getElementById("space-probe-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const label = document.getElementById("space-stage-label");
  const note = document.getElementById("space-stage-note");
  const readouts = {
    object: document.getElementById("space-readout-object"),
    world: document.getElementById("space-readout-world"),
    view: document.getElementById("space-readout-view"),
    clip: document.getElementById("space-readout-clip"),
    ndc: document.getElementById("space-readout-ndc"),
  };
  const stageCards = Array.from(document.querySelectorAll("[data-space-stage]"));
  const stageNames = [
    "Object space",
    "World space",
    "View space",
    "Clip space",
    "Normalized device coordinates",
  ];
  const stageNotes = [
    "The vertex still lives in the model’s own local coordinate frame.",
    "The model matrix has placed the vertex into the shared scene.",
    "The view matrix has rewritten the scene relative to the camera.",
    "Projection has produced a homogeneous clip coordinate that still carries w.",
    "The divide by w has happened, so the point now lives inside the screen-ready canonical box.",
  ];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const stage = Number(spaceProbeControls.stage?.value || 0);
      const object = [
        Number(spaceProbeControls.x?.value || 0) / 50,
        Number(spaceProbeControls.y?.value || 0) / 50,
        Number(spaceProbeControls.z?.value || 0) / 50,
        1,
      ];

      const model = mat4Multiply(
        mat4Translation(1.2, -0.18, -0.7),
        mat4Multiply(mat4RotationY(0.56), mat4RotationX(-0.32))
      );
      const camera = [1.9, 1.25, 4.1];
      const view = mat4LookAt(camera, [0.35, 0.1, 0], [0, 1, 0]);
      const projection = mat4Perspective(degreesToRadians(52), width / Math.max(height, 1), 0.1, 20);

      const world = transformPoint(model, object);
      const viewPoint = transformPoint(view, world);
      const clip = transformPoint(projection, viewPoint);
      const safeW = clip[3] || 1;
      const ndc = [clip[0] / safeW, clip[1] / safeW, clip[2] / safeW, 1];
      const values = [object, world, viewPoint, clip, ndc];

      function stageToCanvas(point, extentX, extentY) {
        const margin = 28;
        return [
          width * 0.5 + (point[0] / Math.max(extentX, 1e-6)) * (width * 0.5 - margin),
          height * 0.5 - (point[1] / Math.max(extentY, 1e-6)) * (height * 0.5 - margin),
        ];
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#183344");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let index = 0; index <= 8; index += 1) {
        const x = (width / 8) * index;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let index = 0; index <= 6; index += 1) {
        const y = (height / 6) * index;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      let extentX = 2.2;
      let extentY = 2.2;
      const current = values[stage];
      if (stage < 3) {
        extentX = Math.max(2.2, Math.abs(current[0]) * 1.35, Math.abs(current[1]) * 1.35);
        extentY = Math.max(2.2, Math.abs(current[0]) * 0.95, Math.abs(current[1]) * 1.35);
      } else if (stage === 3) {
        extentX = Math.max(1.2, Math.abs(current[3]) * 1.35, Math.abs(current[0]) * 1.2);
        extentY = Math.max(1.2, Math.abs(current[3]) * 1.35, Math.abs(current[1]) * 1.2);
      } else {
        extentX = 1.25;
        extentY = 1.25;
      }

      const axisX = stageToCanvas([extentX, 0], extentX, extentY);
      const axisNegX = stageToCanvas([-extentX, 0], extentX, extentY);
      const axisY = stageToCanvas([0, extentY], extentX, extentY);
      const axisNegY = stageToCanvas([0, -extentY], extentX, extentY);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = Math.max(1.5, width * 0.003);
      ctx.beginPath();
      ctx.moveTo(axisNegX[0], axisNegX[1]);
      ctx.lineTo(axisX[0], axisX[1]);
      ctx.moveTo(axisNegY[0], axisNegY[1]);
      ctx.lineTo(axisY[0], axisY[1]);
      ctx.stroke();

      if (stage === 3) {
        const clipW = Math.max(Math.abs(clip[3]), 0.2);
        const topLeft = stageToCanvas([-clipW, clipW], extentX, extentY);
        const bottomRight = stageToCanvas([clipW, -clipW], extentX, extentY);
        ctx.strokeStyle = "rgba(244, 171, 101, 0.86)";
        ctx.strokeRect(
          topLeft[0],
          topLeft[1],
          bottomRight[0] - topLeft[0],
          bottomRight[1] - topLeft[1]
        );
      }

      if (stage === 4) {
        const topLeft = stageToCanvas([-1, 1], extentX, extentY);
        const bottomRight = stageToCanvas([1, -1], extentX, extentY);
        ctx.strokeStyle = "rgba(244, 171, 101, 0.86)";
        ctx.strokeRect(
          topLeft[0],
          topLeft[1],
          bottomRight[0] - topLeft[0],
          bottomRight[1] - topLeft[1]
        );
      }

      const pointCanvas = stageToCanvas(current, extentX, extentY);
      ctx.fillStyle = "#73ddd5";
      ctx.beginPath();
      ctx.arc(pointCanvas[0], pointCanvas[1], Math.max(6, width * 0.0115), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.94)";
      ctx.lineWidth = Math.max(1.6, width * 0.003);
      ctx.stroke();

      if (label) {
        label.textContent = stageNames[stage];
      }
      if (note) {
        note.textContent = stageNotes[stage];
      }
      if (readouts.object) {
        readouts.object.textContent = formatVector(object, 2);
      }
      if (readouts.world) {
        readouts.world.textContent = formatVector(world, 2);
      }
      if (readouts.view) {
        readouts.view.textContent = formatVector(viewPoint, 2);
      }
      if (readouts.clip) {
        readouts.clip.textContent = formatVector(clip, 2);
      }
      if (readouts.ndc) {
        readouts.ndc.textContent = formatVector(ndc, 2);
      }
      for (const card of stageCards) {
        const index = Number(card.dataset.spaceStage);
        card.classList.toggle("is-active", index === stage);
      }
    },
  });
}

function evaluateVectorsCodeLabBindings(values) {
  const angle = degreesToRadians(values.basis_angle);
  const basisI = vec2(
    Math.cos(angle) * values.basis_scale[0],
    Math.sin(angle) * values.basis_scale[0]
  );
  const basisJ = vec2(
    -Math.sin(angle) * values.basis_scale[1],
    Math.cos(angle) * values.basis_scale[1]
  );
  const weightedI = scale2(basisI, values.point[0]);
  const weightedJ = scale2(basisJ, values.point[1]);
  const local = add2(weightedI, weightedJ);
  const homogeneous = [local[0], local[1], 0, values.point_w];
  const translationOffset = scale2(values.translate, values.point_w);
  const world = add2(local, translationOffset);

  const steps = [
    `Build the basis from angle ${formatNumber(values.basis_angle, 1)}° and scale ${formatVector(values.basis_scale, 2)}.`,
    `Reconstruct local XY as ${formatNumber(values.point[0], 2)} * i + ${formatNumber(values.point[1], 2)} * j = ${formatVector(local, 2)}.`,
    `Pack the homogeneous value as ${formatVector(homogeneous, 2)} so translation can depend on w.`,
    `Apply translate * w = ${formatVector(values.translate, 2)} * ${formatNumber(values.point_w, 2)} = ${formatVector(translationOffset, 2)}, giving world XY ${formatVector(world, 2)}.`,
  ];

  const lowered = [
    "// CPU-side lesson bindings",
    `vec2 iBasis = vec2(${formatNumber(basisI[0], 3)}, ${formatNumber(basisI[1], 3)});`,
    `vec2 jBasis = vec2(${formatNumber(basisJ[0], 3)}, ${formatNumber(basisJ[1], 3)});`,
    `vec2 weights = vec2(${formatNumber(values.point[0], 3)}, ${formatNumber(values.point[1], 3)});`,
    `vec2 translate = vec2(${formatNumber(values.translate[0], 3)}, ${formatNumber(values.translate[1], 3)});`,
    "",
    "// Vertex-stage reconstruction",
    "mat2 basis = mat2(iBasis, jBasis);",
    "vec2 localXY = basis * weights;",
    `vec4 pointH = vec4(localXY, 0.0, ${formatNumber(values.point_w, 3)});`,
    "vec2 worldXY = pointH.xy + translate * pointH.w;",
    "gl_Position = vec4(worldXY / 3.2, 0.0, 1.0);",
  ].join("\n");

  return {
    values,
    basisI,
    basisJ,
    weightedI,
    weightedJ,
    local,
    homogeneous,
    translationOffset,
    world,
    steps,
    lowered,
  };
}

function updateVectorsCodeLabUi(derived, readouts, stepList, loweredOutput) {
  if (readouts.basis) {
    readouts.basis.textContent = `i = ${formatVector(derived.basisI, 2)}, j = ${formatVector(derived.basisJ, 2)}`;
  }
  if (readouts.local) {
    readouts.local.textContent = formatVector(derived.local, 2);
  }
  if (readouts.homogeneous) {
    readouts.homogeneous.textContent = formatVector(derived.homogeneous, 2);
  }
  if (readouts.world) {
    readouts.world.textContent = formatVector(derived.world, 2);
  }
  renderCodeSteps(stepList, derived.steps);
  if (loweredOutput) {
    loweredOutput.textContent = derived.lowered;
  }
}

function setupVectorsCodeLab() {
  const canvas = document.getElementById("vectors-code-canvas");
  const ctx = get2dContext(canvas);
  const input = document.getElementById("vectors-code-input");
  const highlight = document.getElementById("vectors-code-highlight");
  const runButton = document.getElementById("vectors-code-run");
  const resetButton = document.getElementById("vectors-code-reset");
  const status = document.getElementById("vectors-code-status");
  const stepList = document.getElementById("vectors-code-steps");
  const loweredOutput = document.getElementById("vectors-code-lowered");
  if (!ctx || !input || !runButton || !resetButton) {
    return;
  }

  const readouts = {
    basis: document.getElementById("vectors-code-readout-basis"),
    local: document.getElementById("vectors-code-readout-local"),
    h: document.getElementById("vectors-code-readout-h"),
    world: document.getElementById("vectors-code-readout-world"),
  };
  const defaultSource = input.value;
  const schema = [
    { name: "basis_angle", type: "number" },
    { name: "basis_scale", type: "vec2" },
    { name: "point", type: "vec2" },
    { name: "translate", type: "vec2" },
    { name: "point_w", type: "number" },
  ];
  const defaults = {
    basis_angle: 28,
    basis_scale: vec2(1.2, 0.92),
    point: vec2(1.1, 0.55),
    translate: vec2(0.8, -0.4),
    point_w: 1,
  };
  const state = {
    appliedSource: defaultSource,
    derived: null,
  };
  const pendingMessage = "Edits pending. Press Run or use Cmd/Ctrl+Enter to apply changes.";
  const editor = setupLessonCodeEditor(input, highlight);

  function applySource(source) {
    try {
      const parsed = parseLessonBindings(source, schema, defaults);
      const derived = evaluateVectorsCodeLabBindings(parsed.values);
      state.appliedSource = source;
      state.derived = derived;
      updateVectorsCodeLabUi(derived, readouts, stepList, loweredOutput);
      const translationState =
        Math.abs(derived.values.point_w) < 1e-6
          ? "Translation is inactive because point_w = 0."
          : `Translation contributes ${formatVector(derived.translationOffset, 2)} because point_w = ${formatNumber(derived.values.point_w, 2)}.`;
      setCodeStatus(
        status,
        `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}. ${translationState}`
      );
      markAllDemosDirty();
    } catch (error) {
      setCodeStatus(status, error instanceof Error ? error.message : "Could not parse the lesson bindings.", true);
    }
  }

  runButton.addEventListener("click", () => {
    applySource(input.value);
  });
  resetButton.addEventListener("click", () => {
    input.value = defaultSource;
    editor.refresh();
    applySource(defaultSource);
  });
  input.addEventListener("input", () => {
    if (input.value !== state.appliedSource) {
      setCodeStatus(status, pendingMessage);
    }
  });
  input.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      applySource(input.value);
    }
  });

  applySource(defaultSource);

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const derived = state.derived;
      if (!derived) {
        return;
      }

      const extent = Math.min(
        6.2,
        Math.max(
          3.2,
          Math.abs(derived.weightedI[0]) + 0.9,
          Math.abs(derived.weightedI[1]) + 0.9,
          Math.abs(derived.local[0]) + 1.1,
          Math.abs(derived.local[1]) + 1.1,
          Math.abs(derived.world[0]) + 1.1,
          Math.abs(derived.world[1]) + 1.1,
          Math.abs(derived.values.translate[0]) + 0.9,
          Math.abs(derived.values.translate[1]) + 0.9
        )
      );
      const gridLimit = Math.max(3, Math.min(6, Math.ceil(extent)));

      function toCanvas(point) {
        return [
          width * 0.5 + (point[0] / extent) * (width * 0.5 - 26),
          height * 0.5 - (point[1] / extent) * (height * 0.5 - 26),
        ];
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#183446");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let index = -gridLimit; index <= gridLimit; index += 1) {
        const horizontalStart = toCanvas([-extent, index]);
        const horizontalEnd = toCanvas([extent, index]);
        ctx.beginPath();
        ctx.moveTo(horizontalStart[0], horizontalStart[1]);
        ctx.lineTo(horizontalEnd[0], horizontalEnd[1]);
        ctx.stroke();

        const verticalStart = toCanvas([index, -extent]);
        const verticalEnd = toCanvas([index, extent]);
        ctx.beginPath();
        ctx.moveTo(verticalStart[0], verticalStart[1]);
        ctx.lineTo(verticalEnd[0], verticalEnd[1]);
        ctx.stroke();
      }

      const origin = toCanvas([0, 0]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = Math.max(1.5, width * 0.003);
      ctx.beginPath();
      ctx.moveTo(origin[0], 18);
      ctx.lineTo(origin[0], height - 18);
      ctx.moveTo(18, origin[1]);
      ctx.lineTo(width - 18, origin[1]);
      ctx.stroke();

      const basisI = toCanvas(derived.basisI);
      const basisJ = toCanvas(derived.basisJ);
      const chipFont = Math.max(10, width * 0.0135);
      ctx.lineWidth = Math.max(2.2, width * 0.0042);
      ctx.strokeStyle = "rgba(247, 160, 74, 0.96)";
      ctx.beginPath();
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(basisI[0], basisI[1]);
      ctx.stroke();
      ctx.strokeStyle = "rgba(115, 221, 213, 0.96)";
      ctx.beginPath();
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(basisJ[0], basisJ[1]);
      ctx.stroke();

      const weightedI = toCanvas(derived.weightedI);
      const local = toCanvas(derived.local);
      const world = toCanvas(derived.world);
      ctx.setLineDash([8, 7]);
      ctx.strokeStyle = "rgba(247, 160, 74, 0.68)";
      ctx.lineWidth = Math.max(1.7, width * 0.0032);
      ctx.beginPath();
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(weightedI[0], weightedI[1]);
      ctx.stroke();
      ctx.strokeStyle = "rgba(115, 221, 213, 0.68)";
      ctx.beginPath();
      ctx.moveTo(weightedI[0], weightedI[1]);
      ctx.lineTo(local[0], local[1]);
      ctx.stroke();
      ctx.setLineDash([]);

      if (Math.abs(derived.values.point_w) >= 1e-6) {
        ctx.setLineDash([10, 6]);
        ctx.strokeStyle = "rgba(255, 223, 132, 0.92)";
        ctx.beginPath();
        ctx.moveTo(local[0], local[1]);
        ctx.lineTo(world[0], world[1]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = "#73ddd5";
      ctx.beginPath();
      ctx.arc(world[0], world[1], Math.max(6.5, width * 0.012), 0, TAU);
      ctx.fill();

      ctx.fillStyle = "#f7a04a";
      ctx.beginPath();
      ctx.arc(local[0], local[1], Math.max(5.4, width * 0.0105), 0, TAU);
      ctx.fill();
      drawCanvasChip(ctx, "i", basisI[0] + 14, basisI[1] - 14, {
        fontSize: chipFont,
        color: "rgba(247, 160, 74, 0.98)",
      });
      drawCanvasChip(ctx, "j", basisJ[0] + 14, basisJ[1] - 14, {
        fontSize: chipFont,
        color: "rgba(115, 221, 213, 0.98)",
      });
      drawCanvasChip(ctx, "p", local[0] + 16, local[1] - 16, {
        fontSize: chipFont,
        color: "rgba(247, 160, 74, 0.98)",
      });
      if (Math.abs(derived.values.point_w) >= 1e-6) {
        drawCanvasChip(ctx, "w*t", (local[0] + world[0]) * 0.5, (local[1] + world[1]) * 0.5 - 14, {
          fontSize: chipFont,
          color: "rgba(255, 223, 132, 0.98)",
        });
        drawCanvasChip(ctx, "p'", world[0] + 16, world[1] - 16, {
          fontSize: chipFont,
          color: "rgba(115, 221, 213, 0.98)",
        });
      }

    },
  });
}

function evaluateSpacesCodeLabBindings(values) {
  const viewport = [640, 360];
  const object = [values.object[0], values.object[1], values.object[2], 1];
  const model = mat4Multiply(
    mat4Translation(values.model_translate[0], values.model_translate[1], values.model_translate[2]),
    mat4Multiply(mat4RotationY(degreesToRadians(values.model_rotate_y)), mat4RotationX(-0.32))
  );
  const view = mat4LookAt([1.9, 1.25, 4.1], [0.35, 0.1, 0], [0, 1, 0]);
  const projection = mat4Perspective(degreesToRadians(values.fov), viewport[0] / viewport[1], 0.1, 20);
  const world = transformPoint(model, object);
  const viewPoint = transformPoint(view, world);
  const clip = transformPoint(projection, viewPoint);
  const safeW = Math.abs(clip[3]) < 1e-6 ? (clip[3] < 0 ? -1e-6 : 1e-6) : clip[3];
  const ndc = [clip[0] / safeW, clip[1] / safeW, clip[2] / safeW];
  const pixel = [
    (ndc[0] * 0.5 + 0.5) * viewport[0],
    (1 - (ndc[1] * 0.5 + 0.5)) * viewport[1],
  ];

  const steps = [
    `Bind the object-space vertex ${formatVector(object, 2)} before any scene transform happens.`,
    `Apply the model matrix: translate ${formatVector(values.model_translate, 2)} and rotate Y by ${formatNumber(values.model_rotate_y, 1)}°, giving world ${formatVector(world, 2)}.`,
    `Apply the fixed camera view matrix to get ${formatVector(viewPoint, 2)} in view space.`,
    `Projection with fov ${formatNumber(values.fov, 1)}° produces clip ${formatVector(clip, 2)}.`,
    `Divide by w = ${formatNumber(safeW, 2)} to reach NDC ${formatVector(ndc, 2)}.`,
    `Viewport-map NDC into a ${viewport[0]} x ${viewport[1]} framebuffer pixel at (${Math.round(pixel[0])}, ${Math.round(pixel[1])}).`,
  ];

  const lowered = [
    "// CPU-side lesson bindings",
    `mat4 uModel = translate(vec3(${formatNumber(values.model_translate[0], 3)}, ${formatNumber(values.model_translate[1], 3)}, ${formatNumber(values.model_translate[2], 3)}))`,
    `             * rotateY(radians(${formatNumber(values.model_rotate_y, 3)}));`,
    "mat4 uView = lookAt(vec3(1.900, 1.250, 4.100), vec3(0.350, 0.100, 0.000), vec3(0.0, 1.0, 0.0));",
    `mat4 uProjection = perspective(radians(${formatNumber(values.fov, 3)}), 640.0 / 360.0, 0.1, 20.0);`,
    "",
    "// Vertex-stage flow",
    `vec4 objectPos = vec4(${formatNumber(values.object[0], 3)}, ${formatNumber(values.object[1], 3)}, ${formatNumber(values.object[2], 3)}, 1.0);`,
    "vec4 worldPos = uModel * objectPos;",
    "vec4 viewPos = uView * worldPos;",
    "vec4 clipPos = uProjection * viewPos;",
    "gl_Position = clipPos;",
    "vec3 ndc = clipPos.xyz / clipPos.w; // done after clip-space output",
  ].join("\n");

  return {
    values,
    viewport,
    object,
    world,
    viewPoint,
    clip,
    ndc,
    pixel,
    steps,
    lowered,
    stages: [
      { label: "Object", value: object, color: "#f7a04a" },
      { label: "World", value: world, color: "#f6c56b" },
      { label: "View", value: viewPoint, color: "#9fd7ff" },
      { label: "Clip", value: clip, color: "#f8b37d" },
      { label: "NDC", value: ndc, color: "#73ddd5" },
    ],
  };
}

function updateSpacesCodeLabUi(derived, readouts, stepList, loweredOutput) {
  if (readouts.object) {
    readouts.object.textContent = formatVector(derived.object, 2);
  }
  if (readouts.world) {
    readouts.world.textContent = formatVector(derived.world, 2);
  }
  if (readouts.view) {
    readouts.view.textContent = formatVector(derived.viewPoint, 2);
  }
  if (readouts.clip) {
    readouts.clip.textContent = formatVector(derived.clip, 2);
  }
  if (readouts.ndc) {
    readouts.ndc.textContent = formatVector(derived.ndc, 2);
  }
  if (readouts.pixel) {
    readouts.pixel.textContent = `(${Math.round(derived.pixel[0])}, ${Math.round(derived.pixel[1])})`;
  }
  renderCodeSteps(stepList, derived.steps);
  if (loweredOutput) {
    loweredOutput.textContent = derived.lowered;
  }
}

function setupSpacesCodeLab() {
  const canvas = document.getElementById("spaces-code-canvas");
  const ctx = get2dContext(canvas);
  const input = document.getElementById("spaces-code-input");
  const highlight = document.getElementById("spaces-code-highlight");
  const runButton = document.getElementById("spaces-code-run");
  const resetButton = document.getElementById("spaces-code-reset");
  const status = document.getElementById("spaces-code-status");
  const stepList = document.getElementById("spaces-code-steps");
  const loweredOutput = document.getElementById("spaces-code-lowered");
  if (!ctx || !input || !runButton || !resetButton) {
    return;
  }

  const readouts = {
    object: document.getElementById("spaces-code-readout-object"),
    world: document.getElementById("spaces-code-readout-world"),
    view: document.getElementById("spaces-code-readout-view"),
    clip: document.getElementById("spaces-code-readout-clip"),
    ndc: document.getElementById("spaces-code-readout-ndc"),
    pixel: document.getElementById("spaces-code-readout-pixel"),
  };
  const defaultSource = input.value;
  const schema = [
    { name: "object", type: "vec3" },
    { name: "model_translate", type: "vec3" },
    { name: "model_rotate_y", type: "number" },
    { name: "fov", type: "number" },
  ];
  const defaults = {
    object: vec3(0.88, 0.44, 1.08),
    model_translate: vec3(1.2, -0.18, -0.7),
    model_rotate_y: 32,
    fov: 52,
  };
  const state = {
    appliedSource: defaultSource,
    derived: null,
  };
  const pendingMessage = "Edits pending. Press Run or use Cmd/Ctrl+Enter to apply changes.";
  const editor = setupLessonCodeEditor(input, highlight);

  function applySource(source) {
    try {
      const parsed = parseLessonBindings(source, schema, defaults);
      const derived = evaluateSpacesCodeLabBindings(parsed.values);
      state.appliedSource = source;
      state.derived = derived;
      updateSpacesCodeLabUi(derived, readouts, stepList, loweredOutput);
      setCodeStatus(
        status,
        `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}. Clip space still carries w = ${formatNumber(derived.clip[3], 2)} until the divide produces NDC.`
      );
      markAllDemosDirty();
    } catch (error) {
      setCodeStatus(status, error instanceof Error ? error.message : "Could not parse the lesson bindings.", true);
    }
  }

  runButton.addEventListener("click", () => {
    applySource(input.value);
  });
  resetButton.addEventListener("click", () => {
    input.value = defaultSource;
    editor.refresh();
    applySource(defaultSource);
  });
  input.addEventListener("input", () => {
    if (input.value !== state.appliedSource) {
      setCodeStatus(status, pendingMessage);
    }
  });
  input.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      applySource(input.value);
    }
  });

  applySource(defaultSource);

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const derived = state.derived;
      if (!derived) {
        return;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#183446");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      const columns = width < 700 ? 3 : 5;
      const gap = 14;
      const margin = 18;
      const rows = Math.ceil(derived.stages.length / columns);
      const boxWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
      const boxHeight = (height - margin * 2 - gap * (rows - 1)) / rows;
      const stageRects = [];

      for (let index = 0; index < derived.stages.length; index += 1) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        stageRects.push({
          x: margin + column * (boxWidth + gap),
          y: margin + row * (boxHeight + gap),
          width: boxWidth,
          height: boxHeight,
        });
      }

      if (rows === 1) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.lineWidth = Math.max(1.5, width * 0.0028);
        for (let index = 0; index < stageRects.length - 1; index += 1) {
          const left = stageRects[index];
          const right = stageRects[index + 1];
          const startX = left.x + left.width + 6;
          const startY = left.y + left.height * 0.5;
          const endX = right.x - 6;
          const endY = right.y + right.height * 0.5;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      }

      for (let index = 0; index < derived.stages.length; index += 1) {
        const stage = derived.stages[index];
        const rect = stageRects[index];
        const plotX = rect.x + 12;
        const plotY = rect.y + 32;
        const plotWidth = rect.width - 24;
        const plotHeight = rect.height - 44;
        const stageValue = stage.value;

        let extentX = 1.4;
        let extentY = 1.4;
        if (stage.label === "Clip") {
          extentX = Math.max(1.2, Math.abs(derived.clip[3]) * 1.2, Math.abs(stageValue[0]) * 1.15);
          extentY = Math.max(1.2, Math.abs(derived.clip[3]) * 1.2, Math.abs(stageValue[1]) * 1.15);
        } else if (stage.label === "NDC") {
          extentX = 1.15;
          extentY = 1.15;
        } else {
          extentX = Math.max(1.35, Math.abs(stageValue[0]) * 1.2, Math.abs(stageValue[1]) * 1.2);
          extentY = Math.max(1.35, Math.abs(stageValue[0]) * 0.95, Math.abs(stageValue[1]) * 1.2);
        }

        function toStageCanvas(point) {
          return [
            plotX + plotWidth * 0.5 + (point[0] / extentX) * (plotWidth * 0.5 - 8),
            plotY + plotHeight * 0.5 - (point[1] / extentY) * (plotHeight * 0.5 - 8),
          ];
        }

        ctx.fillStyle = "rgba(8, 21, 30, 0.26)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
        ctx.font = `${Math.max(10, width * 0.014)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(stage.label, rect.x + 12, rect.y + 20);

        const leftAxis = toStageCanvas([-extentX, 0]);
        const rightAxis = toStageCanvas([extentX, 0]);
        const topAxis = toStageCanvas([0, extentY]);
        const bottomAxis = toStageCanvas([0, -extentY]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.beginPath();
        ctx.moveTo(leftAxis[0], leftAxis[1]);
        ctx.lineTo(rightAxis[0], rightAxis[1]);
        ctx.moveTo(topAxis[0], topAxis[1]);
        ctx.lineTo(bottomAxis[0], bottomAxis[1]);
        ctx.stroke();

        if (stage.label === "Clip") {
          const clipW = Math.max(Math.abs(derived.clip[3]), 0.2);
          const topLeft = toStageCanvas([-clipW, clipW]);
          const bottomRight = toStageCanvas([clipW, -clipW]);
          ctx.strokeStyle = "rgba(248, 179, 125, 0.9)";
          ctx.strokeRect(
            topLeft[0],
            topLeft[1],
            bottomRight[0] - topLeft[0],
            bottomRight[1] - topLeft[1]
          );
        }

        if (stage.label === "NDC") {
          const topLeft = toStageCanvas([-1, 1]);
          const bottomRight = toStageCanvas([1, -1]);
          ctx.strokeStyle = "rgba(115, 221, 213, 0.9)";
          ctx.strokeRect(
            topLeft[0],
            topLeft[1],
            bottomRight[0] - topLeft[0],
            bottomRight[1] - topLeft[1]
          );
        }

        const center = toStageCanvas([0, 0]);
        const point = toStageCanvas(stageValue);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.26)";
        ctx.lineWidth = Math.max(1.3, width * 0.0024);
        ctx.beginPath();
        ctx.moveTo(center[0], center[1]);
        ctx.lineTo(point[0], point[1]);
        ctx.stroke();

        ctx.fillStyle = stage.color;
        ctx.beginPath();
        ctx.arc(point[0], point[1], Math.max(4.5, width * 0.0065), 0, TAU);
        ctx.fill();

      }
    },
  });
}

function evaluateNormalCodeLabBindings(values) {
  const surfaceAngle = degreesToRadians(values.surface_angle);
  const lightAngle = degreesToRadians(values.light_angle);
  const c = Math.cos(surfaceAngle);
  const s = Math.sin(surfaceAngle);

  function transformVector(vector) {
    return [
      vector[0] * c * values.scale[0] - vector[1] * s * values.scale[1],
      vector[0] * s * values.scale[0] + vector[1] * c * values.scale[1],
    ];
  }

  const tangent = normalize2(transformVector([1, 0]));
  const naiveNormal = normalize2(transformVector([0, 1]));
  let geometricNormal = normalize2(perpendicular2(tangent));
  if (dot2(geometricNormal, naiveNormal) < 0) {
    geometricNormal = scale2(geometricNormal, -1);
  }

  const shaderNormal = values.fix_normal_matrix ? geometricNormal : naiveNormal;
  const lightDirection = normalize2([Math.cos(lightAngle), Math.sin(lightAngle)]);
  const diffuse = clamp(dot2(shaderNormal, lightDirection), 0, 1);
  const patch = [
    [-0.92, -0.22],
    [0.92, -0.22],
    [0.92, 0.22],
    [-0.92, 0.22],
  ].map(transformVector);
  const transformMatrix = [
    [c * values.scale[0], -s * values.scale[1]],
    [s * values.scale[0], c * values.scale[1]],
  ];

  const steps = [
    `Build the local surface transform from angle ${formatNumber(values.surface_angle, 1)}° and scale ${formatVector(values.scale, 2)}.`,
    `Transform the tangent, then rebuild a perpendicular geometric normal ${formatVector(geometricNormal, 2)} from the surface itself.`,
    values.fix_normal_matrix
      ? `Use the corrected shading normal ${formatVector(shaderNormal, 2)} instead of the naive transformed normal ${formatVector(naiveNormal, 2)}.`
      : `Skip the normal-matrix fix, so the shader uses the naive transformed normal ${formatVector(shaderNormal, 2)}.`,
    `Compute diffuse = max(dot(normal, light), 0) = max(dot(${formatVector(shaderNormal, 2)}, ${formatVector(lightDirection, 2)}), 0) = ${formatNumber(diffuse, 3)}.`,
  ];

  const lowered = [
    "// CPU-side lesson bindings",
    `mat2 surface = mat2(${formatNumber(transformMatrix[0][0], 3)}, ${formatNumber(transformMatrix[1][0], 3)}, ${formatNumber(transformMatrix[0][1], 3)}, ${formatNumber(transformMatrix[1][1], 3)});`,
    `vec2 lightDir = normalize(vec2(${formatNumber(lightDirection[0], 3)}, ${formatNumber(lightDirection[1], 3)}));`,
    "",
    "// Vertex / shading setup",
    "vec2 tangent = normalize(surface * vec2(1.0, 0.0));",
    "vec2 naiveNormal = normalize(surface * vec2(0.0, 1.0));",
    values.fix_normal_matrix
      ? "vec2 normal = normalize(uNormalMatrix * vec2(0.0, 1.0)); // inverse-transpose style fix"
      : "vec2 normal = naiveNormal; // broken under non-uniform scale",
    "float diffuse = max(dot(normal, lightDir), 0.0);",
  ].join("\n");

  return {
    values,
    patch,
    transformMatrix,
    tangent,
    naiveNormal,
    geometricNormal,
    shaderNormal,
    lightDirection,
    diffuse,
    steps,
    lowered,
  };
}

function updateNormalCodeLabUi(derived, readouts, stepList, loweredOutput) {
  if (readouts.geometry) {
    readouts.geometry.textContent = formatVector(derived.geometricNormal, 2);
  }
  if (readouts.shader) {
    readouts.shader.textContent = formatVector(derived.shaderNormal, 2);
  }
  if (readouts.light) {
    readouts.light.textContent = formatVector(derived.lightDirection, 2);
  }
  if (readouts.diffuse) {
    readouts.diffuse.textContent = formatNumber(derived.diffuse, 3);
  }
  renderCodeSteps(stepList, derived.steps);
  if (loweredOutput) {
    loweredOutput.textContent = derived.lowered;
  }
}

function drawNormalCodeLab(ctx, canvas, derived) {
  const width = canvas.width;
  const height = canvas.height;

  function toCanvas(point) {
    return [
      width * 0.5 + point[0] * width * 0.22,
      height * 0.54 - point[1] * height * 0.22,
    ];
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawLessonCanvasBackground(ctx, width, height, "#102535", "#183243");

  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let index = 0; index <= 8; index += 1) {
    const x = (width / 8) * index;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let index = 0; index <= 6; index += 1) {
    const y = (height / 6) * index;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.fillStyle = rgbToCss([
    0.18 + derived.diffuse * 0.42,
    0.4 + derived.diffuse * 0.34,
    0.62 + derived.diffuse * 0.24,
  ]);
  ctx.beginPath();
  derived.patch.forEach((point, index) => {
    const canvasPoint = toCanvas(point);
    if (index === 0) {
      ctx.moveTo(canvasPoint[0], canvasPoint[1]);
    } else {
      ctx.lineTo(canvasPoint[0], canvasPoint[1]);
    }
  });
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = Math.max(2, width * 0.004);
  ctx.stroke();

  const center = toCanvas([0, 0]);
  const geometryEnd = toCanvas(scale2(derived.geometricNormal, 1.2));
  const shaderEnd = toCanvas(scale2(derived.shaderNormal, 1.05));
  const lightEnd = toCanvas(scale2(derived.lightDirection, 1.45));

  ctx.strokeStyle = "rgba(255, 243, 201, 0.95)";
  ctx.lineWidth = Math.max(2.1, width * 0.0044);
  ctx.beginPath();
  ctx.moveTo(center[0], center[1]);
  ctx.lineTo(lightEnd[0], lightEnd[1]);
  ctx.stroke();

  ctx.strokeStyle = "rgba(239, 245, 247, 0.92)";
  ctx.beginPath();
  ctx.moveTo(center[0], center[1]);
  ctx.lineTo(geometryEnd[0], geometryEnd[1]);
  ctx.stroke();

  ctx.strokeStyle = "rgba(110, 226, 201, 0.98)";
  ctx.beginPath();
  ctx.moveTo(center[0], center[1]);
  ctx.lineTo(shaderEnd[0], shaderEnd[1]);
  ctx.stroke();
  const chipFont = Math.max(10, width * 0.0135);
  drawCanvasChip(ctx, "L", lightEnd[0], lightEnd[1] - 14, {
    fontSize: chipFont,
    color: "rgba(255, 243, 201, 0.98)",
  });
  drawCanvasChip(ctx, "Ng", geometryEnd[0] + 14, geometryEnd[1] - 14, {
    fontSize: chipFont,
    color: "rgba(239, 245, 247, 0.98)",
  });
  drawCanvasChip(ctx, "Ns", shaderEnd[0] + 14, shaderEnd[1] + 14, {
    fontSize: chipFont,
    color: "rgba(110, 226, 201, 0.98)",
  });

  const meterX = 20;
  const meterY = height - 34;
  const meterW = width - 40;
  const meterH = 12;
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(meterX, meterY, meterW, meterH);
  ctx.fillStyle = rgbToCss([0.22 + derived.diffuse * 0.66, 0.74, 0.92 - derived.diffuse * 0.2]);
  ctx.fillRect(meterX, meterY, meterW * derived.diffuse, meterH);

}

function setupNormalCodeLab() {
  setupStructuredCodeLab({
    prefix: "normal-code",
    schema: [
      { name: "surface_angle", type: "number" },
      { name: "light_angle", type: "number" },
      { name: "scale", type: "vec2" },
      { name: "fix_normal_matrix", type: "bool" },
    ],
    defaults: {
      surface_angle: 18,
      light_angle: 42,
      scale: vec2(1.8, 0.52),
      fix_normal_matrix: true,
    },
    readoutIds: {
      geometry: "normal-code-readout-geometry",
      shader: "normal-code-readout-shader",
      light: "normal-code-readout-light",
      diffuse: "normal-code-readout-diffuse",
    },
    evaluate: evaluateNormalCodeLabBindings,
    updateUi: updateNormalCodeLabUi,
    getStatusMessage(parsed, derived) {
      return `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}. Diffuse is ${formatNumber(derived.diffuse, 3)} with the ${derived.values.fix_normal_matrix ? "corrected" : "naive"} shader normal.`;
    },
    draw: drawNormalCodeLab,
  });
}

function evaluateShaderCodeLabBindings(values) {
  function waveAt(x, z) {
    return (
      Math.sin(x * values.wave_density + values.time * 0.65) *
      Math.cos(z * values.wave_density * 0.72 - values.time * 0.33) *
      values.wave_height
    );
  }

  function colorAt(uv, wave) {
    const stripes = 0.5 + 0.5 * Math.sin(uv[0] * 22 + values.time * 1.2 + wave * 6.4);
    const bands = 0.5 + 0.5 * Math.sin(uv[1] * 14 - values.time * 0.85 + values.color_shift * 5.0);
    const cool = [0.1, 0.53, 0.7];
    const mint = [0.14, 0.83, 0.66];
    const warm = [0.95, 0.63, 0.34];
    const dusk = [0.32, 0.16, 0.47];
    const mixA = [
      lerp(cool[0], mint[0], 0.5 + 0.5 * wave / Math.max(values.wave_height || 1, 1)),
      lerp(cool[1], mint[1], 0.5 + 0.5 * wave / Math.max(values.wave_height || 1, 1)),
      lerp(cool[2], mint[2], 0.5 + 0.5 * wave / Math.max(values.wave_height || 1, 1)),
    ];
    const mixB = [
      lerp(dusk[0], warm[0], bands),
      lerp(dusk[1], warm[1], bands),
      lerp(dusk[2], warm[2], bands),
    ];
    return [
      lerp(mixA[0], mixB[0], stripes * 0.55 + 0.15),
      lerp(mixA[1], mixB[1], stripes * 0.55 + 0.15),
      lerp(mixA[2], mixB[2], stripes * 0.55 + 0.15),
    ];
  }

  const centerWave = waveAt(0, 0);
  const centerUv = vec2(0.5, 0.5);
  const centerColor = colorAt(centerUv, centerWave);
  const edgeWave = waveAt(0.75, -0.6);
  const steps = [
    `Bind uWaveHeight = ${formatNumber(values.wave_height, 2)}, uWaveDensity = ${formatNumber(values.wave_density, 2)}, uColorShift = ${formatNumber(values.color_shift, 2)}, and uTime = ${formatNumber(values.time, 2)}.`,
    `Vertex stage displaces each mesh vertex by wave(x, z) * height. At the mesh center that offset is ${formatNumber(centerWave, 3)}.`,
    `Rasterization interpolates varyings like uv across each triangle, so the fragment at the center sees uv ${formatVector(centerUv, 2)}.`,
    `Fragment stage turns that varying into rgb ${formatVector(centerColor, 2)} with striped and banded color logic.`,
  ];

  const lowered = [
    "// CPU-side lesson bindings",
    `uniform float uWaveHeight = ${formatNumber(values.wave_height, 3)};`,
    `uniform float uWaveDensity = ${formatNumber(values.wave_density, 3)};`,
    `uniform float uColorShift = ${formatNumber(values.color_shift, 3)};`,
    `uniform float uTime = ${formatNumber(values.time, 3)};`,
    "",
    "// Vertex shader",
    "float wave = sin(aPosition.x * uWaveDensity + uTime * 0.65)",
    "           * cos(aPosition.z * uWaveDensity * 0.72 - uTime * 0.33);",
    "vec3 displaced = aPosition + vec3(0.0, wave * uWaveHeight, 0.0);",
    "vUv = aUv;",
    "",
    "// Fragment shader",
    "float stripes = 0.5 + 0.5 * sin(vUv.x * 22.0 + uTime * 1.2 + wave * 6.4);",
    "float bands = 0.5 + 0.5 * sin(vUv.y * 14.0 - uTime * 0.85 + uColorShift * 5.0);",
    "gl_FragColor = vec4(colorFrom(stripes, bands), 1.0);",
  ].join("\n");

  return {
    values,
    centerWave,
    centerUv,
    centerColor,
    edgeWave,
    steps,
    lowered,
  };
}

function updateShaderCodeLabUi(derived, readouts, stepList, loweredOutput) {
  if (readouts.vertex) {
    readouts.vertex.textContent = formatNumber(derived.centerWave, 3);
  }
  if (readouts.varying) {
    readouts.varying.textContent = formatVector(derived.centerUv, 2);
  }
  if (readouts.fragment) {
    readouts.fragment.textContent = `rgb ${formatVector(derived.centerColor, 2)}`;
  }
  if (readouts.edge) {
    readouts.edge.textContent = formatNumber(derived.edgeWave, 3);
  }
  renderCodeSteps(stepList, derived.steps);
  if (loweredOutput) {
    loweredOutput.textContent = derived.lowered;
  }
}

function drawShaderCodeLab(ctx, canvas, derived) {
  const width = canvas.width;
  const height = canvas.height;
  const columns = 16;
  const rows = 12;

  function waveAt(x, z) {
    return (
      Math.sin(x * derived.values.wave_density + derived.values.time * 0.65) *
      Math.cos(z * derived.values.wave_density * 0.72 - derived.values.time * 0.33) *
      derived.values.wave_height
    );
  }

  function colorAt(uv, wave) {
    const stripes = 0.5 + 0.5 * Math.sin(uv[0] * 22 + derived.values.time * 1.2 + wave * 6.4);
    const bands = 0.5 + 0.5 * Math.sin(uv[1] * 14 - derived.values.time * 0.85 + derived.values.color_shift * 5.0);
    const cool = [0.1, 0.53, 0.7];
    const mint = [0.14, 0.83, 0.66];
    const warm = [0.95, 0.63, 0.34];
    const dusk = [0.32, 0.16, 0.47];
    const waveMix = clamp(0.5 + 0.5 * wave / Math.max(Math.abs(derived.values.wave_height), 0.0001), 0, 1);
    const mixA = [
      lerp(cool[0], mint[0], waveMix),
      lerp(cool[1], mint[1], waveMix),
      lerp(cool[2], mint[2], waveMix),
    ];
    const mixB = [
      lerp(dusk[0], warm[0], bands),
      lerp(dusk[1], warm[1], bands),
      lerp(dusk[2], warm[2], bands),
    ];
    return [
      lerp(mixA[0], mixB[0], stripes * 0.55 + 0.15),
      lerp(mixA[1], mixB[1], stripes * 0.55 + 0.15),
      lerp(mixA[2], mixB[2], stripes * 0.55 + 0.15),
    ];
  }

  function projectPoint(x, z, y) {
    return [
      width * 0.5 + x * width * 0.2 + z * width * 0.11,
      height * 0.68 - y * height * 0.34 - z * height * 0.14,
    ];
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawLessonCanvasBackground(ctx, width, height);

  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let column = 0; column < columns; column += 1) {
      const u0 = column / columns;
      const v0 = row / rows;
      const u1 = (column + 1) / columns;
      const v1 = (row + 1) / rows;
      const x0 = (u0 - 0.5) * 2;
      const x1 = (u1 - 0.5) * 2;
      const z0 = (v0 - 0.5) * 2;
      const z1 = (v1 - 0.5) * 2;
      const p00 = projectPoint(x0, z0, waveAt(x0, z0));
      const p10 = projectPoint(x1, z0, waveAt(x1, z0));
      const p11 = projectPoint(x1, z1, waveAt(x1, z1));
      const p01 = projectPoint(x0, z1, waveAt(x0, z1));
      const centerU = (u0 + u1) * 0.5;
      const centerV = (v0 + v1) * 0.5;
      const centerWave = waveAt((centerU - 0.5) * 2, (centerV - 0.5) * 2);

      ctx.fillStyle = rgbToCss(colorAt([centerU, centerV], centerWave));
      ctx.beginPath();
      ctx.moveTo(p00[0], p00[1]);
      ctx.lineTo(p10[0], p10[1]);
      ctx.lineTo(p11[0], p11[1]);
      ctx.lineTo(p01[0], p01[1]);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  const center = projectPoint(0, 0, derived.centerWave);
  ctx.fillStyle = "rgba(255, 245, 216, 0.98)";
  ctx.beginPath();
  ctx.arc(center[0], center[1], Math.max(5.5, width * 0.008), 0, TAU);
  ctx.fill();

  ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
  ctx.font = `${Math.max(12, width * 0.022)}px "Avenir Next", "Segoe UI", sans-serif`;
  ctx.fillText("vertex stage moves the mesh", 18, 24);
  ctx.fillText("fragment stage paints each cell", 18, height - 18);
}

function setupShaderCodeLab() {
  setupStructuredCodeLab({
    prefix: "shader-code",
    schema: [
      { name: "wave_height", type: "number" },
      { name: "wave_density", type: "number" },
      { name: "color_shift", type: "number" },
      { name: "time", type: "number" },
    ],
    defaults: {
      wave_height: 0.32,
      wave_density: 12,
      color_shift: 0.44,
      time: 0.6,
    },
    readoutIds: {
      vertex: "shader-code-readout-vertex",
      varying: "shader-code-readout-varying",
      fragment: "shader-code-readout-fragment",
      edge: "shader-code-readout-edge",
    },
    evaluate: evaluateShaderCodeLabBindings,
    updateUi: updateShaderCodeLabUi,
    getStatusMessage(parsed, derived) {
      return `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}. The center vertex moves by ${formatNumber(derived.centerWave, 3)}, while the fragment color stays a separate stage decision.`;
    },
    draw: drawShaderCodeLab,
  });
}

function evaluateRenderingCodeLabBindings(values) {
  const clearDepth = 1.0;
  const frontWins = values.front_depth <= values.back_depth;
  const winnerLabel = values.depth_test
    ? frontWins
      ? "Front fragment"
      : "Back fragment"
    : "Back fragment";
  const winnerDepth = values.depth_test ? Math.min(values.front_depth, values.back_depth) : values.back_depth;
  const winnerColor = values.depth_test
    ? frontWins
      ? values.front_color
      : values.back_color
    : values.back_color;
  const secondPasses = !values.depth_test || values.back_depth < values.front_depth;

  const steps = [
    `Clear the depth buffer to ${formatNumber(clearDepth, 2)} before the draw starts.`,
    `Draw the front fragment first: store depth ${formatNumber(values.front_depth, 2)} and color ${formatVector(values.front_color, 2)}.`,
    values.depth_test
      ? `Draw the back fragment second and compare ${formatNumber(values.back_depth, 2)} against the stored ${formatNumber(values.front_depth, 2)}. ${secondPasses ? "It passes and replaces the earlier value." : "It fails and the earlier value stays."}`
      : `Disable depth testing, so the second draw overwrites the first regardless of depth.`,
    `The color buffer ends with ${winnerLabel.toLowerCase()} at rgb ${formatVector(winnerColor, 2)} and stored depth ${formatNumber(winnerDepth, 2)}.`,
  ];

  const lowered = [
    "// CPU-side lesson bindings",
    `vec3 frontColor = vec3(${formatNumber(values.front_color[0], 3)}, ${formatNumber(values.front_color[1], 3)}, ${formatNumber(values.front_color[2], 3)});`,
    `vec3 backColor = vec3(${formatNumber(values.back_color[0], 3)}, ${formatNumber(values.back_color[1], 3)}, ${formatNumber(values.back_color[2], 3)});`,
    values.depth_test ? "gl.enable(gl.DEPTH_TEST);" : "gl.disable(gl.DEPTH_TEST);",
    "",
    "// Fragment competition for one pixel",
    "depthBuffer = 1.0;",
    `draw(frontColor, ${formatNumber(values.front_depth, 3)});`,
    `draw(backColor, ${formatNumber(values.back_depth, 3)});`,
    "if (depthTest && incomingDepth < depthBuffer) {",
    "  depthBuffer = incomingDepth;",
    "  colorBuffer = incomingColor;",
    "}",
  ].join("\n");

  return {
    values,
    clearDepth,
    winnerLabel,
    winnerDepth,
    winnerColor,
    secondPasses,
    steps,
    lowered,
  };
}

function updateRenderingCodeLabUi(derived, readouts, stepList, loweredOutput) {
  if (readouts.front) {
    readouts.front.textContent = formatNumber(derived.values.front_depth, 2);
  }
  if (readouts.back) {
    readouts.back.textContent = formatNumber(derived.values.back_depth, 2);
  }
  if (readouts.rule) {
    readouts.rule.textContent = derived.values.depth_test ? "depth test on" : "last draw wins";
  }
  if (readouts.winner) {
    readouts.winner.textContent = `${derived.winnerLabel} -> rgb ${formatVector(derived.winnerColor, 2)}`;
  }
  renderCodeSteps(stepList, derived.steps);
  if (loweredOutput) {
    loweredOutput.textContent = derived.lowered;
  }
}

function drawRenderingCodeLab(ctx, canvas, derived) {
  const width = canvas.width;
  const height = canvas.height;
  const margin = 18;
  const gap = 16;
  const stacked = width < 820;
  const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap * 2) / 3;
  const panelHeight = stacked ? (height - margin * 2 - gap * 2) / 3 : height - margin * 2;
  const rects = [
    { x: margin, y: margin, width: panelWidth, height: panelHeight },
    stacked
      ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
      : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
    stacked
      ? { x: margin, y: margin + (panelHeight + gap) * 2, width: panelWidth, height: panelHeight }
      : { x: margin + (panelWidth + gap) * 2, y: margin, width: panelWidth, height: panelHeight },
  ];

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawLessonCanvasBackground(ctx, width, height);

  rects.forEach((rect, index) => {
    drawLessonCanvasPanel(ctx, rect, index === 0 ? "Incoming fragments" : index === 1 ? "Depth test" : "Final buffers", width);
  });

  const cardWidth = rects[0].width - 28;
  const cardHeight = (rects[0].height - 74) / 2;
  const topY = rects[0].y + 38;
  const cards = [
    {
      y: topY,
      label: "Front fragment",
      depth: derived.values.front_depth,
      color: rgbToCss(derived.values.front_color),
      fill: "rgba(247, 160, 74, 0.18)",
    },
    {
      y: topY + cardHeight + 10,
      label: "Back fragment",
      depth: derived.values.back_depth,
      color: rgbToCss(derived.values.back_color),
      fill: "rgba(115, 221, 213, 0.18)",
    },
  ];

  for (const card of cards) {
    const cardX = rects[0].x + 14;
    ctx.fillStyle = card.fill;
    ctx.fillRect(cardX, card.y, cardWidth, cardHeight);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.strokeRect(cardX, card.y, cardWidth, cardHeight);
    ctx.fillStyle = card.color;
    ctx.fillRect(cardX + 12, card.y + 12, 24, 24);
    ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
    ctx.font = `${Math.max(11, width * 0.013)}px "Avenir Next", "Segoe UI", sans-serif`;
    ctx.fillText(card.label, cardX + 48, card.y + 28);
    ctx.font = `${Math.max(10, width * 0.012)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
    ctx.fillText(`depth = ${formatNumber(card.depth, 2)}`, cardX + 12, card.y + cardHeight - 18);
  }

  const trackRect = {
    x: rects[1].x + 18,
    y: rects[1].y + 84,
    width: rects[1].width - 36,
    height: 18,
  };
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(trackRect.x, trackRect.y, trackRect.width, trackRect.height);
  const frontX = trackRect.x + trackRect.width * derived.values.front_depth;
  const backX = trackRect.x + trackRect.width * derived.values.back_depth;
  ctx.fillStyle = rgbToCss(derived.values.front_color);
  ctx.beginPath();
  ctx.arc(frontX, trackRect.y + trackRect.height * 0.5, 7, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgbToCss(derived.values.back_color);
  ctx.beginPath();
  ctx.arc(backX, trackRect.y + trackRect.height * 0.5, 7, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
  ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
  ctx.fillText(derived.values.depth_test ? "The smaller depth wins." : "Depth is ignored and the later draw overwrites.", trackRect.x, trackRect.y - 12);

  const swatchRect = {
    x: rects[2].x + 18,
    y: rects[2].y + 64,
    width: rects[2].width * 0.34,
    height: rects[2].height * 0.36,
  };
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(swatchRect.x, swatchRect.y, swatchRect.width, swatchRect.height);
  ctx.fillStyle = rgbToCss(derived.winnerColor);
  ctx.fillRect(swatchRect.x + 8, swatchRect.y + 8, swatchRect.width - 16, swatchRect.height - 16);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.strokeRect(swatchRect.x, swatchRect.y, swatchRect.width, swatchRect.height);

  ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
  ctx.font = `${Math.max(12, width * 0.02)}px "Avenir Next", "Segoe UI", sans-serif`;
  ctx.fillText(derived.winnerLabel, rects[2].x + 18, rects[2].y + 30);
  ctx.font = `${Math.max(10, width * 0.012)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
  ctx.fillText(`depth = ${formatNumber(derived.winnerDepth, 2)}`, rects[2].x + 18, swatchRect.y + swatchRect.height + 22);
  ctx.fillText(`rgb = ${formatVector(derived.winnerColor, 2)}`, rects[2].x + 18, swatchRect.y + swatchRect.height + 44);
}

function setupRenderingCodeLab() {
  setupStructuredCodeLab({
    prefix: "rendering-code",
    schema: [
      { name: "front_depth", type: "number" },
      { name: "back_depth", type: "number" },
      { name: "front_color", type: "vec3" },
      { name: "back_color", type: "vec3" },
      { name: "depth_test", type: "bool" },
    ],
    defaults: {
      front_depth: 0.34,
      back_depth: 0.62,
      front_color: vec3(0.22, 0.74, 0.94),
      back_color: vec3(0.96, 0.62, 0.34),
      depth_test: true,
    },
    readoutIds: {
      front: "rendering-code-readout-front",
      back: "rendering-code-readout-back",
      rule: "rendering-code-readout-rule",
      winner: "rendering-code-readout-winner",
    },
    evaluate: evaluateRenderingCodeLabBindings,
    updateUi: updateRenderingCodeLabUi,
    getStatusMessage(parsed, derived) {
      return `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}. ${derived.winnerLabel} owns the pixel when ${derived.values.depth_test ? "depth testing is on" : "draw order decides the winner"}.`;
    },
    draw: drawRenderingCodeLab,
  });
}

function evaluateProjectionCodeLabBindings(values) {
  const objectHeight = 1;
  const nearZ = 1.0;
  const farZ = -1.5;
  const nearDepth = values.camera_distance - nearZ;
  const farDepth = values.camera_distance - farZ;
  const perspectiveScale = 1 / Math.tan(degreesToRadians(values.fov) / 2);
  const nearScreenHeight = values.perspective ? (objectHeight * perspectiveScale) / nearDepth : objectHeight / values.ortho_height;
  const farScreenHeight = values.perspective ? (objectHeight * perspectiveScale) / farDepth : objectHeight / values.ortho_height;
  const ratio = nearScreenHeight / Math.max(farScreenHeight, 1e-6);

  const steps = [
    `Place the camera at distance ${formatNumber(values.camera_distance, 2)} looking toward the scene.`,
    values.perspective
      ? `Choose perspective projection with a ${formatNumber(values.fov, 1)}° field of view. Screen height now depends on depth.`
      : `Choose orthographic projection with a vertical size of ${formatNumber(values.ortho_height, 2)}. Screen height no longer depends on depth.`,
    `Project the near object at depth ${formatNumber(nearDepth, 2)} to screen height ${formatNumber(nearScreenHeight, 2)}.`,
    `Project the far object at depth ${formatNumber(farDepth, 2)} to screen height ${formatNumber(farScreenHeight, 2)}. The near/far size ratio is ${formatNumber(ratio, 2)}.`,
  ];

  const lowered = [
    "// CPU-side lesson bindings",
    values.perspective
      ? `mat4 uProjection = perspective(radians(${formatNumber(values.fov, 3)}), aspect, 0.1, 20.0);`
      : `mat4 uProjection = orthographic(-aspect * ${formatNumber(values.ortho_height, 3)}, aspect * ${formatNumber(values.ortho_height, 3)}, -${formatNumber(values.ortho_height, 3)}, ${formatNumber(values.ortho_height, 3)}, 0.1, 20.0);`,
    `vec3 cameraPos = vec3(0.0, 1.0, ${formatNumber(values.camera_distance, 3)});`,
    "",
    "// Vertex-stage projection",
    "vec4 viewPos = uView * worldPos;",
    "vec4 clipPos = uProjection * viewPos;",
    "vec3 ndc = clipPos.xyz / clipPos.w;",
  ].join("\n");

  return {
    values,
    nearDepth,
    farDepth,
    nearScreenHeight,
    farScreenHeight,
    ratio,
    steps,
    lowered,
  };
}

function updateProjectionCodeLabUi(derived, readouts, stepList, loweredOutput) {
  if (readouts.mode) {
    readouts.mode.textContent = derived.values.perspective ? "perspective" : "orthographic";
  }
  if (readouts.near) {
    readouts.near.textContent = formatNumber(derived.nearScreenHeight, 2);
  }
  if (readouts.far) {
    readouts.far.textContent = formatNumber(derived.farScreenHeight, 2);
  }
  if (readouts.ratio) {
    readouts.ratio.textContent = `${formatNumber(derived.ratio, 2)}x`;
  }
  renderCodeSteps(stepList, derived.steps);
  if (loweredOutput) {
    loweredOutput.textContent = derived.lowered;
  }
}

function drawProjectionCodeLab(ctx, canvas, derived) {
  const width = canvas.width;
  const height = canvas.height;
  const rect = {
    x: 18,
    y: 18,
    width: width - 36,
    height: height - 36,
  };
  const diagramWidth = rect.width * 0.64;
  const diagramHeight = rect.height - 42;
  const diagramX = rect.x + 14;
  const diagramY = rect.y + 30;
  const screenX = rect.x + rect.width * 0.74;
  const screenY = rect.y + 48;
  const screenWidth = rect.width * 0.18;
  const screenHeight = rect.height - 74;
  const maxDepth = 4.8;
  const objectHeight = 1;
  const objects = [
    { depth: derived.nearDepth, color: "rgba(247, 160, 74, 0.9)", label: "near" },
    { depth: derived.farDepth, color: "rgba(115, 221, 213, 0.9)", label: "far" },
  ];

  function toDiagram(point) {
    return [
      diagramX + (point[0] / maxDepth) * diagramWidth,
      diagramY + diagramHeight * 0.5 - point[1] * (diagramHeight * 0.28),
    ];
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawLessonCanvasBackground(ctx, width, height);
  drawLessonCanvasPanel(ctx, rect, "Projection setup", width);

  const imagePlaneDepth = 0.9;
  const imagePlane = toDiagram([imagePlaneDepth, 0]);
  const topPlane = toDiagram([imagePlaneDepth, 1.1]);
  const bottomPlane = toDiagram([imagePlaneDepth, -1.1]);

  ctx.strokeStyle = derived.values.perspective ? "rgba(247, 160, 74, 0.82)" : "rgba(115, 221, 213, 0.84)";
  ctx.lineWidth = Math.max(2, width * 0.003);
  ctx.beginPath();
  ctx.moveTo(topPlane[0], topPlane[1]);
  ctx.lineTo(bottomPlane[0], bottomPlane[1]);
  ctx.stroke();

  if (derived.values.perspective) {
    const fov = degreesToRadians(derived.values.fov);
    const eye = toDiagram([0, 0]);
    const farHalfHeight = Math.tan(fov / 2) * maxDepth;
    const farTop = toDiagram([maxDepth, farHalfHeight]);
    const farBottom = toDiagram([maxDepth, -farHalfHeight]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.beginPath();
    ctx.moveTo(eye[0], eye[1]);
    ctx.lineTo(farTop[0], farTop[1]);
    ctx.moveTo(eye[0], eye[1]);
    ctx.lineTo(farBottom[0], farBottom[1]);
    ctx.stroke();
    ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
    ctx.beginPath();
    ctx.arc(eye[0], eye[1], Math.max(5, width * 0.007), 0, TAU);
    ctx.fill();
  } else {
    const volumeTop = toDiagram([maxDepth, derived.values.ortho_height]);
    const volumeBottom = toDiagram([maxDepth, -derived.values.ortho_height]);
    const nearTop = toDiagram([0, derived.values.ortho_height]);
    const nearBottom = toDiagram([0, -derived.values.ortho_height]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.beginPath();
    ctx.moveTo(nearTop[0], nearTop[1]);
    ctx.lineTo(volumeTop[0], volumeTop[1]);
    ctx.moveTo(nearBottom[0], nearBottom[1]);
    ctx.lineTo(volumeBottom[0], volumeBottom[1]);
    ctx.moveTo(nearTop[0], nearTop[1]);
    ctx.lineTo(nearBottom[0], nearBottom[1]);
    ctx.moveTo(volumeTop[0], volumeTop[1]);
    ctx.lineTo(volumeBottom[0], volumeBottom[1]);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(239, 245, 247, 0.16)";
  ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);

  const imageCenterY = screenY + screenHeight * 0.5;
  const screenHeights = [derived.nearScreenHeight, derived.farScreenHeight];

  objects.forEach((object, index) => {
    const halfHeight = objectHeight * 0.5;
    const top = toDiagram([object.depth, halfHeight]);
    const bottom = toDiagram([object.depth, -halfHeight]);
    ctx.fillStyle = object.color;
    ctx.fillRect(top[0] - 6, top[1], 12, bottom[1] - top[1]);

    if (derived.values.perspective) {
      const eye = toDiagram([0, 0]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.beginPath();
      ctx.moveTo(eye[0], eye[1]);
      ctx.lineTo(top[0], top[1]);
      ctx.moveTo(eye[0], eye[1]);
      ctx.lineTo(bottom[0], bottom[1]);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.beginPath();
      ctx.moveTo(top[0], top[1]);
      ctx.lineTo(imagePlane[0], top[1]);
      ctx.moveTo(bottom[0], bottom[1]);
      ctx.lineTo(imagePlane[0], bottom[1]);
      ctx.stroke();
    }

    const clamped = clamp(screenHeights[index], 0.12, 0.98);
    const barHeight = clamped * (screenHeight * 0.66);
    const barWidth = screenWidth * 0.28;
    const barX = screenX + screenWidth * (0.14 + index * 0.42);
    ctx.fillRect(barX, imageCenterY - barHeight * 0.5, barWidth, barHeight);
  });

  ctx.fillStyle = "rgba(239, 245, 247, 0.84)";
  ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
  ctx.fillText(
    derived.values.perspective ? "distant objects shrink" : "parallel sizes stay matched",
    rect.x + 14,
    rect.y + rect.height - 14
  );
}

function setupProjectionCodeLab() {
  setupStructuredCodeLab({
    prefix: "projection-code",
    schema: [
      { name: "perspective", type: "bool" },
      { name: "fov", type: "number" },
      { name: "camera_distance", type: "number" },
      { name: "ortho_height", type: "number" },
    ],
    defaults: {
      perspective: true,
      fov: 56,
      camera_distance: 4.4,
      ortho_height: 1.9,
    },
    readoutIds: {
      mode: "projection-code-readout-mode",
      near: "projection-code-readout-near",
      far: "projection-code-readout-far",
      ratio: "projection-code-readout-ratio",
    },
    evaluate: evaluateProjectionCodeLabBindings,
    updateUi: updateProjectionCodeLabUi,
    getStatusMessage(parsed, derived) {
      return `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}. ${derived.values.perspective ? "Perspective" : "Orthographic"} mode gives a near/far size ratio of ${formatNumber(derived.ratio, 2)}x.`;
    },
    draw: drawProjectionCodeLab,
  });
}

function evaluateTextureCodeLabBindings(values) {
  const gridSize = 6;

  function texelColor(x, y) {
    const u = x / Math.max(gridSize - 1, 1);
    const v = y / Math.max(gridSize - 1, 1);
    if ((x + y) % 2 === 0) {
      return [0.16 + u * 0.18, 0.5 + v * 0.16, 0.84 - u * 0.12];
    }
    return [0.96, 0.7 - v * 0.14, 0.28 + u * 0.1];
  }

  const scaledUv = [values.uv[0] * values.uv_scale, values.uv[1] * values.uv_scale];
  const wrappedUv = [wrapUnit(scaledUv[0]), wrapUnit(scaledUv[1])];
  const sampleX = wrappedUv[0] * (gridSize - 1);
  const sampleY = wrappedUv[1] * (gridSize - 1);
  const x0 = clamp(Math.floor(sampleX), 0, gridSize - 1);
  const y0 = clamp(Math.floor(sampleY), 0, gridSize - 1);
  const x1 = clamp(x0 + 1, 0, gridSize - 1);
  const y1 = clamp(y0 + 1, 0, gridSize - 1);
  const tx = sampleX - x0;
  const ty = sampleY - y0;
  const nearest = [clamp(Math.round(sampleX), 0, gridSize - 1), clamp(Math.round(sampleY), 0, gridSize - 1)];
  const c00 = texelColor(x0, y0);
  const c10 = texelColor(x1, y0);
  const c01 = texelColor(x0, y1);
  const c11 = texelColor(x1, y1);
  const top = [lerp(c00[0], c10[0], tx), lerp(c00[1], c10[1], tx), lerp(c00[2], c10[2], tx)];
  const bottom = [lerp(c01[0], c11[0], tx), lerp(c01[1], c11[1], tx), lerp(c01[2], c11[2], tx)];
  const linearColor = [lerp(top[0], bottom[0], ty), lerp(top[1], bottom[1], ty), lerp(top[2], bottom[2], ty)];
  const nearestColor = texelColor(nearest[0], nearest[1]);
  const sampledColor = values.linear_filter ? linearColor : nearestColor;

  const steps = [
    `Scale the incoming uv ${formatVector(values.uv, 2)} by ${formatNumber(values.uv_scale, 2)} to get repeated coordinates ${formatVector(scaledUv, 2)}.`,
    `Wrap those coordinates back into the 0..1 texture range as ${formatVector(wrappedUv, 2)}.`,
    values.linear_filter
      ? `The sampler blends the four neighboring texels around (${formatNumber(sampleX, 2)}, ${formatNumber(sampleY, 2)}) instead of choosing just one.`
      : `The sampler chooses the nearest texel at index (${nearest[0]}, ${nearest[1]}).`,
    `The sampled color is rgb ${formatVector(sampledColor, 2)}.`,
  ];

  const lowered = [
    "// CPU-side lesson bindings",
    `vec2 uv = vec2(${formatNumber(values.uv[0], 3)}, ${formatNumber(values.uv[1], 3)});`,
    `float uvScale = ${formatNumber(values.uv_scale, 3)};`,
    values.linear_filter ? "gl.texParameteri(TEXTURE_2D, TEXTURE_MIN_FILTER, LINEAR);" : "gl.texParameteri(TEXTURE_2D, TEXTURE_MIN_FILTER, NEAREST);",
    "",
    "// Fragment-stage sample",
    "vec2 repeatedUv = fract(uv * uvScale);",
    values.linear_filter ? "vec4 sampleColor = texture2D(uTexture, repeatedUv); // linear blend" : "vec4 sampleColor = texture2D(uTexture, repeatedUv); // nearest texel",
  ].join("\n");

  return {
    values,
    gridSize,
    wrappedUv,
    sampleX,
    sampleY,
    x0,
    y0,
    x1,
    y1,
    nearest,
    nearestColor,
    linearColor,
    sampledColor,
    texelColor,
    steps,
    lowered,
  };
}

function updateTextureCodeLabUi(derived, readouts, stepList, loweredOutput) {
  if (readouts.uv) {
    readouts.uv.textContent = formatVector(derived.wrappedUv, 2);
  }
  if (readouts.texel) {
    readouts.texel.textContent = `(${derived.nearest[0]}, ${derived.nearest[1]})`;
  }
  if (readouts.mode) {
    readouts.mode.textContent = derived.values.linear_filter ? "linear filter" : "nearest filter";
  }
  if (readouts.color) {
    readouts.color.textContent = `rgb ${formatVector(derived.sampledColor, 2)}`;
  }
  renderCodeSteps(stepList, derived.steps);
  if (loweredOutput) {
    loweredOutput.textContent = derived.lowered;
  }
}

function drawTextureCodeLab(ctx, canvas, derived) {
  const width = canvas.width;
  const height = canvas.height;
  const leftRect = { x: 18, y: 18, width: width * 0.56 - 27, height: height - 36 };
  const rightRect = { x: width * 0.56 + 9, y: 18, width: width * 0.44 - 27, height: height - 36 };
  const gridRect = { x: leftRect.x + 18, y: leftRect.y + 44, width: leftRect.width - 36, height: leftRect.height - 64 };
  const cellWidth = gridRect.width / derived.gridSize;
  const cellHeight = gridRect.height / derived.gridSize;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawLessonCanvasBackground(ctx, width, height);
  drawLessonCanvasPanel(ctx, leftRect, "Texture grid", width);
  drawLessonCanvasPanel(ctx, rightRect, "Sampled output", width);

  for (let y = 0; y < derived.gridSize; y += 1) {
    for (let x = 0; x < derived.gridSize; x += 1) {
      const drawX = gridRect.x + x * cellWidth;
      const drawY = gridRect.y + (derived.gridSize - 1 - y) * cellHeight;
      ctx.fillStyle = rgbToCss(derived.texelColor(x, y));
      ctx.fillRect(drawX, drawY, cellWidth, cellHeight);
      ctx.strokeStyle = "rgba(8, 21, 30, 0.24)";
      ctx.strokeRect(drawX, drawY, cellWidth, cellHeight);
    }
  }

  const sampleCanvas = [
    gridRect.x + (derived.sampleX / Math.max(derived.gridSize - 1, 1)) * gridRect.width,
    gridRect.y + gridRect.height - (derived.sampleY / Math.max(derived.gridSize - 1, 1)) * gridRect.height,
  ];
  const nearestRect = {
    x: gridRect.x + derived.nearest[0] * cellWidth,
    y: gridRect.y + (derived.gridSize - 1 - derived.nearest[1]) * cellHeight,
    width: cellWidth,
    height: cellHeight,
  };
  ctx.strokeStyle = "rgba(247, 160, 74, 0.96)";
  ctx.lineWidth = Math.max(2, width * 0.003);
  ctx.strokeRect(nearestRect.x + 1, nearestRect.y + 1, nearestRect.width - 2, nearestRect.height - 2);

  if (derived.values.linear_filter) {
    const blendRect = {
      x: gridRect.x + derived.x0 * cellWidth,
      y: gridRect.y + (derived.gridSize - 1 - derived.y1) * cellHeight,
      width: Math.max((derived.x1 - derived.x0 + 1) * cellWidth, cellWidth),
      height: Math.max((derived.y1 - derived.y0 + 1) * cellHeight, cellHeight),
    };
    ctx.strokeStyle = "rgba(115, 221, 213, 0.96)";
    ctx.strokeRect(blendRect.x + 1, blendRect.y + 1, blendRect.width - 2, blendRect.height - 2);
  }

  ctx.fillStyle = "rgba(255, 245, 216, 0.98)";
  ctx.beginPath();
  ctx.arc(sampleCanvas[0], sampleCanvas[1], Math.max(5.5, width * 0.008), 0, TAU);
  ctx.fill();

  const swatchRect = {
    x: rightRect.x + 18,
    y: rightRect.y + 54,
    width: rightRect.width - 36,
    height: rightRect.height * 0.28,
  };
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(swatchRect.x, swatchRect.y, swatchRect.width, swatchRect.height);
  ctx.fillStyle = rgbToCss(derived.sampledColor);
  ctx.fillRect(swatchRect.x + 10, swatchRect.y + 10, swatchRect.width - 20, swatchRect.height - 20);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.strokeRect(swatchRect.x, swatchRect.y, swatchRect.width, swatchRect.height);

  ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
  ctx.font = `${Math.max(11, width * 0.013)}px "Avenir Next", "Segoe UI", sans-serif`;
  ctx.fillText(derived.values.linear_filter ? "linear blends nearby texels" : "nearest picks one texel", rightRect.x + 18, swatchRect.y - 12);
  ctx.fillText(`wrapped uv ${formatVector(derived.wrappedUv, 2)}`, rightRect.x + 18, swatchRect.y + swatchRect.height + 28);
  ctx.fillText(`rgb ${formatVector(derived.sampledColor, 2)}`, rightRect.x + 18, swatchRect.y + swatchRect.height + 50);
}

function setupTextureCodeLab() {
  setupStructuredCodeLab({
    prefix: "texture-code",
    schema: [
      { name: "uv", type: "vec2" },
      { name: "uv_scale", type: "number" },
      { name: "linear_filter", type: "bool" },
    ],
    defaults: {
      uv: vec2(0.62, 0.34),
      uv_scale: 6,
      linear_filter: true,
    },
    readoutIds: {
      uv: "texture-code-readout-uv",
      texel: "texture-code-readout-texel",
      mode: "texture-code-readout-mode",
      color: "texture-code-readout-color",
    },
    evaluate: evaluateTextureCodeLabBindings,
    updateUi: updateTextureCodeLabUi,
    getStatusMessage(parsed, derived) {
      return `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}. The sampler is using ${derived.values.linear_filter ? "linear filtering" : "nearest filtering"} at wrapped uv ${formatVector(derived.wrappedUv, 2)}.`;
    },
    draw: drawTextureCodeLab,
  });
}

function evaluateMaterialCodeLabBindings(values) {
  const normal = normalize2([Math.cos(degreesToRadians(values.normal_angle)), Math.sin(degreesToRadians(values.normal_angle))]);
  const light = normalize2([Math.cos(degreesToRadians(values.light_angle)), Math.sin(degreesToRadians(values.light_angle))]);
  const view = normalize2([Math.cos(degreesToRadians(values.view_angle)), Math.sin(degreesToRadians(values.view_angle))]);
  const halfVector = normalize2(add2(light, view));
  const diffuse = clamp(dot2(normal, light), 0, 1);
  const specular =
    diffuse > 0 ? Math.pow(Math.max(dot2(normal, halfVector), 0), values.shininess) * values.specular_strength : 0;
  const baseColor = [0.21, 0.74, 0.93];
  const finalColor = [
    clamp(baseColor[0] * (0.18 + diffuse * 0.72) + specular * 0.92, 0, 1),
    clamp(baseColor[1] * (0.18 + diffuse * 0.72) + specular * 0.92, 0, 1),
    clamp(baseColor[2] * (0.18 + diffuse * 0.72) + specular * 0.92, 0, 1),
  ];

  const steps = [
    `Bind the surface normal angle ${formatNumber(values.normal_angle, 1)}°, light angle ${formatNumber(values.light_angle, 1)}°, and view angle ${formatNumber(values.view_angle, 1)}°.`,
    `Diffuse uses dot(n, l) = dot(${formatVector(normal, 2)}, ${formatVector(light, 2)}) = ${formatNumber(diffuse, 3)}.`,
    `Specular uses the half-vector ${formatVector(halfVector, 2)} with shininess ${formatNumber(values.shininess, 1)} and strength ${formatNumber(values.specular_strength, 2)}.`,
    `The final shaded color is rgb ${formatVector(finalColor, 2)} after combining ambient, diffuse, and specular terms.`,
  ];

  const lowered = [
    "// CPU-side lesson bindings",
    `vec3 uBaseColor = vec3(${formatNumber(baseColor[0], 3)}, ${formatNumber(baseColor[1], 3)}, ${formatNumber(baseColor[2], 3)});`,
    `float uSpecularStrength = ${formatNumber(values.specular_strength, 3)};`,
    `float uShininess = ${formatNumber(values.shininess, 3)};`,
    "",
    "// Fragment-stage lighting",
    "vec3 n = normalize(vNormal);",
    `vec3 l = normalize(vec3(${formatNumber(light[0], 3)}, ${formatNumber(light[1], 3)}, 0.0));`,
    `vec3 v = normalize(vec3(${formatNumber(view[0], 3)}, ${formatNumber(view[1], 3)}, 0.0));`,
    "vec3 h = normalize(l + v);",
    "float diffuse = max(dot(n, l), 0.0);",
    "float specular = pow(max(dot(n, h), 0.0), uShininess) * uSpecularStrength;",
  ].join("\n");

  return {
    values,
    normal,
    light,
    view,
    halfVector,
    diffuse,
    specular,
    finalColor,
    steps,
    lowered,
  };
}

function updateMaterialCodeLabUi(derived, readouts, stepList, loweredOutput) {
  if (readouts.diffuse) {
    readouts.diffuse.textContent = formatNumber(derived.diffuse, 3);
  }
  if (readouts.specular) {
    readouts.specular.textContent = formatNumber(derived.specular, 3);
  }
  if (readouts.half) {
    readouts.half.textContent = formatVector(derived.halfVector, 2);
  }
  if (readouts.color) {
    readouts.color.textContent = `rgb ${formatVector(derived.finalColor, 2)}`;
  }
  renderCodeSteps(stepList, derived.steps);
  if (loweredOutput) {
    loweredOutput.textContent = derived.lowered;
  }
}

function drawMaterialCodeLab(ctx, canvas, derived) {
  const width = canvas.width;
  const height = canvas.height;
  const margin = 18;
  const gap = 16;
  const stacked = width < 760;
  const leftWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap) * 0.54;
  const rightWidth = stacked ? width - margin * 2 : width - margin * 2 - gap - leftWidth;
  const panelHeight = stacked ? (height - margin * 2 - gap) / 2 : height - margin * 2;
  const geometryRect = { x: margin, y: margin, width: leftWidth, height: panelHeight };
  const responseRect = stacked
    ? { x: margin, y: margin + panelHeight + gap, width: width - margin * 2, height: panelHeight }
    : { x: margin + leftWidth + gap, y: margin, width: rightWidth, height: panelHeight };

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawLessonCanvasBackground(ctx, width, height);
  drawLessonCanvasPanel(ctx, geometryRect, "Surface point", width);
  drawLessonCanvasPanel(ctx, responseRect, "Lighting response", width);

  const center = [geometryRect.x + geometryRect.width * 0.48, geometryRect.y + geometryRect.height * 0.6];
  const radius = Math.min(geometryRect.width, geometryRect.height) * 0.26;
  const sample = [derived.normal[0] * radius, derived.normal[1] * radius];
  const sampleCanvas = [center[0] + sample[0], center[1] - sample[1]];
  const lightCanvas = [center[0] + derived.light[0] * radius * 2.4, center[1] - derived.light[1] * radius * 2.4];
  const viewCanvas = [center[0] + derived.view[0] * radius * 2.8, center[1] - derived.view[1] * radius * 2.8];

  const sphereGradient = ctx.createRadialGradient(
    center[0] - radius * 0.3,
    center[1] - radius * 0.35,
    radius * 0.18,
    center[0],
    center[1],
    radius
  );
  sphereGradient.addColorStop(0, "rgba(72, 128, 164, 0.66)");
  sphereGradient.addColorStop(1, "rgba(13, 30, 44, 0.9)");
  ctx.fillStyle = sphereGradient;
  ctx.beginPath();
  ctx.arc(center[0], center[1], radius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = Math.max(2, width * 0.003);
  ctx.stroke();

  const arrows = [
    { vector: derived.normal, color: "rgba(115, 221, 213, 0.98)", label: "N", length: radius * 0.84, dash: [] },
    { vector: derived.light, color: "rgba(247, 160, 74, 0.98)", label: "L", length: radius * 1.1, dash: [] },
    { vector: derived.view, color: "rgba(138, 220, 255, 0.96)", label: "V", length: radius * 1.1, dash: [] },
    { vector: derived.halfVector, color: "rgba(255, 245, 216, 0.84)", label: "H", length: radius * 0.76, dash: [8, 6] },
  ];

  ctx.fillStyle = "rgba(255, 245, 216, 0.98)";
  ctx.beginPath();
  ctx.arc(sampleCanvas[0], sampleCanvas[1], Math.max(6, width * 0.009), 0, TAU);
  ctx.fill();

  for (const arrow of arrows) {
    const end = [sampleCanvas[0] + arrow.vector[0] * arrow.length, sampleCanvas[1] - arrow.vector[1] * arrow.length];
    ctx.setLineDash(arrow.dash);
    ctx.strokeStyle = arrow.color;
    ctx.lineWidth = Math.max(2.2, width * 0.0032);
    ctx.beginPath();
    ctx.moveTo(sampleCanvas[0], sampleCanvas[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = arrow.color;
    ctx.font = `${Math.max(10, width * 0.012)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
    ctx.fillText(arrow.label, end[0] + 6, end[1] - 4);
  }

  ctx.fillStyle = "rgba(247, 160, 74, 0.96)";
  ctx.beginPath();
  ctx.arc(lightCanvas[0], lightCanvas[1], Math.max(7, width * 0.01), 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(138, 220, 255, 0.96)";
  ctx.beginPath();
  ctx.arc(viewCanvas[0], viewCanvas[1], Math.max(7, width * 0.01), 0, TAU);
  ctx.fill();

  const swatchRect = {
    x: responseRect.x + 16,
    y: responseRect.y + 44,
    width: responseRect.width - 32,
    height: responseRect.height * 0.24,
  };
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(swatchRect.x, swatchRect.y, swatchRect.width, swatchRect.height);
  ctx.fillStyle = rgbToCss(derived.finalColor);
  ctx.fillRect(swatchRect.x + 8, swatchRect.y + 8, swatchRect.width - 16, swatchRect.height - 16);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.strokeRect(swatchRect.x, swatchRect.y, swatchRect.width, swatchRect.height);

  function drawBar(label, value, color, y) {
    const rect = { x: responseRect.x + 16, y, width: responseRect.width - 32, height: 18 };
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.fillStyle = color;
    ctx.fillRect(rect.x, rect.y, rect.width * clamp(value, 0, 1), rect.height);
    ctx.fillStyle = "rgba(239, 245, 247, 0.9)";
    ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
    ctx.fillText(label, rect.x, rect.y - 8);
  }

  drawBar("Diffuse", derived.diffuse, "rgba(247, 160, 74, 0.96)", swatchRect.y + swatchRect.height + 34);
  drawBar("Specular", clamp(derived.specular * 2.4, 0, 1), "rgba(255, 245, 216, 0.98)", swatchRect.y + swatchRect.height + 76);

  ctx.fillStyle = "rgba(239, 245, 247, 0.84)";
  ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
  ctx.fillText(`shininess ${formatNumber(derived.values.shininess, 0)} keeps the highlight ${derived.values.shininess > 40 ? "tight" : "broad"}.`, responseRect.x + 16, responseRect.y + responseRect.height - 14);
}

function setupMaterialCodeLab() {
  setupStructuredCodeLab({
    prefix: "material-code",
    schema: [
      { name: "normal_angle", type: "number" },
      { name: "light_angle", type: "number" },
      { name: "view_angle", type: "number" },
      { name: "specular_strength", type: "number" },
      { name: "shininess", type: "number" },
    ],
    defaults: {
      normal_angle: 28,
      light_angle: 38,
      view_angle: 12,
      specular_strength: 0.48,
      shininess: 36,
    },
    readoutIds: {
      diffuse: "material-code-readout-diffuse",
      specular: "material-code-readout-specular",
      half: "material-code-readout-half",
      color: "material-code-readout-color",
    },
    evaluate: evaluateMaterialCodeLabBindings,
    updateUi: updateMaterialCodeLabUi,
    getStatusMessage(parsed, derived) {
      return `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}. Diffuse is ${formatNumber(derived.diffuse, 3)} and specular is ${formatNumber(derived.specular, 3)}.`;
    },
    draw: drawMaterialCodeLab,
  });
}

function evaluateShadowCodeLabBindings(values) {
  const mapSamples = [
    clamp(values.shadow_map_depth - 0.035, 0, 1),
    clamp(values.shadow_map_depth, 0, 1),
    clamp(values.shadow_map_depth + 0.04, 0, 1),
  ];
  const adjustedDepth = clamp(values.receiver_depth - values.bias, 0, 1);
  const centerShadow = adjustedDepth > mapSamples[1] ? 1 : 0;
  const shadowSamples = values.soft_filter
    ? mapSamples.map((depth) => (adjustedDepth > depth ? 1 : 0))
    : [centerShadow];
  const shadowFactor =
    shadowSamples.reduce((sum, value) => sum + value, 0) / Math.max(shadowSamples.length, 1);
  const litFactor = 1 - shadowFactor;

  const steps = [
    `Sample shadow-map depth ${formatNumber(values.shadow_map_depth, 3)} for the current light-space texel.`,
    `Take the receiver depth ${formatNumber(values.receiver_depth, 3)} and subtract bias ${formatNumber(values.bias, 3)} to get ${formatNumber(adjustedDepth, 3)}.`,
    `Compare adjusted receiver depth against the stored shadow-map depth${values.soft_filter ? " values in a small filtered neighborhood" : ""}.`,
    `The resulting shadow factor is ${formatNumber(shadowFactor, 2)}, so the surface keeps ${formatNumber(litFactor, 2)} of its direct light.`,
  ];

  const lowered = [
    "// CPU-side lesson bindings",
    `float receiverDepth = ${formatNumber(values.receiver_depth, 3)};`,
    `float shadowMapDepth = ${formatNumber(values.shadow_map_depth, 3)};`,
    `float bias = ${formatNumber(values.bias, 3)};`,
    "",
    "// Shadow compare",
    "float adjustedDepth = receiverDepth - bias;",
    values.soft_filter
      ? "float shadow = average(compare(adjustedDepth, sampleNeighbors(shadowMap)));"
      : "float shadow = adjustedDepth > shadowMapDepth ? 1.0 : 0.0;",
  ].join("\n");

  return {
    values,
    mapSamples,
    adjustedDepth,
    shadowFactor,
    litFactor,
    steps,
    lowered,
  };
}

function updateShadowCodeLabUi(derived, readouts, stepList, loweredOutput) {
  if (readouts.adjusted) {
    readouts.adjusted.textContent = formatNumber(derived.adjustedDepth, 3);
  }
  if (readouts.stored) {
    readouts.stored.textContent = formatNumber(derived.mapSamples[1], 3);
  }
  if (readouts.shadow) {
    readouts.shadow.textContent = formatNumber(derived.shadowFactor, 2);
  }
  if (readouts.state) {
    readouts.state.textContent = derived.shadowFactor > 0.5 ? "mostly shadowed" : derived.shadowFactor > 0 ? "partially shadowed" : "lit";
  }
  renderCodeSteps(stepList, derived.steps);
  if (loweredOutput) {
    loweredOutput.textContent = derived.lowered;
  }
}

function drawShadowCodeLab(ctx, canvas, derived) {
  const width = canvas.width;
  const height = canvas.height;
  const leftRect = { x: 18, y: 18, width: width * 0.58 - 27, height: height - 36 };
  const rightRect = { x: width * 0.58 + 9, y: 18, width: width * 0.42 - 27, height: height - 36 };
  const graphRect = { x: leftRect.x + 18, y: leftRect.y + 54, width: leftRect.width - 36, height: leftRect.height - 84 };

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawLessonCanvasBackground(ctx, width, height);
  drawLessonCanvasPanel(ctx, leftRect, "Shadow compare", width);
  drawLessonCanvasPanel(ctx, rightRect, "Lighting result", width);

  const barGap = 14;
  const barWidth = (graphRect.width - barGap * 2) / 3;
  for (let index = 0; index < derived.mapSamples.length; index += 1) {
    const depth = derived.mapSamples[index];
    const barHeight = graphRect.height * depth;
    const x = graphRect.x + index * (barWidth + barGap);
    const y = graphRect.y + graphRect.height - barHeight;
    ctx.fillStyle = "rgba(115, 221, 213, 0.86)";
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = "rgba(239, 245, 247, 0.88)";
    ctx.font = `${Math.max(10, width * 0.012)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
    ctx.fillText(formatNumber(depth, 2), x + 4, y - 8);
  }

  const lineY = graphRect.y + graphRect.height - graphRect.height * derived.adjustedDepth;
  ctx.strokeStyle = "rgba(247, 160, 74, 0.96)";
  ctx.lineWidth = Math.max(2, width * 0.003);
  ctx.beginPath();
  ctx.moveTo(graphRect.x - 6, lineY);
  ctx.lineTo(graphRect.x + graphRect.width + 6, lineY);
  ctx.stroke();
  ctx.fillStyle = "rgba(239, 245, 247, 0.9)";
  ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
  ctx.fillText("adjusted receiver depth", graphRect.x, lineY - 12);

  const swatchRect = {
    x: rightRect.x + 18,
    y: rightRect.y + 54,
    width: rightRect.width - 36,
    height: rightRect.height * 0.28,
  };
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(swatchRect.x, swatchRect.y, swatchRect.width, swatchRect.height);
  ctx.fillStyle = rgbToCss([
    0.16 + derived.litFactor * 0.32,
    0.28 + derived.litFactor * 0.42,
    0.36 + derived.litFactor * 0.44,
  ]);
  ctx.fillRect(swatchRect.x + 8, swatchRect.y + 8, swatchRect.width - 16, swatchRect.height - 16);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.strokeRect(swatchRect.x, swatchRect.y, swatchRect.width, swatchRect.height);

  const meterX = rightRect.x + 18;
  const meterY = swatchRect.y + swatchRect.height + 34;
  const meterW = rightRect.width - 36;
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(meterX, meterY, meterW, 16);
  ctx.fillStyle = "rgba(255, 223, 132, 0.92)";
  ctx.fillRect(meterX, meterY, meterW * derived.litFactor, 16);
  ctx.fillStyle = "rgba(239, 245, 247, 0.9)";
  ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
  ctx.fillText(`shadow factor ${formatNumber(derived.shadowFactor, 2)}`, meterX, meterY - 8);
  ctx.fillText(derived.values.soft_filter ? "soft filter averages several compares" : "single compare uses only the center texel", meterX, meterY + 42);
}

function setupShadowCodeLab() {
  setupStructuredCodeLab({
    prefix: "shadow-code",
    schema: [
      { name: "shadow_map_depth", type: "number" },
      { name: "receiver_depth", type: "number" },
      { name: "bias", type: "number" },
      { name: "soft_filter", type: "bool" },
    ],
    defaults: {
      shadow_map_depth: 0.44,
      receiver_depth: 0.47,
      bias: 0.02,
      soft_filter: true,
    },
    readoutIds: {
      adjusted: "shadow-code-readout-adjusted",
      stored: "shadow-code-readout-stored",
      shadow: "shadow-code-readout-shadow",
      state: "shadow-code-readout-state",
    },
    evaluate: evaluateShadowCodeLabBindings,
    updateUi: updateShadowCodeLabUi,
    getStatusMessage(parsed, derived) {
      return `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}. The surface keeps ${formatNumber(derived.litFactor, 2)} of its direct light after the shadow compare.`;
    },
    draw: drawShadowCodeLab,
  });
}

function evaluateCompareCodeLabBindings(values) {
  const scene = buildCompareScene({
    sample: values.sample,
    drift: values.object_drift,
  });
  const winner = scene.primaryHit ? scene.primaryHit.object.name : "background";
  const shadowState = values.cast_shadow
    ? scene.shadowQuery?.blocked
      ? `blocked by ${scene.shadowQuery.blocked.object.name}`
      : "clear to light"
    : "not cast";
  const reflectionState =
    values.cast_reflection && scene.reflectionQuery
      ? formatVector(scene.reflectionQuery.direction, 2)
      : values.cast_reflection
        ? "no primary hit"
        : "disabled";

  const steps = [
    `Pick one screen sample at ${formatNumber(values.sample, 2)} across the image and drift the scene by ${formatNumber(values.object_drift, 2)}.`,
    `Rasterization asks which projected object owns that sample. The answer here is ${winner}.`,
    `Ray tracing launches one primary ray and finds the same first hit${scene.primaryHit ? ` at ${formatVector(scene.primaryHit.point, 2)}` : ""}.`,
    values.cast_shadow || values.cast_reflection
      ? `Optional secondary queries are ${values.cast_shadow ? "shadow" : ""}${values.cast_shadow && values.cast_reflection ? " and " : ""}${values.cast_reflection ? "reflection" : ""} rays.`
      : "No secondary rays are requested, so the query stops at the first hit.",
  ];

  const lowered = [
    "// CPU-side lesson bindings",
    `float sample = ${formatNumber(values.sample, 3)};`,
    `float objectDrift = ${formatNumber(values.object_drift, 3)};`,
    `bool castShadow = ${values.cast_shadow ? "true" : "false"};`,
    `bool castReflection = ${values.cast_reflection ? "true" : "false"};`,
    "",
    "// Two visibility stories",
    "rasterWinner = depthTest(projectedShapes, sample);",
    "primaryHit = tracePrimaryRay(camera, sample);",
    "if (castShadow) traceShadowRay(primaryHit);",
    "if (castReflection) traceReflectionRay(primaryHit);",
  ].join("\n");

  return {
    values,
    scene,
    winner,
    shadowState,
    reflectionState,
    steps,
    lowered,
  };
}

function updateCompareCodeLabUi(derived, readouts, stepList, loweredOutput) {
  if (readouts.winner) {
    readouts.winner.textContent = derived.winner;
  }
  if (readouts.hit) {
    readouts.hit.textContent = derived.scene.primaryHit ? formatVector(derived.scene.primaryHit.point, 2) : "no hit";
  }
  if (readouts.shadow) {
    readouts.shadow.textContent = derived.shadowState;
  }
  if (readouts.reflection) {
    readouts.reflection.textContent = derived.reflectionState;
  }
  renderCodeSteps(stepList, derived.steps);
  if (loweredOutput) {
    loweredOutput.textContent = derived.lowered;
  }
}

function drawCompareCodeLab(ctx, canvas, derived) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = derived.scene;
  const gap = 16;
  const panelWidth = (width - 52 - gap) / 2;
  const leftRect = { x: 18, y: 18, width: panelWidth, height: height - 36 };
  const rightRect = { x: 18 + panelWidth + gap, y: 18, width: panelWidth, height: height - 36 };

  function toCanvasImage(point) {
    const x = leftRect.x + ((point[0] + 1) * 0.5) * leftRect.width;
    const y = leftRect.y + leftRect.height - (((point[1] + 0.72) / 1.44) * leftRect.height);
    return [x, y];
  }

  const world = {
    x0: -1.16,
    x1: 1.16,
    y0: -1.14,
    y1: 1.04,
  };

  function toWorldCanvas(point) {
    const x = rightRect.x + ((point[0] - world.x0) / (world.x1 - world.x0)) * rightRect.width;
    const y = rightRect.y + rightRect.height - ((point[1] - world.y0) / (world.y1 - world.y0)) * rightRect.height;
    return [x, y];
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawLessonCanvasBackground(ctx, width, height, "#102334", "#163446");
  drawLessonCanvasPanel(ctx, leftRect, "Rasterization view", width);
  drawLessonCanvasPanel(ctx, rightRect, "Ray tracing view", width);

  for (const object of scene.projectedObjects) {
    const center = toCanvasImage([object.screenX, 0]);
    const radius = Math.max(12, object.screenRadius * leftRect.width * 0.45);
    ctx.fillStyle = object.fill;
    ctx.beginPath();
    ctx.arc(center[0], center[1], radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = object.stroke;
    ctx.lineWidth = Math.max(2, width * 0.0035);
    ctx.stroke();
  }

  const sampleX = toCanvasImage([scene.screenPoint[0], 0])[0];
  ctx.strokeStyle = "rgba(255, 255, 255, 0.68)";
  ctx.beginPath();
  ctx.moveTo(sampleX, leftRect.y + 18);
  ctx.lineTo(sampleX, leftRect.y + leftRect.height - 18);
  ctx.stroke();
  const pixelSize = Math.max(14, leftRect.width * 0.07);
  const pixelY = leftRect.y + leftRect.height * 0.56;
  ctx.fillStyle = scene.primaryHit ? scene.primaryHit.object.solid : "#20384a";
  ctx.fillRect(sampleX - pixelSize * 0.5, pixelY - pixelSize * 0.5, pixelSize, pixelSize);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.88)";
  ctx.strokeRect(sampleX - pixelSize * 0.5, pixelY - pixelSize * 0.5, pixelSize, pixelSize);

  const screenLeft = toWorldCanvas([-scene.screenHalfWidth, scene.screenY]);
  const screenRight = toWorldCanvas([scene.screenHalfWidth, scene.screenY]);
  ctx.strokeStyle = "rgba(170, 230, 255, 0.82)";
  ctx.lineWidth = Math.max(2, width * 0.0038);
  ctx.beginPath();
  ctx.moveTo(screenLeft[0], screenLeft[1]);
  ctx.lineTo(screenRight[0], screenRight[1]);
  ctx.stroke();

  const samplePoint = toWorldCanvas(scene.screenPoint);
  ctx.fillStyle = "#fff4d4";
  ctx.beginPath();
  ctx.arc(samplePoint[0], samplePoint[1], Math.max(4, width * 0.008), 0, TAU);
  ctx.fill();
  const camera = toWorldCanvas(scene.camera);
  ctx.fillStyle = "#eef5f8";
  ctx.beginPath();
  ctx.arc(camera[0], camera[1], Math.max(6, width * 0.01), 0, TAU);
  ctx.fill();
  const light = toWorldCanvas(scene.light);
  ctx.fillStyle = "#ffd07c";
  ctx.beginPath();
  ctx.arc(light[0], light[1], Math.max(7, width * 0.011), 0, TAU);
  ctx.fill();

  for (const object of scene.objects) {
    const center = toWorldCanvas(object.center);
    const edge = toWorldCanvas([object.center[0] + object.radius, object.center[1]]);
    const radius = Math.abs(edge[0] - center[0]);
    ctx.fillStyle = object.fill;
    ctx.beginPath();
    ctx.arc(center[0], center[1], radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = object.stroke;
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255, 244, 197, 0.95)";
  ctx.lineWidth = Math.max(2.2, width * 0.0042);
  ctx.beginPath();
  ctx.moveTo(camera[0], camera[1]);
  const primaryEnd = toWorldCanvas(scene.primaryEnd);
  ctx.lineTo(primaryEnd[0], primaryEnd[1]);
  ctx.stroke();

  if (scene.primaryHit) {
    const hit = toWorldCanvas(scene.primaryHit.point);
    ctx.fillStyle = "#fff5d8";
    ctx.beginPath();
    ctx.arc(hit[0], hit[1], Math.max(4.5, width * 0.0085), 0, TAU);
    ctx.fill();

    if (derived.values.cast_shadow && scene.shadowQuery) {
      const shadowEnd = scene.shadowQuery.blocked ? scene.shadowQuery.blocked.point : scene.shadowQuery.light;
      const shadowCanvas = toWorldCanvas(shadowEnd);
      ctx.setLineDash([10, 7]);
      ctx.strokeStyle = scene.shadowQuery.blocked ? "rgba(255, 154, 102, 0.96)" : "rgba(255, 223, 132, 0.96)";
      ctx.beginPath();
      ctx.moveTo(hit[0], hit[1]);
      ctx.lineTo(shadowCanvas[0], shadowCanvas[1]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (derived.values.cast_reflection && scene.reflectionQuery) {
      const reflectionEnd = toWorldCanvas(scene.reflectionQuery.end);
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = "rgba(138, 220, 255, 0.92)";
      ctx.beginPath();
      ctx.moveTo(hit[0], hit[1]);
      ctx.lineTo(reflectionEnd[0], reflectionEnd[1]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  ctx.fillStyle = "rgba(239, 245, 247, 0.88)";
  ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
  ctx.fillText(derived.winner, leftRect.x + 18, leftRect.y + leftRect.height - 14);
  ctx.fillText(derived.values.cast_shadow || derived.values.cast_reflection ? "optional secondary rays are visible" : "only the primary ray is shown", rightRect.x + 18, rightRect.y + rightRect.height - 14);
}

function setupCompareCodeLab() {
  setupStructuredCodeLab({
    prefix: "compare-code",
    schema: [
      { name: "sample", type: "number" },
      { name: "object_drift", type: "number" },
      { name: "cast_shadow", type: "bool" },
      { name: "cast_reflection", type: "bool" },
    ],
    defaults: {
      sample: 0.48,
      object_drift: 0.06,
      cast_shadow: true,
      cast_reflection: true,
    },
    readoutIds: {
      winner: "compare-code-readout-winner",
      hit: "compare-code-readout-hit",
      shadow: "compare-code-readout-shadow",
      reflection: "compare-code-readout-reflection",
    },
    evaluate: evaluateCompareCodeLabBindings,
    updateUi: updateCompareCodeLabUi,
    getStatusMessage(parsed, derived) {
      return `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}. Both methods agree that ${derived.winner} owns the current sample.`;
    },
    draw: drawCompareCodeLab,
  });
}

function evaluateColorCodeLabBindings(values) {
  const baseSamples = [0.08, 0.2, 0.46, 0.95, values.scene_peak * 0.5, values.scene_peak];
  const linearSamples = baseSamples.map((value) => value * values.exposure);
  const toneMappedSamples = linearSamples.map((value) => (values.tone_map ? value / (1 + value) : clamp(value, 0, 1)));
  const displaySamples = toneMappedSamples.map((value) => Math.pow(clamp(value, 0, 1), 1 / values.gamma));

  const steps = [
    `Start from linear scene values with a peak of ${formatNumber(values.scene_peak, 2)} and scale them by exposure ${formatNumber(values.exposure, 2)}.`,
    `That produces linear working values up to ${formatNumber(linearSamples[linearSamples.length - 1], 2)} before display preparation.`,
    values.tone_map
      ? "Tone mapping compresses the brightest values before the image hits the display."
      : "Tone mapping is off, so anything above 1.0 clips hard at the display boundary.",
    `Display encoding with gamma ${formatNumber(values.gamma, 2)} reshapes the final midtones and highlights for the monitor.`,
  ];

  const lowered = [
    "// CPU-side lesson bindings",
    `float exposure = ${formatNumber(values.exposure, 3)};`,
    `float scenePeak = ${formatNumber(values.scene_peak, 3)};`,
    `float gamma = ${formatNumber(values.gamma, 3)};`,
    `bool toneMap = ${values.tone_map ? "true" : "false"};`,
    "",
    "// Post-process pipeline",
    "vec3 color = linearColor * exposure;",
    values.tone_map ? "color = color / (1.0 + color);" : "color = clamp(color, 0.0, 1.0);",
    "color = pow(color, vec3(1.0 / gamma));",
  ].join("\n");

  return {
    values,
    linearSamples,
    toneMappedSamples,
    displaySamples,
    steps,
    lowered,
  };
}

function updateColorCodeLabUi(derived, readouts, stepList, loweredOutput) {
  if (readouts.linear) {
    readouts.linear.textContent = formatNumber(derived.linearSamples[derived.linearSamples.length - 1], 2);
  }
  if (readouts.mapped) {
    readouts.mapped.textContent = formatNumber(derived.toneMappedSamples[derived.toneMappedSamples.length - 1], 2);
  }
  if (readouts.display) {
    readouts.display.textContent = formatNumber(derived.displaySamples[derived.displaySamples.length - 1], 2);
  }
  if (readouts.mode) {
    readouts.mode.textContent = derived.values.tone_map ? "tone mapped" : "clamped only";
  }
  renderCodeSteps(stepList, derived.steps);
  if (loweredOutput) {
    loweredOutput.textContent = derived.lowered;
  }
}

function drawColorCodeLab(ctx, canvas, derived) {
  const width = canvas.width;
  const height = canvas.height;
  const margin = 18;
  const gap = 16;
  const stacked = width < 860;
  const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap * 2) / 3;
  const panelHeight = stacked ? (height - margin * 2 - gap * 2) / 3 : height - margin * 2;
  const rects = [
    { x: margin, y: margin, width: panelWidth, height: panelHeight },
    stacked
      ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
      : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
    stacked
      ? { x: margin, y: margin + (panelHeight + gap) * 2, width: panelWidth, height: panelHeight }
      : { x: margin + (panelWidth + gap) * 2, y: margin, width: panelWidth, height: panelHeight },
  ];

  function luminanceColor(value) {
    const v = clamp(value, 0, 1);
    return [0.18 + v * 0.78, 0.24 + v * 0.62, 0.42 + v * 0.34];
  }

  function drawPanel(rect, title, values, maxValue, footer, clampPreview) {
    drawLessonCanvasPanel(ctx, rect, title, width);
    const chartRect = {
      x: rect.x + 18,
      y: rect.y + 42,
      width: rect.width - 36,
      height: rect.height * 0.48,
    };
    const swatchRect = {
      x: rect.x + 18,
      y: chartRect.y + chartRect.height + 24,
      width: rect.width - 36,
      height: 28,
    };
    const barGap = 8;
    const barWidth = (chartRect.width - barGap * (values.length - 1)) / values.length;
    const displayMaxLine = chartRect.y + chartRect.height - (chartRect.height / maxValue);

    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.fillRect(chartRect.x, chartRect.y, chartRect.width, chartRect.height);
    ctx.strokeStyle = "rgba(255, 245, 216, 0.24)";
    ctx.beginPath();
    ctx.moveTo(chartRect.x, displayMaxLine);
    ctx.lineTo(chartRect.x + chartRect.width, displayMaxLine);
    ctx.stroke();

    values.forEach((value, index) => {
      const clampedValue = clamp(value, 0, maxValue);
      const barHeight = (clampedValue / maxValue) * chartRect.height;
      const x = chartRect.x + index * (barWidth + barGap);
      const y = chartRect.y + chartRect.height - barHeight;
      ctx.fillStyle = rgbToCss(luminanceColor(maxValue === 1 ? value : Math.min(value / maxValue, 1)));
      ctx.fillRect(x, y, barWidth, barHeight);
    });

    const swatchWidth = swatchRect.width / values.length;
    values.forEach((value, index) => {
      const previewValue = clampPreview ? clamp(value, 0, 1) : value;
      ctx.fillStyle = rgbToCss(luminanceColor(previewValue));
      ctx.fillRect(swatchRect.x + index * swatchWidth, swatchRect.y, swatchWidth - 2, swatchRect.height);
    });

    ctx.fillStyle = "rgba(239, 245, 247, 0.84)";
    ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
    ctx.fillText(footer, rect.x + 18, rect.y + rect.height - 14);
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawLessonCanvasBackground(ctx, width, height);
  drawPanel(rects[0], "Linear working values", derived.linearSamples, Math.max(4.5, derived.linearSamples[derived.linearSamples.length - 1]), "Light math can exceed the display range.", true);
  drawPanel(rects[1], "After tone mapping", derived.toneMappedSamples, 1, "Range is compressed for display.", false);
  drawPanel(rects[2], "After display encoding", derived.displaySamples, 1, "Gamma reshapes the final monitor response.", false);
}

function setupColorCodeLab() {
  setupStructuredCodeLab({
    prefix: "color-code",
    schema: [
      { name: "exposure", type: "number" },
      { name: "scene_peak", type: "number" },
      { name: "tone_map", type: "bool" },
      { name: "gamma", type: "number" },
    ],
    defaults: {
      exposure: 1.0,
      scene_peak: 3.8,
      tone_map: true,
      gamma: 2.2,
    },
    readoutIds: {
      linear: "color-code-readout-linear",
      mapped: "color-code-readout-mapped",
      display: "color-code-readout-display",
      mode: "color-code-readout-mode",
    },
    evaluate: evaluateColorCodeLabBindings,
    updateUi: updateColorCodeLabUi,
    getStatusMessage(parsed, derived) {
      return `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}. The linear peak is ${formatNumber(derived.linearSamples[derived.linearSamples.length - 1], 2)} before display preparation.`;
    },
    draw: drawColorCodeLab,
  });
}

function setupNormalProbeDemo() {
  const canvas = document.getElementById("normal-probe-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const readouts = {
    geometry: document.getElementById("normal-probe-geometry"),
    shader: document.getElementById("normal-probe-shader"),
    light: document.getElementById("normal-probe-light-readout"),
    dot: document.getElementById("normal-probe-dot"),
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;

      const surfaceAngle = degreesToRadians(Number(normalProbeControls.surface?.value || 0));
      const lightAngle = degreesToRadians(Number(normalProbeControls.light?.value || 0));
      const scaled = Boolean(normalProbeControls.scale?.checked);
      const fixed = Boolean(normalProbeControls.fix?.checked);
      const scaleX = scaled ? 1.85 : 1;
      const scaleY = scaled ? 0.52 : 1;
      const c = Math.cos(surfaceAngle);
      const s = Math.sin(surfaceAngle);

      function transformVector(vector) {
        return [
          vector[0] * c * scaleX - vector[1] * s * scaleY,
          vector[0] * s * scaleX + vector[1] * c * scaleY,
        ];
      }

      const localPatch = [
        [-0.92, -0.22],
        [0.92, -0.22],
        [0.92, 0.22],
        [-0.92, 0.22],
      ];
      const patch = localPatch.map(transformVector);
      const tangent = normalize2(transformVector([1, 0]));
      const naiveNormal = normalize2(transformVector([0, 1]));
      let geometricNormal = normalize2(perpendicular2(tangent));
      if (dot2(geometricNormal, naiveNormal) < 0) {
        geometricNormal = scale2(geometricNormal, -1);
      }
      const shaderNormal = fixed || !scaled ? geometricNormal : naiveNormal;
      const lightDirection = normalize2([Math.cos(lightAngle), Math.sin(lightAngle)]);
      const diffuse = clamp(dot2(shaderNormal, lightDirection), 0, 1);

      function toCanvas(point) {
        return [
          width * 0.5 + point[0] * width * 0.22,
          height * 0.52 - point[1] * height * 0.22,
        ];
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#183243");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let index = 0; index <= 8; index += 1) {
        const x = (width / 8) * index;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let index = 0; index <= 6; index += 1) {
        const y = (height / 6) * index;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.fillStyle = rgbToCss([
        0.18 + diffuse * 0.42,
        0.4 + diffuse * 0.34,
        0.62 + diffuse * 0.24,
      ]);
      ctx.beginPath();
      patch.forEach((point, index) => {
        const canvasPoint = toCanvas(point);
        if (index === 0) {
          ctx.moveTo(canvasPoint[0], canvasPoint[1]);
        } else {
          ctx.lineTo(canvasPoint[0], canvasPoint[1]);
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = Math.max(2, width * 0.004);
      ctx.stroke();

      const center = toCanvas([0, 0]);
      const geometryEnd = toCanvas(scale2(geometricNormal, 1.2));
      const shaderEnd = toCanvas(scale2(shaderNormal, 1.05));
      const lightEnd = toCanvas(scale2(lightDirection, 1.45));

      ctx.strokeStyle = "rgba(255, 243, 201, 0.95)";
      ctx.lineWidth = Math.max(2.1, width * 0.0044);
      ctx.beginPath();
      ctx.moveTo(center[0], center[1]);
      ctx.lineTo(lightEnd[0], lightEnd[1]);
      ctx.stroke();

      ctx.strokeStyle = "rgba(239, 245, 247, 0.92)";
      ctx.beginPath();
      ctx.moveTo(center[0], center[1]);
      ctx.lineTo(geometryEnd[0], geometryEnd[1]);
      ctx.stroke();

      ctx.strokeStyle = "rgba(110, 226, 201, 0.98)";
      ctx.beginPath();
      ctx.moveTo(center[0], center[1]);
      ctx.lineTo(shaderEnd[0], shaderEnd[1]);
      ctx.stroke();
      const chipFont = Math.max(10, width * 0.0135);
      drawCanvasChip(ctx, "L", lightEnd[0], lightEnd[1] - 14, {
        fontSize: chipFont,
        color: "rgba(255, 243, 201, 0.98)",
      });
      drawCanvasChip(ctx, "Ng", geometryEnd[0] + 14, geometryEnd[1] - 14, {
        fontSize: chipFont,
        color: "rgba(239, 245, 247, 0.98)",
      });
      drawCanvasChip(ctx, "Ns", shaderEnd[0] + 14, shaderEnd[1] + 14, {
        fontSize: chipFont,
        color: "rgba(110, 226, 201, 0.98)",
      });

      const meterX = 20;
      const meterY = height - 34;
      const meterW = width - 40;
      const meterH = 12;
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.fillRect(meterX, meterY, meterW, meterH);
      ctx.fillStyle = rgbToCss([0.22 + diffuse * 0.66, 0.74, 0.92 - diffuse * 0.2]);
      ctx.fillRect(meterX, meterY, meterW * diffuse, meterH);

      if (readouts.geometry) {
        readouts.geometry.textContent = formatVector(geometricNormal, 2);
      }
      if (readouts.shader) {
        readouts.shader.textContent = formatVector(shaderNormal, 2);
      }
      if (readouts.light) {
        readouts.light.textContent = formatVector(lightDirection, 2);
      }
      if (readouts.dot) {
        readouts.dot.textContent = `${formatNumber(diffuse, 3)} diffuse`;
      }
    },
  });
}

function setupShaderProbeDemo() {
  const canvas = document.getElementById("shader-probe-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const readouts = {
    attrA: document.getElementById("shader-probe-attr-a"),
    attrB: document.getElementById("shader-probe-attr-b"),
    attrC: document.getElementById("shader-probe-attr-c"),
    varying: document.getElementById("shader-probe-varying"),
    fragment: document.getElementById("shader-probe-fragment"),
    color: document.getElementById("shader-probe-color"),
    colorChip: document.getElementById("shader-probe-color-chip"),
  };

  const state = {
    pointer: null,
  };

  const attributes = [
    [0, 0],
    [1, 0],
    [0.15, 1],
  ];

  canvas.style.touchAction = "none";
  canvas.addEventListener("pointermove", (event) => {
    state.pointer = getCanvasPointer(event, canvas);
    markAllDemosDirty();
  });
  canvas.addEventListener("pointerleave", () => {
    state.pointer = null;
    markAllDemosDirty();
  });

  function interpolate(weights, values) {
    return values.reduce(
      (result, value, index) => add2(result, scale2(value, weights[index])),
      [0, 0]
    );
  }

  function fragmentColor(uv) {
    const stripe = shaderProbeControls.bands?.checked
      ? 0.55 + 0.45 * Math.sin(uv[0] * 10.5 + uv[1] * 8.2)
      : 1;
    return [
      clamp((0.16 + uv[0] * 0.72) * (0.88 + stripe * 0.12), 0, 1),
      clamp((0.24 + uv[1] * 0.66) * (0.8 + stripe * 0.2), 0, 1),
      clamp((0.82 - uv[0] * 0.28 - uv[1] * 0.12) * (0.78 + stripe * 0.22), 0, 1),
    ];
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const warp = Number(shaderProbeControls.warp?.value || 0) / 100;
      const padding = Math.max(22, width * 0.06);
      const vertices = [
        [padding + (width - padding * 2) * 0.16, padding + (height - padding * 2) * (0.76 - warp * 0.08)],
        [padding + (width - padding * 2) * (0.88 - warp * 0.06), padding + (height - padding * 2) * (0.66 + warp * 0.08)],
        [padding + (width - padding * 2) * (0.34 + warp * 0.24), padding + (height - padding * 2) * (0.14 + warp * 0.11)],
      ];
      const centroid = [
        (vertices[0][0] + vertices[1][0] + vertices[2][0]) / 3,
        (vertices[0][1] + vertices[1][1] + vertices[2][1]) / 3,
      ];

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#0f2334");
      background.addColorStop(1, "#183445");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let index = 0; index <= 8; index += 1) {
        const x = (width / 8) * index;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let index = 0; index <= 6; index += 1) {
        const y = (height / 6) * index;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const cell = Math.max(4, Math.floor(Math.min(width, height) / 62));
      for (let y = 0; y < height; y += cell) {
        for (let x = 0; x < width; x += cell) {
          const sample = [x + cell * 0.5, y + cell * 0.5];
          const weights = barycentricCoordinates(sample, vertices[0], vertices[1], vertices[2]);
          if (!weights || weights.some((value) => value < -0.002)) {
            continue;
          }

          const uv = interpolate(weights, attributes);
          ctx.fillStyle = rgbToCss(fragmentColor(uv));
          ctx.fillRect(x, y, cell + 1, cell + 1);
        }
      }

      ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
      ctx.lineWidth = Math.max(2, width * 0.004);
      ctx.beginPath();
      ctx.moveTo(vertices[0][0], vertices[0][1]);
      ctx.lineTo(vertices[1][0], vertices[1][1]);
      ctx.lineTo(vertices[2][0], vertices[2][1]);
      ctx.closePath();
      ctx.stroke();

      const labels = ["A", "B", "C"];
      const labelOffsets = [
        [12, -12],
        [12, -12],
        [12, 18],
      ];
      vertices.forEach((vertex, index) => {
        ctx.fillStyle = index === 0 ? "#ef9a52" : index === 1 ? "#73ddd5" : "#f4cf74";
        ctx.beginPath();
        ctx.arc(vertex[0], vertex[1], Math.max(6, width * 0.012), 0, TAU);
        ctx.fill();
        ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
        ctx.font = `${Math.max(12, width * 0.022)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(
          `${labels[index]} ${formatVector(attributes[index], 2)}`,
          vertex[0] + labelOffsets[index][0],
          vertex[1] + labelOffsets[index][1]
        );
      });

      const samplePoint = state.pointer || centroid;
      const weights = barycentricCoordinates(samplePoint, vertices[0], vertices[1], vertices[2]);
      const inside = Boolean(weights) && weights.every((value) => value >= -0.002);

      if (inside && weights) {
        const uv = interpolate(weights, attributes);
        const color = fragmentColor(uv);
        const fragmentText = `pixel = ${formatVector(samplePoint, 0)}, bary = ${formatVector(weights, 2)}`;

        ctx.strokeStyle = "rgba(255, 255, 255, 0.88)";
        ctx.lineWidth = Math.max(1.4, width * 0.003);
        ctx.beginPath();
        ctx.moveTo(samplePoint[0] - 10, samplePoint[1]);
        ctx.lineTo(samplePoint[0] + 10, samplePoint[1]);
        ctx.moveTo(samplePoint[0], samplePoint[1] - 10);
        ctx.lineTo(samplePoint[0], samplePoint[1] + 10);
        ctx.stroke();

        if (readouts.varying) {
          readouts.varying.textContent = `uv = ${formatVector(uv, 3)}`;
        }
        if (readouts.fragment) {
          readouts.fragment.textContent = fragmentText;
        }
        if (readouts.color) {
          readouts.color.textContent = `rgb = ${formatVector(color, 3)}`;
        }
        if (readouts.colorChip) {
          readouts.colorChip.style.background = rgbToCss(color);
        }
      } else {
        if (readouts.varying) {
          readouts.varying.textContent = "Move inside the triangle";
        }
        if (readouts.fragment) {
          readouts.fragment.textContent = "No covered fragment";
        }
        if (readouts.color) {
          readouts.color.textContent = "rgb = (0.00, 0.00, 0.00)";
        }
        if (readouts.colorChip) {
          readouts.colorChip.style.background = "rgba(19, 37, 53, 0.16)";
        }
      }

      if (readouts.attrA) {
        readouts.attrA.textContent = `uv = ${formatVector(attributes[0], 2)}`;
      }
      if (readouts.attrB) {
        readouts.attrB.textContent = `uv = ${formatVector(attributes[1], 2)}`;
      }
      if (readouts.attrC) {
        readouts.attrC.textContent = `uv = ${formatVector(attributes[2], 2)}`;
      }
    },
  });
}

function setupMipmapStoryDemo() {
  const canvas = document.getElementById("mipmap-story-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const baseColors = [
    [0.18, 0.76, 0.9],
    [0.97, 0.71, 0.29],
  ];

  function drawChecker(x, y, size, cells, alpha = 1) {
    const cellSize = size / cells;
    for (let row = 0; row < cells; row += 1) {
      for (let column = 0; column < cells; column += 1) {
        const color = baseColors[(row + column) % 2];
        ctx.fillStyle = `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)}, ${alpha})`;
        ctx.fillRect(x + column * cellSize, y + row * cellSize, cellSize, cellSize);
      }
    }
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 0.64 : time * 0.82;
      const footprint = lerp(1.3, 9.2, (Math.sin(phase) + 1) * 0.5);
      const selectedMip = clamp(Math.floor(Math.log2(Math.max(footprint, 1))), 0, 3);
      const margin = 18;
      const gap = 16;
      const stacked = width < 980;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap * 2) / 3;
      const panelHeight = stacked ? (height - margin * 2 - gap * 2) / 3 : height - margin * 2;
      const panels = stacked
        ? [
            { x: margin, y: margin, width: panelWidth, height: panelHeight },
            { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight },
            { x: margin, y: margin + (panelHeight + gap) * 2, width: panelWidth, height: panelHeight },
          ]
        : [
            { x: margin, y: margin, width: panelWidth, height: panelHeight },
            { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
            { x: margin + (panelWidth + gap) * 2, y: margin, width: panelWidth, height: panelHeight },
          ];

      function drawFootprint(rect) {
        drawLessonCanvasPanel(ctx, rect, "1. One pixel's footprint", width);
        const textureSize = Math.min(rect.width * 0.52, rect.height * 0.62);
        const textureX = rect.x + 14;
        const textureY = rect.y + 48;
        const grid = 8;
        const cell = textureSize / grid;
        const center = [
          textureX + textureSize * (0.42 + Math.sin(phase * 0.7) * 0.14),
          textureY + textureSize * (0.44 + Math.cos(phase * 0.5) * 0.12),
        ];
        const footprintSize = cell * footprint;

        drawChecker(textureX, textureY, textureSize, grid, 1);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.strokeRect(textureX, textureY, textureSize, textureSize);

        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fillRect(rect.x + rect.width * 0.72, rect.y + rect.height * 0.2, rect.width * 0.14, rect.width * 0.14);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.strokeRect(rect.x + rect.width * 0.72, rect.y + rect.height * 0.2, rect.width * 0.14, rect.width * 0.14);
        ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
        ctx.font = `${Math.max(10, width * 0.0108)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText("1 screen pixel", rect.x + rect.width * 0.68, rect.y + rect.height * 0.18);

        ctx.strokeStyle = "rgba(247, 244, 234, 0.9)";
        ctx.lineWidth = 2;
        ctx.strokeRect(center[0] - footprintSize * 0.5, center[1] - footprintSize * 0.5, footprintSize, footprintSize);
        drawArrow2d(
          ctx,
          [rect.x + rect.width * 0.72, rect.y + rect.height * 0.28],
          [center[0] + footprintSize * 0.4, center[1] - footprintSize * 0.4],
          "rgba(247, 244, 234, 0.7)",
          2
        );

        ctx.fillStyle = "rgba(239, 245, 247, 0.8)";
        drawTextLines(
          ctx,
          [`footprint ~ ${formatNumber(footprint, 1)} texels wide`, "Large footprints need more than nearest/linear on the base level."],
          rect.x + 14,
          rect.y + rect.height - 34,
          16
        );
      }

      function drawMipChain(rect) {
        drawLessonCanvasPanel(ctx, rect, "2. Mip level selection", width);
        const levels = [8, 4, 2, 1];
        const startX = rect.x + 18;
        let y = rect.y + 50;
        levels.forEach((cells, index) => {
          const size = rect.width * (0.46 - index * 0.06);
          const x = startX + index * 10;
          const isSelected = index === selectedMip;
          drawChecker(x, y, size, cells, index === 0 ? 1 : 0.92 - index * 0.12);
          ctx.strokeStyle = isSelected ? "rgba(247, 244, 234, 0.96)" : "rgba(255, 255, 255, 0.16)";
          ctx.lineWidth = isSelected ? 2.4 : 1;
          ctx.strokeRect(x, y, size, size);
          ctx.fillStyle = "rgba(239, 245, 247, 0.88)";
          ctx.font = `${Math.max(9, width * 0.0102)}px "Avenir Next", "Segoe UI", sans-serif`;
          ctx.fillText(`level ${index}`, x + size + 12, y + 14);
          ctx.fillText(`${cells} x ${cells}`, x + size + 12, y + 30);
          if (isSelected) {
            ctx.fillStyle = "rgba(247, 244, 234, 0.92)";
            ctx.fillText("selected", x + size + 12, y + 46);
          }
          y += size * 0.62;
        });
      }

      function drawResults(rect) {
        drawLessonCanvasPanel(ctx, rect, "3. Stable result", width);
        const bandWidth = rect.width - 28;
        const bandHeight = rect.height * 0.18;
        const bandX = rect.x + 14;
        const topY = rect.y + 62;
        const bottomY = topY + bandHeight + 34;
        const samples = 26;
        const mixed = [
          (baseColors[0][0] + baseColors[1][0]) * 0.5,
          (baseColors[0][1] + baseColors[1][1]) * 0.5,
          (baseColors[0][2] + baseColors[1][2]) * 0.5,
        ];

        ctx.fillStyle = "rgba(239, 245, 247, 0.86)";
        ctx.font = `${Math.max(10, width * 0.0108)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText("base texture only", bandX, topY - 12);
        ctx.fillText("with mipmaps", bandX, bottomY - 12);

        for (let index = 0; index < samples; index += 1) {
          const x = bandX + (bandWidth / samples) * index;
          const shimmer = Math.sin(index * footprint * 0.95 + phase * 8.4);
          const aliased = baseColors[shimmer > 0 ? 0 : 1];
          ctx.fillStyle = rgbToCss(aliased);
          ctx.fillRect(x, topY, bandWidth / samples + 1, bandHeight);

          const stableBlend = clamp(0.5 + Math.sin(index * 0.35 + phase * 0.4) * 0.12, 0, 1);
          const filtered = [
            lerp(mixed[0], baseColors[0][0], stableBlend * 0.12),
            lerp(mixed[1], baseColors[0][1], stableBlend * 0.12),
            lerp(mixed[2], baseColors[0][2], stableBlend * 0.12),
          ];
          ctx.fillStyle = rgbToCss(filtered);
          ctx.fillRect(x, bottomY, bandWidth / samples + 1, bandHeight);
        }

        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.strokeRect(bandX, topY, bandWidth, bandHeight);
        ctx.strokeRect(bandX, bottomY, bandWidth, bandHeight);

        ctx.fillStyle = "rgba(239, 245, 247, 0.8)";
        drawTextLines(
          ctx,
          [`footprint ${formatNumber(footprint, 1)} texels -> choose mip ${selectedMip}`, "Mipmaps trade unstable high frequency for a prefiltered summary."],
          bandX,
          rect.y + rect.height - 34,
          16
        );
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawFootprint(panels[0]);
      drawMipChain(panels[1]);
      drawResults(panels[2]);
    },
  });
}

function setupShadowDemo() {
  const canvas = document.getElementById("shadow-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const bias = (Number(shadowControls.bias?.value || 0) / 100) * 0.12;
      const resolution = Math.max(8, Math.round(Number(shadowControls.resolution?.value || 24)));
      const softFilter = Boolean(shadowControls.filter?.checked);

      const world = {
        x0: -2.45,
        x1: 2.45,
        y0: -0.5,
        y1: 2.15,
      };
      const floor = {
        x0: -2.25,
        x1: 2.25,
        y: 0,
        thickness: 0.28,
      };
      const blocker = {
        x0: -0.44,
        x1: 0.24,
        y0: 0,
        y1: 0.92,
      };
      const lightPosition = [-1.98, 1.84];
      const lightDirection = normalize2([1.0, -0.68]);
      const tangent = perpendicular2(lightDirection);

      const corners = [
        [world.x0, world.y0],
        [world.x0, world.y1],
        [world.x1, world.y0],
        [world.x1, world.y1],
      ];
      let tMin = Infinity;
      let tMax = -Infinity;
      for (const corner of corners) {
        const tValue = dot2(corner, tangent);
        tMin = Math.min(tMin, tValue);
        tMax = Math.max(tMax, tValue);
      }
      tMin -= 0.12;
      tMax += 0.12;

      const shadowMap = new Float32Array(resolution);
      shadowMap.fill(Infinity);

      function toCanvas(point) {
        const x = ((point[0] - world.x0) / (world.x1 - world.x0)) * width;
        const y = height - ((point[1] - world.y0) / (world.y1 - world.y0)) * height;
        return [x, y];
      }

      function rectToCanvas(x0, y0, x1, y1) {
        const topLeft = toCanvas([x0, y1]);
        const bottomRight = toCanvas([x1, y0]);
        return {
          x: topLeft[0],
          y: topLeft[1],
          w: bottomRight[0] - topLeft[0],
          h: bottomRight[1] - topLeft[1],
        };
      }

      function writeShadowSample(point) {
        const ratio = (dot2(point, tangent) - tMin) / (tMax - tMin);
        const index = clamp(Math.floor(ratio * resolution), 0, resolution - 1);
        const depth = dot2(point, lightDirection);
        if (depth < shadowMap[index]) {
          shadowMap[index] = depth;
        }
      }

      for (let index = 0; index <= 520; index += 1) {
        const x = lerp(floor.x0, floor.x1, index / 520);
        writeShadowSample([x, floor.y]);
      }
      for (let index = 0; index <= 140; index += 1) {
        const x = lerp(blocker.x0, blocker.x1, index / 140);
        writeShadowSample([x, blocker.y1]);
      }
      for (let index = 0; index <= 160; index += 1) {
        const y = lerp(blocker.y0, blocker.y1, index / 160);
        writeShadowSample([blocker.x0, y]);
      }

      function readShadowDepth(point) {
        const rawIndex = ((dot2(point, tangent) - tMin) / (tMax - tMin)) * resolution - 0.5;
        const center = Math.floor(rawIndex);
        if (!softFilter) {
          return shadowMap[clamp(center, 0, resolution - 1)];
        }

        let weightedDepth = 0;
        let totalWeight = 0;
        for (let offset = -2; offset <= 2; offset += 1) {
          const index = clamp(center + offset, 0, resolution - 1);
          const sample = shadowMap[index];
          if (!Number.isFinite(sample)) {
            continue;
          }

          const weight = offset === 0 ? 0.38 : Math.abs(offset) === 1 ? 0.23 : 0.08;
          weightedDepth += sample * weight;
          totalWeight += weight;
        }

        return totalWeight > 0 ? weightedDepth / totalWeight : Infinity;
      }

      function precisionError(point, kind) {
        const wave =
          (0.5 + 0.5 * Math.sin(point[0] * 18.2 + point[1] * 24.6)) *
          (0.55 + 0.45 * Math.cos(point[0] * 7.4 - point[1] * 12.1));
        if (kind === "floor") {
          return wave * 0.028;
        }
        if (kind === "top") {
          return wave * 0.018;
        }
        return wave * 0.012;
      }

      function isShadowed(point, kind) {
        const storedDepth = readShadowDepth(point);
        if (!Number.isFinite(storedDepth)) {
          return false;
        }

        const currentDepth = dot2(point, lightDirection) + precisionError(point, kind);
        return currentDepth - bias > storedDepth;
      }

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102232");
      background.addColorStop(1, "#183447");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let index = 0; index <= 8; index += 1) {
        const x = (width / 8) * index;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let index = 0; index <= 6; index += 1) {
        const y = (height / 6) * index;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(255, 219, 142, 0.22)";
      ctx.lineWidth = Math.max(1.5, width * 0.0028);
      for (let index = 0; index < 5; index += 1) {
        const target = [lerp(-1.7, 1.8, index / 4), 0.04 + (index % 2) * 0.12];
        const start = toCanvas(lightPosition);
        const end = toCanvas(target);
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
      }

      const lightCanvas = toCanvas(lightPosition);
      ctx.fillStyle = "#ffd07f";
      ctx.beginPath();
      ctx.arc(lightCanvas[0], lightCanvas[1], Math.max(7, width * 0.012), 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 232, 195, 0.9)";
      ctx.font = `${Math.max(14, width * 0.018)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillText("Directional light", lightCanvas[0] + 14, lightCanvas[1] - 12);

      const floorBody = rectToCanvas(floor.x0, floor.y - floor.thickness, floor.x1, floor.y);
      ctx.fillStyle = "#5a4332";
      ctx.fillRect(floorBody.x, floorBody.y, floorBody.w, floorBody.h);

      const floorBandHeight = 0.11;
      for (let index = 0; index < 220; index += 1) {
        const x0 = lerp(floor.x0, floor.x1, index / 220);
        const x1 = lerp(floor.x0, floor.x1, (index + 1) / 220);
        const center = [(x0 + x1) * 0.5, floor.y];
        const shadowed = isShadowed(center, "floor");
        ctx.fillStyle = shadowed ? "#8a6a48" : "#d4b183";
        const band = rectToCanvas(x0, floor.y, x1, floor.y + floorBandHeight);
        ctx.fillRect(band.x, band.y, band.w + 1, band.h + 1);
      }

      const blockerRect = rectToCanvas(blocker.x0, blocker.y0, blocker.x1, blocker.y1);
      ctx.fillStyle = "#1d6883";
      ctx.fillRect(blockerRect.x, blockerRect.y, blockerRect.w, blockerRect.h);

      const blockerTopHeight = 0.11;
      for (let index = 0; index < 90; index += 1) {
        const x0 = lerp(blocker.x0, blocker.x1, index / 90);
        const x1 = lerp(blocker.x0, blocker.x1, (index + 1) / 90);
        const center = [(x0 + x1) * 0.5, blocker.y1];
        const shadowed = isShadowed(center, "top");
        ctx.fillStyle = shadowed ? "#2a8299" : "#56bdd0";
        const band = rectToCanvas(x0, blocker.y1 - blockerTopHeight, x1, blocker.y1);
        ctx.fillRect(band.x, band.y, band.w + 1, band.h + 1);
      }

      const blockerEdge = rectToCanvas(blocker.x0, blocker.y0, blocker.x0 + 0.09, blocker.y1);
      ctx.fillStyle = "rgba(10, 23, 32, 0.16)";
      ctx.fillRect(blockerEdge.x, blockerEdge.y, blockerEdge.w, blockerEdge.h);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = Math.max(1.5, width * 0.0026);
      ctx.strokeRect(blockerRect.x, blockerRect.y, blockerRect.w, blockerRect.h);

      const insetWidth = Math.min(width * 0.24, 220);
      const insetHeight = Math.min(height * 0.18, 110);
      const insetX = width - insetWidth - 18;
      const insetY = 18;
      ctx.fillStyle = "rgba(8, 17, 24, 0.7)";
      ctx.fillRect(insetX, insetY, insetWidth, insetHeight);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.strokeRect(insetX, insetY, insetWidth, insetHeight);
      ctx.fillStyle = "rgba(236, 243, 247, 0.92)";
      ctx.font = `${Math.max(12, width * 0.014)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillText("Light depth bins", insetX + 10, insetY + 18);

      let minDepth = Infinity;
      let maxDepth = -Infinity;
      for (const depth of shadowMap) {
        if (!Number.isFinite(depth)) {
          continue;
        }
        minDepth = Math.min(minDepth, depth);
        maxDepth = Math.max(maxDepth, depth);
      }
      const depthSpan = Math.max(maxDepth - minDepth, 0.001);
      const graphX = insetX + 10;
      const graphY = insetY + 28;
      const graphW = insetWidth - 20;
      const graphH = insetHeight - 40;
      for (let index = 0; index < resolution; index += 1) {
        const depth = shadowMap[index];
        const barX = graphX + (graphW / resolution) * index;
        const barW = Math.max(1, graphW / resolution - 1);
        const normalized = Number.isFinite(depth) ? (depth - minDepth) / depthSpan : 1;
        const barH = graphH * (1 - normalized * 0.84);
        ctx.fillStyle = softFilter ? "#89d9ea" : "#f0a36b";
        ctx.fillRect(barX, graphY + (graphH - barH), barW, barH);
      }
      ctx.fillStyle = "rgba(216, 227, 235, 0.74)";
      ctx.fillText(`bias ${bias.toFixed(3)}`, graphX, insetY + insetHeight - 8);
      ctx.fillText(`${resolution} bins`, insetX + insetWidth - 64, insetY + insetHeight - 8);

      ctx.fillStyle = "rgba(239, 244, 247, 0.92)";
      ctx.font = `${Math.max(15, width * 0.018)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillText("Low bias: acne   High bias: detached shadow   Low resolution: chunky edge", 18, height - 18);
    },
  });
}

function setupLightSpaceStoryDemo() {
  const canvas = document.getElementById("light-space-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 0.48 : time * 0.62;
      const margin = 18;
      const gap = 16;
      const stacked = width < 980;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap * 2) / 3;
      const panelHeight = stacked ? (height - margin * 2 - gap * 2) / 3 : height - margin * 2;
      const panels = stacked
        ? [
            { x: margin, y: margin, width: panelWidth, height: panelHeight },
            { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight },
            { x: margin, y: margin + (panelHeight + gap) * 2, width: panelWidth, height: panelHeight },
          ]
        : [
            { x: margin, y: margin, width: panelWidth, height: panelHeight },
            { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
            { x: margin + (panelWidth + gap) * 2, y: margin, width: panelWidth, height: panelHeight },
          ];

      const light = [-1.85, 1.86];
      const target = [0.25, 0.24];
      const blocker = {
        x0: -0.38,
        x1: 0.34,
        y0: 0,
        y1: 1.0,
      };
      const floor = {
        x0: -2.2,
        x1: 2.3,
        y: 0,
      };
      const sampleX = lerp(-1.3, 1.35, (Math.sin(phase) + 1) * 0.5);
      const samplePoint = [sampleX, 0];
      const forward = normalize2(subtract2(target, light));
      const right = [forward[1], -forward[0]];
      const worldPoints = [
        [floor.x0, floor.y],
        [floor.x1, floor.y],
        [blocker.x0, blocker.y0],
        [blocker.x1, blocker.y0],
        [blocker.x0, blocker.y1],
        [blocker.x1, blocker.y1],
        samplePoint,
      ];
      const toLightSpace = (point) => {
        const rel = subtract2(point, light);
        return [dot2(rel, right), dot2(rel, forward)];
      };
      const blockerTopLeft = [blocker.x0, blocker.y1];
      const blockerTopRight = [blocker.x1, blocker.y1];
      const blockerLight = [
        toLightSpace([blocker.x0, blocker.y0]),
        toLightSpace([blocker.x1, blocker.y0]),
        toLightSpace([blocker.x0, blocker.y1]),
        toLightSpace([blocker.x1, blocker.y1]),
      ];
      const sampleLight = toLightSpace(samplePoint);
      const uMin = Math.min(...worldPoints.map((point) => toLightSpace(point)[0])) - 0.25;
      const uMax = Math.max(...worldPoints.map((point) => toLightSpace(point)[0])) + 0.25;
      const depthMin = 0.2;
      const depthMax = Math.max(...worldPoints.map((point) => toLightSpace(point)[1])) + 0.4;
      const blockerU0 = Math.min(...blockerLight.map((point) => point[0]));
      const blockerU1 = Math.max(...blockerLight.map((point) => point[0]));
      const blockerDepth = Math.min(...blockerLight.map((point) => point[1]));
      const storedDepth = sampleLight[0] >= blockerU0 && sampleLight[0] <= blockerU1 ? blockerDepth : sampleLight[1] - 0.12;
      const shadowed = sampleLight[0] >= blockerU0 && sampleLight[0] <= blockerU1 && sampleLight[1] > blockerDepth + 0.04;
      const uv = clamp((sampleLight[0] - uMin) / (uMax - uMin), 0, 1);
      const fragmentDepth01 = clamp((sampleLight[1] - depthMin) / (depthMax - depthMin), 0, 1);
      const storedDepth01 = clamp((storedDepth - depthMin) / (depthMax - depthMin), 0, 1);

      function worldToPanel(rect, point) {
        const x = rect.x + 18 + ((point[0] - floor.x0) / (floor.x1 - floor.x0)) * (rect.width - 36);
        const y = rect.y + rect.height - 26 - ((point[1] + 0.1) / 2.35) * (rect.height - 50);
        return [x, y];
      }

      function lightToPanel(rect, point) {
        const x = rect.x + 18 + ((point[0] - uMin) / (uMax - uMin)) * (rect.width - 36);
        const y = rect.y + 28 + ((point[1] - depthMin) / (depthMax - depthMin)) * (rect.height - 54);
        return [x, y];
      }

      const shadowLeft = (() => {
        const t = (floor.y - light[1]) / (blockerTopLeft[1] - light[1]);
        return light[0] + (blockerTopLeft[0] - light[0]) * t;
      })();
      const shadowRight = (() => {
        const t = (floor.y - light[1]) / (blockerTopRight[1] - light[1]);
        return light[0] + (blockerTopRight[0] - light[0]) * t;
      })();

      function drawWorld(rect) {
        drawLessonCanvasPanel(ctx, rect, "1. World position", width);
        const floorLeft = worldToPanel(rect, [floor.x0, floor.y]);
        const floorRight = worldToPanel(rect, [floor.x1, floor.y]);
        const blockerBottomLeft = worldToPanel(rect, [blocker.x0, blocker.y0]);
        const blockerTopLeftPanel = worldToPanel(rect, [blocker.x0, blocker.y1]);
        const blockerBottomRight = worldToPanel(rect, [blocker.x1, blocker.y0]);
        const blockerTopRightPanel = worldToPanel(rect, [blocker.x1, blocker.y1]);
        const lightPanel = worldToPanel(rect, light);
        const samplePanel = worldToPanel(rect, samplePoint);
        const shadowStart = worldToPanel(rect, [shadowLeft, floor.y]);
        const shadowEnd = worldToPanel(rect, [shadowRight, floor.y]);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(floorLeft[0], floorLeft[1]);
        ctx.lineTo(floorRight[0], floorRight[1]);
        ctx.stroke();

        ctx.fillStyle = "rgba(8, 21, 30, 0.42)";
        ctx.fillRect(shadowStart[0], shadowStart[1] - 12, shadowEnd[0] - shadowStart[0], 12);

        ctx.fillStyle = "rgba(247, 160, 74, 0.86)";
        ctx.fillRect(blockerBottomLeft[0], blockerTopLeftPanel[1], blockerBottomRight[0] - blockerBottomLeft[0], blockerBottomLeft[1] - blockerTopLeftPanel[1]);

        ctx.fillStyle = "rgba(255, 244, 230, 0.95)";
        ctx.beginPath();
        ctx.arc(lightPanel[0], lightPanel[1], 8, 0, TAU);
        ctx.fill();

        ctx.strokeStyle = shadowed ? "rgba(247, 160, 74, 0.5)" : "rgba(115, 221, 213, 0.62)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(lightPanel[0], lightPanel[1]);
        ctx.lineTo(samplePanel[0], samplePanel[1]);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
        ctx.beginPath();
        ctx.moveTo(lightPanel[0], lightPanel[1]);
        ctx.lineTo(blockerTopLeftPanel[0], blockerTopLeftPanel[1]);
        ctx.moveTo(lightPanel[0], lightPanel[1]);
        ctx.lineTo(blockerTopRightPanel[0], blockerTopRightPanel[1]);
        ctx.stroke();

        ctx.fillStyle = shadowed ? "#f7a04a" : "#73ddd5";
        ctx.beginPath();
        ctx.arc(samplePanel[0], samplePanel[1], 7, 0, TAU);
        ctx.fill();

        ctx.fillStyle = "rgba(239, 245, 247, 0.84)";
        ctx.font = `${Math.max(10, width * 0.0108)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText("light", lightPanel[0] + 12, lightPanel[1] - 10);
        ctx.fillText("fragment P", samplePanel[0] + 10, samplePanel[1] - 8);
      }

      function drawLightView(rect) {
        drawLessonCanvasPanel(ctx, rect, "2. Light camera", width);
        const axisOrigin = lightToPanel(rect, [uMin, depthMin]);
        const axisRight = lightToPanel(rect, [uMax, depthMin]);
        const axisDepth = lightToPanel(rect, [uMin, depthMax]);
        const samplePanel = lightToPanel(rect, sampleLight);
        const blockerPoly = blockerLight.map((point) => lightToPanel(rect, point));

        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(axisOrigin[0], axisOrigin[1]);
        ctx.lineTo(axisRight[0], axisRight[1]);
        ctx.moveTo(axisOrigin[0], axisOrigin[1]);
        ctx.lineTo(axisDepth[0], axisDepth[1]);
        ctx.stroke();

        ctx.fillStyle = "rgba(239, 245, 247, 0.82)";
        ctx.font = `${Math.max(10, width * 0.0108)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText("u", axisRight[0] - 10, axisRight[1] - 8);
        ctx.fillText("depth", axisDepth[0] + 8, axisDepth[1] - 6);

        ctx.fillStyle = "rgba(247, 160, 74, 0.18)";
        ctx.strokeStyle = "rgba(247, 160, 74, 0.76)";
        ctx.beginPath();
        ctx.moveTo(blockerPoly[0][0], blockerPoly[0][1]);
        for (let index = 1; index < blockerPoly.length; index += 1) {
          ctx.lineTo(blockerPoly[index][0], blockerPoly[index][1]);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(samplePanel[0], axisOrigin[1]);
        ctx.lineTo(samplePanel[0], samplePanel[1]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = shadowed ? "#f7a04a" : "#73ddd5";
        ctx.beginPath();
        ctx.arc(samplePanel[0], samplePanel[1], 7, 0, TAU);
        ctx.fill();

        ctx.fillStyle = "rgba(239, 245, 247, 0.82)";
        ctx.font = `${Math.max(9, width * 0.0102)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
        drawTextLines(
          ctx,
          [`u = ${formatNumber(sampleLight[0], 2)}`, `depth = ${formatNumber(sampleLight[1], 2)}`],
          rect.x + 18,
          rect.y + rect.height - 36,
          16
        );
      }

      function drawShadowMap(rect) {
        drawLessonCanvasPanel(ctx, rect, "3. Shadow map lookup", width);
        const grid = 8;
        const mapSize = Math.min(rect.width * 0.46, rect.height * 0.54);
        const mapX = rect.x + 18;
        const mapY = rect.y + 48;
        const cell = mapSize / grid;
        const column = clamp(Math.floor(uv * grid), 0, grid - 1);
        const storedRow = clamp(grid - 1 - Math.floor(storedDepth01 * grid), 0, grid - 1);
        const fragmentRow = clamp(grid - 1 - Math.floor(fragmentDepth01 * grid), 0, grid - 1);

        for (let row = 0; row < grid; row += 1) {
          for (let columnIndex = 0; columnIndex < grid; columnIndex += 1) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
            ctx.fillRect(mapX + columnIndex * cell, mapY + row * cell, cell - 1, cell - 1);
          }
        }

        ctx.fillStyle = "rgba(247, 160, 74, 0.42)";
        ctx.fillRect(mapX + column * cell, mapY + storedRow * cell, cell - 1, cell - 1);
        ctx.strokeStyle = "rgba(115, 221, 213, 0.9)";
        ctx.lineWidth = 2;
        ctx.strokeRect(mapX + column * cell + 2, mapY + fragmentRow * cell + 2, cell - 5, cell - 5);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.strokeRect(mapX, mapY, mapSize, mapSize);
        ctx.fillStyle = "rgba(239, 245, 247, 0.86)";
        ctx.font = `${Math.max(10, width * 0.0108)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText("shadow-map texels", mapX, mapY - 12);

        const infoX = rect.x + rect.width * 0.58;
        const statusColor = shadowed ? "#f7a04a" : "#73ddd5";
        ctx.fillStyle = "rgba(239, 245, 247, 0.84)";
        ctx.font = `${Math.max(10, width * 0.0105)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
        drawTextLines(
          ctx,
          [
            `uv.x = ${formatNumber(uv, 2)}`,
            `stored = ${formatNumber(storedDepth01, 2)}`,
            `frag = ${formatNumber(fragmentDepth01, 2)}`,
          ],
          infoX,
          rect.y + 84,
          18
        );
        ctx.fillStyle = statusColor;
        ctx.font = `${Math.max(11, width * 0.0112)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(shadowed ? "fragment is deeper -> in shadow" : "fragment matches the visible depth -> lit", infoX, rect.y + rect.height - 44);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawWorld(panels[0]);
      drawLightView(panels[1]);
      drawShadowMap(panels[2]);

      if (!stacked) {
        drawArrow2d(
          ctx,
          [panels[0].x + panels[0].width + 4, panels[0].y + panels[0].height * 0.5],
          [panels[1].x - 4, panels[1].y + panels[1].height * 0.5],
          "rgba(247, 244, 234, 0.5)",
          2
        );
        drawArrow2d(
          ctx,
          [panels[1].x + panels[1].width + 4, panels[1].y + panels[1].height * 0.5],
          [panels[2].x - 4, panels[2].y + panels[2].height * 0.5],
          "rgba(247, 244, 234, 0.5)",
          2
        );
      }
    },
  });
}

function setupRasterComparisonDemo() {
  const canvas = document.getElementById("raster-compare-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const scene = buildCompareScene();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      function toCanvasImage(point) {
        const x = ((point[0] + 1) * 0.5) * width;
        const y = height - (((point[1] + 0.72) / 1.44) * height);
        return [x, y];
      }

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#112537");
      background.addColorStop(1, "#1a3a4c");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      for (let index = 0; index <= 10; index += 1) {
        const x = (width / 10) * index;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let index = 0; index <= 6; index += 1) {
        const y = (height / 6) * index;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(238, 243, 247, 0.9)";
      ctx.font = `${Math.max(12, width * 0.028)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillText("Projected coverage on the image plane", 16, 22);

      for (const object of scene.projectedObjects) {
        const center = toCanvasImage([object.screenX, 0]);
        const radius = Math.max(12, object.screenRadius * width * 0.45);
        const gradient = ctx.createRadialGradient(
          center[0] - radius * 0.18,
          center[1] - radius * 0.18,
          radius * 0.16,
          center[0],
          center[1],
          radius
        );
        gradient.addColorStop(0, object.stroke);
        gradient.addColorStop(1, object.fill);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(center[0], center[1], radius, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = object.stroke;
        ctx.lineWidth = Math.max(2, width * 0.004);
        ctx.stroke();
      }

      const sampleX = toCanvasImage([scene.screenPoint[0], 0])[0];
      ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
      ctx.lineWidth = Math.max(1.5, width * 0.003);
      ctx.beginPath();
      ctx.moveTo(sampleX, 18);
      ctx.lineTo(sampleX, height - 18);
      ctx.stroke();

      const pixelSize = Math.max(14, width * 0.048);
      const pixelY = height * 0.52;
      ctx.fillStyle = scene.primaryHit ? scene.primaryHit.object.solid : "#20384a";
      ctx.fillRect(sampleX - pixelSize * 0.5, pixelY - pixelSize * 0.5, pixelSize, pixelSize);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.88)";
      ctx.strokeRect(sampleX - pixelSize * 0.5, pixelY - pixelSize * 0.5, pixelSize, pixelSize);

      ctx.fillStyle = "rgba(240, 245, 247, 0.92)";
      ctx.font = `${Math.max(12, width * 0.022)}px "Avenir Next", "Segoe UI", sans-serif`;
      const winnerText = scene.primaryHit
        ? `${scene.primaryHit.object.name} wins at this sample`
        : "background wins at this sample";
      ctx.fillText(winnerText, 16, height - 18);
    },
  });
}

function setupRayComparisonDemo() {
  const canvas = document.getElementById("ray-compare-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const scene = buildCompareScene();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const world = {
        x0: -1.16,
        x1: 1.16,
        y0: -1.14,
        y1: 1.04,
      };

      function toCanvas(point) {
        const x = ((point[0] - world.x0) / (world.x1 - world.x0)) * width;
        const y = height - ((point[1] - world.y0) / (world.y1 - world.y0)) * height;
        return [x, y];
      }

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102334");
      background.addColorStop(1, "#163446");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let index = 0; index <= 8; index += 1) {
        const x = (width / 8) * index;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let index = 0; index <= 6; index += 1) {
        const y = (height / 6) * index;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const screenLeft = toCanvas([-scene.screenHalfWidth, scene.screenY]);
      const screenRight = toCanvas([scene.screenHalfWidth, scene.screenY]);
      ctx.strokeStyle = "rgba(170, 230, 255, 0.82)";
      ctx.lineWidth = Math.max(2, width * 0.004);
      ctx.beginPath();
      ctx.moveTo(screenLeft[0], screenLeft[1]);
      ctx.lineTo(screenRight[0], screenRight[1]);
      ctx.stroke();

      const samplePoint = toCanvas(scene.screenPoint);
      ctx.fillStyle = "#fff4d4";
      ctx.beginPath();
      ctx.arc(samplePoint[0], samplePoint[1], Math.max(4, width * 0.01), 0, TAU);
      ctx.fill();

      const camera = toCanvas(scene.camera);
      ctx.fillStyle = "#eef5f8";
      ctx.beginPath();
      ctx.arc(camera[0], camera[1], Math.max(6, width * 0.012), 0, TAU);
      ctx.fill();

      const light = toCanvas(scene.light);
      ctx.fillStyle = "#ffd07c";
      ctx.beginPath();
      ctx.arc(light[0], light[1], Math.max(7, width * 0.013), 0, TAU);
      ctx.fill();

      for (const object of scene.objects) {
        const center = toCanvas(object.center);
        const edge = toCanvas([object.center[0] + object.radius, object.center[1]]);
        const radius = Math.abs(edge[0] - center[0]);
        const gradient = ctx.createRadialGradient(
          center[0] - radius * 0.18,
          center[1] - radius * 0.2,
          radius * 0.18,
          center[0],
          center[1],
          radius
        );
        gradient.addColorStop(0, object.stroke);
        gradient.addColorStop(1, object.fill);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(center[0], center[1], radius, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = object.stroke;
        ctx.lineWidth = Math.max(2, width * 0.004);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(255, 244, 197, 0.95)";
      ctx.lineWidth = Math.max(2.2, width * 0.0046);
      ctx.beginPath();
      ctx.moveTo(camera[0], camera[1]);
      const primaryEnd = toCanvas(scene.primaryEnd);
      ctx.lineTo(primaryEnd[0], primaryEnd[1]);
      ctx.stroke();

      if (scene.primaryHit) {
        const hit = toCanvas(scene.primaryHit.point);
        ctx.fillStyle = "#fff5d8";
        ctx.beginPath();
        ctx.arc(hit[0], hit[1], Math.max(4.5, width * 0.01), 0, TAU);
        ctx.fill();

        const normalEnd = toCanvas(add2(scene.primaryHit.point, scale2(scene.primaryHit.normal, 0.18)));
        ctx.strokeStyle = "rgba(230, 244, 248, 0.78)";
        ctx.lineWidth = Math.max(1.5, width * 0.0032);
        ctx.beginPath();
        ctx.moveTo(hit[0], hit[1]);
        ctx.lineTo(normalEnd[0], normalEnd[1]);
        ctx.stroke();

        if (compareControls.secondary?.checked) {
          if (scene.shadowQuery) {
            const shadowEnd = scene.shadowQuery.blocked
              ? scene.shadowQuery.blocked.point
              : scene.shadowQuery.light;
            const shadowCanvas = toCanvas(shadowEnd);
            ctx.setLineDash([10, 7]);
            ctx.strokeStyle = scene.shadowQuery.blocked ? "rgba(255, 154, 102, 0.96)" : "rgba(255, 223, 132, 0.96)";
            ctx.lineWidth = Math.max(1.8, width * 0.0036);
            ctx.beginPath();
            ctx.moveTo(hit[0], hit[1]);
            ctx.lineTo(shadowCanvas[0], shadowCanvas[1]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          if (scene.reflectionQuery) {
            const reflectionEnd = toCanvas(scene.reflectionQuery.end);
            ctx.setLineDash([8, 6]);
            ctx.strokeStyle = "rgba(138, 220, 255, 0.92)";
            ctx.lineWidth = Math.max(1.8, width * 0.0036);
            ctx.beginPath();
            ctx.moveTo(hit[0], hit[1]);
            ctx.lineTo(reflectionEnd[0], reflectionEnd[1]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      ctx.fillStyle = "rgba(238, 243, 247, 0.92)";
      ctx.font = `${Math.max(12, width * 0.022)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillText("camera", camera[0] + 10, camera[1] + 4);
      ctx.fillText("screen", screenLeft[0], screenLeft[1] - 10);
      ctx.fillText("light", light[0] + 10, light[1] - 10);
      ctx.fillText("Primary ray asks: what is hit first?", 16, 22);
      if (compareControls.secondary?.checked) {
        ctx.fillText("Dashed rays show optional shadow/reflection queries.", 16, height - 18);
      }
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

function setupTransparencyDemo() {
  const canvas = document.getElementById("transparency-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const readouts = {
    order: document.getElementById("transparency-order-readout"),
    edge: document.getElementById("transparency-edge-readout"),
    alpha: document.getElementById("transparency-alpha-readout"),
    reference: document.getElementById("transparency-reference-readout"),
  };

  const layers = [
    { cx: 0.34, cy: 0.42, radius: 0.2, depth: 0.2, color: [0.94, 0.53, 0.32], label: "front" },
    { cx: 0.6, cy: 0.48, radius: 0.22, depth: 0.52, color: [0.38, 0.82, 0.9], label: "mid" },
    { cx: 0.49, cy: 0.72, radius: 0.18, depth: 0.84, color: [0.96, 0.8, 0.42], label: "back" },
  ];
  const state = {
    key: "",
  };

  function drawBackdrop(rect) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();

    const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
    gradient.addColorStop(0, "#102534");
    gradient.addColorStop(1, "#1f3d4e");
    ctx.fillStyle = gradient;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    const tile = Math.max(18, rect.width * 0.06);
    for (let row = 0; row <= Math.ceil(rect.height / tile); row += 1) {
      for (let col = 0; col <= Math.ceil(rect.width / tile); col += 1) {
        const even = (row + col) % 2 === 0;
        ctx.fillStyle = even ? "rgba(255, 255, 255, 0.08)" : "rgba(10, 19, 27, 0.18)";
        ctx.fillRect(rect.x + col * tile, rect.y + row * tile, tile, tile);
      }
    }

    ctx.restore();
  }

  function drawLayer(layer, rect, alpha, softness) {
    const size = Math.min(rect.width, rect.height);
    const centerX = rect.x + layer.cx * rect.width;
    const centerY = rect.y + layer.cy * rect.height;
    const radius = layer.radius * size;

    if (softness <= 0.02) {
      ctx.fillStyle = colorToRgba(layer.color, alpha);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, TAU);
      ctx.fill();
    } else {
      const edge = clamp(1 - softness * 0.54, 0.18, 0.98);
      const gradient = ctx.createRadialGradient(
        centerX - radius * 0.22,
        centerY - radius * 0.2,
        radius * 0.18,
        centerX,
        centerY,
        radius
      );
      gradient.addColorStop(0, colorToRgba(mix3(layer.color, [1, 1, 1], 0.14), clamp(alpha + 0.08, 0, 1)));
      gradient.addColorStop(edge, colorToRgba(layer.color, alpha));
      gradient.addColorStop(1, colorToRgba(layer.color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, TAU);
      ctx.fill();
    }

    ctx.strokeStyle = colorToRgba(mix3(layer.color, [1, 1, 1], 0.4), 0.85);
    ctx.lineWidth = Math.max(1.5, rect.width * 0.005);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, TAU);
    ctx.stroke();
  }

  function drawPanel(rect, title, sorted, softness, alpha) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();

    drawBackdrop(rect);

    const orderedLayers = layers.slice().sort((a, b) => (sorted ? b.depth - a.depth : a.depth - b.depth));
    for (const layer of orderedLayers) {
      drawLayer(layer, rect, alpha, softness);
    }

    ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
    ctx.font = `${Math.max(14, rect.width * 0.06)}px "Avenir Next", "Segoe UI", sans-serif`;
    ctx.fillText(title, rect.x + 16, rect.y + 24);

    const chipY = rect.y + rect.height - 26;
    let chipX = rect.x + 16;
    for (const layer of orderedLayers) {
      const chipW = Math.max(62, rect.width * 0.16);
      const chipH = 18;
      ctx.fillStyle = colorToRgba(layer.color, 0.26);
      ctx.strokeStyle = colorToRgba(layer.color, 0.9);
      ctx.lineWidth = 1.4;
      ctx.fillRect(chipX, chipY - chipH, chipW, chipH);
      ctx.strokeRect(chipX, chipY - chipH, chipW, chipH);
      ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
      ctx.font = `${Math.max(10, rect.width * 0.036)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillText(layer.label, chipX + 8, chipY - 5);
      chipX += chipW + 8;
    }

    ctx.restore();
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const alpha = Number(transparencyControls.alpha?.value || 58) / 100;
      const softness = Number(transparencyControls.softness?.value || 32) / 100;
      const sorted = Boolean(transparencyControls.sort?.checked);
      const key = `${width}|${height}|${alpha.toFixed(3)}|${softness.toFixed(3)}|${sorted}`;
      if (state.key === key) {
        return;
      }
      state.key = key;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const margin = 18;
      const gap = 16;
      const panelWidth = (width - margin * 2 - gap) / 2;
      const panelHeight = height - margin * 2;
      const currentRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const referenceRect = { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };

      drawPanel(currentRect, "Current setup", sorted, softness, alpha);
      drawPanel(referenceRect, "Reference", true, Math.max(softness, 0.38), alpha);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = 1.6;
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      ctx.strokeRect(referenceRect.x, referenceRect.y, referenceRect.width, referenceRect.height);

      if (readouts.order) {
        readouts.order.textContent = sorted ? "back to front" : "front to back";
      }
      if (readouts.edge) {
        readouts.edge.textContent =
          softness < 0.08 ? "hard coverage" : softness < 0.38 ? "partially smoothed" : "soft coverage";
      }
      if (readouts.alpha) {
        readouts.alpha.textContent = formatNumber(alpha, 2);
      }
      if (readouts.reference) {
        readouts.reference.textContent = sorted && softness >= 0.38 ? "close match" : "needs order + coverage";
      }
    },
  });
}

function setupPbrDemo() {
  const canvas = document.getElementById("pbr-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const readouts = {
    f0: document.getElementById("pbr-f0-readout"),
    lobe: document.getElementById("pbr-lobe-readout"),
    response: document.getElementById("pbr-response-readout"),
    environment: document.getElementById("pbr-environment-readout"),
  };
  const offscreen = document.createElement("canvas");
  const offscreenSize = 180;
  offscreen.width = offscreenSize;
  offscreen.height = offscreenSize;
  const offscreenCtx = offscreen.getContext("2d");
  if (!offscreenCtx) {
    return;
  }

  const imageData = offscreenCtx.createImageData(offscreenSize, offscreenSize);
  const pixels = imageData.data;
  const state = {
    key: "",
  };

  function sampleEnvironment(direction, rotation) {
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);
    const x = direction[0] * cosR - direction[2] * sinR;
    const y = direction[1];
    const z = direction[0] * sinR + direction[2] * cosR;
    const skyT = clamp(y * 0.5 + 0.5, 0, 1);
    const sky = mix3([0.94, 0.67, 0.38], [0.2, 0.44, 0.78], skyT);
    const ground = mix3([0.17, 0.18, 0.22], [0.34, 0.27, 0.2], clamp(-y * 0.8, 0, 1));
    const blend = clamp(y * 2 + 0.5, 0, 1);
    const sunDirection = normalize3([0.62, 0.48, 0.62]);
    const sun = Math.pow(Math.max(dot3([x, y, z], sunDirection), 0), 36);
    const base = mix3(ground, sky, blend);
    return add3(base, [sun * 0.65, sun * 0.48, sun * 0.22]);
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const roughness = Number(pbrControls.roughness?.value || 38) / 100;
      const metalness = Number(pbrControls.metalness?.value || 24) / 100;
      const environmentRotation = (Number(pbrControls.environment?.value || 18) / 100) * TAU;
      const key = `${width}|${height}|${roughness.toFixed(3)}|${metalness.toFixed(3)}|${environmentRotation.toFixed(3)}`;
      if (state.key === key) {
        return;
      }
      state.key = key;

      const baseColor = [0.88, 0.45, 0.18];
      const f0 = mix3([0.04, 0.04, 0.04], baseColor, metalness);
      const view = [0, 0, 1];
      const lightDirection = normalize3([
        Math.cos(environmentRotation * 0.75) * 0.58,
        0.62,
        0.5 + Math.sin(environmentRotation * 0.75) * 0.18,
      ]);

      const radius = offscreenSize * 0.46;
      const center = offscreenSize * 0.5;
      const specularExponent = lerp(150, 8, Math.sqrt(roughness));
      const highlightScale = lerp(1.42, 0.32, roughness);

      for (let y = 0; y < offscreenSize; y += 1) {
        for (let x = 0; x < offscreenSize; x += 1) {
          const dx = (x + 0.5 - center) / radius;
          const dy = (center - (y + 0.5)) / radius;
          const r2 = dx * dx + dy * dy;
          const pixelIndex = (y * offscreenSize + x) * 4;
          if (r2 > 1) {
            pixels[pixelIndex] = 0;
            pixels[pixelIndex + 1] = 0;
            pixels[pixelIndex + 2] = 0;
            pixels[pixelIndex + 3] = 0;
            continue;
          }

          const dz = Math.sqrt(1 - r2);
          const normal = [dx, dy, dz];
          const halfVector = normalize3(add3(lightDirection, view));
          const noL = Math.max(dot3(normal, lightDirection), 0);
          const noV = Math.max(dot3(normal, view), 0);
          const noH = Math.max(dot3(normal, halfVector), 0);
          const fresnel = Math.pow(1 - noV, 5);
          const fresnelColor = mix3(f0, [1, 1, 1], fresnel);
          const reflection = reflect3([-view[0], -view[1], -view[2]], normal);
          const envSample = sampleEnvironment(reflection, environmentRotation);
          const ambientSample = sampleEnvironment(normal, environmentRotation);
          const diffuse = scale3(baseColor, (1 - metalness) * (0.2 + noL * 0.82));
          const ambient = scale3(multiply3(ambientSample, mix3(baseColor, [0.9, 0.92, 0.96], 0.2)), (1 - metalness) * 0.42 + 0.08);
          const specular = scale3(
            multiply3(mix3(envSample, fresnelColor, 0.45), fresnelColor),
            Math.pow(noH, specularExponent) * highlightScale + fresnel * lerp(0.18, 0.42, 1 - roughness)
          );
          const combined = add3(add3(diffuse, ambient), specular);
          const mapped = [
            combined[0] / (1 + combined[0]),
            combined[1] / (1 + combined[1]),
            combined[2] / (1 + combined[2]),
          ];
          const display = [
            Math.pow(clamp(mapped[0], 0, 1), 1 / 2.2),
            Math.pow(clamp(mapped[1], 0, 1), 1 / 2.2),
            Math.pow(clamp(mapped[2], 0, 1), 1 / 2.2),
          ];

          pixels[pixelIndex] = Math.round(display[0] * 255);
          pixels[pixelIndex + 1] = Math.round(display[1] * 255);
          pixels[pixelIndex + 2] = Math.round(display[2] * 255);
          pixels[pixelIndex + 3] = 255;
        }
      }

      offscreenCtx.putImageData(imageData, 0, 0);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#123248");
      background.addColorStop(0.45, "#2b5a78");
      background.addColorStop(0.58, "#d49352");
      background.addColorStop(1, "#1e262e");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      const sunX = width * (0.74 + Math.cos(environmentRotation) * 0.08);
      const sunY = height * (0.2 - Math.sin(environmentRotation) * 0.03);
      const sunGradient = ctx.createRadialGradient(sunX, sunY, width * 0.02, sunX, sunY, width * 0.22);
      sunGradient.addColorStop(0, "rgba(255, 234, 179, 0.58)");
      sunGradient.addColorStop(1, "rgba(255, 211, 128, 0)");
      ctx.fillStyle = sunGradient;
      ctx.fillRect(0, 0, width, height);

      const sphereSize = Math.min(width * 0.42, height * 0.72);
      const sphereX = width * 0.11;
      const sphereY = height * 0.16;
      ctx.drawImage(offscreen, sphereX, sphereY, sphereSize, sphereSize);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = Math.max(1.6, width * 0.0032);
      ctx.beginPath();
      ctx.arc(sphereX + sphereSize * 0.5, sphereY + sphereSize * 0.5, sphereSize * 0.5, 0, TAU);
      ctx.stroke();

      const infoX = sphereX + sphereSize + width * 0.08;
      const infoY = height * 0.18;
      const cardWidth = width - infoX - width * 0.08;
      const rowGap = Math.max(16, height * 0.03);
      const swatchHeight = Math.max(50, height * 0.12);
      const cards = [
        {
          title: "Roughness reshapes the lobe",
          lines: ["Low roughness keeps a tight highlight.", "Higher roughness spreads energy wider."],
          color: "rgba(255, 244, 197, 0.18)",
          stroke: "rgba(255, 244, 197, 0.58)",
        },
        {
          title: "Metalness changes the reflective tint",
          lines: ["Dielectrics keep a small neutral F0.", "Metals push more base color into reflection."],
          color: "rgba(247, 160, 74, 0.16)",
          stroke: "rgba(247, 160, 74, 0.58)",
        },
        {
          title: "Environment still matters",
          lines: ["Sky and horizon feed the reflection.", "Rotating the world changes the material."],
          color: "rgba(115, 221, 213, 0.16)",
          stroke: "rgba(115, 221, 213, 0.52)",
        },
      ];

      ctx.font = `${Math.max(17, width * 0.024)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillStyle = "rgba(247, 250, 252, 0.96)";
      ctx.fillText("Material response", infoX, infoY - 12);

      for (let index = 0; index < cards.length; index += 1) {
        const cardY = infoY + index * (swatchHeight + rowGap);
        const card = cards[index];
        ctx.fillStyle = card.color;
        ctx.strokeStyle = card.stroke;
        ctx.lineWidth = 1.4;
        ctx.fillRect(infoX, cardY, cardWidth, swatchHeight);
        ctx.strokeRect(infoX, cardY, cardWidth, swatchHeight);
        ctx.fillStyle = "rgba(247, 250, 252, 0.96)";
        ctx.font = `${Math.max(14, width * 0.019)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(card.title, infoX + 14, cardY + 20);
        ctx.fillStyle = "rgba(225, 236, 242, 0.84)";
        ctx.font = `${Math.max(11, width * 0.014)}px "Avenir Next", "Segoe UI", sans-serif`;
        drawTextLines(ctx, card.lines, infoX + 14, cardY + 30, 16);
      }

      if (readouts.f0) {
        readouts.f0.textContent = formatVector(f0, 2);
      }
      if (readouts.lobe) {
        readouts.lobe.textContent = roughness < 0.22 ? "tight" : roughness < 0.58 ? "medium" : "broad";
      }
      if (readouts.response) {
        readouts.response.textContent =
          metalness < 0.33 ? "dielectric leaning" : metalness < 0.66 ? "hybrid surface" : "metal dominant";
      }
      if (readouts.environment) {
        const normalizedRotation = ((environmentRotation / TAU) % 1 + 1) % 1;
        readouts.environment.textContent =
          normalizedRotation < 0.34 ? "warm horizon" : normalizedRotation < 0.67 ? "blue sky" : "ground spill";
      }
    },
  });
}

function setupAnimationDemo() {
  const canvas = document.getElementById("animation-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const readouts = {
    pose: document.getElementById("animation-pose-readout"),
    mode: document.getElementById("animation-mode-readout"),
    hand: document.getElementById("animation-hand-readout"),
    lag: document.getElementById("animation-lag-readout"),
  };
  const bindJoints = [0, 0.34, 0.68, 0.98];
  const lengths = [0.34, 0.34, 0.3];
  const columns = [];
  for (let index = 0; index <= 28; index += 1) {
    const u = index / 28;
    const x = lerp(0, bindJoints[3], u);
    const radius = lerp(0.13, 0.06, u) + Math.sin(u * Math.PI) * 0.018;
    const weights = [0, 0, 0];
    const centers = [0.17, 0.51, 0.84];
    let totalWeight = 0;
    for (let bone = 0; bone < 3; bone += 1) {
      const weight = Math.max(0, 1 - Math.abs(x - centers[bone]) / 0.26);
      weights[bone] = weight;
      totalWeight += weight;
    }
    if (totalWeight <= 1e-6) {
      const nearest = x < bindJoints[1] ? 0 : x < bindJoints[2] ? 1 : 2;
      weights[nearest] = 1;
      totalWeight = 1;
    }
    for (let bone = 0; bone < 3; bone += 1) {
      weights[bone] /= totalWeight;
    }
    columns.push({
      top: [x, radius],
      bottom: [x, -radius],
      weights,
    });
  }

  const state = {
    key: "",
  };

  function poseRig(progress, lag) {
    const shoulder = lerp(-0.58, 0.82, progress);
    const elbow = lerp(0.12, 1.02, clamp(progress - lag * 0.18, 0, 1));
    const wrist = lerp(-0.22, 0.48, clamp(progress - lag * 0.34, 0, 1));
    const localAngles = [shoulder, elbow * 0.86, wrist * 0.7];
    const cumulativeAngles = [];
    const joints = [[0, 0]];
    let cumulative = 0;
    for (let bone = 0; bone < 3; bone += 1) {
      cumulative += localAngles[bone];
      cumulativeAngles.push(cumulative);
      joints.push(add2(joints[bone], rotate2([lengths[bone], 0], cumulative)));
    }
    return {
      cumulativeAngles,
      joints,
    };
  }

  function transformBindPoint(point, boneIndex, rig) {
    const local = [point[0] - bindJoints[boneIndex], point[1]];
    return add2(rig.joints[boneIndex], rotate2(local, rig.cumulativeAngles[boneIndex]));
  }

  function skinPoint(point, weights, rig, smooth) {
    if (!smooth) {
      let bestIndex = 0;
      for (let bone = 1; bone < 3; bone += 1) {
        if (weights[bone] > weights[bestIndex]) {
          bestIndex = bone;
        }
      }
      return transformBindPoint(point, bestIndex, rig);
    }

    let resultX = 0;
    let resultY = 0;
    for (let bone = 0; bone < 3; bone += 1) {
      if (weights[bone] <= 0) {
        continue;
      }
      const transformed = transformBindPoint(point, bone, rig);
      resultX += transformed[0] * weights[bone];
      resultY += transformed[1] * weights[bone];
    }
    return [resultX, resultY];
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const poseProgress = Number(animationControls.pose?.value || 58) / 100;
      const lag = Number(animationControls.lag?.value || 26) / 100;
      const smoothSkinning = Boolean(animationControls.skinning?.checked);
      const key = `${width}|${height}|${poseProgress.toFixed(3)}|${lag.toFixed(3)}|${smoothSkinning}`;
      if (state.key === key) {
        return;
      }
      state.key = key;

      const rig = poseRig(poseProgress, lag);
      const origin = [width * 0.16, height * 0.62];
      const scale = Math.min(width * 0.64, height * 0.54);
      const toCanvas = (point) => [origin[0] + point[0] * scale, origin[1] - point[1] * scale];

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#112536");
      background.addColorStop(1, "#1e3b47");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let index = 0; index <= 12; index += 1) {
        const y = (height / 12) * index;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const bindStart = toCanvas([0, 0]);
      const bindEnd = toCanvas([bindJoints[3], 0]);
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = Math.max(2, width * 0.0032);
      ctx.beginPath();
      ctx.moveTo(bindStart[0], bindStart[1]);
      ctx.lineTo(bindEnd[0], bindEnd[1]);
      ctx.stroke();
      ctx.setLineDash([]);

      const topPoints = [];
      const bottomPoints = [];
      for (const column of columns) {
        topPoints.push(toCanvas(skinPoint(column.top, column.weights, rig, smoothSkinning)));
        bottomPoints.push(toCanvas(skinPoint(column.bottom, column.weights, rig, smoothSkinning)));
      }

      const meshGradient = ctx.createLinearGradient(0, height * 0.32, 0, height * 0.76);
      meshGradient.addColorStop(0, "rgba(255, 222, 171, 0.84)");
      meshGradient.addColorStop(1, "rgba(115, 221, 213, 0.72)");
      ctx.fillStyle = meshGradient;
      ctx.beginPath();
      ctx.moveTo(topPoints[0][0], topPoints[0][1]);
      for (let index = 1; index < topPoints.length; index += 1) {
        ctx.lineTo(topPoints[index][0], topPoints[index][1]);
      }
      for (let index = bottomPoints.length - 1; index >= 0; index -= 1) {
        ctx.lineTo(bottomPoints[index][0], bottomPoints[index][1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 244, 197, 0.9)";
      ctx.lineWidth = Math.max(2, width * 0.0036);
      ctx.stroke();

      if (!smoothSkinning) {
        ctx.strokeStyle = "rgba(247, 160, 74, 0.72)";
        ctx.lineWidth = Math.max(1.5, width * 0.0028);
        for (let seamIndex = 10; seamIndex <= 18; seamIndex += 8) {
          ctx.beginPath();
          ctx.moveTo(topPoints[seamIndex][0], topPoints[seamIndex][1]);
          ctx.lineTo(bottomPoints[seamIndex][0], bottomPoints[seamIndex][1]);
          ctx.stroke();
        }
      }

      ctx.strokeStyle = "rgba(138, 220, 255, 0.9)";
      ctx.lineWidth = Math.max(4, width * 0.007);
      ctx.lineCap = "round";
      for (let bone = 0; bone < 3; bone += 1) {
        const start = toCanvas(rig.joints[bone]);
        const end = toCanvas(rig.joints[bone + 1]);
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(255, 245, 216, 0.98)";
      for (let joint = 0; joint < rig.joints.length; joint += 1) {
        const point = toCanvas(rig.joints[joint]);
        ctx.beginPath();
        ctx.arc(point[0], point[1], Math.max(6, width * 0.011), 0, TAU);
        ctx.fill();
      }

      const handPoint = toCanvas(rig.joints[3]);
      ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
      ctx.font = `${Math.max(15, width * 0.019)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillText("bind pose", bindEnd[0] - 72, bindEnd[1] - 14);
      ctx.fillText("rig", origin[0], origin[1] - scale * 0.42);
      ctx.fillText(smoothSkinning ? "smooth deformation" : "rigid ownership", handPoint[0] - 52, handPoint[1] - 20);

      if (readouts.pose) {
        readouts.pose.textContent = formatNumber(poseProgress, 2);
      }
      if (readouts.mode) {
        readouts.mode.textContent = smoothSkinning ? "linear blend skinning" : "rigid segments";
      }
      if (readouts.hand) {
        readouts.hand.textContent = formatVector(rig.joints[3], 2);
      }
      if (readouts.lag) {
        readouts.lag.textContent = formatNumber(lag, 2);
      }
    },
  });
}

function setupAccelerationDemo() {
  const canvas = document.getElementById("acceleration-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const readouts = {
    visible: document.getElementById("acceleration-visible-readout"),
    skipped: document.getElementById("acceleration-skipped-readout"),
    triangles: document.getElementById("acceleration-triangles-readout"),
    lod: document.getElementById("acceleration-lod-readout"),
  };

  const objects = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const seed = row * 17 + col * 11 + 3;
      const jitterX = (((seed * 37) % 100) / 100 - 0.5) * 0.08;
      const jitterY = (((seed * 53) % 100) / 100 - 0.5) * 0.07;
      objects.push({
        position: [-1.18 + col * 0.29 + jitterX, -0.92 + row * 0.26 + jitterY],
        radius: 0.045 + (seed % 3) * 0.012,
      });
    }
  }

  const state = {
    key: "",
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const sweep = Number(accelerationControls.sweep?.value || 18) / 100;
      const lodBias = Number(accelerationControls.lod?.value || 48) / 100;
      const culling = Boolean(accelerationControls.culling?.checked);
      const key = `${width}|${height}|${sweep.toFixed(3)}|${lodBias.toFixed(3)}|${culling}`;
      if (state.key === key) {
        return;
      }
      state.key = key;

      const cameraAngle = lerp(-2.2, 1.1, sweep);
      const camera = [Math.cos(cameraAngle) * 1.42, Math.sin(cameraAngle) * 1.04];
      const forward = normalize2(scale2(camera, -1));
      const fov = 0.94;
      const far = 2.28;
      const near = 0.18;
      const highThreshold = lerp(1.52, 0.82, lodBias);
      const midThreshold = lerp(2.24, 1.28, lodBias);
      const cosLimit = Math.cos(fov * 0.5);
      const world = { x0: -1.45, x1: 1.45, y0: -1.16, y1: 1.16 };
      const toCanvas = (point) => [
        ((point[0] - world.x0) / (world.x1 - world.x0)) * width,
        height - ((point[1] - world.y0) / (world.y1 - world.y0)) * height,
      ];

      let visibleCount = 0;
      let skippedCount = 0;
      let triangleEstimate = 0;
      let highCount = 0;
      let midCount = 0;
      let lowCount = 0;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#112536");
      background.addColorStop(1, "#203846");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let index = 0; index <= 10; index += 1) {
        const x = (width / 10) * index;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let index = 0; index <= 8; index += 1) {
        const y = (height / 8) * index;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const leftDirection = rotate2(forward, -fov * 0.5);
      const rightDirection = rotate2(forward, fov * 0.5);
      const frustumPoints = [
        toCanvas(add2(camera, scale2(leftDirection, near))),
        toCanvas(add2(camera, scale2(leftDirection, far))),
        toCanvas(add2(camera, scale2(rightDirection, far))),
        toCanvas(add2(camera, scale2(rightDirection, near))),
      ];

      ctx.fillStyle = "rgba(255, 223, 132, 0.08)";
      ctx.strokeStyle = "rgba(255, 223, 132, 0.32)";
      ctx.lineWidth = Math.max(1.5, width * 0.003);
      ctx.beginPath();
      ctx.moveTo(frustumPoints[0][0], frustumPoints[0][1]);
      for (let index = 1; index < frustumPoints.length; index += 1) {
        ctx.lineTo(frustumPoints[index][0], frustumPoints[index][1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const cameraCanvas = toCanvas(camera);
      drawArrow2d(
        ctx,
        cameraCanvas,
        toCanvas(add2(camera, scale2(forward, 0.3))),
        "rgba(255, 245, 216, 0.94)",
        Math.max(2.2, width * 0.0042)
      );
      ctx.fillStyle = "rgba(255, 245, 216, 0.98)";
      ctx.beginPath();
      ctx.arc(cameraCanvas[0], cameraCanvas[1], Math.max(6, width * 0.011), 0, TAU);
      ctx.fill();

      for (const object of objects) {
        const offset = subtract2(object.position, camera);
        const distance = Math.hypot(offset[0], offset[1]);
        const direction = distance > 1e-5 ? [offset[0] / distance, offset[1] / distance] : [0, 0];
        const visible = distance >= near && distance <= far && dot2(direction, forward) >= cosLimit;
        const submitted = culling ? visible : true;
        let tier = "low";
        let tierCost = 8;
        if (distance <= highThreshold) {
          tier = "high";
          tierCost = 128;
          highCount += submitted ? 1 : 0;
        } else if (distance <= midThreshold) {
          tier = "mid";
          tierCost = 32;
          midCount += submitted ? 1 : 0;
        } else {
          lowCount += submitted ? 1 : 0;
        }

        if (visible) {
          visibleCount += 1;
        } else if (culling) {
          skippedCount += 1;
        }
        if (submitted) {
          triangleEstimate += tierCost;
        }

        const center = toCanvas(object.position);
        const edge = toCanvas([object.position[0] + object.radius, object.position[1]]);
        const radius = Math.abs(edge[0] - center[0]);
        const activeAlpha = visible ? 0.95 : submitted ? 0.36 : 0.16;
        const strokeAlpha = visible ? 0.92 : submitted ? 0.4 : 0.2;
        const fillColor =
          tier === "high"
            ? `rgba(247, 160, 74, ${activeAlpha})`
            : tier === "mid"
              ? `rgba(115, 221, 213, ${activeAlpha})`
              : `rgba(170, 230, 255, ${activeAlpha})`;
        const strokeColor =
          tier === "high"
            ? `rgba(255, 230, 184, ${strokeAlpha})`
            : tier === "mid"
              ? `rgba(215, 248, 245, ${strokeAlpha})`
              : `rgba(232, 244, 248, ${strokeAlpha})`;

        if (!submitted) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
          ctx.lineWidth = 1.2;
          ctx.strokeRect(center[0] - radius, center[1] - radius, radius * 2, radius * 2);
          continue;
        }

        if (tier === "high") {
          ctx.fillStyle = fillColor;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = Math.max(1.6, width * 0.0028);
          ctx.fillRect(center[0] - radius, center[1] - radius, radius * 2, radius * 2);
          ctx.strokeRect(center[0] - radius, center[1] - radius, radius * 2, radius * 2);
          ctx.beginPath();
          ctx.arc(center[0], center[1], radius * 1.4, 0, TAU);
          ctx.stroke();
        } else if (tier === "mid") {
          ctx.fillStyle = fillColor;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = Math.max(1.4, width * 0.0024);
          ctx.beginPath();
          ctx.moveTo(center[0], center[1] - radius * 1.3);
          ctx.lineTo(center[0] + radius * 1.2, center[1]);
          ctx.lineTo(center[0], center[1] + radius * 1.3);
          ctx.lineTo(center[0] - radius * 1.2, center[1]);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = fillColor;
          ctx.beginPath();
          ctx.arc(center[0], center[1], Math.max(3.5, radius * 0.7), 0, TAU);
          ctx.fill();
        }
      }

      ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
      ctx.font = `${Math.max(15, width * 0.018)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillText("camera frustum", cameraCanvas[0] + 10, cameraCanvas[1] - 12);
      ctx.fillText("High detail near the camera, cheaper symbols farther away.", 18, 22);

      if (readouts.visible) {
        readouts.visible.textContent = String(visibleCount);
      }
      if (readouts.skipped) {
        readouts.skipped.textContent = culling ? String(skippedCount) : "0";
      }
      if (readouts.triangles) {
        readouts.triangles.textContent = triangleEstimate.toLocaleString();
      }
      if (readouts.lod) {
        readouts.lod.textContent = `${highCount} high / ${midCount} mid / ${lowCount} low`;
      }
    },
  });
}

function markAllDemosDirty() {
  for (const demo of demos) {
    demo.needsRender = true;
  }
}

function updateHeaderOffset() {
  const header = document.querySelector(".site-header");
  if (!header) {
    return;
  }

  const offset = Math.ceil(header.getBoundingClientRect().height) + 18;
  document.documentElement.style.setProperty("--header-offset", `${offset}px`);
}

function setupHeaderOffset() {
  const header = document.querySelector(".site-header");
  if (!header) {
    return;
  }

  updateHeaderOffset();

  if (typeof window.ResizeObserver === "function") {
    const headerObserver = new ResizeObserver(() => {
      updateHeaderOffset();
    });
    headerObserver.observe(header);
  }

  window.addEventListener("resize", updateHeaderOffset, { passive: true });
  window.addEventListener("orientationchange", updateHeaderOffset, { passive: true });
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
    computeShaderControls.count,
    computeShaderControls.push,
    computeShaderControls.viscosity,
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
    basisProbeControls.angle,
    basisProbeControls.translateX,
    basisProbeControls.translateY,
    basisProbeControls.translateToggle,
    spaceProbeControls.stage,
    spaceProbeControls.x,
    spaceProbeControls.y,
    spaceProbeControls.z,
    normalProbeControls.surface,
    normalProbeControls.light,
    normalProbeControls.scale,
    normalProbeControls.fix,
    shaderProbeControls.warp,
    shaderProbeControls.bands,
    shadowControls.bias,
    shadowControls.resolution,
    shadowControls.filter,
    compareControls.sample,
    compareControls.drift,
    compareControls.secondary,
    transparencyControls.alpha,
    transparencyControls.softness,
    transparencyControls.sort,
    pbrControls.roughness,
    pbrControls.metalness,
    pbrControls.environment,
    animationControls.pose,
    animationControls.lag,
    animationControls.skinning,
    accelerationControls.sweep,
    accelerationControls.lod,
    accelerationControls.culling,
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
  setupHeaderOffset();
  setupReveals();
  safeSetup("hero-canvas", setupHeroDemo);
  safeSetup("foundation-types-canvas", setupFoundationTypesDemo);
  safeSetup("game-vectors-canvas", setupGameVectorsStoryDemo);
  safeSetup("dot-cross-canvas", setupDotCrossStoryDemo);
  safeSetup("vector-offset-use-canvas", setupVectorOffsetUseDemo);
  safeSetup("vector-normalize-use-canvas", setupVectorNormalizeUseDemo);
  safeSetup("vector-dot-use-canvas", setupVectorDotUseDemo);
  safeSetup("vector-cross-use-canvas", setupVectorCrossUseDemo);
  safeSetup("matrix-columns-canvas", setupMatrixColumnsDemo);
  safeSetup("affine-story-canvas", setupAffineStoryDemo);
  safeSetup("basis-story-canvas", setupBasisStoryDemo);
  safeSetup("homogeneous-story-canvas", setupHomogeneousStoryDemo);
  safeSetup("order-story-canvas", setupOrderStoryDemo);
  safeSetup("vectors-canvas", setupVectorDemo);
  safeSetup("space-object-canvas", setupSpaceObjectDemo);
  safeSetup("space-world-canvas", setupSpaceWorldDemo);
  safeSetup("space-clip-canvas", setupSpaceClipDemo);
  safeSetup("space-contract-canvas", setupSpaceContractDemo);
  safeSetup("game-spaces-canvas", setupGameSpacesStoryDemo);
  safeSetup("space-attachment-use-canvas", setupSpaceAttachmentUseDemo);
  safeSetup("space-world-use-canvas", setupSpaceWorldUseDemo);
  safeSetup("space-view-use-canvas", setupSpaceViewUseDemo);
  safeSetup("space-screen-use-canvas", setupSpaceScreenUseDemo);
  safeSetup("camera-frame-canvas", setupCameraFrameStoryDemo);
  safeSetup("worked-example-canvas", setupWorkedExampleStoryDemo);
  safeSetup("space-map-canvas", setupSpaceMapStoryDemo);
  safeSetup("clip-story-canvas", setupClipStoryDemo);
  safeSetup("game-normals-canvas", setupGameNormalsStoryDemo);
  safeSetup("normals-canvas", setupNormalsDemo);
  safeSetup("shader-canvas", setupShaderDemo);
  safeSetup("shader-fluid-canvas", setupShaderFluidDemo);
  safeSetup("shader-dataflow-canvas", setupShaderDataflowDemo);
  safeSetup("normal-code-canvas", setupNormalCodeLab);
  safeSetup("shader-code-canvas", setupShaderCodeLab);
  safeSetup("basis-probe-canvas", setupBasisProbeDemo);
  safeSetup("vectors-code-canvas", setupVectorsCodeLab);
  safeSetup("space-probe-canvas", setupSpaceProbeDemo);
  safeSetup("spaces-code-canvas", setupSpacesCodeLab);
  safeSetup("normal-probe-canvas", setupNormalProbeDemo);
  safeSetup("shader-probe-canvas", setupShaderProbeDemo);
  safeSetup("triangle-story-canvas", setupTriangleStoryDemo);
  safeSetup("visibility-story-canvas", setupVisibilityStoryDemo);
  safeSetup("rendering-code-canvas", setupRenderingCodeLab);
  safeSetup("pipeline-canvas", setupPipelineDemo);
  safeSetup("projection-canvas", setupProjectionDemo);
  safeSetup("camera-compare-canvas", setupCameraCompareStoryDemo);
  safeSetup("depth-precision-canvas", setupDepthPrecisionStoryDemo);
  safeSetup("projection-code-canvas", setupProjectionCodeLab);
  safeSetup("texture-code-canvas", setupTextureCodeLab);
  safeSetup("sampling-story-canvas", setupSamplingStoryDemo);
  safeSetup("mipmap-story-canvas", setupMipmapStoryDemo);
  safeSetup("texture-canvas", setupTextureDemo);
  safeSetup("light-response-canvas", setupLightResponseStoryDemo);
  safeSetup("material-code-canvas", setupMaterialCodeLab);
  safeSetup("material-canvas", setupMaterialDemo);
  safeSetup("shadow-code-canvas", setupShadowCodeLab);
  safeSetup("compare-code-canvas", setupCompareCodeLab);
  safeSetup("display-story-canvas", setupDisplayStoryDemo);
  safeSetup("color-code-canvas", setupColorCodeLab);
  safeSetup("color-canvas", setupColorDemo);
  safeSetup("transparency-canvas", setupTransparencyDemo);
  safeSetup("pbr-canvas", setupPbrDemo);
  safeSetup("animation-canvas", setupAnimationDemo);
  safeSetup("acceleration-canvas", setupAccelerationDemo);
  safeSetup("light-space-canvas", setupLightSpaceStoryDemo);
  safeSetup("shadow-canvas", setupShadowDemo);
  safeSetup("raster-compare-canvas", setupRasterComparisonDemo);
  safeSetup("ray-compare-canvas", setupRayComparisonDemo);
  setupShaderLiveLabTabs();
  setupShaderFluidTabs();
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
