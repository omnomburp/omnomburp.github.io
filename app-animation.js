const animationControls = getElementsById({
  pose: "animation-pose",
  lag: "animation-lag",
  skinning: "animation-skinning"
});

const animationCodeControls = getElementsById({
  pose: "animation-code-pose",
  blend: "animation-code-blend",
  colors: "animation-code-colors"
});

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


function setupGimbalLockDemo() {
  const canvas = document.getElementById("gimbal-lock-canvas");
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
      const key = `${w}|${h}|${Math.floor(t * 3)}`;
      if (state.key === key) return;
      state.key = key;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#112536");
      bgGrad.addColorStop(1, "#1e3b47");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const margin = 24;
      const gap = 20;
      const panelW = (w - margin * 2 - gap) / 2;
      const panelH = h - margin * 2;

      function drawGimbalRing(cx, cy, radius, angle, color, label, lineW) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineW;
        ctx.beginPath();
        ctx.ellipse(0, 0, radius, radius * 0.35, 0, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = `${Math.max(10, lineW * 5)}px "Avenir Next","Segoe UI",sans-serif`;
        ctx.fillText(label, radius + 4, 4);
        ctx.restore();
      }

      const pitch = Math.sin(t * 0.5) * Math.PI * 0.48;
      const yaw = t * 0.3;

      const eulerCX = margin + panelW * 0.5;
      const eulerCY = margin + panelH * 0.5;
      const ringR = Math.min(panelW, panelH) * 0.32;
      const lineW = Math.max(2, w * 0.004);

      drawGimbalRing(eulerCX, eulerCY, ringR * 1.1, yaw, "rgba(247,160,74,0.85)", "Y", lineW);
      drawGimbalRing(eulerCX, eulerCY, ringR * 0.9, pitch, "rgba(115,221,213,0.85)", "X", lineW);
      const zAngle = yaw + (Math.abs(pitch) > 1.3 ? yaw * 0.9 : 0);
      drawGimbalRing(eulerCX, eulerCY, ringR * 0.7, zAngle, "rgba(255,140,140,0.85)", "Z", lineW);

      ctx.fillStyle = "rgba(239,245,247,0.92)";
      ctx.font = `${Math.max(14, panelW * 0.055)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("Euler angles", margin + 12, margin + 22);

      const lockStrength = clamp((Math.abs(pitch) - 1.1) / 0.4, 0, 1);
      if (lockStrength > 0.1) {
        ctx.fillStyle = `rgba(255,120,100,${0.3 + lockStrength * 0.6})`;
        ctx.font = `${Math.max(12, panelW * 0.04)}px "Avenir Next","Segoe UI",sans-serif`;
        ctx.fillText("GIMBAL LOCK: Y and Z axes aligned!", margin + 12, margin + panelH - 14);
      }

      ctx.fillStyle = "rgba(200,220,230,0.6)";
      ctx.font = `${Math.max(10, panelW * 0.035)}px "SFMono-Regular","Menlo",monospace`;
      ctx.fillText(`pitch: ${(pitch * 180 / Math.PI).toFixed(0)}\u00B0`, margin + 12, margin + panelH - 36);

      const quatCX = margin + panelW + gap + panelW * 0.5;
      const quatCY = margin + panelH * 0.5;
      const quatR = ringR * 0.8;

      ctx.strokeStyle = "rgba(115,221,213,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(quatCX, quatCY, quatR, 0, TAU);
      ctx.stroke();

      const quatAngle = yaw + pitch * 0.5;
      const arrowLen = quatR * 0.85;
      const arrowEndX = quatCX + Math.cos(-quatAngle) * arrowLen;
      const arrowEndY = quatCY + Math.sin(-quatAngle) * arrowLen;
      drawArrow2d(ctx, [quatCX, quatCY], [arrowEndX, arrowEndY], "rgba(115,221,213,0.9)", Math.max(2.5, w * 0.004));

      ctx.fillStyle = "rgba(255,245,216,0.9)";
      ctx.beginPath();
      ctx.arc(quatCX, quatCY, Math.max(4, w * 0.008), 0, TAU);
      ctx.fill();

      ctx.fillStyle = "rgba(239,245,247,0.92)";
      ctx.font = `${Math.max(14, panelW * 0.055)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("Quaternion", margin + panelW + gap + 12, margin + 22);

      ctx.fillStyle = "rgba(200,220,230,0.7)";
      ctx.font = `${Math.max(11, panelW * 0.04)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("No axis collapse at any angle", margin + panelW + gap + 12, margin + panelH - 14);

      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1.6;
      ctx.strokeRect(margin, margin, panelW, panelH);
      ctx.strokeRect(margin + panelW + gap, margin, panelW, panelH);
    },
  });
}

function setupLerpVsSlerpDemo() {
  const canvas = document.getElementById("lerp-vs-slerp-canvas");
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
      const progress = (t * 0.25) % 1;
      const key = `${w}|${h}|${progress.toFixed(3)}`;
      if (state.key === key) return;
      state.key = key;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#112536");
      bgGrad.addColorStop(1, "#1e3b47");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const startAngle = -0.8;
      const endAngle = 1.6;
      const circRadius = Math.min(w * 0.2, h * 0.22);

      const lerpCX = w * 0.3;
      const lerpCY = h * 0.42;
      const slerpCX = w * 0.7;
      const slerpCY = h * 0.42;

      function drawArcDemo(cx, cy, label, interpFn) {
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, circRadius, 0, TAU);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255,223,132,0.3)";
        ctx.lineWidth = Math.max(2, w * 0.003);
        ctx.setLineDash([4, 4]);
        const sx = cx + Math.cos(startAngle) * circRadius;
        const sy = cy + Math.sin(startAngle) * circRadius;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        const ex = cx + Math.cos(endAngle) * circRadius;
        const ey = cy + Math.sin(endAngle) * circRadius;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(255,223,132,0.9)";
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(4, w * 0.008), 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex, ey, Math.max(4, w * 0.008), 0, TAU);
        ctx.fill();

        const steps = 30;
        ctx.strokeStyle = "rgba(115,221,213,0.5)";
        ctx.lineWidth = Math.max(1.5, w * 0.003);
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const it = i / steps;
          const angle = interpFn(startAngle, endAngle, it);
          const px = cx + Math.cos(angle) * circRadius;
          const py = cy + Math.sin(angle) * circRadius;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();

        const currentAngle = interpFn(startAngle, endAngle, progress);
        const dotX = cx + Math.cos(currentAngle) * circRadius;
        const dotY = cy + Math.sin(currentAngle) * circRadius;
        ctx.fillStyle = "rgba(115,221,213,0.95)";
        ctx.beginPath();
        ctx.arc(dotX, dotY, Math.max(6, w * 0.012), 0, TAU);
        ctx.fill();

        const armLen = circRadius * 0.7;
        drawArrow2d(ctx, [cx, cy], [cx + Math.cos(currentAngle) * armLen, cy + Math.sin(currentAngle) * armLen], "rgba(115,221,213,0.8)", Math.max(2, w * 0.003));

        ctx.fillStyle = "rgba(239,245,247,0.92)";
        ctx.font = `${Math.max(14, w * 0.022)}px "Avenir Next","Segoe UI",sans-serif`;
        ctx.fillText(label, cx - circRadius, cy - circRadius - 14);
      }

      drawArcDemo(lerpCX, lerpCY, "Lerp (variable speed)", function(a, b, t) {
        const lerpAngle = a + (b - a) * t;
        const len = Math.sqrt(Math.cos(lerpAngle) * Math.cos(lerpAngle) + Math.sin(lerpAngle) * Math.sin(lerpAngle));
        return Math.atan2(Math.sin(a + (b - a) * t), Math.cos(a + (b - a) * t));
      });

      drawArcDemo(slerpCX, slerpCY, "Slerp (constant speed)", function(a, b, t) {
        return a + (b - a) * t;
      });

      ctx.fillStyle = "rgba(200,220,230,0.7)";
      ctx.font = `${Math.max(11, w * 0.016)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("Lerp cuts through the sphere interior (non-uniform speed)", w * 0.05, h * 0.82);
      ctx.fillText("Slerp follows the great-circle arc (constant angular velocity)", w * 0.05, h * 0.9);

      ctx.fillStyle = "rgba(255,244,197,0.6)";
      ctx.font = `${Math.max(10, w * 0.015)}px "SFMono-Regular","Menlo",monospace`;
      ctx.fillText(`t = ${progress.toFixed(2)}`, w * 0.46, h * 0.08);
    },
  });
}

