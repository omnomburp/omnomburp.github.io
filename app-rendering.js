const pipelineControls = getElementsById({
  separation: "pipeline-separation",
  spin: "pipeline-spin",
  depth: "pipeline-depth"
});

function setupRenderCoverageUseDemo() {
  const canvas = document.getElementById("render-coverage-use-canvas");
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
      const phase = prefersReducedMotion ? 0.82 : time * 0.84;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const inner = { x: rect.x + 18, y: rect.y + 40, width: rect.width - 36, height: rect.height - 56 };
      const columns = 8;
      const rows = 5;
      const triangle = [
        [inner.x + inner.width * 0.14, inner.y + inner.height * 0.78],
        [inner.x + inner.width * 0.48, inner.y + inner.height * (0.18 + Math.sin(phase) * 0.06)],
        [inner.x + inner.width * 0.86, inner.y + inner.height * 0.68],
      ];

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#102535", "#183446");
      drawLessonCanvasPanel(ctx, rect, "Coverage", width);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      for (let col = 0; col <= columns; col += 1) {
        const x = inner.x + (inner.width / columns) * col;
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

      ctx.fillStyle = "rgba(159, 215, 255, 0.18)";
      ctx.strokeStyle = "rgba(159, 215, 255, 0.9)";
      ctx.lineWidth = Math.max(1.6, width * 0.0024);
      ctx.beginPath();
      ctx.moveTo(triangle[0][0], triangle[0][1]);
      ctx.lineTo(triangle[1][0], triangle[1][1]);
      ctx.lineTo(triangle[2][0], triangle[2][1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < columns; col += 1) {
          const cellX = inner.x + (inner.width / columns) * col;
          const cellY = inner.y + (inner.height / rows) * row;
          const sample = [cellX + inner.width / columns / 2, cellY + inner.height / rows / 2];
          const bary = barycentricCoordinates(sample, triangle[0], triangle[1], triangle[2]);
          const covered = bary && bary.every((value) => value >= 0);
          if (covered) {
            ctx.fillStyle = "rgba(115, 221, 213, 0.2)";
            ctx.fillRect(cellX + 2, cellY + 2, inner.width / columns - 4, inner.height / rows - 4);
          }
          drawCanvasDot(ctx, sample, covered ? 2.6 : 2.2, covered ? "rgba(255, 245, 216, 0.96)" : "rgba(255, 255, 255, 0.3)");
        }
      }
    },
  });
}

function setupRenderBarycentricUseDemo() {
  const canvas = document.getElementById("render-barycentric-use-canvas");
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
      const phase = prefersReducedMotion ? 1.0 : time * 0.76;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const triangle = [
        [rect.x + rect.width * 0.16, rect.y + rect.height * 0.8],
        [rect.x + rect.width * 0.46, rect.y + rect.height * 0.22],
        [rect.x + rect.width * 0.82, rect.y + rect.height * (0.72 + Math.sin(phase) * 0.04)],
      ];
      let weights = [
        0.26 + Math.sin(phase * 0.8) * 0.1,
        0.38 + Math.cos(phase * 1.02) * 0.08,
        0.36 + Math.sin(phase * 1.3 + 0.8) * 0.08,
      ];
      const total = weights[0] + weights[1] + weights[2];
      weights = weights.map((value) => value / total);
      const sample = [
        triangle[0][0] * weights[0] + triangle[1][0] * weights[1] + triangle[2][0] * weights[2],
        triangle[0][1] * weights[0] + triangle[1][1] * weights[1] + triangle[2][1] * weights[2],
      ];
      const colors = [
        [0.96, 0.42, 0.36],
        [0.2, 0.84, 0.76],
        [0.36, 0.58, 0.98],
      ];
      const mixed = [0, 0, 0];
      for (let index = 0; index < 3; index += 1) {
        mixed[0] += colors[index][0] * weights[index];
        mixed[1] += colors[index][1] * weights[index];
        mixed[2] += colors[index][2] * weights[index];
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#102535", "#183446");
      drawLessonCanvasPanel(ctx, rect, "Interpolation", width);

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
      drawCanvasDot(ctx, sample, Math.max(6, width * 0.007), rgbToCss(mixed), "rgba(255, 245, 216, 0.94)", Math.max(1.5, width * 0.0022));

      const swatch = { x: rect.x + rect.width * 0.62, y: rect.y + rect.height * 0.2, size: rect.width * 0.16 };
      ctx.fillStyle = rgbToCss(mixed);
      ctx.fillRect(swatch.x, swatch.y, swatch.size, swatch.size);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.strokeRect(swatch.x, swatch.y, swatch.size, swatch.size);
    },
  });
}

