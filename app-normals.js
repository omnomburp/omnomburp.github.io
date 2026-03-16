const normalControls = getElementsById({
  azimuth: "light-azimuth",
  elevation: "light-elevation",
  showNormals: "show-normals"
});

const normalProbeControls = getElementsById({
  surface: "normal-probe-surface",
  light: "normal-probe-light",
  scale: "normal-probe-scale",
  fix: "normal-probe-fix"
});

const tbnControls = getElementsById({
  tilt: "tbn-tilt",
  light: "tbn-light",
  useMap: "tbn-use-map",
  showAxes: "tbn-show-axes"
});

function setupGameNormalsStoryDemo() {
  const canvas = document.getElementById("game-normals-canvas");
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
      const phase = prefersReducedMotion ? 1.16 : time * 0.84;
      const sceneRect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const extentX = 4.2;
      const extentY = 2.8;
      const flashlight = [-2.5, 0.18 + Math.sin(phase * 0.86) * 0.92];
      const shieldCenter = [1.48, 0];
      const shieldRadius = 1.06;
      const sampleCount = 30;
      const samples = [];
      let best = null;

      function toScene(point) {
        return projectRectPoint(sceneRect, point, extentX, extentY, 18, 22, 0.6);
      }

      for (let index = 0; index <= sampleCount; index += 1) {
        const t = index / sampleCount;
        const phi = -1.08 + t * 2.16;
        const point = [shieldCenter[0] - Math.cos(phi) * shieldRadius, shieldCenter[1] + Math.sin(phi) * shieldRadius];
        const normal = normalize2(subtract2(point, shieldCenter));
        const lightDir = normalize2(subtract2(flashlight, point));
        const brightness = Math.max(dot2(normal, lightDir), 0);
        const sample = { point, normal, lightDir, brightness };
        samples.push(sample);
        if (!best || brightness > best.brightness) {
          best = sample;
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#0f2232", "#182f42");
      drawLessonCanvasPanel(ctx, sceneRect, "Flashlight vs shield", width);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let x = -4; x <= 4; x += 1) {
        const start = toScene([x, -extentY]);
        const end = toScene([x, extentY]);
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
      }
      for (let y = -2; y <= 2; y += 1) {
        const start = toScene([-extentX, y]);
        const end = toScene([extentX, y]);
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
      }

      const floorStart = toScene([-extentX, -1.7]);
      const floorEnd = toScene([extentX, -1.7]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = Math.max(1.6, width * 0.0024);
      ctx.beginPath();
      ctx.moveTo(floorStart[0], floorStart[1]);
      ctx.lineTo(floorEnd[0], floorEnd[1]);
      ctx.stroke();

      const flashCanvas = toScene(flashlight);
      const bestCanvas = toScene(best.point);
      const upperBeam = toScene(samples[Math.max(0, samples.indexOf(best) - 4)].point);
      const lowerBeam = toScene(samples[Math.min(samples.length - 1, samples.indexOf(best) + 4)].point);
      ctx.fillStyle = "rgba(255, 223, 132, 0.08)";
      ctx.beginPath();
      ctx.moveTo(flashCanvas[0], flashCanvas[1]);
      ctx.lineTo(upperBeam[0], upperBeam[1]);
      ctx.lineTo(lowerBeam[0], lowerBeam[1]);
      ctx.closePath();
      ctx.fill();

      for (let index = 0; index < samples.length - 1; index += 1) {
        const a = toScene(samples[index].point);
        const b = toScene(samples[index + 1].point);
        const brightness = (samples[index].brightness + samples[index + 1].brightness) * 0.5;
        ctx.strokeStyle = `rgba(${Math.round(247 - brightness * 32)}, ${Math.round(160 + brightness * 55)}, ${Math.round(74 + brightness * 122)}, 0.95)`;
        ctx.lineWidth = Math.max(12, width * 0.016);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = Math.max(1.2, width * 0.002);
      ctx.beginPath();
      for (let index = 0; index < samples.length; index += 1) {
        const p = toScene(samples[index].point);
        if (index === 0) {
          ctx.moveTo(p[0], p[1]);
        } else {
          ctx.lineTo(p[0], p[1]);
        }
      }
      ctx.stroke();

      drawCanvasDot(ctx, flashCanvas, Math.max(8, width * 0.0094), "rgba(255, 223, 132, 0.96)", "rgba(255, 245, 216, 0.98)", Math.max(1.6, width * 0.0024));
      ctx.fillStyle = "rgba(255, 223, 132, 0.96)";
      ctx.beginPath();
      ctx.moveTo(flashCanvas[0] + 10, flashCanvas[1]);
      ctx.lineTo(flashCanvas[0] - 8, flashCanvas[1] - 8);
      ctx.lineTo(flashCanvas[0] - 8, flashCanvas[1] + 8);
      ctx.closePath();
      ctx.fill();

      for (let index = 4; index < samples.length; index += 5) {
        const sample = samples[index];
        const start = toScene(sample.point);
        const end = toScene(add2(sample.point, scale2(sample.normal, 0.42)));
        drawArrow2d(ctx, start, end, "rgba(255, 255, 255, 0.45)", Math.max(1.4, width * 0.0022));
      }

      drawCanvasDot(ctx, bestCanvas, Math.max(7, width * 0.0082), "rgba(255, 245, 216, 0.98)");
      drawArrow2d(
        ctx,
        bestCanvas,
        toScene(add2(best.point, scale2(best.normal, 0.72))),
        "rgba(255, 255, 255, 0.96)",
        Math.max(2.2, width * 0.003)
      );
      drawArrow2d(
        ctx,
        bestCanvas,
        flashCanvas,
        "rgba(247, 160, 74, 0.92)",
        Math.max(2, width * 0.0028)
      );
    },
  });
}

