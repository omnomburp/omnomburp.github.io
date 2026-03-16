const colorControls = getElementsById({
  exposure: "color-exposure",
  gamma: "color-gamma",
  tonemap: "color-tonemap"
});

const toneCurveControls = getElementsById({
  exposure: "tone-curve-exposure",
  reinhard: "tone-curve-reinhard",
  aces: "tone-curve-aces"
});

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
  setupCodeLab({
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
    levels: [
      {
        id: "guided", label: "Guided",
        source: "# Raise exposure to push values past 1.0\nexposure = 1.0\nscene_peak = 3.8\ntone_map = true\ngamma = 2.2",
        instructions: "Raise exposure above 1 to see bright values clip. Toggle tone_map to false to see hard clipping vs smooth compression.",
      },
      {
        id: "challenge", label: "Challenge",
        source: "# Goal: display peak above 0.90 with tone mapping ON\nexposure = 1.0\nscene_peak = 3.8\ntone_map = true\ngamma = 2.2",
        instructions: "With tone_map = true, adjust exposure so the brightest display sample exceeds 0.90.",
        target: { match(derived) { return derived.values.tone_map && derived.displaySamples[derived.displaySamples.length - 1] > 0.90; } },
      },
      {
        id: "explore", label: "Explore",
        source: "exposure = 1.0\nscene_peak = 3.8\ntone_map = true\ngamma = 2.2",
        instructions: "Try expressions like exposure = pow(2, 1.5) or gamma = 1.0 + 1.2.",
      },
    ],
  });
}


