const vectorControls = getElementsById({
  rotation: "vector-rotation",
  scaleX: "vector-scale-x",
  scaleY: "vector-scale-y"
});

const determinantControls = getElementsById({
  col1Angle: "det-col1-angle",
  col1Len: "det-col1-len",
  col2Angle: "det-col2-angle",
  col2Len: "det-col2-len"
});

const basisProbeControls = getElementsById({
  angle: "basis-angle",
  translateX: "basis-translate-x",
  translateY: "basis-translate-y",
  translateToggle: "basis-translate-toggle"
});

function setupVectorDemo() {
  const canvas = document.getElementById("vectors-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const lineProgram = createProgram(gl, lineVertexSource, lineFragmentSource);
  const flatProgram = createProgram(gl, flatVertexSource, flatFragmentSource);
  const grid = createGridLines(6, 1);
  const axes = createAxisArrows(1.55);
  const triangle = new Float32Array([
    0.0, 0.0, 0.0,
    1.45, 0.1, 0.0,
    0.35, 1.18, 0.0,
  ]);

  const gridBuffers = {
    position: createArrayBuffer(gl, grid.positions),
    color: createArrayBuffer(gl, grid.colors),
    count: grid.positions.length / 3,
  };

  const axisBuffers = {
    position: createArrayBuffer(gl, axes.positions),
    color: createArrayBuffer(gl, axes.colors),
    count: axes.positions.length / 3,
  };

  const triangleBuffer = createArrayBuffer(gl, triangle);

  const lineLocations = {
    position: gl.getAttribLocation(lineProgram, "aPosition"),
    color: gl.getAttribLocation(lineProgram, "aColor"),
    matrix: gl.getUniformLocation(lineProgram, "uMatrix"),
  };

  const flatLocations = {
    position: gl.getAttribLocation(flatProgram, "aPosition"),
    matrix: gl.getUniformLocation(flatProgram, "uMatrix"),
    color: gl.getUniformLocation(flatProgram, "uColor"),
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const projection = mat4Orthographic(-6 * aspect, 6 * aspect, -6, 6, -1, 1);

      const rotation = degreesToRadians(Number(vectorControls.rotation.value));
      const scaleX = Number(vectorControls.scaleX.value) / 100;
      const scaleY = Number(vectorControls.scaleY.value) / 100;
      const transform = mat4Multiply(
        mat4RotationZ(rotation),
        mat4Scaling(scaleX, scaleY, 1)
      );
      const transformedMatrix = mat4Multiply(projection, transform);

      gl.useProgram(lineProgram);
      gl.uniformMatrix4fv(lineLocations.matrix, false, projection);
      bindAttribute(gl, gridBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, gridBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, gridBuffers.count);

      gl.uniformMatrix4fv(lineLocations.matrix, false, transformedMatrix);
      bindAttribute(gl, axisBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, axisBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, axisBuffers.count);

      gl.useProgram(flatProgram);
      bindAttribute(gl, triangleBuffer, flatLocations.position, 3);

      gl.uniformMatrix4fv(flatLocations.matrix, false, projection);
      gl.uniform4fv(flatLocations.color, new Float32Array([0.85, 0.89, 0.95, 0.18]));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.uniform4fv(flatLocations.color, new Float32Array([0.92, 0.95, 0.99, 0.45]));
      gl.drawArrays(gl.LINE_LOOP, 0, 3);

      gl.uniformMatrix4fv(flatLocations.matrix, false, transformedMatrix);
      gl.uniform4fv(flatLocations.color, new Float32Array([0.24, 0.82, 0.78, 0.3]));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.uniform4fv(flatLocations.color, new Float32Array([0.99, 0.74, 0.35, 1.0]));
      gl.drawArrays(gl.LINE_LOOP, 0, 3);
    },
  });
}


function setupFoundationTypesDemo() {
  const canvas = document.getElementById("foundation-types-canvas");
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
      const phase = prefersReducedMotion ? 1.1 : time * 0.82;
      const margin = 18;
      const gap = 16;
      const stacked = width < 900;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap * 2) / 3;
      const panelHeight = stacked ? (height - margin * 2 - gap * 2) / 3 : height - margin * 2;
      const translation = [Math.sin(phase * 0.9) * 0.62, 0.32 + Math.cos(phase * 0.68) * 0.22];
      const pointStart = [0.92, 0.42];
      const pointEnd = add2(pointStart, scale2(translation, 0.92));
      const offsetStart = [-1.4, -0.72];
      const offsetDelta = [1.42, 0.88];
      const offsetEnd = add2(offsetStart, offsetDelta);
      const movedOffsetStart = add2(offsetStart, scale2(translation, 0.76));
      const movedOffsetEnd = add2(offsetEnd, scale2(translation, 0.76));
      const direction = normalize2([1, 0.34 + Math.sin(phase * 1.18) * 0.26]);
      const directionVector = scale2(direction, 1.38);
      const directionAnchorA = [-1.18, -0.44];
      const directionAnchorB = add2(directionAnchorA, scale2(translation, 0.9));
      const rects = [
        { x: margin, y: margin, width: panelWidth, height: panelHeight },
        stacked
          ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
          : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
        stacked
          ? { x: margin, y: margin + (panelHeight + gap) * 2, width: panelWidth, height: panelHeight }
          : { x: margin + (panelWidth + gap) * 2, y: margin, width: panelWidth, height: panelHeight },
      ];

      function drawPointPanel(rect) {
        const extentX = 2.9;
        const extentY = 2.4;
        drawLessonCanvasPanel(ctx, rect, "Point", width);
        drawRectAxesGrid(ctx, rect, extentX, extentY, width);
        const startCanvas = projectRectPoint(rect, pointStart, extentX, extentY);
        const endCanvas = projectRectPoint(rect, pointEnd, extentX, extentY);

        ctx.setLineDash([8, 6]);
        drawArrow2d(ctx, startCanvas, endCanvas, "rgba(255, 223, 132, 0.88)", Math.max(1.8, width * 0.0028));
        ctx.setLineDash([]);

        drawCanvasDot(ctx, startCanvas, Math.max(5, width * 0.0065), "rgba(247, 160, 74, 0.92)");
        drawCanvasDot(
          ctx,
          endCanvas,
          Math.max(7, width * 0.0082),
          "rgba(115, 221, 213, 0.3)",
          "rgba(115, 221, 213, 0.98)",
          Math.max(2, width * 0.003)
        );
        const crossSize = Math.max(8, width * 0.012);
        ctx.strokeStyle = "rgba(115, 221, 213, 0.6)";
        ctx.lineWidth = Math.max(1.2, width * 0.002);
        ctx.beginPath();
        ctx.moveTo(endCanvas[0] - crossSize, endCanvas[1]);
        ctx.lineTo(endCanvas[0] + crossSize, endCanvas[1]);
        ctx.moveTo(endCanvas[0], endCanvas[1] - crossSize);
        ctx.lineTo(endCanvas[0], endCanvas[1] + crossSize);
        ctx.stroke();
        const chipFont = Math.max(9, width * 0.011);
        drawCanvasChip(ctx, formatVector([pointEnd[0], pointEnd[1]], 1), endCanvas[0], endCanvas[1] + 18, { fontSize: chipFont, color: "rgba(115, 221, 213, 0.94)" });
      }

      function drawOffsetPanel(rect) {
        const extentX = 2.9;
        const extentY = 2.4;
        drawLessonCanvasPanel(ctx, rect, "Offset", width);
        drawRectAxesGrid(ctx, rect, extentX, extentY, width);
        const startCanvas = projectRectPoint(rect, offsetStart, extentX, extentY);
        const endCanvas = projectRectPoint(rect, offsetEnd, extentX, extentY);
        const movedStartCanvas = projectRectPoint(rect, movedOffsetStart, extentX, extentY);
        const movedEndCanvas = projectRectPoint(rect, movedOffsetEnd, extentX, extentY);

        ctx.setLineDash([7, 6]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = Math.max(1.4, width * 0.0024);
        ctx.beginPath();
        ctx.moveTo(startCanvas[0], startCanvas[1]);
        ctx.lineTo(movedStartCanvas[0], movedStartCanvas[1]);
        ctx.moveTo(endCanvas[0], endCanvas[1]);
        ctx.lineTo(movedEndCanvas[0], movedEndCanvas[1]);
        ctx.stroke();
        ctx.setLineDash([]);

        drawArrow2d(ctx, startCanvas, endCanvas, "rgba(247, 160, 74, 0.86)", Math.max(2, width * 0.003));
        drawArrow2d(ctx, movedStartCanvas, movedEndCanvas, "rgba(115, 221, 213, 0.92)", Math.max(2, width * 0.003));
        drawCanvasDot(ctx, startCanvas, Math.max(4.5, width * 0.006), "rgba(247, 160, 74, 0.9)");
        drawCanvasDot(ctx, endCanvas, Math.max(4.5, width * 0.006), "rgba(247, 160, 74, 0.9)");
        drawCanvasDot(ctx, movedStartCanvas, Math.max(4.5, width * 0.006), "rgba(115, 221, 213, 0.92)");
        drawCanvasDot(ctx, movedEndCanvas, Math.max(4.5, width * 0.006), "rgba(115, 221, 213, 0.92)");
        const chipFont = Math.max(9, width * 0.011);
        const offsetLabel = formatVector([offsetDelta[0], offsetDelta[1]], 1);
        const midA = [(startCanvas[0] + endCanvas[0]) * 0.5, (startCanvas[1] + endCanvas[1]) * 0.5 - 14];
        const midB = [(movedStartCanvas[0] + movedEndCanvas[0]) * 0.5, (movedStartCanvas[1] + movedEndCanvas[1]) * 0.5 - 14];
        drawCanvasChip(ctx, offsetLabel, midA[0], midA[1], { fontSize: chipFont, color: "rgba(247, 160, 74, 0.94)" });
        drawCanvasChip(ctx, offsetLabel, midB[0], midB[1], { fontSize: chipFont, color: "rgba(115, 221, 213, 0.94)" });
      }

      function drawDirectionPanel(rect) {
        const extentX = 2.9;
        const extentY = 2.4;
        drawLessonCanvasPanel(ctx, rect, "Direction", width);
        drawRectAxesGrid(ctx, rect, extentX, extentY, width);
        const anchorACanvas = projectRectPoint(rect, directionAnchorA, extentX, extentY);
        const anchorBCanvas = projectRectPoint(rect, directionAnchorB, extentX, extentY);
        const tipACanvas = projectRectPoint(rect, add2(directionAnchorA, directionVector), extentX, extentY);
        const tipBCanvas = projectRectPoint(rect, add2(directionAnchorB, directionVector), extentX, extentY);

        ctx.setLineDash([8, 6]);
        drawArrow2d(ctx, anchorACanvas, anchorBCanvas, "rgba(255, 223, 132, 0.8)", Math.max(1.6, width * 0.0026));
        ctx.setLineDash([]);

        drawArrow2d(ctx, anchorACanvas, tipACanvas, "rgba(247, 160, 74, 0.88)", Math.max(2.1, width * 0.003));
        drawArrow2d(ctx, anchorBCanvas, tipBCanvas, "rgba(115, 221, 213, 0.94)", Math.max(2.1, width * 0.003));
        drawCanvasDot(ctx, anchorACanvas, Math.max(4, width * 0.0055), "rgba(247, 160, 74, 0.9)");
        drawCanvasDot(ctx, anchorBCanvas, Math.max(4, width * 0.0055), "rgba(115, 221, 213, 0.9)");
        const chipFont = Math.max(9, width * 0.011);
        const midTips = [(tipACanvas[0] + tipBCanvas[0]) * 0.5, (tipACanvas[1] + tipBCanvas[1]) * 0.5 - 14];
        drawCanvasChip(ctx, "same dir", midTips[0], midTips[1], { fontSize: chipFont, color: "rgba(239, 245, 247, 0.9)" });
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawPointPanel(rects[0]);
      drawOffsetPanel(rects[1]);
      drawDirectionPanel(rects[2]);
    },
  });
}