function setupRenderDepthUseDemo() {
  const canvas = document.getElementById("render-depth-use-canvas");
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
      const phase = prefersReducedMotion ? 1.08 : time * 0.78;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const frontDepth = 0.26 + (Math.sin(phase * 1.04) + 1) * 0.05;
      const backDepth = 0.62 + (Math.cos(phase * 0.82) + 1) * 0.04;
      const winnerFront = frontDepth < backDepth;
      const inner = { x: rect.x + 16, y: rect.y + 38, width: rect.width * 0.54, height: rect.height - 54 };
      const barX = rect.x + rect.width * 0.68;
      const barY = rect.y + rect.height * 0.46;
      const barWidth = rect.width * 0.22;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#102535", "#183446");
      drawLessonCanvasPanel(ctx, rect, "Depth winner", width);

      ctx.fillStyle = "rgba(115, 221, 213, 0.28)";
      ctx.fillRect(inner.x + inner.width * 0.16, inner.y + inner.height * 0.12, inner.width * 0.56, inner.height * 0.58);
      ctx.fillStyle = "rgba(247, 160, 74, 0.34)";
      ctx.fillRect(inner.x + inner.width * 0.34, inner.y + inner.height * 0.24, inner.width * 0.5, inner.height * 0.56);
      ctx.strokeStyle = "rgba(239, 245, 247, 0.18)";
      ctx.lineWidth = Math.max(1.4, width * 0.0022);
      ctx.strokeRect(inner.x + inner.width * 0.16, inner.y + inner.height * 0.12, inner.width * 0.56, inner.height * 0.58);
      ctx.strokeRect(inner.x + inner.width * 0.34, inner.y + inner.height * 0.24, inner.width * 0.5, inner.height * 0.56);

      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(barX, barY, barWidth, 10);
      const frontX = barX + barWidth * frontDepth;
      const backX = barX + barWidth * backDepth;
      drawCanvasDot(ctx, [backX, barY + 5], 5.5, "rgba(115, 221, 213, 0.9)");
      drawCanvasDot(ctx, [frontX, barY + 5], 7, "rgba(247, 160, 74, 0.96)");
      drawCanvasChip(ctx, winnerFront ? "orange wins" : "teal wins", rect.x + rect.width - 12, rect.y + 16, {
        align: "right",
        fontSize: Math.max(10, width * 0.013),
        color: winnerFront ? "rgba(247, 160, 74, 0.98)" : "rgba(115, 221, 213, 0.98)",
      });
    },
  });
}