function setupNormalDotUseDemo() {
  const canvas = document.getElementById("normal-dot-use-canvas");
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
      const phase = prefersReducedMotion ? 1.06 : time * 0.86;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const center = [rect.x + rect.width * 0.5, rect.y + rect.height * 0.58];
      const normal = normalize2([Math.sin(phase * 0.74) * 0.3, 1]);
      const light = normalize2([Math.cos(phase * 0.92), 0.28 + Math.sin(phase * 0.62) * 0.86]);
      const diffuse = clamp(dot2(normal, light), 0, 1);
      const patchW = rect.width * 0.44;
      const patchH = rect.height * 0.22;
      const fontSize = Math.max(10, width * 0.013);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#0f2232", "#183243");
      drawLessonCanvasPanel(ctx, rect, "Diffuse patch", width);

      const patchGradient = ctx.createLinearGradient(
        center[0] - patchW * 0.5,
        center[1] - patchH * 0.5,
        center[0] + patchW * 0.5,
        center[1] + patchH * 0.5
      );
      patchGradient.addColorStop(0, rgbToCss([0.14 + diffuse * 0.2, 0.34 + diffuse * 0.22, 0.46 + diffuse * 0.18]));
      patchGradient.addColorStop(1, rgbToCss([0.22 + diffuse * 0.5, 0.54 + diffuse * 0.24, 0.7 + diffuse * 0.16]));
      ctx.fillStyle = patchGradient;
      ctx.fillRect(center[0] - patchW * 0.5, center[1] - patchH * 0.5, patchW, patchH);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = Math.max(1.4, width * 0.0024);
      ctx.strokeRect(center[0] - patchW * 0.5, center[1] - patchH * 0.5, patchW, patchH);

      const normalTip = [center[0] + normal[0] * patchH * 1.5, center[1] - normal[1] * patchH * 1.5];
      const lightTip = [center[0] + light[0] * patchW * 0.42, center[1] - light[1] * patchH * 1.8];
      drawArrow2d(ctx, center, normalTip, "rgba(239, 245, 247, 0.96)", Math.max(2, width * 0.003));
      drawArrow2d(ctx, center, lightTip, "rgba(247, 160, 74, 0.94)", Math.max(2, width * 0.003));
      drawCanvasChip(ctx, "n", normalTip[0] + 12, normalTip[1] - 12, {
        fontSize,
        color: "rgba(239, 245, 247, 0.98)",
      });
      drawCanvasChip(ctx, "l", lightTip[0] + 12, lightTip[1] - 12, {
        fontSize,
        color: "rgba(247, 160, 74, 0.98)",
      });
      drawCanvasChip(ctx, `dot ${formatNumber(diffuse, 2)}`, rect.x + rect.width - 12, rect.y + 16, {
        align: "right",
        fontSize,
        color: "rgba(115, 221, 213, 0.98)",
      });
    },
  });
}

function setupNormalFacingUseDemo() {
  const canvas = document.getElementById("normal-facing-use-canvas");
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
      const phase = prefersReducedMotion ? 1.08 : time * 0.82;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const center = [rect.x + rect.width * 0.58, rect.y + rect.height * 0.58];
      const camera = [rect.x + rect.width * 0.18, rect.y + rect.height * 0.34];
      const viewDir = normalize2([(camera[0] - center[0]) / 120, (center[1] - camera[1]) / 120]);
      const angle = 0.4 + Math.sin(phase * 0.88) * 1.45;
      const tangent = [Math.cos(angle), Math.sin(angle)];
      const normal = normalize2(perpendicular2(tangent));
      const facing = dot2(normal, viewDir);
      const isFront = facing > 0;
      const patchColor = isFront ? "rgba(115, 221, 213, 0.24)" : "rgba(247, 160, 74, 0.24)";
      const patchStroke = isFront ? "rgba(115, 221, 213, 0.94)" : "rgba(247, 160, 74, 0.94)";
      const fontSize = Math.max(10, width * 0.013);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#0f2232", "#183243");
      drawLessonCanvasPanel(ctx, rect, "Facing test", width);

      drawCameraGlyph(ctx, camera, 0.1, Math.max(8, width * 0.011), "rgba(255, 223, 132, 0.92)");
      drawArrow2d(ctx, center, camera, "rgba(255, 223, 132, 0.78)", Math.max(1.8, width * 0.0028));

      ctx.save();
      ctx.translate(center[0], center[1]);
      ctx.rotate(angle);
      ctx.fillStyle = patchColor;
      ctx.strokeStyle = patchStroke;
      ctx.lineWidth = Math.max(2, width * 0.003);
      ctx.fillRect(-rect.width * 0.18, -rect.height * 0.08, rect.width * 0.36, rect.height * 0.16);
      ctx.strokeRect(-rect.width * 0.18, -rect.height * 0.08, rect.width * 0.36, rect.height * 0.16);
      ctx.restore();

      const normalTip = [center[0] + normal[0] * rect.width * 0.18, center[1] - normal[1] * rect.height * 0.18];
      drawArrow2d(ctx, center, normalTip, "rgba(239, 245, 247, 0.96)", Math.max(2, width * 0.003));
      drawCanvasChip(ctx, isFront ? "front" : "back", rect.x + rect.width - 12, rect.y + 16, {
        align: "right",
        fontSize,
        color: isFront ? "rgba(115, 221, 213, 0.98)" : "rgba(247, 160, 74, 0.98)",
      });
      drawCanvasChip(ctx, "view", camera[0] + 10, camera[1] - 12, {
        fontSize,
        color: "rgba(255, 223, 132, 0.98)",
      });
      drawCanvasChip(ctx, "n", normalTip[0] + 12, normalTip[1] - 12, {
        fontSize,
        color: "rgba(239, 245, 247, 0.98)",
      });
    },
  });
}

function setupNormalCrossUseDemo() {
  const canvas = document.getElementById("normal-cross-use-canvas");
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
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const extentX = 2.7;
      const extentY = 2.2;
      const pointA = [-1.0, -0.62, -0.18];
      const pointB = [1.22, -0.18, 0.1 + Math.sin(phase * 0.72) * 0.2];
      const pointC = [-0.16, 0.98 + Math.cos(phase * 0.66) * 0.14, 0.76 + Math.sin(phase * 0.84) * 0.2];
      const edge1 = subtract3(pointB, pointA);
      const edge2 = subtract3(pointC, pointA);
      let normal = normalize3(cross3(edge1, edge2));
      if (dot3(normal, normalize3([0.26, 0.38, 1])) < 0) {
        normal = scale3(normal, -1);
      }
      const center = [
        (pointA[0] + pointB[0] + pointC[0]) / 3,
        (pointA[1] + pointB[1] + pointC[1]) / 3,
        (pointA[2] + pointB[2] + pointC[2]) / 3,
      ];
      const tip = add3(center, scale3(normal, 0.9));
      const fontSize = Math.max(10, width * 0.013);

      function project3(point) {
        return projectRectPoint(rect, [point[0] * 0.92 - point[2] * 0.56, point[1] * 0.88 + point[0] * 0.16 + point[2] * 0.28], extentX, extentY, 16, 20, 0.6);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#0f2232", "#183243");
      drawLessonCanvasPanel(ctx, rect, "Face normal", width);
      drawRectAxesGrid(ctx, rect, extentX, extentY, width, 0.6);

      const aCanvas = project3(pointA);
      const bCanvas = project3(pointB);
      const cCanvas = project3(pointC);
      const centerCanvas = project3(center);
      const tipCanvas = project3(tip);
      ctx.fillStyle = "rgba(115, 221, 213, 0.18)";
      ctx.strokeStyle = "rgba(214, 248, 245, 0.92)";
      ctx.lineWidth = Math.max(1.8, width * 0.0028);
      ctx.beginPath();
      ctx.moveTo(aCanvas[0], aCanvas[1]);
      ctx.lineTo(bCanvas[0], bCanvas[1]);
      ctx.lineTo(cCanvas[0], cCanvas[1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      drawArrow2d(ctx, aCanvas, bCanvas, "rgba(247, 160, 74, 0.96)", Math.max(2, width * 0.003));
      drawArrow2d(ctx, aCanvas, cCanvas, "rgba(115, 221, 213, 0.96)", Math.max(2, width * 0.003));
      drawArrow2d(ctx, centerCanvas, tipCanvas, "rgba(239, 245, 247, 0.96)", Math.max(2.1, width * 0.003));
      drawCanvasChip(ctx, "e1", (aCanvas[0] + bCanvas[0]) * 0.5, (aCanvas[1] + bCanvas[1]) * 0.5 - 12, {
        fontSize,
        color: "rgba(247, 160, 74, 0.98)",
      });
      drawCanvasChip(ctx, "e2", (aCanvas[0] + cCanvas[0]) * 0.5, (aCanvas[1] + cCanvas[1]) * 0.5 - 12, {
        fontSize,
        color: "rgba(115, 221, 213, 0.98)",
      });
      drawCanvasChip(ctx, "n", tipCanvas[0] + 10, tipCanvas[1] - 12, {
        fontSize,
        color: "rgba(239, 245, 247, 0.98)",
      });
    },
  });
}