function setupGameVectorsStoryDemo() {
  const canvas = document.getElementById("game-vectors-canvas");
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
      const phase = prefersReducedMotion ? 1.18 : time * 0.84;
      const arenaRect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const extentX = 4.1;
      const extentY = 3.1;
      const player = [
        -1.28 + Math.cos(phase * 0.82) * 0.62,
        -0.18 + Math.sin(phase * 0.97) * 0.4,
      ];
      const velocityRaw = [
        -Math.sin(phase * 0.82) * 0.62 * 0.82,
        Math.cos(phase * 0.97) * 0.4 * 0.97,
      ];
      const moveDir = normalize2(velocityRaw);
      const velocity = scale2(moveDir, 1.14 + (0.5 + Math.sin(phase * 1.1) * 0.5) * 0.36);
      const nextPoint = add2(player, scale2(velocity, 0.34));
      const enemyBase = [
        1.52 + Math.cos(phase * 0.44) * 0.18,
        0.82 + Math.sin(phase * 0.62) * 0.24,
      ];
      const toEnemy = subtract2(enemyBase, player);
      const aimDir = normalize2(toEnemy);
      const shotCycle = prefersReducedMotion ? 0.52 : (time * 0.92) % 1;
      const knockbackStrength = shotCycle > 0.82 ? (shotCycle - 0.82) / 0.18 : 0;
      const knockback = scale2(aimDir, Math.min(1, knockbackStrength) * 0.26);
      const enemy = add2(enemyBase, knockback);
      const projectileStart = add2(player, scale2(aimDir, 0.4));
      const projectileTravel = Math.max(Math.hypot(toEnemy[0], toEnemy[1]) - 0.65, 0.2);
      const projectile = add2(projectileStart, scale2(aimDir, projectileTravel * Math.min(shotCycle * 1.18, 1)));
      const arrowTipAim = add2(player, scale2(aimDir, 1.35));
      const arrowTipVelocity = add2(player, scale2(velocity, 0.72));
      const obstacleRects = [
        { min: [-0.05, -1.42], max: [0.92, -0.84] },
        { min: [-0.64, 1.02], max: [0.28, 1.5] },
      ];

      function toArena(point) {
        return projectRectPoint(arenaRect, point, extentX, extentY, 18, 22, 0.58);
      }

      function drawObstacle(rect) {
        const topLeft = toArena([rect.min[0], rect.max[1]]);
        const bottomRight = toArena([rect.max[0], rect.min[1]]);
        ctx.fillStyle = "rgba(8, 18, 26, 0.38)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.fillRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
        ctx.strokeRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawLessonCanvasPanel(ctx, arenaRect, "Arena vectors", width);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let x = -4; x <= 4; x += 1) {
        const start = toArena([x, -extentY]);
        const end = toArena([x, extentY]);
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
      }
      for (let y = -3; y <= 3; y += 1) {
        const start = toArena([-extentX, y]);
        const end = toArena([extentX, y]);
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
      }

      for (const rect of obstacleRects) {
        drawObstacle(rect);
      }

      ctx.strokeStyle = "rgba(115, 221, 213, 0.18)";
      ctx.lineWidth = Math.max(1.6, width * 0.0024);
      ctx.beginPath();
      for (let step = 0; step <= 24; step += 1) {
        const samplePhase = phase - (24 - step) * 0.12;
        const samplePoint = [
          -1.28 + Math.cos(samplePhase * 0.82) * 0.62,
          -0.18 + Math.sin(samplePhase * 0.97) * 0.4,
        ];
        const projected = toArena(samplePoint);
        if (step === 0) {
          ctx.moveTo(projected[0], projected[1]);
        } else {
          ctx.lineTo(projected[0], projected[1]);
        }
      }
      ctx.stroke();

      const playerCanvas = toArena(player);
      const nextCanvas = toArena(nextPoint);
      const enemyCanvas = toArena(enemy);
      const enemyBaseCanvas = toArena(enemyBase);
      const projectileCanvas = toArena(projectile);
      const velocityCanvas = toArena(arrowTipVelocity);
      const aimCanvas = toArena(arrowTipAim);

      ctx.setLineDash([8, 6]);
      drawArrow2d(ctx, playerCanvas, enemyCanvas, "rgba(255, 223, 132, 0.82)", Math.max(1.8, width * 0.0028));
      ctx.setLineDash([]);
      drawArrow2d(ctx, playerCanvas, velocityCanvas, "rgba(247, 160, 74, 0.95)", Math.max(2.4, width * 0.0032));
      drawArrow2d(ctx, playerCanvas, aimCanvas, "rgba(115, 221, 213, 0.96)", Math.max(2.3, width * 0.0032));

      if (knockbackStrength > 0) {
        drawArrow2d(ctx, enemyBaseCanvas, enemyCanvas, "rgba(255, 154, 102, 0.94)", Math.max(2, width * 0.003));
      }

      drawCanvasDot(
        ctx,
        nextCanvas,
        Math.max(8, width * 0.0092),
        "rgba(255, 255, 255, 0.08)",
        "rgba(255, 255, 255, 0.22)",
        Math.max(1.4, width * 0.0022)
      );
      drawCanvasDot(ctx, playerCanvas, Math.max(9, width * 0.0104), "rgba(247, 160, 74, 0.96)", "rgba(255, 245, 216, 0.98)", Math.max(1.8, width * 0.0026));
      drawCanvasDot(ctx, enemyCanvas, Math.max(10, width * 0.011), "rgba(115, 221, 213, 0.92)", "rgba(214, 248, 245, 0.96)", Math.max(1.8, width * 0.0026));
      drawCanvasDot(ctx, projectileCanvas, Math.max(4.8, width * 0.0062), "rgba(255, 245, 216, 0.98)");
    },
  });
}

function setupDotCrossStoryDemo() {
  const canvas = document.getElementById("dot-cross-canvas");
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
      const phase = prefersReducedMotion ? 1.06 : time * 0.82;
      const margin = 18;
      const gap = 16;
      const stacked = width < 900;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap) / 2;
      const panelHeight = stacked ? (height - margin * 2 - gap) / 2 : height - margin * 2;
      const dotRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const crossRect = stacked
        ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
        : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };

      const forwardAngle = 0.24 + Math.sin(phase * 0.58) * 0.4;
      const forward = normalize2([Math.cos(forwardAngle), Math.sin(forwardAngle)]);
      const targetAngle = phase * 1.08 + 0.46;
      const targetPoint = [Math.cos(targetAngle) * 1.65, Math.sin(targetAngle) * 1.18];
      const toTarget = normalize2(targetPoint);
      const dotValue = clamp(dot2(forward, toTarget), -1, 1);
      const dotColor =
        dotValue >= 0 ? "rgba(115, 221, 213, 0.98)" : "rgba(247, 160, 74, 0.98)";

      const pointA = [-1.05, -0.64, -0.24];
      const pointB = [1.18, -0.22, 0.12 + Math.sin(phase * 0.72) * 0.22];
      const pointC = [-0.18, 1.02 + Math.cos(phase * 0.66) * 0.14, 0.72 + Math.sin(phase * 0.9) * 0.24];
      const edge1 = subtract3(pointB, pointA);
      const edge2 = subtract3(pointC, pointA);
      let normal = normalize3(cross3(edge1, edge2));
      const viewDirection = normalize3([0.34, 0.42, 1]);
      if (dot3(normal, viewDirection) < 0) {
        normal = scale3(normal, -1);
      }
      const centroid = [
        (pointA[0] + pointB[0] + pointC[0]) / 3,
        (pointA[1] + pointB[1] + pointC[1]) / 3,
        (pointA[2] + pointB[2] + pointC[2]) / 3,
      ];
      const normalTip = add3(centroid, scale3(normal, 0.94));

      function drawDotPanel(rect) {
        const extentX = 2.45;
        const extentY = 2.15;
        const fontSize = Math.max(10, width * 0.013);

        drawLessonCanvasPanel(ctx, rect, "Dot = alignment", width);
        drawRectAxesGrid(ctx, rect, extentX, extentY, width);

        const origin = projectRectPoint(rect, [0, 0], extentX, extentY);
        const forwardTip = projectRectPoint(rect, scale2(forward, 1.35), extentX, extentY);
        const targetCanvas = projectRectPoint(rect, targetPoint, extentX, extentY);
        const directionTip = projectRectPoint(rect, scale2(toTarget, 1.5), extentX, extentY);
        const orbitRadiusX = (1.65 / extentX) * (rect.width * 0.5 - 16);
        const orbitRadiusY = (1.18 / extentY) * (rect.height * 0.5 - 18);
        const spread = 0.62;
        const coneLength = 1.48;

        ctx.fillStyle = "rgba(255, 223, 132, 0.08)";
        ctx.beginPath();
        ctx.moveTo(origin[0], origin[1]);
        for (let step = 0; step <= 16; step += 1) {
          const offset = lerp(-spread, spread, step / 16);
          const ray = rotate2(forward, offset);
          const conePoint = projectRectPoint(rect, scale2(ray, coneLength), extentX, extentY);
          ctx.lineTo(conePoint[0], conePoint[1]);
        }
        ctx.closePath();
        ctx.fill();

        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = Math.max(1.2, width * 0.0022);
        ctx.beginPath();
        ctx.ellipse(origin[0], origin[1], orbitRadiusX, orbitRadiusY, 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.setLineDash([8, 6]);
        drawArrow2d(ctx, origin, targetCanvas, "rgba(255, 223, 132, 0.72)", Math.max(1.8, width * 0.0028));
        ctx.setLineDash([]);
        drawArrow2d(ctx, origin, forwardTip, "rgba(247, 160, 74, 0.96)", Math.max(2.4, width * 0.0032));
        drawArrow2d(ctx, origin, directionTip, "rgba(115, 221, 213, 0.96)", Math.max(2.3, width * 0.0032));

        drawCameraGlyph(
          ctx,
          origin,
          forwardAngle,
          Math.max(10, width * 0.0112),
          "rgba(247, 160, 74, 0.96)",
          "rgba(255, 245, 216, 0.96)"
        );
        drawCanvasDot(
          ctx,
          targetCanvas,
          Math.max(8, width * 0.0094),
          dotColor,
          "rgba(239, 245, 247, 0.95)",
          Math.max(1.6, width * 0.0024)
        );

        drawCanvasChip(ctx, "f", forwardTip[0] + 14, forwardTip[1] - 14, {
          fontSize,
          color: "rgba(247, 160, 74, 0.98)",
        });
        drawCanvasChip(ctx, "to", directionTip[0] + 14, directionTip[1] - 14, {
          fontSize,
          color: "rgba(115, 221, 213, 0.98)",
        });
        drawCanvasChip(ctx, `dot ${formatNumber(dotValue, 2)}`, rect.x + rect.width - 12, rect.y + 16, {
          align: "right",
          fontSize,
          color: dotColor,
        });

        const meterX = rect.x + 18;
        const meterY = rect.y + rect.height - 24;
        const meterWidth = rect.width - 36;
        const meterHeight = 8;
        const markerX = meterX + ((dotValue + 1) * 0.5) * meterWidth;

        ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
        ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
        ctx.fillStyle = dotColor;
        ctx.fillRect(markerX - 4, meterY - 3, 8, meterHeight + 6);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(meterX + meterWidth * 0.5, meterY - 5);
        ctx.lineTo(meterX + meterWidth * 0.5, meterY + meterHeight + 5);
        ctx.stroke();
      }

      function drawCrossPanel(rect) {
        const extentX = 2.75;
        const extentY = 2.2;
        const fontSize = Math.max(10, width * 0.013);

        function project3(point) {
          const flattened = [
            point[0] * 0.92 - point[2] * 0.56,
            point[1] * 0.9 + point[0] * 0.16 + point[2] * 0.26,
          ];
          return projectRectPoint(rect, flattened, extentX, extentY, 16, 20, 0.58);
        }

        drawLessonCanvasPanel(ctx, rect, "Cross = normal", width);
        drawRectAxesGrid(ctx, rect, extentX, extentY, width);

        const aCanvas = project3(pointA);
        const bCanvas = project3(pointB);
        const cCanvas = project3(pointC);
        const centerCanvas = project3(centroid);
        const normalCanvas = project3(normalTip);
        const edge1Mid = [(aCanvas[0] + bCanvas[0]) * 0.5, (aCanvas[1] + bCanvas[1]) * 0.5];
        const edge2Mid = [(aCanvas[0] + cCanvas[0]) * 0.5, (aCanvas[1] + cCanvas[1]) * 0.5];

        ctx.fillStyle = "rgba(115, 221, 213, 0.18)";
        ctx.strokeStyle = "rgba(214, 248, 245, 0.92)";
        ctx.lineWidth = Math.max(2, width * 0.003);
        ctx.beginPath();
        ctx.moveTo(aCanvas[0], aCanvas[1]);
        ctx.lineTo(bCanvas[0], bCanvas[1]);
        ctx.lineTo(cCanvas[0], cCanvas[1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        drawArrow2d(ctx, aCanvas, bCanvas, "rgba(247, 160, 74, 0.96)", Math.max(2.2, width * 0.003));
        drawArrow2d(ctx, aCanvas, cCanvas, "rgba(115, 221, 213, 0.96)", Math.max(2.2, width * 0.003));
        drawArrow2d(ctx, centerCanvas, normalCanvas, "rgba(255, 245, 216, 0.96)", Math.max(2.3, width * 0.0032));

        drawCanvasDot(ctx, aCanvas, Math.max(5.2, width * 0.0065), "rgba(247, 160, 74, 0.96)");
        drawCanvasDot(ctx, bCanvas, Math.max(5.2, width * 0.0065), "rgba(247, 160, 74, 0.82)");
        drawCanvasDot(ctx, cCanvas, Math.max(5.2, width * 0.0065), "rgba(115, 221, 213, 0.9)");

        drawCanvasChip(ctx, "e1", edge1Mid[0], edge1Mid[1] - 16, {
          fontSize,
          color: "rgba(247, 160, 74, 0.98)",
        });
        drawCanvasChip(ctx, "e2", edge2Mid[0], edge2Mid[1] - 16, {
          fontSize,
          color: "rgba(115, 221, 213, 0.98)",
        });
        drawCanvasChip(ctx, "n", normalCanvas[0] + 12, normalCanvas[1] - 14, {
          fontSize,
          color: "rgba(255, 245, 216, 0.98)",
        });
        drawCanvasChip(ctx, "e1 x e2", rect.x + rect.width - 12, rect.y + 16, {
          align: "right",
          fontSize,
          color: "rgba(255, 245, 216, 0.98)",
        });
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawDotPanel(dotRect);
      drawCrossPanel(crossRect);
    },
  });
}

