const shaderControls = getElementsById({
  amplitude: "shader-amplitude",
  density: "shader-density",
  shift: "shader-shift"
});

const computeShaderControls = getElementsById({
  count: "shader-compute-count",
  push: "shader-compute-push",
  viscosity: "shader-compute-viscosity"
});

const shaderProbeControls = getElementsById({
  warp: "shader-probe-warp",
  bands: "shader-probe-bands"
});

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

function setupMeshDataDemo() {
  const canvas = document.getElementById("mesh-data-canvas");
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
      ctx.clearRect(0, 0, width, height);

      const phase = prefersReducedMotion ? 0 : time;
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

      function drawVertex(x, y, label, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        if (label) {
          ctx.fillStyle = "rgba(239, 245, 247, 0.88)";
          ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
          ctx.fillText(label, x + 8, y - 6);
        }
      }

      function drawTri(pts, fill, stroke) {
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[1][0], pts[1][1]);
        ctx.lineTo(pts[2][0], pts[2][1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      function drawWindingArrows(pts, color) {
        for (let i = 0; i < 3; i++) {
          const from = pts[i];
          const to = pts[(i + 1) % 3];
          const mx = (from[0] + to[0]) * 0.5;
          const my = (from[1] + to[1]) * 0.5;
          const dx = to[0] - from[0];
          const dy = to[1] - from[1];
          const len = Math.hypot(dx, dy) || 1;
          const frac = Math.min(18, len * 0.3);
          drawArrow2d(ctx, [mx - dx / len * frac * 0.5, my - dy / len * frac * 0.5], [mx + dx / len * frac * 0.5, my + dy / len * frac * 0.5], color, 1.8);
        }
      }

      // Panel 1: Winding order
      (function (rect) {
        drawLessonCanvasPanel(ctx, rect, "1. Winding order", width);
        const cx = rect.x + rect.width * 0.5;
        const cy = rect.y + rect.height * 0.52;
        const r = Math.min(rect.width, rect.height) * 0.28;

        const ccwPts = [
          [cx - r * 1.1, cy + r * 0.7],
          [cx - r * 0.1, cy - r * 0.8],
          [cx + r * 0.7, cy + r * 0.7],
        ];
        drawTri(ccwPts, "rgba(115, 221, 213, 0.18)", "rgba(115, 221, 213, 0.8)");
        drawWindingArrows(ccwPts, "rgba(115, 221, 213, 0.7)");

        drawVertex(ccwPts[0][0], ccwPts[0][1], "A", "rgba(115, 221, 213, 0.9)");
        drawVertex(ccwPts[1][0], ccwPts[1][1], "B", "rgba(115, 221, 213, 0.9)");
        drawVertex(ccwPts[2][0], ccwPts[2][1], "C", "rgba(115, 221, 213, 0.9)");

        const ncx = (ccwPts[0][0] + ccwPts[1][0] + ccwPts[2][0]) / 3;
        const ncy = (ccwPts[0][1] + ccwPts[1][1] + ccwPts[2][1]) / 3;
        ctx.fillStyle = "rgba(239, 245, 247, 0.7)";
        ctx.beginPath();
        ctx.arc(ncx, ncy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(239, 245, 247, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ncx, ncy, 9, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(239, 245, 247, 0.76)";
        ctx.font = `${Math.max(10, width * 0.0108)}px "Avenir Next", "Segoe UI", sans-serif`;
        drawTextLines(ctx, ["CCW = front-facing", "Normal points toward you (\u2299)"], rect.x + 14, rect.y + rect.height - 38, 15);
      })(panels[0]);

      // Panel 2: Face culling
      (function (rect) {
        drawLessonCanvasPanel(ctx, rect, "2. Face culling", width);
        const cx = rect.x + rect.width * 0.5;
        const cy = rect.y + rect.height * 0.5;
        const r = Math.min(rect.width, rect.height) * 0.22;

        const leftPts = [
          [cx - r * 1.4, cy + r * 0.7],
          [cx - r * 0.5, cy - r * 0.7],
          [cx + r * 0.1, cy + r * 0.6],
        ];
        drawTri(leftPts, "rgba(115, 221, 213, 0.2)", "rgba(115, 221, 213, 0.8)");
        drawCanvasChip(ctx, "front \u2192 keep", cx - r * 0.7, cy + r * 1.2, { fontSize: Math.max(9, width * 0.01), background: "rgba(115, 221, 213, 0.15)", border: "rgba(115, 221, 213, 0.4)", color: "rgba(115, 221, 213, 0.9)" });

        const rightPts = [
          [cx + r * 0.4, cy + r * 0.7],
          [cx + r * 1.5, cy + r * 0.6],
          [cx + r * 0.9, cy - r * 0.7],
        ];
        drawTri(rightPts, "rgba(247, 160, 74, 0.12)", "rgba(247, 160, 74, 0.35)");

        const rxc = (rightPts[0][0] + rightPts[1][0] + rightPts[2][0]) / 3;
        const ryc = (rightPts[0][1] + rightPts[1][1] + rightPts[2][1]) / 3;
        ctx.strokeStyle = "rgba(247, 160, 74, 0.6)";
        ctx.lineWidth = 2.5;
        const xr = 12;
        ctx.beginPath();
        ctx.moveTo(rxc - xr, ryc - xr);
        ctx.lineTo(rxc + xr, ryc + xr);
        ctx.moveTo(rxc + xr, ryc - xr);
        ctx.lineTo(rxc - xr, ryc + xr);
        ctx.stroke();

        drawCanvasChip(ctx, "back \u2192 culled", cx + r * 0.9, cy + r * 1.2, { fontSize: Math.max(9, width * 0.01), background: "rgba(247, 160, 74, 0.12)", border: "rgba(247, 160, 74, 0.35)", color: "rgba(247, 160, 74, 0.8)" });

        ctx.fillStyle = "rgba(239, 245, 247, 0.76)";
        ctx.font = `${Math.max(10, width * 0.0108)}px "Avenir Next", "Segoe UI", sans-serif`;
        drawTextLines(ctx, ["Back-face culling skips ~half the triangles", "for closed objects. Saves fragment work."], rect.x + 14, rect.y + rect.height - 38, 15);
      })(panels[1]);

      // Panel 3: Shared vertices
      (function (rect) {
        drawLessonCanvasPanel(ctx, rect, "3. Shared vertices (index buffer)", width);
        const cx = rect.x + rect.width * 0.5;
        const cy = rect.y + rect.height * 0.48;
        const r = Math.min(rect.width, rect.height) * 0.24;

        const A = [cx - r, cy + r * 0.6];
        const B = [cx + r, cy + r * 0.6];
        const C = [cx - r, cy - r * 0.6];
        const D = [cx + r, cy - r * 0.6];

        drawTri([A, B, C], "rgba(115, 221, 213, 0.12)", "rgba(115, 221, 213, 0.5)");
        drawTri([C, B, D], "rgba(247, 200, 74, 0.12)", "rgba(247, 200, 74, 0.5)");

        ctx.strokeStyle = "rgba(239, 245, 247, 0.7)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(B[0], B[1]);
        ctx.lineTo(C[0], C[1]);
        ctx.stroke();

        drawVertex(A[0], A[1], "0", "rgba(115, 221, 213, 0.9)");
        drawVertex(B[0], B[1], "1", "rgba(239, 245, 247, 0.95)");
        drawVertex(C[0], C[1], "2", "rgba(239, 245, 247, 0.95)");
        drawVertex(D[0], D[1], "3", "rgba(247, 200, 74, 0.9)");

        ctx.fillStyle = "rgba(239, 245, 247, 0.76)";
        ctx.font = `${Math.max(10, width * 0.0108)}px "Avenir Next", "Segoe UI", sans-serif`;
        drawTextLines(ctx, ["4 vertices + 6 indices instead of 6 vertices.", "Vertices 1 and 2 (bright edge) are shared."], rect.x + 14, rect.y + rect.height - 38, 15);
      })(panels[2]);

      // Panel 4: Edge adjacency
      (function (rect) {
        drawLessonCanvasPanel(ctx, rect, "4. Edge adjacency", width);
        const cx = rect.x + rect.width * 0.5;
        const cy = rect.y + rect.height * 0.48;
        const r = Math.min(rect.width, rect.height) * 0.26;

        const center = [cx, cy];
        const ring = [];
        const count = 5;
        for (let i = 0; i < count; i++) {
          const ang = (i / count) * Math.PI * 2 - Math.PI * 0.5;
          ring.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
        }

        const highlightEdge = Math.floor((phase * 0.5) % count);

        for (let i = 0; i < count; i++) {
          const next = (i + 1) % count;
          const isHighlight = i === highlightEdge || i === (highlightEdge + count - 1) % count;
          const fill = isHighlight ? "rgba(115, 221, 213, 0.2)" : "rgba(255, 255, 255, 0.04)";
          const stroke = isHighlight ? "rgba(115, 221, 213, 0.7)" : "rgba(255, 255, 255, 0.2)";
          drawTri([center, ring[i], ring[next]], fill, stroke);
        }

        ctx.strokeStyle = "rgba(247, 200, 74, 0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(center[0], center[1]);
        ctx.lineTo(ring[highlightEdge][0], ring[highlightEdge][1]);
        ctx.stroke();

        drawVertex(center[0], center[1], "", "rgba(239, 245, 247, 0.9)");
        for (let i = 0; i < count; i++) {
          drawVertex(ring[i][0], ring[i][1], "", "rgba(239, 245, 247, 0.6)");
        }

        ctx.fillStyle = "rgba(239, 245, 247, 0.76)";
        ctx.font = `${Math.max(10, width * 0.0108)}px "Avenir Next", "Segoe UI", sans-serif`;
        drawTextLines(ctx, ["An edge (gold) connects two adjacent triangles.", "Knowing neighbors enables smooth normals."], rect.x + 14, rect.y + rect.height - 38, 15);
      })(panels[3]);
    },
  });
}

function setupShaderVertexUseDemo() {
  const canvas = document.getElementById("shader-vertex-use-canvas");
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
      const phase = prefersReducedMotion ? 0.9 : time * 0.82;
      const margin = 18;
      const gap = 14;
      const panelWidth = (width - margin * 2 - gap) / 2;
      const panelHeight = height - margin * 2;
      const leftRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const rightRect = { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };

      function drawMesh(rect, moved) {
        drawLessonCanvasPanel(ctx, rect, moved ? "Vertex moved" : "Original", width);
        const cols = 11;
        const rows = 5;
        const inner = { x: rect.x + 14, y: rect.y + 36, width: rect.width - 28, height: rect.height - 50 };

        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        for (let row = 0; row < rows; row += 1) {
          ctx.beginPath();
          for (let col = 0; col < cols; col += 1) {
            const u = col / (cols - 1);
            const v = row / (rows - 1);
            const x = inner.x + u * inner.width;
            const yBase = inner.y + inner.height * (0.18 + v * 0.62);
            const wave = moved ? Math.sin(u * TAU * 1.4 + phase * 2.1) * inner.height * 0.12 : 0;
            const y = yBase + wave;
            if (col === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#0f2232", "#173245");
      drawMesh(leftRect, false);
      drawMesh(rightRect, true);
    },
  });
}

function setupShaderFragmentUseDemo() {
  const canvas = document.getElementById("shader-fragment-use-canvas");
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
      const phase = prefersReducedMotion ? 1.0 : time * 0.86;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const inner = { x: rect.x + 18, y: rect.y + 42, width: rect.width - 36, height: rect.height - 60 };
      const stripeCount = 10;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#0f2232", "#173245");
      drawLessonCanvasPanel(ctx, rect, "Fragment pattern", width);

      ctx.fillStyle = "rgba(12, 26, 36, 0.8)";
      ctx.fillRect(inner.x, inner.y, inner.width, inner.height);
      for (let index = 0; index < stripeCount; index += 1) {
        const t = index / Math.max(stripeCount - 1, 1);
        const x = inner.x + t * inner.width;
        const wave = Math.sin(t * TAU * 3 + phase * 2.8) * 0.5 + 0.5;
        ctx.fillStyle = rgbToCss([0.2 + wave * 0.55, 0.42 + wave * 0.28, 0.58 + (1 - wave) * 0.18]);
        ctx.fillRect(x - inner.width / stripeCount * 0.35, inner.y, inner.width / stripeCount * 0.7, inner.height);
      }
      ctx.strokeStyle = "rgba(239, 245, 247, 0.26)";
      ctx.lineWidth = Math.max(1.6, width * 0.0024);
      ctx.strokeRect(inner.x, inner.y, inner.width, inner.height);
    },
  });
}