function setupNormalSmoothUseDemo() {
  const canvas = document.getElementById("normal-smooth-use-canvas");
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
      const phase = prefersReducedMotion ? 1.02 : time * 0.8;
      const margin = 18;
      const gap = 14;
      const panelWidth = (width - margin * 2 - gap) / 2;
      const panelHeight = height - margin * 2;
      const leftRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const rightRect = { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };
      const fontSize = Math.max(10, width * 0.013);
      const wobble = Math.sin(phase * 0.84) * 0.04;

      function drawSurface(rect, smooth) {
        drawLessonCanvasPanel(ctx, rect, smooth ? "Smooth" : "Flat", width);
        const poly = [
          [rect.x + rect.width * 0.18, rect.y + rect.height * 0.72],
          [rect.x + rect.width * 0.44, rect.y + rect.height * (0.22 + wobble)],
          [rect.x + rect.width * 0.82, rect.y + rect.height * 0.34],
          [rect.x + rect.width * 0.66, rect.y + rect.height * 0.84],
        ];

        if (smooth) {
          const gradient = ctx.createLinearGradient(poly[0][0], poly[0][1], poly[2][0], poly[1][1]);
          gradient.addColorStop(0, "rgba(44, 86, 116, 0.92)");
          gradient.addColorStop(0.55, "rgba(118, 209, 199, 0.95)");
          gradient.addColorStop(1, "rgba(244, 186, 120, 0.94)");
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = "rgba(108, 153, 182, 0.82)";
        }
        ctx.strokeStyle = "rgba(239, 245, 247, 0.86)";
        ctx.lineWidth = Math.max(1.8, width * 0.0028);
        ctx.beginPath();
        ctx.moveTo(poly[0][0], poly[0][1]);
        for (let index = 1; index < poly.length; index += 1) {
          ctx.lineTo(poly[index][0], poly[index][1]);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (smooth) {
          const normals = [
            { p: poly[0], n: normalize2([-0.36, 1]) },
            { p: poly[1], n: normalize2([0.1, 1]) },
            { p: poly[2], n: normalize2([0.44, 1]) },
          ];
          normals.forEach((entry) => {
            drawArrow2d(ctx, entry.p, [entry.p[0] + entry.n[0] * rect.width * 0.12, entry.p[1] - entry.n[1] * rect.height * 0.16], "rgba(239, 245, 247, 0.9)", Math.max(1.6, width * 0.0024));
          });
          drawCanvasChip(ctx, "many n", rect.x + rect.width - 10, rect.y + 16, {
            align: "right",
            fontSize,
            color: "rgba(115, 221, 213, 0.98)",
          });
        } else {
          const center = [
            (poly[0][0] + poly[1][0] + poly[2][0] + poly[3][0]) / 4,
            (poly[0][1] + poly[1][1] + poly[2][1] + poly[3][1]) / 4,
          ];
          drawArrow2d(ctx, center, [center[0] + rect.width * 0.02, center[1] - rect.height * 0.22], "rgba(239, 245, 247, 0.9)", Math.max(1.8, width * 0.0026));
          drawCanvasChip(ctx, "1 n", rect.x + rect.width - 10, rect.y + 16, {
            align: "right",
            fontSize,
            color: "rgba(247, 160, 74, 0.98)",
          });
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#0f2232", "#183243");
      drawSurface(leftRect, false);
      drawSurface(rightRect, true);
    },
  });
}

function setupNormalsDemo() {
  const canvas = document.getElementById("normals-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const meshProgram = createProgram(gl, litVertexSource, litFragmentSource);
  const lineProgram = createProgram(gl, lineVertexSource, lineFragmentSource);
  const sphere = createSphereData(1.15, 18, 20);
  const normalLines = createNormalLines(sphere.positions, sphere.normals, 0.18);
  const lightArrow = createLightArrow(1.8);

  const sphereBuffers = {
    position: createArrayBuffer(gl, sphere.positions),
    normal: createArrayBuffer(gl, sphere.normals),
    index: createIndexBuffer(gl, sphere.indices),
    count: sphere.indices.length,
  };

  const normalBuffers = {
    position: createArrayBuffer(gl, normalLines.positions),
    color: createArrayBuffer(gl, normalLines.colors),
    count: normalLines.positions.length / 3,
  };

  const arrowBuffers = {
    position: createArrayBuffer(gl, lightArrow.positions),
    color: createArrayBuffer(gl, lightArrow.colors),
    count: lightArrow.positions.length / 3,
  };

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

  const lineLocations = {
    position: gl.getAttribLocation(lineProgram, "aPosition"),
    color: gl.getAttribLocation(lineProgram, "aColor"),
    matrix: gl.getUniformLocation(lineProgram, "uMatrix"),
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const projection = mat4Perspective(degreesToRadians(46), aspect, 0.1, 20);
      const camera = [0, 0.3, 3.7];
      const view = mat4LookAt(camera, [0, 0, 0], [0, 1, 0]);
      const spin = prefersReducedMotion ? 0.5 : time * 0.35;
      const model = mat4Multiply(mat4RotationY(spin), mat4RotationX(-0.28));

      const azimuth = degreesToRadians(Number(normalControls.azimuth.value));
      const elevation = degreesToRadians(Number(normalControls.elevation.value));
      const lightDirection = normalize3([
        Math.cos(elevation) * Math.cos(azimuth),
        Math.sin(elevation),
        Math.cos(elevation) * Math.sin(azimuth),
      ]);

      gl.useProgram(meshProgram);
      gl.uniformMatrix4fv(meshLocations.model, false, model);
      gl.uniformMatrix4fv(meshLocations.view, false, view);
      gl.uniformMatrix4fv(meshLocations.projection, false, projection);
      gl.uniformMatrix3fv(meshLocations.normalMatrix, false, upperLeftMat3(model));
      gl.uniform3fv(meshLocations.lightDirection, new Float32Array(lightDirection));
      gl.uniform3fv(meshLocations.baseColor, new Float32Array([0.3, 0.76, 0.98]));
      gl.uniform3fv(meshLocations.accentColor, new Float32Array([0.97, 0.73, 0.33]));
      gl.uniform3fv(meshLocations.cameraPosition, new Float32Array(camera));
      bindAttribute(gl, sphereBuffers.position, meshLocations.position, 3);
      bindAttribute(gl, sphereBuffers.normal, meshLocations.normal, 3);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffers.index);
      gl.drawElements(gl.TRIANGLES, sphereBuffers.count, gl.UNSIGNED_SHORT, 0);

      const lineMatrix = mat4Multiply(projection, view);
      gl.useProgram(lineProgram);
      gl.uniformMatrix4fv(lineLocations.matrix, false, mat4Multiply(lineMatrix, model));

      if (normalControls.showNormals.checked) {
        bindAttribute(gl, normalBuffers.position, lineLocations.position, 3);
        bindAttribute(gl, normalBuffers.color, lineLocations.color, 3);
        gl.drawArrays(gl.LINES, 0, normalBuffers.count);
      }

      const arrowRotation = mat4Multiply(
        mat4RotationY(Math.atan2(lightDirection[0], lightDirection[2])),
        mat4RotationX(-Math.asin(lightDirection[1]))
      );

      gl.uniformMatrix4fv(lineLocations.matrix, false, mat4Multiply(lineMatrix, arrowRotation));
      bindAttribute(gl, arrowBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, arrowBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, arrowBuffers.count);
    },
  });
}


