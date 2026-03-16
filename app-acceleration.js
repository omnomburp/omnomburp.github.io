const accelerationControls = getElementsById({
  sweep: "acceleration-sweep",
  lod: "acceleration-lod",
  culling: "acceleration-culling"
});

const accelerationCodeControls = getElementsById({
  x: "acceleration-code-x",
  y: "acceleration-code-y",
  angle: "acceleration-code-angle"
});

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

/* ── Chapter 12 new demos ─────────────────────────────────────────── */


function setupBvhTraversalDemo() {
  const canvas = document.getElementById("bvh-traversal-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) return;

  const state = { key: "" };

  const leaves = [];
  for (let i = 0; i < 12; i++) {
    const seed = i * 37 + 7;
    leaves.push({
      x: 0.08 + (i % 4) * 0.24 + ((seed % 50) / 500),
      y: 0.25 + Math.floor(i / 4) * 0.25 + ((seed * 3 % 50) / 500),
      w: 0.06 + (seed % 20) / 400,
      h: 0.06 + (seed * 2 % 20) / 400,
    });
  }

  function buildBvh(indices) {
    if (indices.length <= 2) {
      let box = { x0: 1, y0: 1, x1: 0, y1: 0 };
      for (const i of indices) {
        box.x0 = Math.min(box.x0, leaves[i].x);
        box.y0 = Math.min(box.y0, leaves[i].y);
        box.x1 = Math.max(box.x1, leaves[i].x + leaves[i].w);
        box.y1 = Math.max(box.y1, leaves[i].y + leaves[i].h);
      }
      return { box, indices, left: null, right: null };
    }
    const mid = Math.floor(indices.length / 2);
    const sorted = indices.slice().sort((a, b) => leaves[a].x - leaves[b].x);
    const left = buildBvh(sorted.slice(0, mid));
    const right = buildBvh(sorted.slice(mid));
    return {
      box: {
        x0: Math.min(left.box.x0, right.box.x0),
        y0: Math.min(left.box.y0, right.box.y0),
        x1: Math.max(left.box.x1, right.box.x1),
        y1: Math.max(left.box.y1, right.box.y1),
      },
      indices: null,
      left,
      right,
    };
  }

  const allIndices = [];
  for (let i = 0; i < leaves.length; i++) allIndices.push(i);
  const bvh = buildBvh(allIndices);

  function rayBoxIntersect(ox, oy, dx, dy, box) {
    let tmin = -Infinity;
    let tmax = Infinity;
    if (Math.abs(dx) > 1e-8) {
      let t1 = (box.x0 - ox) / dx;
      let t2 = (box.x1 - ox) / dx;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
    } else if (ox < box.x0 || ox > box.x1) return false;
    if (Math.abs(dy) > 1e-8) {
      let t1 = (box.y0 - oy) / dy;
      let t2 = (box.y1 - oy) / dy;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
    } else if (oy < box.y0 || oy > box.y1) return false;
    return tmax >= tmin && tmax >= 0;
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const w = canvas.width;
      const h = canvas.height;
      const t = time || 0;
      const key = `${w}|${h}|${Math.floor(t * 3)}`;
      if (state.key === key) return;
      state.key = key;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#112536");
      bgGrad.addColorStop(1, "#203846");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const toCanvasX = (v) => v * w;
      const toCanvasY = (v) => v * h;

      const rayAngle = t * 0.2;
      const rayOX = -0.05;
      const rayOY = 0.45 + Math.sin(rayAngle) * 0.2;
      const rayDX = 1;
      const rayDY = Math.sin(rayAngle * 1.3) * 0.3;

      function drawNode(node, depth) {
        if (!node) return;
        const b = node.box;
        const hit = rayBoxIntersect(rayOX, rayOY, rayDX, rayDY, b);
        const bx = toCanvasX(b.x0);
        const by = toCanvasY(b.y0);
        const bw = toCanvasX(b.x1) - bx;
        const bh = toCanvasY(b.y1) - by;

        ctx.strokeStyle = hit ? `rgba(115,221,213,${0.4 + depth * 0.1})` : `rgba(247,160,74,${0.3 + depth * 0.05})`;
        ctx.lineWidth = Math.max(1.5, (3 - depth * 0.5));
        ctx.setLineDash(depth === 0 ? [] : [4, 3]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);

        if (hit && node.left) drawNode(node.left, depth + 1);
        if (hit && node.right) drawNode(node.right, depth + 1);
      }

      for (const leaf of leaves) {
        ctx.fillStyle = "rgba(115,180,220,0.3)";
        ctx.fillRect(toCanvasX(leaf.x), toCanvasY(leaf.y), toCanvasX(leaf.w), toCanvasY(leaf.h));
      }

      drawNode(bvh, 0);

      ctx.strokeStyle = "rgba(255,223,132,0.85)";
      ctx.lineWidth = Math.max(2, w * 0.003);
      const rsx = toCanvasX(rayOX);
      const rsy = toCanvasY(rayOY);
      const rex = toCanvasX(rayOX + rayDX * 1.2);
      const rey = toCanvasY(rayOY + rayDY * 1.2);
      drawArrow2d(ctx, [rsx, rsy], [rex, rey], "rgba(255,223,132,0.85)", Math.max(2, w * 0.003));

      ctx.fillStyle = "rgba(239,245,247,0.92)";
      ctx.font = `${Math.max(13, w * 0.02)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("BVH traversal: green = hit (explore), orange = miss (skip)", 14, 22);
      ctx.fillStyle = "rgba(200,220,230,0.6)";
      ctx.font = `${Math.max(10, w * 0.015)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("The ray tests bounding boxes. Missing a parent skips all children.", 14, h - 10);
    },
  });
}

