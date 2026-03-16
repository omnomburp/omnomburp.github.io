const textureControls = getElementsById({
  scale: "texture-scale",
  tilt: "texture-tilt",
  linear: "texture-linear"
});

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
  setupCodeLab({
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
    levels: [
      {
        id: "guided", label: "Guided",
        source: "# Change uv to move the sample point\nuv = vec2(0.62, 0.34)\nuv_scale = 6\nlinear_filter = true",
        instructions: "Move uv around to sample different texels. Toggle linear_filter to see the difference between nearest and bilinear sampling.",
      },
      {
        id: "challenge", label: "Challenge",
        source: "# Goal: land exactly on texel (3, 3) with nearest filter\nuv = vec2(0.62, 0.34)\nuv_scale = 1\nlinear_filter = false",
        instructions: "With linear_filter = false and uv_scale = 1, set uv so the nearest texel is (3, 3).",
        target: { match(derived) { return !derived.values.linear_filter && derived.nearest[0] === 3 && derived.nearest[1] === 3; } },
      },
      {
        id: "explore", label: "Explore",
        source: "uv = vec2(0.62, 0.34)\nuv_scale = 6\nlinear_filter = true",
        instructions: "Try expressions like uv = vec2(sin(1.0) * 0.5 + 0.5, cos(0.5) * 0.5 + 0.5).",
      },
    ],
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


function initialize() {
  initializePage({
    canvasSetups: [
      ["texture-code-canvas", setupTextureCodeLab],
      ["sampling-story-canvas", setupSamplingStoryDemo],
      ["mipmap-story-canvas", setupMipmapStoryDemo],
      ["texture-canvas", setupTextureDemo]
    ],
    controls: [...Object.values(textureControls)],
    extraSetup: [],
  });
}

initialize();