function setupVectorOffsetUseDemo() {
  const canvas = document.getElementById("vector-offset-use-canvas");
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
      const phase = prefersReducedMotion ? 1.08 : time * 0.84;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const extentX = 3.7;
      const extentY = 2.8;
      const player = [
        -1.72 + Math.cos(phase * 0.92) * 0.42,
        -0.86 + Math.sin(phase * 0.78) * 0.28,
      ];
      const pickup = [
        1.12 + Math.sin(phase * 0.44) * 0.22,
        0.72 + Math.cos(phase * 0.58) * 0.18,
      ];
      const offset = subtract2(pickup, player);
      const reusedStart = [-1.32, 1.02];
      const reusedEnd = add2(reusedStart, offset);
      const fontSize = Math.max(10, width * 0.013);

      function project(point) {
        return projectRectPoint(rect, point, extentX, extentY, 16, 20, 0.6);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawLessonCanvasPanel(ctx, rect, "Offset reuse", width);
      drawRectAxesGrid(ctx, rect, extentX, extentY, width, 0.6);

      const playerCanvas = project(player);
      const pickupCanvas = project(pickup);
      const reusedStartCanvas = project(reusedStart);
      const reusedEndCanvas = project(reusedEnd);

      ctx.setLineDash([8, 6]);
      drawArrow2d(ctx, playerCanvas, pickupCanvas, "rgba(247, 160, 74, 0.94)", Math.max(2.1, width * 0.003));
      ctx.setLineDash([]);
      drawArrow2d(ctx, reusedStartCanvas, reusedEndCanvas, "rgba(115, 221, 213, 0.94)", Math.max(2.1, width * 0.003));

      drawCanvasDot(ctx, playerCanvas, Math.max(7.5, width * 0.009), "rgba(247, 160, 74, 0.96)");
      drawCanvasDot(ctx, pickupCanvas, Math.max(7.5, width * 0.009), "rgba(115, 221, 213, 0.96)");
      drawCanvasDot(ctx, reusedStartCanvas, Math.max(4.6, width * 0.006), "rgba(247, 160, 74, 0.76)");
      drawCanvasDot(ctx, reusedEndCanvas, Math.max(4.6, width * 0.006), "rgba(115, 221, 213, 0.76)");

      drawCanvasChip(ctx, "to", (playerCanvas[0] + pickupCanvas[0]) * 0.5, (playerCanvas[1] + pickupCanvas[1]) * 0.5 - 14, {
        fontSize,
        color: "rgba(247, 160, 74, 0.98)",
      });
      drawCanvasChip(ctx, "same offset", (reusedStartCanvas[0] + reusedEndCanvas[0]) * 0.5, (reusedStartCanvas[1] + reusedEndCanvas[1]) * 0.5 - 14, {
        fontSize,
        color: "rgba(115, 221, 213, 0.98)",
      });
    },
  });
}

function setupVectorNormalizeUseDemo() {
  const canvas = document.getElementById("vector-normalize-use-canvas");
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
      const phase = prefersReducedMotion ? 1.14 : time * 0.86;
      const margin = 18;
      const gap = 14;
      const panelWidth = (width - margin * 2 - gap) / 2;
      const panelHeight = height - margin * 2;
      const leftRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const rightRect = { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };
      const direction = normalize2([1, 0.28 + Math.sin(phase * 0.94) * 0.36]);
      const rawLength = 0.48 + (0.5 + Math.sin(phase * 1.16) * 0.5) * 1.2;
      const raw = scale2(direction, rawLength);
      const fontSize = Math.max(10, width * 0.013);

      function project(rect, point) {
        return projectRectPoint(rect, point, 2.15, 2.15, 14, 20, 0.6);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawLessonCanvasPanel(ctx, leftRect, "Raw", width);
      drawLessonCanvasPanel(ctx, rightRect, "Unit", width);
      drawRectAxesGrid(ctx, leftRect, 2.15, 2.15, width, 0.6);
      drawRectAxesGrid(ctx, rightRect, 2.15, 2.15, width, 0.6);

      const rawOrigin = project(leftRect, [0, 0]);
      const rawTip = project(leftRect, raw);
      drawArrow2d(ctx, rawOrigin, rawTip, "rgba(247, 160, 74, 0.96)", Math.max(2.3, width * 0.0031));
      drawCanvasDot(ctx, rawTip, Math.max(5.5, width * 0.0065), "rgba(247, 160, 74, 0.96)");
      drawCanvasChip(ctx, "v", rawTip[0] + 14, rawTip[1] - 14, {
        fontSize,
        color: "rgba(247, 160, 74, 0.98)",
      });

      const unitOrigin = project(rightRect, [0, 0]);
      const circleEdge = project(rightRect, [1, 0]);
      const unitRadius = Math.abs(circleEdge[0] - unitOrigin[0]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = Math.max(1.4, width * 0.0024);
      ctx.beginPath();
      ctx.arc(unitOrigin[0], unitOrigin[1], unitRadius, 0, TAU);
      ctx.stroke();
      const unitTip = project(rightRect, direction);
      drawArrow2d(ctx, unitOrigin, unitTip, "rgba(115, 221, 213, 0.96)", Math.max(2.3, width * 0.0031));
      drawCanvasDot(ctx, unitTip, Math.max(5.5, width * 0.0065), "rgba(115, 221, 213, 0.96)");
      drawCanvasChip(ctx, "norm(v)", unitTip[0] + 18, unitTip[1] - 14, {
        fontSize,
        color: "rgba(115, 221, 213, 0.98)",
      });
    },
  });
}