function setupLodComparisonDemo() {
  const canvas = document.getElementById("lod-comparison-canvas");
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
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#112536");
      bgGrad.addColorStop(1, "#203846");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const levels = [
        { label: "LOD 0 (High)", triangles: 2048, sides: 24, color: "rgba(247,160,74,0.85)" },
        { label: "LOD 1 (Medium)", triangles: 512, sides: 12, color: "rgba(115,221,213,0.85)" },
        { label: "LOD 2 (Low)", triangles: 64, sides: 6, color: "rgba(170,230,255,0.85)" },
      ];

      const margin = 24;
      const gap = 20;
      const panelW = (w - margin * 2 - gap * 2) / 3;
      const panelH = h - margin * 2;

      for (let i = 0; i < levels.length; i++) {
        const lod = levels[i];
        const ox = margin + i * (panelW + gap);
        const oy = margin;

        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = 1.6;
        ctx.strokeRect(ox, oy, panelW, panelH);

        const cx = ox + panelW / 2;
        const cy = oy + panelH * 0.45;
        const radius = Math.min(panelW, panelH) * 0.28;

        ctx.fillStyle = `${lod.color.slice(0, -4)}0.15)`;
        ctx.strokeStyle = lod.color;
        ctx.lineWidth = Math.max(1.5, w * 0.003);
        ctx.beginPath();
        for (let s = 0; s <= lod.sides; s++) {
          const angle = (s / lod.sides) * TAU - Math.PI / 2;
          const px = cx + Math.cos(angle) * radius;
          const py = cy + Math.sin(angle) * radius;
          if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (lod.sides >= 12) {
          ctx.strokeStyle = `${lod.color.slice(0, -4)}0.3)`;
          ctx.lineWidth = 0.8;
          for (let s = 0; s < lod.sides; s++) {
            const angle = (s / lod.sides) * TAU - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
            ctx.stroke();
          }
        }

        ctx.fillStyle = "rgba(239,245,247,0.92)";
        ctx.font = `${Math.max(14, panelW * 0.08)}px "Avenir Next","Segoe UI",sans-serif`;
        ctx.fillText(lod.label, ox + 12, oy + 24);

        ctx.fillStyle = "rgba(200,220,230,0.7)";
        ctx.font = `${Math.max(12, panelW * 0.06)}px "SFMono-Regular","Menlo",monospace`;
        ctx.fillText(`${lod.triangles.toLocaleString()} triangles`, ox + 12, oy + panelH - 14);
      }
    },
  });
}