function setupShaderUniformUseDemo() {
  const canvas = document.getElementById("shader-uniform-use-canvas");
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
      const phase = prefersReducedMotion ? 0.8 : time * 1.2;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const centers = [0.24, 0.5, 0.76].map((t) => rect.x + rect.width * t);
      const pulse = 0.35 + (Math.sin(phase) * 0.5 + 0.5) * 0.65;
      const color = rgbToCss([0.24 + pulse * 0.62, 0.48 + pulse * 0.24, 0.72 - pulse * 0.14]);
      const fontSize = Math.max(10, width * 0.013);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#0f2232", "#173245");
      drawLessonCanvasPanel(ctx, rect, "Shared uniform", width);

      centers.forEach((centerX) => {
        const size = rect.height * (0.16 + pulse * 0.06);
        ctx.fillStyle = color;
        ctx.fillRect(centerX - size * 0.5, rect.y + rect.height * 0.46 - size * 0.5, size, size);
        ctx.strokeStyle = "rgba(239, 245, 247, 0.24)";
        ctx.lineWidth = Math.max(1.4, width * 0.0022);
        ctx.strokeRect(centerX - size * 0.5, rect.y + rect.height * 0.46 - size * 0.5, size, size);
      });
      drawCanvasChip(ctx, "uTime", rect.x + rect.width - 12, rect.y + 16, {
        align: "right",
        fontSize,
        color: "rgba(255, 223, 132, 0.98)",
      });
    },
  });
}