function setupVectorDotUseDemo() {
  const canvas = document.getElementById("vector-dot-use-canvas");
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
      const phase = prefersReducedMotion ? 1.04 : time * 0.82;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const extentX = 2.55;
      const extentY = 2.15;
      const forwardAngle = 0.22 + Math.sin(phase * 0.62) * 0.42;
      const forward = normalize2([Math.cos(forwardAngle), Math.sin(forwardAngle)]);
      const targetAngle = phase * 1.08 + 0.48;
      const target = [Math.cos(targetAngle) * 1.6, Math.sin(targetAngle) * 1.2];
      const toTarget = normalize2(target);
      const dotValue = clamp(dot2(forward, toTarget), -1, 1);
      const color = dotValue >= 0 ? "rgba(115, 221, 213, 0.98)" : "rgba(247, 160, 74, 0.98)";
      const fontSize = Math.max(10, width * 0.013);

      function project(point) {
        return projectRectPoint(rect, point, extentX, extentY, 16, 18, 0.6);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawLessonCanvasPanel(ctx, rect, "Front test", width);
      drawRectAxesGrid(ctx, rect, extentX, extentY, width, 0.6);

      const origin = project([0, 0]);
      const forwardTip = project(scale2(forward, 1.3));
      const targetTip = project(scale2(toTarget, 1.45));
      const targetCanvas = project(target);
      const coneSpread = 0.58;

      ctx.fillStyle = "rgba(255, 223, 132, 0.08)";
      ctx.beginPath();
      ctx.moveTo(origin[0], origin[1]);
      for (let step = 0; step <= 14; step += 1) {
        const ray = rotate2(forward, lerp(-coneSpread, coneSpread, step / 14));
        const point = project(scale2(ray, 1.5));
        ctx.lineTo(point[0], point[1]);
      }
      ctx.closePath();
      ctx.fill();

      drawCameraGlyph(ctx, origin, forwardAngle, Math.max(10, width * 0.011), "rgba(247, 160, 74, 0.96)", "rgba(255, 245, 216, 0.96)");
      drawArrow2d(ctx, origin, forwardTip, "rgba(247, 160, 74, 0.96)", Math.max(2.3, width * 0.003));
      ctx.setLineDash([8, 6]);
      drawArrow2d(ctx, origin, targetCanvas, "rgba(255, 223, 132, 0.76)", Math.max(1.7, width * 0.0026));
      ctx.setLineDash([]);
      drawArrow2d(ctx, origin, targetTip, "rgba(115, 221, 213, 0.96)", Math.max(2.2, width * 0.003));
      drawCanvasDot(ctx, targetCanvas, Math.max(7.2, width * 0.0086), color, "rgba(239, 245, 247, 0.95)", Math.max(1.6, width * 0.0023));

      drawCanvasChip(ctx, "f", forwardTip[0] + 14, forwardTip[1] - 14, {
        fontSize,
        color: "rgba(247, 160, 74, 0.98)",
      });
      drawCanvasChip(ctx, "to", targetTip[0] + 14, targetTip[1] - 14, {
        fontSize,
        color: "rgba(115, 221, 213, 0.98)",
      });
      drawCanvasChip(ctx, `dot ${formatNumber(dotValue, 2)}`, rect.x + rect.width - 12, rect.y + 16, {
        align: "right",
        fontSize,
        color,
      });

      const meterX = rect.x + 18;
      const meterY = rect.y + rect.height - 22;
      const meterWidth = rect.width - 36;
      const meterHeight = 8;
      const markerX = meterX + ((dotValue + 1) * 0.5) * meterWidth;
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
      ctx.fillStyle = color;
      ctx.fillRect(markerX - 4, meterY - 3, 8, meterHeight + 6);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(meterX + meterWidth * 0.5, meterY - 5);
      ctx.lineTo(meterX + meterWidth * 0.5, meterY + meterHeight + 5);
      ctx.stroke();
    },
  });
}

function setupVectorCrossUseDemo() {
  const canvas = document.getElementById("vector-cross-use-canvas");
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
      const extentX = 2.8;
      const extentY = 2.25;
      const pointA = [-1.05, -0.62, -0.2];
      const pointB = [1.18, -0.18, 0.08 + Math.sin(phase * 0.72) * 0.22];
      const pointC = [-0.16, 0.98 + Math.cos(phase * 0.66) * 0.14, 0.72 + Math.sin(phase * 0.86) * 0.24];
      const edge1 = subtract3(pointB, pointA);
      const edge2 = subtract3(pointC, pointA);
      let normal = normalize3(cross3(edge1, edge2));
      if (dot3(normal, normalize3([0.24, 0.4, 1])) < 0) {
        normal = scale3(normal, -1);
      }
      const center = [
        (pointA[0] + pointB[0] + pointC[0]) / 3,
        (pointA[1] + pointB[1] + pointC[1]) / 3,
        (pointA[2] + pointB[2] + pointC[2]) / 3,
      ];
      const normalTip = add3(center, scale3(normal, 0.9));
      const fontSize = Math.max(10, width * 0.013);

      function project3(point) {
        return projectRectPoint(
          rect,
          [point[0] * 0.92 - point[2] * 0.56, point[1] * 0.88 + point[0] * 0.18 + point[2] * 0.28],
          extentX,
          extentY,
          16,
          20,
          0.6
        );
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawLessonCanvasPanel(ctx, rect, "Triangle normal", width);
      drawRectAxesGrid(ctx, rect, extentX, extentY, width, 0.6);

      const aCanvas = project3(pointA);
      const bCanvas = project3(pointB);
      const cCanvas = project3(pointC);
      const centerCanvas = project3(center);
      const normalCanvas = project3(normalTip);
      const edge1Mid = [(aCanvas[0] + bCanvas[0]) * 0.5, (aCanvas[1] + bCanvas[1]) * 0.5];
      const edge2Mid = [(aCanvas[0] + cCanvas[0]) * 0.5, (aCanvas[1] + cCanvas[1]) * 0.5];

      ctx.fillStyle = "rgba(115, 221, 213, 0.18)";
      ctx.strokeStyle = "rgba(214, 248, 245, 0.92)";
      ctx.lineWidth = Math.max(1.9, width * 0.0028);
      ctx.beginPath();
      ctx.moveTo(aCanvas[0], aCanvas[1]);
      ctx.lineTo(bCanvas[0], bCanvas[1]);
      ctx.lineTo(cCanvas[0], cCanvas[1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      drawArrow2d(ctx, aCanvas, bCanvas, "rgba(247, 160, 74, 0.96)", Math.max(2.1, width * 0.003));
      drawArrow2d(ctx, aCanvas, cCanvas, "rgba(115, 221, 213, 0.96)", Math.max(2.1, width * 0.003));
      drawArrow2d(ctx, centerCanvas, normalCanvas, "rgba(255, 245, 216, 0.96)", Math.max(2.2, width * 0.0031));

      drawCanvasChip(ctx, "e1", edge1Mid[0], edge1Mid[1] - 14, {
        fontSize,
        color: "rgba(247, 160, 74, 0.98)",
      });
      drawCanvasChip(ctx, "e2", edge2Mid[0], edge2Mid[1] - 14, {
        fontSize,
        color: "rgba(115, 221, 213, 0.98)",
      });
      drawCanvasChip(ctx, "n", normalCanvas[0] + 12, normalCanvas[1] - 14, {
        fontSize,
        color: "rgba(255, 245, 216, 0.98)",
      });
    },
  });
}

function setupMatrixColumnsDemo() {
  const canvas = document.getElementById("matrix-columns-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const unitSquare = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.15 : time * 0.76;
      const angle = 0.32 + Math.sin(phase * 0.66) * 0.42;
      const scaleX = 1.04 + Math.sin(phase * 1.12) * 0.28;
      const scaleY = 0.9 + Math.cos(phase * 0.82) * 0.2;
      const shear = Math.sin(phase * 0.58) * 0.38;
      const basisI = [Math.cos(angle) * scaleX * 1.12, Math.sin(angle) * scaleX * 1.12];
      const basisJ = [-Math.sin(angle) * scaleY + shear * 0.46, Math.cos(angle) * scaleY];
      const parallelogram = unitSquare.map((point) => add2(scale2(basisI, point[0]), scale2(basisJ, point[1])));
      const stacked = width < 780;
      const margin = 18;
      const gap = 16;
      const plotRect = stacked
        ? { x: margin, y: margin, width: width - margin * 2, height: height * 0.62 - margin }
        : { x: margin, y: margin, width: width * 0.62 - margin - gap * 0.5, height: height - margin * 2 };
      const infoRect = stacked
        ? { x: margin, y: plotRect.y + plotRect.height + gap, width: width - margin * 2, height: height - plotRect.height - margin * 2 - gap }
        : { x: plotRect.x + plotRect.width + gap, y: margin, width: width - plotRect.width - margin * 2 - gap, height: height - margin * 2 };
      const extentX = 2.7;
      const extentY = 2.5;

      function drawPolygon(points, fillStyle, strokeStyle) {
        ctx.beginPath();
        for (let index = 0; index < points.length; index += 1) {
          const projected = projectRectPoint(plotRect, points[index], extentX, extentY);
          if (index === 0) {
            ctx.moveTo(projected[0], projected[1]);
          } else {
            ctx.lineTo(projected[0], projected[1]);
          }
        }
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = Math.max(1.8, width * 0.0028);
        ctx.fill();
        ctx.stroke();
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);

      drawLessonCanvasPanel(ctx, plotRect, "Columns as axes", width);
      drawRectAxesGrid(ctx, plotRect, extentX, extentY, width);
      drawPolygon(unitSquare, "rgba(255, 255, 255, 0.05)", "rgba(255, 255, 255, 0.18)");
      drawPolygon(parallelogram, "rgba(115, 221, 213, 0.22)", "rgba(115, 221, 213, 0.92)");

      const origin = projectRectPoint(plotRect, [0, 0], extentX, extentY);
      const basisICanvas = projectRectPoint(plotRect, basisI, extentX, extentY);
      const basisJCanvas = projectRectPoint(plotRect, basisJ, extentX, extentY);
      const cornerCanvas = projectRectPoint(plotRect, add2(basisI, basisJ), extentX, extentY);
      drawArrow2d(ctx, origin, basisICanvas, "rgba(247, 160, 74, 0.95)", Math.max(2.4, width * 0.0032));
      drawArrow2d(ctx, origin, basisJCanvas, "rgba(115, 221, 213, 0.96)", Math.max(2.4, width * 0.0032));
      drawCanvasDot(ctx, basisICanvas, Math.max(5.5, width * 0.0066), "rgba(247, 160, 74, 0.96)");
      drawCanvasDot(ctx, basisJCanvas, Math.max(5.5, width * 0.0066), "rgba(115, 221, 213, 0.96)");
      drawCanvasDot(ctx, cornerCanvas, Math.max(6.5, width * 0.0076), "rgba(255, 245, 216, 0.96)");
      drawLessonCanvasPanel(ctx, infoRect, "Read it", width);
      ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
      ctx.font = `${Math.max(12, width * 0.015)}px "SFMono-Regular", "Menlo", "Consolas", monospace`;
      drawTextLines(
        ctx,
        [
          `M(1, 0) = ${formatVector(basisI, 2)}`,
          `M(0, 1) = ${formatVector(basisJ, 2)}`,
          `M(1, 1) = ${formatVector(add2(basisI, basisJ), 2)}`,
        ],
        infoRect.x + 16,
        infoRect.y + Math.max(34, infoRect.height * 0.28),
        Math.max(15, width * 0.0145 * 1.3),
        infoRect.width - 32
      );
    },
  });
}