function evaluateNormalCodeLabBindings(values) {
  const surfaceAngle = degreesToRadians(values.surface_angle);
  const lightAngle = degreesToRadians(values.light_angle);
  const c = Math.cos(surfaceAngle);
  const s = Math.sin(surfaceAngle);

  function transformVector(vector) {
    return [
      vector[0] * c * values.scale[0] - vector[1] * s * values.scale[1],
      vector[0] * s * values.scale[0] + vector[1] * c * values.scale[1],
    ];
  }

  const tangent = normalize2(transformVector([1, 0]));
  const naiveNormal = normalize2(transformVector([0, 1]));
  let geometricNormal = normalize2(perpendicular2(tangent));
  if (dot2(geometricNormal, naiveNormal) < 0) {
    geometricNormal = scale2(geometricNormal, -1);
  }

  const shaderNormal = values.fix_normal_matrix ? geometricNormal : naiveNormal;
  const lightDirection = normalize2([Math.cos(lightAngle), Math.sin(lightAngle)]);
  const diffuse = clamp(dot2(shaderNormal, lightDirection), 0, 1);
  const patch = [
    [-0.92, -0.22],
    [0.92, -0.22],
    [0.92, 0.22],
    [-0.92, 0.22],
  ].map(transformVector);
  const transformMatrix = [
    [c * values.scale[0], -s * values.scale[1]],
    [s * values.scale[0], c * values.scale[1]],
  ];

  const steps = [
    `Build the local surface transform from angle ${formatNumber(values.surface_angle, 1)}° and scale ${formatVector(values.scale, 2)}.`,
    `Transform the tangent, then rebuild a perpendicular geometric normal ${formatVector(geometricNormal, 2)} from the surface itself.`,
    values.fix_normal_matrix
      ? `Use the corrected shading normal ${formatVector(shaderNormal, 2)} instead of the naive transformed normal ${formatVector(naiveNormal, 2)}.`
      : `Skip the normal-matrix fix, so the shader uses the naive transformed normal ${formatVector(shaderNormal, 2)}.`,
    `Compute diffuse = max(dot(normal, light), 0) = max(dot(${formatVector(shaderNormal, 2)}, ${formatVector(lightDirection, 2)}), 0) = ${formatNumber(diffuse, 3)}.`,
  ];

  const lowered = [
    "// CPU-side lesson bindings",
    `mat2 surface = mat2(${formatNumber(transformMatrix[0][0], 3)}, ${formatNumber(transformMatrix[1][0], 3)}, ${formatNumber(transformMatrix[0][1], 3)}, ${formatNumber(transformMatrix[1][1], 3)});`,
    `vec2 lightDir = normalize(vec2(${formatNumber(lightDirection[0], 3)}, ${formatNumber(lightDirection[1], 3)}));`,
    "",
    "// Vertex / shading setup",
    "vec2 tangent = normalize(surface * vec2(1.0, 0.0));",
    "vec2 naiveNormal = normalize(surface * vec2(0.0, 1.0));",
    values.fix_normal_matrix
      ? "vec2 normal = normalize(uNormalMatrix * vec2(0.0, 1.0)); // inverse-transpose style fix"
      : "vec2 normal = naiveNormal; // broken under non-uniform scale",
    "float diffuse = max(dot(normal, lightDir), 0.0);",
  ].join("\n");

  return {
    values,
    patch,
    transformMatrix,
    tangent,
    naiveNormal,
    geometricNormal,
    shaderNormal,
    lightDirection,
    diffuse,
    steps,
    lowered,
  };
}

function updateNormalCodeLabUi(derived, readouts, stepList, loweredOutput) {
  if (readouts.geometry) {
    readouts.geometry.textContent = formatVector(derived.geometricNormal, 2);
  }
  if (readouts.shader) {
    readouts.shader.textContent = formatVector(derived.shaderNormal, 2);
  }
  if (readouts.light) {
    readouts.light.textContent = formatVector(derived.lightDirection, 2);
  }
  if (readouts.diffuse) {
    readouts.diffuse.textContent = formatNumber(derived.diffuse, 3);
  }
  renderCodeSteps(stepList, derived.steps);
  if (loweredOutput) {
    loweredOutput.textContent = derived.lowered;
  }
}