function setupToneCurveDemo() {
  const canvas = document.getElementById("tone-curve-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) return;

  const samplePoints = [
    { label: "shadow", value: 0.15 },
    { label: "midtone", value: 0.5 },
    { label: "highlight", value: 1.5 },
    { label: "bright sky", value: 3.0 },
    { label: "sun", value: 5.0 },
  ];

  function reinhard(x) {
    return x / (1 + x);
  }

  function aces(x) {
    return (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      drawLessonCanvasBackground(ctx, w, h);

      const exposureVal = parseFloat(toneCurveControls.exposure?.value ?? 100) / 100;
      const showReinhard = toneCurveControls.reinhard?.checked ?? true;
      const showAces = toneCurveControls.aces?.checked ?? false;

      const pad = { left: Math.max(40, w * 0.09), right: 20, top: 20, bottom: Math.max(34, h * 0.1) };
      const graphW = w - pad.left - pad.right;
      const graphH = h - pad.top - pad.bottom;
      const maxX = 5;
      const maxY = 1.15;

      function toScreen(xVal, yVal) {
        return [
          pad.left + (xVal / maxX) * graphW,
          pad.top + graphH - (yVal / maxY) * graphH,
        ];
      }

      // axes
      ctx.strokeStyle = "rgba(239, 245, 247, 0.25)";
      ctx.lineWidth = Math.max(1, w * 0.002);
      ctx.beginPath();
      const origin = toScreen(0, 0);
      const xEnd = toScreen(maxX, 0);
      const yEnd = toScreen(0, maxY);
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(xEnd[0], xEnd[1]);
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(yEnd[0], yEnd[1]);
      ctx.stroke();

      // grid lines
      ctx.strokeStyle = "rgba(239, 245, 247, 0.07)";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 5; i++) {
        const p = toScreen(i, 0);
        const pTop = toScreen(i, maxY);
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(pTop[0], pTop[1]);
        ctx.stroke();
      }
      for (let i = 1; i <= 4; i++) {
        const yVal = i * 0.25;
        const p = toScreen(0, yVal);
        const pRight = toScreen(maxX, yVal);
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(pRight[0], pRight[1]);
        ctx.stroke();
      }

      // y=1 reference line
      ctx.strokeStyle = "rgba(239, 245, 247, 0.18)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      const y1Left = toScreen(0, 1);
      const y1Right = toScreen(maxX, 1);
      ctx.beginPath();
      ctx.moveTo(y1Left[0], y1Left[1]);
      ctx.lineTo(y1Right[0], y1Right[1]);
      ctx.stroke();
      ctx.setLineDash([]);

      // axis labels
      const labelFont = `${Math.max(10, w * 0.02)}px "SFMono-Regular","Menlo",monospace`;
      ctx.font = labelFont;
      ctx.fillStyle = "rgba(239, 245, 247, 0.5)";
      ctx.textAlign = "center";
      for (let i = 0; i <= 5; i++) {
        const p = toScreen(i, 0);
        ctx.fillText(i.toString(), p[0], p[1] + 16);
      }
      ctx.textAlign = "right";
      for (let i = 0; i <= 4; i++) {
        const yVal = i * 0.25;
        const p = toScreen(0, yVal);
        ctx.fillText(yVal.toFixed(2), p[0] - 6, p[1] + 4);
      }

      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(239, 245, 247, 0.4)";
      ctx.fillText("input HDR value", pad.left + graphW * 0.5, h - 6);
      ctx.save();
      ctx.translate(12, pad.top + graphH * 0.5);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("output", 0, 0);
      ctx.restore();

      // identity line (dashed white)
      ctx.strokeStyle = "rgba(239, 245, 247, 0.2)";
      ctx.lineWidth = Math.max(1, w * 0.002);
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      const steps = 80;
      for (let i = 0; i <= steps; i++) {
        const xVal = (i / steps) * maxX;
        const yVal = Math.min(xVal * exposureVal, maxY);
        const p = toScreen(xVal, yVal);
        if (i === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      const curveLineW = Math.max(2, w * 0.004);

      // Reinhard curve
      if (showReinhard) {
        ctx.strokeStyle = "rgba(115, 221, 213, 0.9)";
        ctx.lineWidth = curveLineW;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const xVal = (i / steps) * maxX;
          const mapped = reinhard(xVal * exposureVal);
          const p = toScreen(xVal, Math.min(mapped, maxY));
          if (i === 0) ctx.moveTo(p[0], p[1]);
          else ctx.lineTo(p[0], p[1]);
        }
        ctx.stroke();

        // sample points
        for (const sp of samplePoints) {
          const mapped = reinhard(sp.value * exposureVal);
          const p = toScreen(sp.value, Math.min(mapped, maxY));
          drawCanvasDot(ctx, p, Math.max(4, w * 0.008), "rgba(115, 221, 213, 0.9)", "rgba(255,255,255,0.5)", 1);
        }
      }

      // ACES curve
      if (showAces) {
        ctx.strokeStyle = "rgba(247, 160, 74, 0.9)";
        ctx.lineWidth = curveLineW;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const xVal = (i / steps) * maxX;
          const mapped = clamp(aces(xVal * exposureVal), 0, maxY);
          const p = toScreen(xVal, mapped);
          if (i === 0) ctx.moveTo(p[0], p[1]);
          else ctx.lineTo(p[0], p[1]);
        }
        ctx.stroke();

        for (const sp of samplePoints) {
          const mapped = clamp(aces(sp.value * exposureVal), 0, maxY);
          const p = toScreen(sp.value, mapped);
          drawCanvasDot(ctx, p, Math.max(4, w * 0.008), "rgba(247, 160, 74, 0.9)", "rgba(255,255,255,0.5)", 1);
        }
      }

      // sample point labels (draw once, on whichever active curve is first)
      const activeCurve = showReinhard ? reinhard : showAces ? aces : null;
      if (activeCurve) {
        ctx.font = `${Math.max(9, w * 0.016)}px "SFMono-Regular","Menlo",monospace`;
        ctx.fillStyle = "rgba(239, 245, 247, 0.6)";
        ctx.textAlign = "left";
        for (const sp of samplePoints) {
          const mapped = activeCurve === aces ? clamp(aces(sp.value * exposureVal), 0, maxY) : reinhard(sp.value * exposureVal);
          const p = toScreen(sp.value, Math.min(mapped, maxY));
          ctx.fillText(sp.label, p[0] + 8, p[1] - 6);
        }
      }

      // legend
      const legendY = pad.top + 14;
      const legendFont = `${Math.max(11, w * 0.018)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.font = legendFont;
      ctx.textAlign = "left";
      let legendX = pad.left + 8;

      ctx.fillStyle = "rgba(239, 245, 247, 0.25)";
      ctx.fillRect(legendX, legendY - 1, 16, 2);
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = "rgba(239, 245, 247, 0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(legendX, legendY);
      ctx.lineTo(legendX + 16, legendY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(239, 245, 247, 0.5)";
      ctx.fillText("linear", legendX + 20, legendY + 4);
      legendX += 76;

      if (showReinhard) {
        ctx.fillStyle = "rgba(115, 221, 213, 0.9)";
        ctx.fillRect(legendX, legendY - 1, 16, 3);
        ctx.fillText("Reinhard", legendX + 20, legendY + 4);
        legendX += 90;
      }
      if (showAces) {
        ctx.fillStyle = "rgba(247, 160, 74, 0.9)";
        ctx.fillRect(legendX, legendY - 1, 16, 3);
        ctx.fillText("ACES", legendX + 20, legendY + 4);
      }
    },
  });
}


function initialize() {
  initializePage({
    canvasSetups: [
      ["display-story-canvas", setupDisplayStoryDemo],
      ["tone-curve-canvas", setupToneCurveDemo],
      ["color-code-canvas", setupColorCodeLab],
      ["color-canvas", setupColorDemo]
    ],
    controls: [...Object.values(colorControls), ...Object.values(toneCurveControls)],
    extraSetup: [],
  });
}

initialize();
