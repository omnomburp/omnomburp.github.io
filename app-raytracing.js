const compareControls = getElementsById({
  sample: "compare-sample",
  drift: "compare-drift",
  secondary: "compare-secondary"
});

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
  setupCodeLab({
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
    levels: [
      {
        id: "guided", label: "Guided",
        source: "# Move sample across the image\nsample = 0.48\nobject_drift = 0.06\ncast_shadow = true\ncast_reflection = true",
        instructions: "Slide sample between 0 and 1 to see different objects get hit. Toggle cast_shadow and cast_reflection to add secondary rays.",
      },
      {
        id: "challenge", label: "Challenge",
        source: "# Goal: hit the background (no object)\nsample = 0.48\nobject_drift = 0.06\ncast_shadow = true\ncast_reflection = true",
        instructions: "Adjust sample and object_drift so the primary ray hits the background (no object).",
        target: { match(derived) { return derived.winner === "background"; } },
      },
      {
        id: "explore", label: "Explore",
        source: "sample = 0.48\nobject_drift = 0.06\ncast_shadow = true\ncast_reflection = true",
        instructions: "Try expressions like sample = 0.25 + 0.25 or object_drift = sin(0.5) * 0.2.",
      },
    ],
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


function setupRayBounceDemo() {
  const canvas = document.getElementById("ray-bounce-canvas");
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
      const t = prefersReducedMotion ? 6 : (time || 0);
      const key = `${w}|${h}|${Math.floor(t * 12)}`;
      if (state.key === key) return;
      state.key = key;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      drawLessonCanvasBackground(ctx, w, h);

      const cycle = 6.0;
      const phase = (t % cycle) / cycle;

      // scene layout
      const groundY = h * 0.82;
      const camX = w * 0.08;
      const camY = h * 0.45;
      const obj1X = w * 0.42;
      const obj1Y = groundY;
      const obj1W = w * 0.14;
      const obj1H = h * 0.22;
      const obj2X = w * 0.72;
      const obj2Y = groundY;
      const obj2W = w * 0.12;
      const obj2H = h * 0.16;
      const lightX = w * 0.85;
      const lightY = h * 0.1;

      // ground line
      ctx.strokeStyle = "rgba(150, 190, 220, 0.3)";
      ctx.lineWidth = Math.max(1, w * 0.002);
      ctx.beginPath();
      ctx.moveTo(w * 0.03, groundY);
      ctx.lineTo(w * 0.97, groundY);
      ctx.stroke();

      // objects
      ctx.fillStyle = "rgba(60, 110, 150, 0.5)";
      ctx.strokeStyle = "rgba(130, 180, 210, 0.5)";
      ctx.lineWidth = Math.max(1.5, w * 0.003);
      ctx.fillRect(obj1X - obj1W / 2, obj1Y - obj1H, obj1W, obj1H);
      ctx.strokeRect(obj1X - obj1W / 2, obj1Y - obj1H, obj1W, obj1H);
      ctx.fillStyle = "rgba(50, 95, 130, 0.5)";
      ctx.fillRect(obj2X - obj2W / 2, obj2Y - obj2H, obj2W, obj2H);
      ctx.strokeRect(obj2X - obj2W / 2, obj2Y - obj2H, obj2W, obj2H);

      // camera icon
      const camSize = Math.max(14, w * 0.025);
      ctx.fillStyle = "rgba(239, 245, 247, 0.7)";
      ctx.beginPath();
      ctx.moveTo(camX + camSize, camY);
      ctx.lineTo(camX - camSize * 0.5, camY - camSize * 0.7);
      ctx.lineTo(camX - camSize * 0.5, camY + camSize * 0.7);
      ctx.closePath();
      ctx.fill();

      // light icon (sun)
      const sunR = Math.max(10, w * 0.02);
      ctx.fillStyle = "rgba(255, 220, 100, 0.85)";
      ctx.beginPath();
      ctx.arc(lightX, lightY, sunR, 0, TAU);
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * TAU;
        const r1 = sunR * 1.3;
        const r2 = sunR * 1.8;
        ctx.strokeStyle = "rgba(255, 220, 100, 0.5)";
        ctx.lineWidth = Math.max(1, w * 0.002);
        ctx.beginPath();
        ctx.moveTo(lightX + Math.cos(angle) * r1, lightY + Math.sin(angle) * r1);
        ctx.lineTo(lightX + Math.cos(angle) * r2, lightY + Math.sin(angle) * r2);
        ctx.stroke();
      }

      const lineW = Math.max(2, w * 0.004);
      const hitPoint1 = [obj1X, obj1Y - obj1H];
      const hitPoint2 = [obj2X, obj2Y - obj2H];

      // animation timing
      const rayDuration = 0.13;
      const pauseDuration = 0.04;
      const t1Start = 0;
      const t1End = t1Start + rayDuration;
      const t2Start = t1End + pauseDuration;
      const t2End = t2Start + rayDuration;
      const t3Start = t2End + pauseDuration;
      const t3End = t3Start + rayDuration;

      function rayProgress(start, end) {
        if (phase < start) return 0;
        if (phase >= end) return 1;
        return (phase - start) / (end - start);
      }

      function drawAnimatedRay(from, to, progress, color, dashed, label, labelNum) {
        if (progress <= 0) return;
        const dx = to[0] - from[0];
        const dy = to[1] - from[1];
        const cx = from[0] + dx * progress;
        const cy = from[1] + dy * progress;

        if (dashed) ctx.setLineDash([6, 4]);
        if (progress >= 1) {
          drawArrow2d(ctx, from, to, color, lineW);
        } else {
          ctx.strokeStyle = color;
          ctx.lineWidth = lineW;
          ctx.beginPath();
          ctx.moveTo(from[0], from[1]);
          ctx.lineTo(cx, cy);
          ctx.stroke();
        }
        if (dashed) ctx.setLineDash([]);

        if (progress >= 1) {
          const labelFont = `bold ${Math.max(11, w * 0.018)}px "Avenir Next","Segoe UI",sans-serif`;
          ctx.font = labelFont;
          ctx.fillStyle = color;
          ctx.textAlign = "left";
          const midX = (from[0] + to[0]) * 0.5;
          const midY = (from[1] + to[1]) * 0.5;
          ctx.fillText(`${labelNum}. ${label}`, midX + 8, midY - 8);
        }
      }

      // 1. Primary ray
      const p1 = rayProgress(t1Start, t1End);
      drawAnimatedRay([camX + camSize, camY], hitPoint1, p1, "rgba(255, 210, 80, 0.9)", false, "Primary ray", 1);

      // flash at hit point 1
      if (p1 >= 1) {
        const flashAlpha = phase < t2Start ? 0.7 : 0.25;
        drawCanvasDot(ctx, hitPoint1, Math.max(5, w * 0.01), `rgba(255, 240, 160, ${flashAlpha})`, "rgba(255, 210, 80, 0.6)", 2);
      }

      // 2. Shadow ray
      const p2 = rayProgress(t2Start, t2End);
      drawAnimatedRay(hitPoint1, [lightX, lightY], p2, "rgba(247, 160, 74, 0.85)", true, "Shadow ray", 2);

      // 3. Reflection ray
      const p3 = rayProgress(t3Start, t3End);
      drawAnimatedRay(hitPoint1, hitPoint2, p3, "rgba(115, 221, 213, 0.9)", false, "Reflection ray", 3);

      // flash at hit point 2
      if (p3 >= 1) {
        const flashAlpha = phase < (t3End + pauseDuration) ? 0.7 : 0.25;
        drawCanvasDot(ctx, hitPoint2, Math.max(5, w * 0.01), `rgba(180, 240, 230, ${flashAlpha})`, "rgba(115, 221, 213, 0.6)", 2);
      }

      // labels for objects
      const objFont = `${Math.max(10, w * 0.017)}px "SFMono-Regular","Menlo",monospace`;
      ctx.font = objFont;
      ctx.fillStyle = "rgba(239, 245, 247, 0.45)";
      ctx.textAlign = "center";
      ctx.fillText("object A", obj1X, obj1Y - obj1H - 8);
      ctx.fillText("object B", obj2X, obj2Y - obj2H - 8);
      ctx.fillText("camera", camX, camY + camSize + 16);
      ctx.fillStyle = "rgba(255, 220, 100, 0.6)";
      ctx.fillText("light", lightX, lightY + sunR + 16);
    },
  });
}


function initialize() {
  initializePage({
    canvasSetups: [
      ["compare-code-canvas", setupCompareCodeLab],
      ["raster-compare-canvas", setupRasterComparisonDemo],
      ["ray-compare-canvas", setupRayComparisonDemo],
      ["ray-bounce-canvas", setupRayBounceDemo]
    ],
    controls: [...Object.values(compareControls)],
    extraSetup: [],
  });
}

initialize();