function setupFrustumTestDemo() {
  const canvas = document.getElementById("frustum-test-canvas");
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
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#112536");
      bgGrad.addColorStop(1, "#203846");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const camX = w * 0.2;
      const camY = h * 0.5;
      const fovHalf = 0.45;
      const nearDist = w * 0.08;
      const farDist = w * 0.55;
      const camAngle = 0;

      const leftDir = [Math.cos(camAngle - fovHalf), Math.sin(camAngle - fovHalf)];
      const rightDir = [Math.cos(camAngle + fovHalf), Math.sin(camAngle + fovHalf)];

      ctx.fillStyle = "rgba(255,223,132,0.06)";
      ctx.beginPath();
      ctx.moveTo(camX + leftDir[0] * nearDist, camY + leftDir[1] * nearDist);
      ctx.lineTo(camX + leftDir[0] * farDist, camY + leftDir[1] * farDist);
      ctx.lineTo(camX + rightDir[0] * farDist, camY + rightDir[1] * farDist);
      ctx.lineTo(camX + rightDir[0] * nearDist, camY + rightDir[1] * nearDist);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(255,223,132,0.4)";
      ctx.lineWidth = Math.max(1.5, w * 0.003);
      ctx.stroke();

      const planeNames = ["Left", "Right", "Near", "Far"];
      const planeNormals = [
        [rightDir[1], -rightDir[0]],
        [-leftDir[1], leftDir[0]],
        [Math.cos(camAngle), Math.sin(camAngle)],
        [-Math.cos(camAngle), -Math.sin(camAngle)],
      ];
      const planeDs = [
        -(planeNormals[0][0] * camX + planeNormals[0][1] * camY),
        -(planeNormals[1][0] * camX + planeNormals[1][1] * camY),
        -(planeNormals[2][0] * (camX + Math.cos(camAngle) * nearDist) + planeNormals[2][1] * (camY + Math.sin(camAngle) * nearDist)),
        -(planeNormals[3][0] * (camX + Math.cos(camAngle) * farDist) + planeNormals[3][1] * (camY + Math.sin(camAngle) * farDist)),
      ];

      const objRadius = w * 0.04;
      const objX = w * 0.55 + Math.sin(t * 0.3) * w * 0.25;
      const objY = h * 0.5 + Math.cos(t * 0.4) * h * 0.25;

      let allPass = true;
      const results = [];
      for (let p = 0; p < 4; p++) {
        const dist = planeNormals[p][0] * objX + planeNormals[p][1] * objY + planeDs[p];
        const pass = dist + objRadius > 0;
        results.push(pass);
        if (!pass) allPass = false;
      }

      ctx.fillStyle = allPass ? "rgba(115,221,213,0.3)" : "rgba(247,160,74,0.2)";
      ctx.strokeStyle = allPass ? "rgba(115,221,213,0.9)" : "rgba(247,160,74,0.8)";
      ctx.lineWidth = Math.max(2, w * 0.003);
      ctx.beginPath();
      ctx.rect(objX - objRadius, objY - objRadius, objRadius * 2, objRadius * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(255,245,216,0.95)";
      ctx.beginPath();
      ctx.arc(camX, camY, Math.max(5, w * 0.01), 0, TAU);
      ctx.fill();

      ctx.fillStyle = "rgba(239,245,247,0.92)";
      ctx.font = `${Math.max(14, w * 0.022)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("Frustum plane tests", 14, 24);

      ctx.fillStyle = allPass ? "rgba(115,221,213,0.9)" : "rgba(247,160,74,0.9)";
      ctx.font = `${Math.max(13, w * 0.02)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText(allPass ? "VISIBLE (all planes pass)" : "CULLED (at least one plane fails)", 14, 46);

      const infoX = w * 0.7;
      ctx.fillStyle = "rgba(200,220,230,0.8)";
      ctx.font = `${Math.max(11, w * 0.016)}px "SFMono-Regular","Menlo",monospace`;
      for (let p = 0; p < 4; p++) {
        const color = results[p] ? "rgba(115,221,213,0.9)" : "rgba(247,160,74,0.9)";
        ctx.fillStyle = color;
        ctx.fillText(`${planeNames[p]}: ${results[p] ? "PASS" : "FAIL"}`, infoX, h * 0.3 + p * 20);
      }
    },
  });
}