function setupRenderSamplingUseDemo() {
  const canvas = document.getElementById("render-sampling-use-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const size = 4;

  function texelColor(x, y) {
    return [0.18 + (x / (size - 1)) * 0.68, 0.24 + (y / (size - 1)) * 0.56, 0.74 - ((x + y) / (size * 2)) * 0.34];
  }

  function sampleNearest(u, v) {
    const x = Math.min(size - 1, Math.max(0, Math.round(u * (size - 1))));
    const y = Math.min(size - 1, Math.max(0, Math.round(v * (size - 1))));
    return texelColor(x, y);
  }

  function sampleLinear(u, v) {
    const x = clamp(u * (size - 1), 0, size - 1);
    const y = clamp(v * (size - 1), 0, size - 1);
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(size - 1, x0 + 1);
    const y1 = Math.min(size - 1, y0 + 1);
    const tx = x - x0;
    const ty = y - y0;
    const c00 = texelColor(x0, y0);
    const c10 = texelColor(x1, y0);
    const c01 = texelColor(x0, y1);
    const c11 = texelColor(x1, y1);
    const top = [lerp(c00[0], c10[0], tx), lerp(c00[1], c10[1], tx), lerp(c00[2], c10[2], tx)];
    const bottom = [lerp(c01[0], c11[0], tx), lerp(c01[1], c11[1], tx), lerp(c01[2], c11[2], tx)];
    return [lerp(top[0], bottom[0], ty), lerp(top[1], bottom[1], ty), lerp(top[2], bottom[2], ty)];
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 0.76 : time * 0.64;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const texRect = { x: rect.x + 16, y: rect.y + 40, width: rect.width * 0.5, height: rect.height - 56 };
      const u = wrapUnit(0.22 + phase * 0.18);
      const v = 0.28 + (Math.sin(phase * 1.08) * 0.5 + 0.5) * 0.48;
      const nearest = sampleNearest(u, v);
      const linear = sampleLinear(u, v);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#102535", "#183446");
      drawLessonCanvasPanel(ctx, rect, "Texture sample", width);

      const cellW = texRect.width / size;
      const cellH = texRect.height / size;
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          ctx.fillStyle = rgbToCss(texelColor(x, y));
          ctx.fillRect(texRect.x + x * cellW, texRect.y + y * cellH, cellW, cellH);
        }
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= size; x += 1) {
        const drawX = texRect.x + x * cellW;
        ctx.beginPath();
        ctx.moveTo(drawX, texRect.y);
        ctx.lineTo(drawX, texRect.y + texRect.height);
        ctx.stroke();
      }
      for (let y = 0; y <= size; y += 1) {
        const drawY = texRect.y + y * cellH;
        ctx.beginPath();
        ctx.moveTo(texRect.x, drawY);
        ctx.lineTo(texRect.x + texRect.width, drawY);
        ctx.stroke();
      }

      const samplePoint = [texRect.x + u * texRect.width, texRect.y + v * texRect.height];
      drawCanvasDot(ctx, samplePoint, 5.5, "rgba(255, 245, 216, 0.96)");
      const swatchX = rect.x + rect.width * 0.66;
      const swatchY = rect.y + 56;
      const swatchSize = rect.width * 0.14;
      ctx.fillStyle = rgbToCss(nearest);
      ctx.fillRect(swatchX, swatchY, swatchSize, swatchSize);
      ctx.fillStyle = rgbToCss(linear);
      ctx.fillRect(swatchX + swatchSize + 18, swatchY, swatchSize, swatchSize);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.strokeRect(swatchX, swatchY, swatchSize, swatchSize);
      ctx.strokeRect(swatchX + swatchSize + 18, swatchY, swatchSize, swatchSize);
      drawCanvasChip(ctx, "N", swatchX + swatchSize * 0.5, swatchY + swatchSize + 18, {
        fontSize: Math.max(10, width * 0.013),
        color: "rgba(247, 160, 74, 0.98)",
      });
      drawCanvasChip(ctx, "L", swatchX + swatchSize + 18 + swatchSize * 0.5, swatchY + swatchSize + 18, {
        fontSize: Math.max(10, width * 0.013),
        color: "rgba(115, 221, 213, 0.98)",
      });
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

function setupFramebufferConceptDemo() {
  const canvas = document.getElementById("framebuffer-concept-canvas");
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

      const phase = prefersReducedMotion ? 0.6 : (Math.sin(time * 0.5) * 0.5 + 0.5);
      const margin = 24;
      const gap = 40;
      const boxW = (width - margin * 2 - gap * 2) / 3;
      const boxH = height - margin * 2 - 50;
      const topY = margin + 36;

      const sceneBox = { x: margin, y: topY, w: boxW, h: boxH };
      const fboBox = { x: margin + boxW + gap, y: topY, w: boxW, h: boxH };
      const screenBox = { x: margin + (boxW + gap) * 2, y: topY, w: boxW, h: boxH };

      function drawBox(box, title, borderColor, fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.w, box.h);
        ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
        ctx.font = `bold ${Math.max(11, width * 0.015)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(title, box.x + 10, box.y - 8);
      }

      drawBox(sceneBox, "Scene geometry", "rgba(115, 221, 213, 0.6)", "rgba(115, 221, 213, 0.06)");

      const sCx = sceneBox.x + sceneBox.w * 0.5;
      const sCy = sceneBox.y + sceneBox.h * 0.5;
      const sR = Math.min(sceneBox.w, sceneBox.h) * 0.18;

      ctx.fillStyle = "rgba(115, 221, 213, 0.3)";
      ctx.fillRect(sCx - sR, sCy - sR * 0.5, sR * 1.4, sR * 1.2);
      ctx.strokeStyle = "rgba(115, 221, 213, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sCx - sR, sCy - sR * 0.5, sR * 1.4, sR * 1.2);

      ctx.fillStyle = "rgba(247, 200, 74, 0.25)";
      ctx.beginPath();
      ctx.arc(sCx + sR * 0.6, sCy - sR * 0.8, sR * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(247, 200, 74, 0.5)";
      ctx.stroke();

      drawBox(fboBox, "Off-screen FBO", "rgba(247, 200, 74, 0.6)", "rgba(247, 200, 74, 0.04)");

      const fCx = fboBox.x + fboBox.w * 0.5;
      const fCy = fboBox.y + fboBox.h * 0.5;
      const fInset = 14;
      ctx.fillStyle = "rgba(247, 200, 74, 0.08)";
      ctx.fillRect(fboBox.x + fInset, fboBox.y + fInset, fboBox.w - fInset * 2, fboBox.h - fInset * 2);
      ctx.strokeStyle = "rgba(247, 200, 74, 0.3)";
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(fboBox.x + fInset, fboBox.y + fInset, fboBox.w - fInset * 2, fboBox.h - fInset * 2);
      ctx.setLineDash([]);

      const ftR = Math.min(fboBox.w, fboBox.h) * 0.14;
      ctx.fillStyle = "rgba(115, 221, 213, 0.2)";
      ctx.fillRect(fCx - ftR, fCy - ftR * 0.3, ftR * 1.2, ftR);
      ctx.fillStyle = "rgba(247, 200, 74, 0.2)";
      ctx.beginPath();
      ctx.arc(fCx + ftR * 0.4, fCy - ftR * 0.6, ftR * 0.45, 0, Math.PI * 2);
      ctx.fill();

      drawCanvasChip(ctx, "texture", fCx, fboBox.y + fboBox.h - 30, { fontSize: Math.max(9, width * 0.011), background: "rgba(247, 200, 74, 0.15)", border: "rgba(247, 200, 74, 0.4)", color: "rgba(247, 200, 74, 0.9)" });

      drawBox(screenBox, "Screen (default FB)", "rgba(180, 140, 255, 0.6)", "rgba(180, 140, 255, 0.04)");

      const scrCx = screenBox.x + screenBox.w * 0.5;
      const scrCy = screenBox.y + screenBox.h * 0.5;
      const scrR = Math.min(screenBox.w, screenBox.h) * 0.16;
      ctx.fillStyle = "rgba(115, 221, 213, 0.25)";
      ctx.fillRect(scrCx - scrR, scrCy - scrR * 0.3, scrR * 1.2, scrR);
      ctx.fillStyle = "rgba(247, 200, 74, 0.2)";
      ctx.beginPath();
      ctx.arc(scrCx + scrR * 0.4, scrCy - scrR * 0.6, scrR * 0.45, 0, Math.PI * 2);
      ctx.fill();

      const arrowY = topY + boxH * 0.5;
      const arrowProgress1 = clamp(phase * 2, 0, 1);
      const arrowProgress2 = clamp(phase * 2 - 0.5, 0, 1);

      const a1Start = [sceneBox.x + sceneBox.w + 6, arrowY];
      const a1End = [fboBox.x - 6, arrowY];
      const a1Cur = [lerp(a1Start[0], a1End[0], arrowProgress1), arrowY];
      ctx.strokeStyle = "rgba(115, 221, 213, 0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(a1Start[0], a1Start[1]);
      ctx.lineTo(a1Cur[0], a1Cur[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (arrowProgress1 > 0.1) {
        drawArrow2d(ctx, [a1Cur[0] - 12, arrowY], a1Cur, "rgba(115, 221, 213, 0.7)", 2);
      }

      drawCanvasChip(ctx, "Pass 1: draw to FBO", (sceneBox.x + sceneBox.w + fboBox.x) * 0.5, arrowY - 16, { fontSize: Math.max(9, width * 0.01), background: "rgba(8, 21, 30, 0.7)" });

      const a2Start = [fboBox.x + fboBox.w + 6, arrowY];
      const a2End = [screenBox.x - 6, arrowY];
      const a2Cur = [lerp(a2Start[0], a2End[0], arrowProgress2), arrowY];
      ctx.strokeStyle = "rgba(247, 200, 74, 0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(a2Start[0], a2Start[1]);
      ctx.lineTo(a2Cur[0], a2Cur[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (arrowProgress2 > 0.1) {
        drawArrow2d(ctx, [a2Cur[0] - 12, arrowY], a2Cur, "rgba(247, 200, 74, 0.7)", 2);
      }

      drawCanvasChip(ctx, "Pass 2: sample texture", (fboBox.x + fboBox.w + screenBox.x) * 0.5, arrowY - 16, { fontSize: Math.max(9, width * 0.01), background: "rgba(8, 21, 30, 0.7)" });
    },
  });
}

function setupMultipassStoryDemo() {
  const canvas = document.getElementById("multipass-story-canvas");
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
      const gap = 14;
      const boxW = (width - margin * 2 - gap * 3) / 4;
      const boxH = height - margin * 2 - 36;
      const topY = margin + 28;

      const passes = [
        { title: "1. Shadow pass", color: "rgba(180, 140, 255, 0.6)", fill: "rgba(180, 140, 255, 0.05)", target: "FBO_shadow", content: "depth" },
        { title: "2. Scene pass", color: "rgba(115, 221, 213, 0.6)", fill: "rgba(115, 221, 213, 0.05)", target: "FBO_scene", content: "color" },
        { title: "3. Post-process", color: "rgba(247, 200, 74, 0.6)", fill: "rgba(247, 200, 74, 0.05)", target: "FBO_bloom", content: "bloom" },
        { title: "4. Composite", color: "rgba(240, 130, 130, 0.6)", fill: "rgba(240, 130, 130, 0.05)", target: "Screen", content: "final" },
      ];

      const activePass = Math.floor((phase * 0.4) % 4);

      for (let i = 0; i < 4; i++) {
        const pass = passes[i];
        const box = { x: margin + i * (boxW + gap), y: topY, w: boxW, h: boxH };
        const isActive = i === activePass;

        ctx.fillStyle = isActive ? pass.fill.replace("0.05", "0.12") : pass.fill;
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.strokeStyle = isActive ? pass.color.replace("0.6", "0.9") : pass.color;
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        ctx.strokeRect(box.x, box.y, box.w, box.h);

        ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
        ctx.font = `bold ${Math.max(10, width * 0.013)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(pass.title, box.x + 8, box.y - 8);

        const ccx = box.x + box.w * 0.5;
        const ccy = box.y + box.h * 0.4;
        const cr = Math.min(box.w, box.h) * 0.2;

        if (pass.content === "depth") {
          for (let row = 0; row < 8; row++) {
            const brightness = 0.2 + (row / 8) * 0.6;
            ctx.fillStyle = `rgba(180, 140, 255, ${brightness * 0.3})`;
            ctx.fillRect(ccx - cr, ccy - cr + row * (cr * 2 / 8), cr * 2, cr * 2 / 8);
          }
        } else if (pass.content === "color") {
          ctx.fillStyle = "rgba(115, 221, 213, 0.2)";
          ctx.fillRect(ccx - cr * 0.8, ccy - cr * 0.3, cr, cr * 0.8);
          ctx.fillStyle = "rgba(247, 200, 74, 0.2)";
          ctx.beginPath();
          ctx.arc(ccx + cr * 0.3, ccy - cr * 0.5, cr * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
          ctx.fillRect(ccx - cr * 0.4, ccy + cr * 0.2, cr * 1.2, cr * 0.3);
        } else if (pass.content === "bloom") {
          for (let ring = 3; ring >= 0; ring--) {
            ctx.fillStyle = `rgba(247, 200, 74, ${0.04 + ring * 0.03})`;
            ctx.beginPath();
            ctx.arc(ccx, ccy, cr * (0.5 + ring * 0.3), 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = "rgba(115, 221, 213, 0.2)";
          ctx.fillRect(ccx - cr * 0.8, ccy - cr * 0.3, cr, cr * 0.8);
          ctx.fillStyle = "rgba(247, 200, 74, 0.15)";
          ctx.beginPath();
          ctx.arc(ccx + cr * 0.3, ccy - cr * 0.5, cr * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(247, 200, 74, 0.06)";
          ctx.beginPath();
          ctx.arc(ccx + cr * 0.3, ccy - cr * 0.5, cr * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }

        drawCanvasChip(ctx, pass.target, ccx, box.y + box.h - 20, {
          fontSize: Math.max(8, width * 0.009),
          background: "rgba(8, 21, 30, 0.7)",
          border: pass.color.replace("0.6", "0.3"),
          color: pass.color.replace("0.6", "0.9"),
        });

        if (i < 3) {
          const arrowStartX = box.x + box.w + 4;
          const arrowEndX = box.x + box.w + gap - 4;
          const arrowMidY = topY + boxH * 0.5;
          drawArrow2d(ctx, [arrowStartX, arrowMidY], [arrowEndX, arrowMidY], "rgba(239, 245, 247, 0.3)", 1.5);
        }

        if (i === 1) {
          ctx.fillStyle = "rgba(180, 140, 255, 0.5)";
          ctx.font = `${Math.max(8, width * 0.009)}px "Avenir Next", "Segoe UI", sans-serif`;
          ctx.fillText("reads shadow", box.x + 6, box.y + box.h - 40);
        } else if (i === 2) {
          ctx.fillStyle = "rgba(115, 221, 213, 0.5)";
          ctx.font = `${Math.max(8, width * 0.009)}px "Avenir Next", "Segoe UI", sans-serif`;
          ctx.fillText("reads scene", box.x + 6, box.y + box.h - 40);
        } else if (i === 3) {
          ctx.fillStyle = "rgba(239, 245, 247, 0.4)";
          ctx.font = `${Math.max(8, width * 0.009)}px "Avenir Next", "Segoe UI", sans-serif`;
          ctx.fillText("reads scene + bloom", box.x + 6, box.y + box.h - 40);
        }
      }
    },
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
  setupCodeLab({
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
    levels: [
      {
        id: "guided", label: "Guided",
        source: "# Change depth values to see which fragment wins\nfront_depth = 0.34\nback_depth = 0.62\nfront_color = vec3(0.22, 0.74, 0.94)\nback_color = vec3(0.96, 0.62, 0.34)\ndepth_test = true",
        instructions: "Swap front_depth and back_depth to reverse which fragment is closer. Toggle depth_test to false to see draw-order win.",
      },
      {
        id: "challenge", label: "Challenge",
        source: "# Goal: make the back (orange) fragment win WITH depth test on\nfront_depth = 0.34\nback_depth = 0.62\nfront_color = vec3(0.22, 0.74, 0.94)\nback_color = vec3(0.96, 0.62, 0.34)\ndepth_test = true",
        instructions: "Keep depth_test = true but make the back fragment win the depth test.",
        target: { match(derived) { return derived.values.depth_test && derived.winnerLabel === "Back fragment"; } },
      },
      {
        id: "explore", label: "Explore",
        source: "front_depth = 0.34\nback_depth = 0.62\nfront_color = vec3(0.22, 0.74, 0.94)\nback_color = vec3(0.96, 0.62, 0.34)\ndepth_test = true",
        instructions: "Try expressions like front_depth = 0.2 + 0.3 or front_color = vec3(sin(1.0), 0.5, cos(0.3)).",
      },
    ],
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


function setupBarycentricInteractiveDemo() {
  const canvas = document.getElementById("barycentric-interactive-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) return;

  let mousePos = null;

  function canvasMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const x = (e.clientX - rect.left) * pixelRatio;
    const y = (e.clientY - rect.top) * pixelRatio;
    return [x, y];
  }

  canvas.addEventListener("mousemove", (e) => {
    mousePos = canvasMousePos(e);
    markAllDemosDirty();
  });
  canvas.addEventListener("mouseleave", () => {
    mousePos = null;
    markAllDemosDirty();
  });
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) {
      mousePos = canvasMousePos(touch);
      markAllDemosDirty();
    }
  }, { passive: false });
  canvas.addEventListener("touchend", () => {
    mousePos = null;
    markAllDemosDirty();
  });

  const vertexColors = [
    [0.92, 0.22, 0.20],
    [0.20, 0.78, 0.35],
    [0.22, 0.52, 0.95],
  ];

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

      const margin = Math.max(40, w * 0.08);
      const triA = [w * 0.5, margin];
      const triB = [margin, h - margin];
      const triC = [w - margin, h - margin];

      // draw sub-triangles faintly if cursor is inside
      let bary = null;
      let inside = false;
      if (mousePos) {
        bary = barycentricCoordinates(mousePos, triA, triB, triC);
        if (bary && bary[0] >= -0.01 && bary[1] >= -0.01 && bary[2] >= -0.01) {
          inside = true;
        }
      }

      if (inside && bary) {
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = rgbToCss(vertexColors[0]);
        ctx.beginPath();
        ctx.moveTo(mousePos[0], mousePos[1]);
        ctx.lineTo(triB[0], triB[1]);
        ctx.lineTo(triC[0], triC[1]);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = rgbToCss(vertexColors[1]);
        ctx.beginPath();
        ctx.moveTo(mousePos[0], mousePos[1]);
        ctx.lineTo(triA[0], triA[1]);
        ctx.lineTo(triC[0], triC[1]);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = rgbToCss(vertexColors[2]);
        ctx.beginPath();
        ctx.moveTo(mousePos[0], mousePos[1]);
        ctx.lineTo(triA[0], triA[1]);
        ctx.lineTo(triB[0], triB[1]);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // main triangle outline
      ctx.strokeStyle = "rgba(239, 245, 247, 0.35)";
      ctx.lineWidth = Math.max(1.5, w * 0.003);
      ctx.beginPath();
      ctx.moveTo(triA[0], triA[1]);
      ctx.lineTo(triB[0], triB[1]);
      ctx.lineTo(triC[0], triC[1]);
      ctx.closePath();
      ctx.stroke();

      // vertex dots
      const dotR = Math.max(6, w * 0.014);
      drawCanvasDot(ctx, triA, dotR, rgbToCss(vertexColors[0]), "rgba(255,255,255,0.5)", 1.5);
      drawCanvasDot(ctx, triB, dotR, rgbToCss(vertexColors[1]), "rgba(255,255,255,0.5)", 1.5);
      drawCanvasDot(ctx, triC, dotR, rgbToCss(vertexColors[2]), "rgba(255,255,255,0.5)", 1.5);

      const font = `bold ${Math.max(12, w * 0.024)}px "Avenir Next","Segoe UI",sans-serif`;
      const smallFont = `${Math.max(11, w * 0.02)}px "SFMono-Regular","Menlo",monospace`;
      ctx.textAlign = "center";

      // vertex labels
      ctx.font = font;
      ctx.fillStyle = rgbToCss(vertexColors[0]);
      ctx.fillText("A", triA[0], triA[1] - dotR - 6);
      ctx.fillStyle = rgbToCss(vertexColors[1]);
      ctx.fillText("B", triB[0] - dotR - 10, triB[1] + 4);
      ctx.fillStyle = rgbToCss(vertexColors[2]);
      ctx.fillText("C", triC[0] + dotR + 10, triC[1] + 4);

      if (inside && bary) {
        const w0 = clamp(bary[0], 0, 1);
        const w1 = clamp(bary[1], 0, 1);
        const w2 = clamp(bary[2], 0, 1);

        // interpolated color
        const blendR = w0 * vertexColors[0][0] + w1 * vertexColors[1][0] + w2 * vertexColors[2][0];
        const blendG = w0 * vertexColors[0][1] + w1 * vertexColors[1][1] + w2 * vertexColors[2][1];
        const blendB = w0 * vertexColors[0][2] + w1 * vertexColors[1][2] + w2 * vertexColors[2][2];
        const blendColor = [blendR, blendG, blendB];

        // cursor dot
        drawCanvasDot(ctx, mousePos, dotR * 0.9, rgbToCss(blendColor), "rgba(255,255,255,0.8)", 2);

        // weight labels near each vertex
        ctx.font = smallFont;
        ctx.fillStyle = "rgba(239,245,247,0.92)";
        ctx.fillText(`w0 = ${w0.toFixed(2)}`, triA[0], triA[1] - dotR - 22);
        ctx.fillText(`w1 = ${w1.toFixed(2)}`, triB[0], triB[1] + dotR + 18);
        ctx.fillText(`w2 = ${w2.toFixed(2)}`, triC[0], triC[1] + dotR + 18);

        // color swatch
        const swatchSize = Math.max(28, w * 0.055);
        const swatchX = w - swatchSize - 16;
        const swatchY = 16;
        ctx.fillStyle = rgbToCss(blendColor);
        ctx.beginPath();
        ctx.roundRect(swatchX, swatchY, swatchSize, swatchSize, 4);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = `${Math.max(10, w * 0.017)}px "SFMono-Regular","Menlo",monospace`;
        ctx.fillStyle = "rgba(239,245,247,0.75)";
        ctx.textAlign = "right";
        ctx.fillText("blended", swatchX - 6, swatchY + swatchSize * 0.65);
        ctx.textAlign = "center";
      } else {
        // outside state
        ctx.font = smallFont;
        ctx.fillStyle = "rgba(239,245,247,0.45)";
        ctx.fillText("hover inside the triangle", w * 0.5, h * 0.55);
      }
    },
  });
}


function initialize() {
  initializePage({
    canvasSetups: [
      ["triangle-story-canvas", setupTriangleStoryDemo],
      ["barycentric-interactive-canvas", setupBarycentricInteractiveDemo],
      ["visibility-story-canvas", setupVisibilityStoryDemo],
      ["framebuffer-concept-canvas", setupFramebufferConceptDemo],
      ["multipass-story-canvas", setupMultipassStoryDemo],
      ["rendering-code-canvas", setupRenderingCodeLab],
      ["pipeline-canvas", setupPipelineDemo],
      ["render-coverage-use-canvas", setupRenderCoverageUseDemo],
      ["render-barycentric-use-canvas", setupRenderBarycentricUseDemo],
      ["render-depth-use-canvas", setupRenderDepthUseDemo],
      ["render-sampling-use-canvas", setupRenderSamplingUseDemo]
    ],
    controls: [...Object.values(pipelineControls)],
    extraSetup: [],
  });
}

initialize();