function drawNormalCodeLab(ctx, canvas, derived) {
  const width = canvas.width;
  const height = canvas.height;

  function toCanvas(point) {
    return [
      width * 0.5 + point[0] * width * 0.22,
      height * 0.54 - point[1] * height * 0.22,
    ];
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawLessonCanvasBackground(ctx, width, height, "#102535", "#183243");

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

  ctx.fillStyle = rgbToCss([
    0.18 + derived.diffuse * 0.42,
    0.4 + derived.diffuse * 0.34,
    0.62 + derived.diffuse * 0.24,
  ]);
  ctx.beginPath();
  derived.patch.forEach((point, index) => {
    const canvasPoint = toCanvas(point);
    if (index === 0) {
      ctx.moveTo(canvasPoint[0], canvasPoint[1]);
    } else {
      ctx.lineTo(canvasPoint[0], canvasPoint[1]);
    }
  });
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = Math.max(2, width * 0.004);
  ctx.stroke();

  const center = toCanvas([0, 0]);
  const geometryEnd = toCanvas(scale2(derived.geometricNormal, 1.2));
  const shaderEnd = toCanvas(scale2(derived.shaderNormal, 1.05));
  const lightEnd = toCanvas(scale2(derived.lightDirection, 1.45));

  ctx.strokeStyle = "rgba(255, 243, 201, 0.95)";
  ctx.lineWidth = Math.max(2.1, width * 0.0044);
  ctx.beginPath();
  ctx.moveTo(center[0], center[1]);
  ctx.lineTo(lightEnd[0], lightEnd[1]);
  ctx.stroke();

  ctx.strokeStyle = "rgba(239, 245, 247, 0.92)";
  ctx.beginPath();
  ctx.moveTo(center[0], center[1]);
  ctx.lineTo(geometryEnd[0], geometryEnd[1]);
  ctx.stroke();

  ctx.strokeStyle = "rgba(110, 226, 201, 0.98)";
  ctx.beginPath();
  ctx.moveTo(center[0], center[1]);
  ctx.lineTo(shaderEnd[0], shaderEnd[1]);
  ctx.stroke();
  const chipFont = Math.max(10, width * 0.0135);
  drawCanvasChip(ctx, "L", lightEnd[0], lightEnd[1] - 14, {
    fontSize: chipFont,
    color: "rgba(255, 243, 201, 0.98)",
  });
  drawCanvasChip(ctx, "Ng", geometryEnd[0] + 14, geometryEnd[1] - 14, {
    fontSize: chipFont,
    color: "rgba(239, 245, 247, 0.98)",
  });
  drawCanvasChip(ctx, "Ns", shaderEnd[0] + 14, shaderEnd[1] + 14, {
    fontSize: chipFont,
    color: "rgba(110, 226, 201, 0.98)",
  });

  const meterX = 20;
  const meterY = height - 34;
  const meterW = width - 40;
  const meterH = 12;
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(meterX, meterY, meterW, meterH);
  ctx.fillStyle = rgbToCss([0.22 + derived.diffuse * 0.66, 0.74, 0.92 - derived.diffuse * 0.2]);
  ctx.fillRect(meterX, meterY, meterW * derived.diffuse, meterH);

}

function setupNormalCodeLab() {
  setupCodeLab({
    prefix: "normal-code",
    schema: [
      { name: "surface_angle", type: "number" },
      { name: "light_angle", type: "number" },
      { name: "scale", type: "vec2" },
      { name: "fix_normal_matrix", type: "bool" },
    ],
    defaults: {
      surface_angle: 18,
      light_angle: 42,
      scale: vec2(1.8, 0.52),
      fix_normal_matrix: true,
    },
    readoutIds: {
      geometry: "normal-code-readout-geometry",
      shader: "normal-code-readout-shader",
      light: "normal-code-readout-light",
      diffuse: "normal-code-readout-diffuse",
    },
    evaluate: evaluateNormalCodeLabBindings,
    updateUi: updateNormalCodeLabUi,
    getStatusMessage(parsed, derived) {
      return `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}. Diffuse is ${formatNumber(derived.diffuse, 3)} with the ${derived.values.fix_normal_matrix ? "corrected" : "naive"} shader normal.`;
    },
    draw: drawNormalCodeLab,
    levels: [
      {
        id: "guided", label: "Guided",
        source: "# Change surface_angle and watch the normal rotate\nsurface_angle = 18\nlight_angle = 42\nscale = vec2(1.80, 0.52)\nfix_normal_matrix = true",
        instructions: "Change surface_angle to rotate the patch. Toggle fix_normal_matrix between true and false to see the bug appear.",
      },
      {
        id: "challenge", label: "Challenge",
        source: "# Goal: get diffuse >= 0.85 with fix OFF\nsurface_angle = 18\nlight_angle = 42\nscale = vec2(1.80, 0.52)\nfix_normal_matrix = false",
        instructions: "With fix_normal_matrix = false, adjust the angles until the diffuse term reaches at least 0.85.",
        target: { match(derived) { return !derived.values.fix_normal_matrix && derived.diffuse >= 0.85; } },
      },
      {
        id: "explore", label: "Explore",
        source: "surface_angle = 18\nlight_angle = 42\nscale = vec2(1.80, 0.52)\nfix_normal_matrix = true",
        instructions: "Try any values. Use expressions like light_angle = 30 + 15 or scale = vec2(cos(0.5) * 2, 1.0).",
      },
    ],
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

function setupNormalMapCompareDemo() {
  const canvas = document.getElementById("normal-map-compare-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  function bumpHeight(u, v) {
    return (Math.sin(u * 18) * Math.cos(v * 14) * 0.5 +
            Math.sin(u * 7 + v * 11) * 0.3 +
            Math.cos(u * 23 - v * 5) * 0.2);
  }

  function bumpNormal(u, v) {
    const eps = 0.005;
    const hc = bumpHeight(u, v);
    const hu = bumpHeight(u + eps, v);
    const hv = bumpHeight(u, v + eps);
    const du = (hu - hc) / eps;
    const dv = (hv - hc) / eps;
    const len = Math.hypot(du, dv, 1);
    return [-du / len, -dv / len, 1 / len];
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

      const lightAngle = prefersReducedMotion ? 0.7 : time * 0.3;
      const lightX = Math.cos(lightAngle);
      const lightY = 0.3;
      const lightZ = Math.sin(lightAngle);
      const lightLen = Math.hypot(lightX, lightY, lightZ);
      const lx = lightX / lightLen;
      const ly = lightY / lightLen;
      const lz = lightZ / lightLen;

      const margin = 16;
      const gap = 16;
      const panelW = (width - margin * 2 - gap) / 2;
      const panelH = height - margin * 2;
      const leftRect = { x: margin, y: margin, width: panelW, height: panelH };
      const rightRect = { x: margin + panelW + gap, y: margin, width: panelW, height: panelH };

      function drawPanel(rect, title, useNormalMap) {
        drawLessonCanvasPanel(ctx, rect, title, width);
        const res = 80;
        const cellW = (rect.width - 20) / res;
        const cellH = (rect.height - 54) / res;
        const startX = rect.x + 10;
        const startY = rect.y + 40;

        for (let iy = 0; iy < res; iy++) {
          for (let ix = 0; ix < res; ix++) {
            const u = ix / res;
            const v = iy / res;
            let nx = 0, ny = 0, nz = 1;

            if (useNormalMap) {
              const n = bumpNormal(u, v);
              nx = n[0];
              ny = n[1];
              nz = n[2];
            }

            const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
            const ambient = 0.08;
            const brightness = Math.min(1, ambient + diff * 0.92);
            const r = Math.floor(brightness * 180 + 40);
            const g = Math.floor(brightness * 195 + 35);
            const bVal = Math.floor(brightness * 210 + 30);
            ctx.fillStyle = `rgb(${r},${g},${bVal})`;
            ctx.fillRect(startX + ix * cellW, startY + iy * cellH, Math.ceil(cellW), Math.ceil(cellH));
          }
        }
      }

      drawPanel(leftRect, "Vertex normals only", false);
      drawPanel(rightRect, "With normal map", true);
    },
  });
}

function setupTbnStoryDemo() {
  const canvas = document.getElementById("tbn-story-canvas");
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

      const tilt = prefersReducedMotion ? 0.3 : Math.sin(time * 0.4) * 0.5;

      const cx = width * 0.5;
      const cy = height * 0.55;
      const patchSize = Math.min(width, height) * 0.3;
      const axisLen = patchSize * 0.7;

      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);

      const hw = patchSize;
      const hh = patchSize * 0.5;
      const corners = [
        [cx - hw * cosT, cy + hh],
        [cx + hw * cosT, cy + hh],
        [cx + hw * cosT, cy - hh],
        [cx - hw * cosT, cy - hh],
      ];

      const squeeze = 0.6 + sinT * 0.3;
      for (let i = 2; i < 4; i++) {
        corners[i][0] = cx + (corners[i][0] - cx) * squeeze;
        corners[i][1] = cy + (corners[i][1] - cy) * squeeze * 0.8 - sinT * patchSize * 0.4;
      }

      ctx.fillStyle = "rgba(60, 80, 100, 0.4)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(corners[0][0], corners[0][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(corners[i][0], corners[i][1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const scx = (corners[0][0] + corners[1][0] + corners[2][0] + corners[3][0]) / 4;
      const scy = (corners[0][1] + corners[1][1] + corners[2][1] + corners[3][1]) / 4;

      const tvx = cosT;
      const tvy = 0;
      const bvx = 0;
      const bvy = -squeeze * 0.8;
      const nvx = sinT * 0.6;
      const nvy = -cosT * 0.8;

      drawArrow2d(ctx, [scx, scy], [scx + tvx * axisLen, scy + tvy * axisLen], "rgba(240, 90, 90, 0.9)", 2.5);
      ctx.fillStyle = "rgba(240, 90, 90, 0.94)";
      ctx.font = `bold ${Math.max(12, width * 0.018)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillText("T", scx + tvx * axisLen + 8, scy + tvy * axisLen + 4);

      drawArrow2d(ctx, [scx, scy], [scx + bvx * axisLen, scy + bvy * axisLen], "rgba(90, 210, 90, 0.9)", 2.5);
      ctx.fillStyle = "rgba(90, 210, 90, 0.94)";
      ctx.fillText("B", scx + bvx * axisLen + 8, scy + bvy * axisLen - 4);

      drawArrow2d(ctx, [scx, scy], [scx + nvx * axisLen, scy + nvy * axisLen], "rgba(90, 150, 240, 0.9)", 2.5);
      ctx.fillStyle = "rgba(90, 150, 240, 0.94)";
      ctx.fillText("N", scx + nvx * axisLen + 8, scy + nvy * axisLen - 4);

      ctx.fillStyle = "rgba(239, 245, 247, 0.7)";
      ctx.font = `${Math.max(11, width * 0.014)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillText("TBN = mat3(T, B, N)", 20, height - 20);
      ctx.fillText("worldNormal = TBN \u00D7 tangentNormal", 20, height - 40);
    },
  });
}