function setupSkinningWeightsDemo() {
  const canvas = document.getElementById("skinning-weights-canvas");
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
      bgGrad.addColorStop(1, "#1e3b47");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const margin = Math.max(40, w * 0.08);
      const armLen = w - margin * 2;
      const armH = Math.min(h * 0.22, 60);
      const armY = h * 0.45;
      const boneColors = [
        [0.94, 0.42, 0.28],
        [0.28, 0.72, 0.94],
        [0.42, 0.92, 0.48],
      ];
      const bonePositions = [0, 0.34, 0.68, 1.0];

      const segments = 60;
      for (let i = 0; i < segments; i++) {
        const u = (i + 0.5) / segments;
        const x = margin + u * armLen;
        const segW = armLen / segments + 1;

        const weights = [0, 0, 0];
        const centers = [0.17, 0.51, 0.84];
        let total = 0;
        for (let b = 0; b < 3; b++) {
          weights[b] = Math.max(0, 1 - Math.abs(u - centers[b]) / 0.26);
          total += weights[b];
        }
        if (total < 1e-6) { weights[u < 0.34 ? 0 : u < 0.68 ? 1 : 2] = 1; total = 1; }
        for (let b = 0; b < 3; b++) weights[b] /= total;

        const color = [0, 0, 0];
        for (let b = 0; b < 3; b++) {
          color[0] += boneColors[b][0] * weights[b];
          color[1] += boneColors[b][1] * weights[b];
          color[2] += boneColors[b][2] * weights[b];
        }

        ctx.fillStyle = colorToRgba(color, 0.85);
        ctx.fillRect(x - segW / 2, armY - armH / 2, segW, armH);
      }

      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(margin, armY - armH / 2, armLen, armH);

      for (let b = 0; b <= 3; b++) {
        const x = margin + bonePositions[b] * armLen;
        ctx.fillStyle = "rgba(255,245,216,0.95)";
        ctx.beginPath();
        ctx.arc(x, armY + armH / 2 + 16, Math.max(5, w * 0.01), 0, TAU);
        ctx.fill();

        if (b < 3) {
          const nextX = margin + bonePositions[b + 1] * armLen;
          ctx.strokeStyle = "rgba(138,220,255,0.8)";
          ctx.lineWidth = Math.max(3, w * 0.005);
          ctx.beginPath();
          ctx.moveTo(x, armY + armH / 2 + 16);
          ctx.lineTo(nextX, armY + armH / 2 + 16);
          ctx.stroke();
        }
      }

      ctx.fillStyle = "rgba(239,245,247,0.92)";
      ctx.font = `${Math.max(14, w * 0.022)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("Bone influence heat map", margin, armY - armH / 2 - 20);

      for (let b = 0; b < 3; b++) {
        const lx = margin + 10 + b * (armLen * 0.3 + 10);
        const ly = h * 0.78;
        ctx.fillStyle = colorToRgba(boneColors[b], 0.9);
        ctx.fillRect(lx, ly, 16, 16);
        ctx.fillStyle = "rgba(200,220,230,0.85)";
        ctx.font = `${Math.max(12, w * 0.017)}px "Avenir Next","Segoe UI",sans-serif`;
        ctx.fillText(`Bone ${b} (${["shoulder","elbow","wrist"][b]})`, lx + 22, ly + 13);
      }

      ctx.fillStyle = "rgba(200,220,230,0.6)";
      ctx.font = `${Math.max(10, w * 0.015)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("Pure colors = one bone dominates. Blended colors near joints = shared influence.", margin, h * 0.92);
    },
  });
}