function setupAffineStoryDemo() {
  const canvas = document.getElementById("affine-story-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const triangle = [
    [-0.88, -0.56],
    [0.96, -0.2],
    [-0.18, 0.92],
  ];
  const samplePoint = [0.72, 0.34];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.12 : time * 0.78;
      const angle = 0.26 + Math.sin(phase * 0.74) * 0.44;
      const scaleX = 1 + Math.sin(phase * 0.98) * 0.24;
      const scaleY = 0.86 + Math.cos(phase * 0.88) * 0.18;
      const translation = [0.96 + Math.sin(phase * 0.62) * 0.24, -0.52 + Math.cos(phase * 0.54) * 0.18];
      const basisI = [Math.cos(angle) * scaleX * 1.08, Math.sin(angle) * scaleX * 1.08];
      const basisJ = [-Math.sin(angle) * scaleY, Math.cos(angle) * scaleY];
      const linearTransform = (point) => add2(scale2(basisI, point[0]), scale2(basisJ, point[1]));
      const linearTriangle = triangle.map(linearTransform);
      const affineTriangle = linearTriangle.map((point) => add2(point, translation));
      const linearPoint = linearTransform(samplePoint);
      const affinePoint = add2(linearPoint, translation);
      const margin = 18;
      const gap = 16;
      const stacked = width < 760;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap) / 2;
      const panelHeight = stacked ? (height - margin * 2 - gap) / 2 : height - margin * 2;
      const linearRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const affineRect = stacked
        ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
        : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };
      const extentX = 3.1;
      const extentY = 2.6;

      function drawPolygon(rect, points, fillStyle, strokeStyle, lineWidth) {
        ctx.beginPath();
        for (let index = 0; index < points.length; index += 1) {
          const projected = projectRectPoint(rect, points[index], extentX, extentY);
          if (index === 0) {
            ctx.moveTo(projected[0], projected[1]);
          } else {
            ctx.lineTo(projected[0], projected[1]);
          }
        }
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.fill();
        ctx.stroke();
      }

      function drawPanel(rect, title, showTranslation) {
        drawLessonCanvasPanel(ctx, rect, title, width);
        const origin = drawRectAxesGrid(ctx, rect, extentX, extentY, width);
        drawPolygon(rect, triangle, "rgba(255, 255, 255, 0.05)", "rgba(255, 255, 255, 0.16)", Math.max(1.4, width * 0.0024));
        drawPolygon(
          rect,
          showTranslation ? affineTriangle : linearTriangle,
          showTranslation ? "rgba(247, 160, 74, 0.2)" : "rgba(115, 221, 213, 0.2)",
          showTranslation ? "rgba(247, 160, 74, 0.92)" : "rgba(115, 221, 213, 0.92)",
          Math.max(2, width * 0.003)
        );

        const transformedOrigin = showTranslation ? projectRectPoint(rect, translation, extentX, extentY) : origin;
        const transformedPoint = projectRectPoint(rect, showTranslation ? affinePoint : linearPoint, extentX, extentY);
        if (showTranslation) {
          ctx.setLineDash([8, 6]);
          drawArrow2d(ctx, origin, transformedOrigin, "rgba(255, 223, 132, 0.9)", Math.max(1.8, width * 0.0028));
          ctx.setLineDash([]);
          drawCanvasDot(ctx, transformedOrigin, Math.max(5, width * 0.0065), "rgba(255, 223, 132, 0.94)");
        }

        drawCanvasDot(
          ctx,
          transformedPoint,
          Math.max(6, width * 0.0076),
          showTranslation ? "rgba(247, 160, 74, 0.96)" : "rgba(115, 221, 213, 0.96)"
        );
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawPanel(linearRect, "Linear", false);
      drawPanel(affineRect, "Affine", true);
    },
  });
}

function setupBasisStoryDemo() {
  const canvas = document.getElementById("basis-story-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const weights = [1.2, 0.65];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.1 : time * 0.78;
      const angle = Math.sin(phase * 0.62) * 0.5 + 0.12;
      const scaleX = 1.08 + Math.sin(phase * 0.94) * 0.24;
      const scaleY = 0.88 + Math.cos(phase * 0.71) * 0.16;
      const basisI = [Math.cos(angle) * scaleX * 1.18, Math.sin(angle) * scaleX * 1.18];
      const basisJ = [-Math.sin(angle) * scaleY, Math.cos(angle) * scaleY];
      const weightedI = scale2(basisI, weights[0]);
      const point = add2(weightedI, scale2(basisJ, weights[1]));
      const extentX = 3.3;
      const extentY = 3.0;

      function toCanvas(point2) {
        return [
          width * 0.5 + (point2[0] / extentX) * (width * 0.5 - 26),
          height * 0.5 - (point2[1] / extentY) * (height * 0.5 - 26),
        ];
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#183446");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let index = -3; index <= 3; index += 1) {
        const horizontalStart = toCanvas([-extentX, index]);
        const horizontalEnd = toCanvas([extentX, index]);
        ctx.beginPath();
        ctx.moveTo(horizontalStart[0], horizontalStart[1]);
        ctx.lineTo(horizontalEnd[0], horizontalEnd[1]);
        ctx.stroke();

        const verticalStart = toCanvas([index, -extentY]);
        const verticalEnd = toCanvas([index, extentY]);
        ctx.beginPath();
        ctx.moveTo(verticalStart[0], verticalStart[1]);
        ctx.lineTo(verticalEnd[0], verticalEnd[1]);
        ctx.stroke();
      }

      const origin = toCanvas([0, 0]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = Math.max(1.5, width * 0.003);
      ctx.beginPath();
      ctx.moveTo(origin[0], 18);
      ctx.lineTo(origin[0], height - 18);
      ctx.moveTo(18, origin[1]);
      ctx.lineTo(width - 18, origin[1]);
      ctx.stroke();

      const basisICanvas = toCanvas(basisI);
      const basisJCanvas = toCanvas(basisJ);
      ctx.lineWidth = Math.max(2.2, width * 0.004);
      ctx.strokeStyle = "rgba(247, 160, 74, 0.96)";
      ctx.beginPath();
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(basisICanvas[0], basisICanvas[1]);
      ctx.stroke();

      ctx.strokeStyle = "rgba(115, 221, 213, 0.96)";
      ctx.beginPath();
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(basisJCanvas[0], basisJCanvas[1]);
      ctx.stroke();

      const weightedICanvas = toCanvas(weightedI);
      const pointCanvas = toCanvas(point);
      ctx.setLineDash([8, 7]);
      drawArrow2d(ctx, origin, weightedICanvas, "rgba(247, 160, 74, 0.78)", Math.max(1.8, width * 0.0032));
      drawArrow2d(ctx, weightedICanvas, pointCanvas, "rgba(115, 221, 213, 0.78)", Math.max(1.8, width * 0.0032));
      ctx.setLineDash([]);

      ctx.fillStyle = "#f7a04a";
      ctx.beginPath();
      ctx.arc(weightedICanvas[0], weightedICanvas[1], Math.max(4.5, width * 0.008), 0, TAU);
      ctx.fill();

      ctx.fillStyle = "#73ddd5";
      ctx.beginPath();
      ctx.arc(pointCanvas[0], pointCanvas[1], Math.max(6.5, width * 0.0115), 0, TAU);
      ctx.fill();
      const chipFont = Math.max(10, width * 0.0135);
      drawCanvasChip(ctx, "i", basisICanvas[0] + 14, basisICanvas[1] - 14, {
        fontSize: chipFont,
        color: "rgba(247, 160, 74, 0.98)",
      });
      drawCanvasChip(ctx, "j", basisJCanvas[0] + 14, basisJCanvas[1] - 14, {
        fontSize: chipFont,
        color: "rgba(115, 221, 213, 0.98)",
      });
      drawCanvasChip(ctx, `${formatNumber(weights[0], 1)}i`, weightedICanvas[0] + 18, weightedICanvas[1] - 14, {
        fontSize: chipFont,
        color: "rgba(247, 160, 74, 0.98)",
      });
      drawCanvasChip(ctx, "p", pointCanvas[0] + 16, pointCanvas[1] - 16, {
        fontSize: chipFont,
        color: "rgba(115, 221, 213, 0.98)",
      });
      const weightedJMid = [(weightedICanvas[0] + pointCanvas[0]) * 0.5, (weightedICanvas[1] + pointCanvas[1]) * 0.5];
      drawCanvasChip(ctx, `${formatNumber(weights[1], 2)}j`, weightedJMid[0] + 16, weightedJMid[1], {
        fontSize: chipFont,
        color: "rgba(115, 221, 213, 0.98)",
      });
      drawCanvasChip(ctx, `p = ${formatNumber(weights[0], 1)}i + ${formatNumber(weights[1], 2)}j`, width * 0.5, height - 22, {
        fontSize: Math.max(11, width * 0.015),
        color: "rgba(239, 245, 247, 0.94)",
      });

    },
  });
}

