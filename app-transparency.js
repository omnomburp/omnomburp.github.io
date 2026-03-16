const transparencyControls = getElementsById({
  alpha: "transparency-alpha",
  softness: "transparency-softness",
  sort: "transparency-sort"
});

const transparencyCodeControls = getElementsById({
  layers: "transparency-code-layers",
  alpha: "transparency-code-alpha",
  premul: "transparency-code-premul"
});

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


function setupBlendOrderDemo() {
  const canvas = document.getElementById("blend-order-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) return;

  let frontFirst = true;
  const state = { key: "" };

  canvas.addEventListener("click", () => {
    frontFirst = !frontFirst;
    state.key = "";
    markAllDemosDirty();
  });

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const w = canvas.width;
      const h = canvas.height;
      const key = `${w}|${h}|${frontFirst}`;
      if (state.key === key) return;
      state.key = key;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#102534");
      bg.addColorStop(1, "#1f3d4e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const margin = 24;
      const gap = 20;
      const panelW = (w - margin * 2 - gap) / 2;
      const panelH = h - margin * 2;

      const layerA = { x: 0.15, y: 0.18, w: 0.48, h: 0.56, color: [0.94, 0.42, 0.28], a: 0.7, label: "Red layer" };
      const layerB = { x: 0.38, y: 0.32, w: 0.48, h: 0.56, color: [0.28, 0.62, 0.94], a: 0.7, label: "Blue layer" };

      function drawPanel(ox, oy, pw, ph, order, title) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(ox, oy, pw, ph);
        ctx.clip();

        const tile = Math.max(16, pw * 0.05);
        for (let row = 0; row <= Math.ceil(ph / tile); row++) {
          for (let col = 0; col <= Math.ceil(pw / tile); col++) {
            ctx.fillStyle = (row + col) % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(10,19,27,0.18)";
            ctx.fillRect(ox + col * tile, oy + row * tile, tile, tile);
          }
        }

        for (const layer of order) {
          ctx.fillStyle = colorToRgba(layer.color, layer.a);
          ctx.fillRect(ox + layer.x * pw, oy + layer.y * ph, layer.w * pw, layer.h * ph);
          ctx.strokeStyle = colorToRgba(layer.color, 0.9);
          ctx.lineWidth = 2;
          ctx.strokeRect(ox + layer.x * pw, oy + layer.y * ph, layer.w * pw, layer.h * ph);
        }

        ctx.fillStyle = "rgba(239,245,247,0.94)";
        ctx.font = `${Math.max(13, pw * 0.05)}px "Avenir Next","Segoe UI",sans-serif`;
        ctx.fillText(title, ox + 12, oy + 20);

        const formulaY = oy + ph - 14;
        ctx.fillStyle = "rgba(200,220,230,0.8)";
        ctx.font = `${Math.max(11, pw * 0.038)}px "SFMono-Regular","Menlo",monospace`;
        const first = order[0].label;
        const second = order[1].label;
        ctx.fillText(`Draw: ${first} then ${second}`, ox + 12, formulaY);

        ctx.restore();
      }

      drawPanel(margin, margin, panelW, panelH,
        frontFirst ? [layerA, layerB] : [layerB, layerA],
        frontFirst ? "Red first" : "Blue first");
      drawPanel(margin + panelW + gap, margin, panelW, panelH,
        frontFirst ? [layerB, layerA] : [layerA, layerB],
        frontFirst ? "Blue first" : "Red first");

      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1.6;
      ctx.strokeRect(margin, margin, panelW, panelH);
      ctx.strokeRect(margin + panelW + gap, margin, panelW, panelH);

      ctx.fillStyle = "rgba(255,245,216,0.88)";
      ctx.font = `${Math.max(12, w * 0.018)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("Click anywhere to swap draw order", w * 0.5 - 130, h - 6);
    },
  });
}

function setupCoverageVsOpacityDemo() {
  const canvas = document.getElementById("coverage-vs-opacity-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) return;

  const state = { key: "" };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const w = canvas.width;
      const h = canvas.height;
      const t = time || 0;
      const key = `${w}|${h}|${Math.floor(t * 2)}`;
      if (state.key === key) return;
      state.key = key;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#102534");
      bg.addColorStop(1, "#1f3d4e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const margin = 24;
      const gap = 20;
      const panelW = (w - margin * 2 - gap) / 2;
      const panelH = h - margin * 2;

      function drawPixelGrid(ox, oy, pw, ph, title, mode) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(ox, oy, pw, ph);
        ctx.clip();

        const gridSize = 8;
        const cellW = pw / gridSize;
        const cellH = (ph - 40) / gridSize;

        ctx.fillStyle = "rgba(239,245,247,0.94)";
        ctx.font = `${Math.max(14, pw * 0.055)}px "Avenir Next","Segoe UI",sans-serif`;
        ctx.fillText(title, ox + 12, oy + 22);

        for (let row = 0; row < gridSize; row++) {
          for (let col = 0; col < gridSize; col++) {
            const cx = ox + col * cellW;
            const cy = oy + 32 + row * cellH;

            ctx.fillStyle = (row + col) % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(10,19,27,0.12)";
            ctx.fillRect(cx, cy, cellW, cellH);
            ctx.strokeStyle = "rgba(255,255,255,0.08)";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(cx, cy, cellW, cellH);

            if (mode === "coverage") {
              const edgeCol = 3 + Math.sin(t * 0.5) * 0.8;
              const dist = col - edgeCol;
              let coverage = 0;
              if (dist < -0.5) coverage = 1;
              else if (dist < 0.5) coverage = 0.5 - dist;
              else coverage = 0;
              coverage = clamp(coverage, 0, 1);
              if (row >= 1 && row <= 6) {
                ctx.fillStyle = colorToRgba([0.38, 0.82, 0.9], coverage);
                ctx.fillRect(cx + 1, cy + 1, cellW - 2, cellH - 2);
              }
            } else {
              const opacity = 0.35 + Math.sin(t * 0.6) * 0.25;
              if (row >= 1 && row <= 6 && col >= 1 && col <= 6) {
                ctx.fillStyle = colorToRgba([0.94, 0.53, 0.32], opacity);
                ctx.fillRect(cx + 1, cy + 1, cellW - 2, cellH - 2);
              }
            }
          }
        }

        ctx.fillStyle = "rgba(200,220,230,0.8)";
        ctx.font = `${Math.max(11, pw * 0.036)}px "SFMono-Regular","Menlo",monospace`;
        if (mode === "coverage") {
          ctx.fillText("Triangle edge: partial pixel coverage", ox + 12, oy + ph - 8);
        } else {
          ctx.fillText("Glass surface: full coverage, partial opacity", ox + 12, oy + ph - 8);
        }

        ctx.restore();
      }

      drawPixelGrid(margin, margin, panelW, panelH, "Geometric coverage", "coverage");
      drawPixelGrid(margin + panelW + gap, margin, panelW, panelH, "Material opacity", "opacity");

      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1.6;
      ctx.strokeRect(margin, margin, panelW, panelH);
      ctx.strokeRect(margin + panelW + gap, margin, panelW, panelH);
    },
  });
}

function setupMsaaCoverageDemo() {
  const canvas = document.getElementById("msaa-coverage-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) return;

  const state = { key: "" };

  const sampleOffsets4x = [
    [-0.25, -0.125], [0.25, -0.375], [-0.375, 0.25], [0.125, 0.375],
  ];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const w = canvas.width;
      const h = canvas.height;
      const t = time || 0;
      const key = `${w}|${h}|${Math.floor(t * 2)}`;
      if (state.key === key) return;
      state.key = key;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#102534");
      bg.addColorStop(1, "#1f3d4e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const gridSize = 6;
      const margin = Math.max(40, w * 0.08);
      const cellSize = Math.min((w - margin * 2) / gridSize, (h - margin * 2 - 30) / gridSize);
      const gridW = cellSize * gridSize;
      const gridH = cellSize * gridSize;
      const startX = (w - gridW) / 2;
      const startY = margin + 20;

      ctx.fillStyle = "rgba(239,245,247,0.94)";
      ctx.font = `${Math.max(15, w * 0.022)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("4x MSAA: 4 sample points per pixel", startX, startY - 6);

      const edgeSlope = 0.7 + Math.sin(t * 0.3) * 0.3;
      const edgeOffset = 2.5 + Math.sin(t * 0.2) * 1.0;

      function isInsideTriangle(px, py) {
        return py > px * edgeSlope - edgeOffset;
      }

      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const cx = startX + col * cellSize;
          const cy = startY + row * cellSize;

          ctx.fillStyle = (row + col) % 2 === 0 ? "#162a3a" : "#1a3040";
          ctx.fillRect(cx, cy, cellSize, cellSize);
          ctx.strokeStyle = "rgba(255,255,255,0.12)";
          ctx.lineWidth = 1;
          ctx.strokeRect(cx, cy, cellSize, cellSize);

          let covered = 0;
          for (const offset of sampleOffsets4x) {
            const sx = col + 0.5 + offset[0];
            const sy = row + 0.5 + offset[1];
            const inside = isInsideTriangle(sx, sy);
            if (inside) covered++;

            const dotX = cx + (0.5 + offset[0]) * cellSize;
            const dotY = cy + (0.5 + offset[1]) * cellSize;
            ctx.fillStyle = inside ? "rgba(115,221,213,0.95)" : "rgba(247,160,74,0.7)";
            ctx.beginPath();
            ctx.arc(dotX, dotY, Math.max(3, cellSize * 0.06), 0, TAU);
            ctx.fill();
          }

          if (covered > 0 && covered < 4) {
            ctx.fillStyle = colorToRgba([0.38, 0.82, 0.9], covered / 4);
            ctx.fillRect(cx + 1, cy + 1, cellSize - 2, cellSize - 2);
          } else if (covered === 4) {
            ctx.fillStyle = colorToRgba([0.38, 0.82, 0.9], 1.0);
            ctx.fillRect(cx + 1, cy + 1, cellSize - 2, cellSize - 2);
          }

          if (covered > 0 && covered < 4) {
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.font = `${Math.max(10, cellSize * 0.2)}px "SFMono-Regular","Menlo",monospace`;
            ctx.fillText(`${covered}/4`, cx + 4, cy + cellSize - 4);
          }
        }
      }

      ctx.strokeStyle = "rgba(255,223,132,0.6)";
      ctx.lineWidth = Math.max(2, w * 0.004);
      ctx.beginPath();
      const lineStartX = startX;
      const lineStartY = startY + (0 * edgeSlope - edgeOffset + gridSize) * cellSize / gridSize;
      const lineEndX = startX + gridW;
      const lineEndY = startY + (gridSize * edgeSlope - edgeOffset + gridSize) * cellSize / gridSize;
      ctx.moveTo(lineStartX, startY + (-edgeOffset + 0) * cellSize);
      ctx.lineTo(lineEndX, startY + (gridSize * edgeSlope - edgeOffset) * cellSize);
      ctx.stroke();

      ctx.fillStyle = "rgba(200,220,230,0.7)";
      ctx.font = `${Math.max(11, w * 0.016)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("Green dots = inside triangle. Orange dots = outside. Fractions show coverage.", startX, startY + gridH + 18);
    },
  });
}

function setupPremultipliedDemo() {
  const canvas = document.getElementById("premultiplied-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) return;

  const state = { key: "" };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const w = canvas.width;
      const h = canvas.height;
      const key = `${w}|${h}`;
      if (state.key === key) return;
      state.key = key;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#102534");
      bg.addColorStop(1, "#1f3d4e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const margin = 24;
      const gap = 20;
      const panelW = (w - margin * 2 - gap) / 2;
      const panelH = h - margin * 2;

      function drawCompositePanel(ox, oy, pw, ph, title, premultiplied) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(ox, oy, pw, ph);
        ctx.clip();

        const tile = Math.max(14, pw * 0.05);
        for (let row = 0; row <= Math.ceil(ph / tile); row++) {
          for (let col = 0; col <= Math.ceil(pw / tile); col++) {
            ctx.fillStyle = (row + col) % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(10,19,27,0.18)";
            ctx.fillRect(ox + col * tile, oy + row * tile, tile, tile);
          }
        }

        const centerX = ox + pw * 0.5;
        const centerY = oy + ph * 0.48;
        const radius = Math.min(pw, ph) * 0.3;

        for (let ring = 20; ring >= 0; ring--) {
          const t = ring / 20;
          const r = radius * (0.3 + t * 0.7);
          const alpha = 0.85 * (1 - t * 0.7);
          const srcColor = [0.94, 0.42, 0.18];

          if (premultiplied) {
            const premulColor = scale3(srcColor, alpha);
            ctx.fillStyle = `rgba(${Math.round(premulColor[0] * 255)},${Math.round(premulColor[1] * 255)},${Math.round(premulColor[2] * 255)},${alpha})`;
          } else {
            ctx.fillStyle = colorToRgba(srcColor, alpha);
          }
          ctx.beginPath();
          ctx.arc(centerX, centerY, r, 0, TAU);
          ctx.fill();
        }

        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, TAU);
        ctx.stroke();

        ctx.fillStyle = "rgba(239,245,247,0.94)";
        ctx.font = `${Math.max(14, pw * 0.055)}px "Avenir Next","Segoe UI",sans-serif`;
        ctx.fillText(title, ox + 12, oy + 22);

        ctx.fillStyle = "rgba(200,220,230,0.75)";
        ctx.font = `${Math.max(10, pw * 0.035)}px "SFMono-Regular","Menlo",monospace`;
        if (premultiplied) {
          ctx.fillText("out = src_premul + dst*(1-a)", ox + 12, oy + ph - 8);
        } else {
          ctx.fillText("out = src*a + dst*(1-a)", ox + 12, oy + ph - 8);
        }

        ctx.restore();
      }

      drawCompositePanel(margin, margin, panelW, panelH, "Straight alpha", false);
      drawCompositePanel(margin + panelW + gap, margin, panelW, panelH, "Premultiplied alpha", true);

      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1.6;
      ctx.strokeRect(margin, margin, panelW, panelH);
      ctx.strokeRect(margin + panelW + gap, margin, panelW, panelH);
    },
  });
}

function setupTransparencyCodeDemo() {
  const canvas = document.getElementById("transparency-code-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) return;

  const state = { key: "" };
  const layerColors = [
    [0.94, 0.42, 0.28],
    [0.28, 0.62, 0.94],
    [0.38, 0.88, 0.52],
    [0.92, 0.78, 0.28],
  ];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const w = canvas.width;
      const h = canvas.height;
      const layerCount = Number(transparencyCodeControls.layers?.value || 3);
      const alpha = Number(transparencyCodeControls.alpha?.value || 60) / 100;
      const premul = Boolean(transparencyCodeControls.premul?.checked);
      const key = `${w}|${h}|${layerCount}|${alpha.toFixed(2)}|${premul}`;
      if (state.key === key) return;
      state.key = key;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#112536");
      bg.addColorStop(1, "#1e3b47");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const rowH = Math.min(h / (layerCount + 1.5), 80);
      const margin = 20;
      const swatchSize = rowH * 0.6;
      const startY = 20;

      let dst = [0.12, 0.16, 0.22];
      ctx.fillStyle = "rgba(239,245,247,0.92)";
      ctx.font = `${Math.max(13, w * 0.02)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText(premul ? "Premultiplied compositing" : "Straight alpha compositing", margin, startY);

      const bgRowY = startY + 14;
      ctx.fillStyle = colorToRgba(dst, 1);
      ctx.fillRect(margin, bgRowY, swatchSize, swatchSize);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(margin, bgRowY, swatchSize, swatchSize);
      ctx.fillStyle = "rgba(200,220,230,0.85)";
      ctx.font = `${Math.max(11, w * 0.016)}px "SFMono-Regular","Menlo",monospace`;
      ctx.fillText(`Background: (${dst.map(v => v.toFixed(2)).join(", ")})`, margin + swatchSize + 12, bgRowY + swatchSize * 0.6);

      for (let i = 0; i < layerCount; i++) {
        const src = layerColors[i % layerColors.length];
        const y = bgRowY + swatchSize + 10 + i * (rowH + 4);
        let result;
        if (premul) {
          const premulSrc = scale3(src, alpha);
          result = add3(premulSrc, scale3(dst, 1 - alpha));
        } else {
          result = add3(scale3(src, alpha), scale3(dst, 1 - alpha));
        }
        result = [clamp(result[0], 0, 1), clamp(result[1], 0, 1), clamp(result[2], 0, 1)];

        ctx.fillStyle = colorToRgba(src, alpha);
        ctx.fillRect(margin, y, swatchSize, swatchSize);
        ctx.strokeStyle = colorToRgba(src, 0.9);
        ctx.lineWidth = 1;
        ctx.strokeRect(margin, y, swatchSize, swatchSize);

        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = `${Math.max(16, w * 0.025)}px "Avenir Next","Segoe UI",sans-serif`;
        ctx.fillText("\u2192", margin + swatchSize + 6, y + swatchSize * 0.65);

        ctx.fillStyle = colorToRgba(result, 1);
        ctx.fillRect(margin + swatchSize + 28, y, swatchSize, swatchSize);
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.strokeRect(margin + swatchSize + 28, y, swatchSize, swatchSize);

        ctx.fillStyle = "rgba(200,220,230,0.8)";
        ctx.font = `${Math.max(10, w * 0.014)}px "SFMono-Regular","Menlo",monospace`;
        const formulaX = margin + swatchSize * 2 + 42;
        if (premul) {
          ctx.fillText(`src_premul + dst*(1-${alpha.toFixed(2)})`, formulaX, y + swatchSize * 0.4);
        } else {
          ctx.fillText(`src*${alpha.toFixed(2)} + dst*(1-${alpha.toFixed(2)})`, formulaX, y + swatchSize * 0.4);
        }
        ctx.fillText(`= (${result.map(v => v.toFixed(2)).join(", ")})`, formulaX, y + swatchSize * 0.75);

        dst = result;
      }
    },
  });
}

/* ── Chapter 13 new demos ─────────────────────────────────────────── */


function initialize() {
  initializePage({
    canvasSetups: [
      ["transparency-canvas", setupTransparencyDemo],
      ["blend-order-canvas", setupBlendOrderDemo],
      ["coverage-vs-opacity-canvas", setupCoverageVsOpacityDemo],
      ["msaa-coverage-canvas", setupMsaaCoverageDemo],
      ["premultiplied-canvas", setupPremultipliedDemo],
      ["transparency-code-canvas", setupTransparencyCodeDemo]
    ],
    controls: [...Object.values(transparencyControls), ...Object.values(transparencyCodeControls)],
    extraSetup: [],
  });
}

initialize();
