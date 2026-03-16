const shadowControls = getElementsById({
  bias: "shadow-bias",
  resolution: "shadow-resolution",
  filter: "shadow-filter"
});

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
  setupCodeLab({
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
    levels: [
      {
        id: "guided", label: "Guided",
        source: "# Adjust bias to fix shadow acne\nshadow_map_depth = 0.44\nreceiver_depth = 0.47\nbias = 0.02\nsoft_filter = true",
        instructions: "Lower bias toward 0 to see shadow acne appear. Raise it to push the artifact away. Toggle soft_filter to compare hard vs soft shadows.",
      },
      {
        id: "challenge", label: "Challenge",
        source: "# Goal: surface fully lit (shadow factor = 0)\nshadow_map_depth = 0.44\nreceiver_depth = 0.47\nbias = 0.02\nsoft_filter = true",
        instructions: "Adjust the values so the surface is fully lit (shadow factor = 0, lit factor = 1).",
        target: { match(derived) { return derived.shadowFactor < 0.01; } },
      },
      {
        id: "explore", label: "Explore",
        source: "shadow_map_depth = 0.44\nreceiver_depth = 0.47\nbias = 0.02\nsoft_filter = true",
        instructions: "Try expressions like bias = shadow_map_depth * 0.05 or receiver_depth = shadow_map_depth + 0.1.",
      },
    ],
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


function initialize() {
  initializePage({
    canvasSetups: [
      ["shadow-code-canvas", setupShadowCodeLab],
      ["light-space-canvas", setupLightSpaceStoryDemo],
      ["shadow-canvas", setupShadowDemo]
    ],
    controls: [...Object.values(shadowControls)],
    extraSetup: [],
  });
}

initialize();