function setupAccelerationCodeDemo() {
  const canvas = document.getElementById("acceleration-code-canvas");
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
      const objXN = Number(accelerationCodeControls.x?.value || 50) / 100;
      const objYN = Number(accelerationCodeControls.y?.value || 50) / 100;
      const frustumAngle = Number(accelerationCodeControls.angle?.value || 30) / 100;
      const key = `${w}|${h}|${objXN.toFixed(2)}|${objYN.toFixed(2)}|${frustumAngle.toFixed(2)}`;
      if (state.key === key) return;
      state.key = key;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#112536");
      bgGrad.addColorStop(1, "#203846");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const camX = w * 0.15;
      const camY = h * 0.5;
      const camDir = lerp(-0.6, 0.6, frustumAngle);
      const fovHalf = 0.42;
      const nearDist = w * 0.06;
      const farDist = w * 0.6;

      const leftDir = [Math.cos(camDir - fovHalf), Math.sin(camDir - fovHalf)];
      const rightDir = [Math.cos(camDir + fovHalf), Math.sin(camDir + fovHalf)];

      ctx.fillStyle = "rgba(255,223,132,0.06)";
      ctx.strokeStyle = "rgba(255,223,132,0.35)";
      ctx.lineWidth = Math.max(1.5, w * 0.003);
      ctx.beginPath();
      ctx.moveTo(camX + leftDir[0] * nearDist, camY + leftDir[1] * nearDist);
      ctx.lineTo(camX + leftDir[0] * farDist, camY + leftDir[1] * farDist);
      ctx.lineTo(camX + rightDir[0] * farDist, camY + rightDir[1] * farDist);
      ctx.lineTo(camX + rightDir[0] * nearDist, camY + rightDir[1] * nearDist);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const planeNormals = [
        [rightDir[1], -rightDir[0]],
        [-leftDir[1], leftDir[0]],
        [Math.cos(camDir), Math.sin(camDir)],
        [-Math.cos(camDir), -Math.sin(camDir)],
      ];
      const planeOffsets = [
        -(planeNormals[0][0] * camX + planeNormals[0][1] * camY),
        -(planeNormals[1][0] * camX + planeNormals[1][1] * camY),
        -(planeNormals[2][0] * (camX + Math.cos(camDir) * nearDist) + planeNormals[2][1] * (camY + Math.sin(camDir) * nearDist)),
        -(planeNormals[3][0] * (camX + Math.cos(camDir) * farDist) + planeNormals[3][1] * (camY + Math.sin(camDir) * farDist)),
      ];

      const objX = w * 0.15 + objXN * w * 0.7;
      const objY = h * 0.1 + objYN * h * 0.8;
      const objR = w * 0.04;

      const planeNames = ["Left", "Right", "Near", "Far"];
      let allPass = true;
      const results = [];
      for (let p = 0; p < 4; p++) {
        const dist = planeNormals[p][0] * objX + planeNormals[p][1] * objY + planeOffsets[p];
        const pass = dist + objR > 0;
        results.push({ name: planeNames[p], pass, dist: dist + objR });
        if (!pass) allPass = false;
      }

      ctx.fillStyle = allPass ? "rgba(115,221,213,0.3)" : "rgba(247,160,74,0.15)";
      ctx.strokeStyle = allPass ? "rgba(115,221,213,0.9)" : "rgba(247,160,74,0.8)";
      ctx.lineWidth = Math.max(2, w * 0.003);
      ctx.fillRect(objX - objR, objY - objR, objR * 2, objR * 2);
      ctx.strokeRect(objX - objR, objY - objR, objR * 2, objR * 2);

      ctx.fillStyle = "rgba(255,245,216,0.95)";
      ctx.beginPath();
      ctx.arc(camX, camY, Math.max(5, w * 0.01), 0, TAU);
      ctx.fill();

      ctx.fillStyle = "rgba(239,245,247,0.9)";
      ctx.font = `${Math.max(13, w * 0.02)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("Step-by-step frustum test", 14, 22);

      const tableX = 14;
      const tableY = h * 0.7;
      ctx.fillStyle = "rgba(200,220,230,0.8)";
      ctx.font = `${Math.max(11, w * 0.016)}px "SFMono-Regular","Menlo",monospace`;
      for (let p = 0; p < results.length; p++) {
        const r = results[p];
        ctx.fillStyle = r.pass ? "rgba(115,221,213,0.9)" : "rgba(247,160,74,0.9)";
        ctx.fillText(`${r.name}: d=${r.dist.toFixed(1)} ${r.pass ? "\u2713 PASS" : "\u2717 FAIL"}`, tableX, tableY + p * 18);
      }

      ctx.fillStyle = allPass ? "rgba(115,221,213,0.95)" : "rgba(247,160,74,0.95)";
      ctx.font = `${Math.max(12, w * 0.018)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText(allPass ? "Result: VISIBLE" : "Result: CULLED", tableX, tableY + 80);
    },
  });
}


function initialize() {
  initializePage({
    canvasSetups: [
      ["acceleration-canvas", setupAccelerationDemo],
      ["bvh-traversal-canvas", setupBvhTraversalDemo],
      ["lod-comparison-canvas", setupLodComparisonDemo],
      ["frustum-test-canvas", setupFrustumTestDemo],
      ["acceleration-code-canvas", setupAccelerationCodeDemo]
    ],
    controls: [...Object.values(accelerationControls), ...Object.values(accelerationCodeControls)],
    extraSetup: [],
  });
}

initialize();