function setupHomogeneousStoryDemo() {
  const canvas = document.getElementById("homogeneous-story-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const localValue = [1.02, 0.72];
  const translateBase = [0.94, -0.42];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const pulse = prefersReducedMotion ? 1 : 0.5 + Math.sin(time * 1.08) * 0.5;
      const translation = scale2(translateBase, pulse);
      const margin = 18;
      const gap = 16;
      const stacked = width < 640;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap) / 2;
      const panelHeight = stacked ? (height - margin * 2 - gap) / 2 : height - margin * 2;

      function panelToCanvas(rect, point2) {
        const extentX = 2.7;
        const extentY = 2.5;
        return [
          rect.x + rect.width * 0.5 + (point2[0] / extentX) * (rect.width * 0.5 - 16),
          rect.y + rect.height * 0.56 - (point2[1] / extentY) * (rect.height * 0.5 - 18),
        ];
      }

      function drawPanel(rect, label, isPoint) {
        const origin = panelToCanvas(rect, [0, 0]);
        const translationCanvas = panelToCanvas(rect, translation);
        const localCanvas = panelToCanvas(rect, localValue);
        const resultValue = isPoint ? add2(localValue, translation) : localValue;
        const resultCanvas = panelToCanvas(rect, resultValue);

        ctx.fillStyle = "rgba(8, 21, 30, 0.22)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        for (let index = 1; index <= 4; index += 1) {
          const x = rect.x + (rect.width / 5) * index;
          ctx.beginPath();
          ctx.moveTo(x, rect.y + 12);
          ctx.lineTo(x, rect.y + rect.height - 12);
          ctx.stroke();
        }
        for (let index = 1; index <= 4; index += 1) {
          const y = rect.y + (rect.height / 5) * index;
          ctx.beginPath();
          ctx.moveTo(rect.x + 12, y);
          ctx.lineTo(rect.x + rect.width - 12, y);
          ctx.stroke();
        }

        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.beginPath();
        ctx.moveTo(rect.x + 14, origin[1]);
        ctx.lineTo(rect.x + rect.width - 14, origin[1]);
        ctx.moveTo(origin[0], rect.y + 16);
        ctx.lineTo(origin[0], rect.y + rect.height - 16);
        ctx.stroke();

        ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
        ctx.font = `${Math.max(11, width * 0.015)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(label, rect.x + 14, rect.y + 22);

        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = "rgba(255, 223, 132, 0.9)";
        ctx.lineWidth = Math.max(1.7, width * 0.0026);
        ctx.beginPath();
        ctx.moveTo(origin[0], origin[1]);
        ctx.lineTo(translationCanvas[0], translationCanvas[1]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = "rgba(247, 160, 74, 0.92)";
        ctx.beginPath();
        ctx.moveTo(origin[0], origin[1]);
        ctx.lineTo(localCanvas[0], localCanvas[1]);
        ctx.stroke();

        if (isPoint) {
          ctx.setLineDash([7, 6]);
          ctx.strokeStyle = "rgba(115, 221, 213, 0.88)";
          ctx.beginPath();
          ctx.moveTo(localCanvas[0], localCanvas[1]);
          ctx.lineTo(resultCanvas[0], resultCanvas[1]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.fillStyle = "#f7a04a";
        ctx.beginPath();
        ctx.arc(localCanvas[0], localCanvas[1], Math.max(5, width * 0.0075), 0, TAU);
        ctx.fill();

        ctx.strokeStyle = "rgba(115, 221, 213, 0.95)";
        ctx.lineWidth = Math.max(2, width * 0.003);
        ctx.beginPath();
        ctx.arc(resultCanvas[0], resultCanvas[1], Math.max(7, width * 0.009), 0, TAU);
        ctx.stroke();
        const chipFont = Math.max(10, width * 0.0135);
        drawCanvasChip(ctx, "t", translationCanvas[0] + 12, translationCanvas[1] - 12, {
          fontSize: chipFont,
          color: "rgba(255, 223, 132, 0.98)",
        });
        drawCanvasChip(ctx, isPoint ? "p" : "d", localCanvas[0] + 14, localCanvas[1] - 14, {
          fontSize: chipFont,
          color: "rgba(247, 160, 74, 0.98)",
        });
        if (isPoint) {
          drawCanvasChip(ctx, "p+t", resultCanvas[0] + 16, resultCanvas[1] + 14, {
            fontSize: chipFont,
            color: "rgba(115, 221, 213, 0.98)",
          });
        }

      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#183446");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      drawPanel({ x: margin, y: margin, width: panelWidth, height: panelHeight }, "w = 1", true);
      drawPanel(
        stacked
          ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
          : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
        "w = 0",
        false
      );
    },
  });
}

function setupOrderStoryDemo() {
  const canvas = document.getElementById("order-story-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const triangle = [
    [-0.82, -0.54],
    [0.98, -0.14],
    [-0.12, 0.96],
  ];

  function transformTriangle(order, angle, sx, sy) {
    return triangle.map((point) =>
      order === "scale-rotate"
        ? rotate2(scale2Components(point, sx, sy), angle)
        : scale2Components(rotate2(point, angle), sx, sy)
    );
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.15 : time * 0.92;
      const margin = 18;
      const gap = 16;
      const stacked = width < 680;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap) / 2;
      const panelHeight = stacked ? (height - margin * 2 - gap) / 2 : height - margin * 2;

      function drawPanel(rect, title, order, accent) {
        function toCanvas(point2) {
          const extentX = 2.8;
          const extentY = 2.5;
          return [
            rect.x + rect.width * 0.5 + (point2[0] / extentX) * (rect.width * 0.5 - 16),
            rect.y + rect.height * 0.56 - (point2[1] / extentY) * (rect.height * 0.5 - 22),
          ];
        }

        ctx.fillStyle = "rgba(8, 21, 30, 0.22)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        for (let index = 1; index <= 4; index += 1) {
          const x = rect.x + (rect.width / 5) * index;
          ctx.beginPath();
          ctx.moveTo(x, rect.y + 12);
          ctx.lineTo(x, rect.y + rect.height - 12);
          ctx.stroke();
        }
        for (let index = 1; index <= 4; index += 1) {
          const y = rect.y + (rect.height / 5) * index;
          ctx.beginPath();
          ctx.moveTo(rect.x + 12, y);
          ctx.lineTo(rect.x + rect.width - 12, y);
          ctx.stroke();
        }

        const origin = toCanvas([0, 0]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.beginPath();
        ctx.moveTo(rect.x + 14, origin[1]);
        ctx.lineTo(rect.x + rect.width - 14, origin[1]);
        ctx.moveTo(origin[0], rect.y + 16);
        ctx.lineTo(origin[0], rect.y + rect.height - 16);
        ctx.stroke();

        ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
        ctx.font = `${Math.max(11, width * 0.015)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(title, rect.x + 14, rect.y + 22);

        ctx.strokeStyle = accent;
        ctx.lineWidth = Math.max(2, width * 0.003);
        ctx.beginPath();
        for (let step = 0; step <= 28; step += 1) {
          const samplePhase = phase - (28 - step) * 0.085;
          const sx = 1.02 + Math.sin(samplePhase * 1.12) * 0.34;
          const sy = 0.84 + Math.cos(samplePhase * 0.88) * 0.24;
          const angle = samplePhase * 0.74;
          const transformed = transformTriangle(order, angle, sx, sy)[2];
          const pointCanvas = toCanvas(transformed);
          if (step === 0) {
            ctx.moveTo(pointCanvas[0], pointCanvas[1]);
          } else {
            ctx.lineTo(pointCanvas[0], pointCanvas[1]);
          }
        }
        ctx.stroke();

        const sx = 1.02 + Math.sin(phase * 1.12) * 0.34;
        const sy = 0.84 + Math.cos(phase * 0.88) * 0.24;
        const angle = phase * 0.74;
        const transformedTriangle = transformTriangle(order, angle, sx, sy);
        const first = toCanvas(transformedTriangle[0]);
        const second = toCanvas(transformedTriangle[1]);
        const third = toCanvas(transformedTriangle[2]);

        ctx.fillStyle = order === "scale-rotate" ? "rgba(65, 203, 189, 0.22)" : "rgba(244, 171, 101, 0.22)";
        ctx.strokeStyle = "rgba(239, 245, 247, 0.92)";
        ctx.lineWidth = Math.max(2, width * 0.0032);
        ctx.beginPath();
        ctx.moveTo(first[0], first[1]);
        ctx.lineTo(second[0], second[1]);
        ctx.lineTo(third[0], third[1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(third[0], third[1], Math.max(6, width * 0.009), 0, TAU);
        ctx.fill();

      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#183446");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      drawPanel(
        { x: margin, y: margin, width: panelWidth, height: panelHeight },
        "S then R",
        "scale-rotate",
        "rgba(115, 221, 213, 0.96)"
      );
      drawPanel(
        stacked
          ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
          : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
        "R then S",
        "rotate-scale",
        "rgba(247, 160, 74, 0.96)"
      );
    },
  });
}

function setupDeterminantAreaDemo() {
  const canvas = document.getElementById("determinant-area-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const readoutCol1 = document.getElementById("det-readout-col1");
  const readoutCol2 = document.getElementById("det-readout-col2");
  const readoutValue = document.getElementById("det-readout-value");
  const readoutOrient = document.getElementById("det-readout-orient");

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const angle1 = degreesToRadians(parseFloat(determinantControls.col1Angle?.value ?? 0));
      const len1 = parseFloat(determinantControls.col1Len?.value ?? 100) / 100;
      const angle2 = degreesToRadians(parseFloat(determinantControls.col2Angle?.value ?? 90));
      const len2 = parseFloat(determinantControls.col2Len?.value ?? 100) / 100;

      const a = Math.cos(angle1) * len1;
      const c = Math.sin(angle1) * len1;
      const b = Math.cos(angle2) * len2;
      const d = Math.sin(angle2) * len2;
      const det = a * d - b * c;

      const cx = width * 0.5;
      const cy = height * 0.52;
      const scale = Math.min(width, height) * 0.28;

      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * scale, cy - 3 * scale);
        ctx.lineTo(cx + i * scale, cy + 3 * scale);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 3 * scale, cy + i * scale);
        ctx.lineTo(cx + 3 * scale, cy + i * scale);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 3 * scale, cy);
      ctx.lineTo(cx + 3 * scale, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - 3 * scale);
      ctx.lineTo(cx, cy + 3 * scale);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + scale, cy);
      ctx.lineTo(cx + scale, cy - scale);
      ctx.lineTo(cx, cy - scale);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      const p0 = [cx, cy];
      const p1 = [cx + a * scale, cy - c * scale];
      const p2 = [cx + (a + b) * scale, cy - (c + d) * scale];
      const p3 = [cx + b * scale, cy - d * scale];

      const fillColor = det >= 0
        ? `rgba(115, 221, 213, ${clamp(Math.abs(det) * 0.25, 0.05, 0.35)})`
        : `rgba(247, 160, 74, ${clamp(Math.abs(det) * 0.25, 0.05, 0.35)})`;
      const strokeColor = det >= 0
        ? "rgba(115, 221, 213, 0.88)"
        : "rgba(247, 160, 74, 0.88)";

      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.lineTo(p3[0], p3[1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      drawArrow2d(ctx, [cx, cy], [cx + a * scale, cy - c * scale], "rgba(115, 221, 213, 0.92)", 2.5);
      drawArrow2d(ctx, [cx, cy], [cx + b * scale, cy - d * scale], "rgba(247, 160, 74, 0.92)", 2.5);

      ctx.fillStyle = "rgba(115, 221, 213, 0.94)";
      ctx.font = `${Math.max(11, width * 0.018)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillText("col 1", cx + a * scale * 0.5 - 16, cy - c * scale * 0.5 - 12);
      ctx.fillStyle = "rgba(247, 160, 74, 0.94)";
      ctx.fillText("col 2", cx + b * scale * 0.5 + 8, cy - d * scale * 0.5 - 12);

      ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
      ctx.font = `bold ${Math.max(13, width * 0.022)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillText(`det = ${det.toFixed(3)}`, cx + (a + b) * scale * 0.5 - 30, cy - (c + d) * scale * 0.5 + 4);

      if (readoutCol1) readoutCol1.textContent = `(${a.toFixed(2)}, ${c.toFixed(2)})`;
      if (readoutCol2) readoutCol2.textContent = `(${b.toFixed(2)}, ${d.toFixed(2)})`;
      if (readoutValue) readoutValue.textContent = det.toFixed(3);
      if (readoutOrient) {
        if (Math.abs(det) < 0.005) readoutOrient.textContent = "singular";
        else if (det > 0) readoutOrient.textContent = "preserved";
        else readoutOrient.textContent = "reversed";
      }
    },
  });
}