function setupTbnLabDemo() {
  const canvas = document.getElementById("tbn-lab-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const readoutT = document.getElementById("tbn-readout-t");
  const readoutB = document.getElementById("tbn-readout-b");
  const readoutN = document.getElementById("tbn-readout-n");
  const readoutLight = document.getElementById("tbn-readout-light");

  function bumpHeight(u, v) {
    return (Math.sin(u * 18) * Math.cos(v * 14) * 0.5 +
            Math.sin(u * 7 + v * 11) * 0.3 +
            Math.cos(u * 23 - v * 5) * 0.2);
  }

  function bumpNormal(u, v) {
    const eps = 0.005;
    const hc = bumpHeight(u, v);
    const hu = bumpHeight(u + eps, v);
    const hv = bumpHeight(u, v + eps);
    const du = (hu - hc) / eps;
    const dv = (hv - hc) / eps;
    const len = Math.hypot(du, dv, 1);
    return [-du / len, -dv / len, 1 / len];
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const tiltDeg = parseFloat(tbnControls.tilt?.value ?? 30);
      const lightDeg = parseFloat(tbnControls.light?.value ?? 45);
      const useMap = tbnControls.useMap?.checked ?? true;
      const showAxes = tbnControls.showAxes?.checked ?? true;

      const tiltRad = degreesToRadians(tiltDeg);
      const lightRad = degreesToRadians(lightDeg);

      const T = [1, 0, 0];
      const B = [0, Math.cos(tiltRad), Math.sin(tiltRad)];
      const N = [0, -Math.sin(tiltRad), Math.cos(tiltRad)];

      const lxr = Math.cos(lightRad) * 0.707;
      const lyr = 0.5;
      const lzr = Math.sin(lightRad) * 0.707;
      const lLen = Math.hypot(lxr, lyr, lzr);
      const lightDir = [lxr / lLen, lyr / lLen, lzr / lLen];

      const res = 64;
      const margin = 20;
      const surfaceW = width - margin * 2;
      const surfaceH = height - margin * 2 - 20;
      const cellW = surfaceW / res;
      const cellH = surfaceH / res;

      for (let iy = 0; iy < res; iy++) {
        for (let ix = 0; ix < res; ix++) {
          const u = ix / res;
          const v = iy / res;

          let worldN;
          if (useMap) {
            const tn = bumpNormal(u, v);
            worldN = [
              T[0] * tn[0] + B[0] * tn[1] + N[0] * tn[2],
              T[1] * tn[0] + B[1] * tn[1] + N[1] * tn[2],
              T[2] * tn[0] + B[2] * tn[1] + N[2] * tn[2],
            ];
            const wLen = Math.hypot(worldN[0], worldN[1], worldN[2]);
            worldN[0] /= wLen; worldN[1] /= wLen; worldN[2] /= wLen;
          } else {
            worldN = [N[0], N[1], N[2]];
          }

          const diff = Math.max(0, worldN[0] * lightDir[0] + worldN[1] * lightDir[1] + worldN[2] * lightDir[2]);
          const brightness = Math.min(1, 0.06 + diff * 0.94);
          const r = Math.floor(brightness * 175 + 45);
          const g = Math.floor(brightness * 190 + 40);
          const bVal = Math.floor(brightness * 215 + 25);
          ctx.fillStyle = `rgb(${r},${g},${bVal})`;
          ctx.fillRect(margin + ix * cellW, margin + 10 + iy * cellH, Math.ceil(cellW), Math.ceil(cellH));
        }
      }

      if (showAxes) {
        const acx = width * 0.5;
        const acy = height * 0.5;
        const axLen = Math.min(width, height) * 0.15;

        const projT = [T[0] * axLen, -T[2] * axLen * 0.5 - T[1] * axLen * 0.3];
        const projB = [B[0] * axLen, -B[2] * axLen * 0.5 - B[1] * axLen * 0.3];
        const projN = [N[0] * axLen, -N[2] * axLen * 0.5 - N[1] * axLen * 0.3];

        ctx.fillStyle = "rgba(8, 21, 30, 0.5)";
        ctx.beginPath();
        ctx.arc(acx, acy, axLen * 1.3, 0, Math.PI * 2);
        ctx.fill();

        drawArrow2d(ctx, [acx, acy], [acx + projT[0], acy + projT[1]], "rgba(240, 90, 90, 0.9)", 2.5);
        drawArrow2d(ctx, [acx, acy], [acx + projB[0], acy + projB[1]], "rgba(90, 210, 90, 0.9)", 2.5);
        drawArrow2d(ctx, [acx, acy], [acx + projN[0], acy + projN[1]], "rgba(90, 150, 240, 0.9)", 2.5);

        const labelFont = `bold ${Math.max(12, width * 0.018)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.font = labelFont;
        ctx.fillStyle = "rgba(240, 90, 90, 0.94)";
        ctx.fillText("T", acx + projT[0] + 6, acy + projT[1] - 4);
        ctx.fillStyle = "rgba(90, 210, 90, 0.94)";
        ctx.fillText("B", acx + projB[0] + 6, acy + projB[1] - 4);
        ctx.fillStyle = "rgba(90, 150, 240, 0.94)";
        ctx.fillText("N", acx + projN[0] + 6, acy + projN[1] - 4);
      }

      if (readoutT) readoutT.textContent = `(${T[0].toFixed(2)}, ${T[1].toFixed(2)}, ${T[2].toFixed(2)})`;
      if (readoutB) readoutB.textContent = `(${B[0].toFixed(2)}, ${B[1].toFixed(2)}, ${B[2].toFixed(2)})`;
      if (readoutN) readoutN.textContent = `(${N[0].toFixed(2)}, ${N[1].toFixed(2)}, ${N[2].toFixed(2)})`;
      if (readoutLight) readoutLight.textContent = `(${lightDir[0].toFixed(2)}, ${lightDir[1].toFixed(2)}, ${lightDir[2].toFixed(2)})`;
    },
  });
}


function setupNormalProbeDemo() {
  const canvas = document.getElementById("normal-probe-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const readouts = {
    geometry: document.getElementById("normal-probe-geometry"),
    shader: document.getElementById("normal-probe-shader"),
    light: document.getElementById("normal-probe-light-readout"),
    dot: document.getElementById("normal-probe-dot"),
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;

      const surfaceAngle = degreesToRadians(Number(normalProbeControls.surface?.value || 0));
      const lightAngle = degreesToRadians(Number(normalProbeControls.light?.value || 0));
      const scaled = Boolean(normalProbeControls.scale?.checked);
      const fixed = Boolean(normalProbeControls.fix?.checked);
      const scaleX = scaled ? 1.85 : 1;
      const scaleY = scaled ? 0.52 : 1;
      const c = Math.cos(surfaceAngle);
      const s = Math.sin(surfaceAngle);

      function transformVector(vector) {
        return [
          vector[0] * c * scaleX - vector[1] * s * scaleY,
          vector[0] * s * scaleX + vector[1] * c * scaleY,
        ];
      }

      const localPatch = [
        [-0.92, -0.22],
        [0.92, -0.22],
        [0.92, 0.22],
        [-0.92, 0.22],
      ];
      const patch = localPatch.map(transformVector);
      const tangent = normalize2(transformVector([1, 0]));
      const naiveNormal = normalize2(transformVector([0, 1]));
      let geometricNormal = normalize2(perpendicular2(tangent));
      if (dot2(geometricNormal, naiveNormal) < 0) {
        geometricNormal = scale2(geometricNormal, -1);
      }
      const shaderNormal = fixed || !scaled ? geometricNormal : naiveNormal;
      const lightDirection = normalize2([Math.cos(lightAngle), Math.sin(lightAngle)]);
      const diffuse = clamp(dot2(shaderNormal, lightDirection), 0, 1);

      function toCanvas(point) {
        return [
          width * 0.5 + point[0] * width * 0.22,
          height * 0.52 - point[1] * height * 0.22,
        ];
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#183243");
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

      ctx.fillStyle = rgbToCss([
        0.18 + diffuse * 0.42,
        0.4 + diffuse * 0.34,
        0.62 + diffuse * 0.24,
      ]);
      ctx.beginPath();
      patch.forEach((point, index) => {
        const canvasPoint = toCanvas(point);
        if (index === 0) {
          ctx.moveTo(canvasPoint[0], canvasPoint[1]);
        } else {
          ctx.lineTo(canvasPoint[0], canvasPoint[1]);
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = Math.max(2, width * 0.004);
      ctx.stroke();

      const center = toCanvas([0, 0]);
      const geometryEnd = toCanvas(scale2(geometricNormal, 1.2));
      const shaderEnd = toCanvas(scale2(shaderNormal, 1.05));
      const lightEnd = toCanvas(scale2(lightDirection, 1.45));

      ctx.strokeStyle = "rgba(255, 243, 201, 0.95)";
      ctx.lineWidth = Math.max(2.1, width * 0.0044);
      ctx.beginPath();
      ctx.moveTo(center[0], center[1]);
      ctx.lineTo(lightEnd[0], lightEnd[1]);
      ctx.stroke();

      ctx.strokeStyle = "rgba(239, 245, 247, 0.92)";
      ctx.beginPath();
      ctx.moveTo(center[0], center[1]);
      ctx.lineTo(geometryEnd[0], geometryEnd[1]);
      ctx.stroke();

      ctx.strokeStyle = "rgba(110, 226, 201, 0.98)";
      ctx.beginPath();
      ctx.moveTo(center[0], center[1]);
      ctx.lineTo(shaderEnd[0], shaderEnd[1]);
      ctx.stroke();
      const chipFont = Math.max(10, width * 0.0135);
      drawCanvasChip(ctx, "L", lightEnd[0], lightEnd[1] - 14, {
        fontSize: chipFont,
        color: "rgba(255, 243, 201, 0.98)",
      });
      drawCanvasChip(ctx, "Ng", geometryEnd[0] + 14, geometryEnd[1] - 14, {
        fontSize: chipFont,
        color: "rgba(239, 245, 247, 0.98)",
      });
      drawCanvasChip(ctx, "Ns", shaderEnd[0] + 14, shaderEnd[1] + 14, {
        fontSize: chipFont,
        color: "rgba(110, 226, 201, 0.98)",
      });

      const meterX = 20;
      const meterY = height - 34;
      const meterW = width - 40;
      const meterH = 12;
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.fillRect(meterX, meterY, meterW, meterH);
      ctx.fillStyle = rgbToCss([0.22 + diffuse * 0.66, 0.74, 0.92 - diffuse * 0.2]);
      ctx.fillRect(meterX, meterY, meterW * diffuse, meterH);

      if (readouts.geometry) {
        readouts.geometry.textContent = formatVector(geometricNormal, 2);
      }
      if (readouts.shader) {
        readouts.shader.textContent = formatVector(shaderNormal, 2);
      }
      if (readouts.light) {
        readouts.light.textContent = formatVector(lightDirection, 2);
      }
      if (readouts.dot) {
        readouts.dot.textContent = `${formatNumber(diffuse, 3)} diffuse`;
      }
    },
  });
}


function setupTbnAnimationDemo() {
  const canvas = document.getElementById("tbn-animation-canvas");
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
      const t = prefersReducedMotion ? 0 : (time || 0);
      const key = `${w}|${h}|${Math.floor(t * 4)}`;
      if (state.key === key) return;
      state.key = key;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      drawLessonCanvasBackground(ctx, w, h);

      const tiltAngle = Math.sin(t * 0.6) * 0.65;
      const cx = w * 0.5;
      const cy = h * 0.55;

      // draw the surface patch as a tilted parallelogram
      const patchHalfW = w * 0.28;
      const patchHalfH = h * 0.08;
      const skew = Math.sin(tiltAngle) * patchHalfW * 0.5;

      const pTL = [cx - patchHalfW + skew, cy - patchHalfH];
      const pTR = [cx + patchHalfW + skew, cy - patchHalfH];
      const pBR = [cx + patchHalfW - skew, cy + patchHalfH];
      const pBL = [cx - patchHalfW - skew, cy + patchHalfH];

      // surface fill
      const surfGrad = ctx.createLinearGradient(pTL[0], pTL[1], pBR[0], pBR[1]);
      surfGrad.addColorStop(0, "rgba(60, 100, 140, 0.5)");
      surfGrad.addColorStop(1, "rgba(40, 75, 110, 0.4)");
      ctx.fillStyle = surfGrad;
      ctx.beginPath();
      ctx.moveTo(pTL[0], pTL[1]);
      ctx.lineTo(pTR[0], pTR[1]);
      ctx.lineTo(pBR[0], pBR[1]);
      ctx.lineTo(pBL[0], pBL[1]);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(150, 190, 220, 0.4)";
      ctx.lineWidth = Math.max(1, w * 0.002);
      ctx.stroke();

      // draw grid lines on the surface for depth
      const gridLines = 5;
      ctx.strokeStyle = "rgba(150, 190, 220, 0.15)";
      ctx.lineWidth = 1;
      for (let i = 1; i < gridLines; i++) {
        const frac = i / gridLines;
        const lx = lerp(pTL[0], pBL[0], frac);
        const ly = lerp(pTL[1], pBL[1], frac);
        const rx = lerp(pTR[0], pBR[0], frac);
        const ry = lerp(pTR[1], pBR[1], frac);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(rx, ry);
        ctx.stroke();

        const tx = lerp(pTL[0], pTR[0], frac);
        const ty = lerp(pTL[1], pTR[1], frac);
        const bx = lerp(pBL[0], pBR[0], frac);
        const by = lerp(pBL[1], pBR[1], frac);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }

      // TBN vectors
      const arrowLen = Math.min(w, h) * 0.2;
      const arrowW = Math.max(2.2, w * 0.005);

      // T is along the surface horizontal (tangent)
      const tangentDir = normalize2([pTR[0] - pTL[0], pTR[1] - pTL[1]]);
      const tEnd = [cx + tangentDir[0] * arrowLen, cy + tangentDir[1] * arrowLen];

      // N is perpendicular to the surface, pointing "up/out"
      const normalDir = normalize2([-tangentDir[1], tangentDir[0]]);
      // flip N to always point upward
      const nDir = normalDir[1] < 0 ? normalDir : [-normalDir[0], -normalDir[1]];
      const nEnd = [cx + nDir[0] * arrowLen, cy + nDir[1] * arrowLen];

      // B is perpendicular to T and N in the surface plane (cross product in 2D sense)
      // In 2D projection we show B going "into" the surface at an angle
      const bDir = normalize2([
        nDir[0] * 0.3 + tangentDir[0] * 0.15,
        nDir[1] * 0.3 + tangentDir[1] * 0.7,
      ]);
      const bEnd = [cx + bDir[0] * arrowLen * 0.75, cy + bDir[1] * arrowLen * 0.75];

      // draw arrows
      drawArrow2d(ctx, [cx, cy], tEnd, "rgba(240, 90, 90, 0.92)", arrowW);
      drawArrow2d(ctx, [cx, cy], bEnd, "rgba(90, 210, 90, 0.85)", arrowW);
      drawArrow2d(ctx, [cx, cy], nEnd, "rgba(90, 150, 240, 0.92)", arrowW);

      // normal-map perturbation arrow (purple) - small deviation from N
      const perturbAngle = Math.sin(t * 1.2) * 0.25;
      const perturbDir = normalize2([
        nDir[0] * Math.cos(perturbAngle) - nDir[1] * Math.sin(perturbAngle),
        nDir[0] * Math.sin(perturbAngle) + nDir[1] * Math.cos(perturbAngle),
      ]);
      const perturbLen = arrowLen * 0.55;
      const perturbEnd = [cx + perturbDir[0] * perturbLen, cy + perturbDir[1] * perturbLen];
      ctx.setLineDash([4, 3]);
      drawArrow2d(ctx, [cx, cy], perturbEnd, "rgba(180, 120, 240, 0.8)", arrowW * 0.8);
      ctx.setLineDash([]);

      // labels
      const labelFont = `bold ${Math.max(13, w * 0.022)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.font = labelFont;
      ctx.textAlign = "left";

      ctx.fillStyle = "rgba(240, 90, 90, 0.94)";
      ctx.fillText("T", tEnd[0] + 6, tEnd[1] - 4);
      ctx.fillStyle = "rgba(90, 210, 90, 0.94)";
      ctx.fillText("B", bEnd[0] + 6, bEnd[1] - 4);
      ctx.fillStyle = "rgba(90, 150, 240, 0.94)";
      ctx.fillText("N", nEnd[0] + 6, nEnd[1] - 4);
      ctx.fillStyle = "rgba(180, 120, 240, 0.85)";
      ctx.fillText("perturbed", perturbEnd[0] + 6, perturbEnd[1] + 4);

      // text annotation
      ctx.textAlign = "center";
      ctx.font = `${Math.max(11, w * 0.019)}px "SFMono-Regular","Menlo",monospace`;
      ctx.fillStyle = "rgba(239, 245, 247, 0.55)";
      ctx.fillText("T, B, N form a local coordinate frame on the surface", cx, h - Math.max(14, h * 0.04));

      // origin dot
      drawCanvasDot(ctx, [cx, cy], Math.max(4, w * 0.008), "rgba(239, 245, 247, 0.85)");
    },
  });
}


function initialize() {
  initializePage({
    canvasSetups: [
      ["game-normals-canvas", setupGameNormalsStoryDemo],
      ["normal-dot-use-canvas", setupNormalDotUseDemo],
      ["normal-facing-use-canvas", setupNormalFacingUseDemo],
      ["normal-cross-use-canvas", setupNormalCrossUseDemo],
      ["normal-smooth-use-canvas", setupNormalSmoothUseDemo],
      ["normals-canvas", setupNormalsDemo],
      ["normal-code-canvas", setupNormalCodeLab],
      ["normal-map-compare-canvas", setupNormalMapCompareDemo],
      ["tbn-story-canvas", setupTbnStoryDemo],
      ["tbn-animation-canvas", setupTbnAnimationDemo],
      ["tbn-lab-canvas", setupTbnLabDemo],
      ["normal-probe-canvas", setupNormalProbeDemo]
    ],
    controls: [...Object.values(normalControls), ...Object.values(normalProbeControls), ...Object.values(tbnControls)],
    extraSetup: [],
  });
}

initialize();