function setupShaderVaryingUseDemo() {
  const canvas = document.getElementById("shader-varying-use-canvas");
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
      const phase = prefersReducedMotion ? 1.0 : time * 0.72;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const triangle = [
        [rect.x + rect.width * 0.14, rect.y + rect.height * 0.78],
        [rect.x + rect.width * 0.48, rect.y + rect.height * 0.22],
        [rect.x + rect.width * 0.84, rect.y + rect.height * (0.72 + Math.sin(phase) * 0.04)],
      ];
      const colors = [
        [0.96, 0.42, 0.36],
        [0.2, 0.84, 0.76],
        [0.36, 0.58, 0.98],
      ];
      const sample = [
        triangle[0][0] * 0.28 + triangle[1][0] * 0.36 + triangle[2][0] * 0.36,
        triangle[0][1] * 0.28 + triangle[1][1] * 0.36 + triangle[2][1] * 0.36,
      ];

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#0f2232", "#173245");
      drawLessonCanvasPanel(ctx, rect, "Interpolated varying", width);

      const step = Math.max(6, Math.floor(Math.min(rect.width, rect.height) * 0.045));
      for (let y = rect.y + 36; y < rect.y + rect.height - 10; y += step) {
        for (let x = rect.x + 10; x < rect.x + rect.width - 10; x += step) {
          const point = [x + step * 0.5, y + step * 0.5];
          const bary = barycentricCoordinates(point, triangle[0], triangle[1], triangle[2]);
          if (!bary || bary.some((value) => value < 0)) {
            continue;
          }
          const mixed = [0, 0, 0];
          for (let index = 0; index < 3; index += 1) {
            mixed[0] += colors[index][0] * bary[index];
            mixed[1] += colors[index][1] * bary[index];
            mixed[2] += colors[index][2] * bary[index];
          }
          ctx.fillStyle = rgbToCss(mixed);
          ctx.fillRect(x, y, step + 1, step + 1);
        }
      }

      ctx.strokeStyle = "rgba(239, 245, 247, 0.22)";
      ctx.lineWidth = Math.max(1.4, width * 0.0022);
      ctx.beginPath();
      ctx.moveTo(triangle[0][0], triangle[0][1]);
      ctx.lineTo(triangle[1][0], triangle[1][1]);
      ctx.lineTo(triangle[2][0], triangle[2][1]);
      ctx.closePath();
      ctx.stroke();

      triangle.forEach((point, index) => {
        drawCanvasDot(ctx, point, Math.max(6, width * 0.007), rgbToCss(colors[index]));
      });
      drawCanvasDot(ctx, sample, Math.max(6, width * 0.007), "rgba(255, 245, 216, 0.98)");
    },
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
  setupCodeLab({
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
    levels: [
      {
        id: "guided", label: "Guided",
        source: "# Change wave_height to see the mesh deform\nwave_height = 0.32\nwave_density = 12\ncolor_shift = 0.44\ntime = 0.6",
        instructions: "Increase wave_height to exaggerate the displacement. Change time to slide the animation forward or back.",
      },
      {
        id: "challenge", label: "Challenge",
        source: "# Goal: make the center wave offset exceed 0.25\nwave_height = 0.10\nwave_density = 6\ncolor_shift = 0.44\ntime = 0.6",
        instructions: "Adjust wave_height and wave_density so the center vertex displacement exceeds 0.25.",
        target: { match(derived) { return Math.abs(derived.centerWave) > 0.25; } },
      },
      {
        id: "explore", label: "Explore",
        source: "wave_height = 0.32\nwave_density = 12\ncolor_shift = 0.44\ntime = 0.6",
        instructions: "Try expressions like wave_height = sin(0.8) * 0.5 or wave_density = 6 + 8.",
      },
    ],
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


function initialize() {
  initializePage({
    canvasSetups: [
      ["shader-canvas", setupShaderDemo],
      ["shader-fluid-canvas", setupShaderFluidDemo],
      ["shader-dataflow-canvas", setupShaderDataflowDemo],
      ["mesh-data-canvas", setupMeshDataDemo],
      ["shader-vertex-use-canvas", setupShaderVertexUseDemo],
      ["shader-fragment-use-canvas", setupShaderFragmentUseDemo],
      ["shader-uniform-use-canvas", setupShaderUniformUseDemo],
      ["shader-varying-use-canvas", setupShaderVaryingUseDemo],
      ["shader-code-canvas", setupShaderCodeLab],
      ["shader-probe-canvas", setupShaderProbeDemo]
    ],
    controls: [...Object.values(shaderControls), ...Object.values(computeShaderControls), ...Object.values(shaderProbeControls)],
    extraSetup: [setupShaderLiveLabTabs, setupShaderFluidTabs],
  });
}

initialize();