function setupAnimationCodeDemo() {
  const canvas = document.getElementById("animation-code-canvas");
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
      const poseAngle = Number(animationCodeControls.pose?.value || 65) / 100;
      const blendWidth = Number(animationCodeControls.blend?.value || 50) / 100;
      const showColors = Boolean(animationCodeControls.colors?.checked);
      const key = `${w}|${h}|${poseAngle.toFixed(2)}|${blendWidth.toFixed(2)}|${showColors}`;
      if (state.key === key) return;
      state.key = key;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#112536");
      bgGrad.addColorStop(1, "#1e3b47");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const boneColors = [[0.94, 0.42, 0.28], [0.28, 0.72, 0.94], [0.42, 0.92, 0.48]];
      const bindJoints = [0, 0.34, 0.68, 0.98];
      const lengths = [0.34, 0.34, 0.3];
      const blendHalf = clamp(blendWidth * 0.3, 0.05, 0.28);

      const columns = [];
      for (let i = 0; i <= 28; i++) {
        const u = i / 28;
        const x = lerp(0, bindJoints[3], u);
        const radius = lerp(0.12, 0.05, u) + Math.sin(u * Math.PI) * 0.016;
        const weights = [0, 0, 0];
        const centers = [0.17, 0.51, 0.84];
        let total = 0;
        for (let b = 0; b < 3; b++) {
          weights[b] = Math.max(0, 1 - Math.abs(x - centers[b]) / blendHalf);
          total += weights[b];
        }
        if (total < 1e-6) { weights[x < bindJoints[1] ? 0 : x < bindJoints[2] ? 1 : 2] = 1; total = 1; }
        for (let b = 0; b < 3; b++) weights[b] /= total;
        columns.push({ top: [x, radius], bottom: [x, -radius], weights });
      }

      const angle = lerp(-0.4, 1.0, poseAngle);
      const localAngles = [angle, angle * 0.7, angle * 0.5];
      const cumAngles = [];
      const joints = [[0, 0]];
      let cum = 0;
      for (let b = 0; b < 3; b++) {
        cum += localAngles[b];
        cumAngles.push(cum);
        joints.push(add2(joints[b], rotate2([lengths[b], 0], cum)));
      }

      const origin = [w * 0.16, h * 0.6];
      const scale = Math.min(w * 0.6, h * 0.5);
      const toCanvas = (p) => [origin[0] + p[0] * scale, origin[1] - p[1] * scale];

      function transformBind(point, boneIdx) {
        const local = [point[0] - bindJoints[boneIdx], point[1]];
        return add2(joints[boneIdx], rotate2(local, cumAngles[boneIdx]));
      }
      function skinPt(point, wts) {
        let rx = 0, ry = 0;
        for (let b = 0; b < 3; b++) {
          if (wts[b] <= 0) continue;
          const p = transformBind(point, b);
          rx += p[0] * wts[b]; ry += p[1] * wts[b];
        }
        return [rx, ry];
      }

      const topPts = columns.map(c => toCanvas(skinPt(c.top, c.weights)));
      const botPts = columns.map(c => toCanvas(skinPt(c.bottom, c.weights)));

      if (showColors) {
        for (let i = 0; i < columns.length - 1; i++) {
          const w0 = columns[i].weights;
          const color = [0, 0, 0];
          for (let b = 0; b < 3; b++) { color[0] += boneColors[b][0] * w0[b]; color[1] += boneColors[b][1] * w0[b]; color[2] += boneColors[b][2] * w0[b]; }
          ctx.fillStyle = colorToRgba(color, 0.75);
          ctx.beginPath();
          ctx.moveTo(topPts[i][0], topPts[i][1]);
          ctx.lineTo(topPts[i+1][0], topPts[i+1][1]);
          ctx.lineTo(botPts[i+1][0], botPts[i+1][1]);
          ctx.lineTo(botPts[i][0], botPts[i][1]);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        const meshGrad = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.7);
        meshGrad.addColorStop(0, "rgba(255,222,171,0.8)");
        meshGrad.addColorStop(1, "rgba(115,221,213,0.7)");
        ctx.fillStyle = meshGrad;
        ctx.beginPath();
        ctx.moveTo(topPts[0][0], topPts[0][1]);
        for (let i = 1; i < topPts.length; i++) ctx.lineTo(topPts[i][0], topPts[i][1]);
        for (let i = botPts.length - 1; i >= 0; i--) ctx.lineTo(botPts[i][0], botPts[i][1]);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(255,244,197,0.85)";
      ctx.lineWidth = Math.max(2, w * 0.003);
      ctx.beginPath();
      ctx.moveTo(topPts[0][0], topPts[0][1]);
      for (const p of topPts) ctx.lineTo(p[0], p[1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(botPts[0][0], botPts[0][1]);
      for (const p of botPts) ctx.lineTo(p[0], p[1]);
      ctx.stroke();

      ctx.strokeStyle = "rgba(138,220,255,0.9)";
      ctx.lineWidth = Math.max(3, w * 0.006);
      for (let b = 0; b < 3; b++) {
        const s = toCanvas(joints[b]);
        const e = toCanvas(joints[b + 1]);
        ctx.beginPath();
        ctx.moveTo(s[0], s[1]);
        ctx.lineTo(e[0], e[1]);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,245,216,0.95)";
      for (let j = 0; j < joints.length; j++) {
        const p = toCanvas(joints[j]);
        ctx.beginPath();
        ctx.arc(p[0], p[1], Math.max(5, w * 0.009), 0, TAU);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(239,245,247,0.85)";
      ctx.font = `${Math.max(12, w * 0.018)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText(`Blend zone: ${(blendWidth * 100).toFixed(0)}%`, 14, 22);
    },
  });
}

/* ── Chapter 15 new demos ─────────────────────────────────────────── */


function initialize() {
  initializePage({
    canvasSetups: [
      ["animation-canvas", setupAnimationDemo],
      ["gimbal-lock-canvas", setupGimbalLockDemo],
      ["lerp-vs-slerp-canvas", setupLerpVsSlerpDemo],
      ["skinning-weights-canvas", setupSkinningWeightsDemo],
      ["animation-code-canvas", setupAnimationCodeDemo]
    ],
    controls: [...Object.values(animationControls), ...Object.values(animationCodeControls)],
    extraSetup: [],
  });
}

initialize();
