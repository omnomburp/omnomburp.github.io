const materialControls = getElementsById({
  specular: "material-specular",
  shininess: "material-shininess",
  light: "material-light"
});

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
  setupCodeLab({
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
    levels: [
      {
        id: "guided", label: "Guided",
        source: "# Rotate the light to see diffuse change\nnormal_angle = 28\nlight_angle = 38\nview_angle = 12\nspecular_strength = 0.48\nshininess = 36",
        instructions: "Move light_angle toward normal_angle to increase diffuse. Raise shininess to tighten the specular highlight.",
      },
      {
        id: "challenge", label: "Challenge",
        source: "# Goal: get specular > 0.40\nnormal_angle = 28\nlight_angle = 38\nview_angle = 12\nspecular_strength = 0.48\nshininess = 36",
        instructions: "Adjust the angles and specular_strength so the specular term exceeds 0.40.",
        target: { match(derived) { return derived.specular > 0.40; } },
      },
      {
        id: "explore", label: "Explore",
        source: "normal_angle = 28\nlight_angle = 38\nview_angle = 12\nspecular_strength = 0.48\nshininess = 36",
        instructions: "Try aligning all three angles. Use expressions like light_angle = normal_angle + 5.",
      },
    ],
  });
}


function initialize() {
  initializePage({
    canvasSetups: [
      ["light-response-canvas", setupLightResponseStoryDemo],
      ["material-code-canvas", setupMaterialCodeLab],
      ["material-canvas", setupMaterialDemo]
    ],
    controls: [...Object.values(materialControls)],
    extraSetup: [],
  });
}

initialize();