function setupInverseRoundtripDemo() {
  const canvas = document.getElementById("inverse-roundtrip-canvas");
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

      const phase = prefersReducedMotion ? 0.5 : (Math.sin(time * 0.6) * 0.5 + 0.5);
      const angle1 = degreesToRadians(parseFloat(determinantControls.col1Angle?.value ?? 0));
      const len1 = parseFloat(determinantControls.col1Len?.value ?? 100) / 100;
      const angle2 = degreesToRadians(parseFloat(determinantControls.col2Angle?.value ?? 90));
      const len2 = parseFloat(determinantControls.col2Len?.value ?? 100) / 100;

      const a = Math.cos(angle1) * len1;
      const c = Math.sin(angle1) * len1;
      const b = Math.cos(angle2) * len2;
      const d = Math.sin(angle2) * len2;
      const det = a * d - b * c;

      const cx = width * 0.5;
      const cy = height * 0.52;
      const scale = Math.min(width, height) * 0.22;

      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * scale, cy - 4 * scale);
        ctx.lineTo(cx + i * scale, cy + 4 * scale);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 4 * scale, cy + i * scale);
        ctx.lineTo(cx + 4 * scale, cy + i * scale);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 4 * scale, cy);
      ctx.lineTo(cx + 4 * scale, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - 4 * scale);
      ctx.lineTo(cx, cy + 4 * scale);
      ctx.stroke();

      const px = 0.7;
      const py = 0.5;
      const origX = cx + px * scale;
      const origY = cy - py * scale;

      const tx = a * px + b * py;
      const ty = c * px + d * py;
      const transX = cx + tx * scale;
      const transY = cy - ty * scale;

      const fwdPhase = clamp(phase * 2, 0, 1);
      const curFwdX = lerp(origX, transX, fwdPhase);
      const curFwdY = lerp(origY, transY, fwdPhase);

      ctx.strokeStyle = "rgba(247, 200, 74, 0.6)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(origX, origY);
      ctx.lineTo(curFwdX, curFwdY);
      ctx.stroke();
      ctx.setLineDash([]);

      if (Math.abs(det) > 0.01) {
        const retPhase = clamp(phase * 2 - 1, 0, 1);
        const curRetX = lerp(transX, origX, retPhase);
        const curRetY = lerp(transY, origY, retPhase);

        ctx.strokeStyle = "rgba(115, 180, 240, 0.6)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(transX, transY);
        ctx.lineTo(curRetX, curRetY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(115, 180, 240, 0.9)";
        ctx.beginPath();
        ctx.arc(curRetX, curRetY, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(239, 245, 247, 0.9)";
      ctx.beginPath();
      ctx.arc(origX, origY, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(247, 200, 74, 0.9)";
      ctx.beginPath();
      ctx.arc(curFwdX, curFwdY, 5, 0, Math.PI * 2);
      ctx.fill();

      if (fwdPhase >= 1) {
        ctx.strokeStyle = "rgba(247, 200, 74, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(transX, transY, 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      const fontSize = Math.max(11, width * 0.016);
      ctx.font = `${fontSize}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillStyle = "rgba(239, 245, 247, 0.88)";
      ctx.fillText("original p", origX + 10, origY - 10);
      ctx.fillStyle = "rgba(247, 200, 74, 0.88)";
      ctx.fillText("M · p", transX + 10, transY - 10);

      if (Math.abs(det) > 0.01) {
        ctx.fillStyle = "rgba(115, 180, 240, 0.88)";
        ctx.fillText("M⁻¹ · M · p = p", origX + 10, origY + 20);
      }

      if (Math.abs(det) < 0.01) {
        ctx.fillStyle = "rgba(247, 120, 74, 0.94)";
        ctx.font = `bold ${Math.max(13, width * 0.02)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText("det ≈ 0 — no inverse exists", cx - 100, cy + height * 0.38);
      }

      ctx.fillStyle = "rgba(239, 245, 247, 0.5)";
      ctx.font = `${Math.max(10, width * 0.013)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillText(`det(M) = ${det.toFixed(3)}`, 14, 22);
    },
  });
}

function setupBasisProbeDemo() {
  const canvas = document.getElementById("basis-probe-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const readouts = {
    local: document.getElementById("basis-local-readout"),
    basis: document.getElementById("basis-basis-readout"),
    homogeneous: document.getElementById("basis-homogeneous-readout"),
    world: document.getElementById("basis-world-readout"),
  };

  const state = {
    weights: [1.1, 0.55],
    dragging: null,
  };

  canvas.style.touchAction = "none";

  function getBasis() {
    const angle = degreesToRadians(Number(basisProbeControls.angle?.value || 0));
    return {
      i: [Math.cos(angle) * 1.35, Math.sin(angle) * 1.35],
      j: [-Math.sin(angle) * 0.95, Math.cos(angle) * 0.95],
    };
  }

  function getTranslation() {
    return [
      Number(basisProbeControls.translateX?.value || 0) / 42,
      Number(basisProbeControls.translateY?.value || 0) / 42,
    ];
  }

  function localPoint(basis) {
    return add2(scale2(basis.i, state.weights[0]), scale2(basis.j, state.weights[1]));
  }

  function solveWeights(point, basis) {
    const determinant = basis.i[0] * basis.j[1] - basis.i[1] * basis.j[0] || 1;
    return [
      (point[0] * basis.j[1] - point[1] * basis.j[0]) / determinant,
      (basis.i[0] * point[1] - basis.i[1] * point[0]) / determinant,
    ];
  }

  function updateWeightsFromCanvas(event) {
    const width = canvas.width;
    const height = canvas.height;
    const pointer = getCanvasPointer(event, canvas);
    const world = [
      ((pointer[0] / Math.max(width, 1)) * 2 - 1) * 3.2,
      (1 - (pointer[1] / Math.max(height, 1)) * 2) * 3.2,
    ];
    const basis = getBasis();
    const translation = getTranslation();
    const useTranslation = Boolean(basisProbeControls.translateToggle?.checked);
    const adjustedPoint =
      state.dragging === "translated" && useTranslation ? subtract2(world, translation) : world;
    const weights = solveWeights(adjustedPoint, basis);
    state.weights[0] = clamp(weights[0], -2.4, 2.4);
    state.weights[1] = clamp(weights[1], -2.4, 2.4);
  }

  canvas.addEventListener("pointerdown", (event) => {
    const basis = getBasis();
    const translation = getTranslation();
    const local = localPoint(basis);
    const translated = add2(local, translation);
    const pointer = getCanvasPointer(event, canvas);
    const width = canvas.width;
    const height = canvas.height;
    const toCanvas = (point) => [
      ((point[0] / 3.2 + 1) * 0.5) * width,
      ((1 - point[1] / 3.2) * 0.5) * height,
    ];
    const localCanvas = toCanvas(local);
    const translatedCanvas = toCanvas(translated);
    const localDistance = Math.hypot(pointer[0] - localCanvas[0], pointer[1] - localCanvas[1]);
    const translatedDistance = Math.hypot(pointer[0] - translatedCanvas[0], pointer[1] - translatedCanvas[1]);
    state.dragging =
      basisProbeControls.translateToggle?.checked && translatedDistance < localDistance
        ? "translated"
        : "local";

    updateWeightsFromCanvas(event);
    if (typeof canvas.setPointerCapture === "function") {
      canvas.setPointerCapture(event.pointerId);
    }
    markAllDemosDirty();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.dragging) {
      return;
    }
    updateWeightsFromCanvas(event);
    markAllDemosDirty();
  });

  function endBasisDrag() {
    state.dragging = null;
    markAllDemosDirty();
  }

  canvas.addEventListener("pointerup", endBasisDrag);
  canvas.addEventListener("pointercancel", endBasisDrag);

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const basis = getBasis();
      const translation = getTranslation();
      const useTranslation = Boolean(basisProbeControls.translateToggle?.checked);
      const local = localPoint(basis);
      const result = useTranslation ? add2(local, translation) : local;
      const homogeneous = [state.weights[0], state.weights[1], 0, useTranslation ? 1 : 0];

      function toCanvas(point) {
        return [
          ((point[0] / 3.2 + 1) * 0.5) * width,
          ((1 - point[1] / 3.2) * 0.5) * height,
        ];
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#173345");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let index = -3; index <= 3; index += 1) {
        const start = toCanvas([-3.2, index]);
        const end = toCanvas([3.2, index]);
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
      }
      for (let index = -3; index <= 3; index += 1) {
        const start = toCanvas([index, -3.2]);
        const end = toCanvas([index, 3.2]);
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
      }

      const origin = toCanvas([0, 0]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = Math.max(1.5, width * 0.003);
      ctx.beginPath();
      ctx.moveTo(origin[0], 18);
      ctx.lineTo(origin[0], height - 18);
      ctx.moveTo(18, origin[1]);
      ctx.lineTo(width - 18, origin[1]);
      ctx.stroke();

      if (useTranslation) {
        const translatedOrigin = toCanvas(translation);
        ctx.setLineDash([10, 7]);
        ctx.strokeStyle = "rgba(255, 224, 156, 0.84)";
        ctx.beginPath();
        ctx.moveTo(origin[0], origin[1]);
        ctx.lineTo(translatedOrigin[0], translatedOrigin[1]);
        ctx.stroke();
        ctx.setLineDash([]);

        const translatedI = toCanvas(add2(translation, basis.i));
        const translatedJ = toCanvas(add2(translation, basis.j));
        ctx.strokeStyle = "rgba(116, 221, 218, 0.34)";
        ctx.beginPath();
        ctx.moveTo(translatedOrigin[0], translatedOrigin[1]);
        ctx.lineTo(translatedI[0], translatedI[1]);
        ctx.moveTo(translatedOrigin[0], translatedOrigin[1]);
        ctx.lineTo(translatedJ[0], translatedJ[1]);
        ctx.stroke();
      }

      const basisI = toCanvas(basis.i);
      const basisJ = toCanvas(basis.j);
      ctx.strokeStyle = "rgba(255, 196, 104, 0.94)";
      ctx.lineWidth = Math.max(2.2, width * 0.0046);
      ctx.beginPath();
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(basisI[0], basisI[1]);
      ctx.stroke();

      ctx.strokeStyle = "rgba(110, 226, 201, 0.96)";
      ctx.beginPath();
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(basisJ[0], basisJ[1]);
      ctx.stroke();

      const localCanvas = toCanvas(local);
      const chipFont = Math.max(10, width * 0.0135);
      ctx.fillStyle = "#f7a04a";
      ctx.beginPath();
      ctx.arc(localCanvas[0], localCanvas[1], Math.max(6, width * 0.012), 0, TAU);
      ctx.fill();
      drawCanvasChip(ctx, "i", basisI[0] + 14, basisI[1] - 14, {
        fontSize: chipFont,
        color: "rgba(255, 196, 104, 0.98)",
      });
      drawCanvasChip(ctx, "j", basisJ[0] + 14, basisJ[1] - 14, {
        fontSize: chipFont,
        color: "rgba(110, 226, 201, 0.98)",
      });
      drawCanvasChip(ctx, "p", localCanvas[0] + 16, localCanvas[1] - 16, {
        fontSize: chipFont,
        color: "rgba(247, 160, 74, 0.98)",
      });

      if (useTranslation) {
        const resultCanvas = toCanvas(result);
        ctx.fillStyle = "#73ddd5";
        ctx.beginPath();
        ctx.arc(resultCanvas[0], resultCanvas[1], Math.max(6, width * 0.012), 0, TAU);
        ctx.fill();

        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = "rgba(115, 221, 213, 0.9)";
        ctx.lineWidth = Math.max(1.7, width * 0.0032);
        ctx.beginPath();
        ctx.moveTo(localCanvas[0], localCanvas[1]);
        ctx.lineTo(resultCanvas[0], resultCanvas[1]);
        ctx.stroke();
        ctx.setLineDash([]);
        const translatedOrigin = toCanvas(translation);
        drawCanvasChip(ctx, "t", translatedOrigin[0] + 12, translatedOrigin[1] - 12, {
          fontSize: chipFont,
          color: "rgba(255, 223, 132, 0.98)",
        });
        drawCanvasChip(ctx, "p+t", resultCanvas[0] + 16, resultCanvas[1] - 16, {
          fontSize: chipFont,
          color: "rgba(115, 221, 213, 0.98)",
        });
      }

      if (readouts.local) {
        readouts.local.textContent = formatVector(state.weights, 2);
      }
      if (readouts.basis) {
        readouts.basis.textContent = `i = ${formatVector(basis.i, 2)}, j = ${formatVector(basis.j, 2)}`;
      }
      if (readouts.homogeneous) {
        readouts.homogeneous.textContent = formatVector(homogeneous, 2);
      }
      if (readouts.world) {
        readouts.world.textContent = formatVector(result, 2);
      }
    },
  });
}


function evaluateVectorsCodeLabBindings(values) {
  const angle = degreesToRadians(values.basis_angle);
  const basisI = vec2(
    Math.cos(angle) * values.basis_scale[0],
    Math.sin(angle) * values.basis_scale[0]
  );
  const basisJ = vec2(
    -Math.sin(angle) * values.basis_scale[1],
    Math.cos(angle) * values.basis_scale[1]
  );
  const weightedI = scale2(basisI, values.point[0]);
  const weightedJ = scale2(basisJ, values.point[1]);
  const local = add2(weightedI, weightedJ);
  const homogeneous = [local[0], local[1], 0, values.point_w];
  const translationOffset = scale2(values.translate, values.point_w);
  const world = add2(local, translationOffset);

  const steps = [
    `Build the basis from angle ${formatNumber(values.basis_angle, 1)}° and scale ${formatVector(values.basis_scale, 2)}.`,
    `Reconstruct local XY as ${formatNumber(values.point[0], 2)} * i + ${formatNumber(values.point[1], 2)} * j = ${formatVector(local, 2)}.`,
    `Pack the homogeneous value as ${formatVector(homogeneous, 2)} so translation can depend on w.`,
    `Apply translate * w = ${formatVector(values.translate, 2)} * ${formatNumber(values.point_w, 2)} = ${formatVector(translationOffset, 2)}, giving world XY ${formatVector(world, 2)}.`,
  ];

  const lowered = [
    "// CPU-side lesson bindings",
    `vec2 iBasis = vec2(${formatNumber(basisI[0], 3)}, ${formatNumber(basisI[1], 3)});`,
    `vec2 jBasis = vec2(${formatNumber(basisJ[0], 3)}, ${formatNumber(basisJ[1], 3)});`,
    `vec2 weights = vec2(${formatNumber(values.point[0], 3)}, ${formatNumber(values.point[1], 3)});`,
    `vec2 translate = vec2(${formatNumber(values.translate[0], 3)}, ${formatNumber(values.translate[1], 3)});`,
    "",
    "// Vertex-stage reconstruction",
    "mat2 basis = mat2(iBasis, jBasis);",
    "vec2 localXY = basis * weights;",
    `vec4 pointH = vec4(localXY, 0.0, ${formatNumber(values.point_w, 3)});`,
    "vec2 worldXY = pointH.xy + translate * pointH.w;",
    "gl_Position = vec4(worldXY / 3.2, 0.0, 1.0);",
  ].join("\n");

  return {
    values,
    basisI,
    basisJ,
    weightedI,
    weightedJ,
    local,
    homogeneous,
    translationOffset,
    world,
    steps,
    lowered,
  };
}

function updateVectorsCodeLabUi(derived, readouts, stepList, loweredOutput) {
  if (readouts.basis) {
    readouts.basis.textContent = `i = ${formatVector(derived.basisI, 2)}, j = ${formatVector(derived.basisJ, 2)}`;
  }
  if (readouts.local) {
    readouts.local.textContent = formatVector(derived.local, 2);
  }
  if (readouts.homogeneous) {
    readouts.homogeneous.textContent = formatVector(derived.homogeneous, 2);
  }
  if (readouts.world) {
    readouts.world.textContent = formatVector(derived.world, 2);
  }
  renderCodeSteps(stepList, derived.steps);
  if (loweredOutput) {
    loweredOutput.textContent = derived.lowered;
  }
}

function drawVectorsCodeLab(ctx, canvas, derived) {
  const width = canvas.width;
  const height = canvas.height;

  const extent = Math.min(
    6.2,
    Math.max(
      3.2,
      Math.abs(derived.weightedI[0]) + 0.9,
      Math.abs(derived.weightedI[1]) + 0.9,
      Math.abs(derived.local[0]) + 1.1,
      Math.abs(derived.local[1]) + 1.1,
      Math.abs(derived.world[0]) + 1.1,
      Math.abs(derived.world[1]) + 1.1,
      Math.abs(derived.values.translate[0]) + 0.9,
      Math.abs(derived.values.translate[1]) + 0.9
    )
  );
  const gridLimit = Math.max(3, Math.min(6, Math.ceil(extent)));

  function toCanvas(point) {
    return [
      width * 0.5 + (point[0] / extent) * (width * 0.5 - 26),
      height * 0.5 - (point[1] / extent) * (height * 0.5 - 26),
    ];
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#102535");
  background.addColorStop(1, "#183446");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  for (let index = -gridLimit; index <= gridLimit; index += 1) {
    const horizontalStart = toCanvas([-extent, index]);
    const horizontalEnd = toCanvas([extent, index]);
    ctx.beginPath();
    ctx.moveTo(horizontalStart[0], horizontalStart[1]);
    ctx.lineTo(horizontalEnd[0], horizontalEnd[1]);
    ctx.stroke();

    const verticalStart = toCanvas([index, -extent]);
    const verticalEnd = toCanvas([index, extent]);
    ctx.beginPath();
    ctx.moveTo(verticalStart[0], verticalStart[1]);
    ctx.lineTo(verticalEnd[0], verticalEnd[1]);
    ctx.stroke();
  }

  const origin = toCanvas([0, 0]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = Math.max(1.5, width * 0.003);
  ctx.beginPath();
  ctx.moveTo(origin[0], 18);
  ctx.lineTo(origin[0], height - 18);
  ctx.moveTo(18, origin[1]);
  ctx.lineTo(width - 18, origin[1]);
  ctx.stroke();

  const basisI = toCanvas(derived.basisI);
  const basisJ = toCanvas(derived.basisJ);
  const chipFont = Math.max(10, width * 0.0135);
  ctx.lineWidth = Math.max(2.2, width * 0.0042);
  ctx.strokeStyle = "rgba(247, 160, 74, 0.96)";
  ctx.beginPath();
  ctx.moveTo(origin[0], origin[1]);
  ctx.lineTo(basisI[0], basisI[1]);
  ctx.stroke();
  ctx.strokeStyle = "rgba(115, 221, 213, 0.96)";
  ctx.beginPath();
  ctx.moveTo(origin[0], origin[1]);
  ctx.lineTo(basisJ[0], basisJ[1]);
  ctx.stroke();

  const weightedI = toCanvas(derived.weightedI);
  const local = toCanvas(derived.local);
  const world = toCanvas(derived.world);
  ctx.setLineDash([8, 7]);
  ctx.strokeStyle = "rgba(247, 160, 74, 0.68)";
  ctx.lineWidth = Math.max(1.7, width * 0.0032);
  ctx.beginPath();
  ctx.moveTo(origin[0], origin[1]);
  ctx.lineTo(weightedI[0], weightedI[1]);
  ctx.stroke();
  ctx.strokeStyle = "rgba(115, 221, 213, 0.68)";
  ctx.beginPath();
  ctx.moveTo(weightedI[0], weightedI[1]);
  ctx.lineTo(local[0], local[1]);
  ctx.stroke();
  ctx.setLineDash([]);

  if (Math.abs(derived.values.point_w) >= 1e-6) {
    ctx.setLineDash([10, 6]);
    ctx.strokeStyle = "rgba(255, 223, 132, 0.92)";
    ctx.beginPath();
    ctx.moveTo(local[0], local[1]);
    ctx.lineTo(world[0], world[1]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = "#73ddd5";
  ctx.beginPath();
  ctx.arc(world[0], world[1], Math.max(6.5, width * 0.012), 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#f7a04a";
  ctx.beginPath();
  ctx.arc(local[0], local[1], Math.max(5.4, width * 0.0105), 0, TAU);
  ctx.fill();
  drawCanvasChip(ctx, "i", basisI[0] + 14, basisI[1] - 14, {
    fontSize: chipFont,
    color: "rgba(247, 160, 74, 0.98)",
  });
  drawCanvasChip(ctx, "j", basisJ[0] + 14, basisJ[1] - 14, {
    fontSize: chipFont,
    color: "rgba(115, 221, 213, 0.98)",
  });
  drawCanvasChip(ctx, "p", local[0] + 16, local[1] - 16, {
    fontSize: chipFont,
    color: "rgba(247, 160, 74, 0.98)",
  });
  if (Math.abs(derived.values.point_w) >= 1e-6) {
    drawCanvasChip(ctx, "w*t", (local[0] + world[0]) * 0.5, (local[1] + world[1]) * 0.5 - 14, {
      fontSize: chipFont,
      color: "rgba(255, 223, 132, 0.98)",
    });
    drawCanvasChip(ctx, "p'", world[0] + 16, world[1] - 16, {
      fontSize: chipFont,
      color: "rgba(115, 221, 213, 0.98)",
    });
  }
}

function setupVectorsCodeLab() {
  setupCodeLab({
    prefix: "vectors-code",
    schema: [
      { name: "basis_angle", type: "number" },
      { name: "basis_scale", type: "vec2" },
      { name: "point", type: "vec2" },
      { name: "translate", type: "vec2" },
      { name: "point_w", type: "number" },
    ],
    defaults: {
      basis_angle: 28,
      basis_scale: vec2(1.2, 0.92),
      point: vec2(1.1, 0.55),
      translate: vec2(0.8, -0.4),
      point_w: 1,
    },
    readoutIds: {
      basis: "vectors-code-readout-basis",
      local: "vectors-code-readout-local",
      homogeneous: "vectors-code-readout-h",
      world: "vectors-code-readout-world",
    },
    evaluate: evaluateVectorsCodeLabBindings,
    updateUi: updateVectorsCodeLabUi,
    getStatusMessage(parsed, derived) {
      const translationState =
        Math.abs(derived.values.point_w) < 1e-6
          ? "Translation is inactive because point_w = 0."
          : `Translation contributes ${formatVector(derived.translationOffset, 2)} because point_w = ${formatNumber(derived.values.point_w, 2)}.`;
      return `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}. ${translationState}`;
    },
    draw: drawVectorsCodeLab,
    levels: [
      {
        id: "guided", label: "Guided",
        source: "# Change basis_angle to rotate the coordinate frame\nbasis_angle = 28\nbasis_scale = vec2(1.20, 0.92)\npoint = vec2(1.10, 0.55)\ntranslate = vec2(0.80, -0.40)\npoint_w = 1",
        instructions: "Rotate the basis by changing basis_angle. Set point_w = 0 to see translation disappear.",
      },
      {
        id: "challenge", label: "Challenge",
        source: "# Goal: land world point near (2.0, 1.0)\nbasis_angle = 28\nbasis_scale = vec2(1.20, 0.92)\npoint = vec2(1.10, 0.55)\ntranslate = vec2(0.80, -0.40)\npoint_w = 1",
        instructions: "Adjust the values so the world-space point (cyan dot) lands near (2.0, 1.0).",
        target: { match(derived) { return Math.abs(derived.world[0] - 2.0) < 0.15 && Math.abs(derived.world[1] - 1.0) < 0.15; } },
      },
      {
        id: "explore", label: "Explore",
        source: "basis_angle = 28\nbasis_scale = vec2(1.20, 0.92)\npoint = vec2(1.10, 0.55)\ntranslate = vec2(0.80, -0.40)\npoint_w = 1",
        instructions: "Try expressions like basis_angle = 45 * 2 or point = vec2(cos(0.5), sin(0.5)).",
      },
    ],
  });
}


function initialize() {
  initializePage({
    canvasSetups: [
      ["foundation-types-canvas", setupFoundationTypesDemo],
      ["game-vectors-canvas", setupGameVectorsStoryDemo],
      ["dot-cross-canvas", setupDotCrossStoryDemo],
      ["vector-offset-use-canvas", setupVectorOffsetUseDemo],
      ["vector-normalize-use-canvas", setupVectorNormalizeUseDemo],
      ["vector-dot-use-canvas", setupVectorDotUseDemo],
      ["vector-cross-use-canvas", setupVectorCrossUseDemo],
      ["matrix-columns-canvas", setupMatrixColumnsDemo],
      ["affine-story-canvas", setupAffineStoryDemo],
      ["basis-story-canvas", setupBasisStoryDemo],
      ["homogeneous-story-canvas", setupHomogeneousStoryDemo],
      ["order-story-canvas", setupOrderStoryDemo],
      ["determinant-area-canvas", setupDeterminantAreaDemo],
      ["inverse-roundtrip-canvas", setupInverseRoundtripDemo],
      ["vectors-canvas", setupVectorDemo],
      ["basis-probe-canvas", setupBasisProbeDemo],
      ["vectors-code-canvas", setupVectorsCodeLab]
    ],
    controls: [...Object.values(vectorControls), ...Object.values(determinantControls), ...Object.values(basisProbeControls)],
    extraSetup: [],
  });
}

initialize();
