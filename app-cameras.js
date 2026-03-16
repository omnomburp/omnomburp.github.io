const projectionControls = getElementsById({
  fov: "projection-fov",
  distance: "projection-distance",
  ortho: "projection-ortho"
});

function setupCameraFovUseDemo() {
  const canvas = document.getElementById("camera-fov-use-canvas");
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
      const phase = prefersReducedMotion ? 0.74 : time * 0.62;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const eye = [rect.x + rect.width * 0.2, rect.y + rect.height * 0.58];
      const imageX = rect.x + rect.width * 0.48;
      const farX = rect.x + rect.width * 0.9;
      const narrow = degreesToRadians(36 + Math.sin(phase) * 6);
      const wide = degreesToRadians(78 + Math.cos(phase * 0.8) * 6);
      const fontSize = Math.max(10, width * 0.013);

      function rayPoint(angle, x) {
        const dx = x - eye[0];
        return [x, eye[1] - Math.tan(angle) * dx];
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#102535", "#183446");
      drawLessonCanvasPanel(ctx, rect, "Lens angle", width);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = Math.max(1.5, width * 0.0024);
      ctx.beginPath();
      ctx.moveTo(imageX, rect.y + 34);
      ctx.lineTo(imageX, rect.y + rect.height - 14);
      ctx.stroke();

      drawCameraGlyph(ctx, eye, 0, Math.max(9, width * 0.011), "rgba(255, 245, 216, 0.92)");
      drawArrow2d(ctx, eye, [farX, eye[1]], "rgba(255, 255, 255, 0.22)", Math.max(1.6, width * 0.0024));

      const narrowTop = rayPoint(narrow * 0.5, farX);
      const narrowBottom = rayPoint(-narrow * 0.5, farX);
      const wideTop = rayPoint(wide * 0.5, farX);
      const wideBottom = rayPoint(-wide * 0.5, farX);
      drawArrow2d(ctx, eye, narrowTop, "rgba(247, 160, 74, 0.92)", Math.max(1.9, width * 0.0028));
      drawArrow2d(ctx, eye, narrowBottom, "rgba(247, 160, 74, 0.92)", Math.max(1.9, width * 0.0028));
      drawArrow2d(ctx, eye, wideTop, "rgba(115, 221, 213, 0.9)", Math.max(1.9, width * 0.0028));
      drawArrow2d(ctx, eye, wideBottom, "rgba(115, 221, 213, 0.9)", Math.max(1.9, width * 0.0028));

      drawCanvasChip(ctx, "narrow", farX - 24, narrowTop[1] + 14, {
        fontSize,
        color: "rgba(247, 160, 74, 0.98)",
      });
      drawCanvasChip(ctx, "wide", farX - 24, wideTop[1] - 14, {
        fontSize,
        color: "rgba(115, 221, 213, 0.98)",
      });
    },
  });
}

function setupCameraPerspectiveUseDemo() {
  const canvas = document.getElementById("camera-perspective-use-canvas");
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
      const phase = prefersReducedMotion ? 0.82 : time * 0.56;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const eye = [rect.x + rect.width * 0.16, rect.y + rect.height * 0.6];
      const planeX = rect.x + rect.width * 0.48;
      const screenX = rect.x + rect.width * 0.74;
      const imageHeight = rect.height * 0.54;
      const fov = degreesToRadians(54 + Math.sin(phase) * 6);
      const objects = [
        { depth: 1.3, x: rect.x + rect.width * 0.56, color: "rgba(247, 160, 74, 0.96)" },
        { depth: 2.7, x: rect.x + rect.width * 0.84, color: "rgba(115, 221, 213, 0.96)" },
      ];

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#102535", "#183446");
      drawLessonCanvasPanel(ctx, rect, "Perspective size", width);
      drawCameraGlyph(ctx, eye, 0, Math.max(9, width * 0.011), "rgba(255, 245, 216, 0.92)");

      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = Math.max(1.4, width * 0.0022);
      ctx.beginPath();
      ctx.moveTo(planeX, rect.y + 34);
      ctx.lineTo(planeX, rect.y + rect.height - 14);
      ctx.moveTo(screenX, rect.y + 40);
      ctx.lineTo(screenX, rect.y + rect.height - 18);
      ctx.stroke();

      objects.forEach((object, index) => {
        const worldHeight = rect.height * 0.24;
        const worldTop = eye[1] - worldHeight * 0.5;
        const worldBottom = eye[1] + worldHeight * 0.5;
        ctx.fillStyle = object.color;
        ctx.fillRect(object.x - 8, worldTop, 16, worldHeight);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.beginPath();
        ctx.moveTo(eye[0], eye[1]);
        ctx.lineTo(object.x, worldTop);
        ctx.moveTo(eye[0], eye[1]);
        ctx.lineTo(object.x, worldBottom);
        ctx.stroke();

        const projectedHeight = clamp((0.95 / object.depth) / Math.tan(fov * 0.5), 0.16, 0.92) * imageHeight;
        ctx.fillRect(screenX - 10 + index * 24, eye[1] - projectedHeight * 0.5, 16, projectedHeight);
      });
    },
  });
}

function setupCameraOrthoUseDemo() {
  const canvas = document.getElementById("camera-ortho-use-canvas");
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
      const phase = prefersReducedMotion ? 0.8 : time * 0.54;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const leftEdge = rect.x + rect.width * 0.16;
      const planeX = rect.x + rect.width * 0.48;
      const screenX = rect.x + rect.width * 0.74;
      const objectY = rect.y + rect.height * 0.6;
      const objects = [
        { x: rect.x + rect.width * 0.58, color: "rgba(247, 160, 74, 0.96)" },
        { x: rect.x + rect.width * 0.84, color: "rgba(115, 221, 213, 0.96)" },
      ];
      const screenHeight = rect.height * 0.34;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#102535", "#183446");
      drawLessonCanvasPanel(ctx, rect, "Orthographic size", width);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = Math.max(1.4, width * 0.0022);
      ctx.beginPath();
      ctx.moveTo(planeX, rect.y + 34);
      ctx.lineTo(planeX, rect.y + rect.height - 14);
      ctx.moveTo(screenX, rect.y + 40);
      ctx.lineTo(screenX, rect.y + rect.height - 18);
      ctx.stroke();

      objects.forEach((object, index) => {
        const worldHeight = rect.height * 0.24;
        ctx.fillStyle = object.color;
        ctx.fillRect(object.x - 8, objectY - worldHeight * 0.5, 16, worldHeight);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.beginPath();
        ctx.moveTo(leftEdge, objectY - worldHeight * 0.5);
        ctx.lineTo(planeX, objectY - worldHeight * 0.5);
        ctx.moveTo(leftEdge, objectY + worldHeight * 0.5);
        ctx.lineTo(planeX, objectY + worldHeight * 0.5);
        ctx.stroke();

        ctx.fillRect(screenX - 10 + index * 24, objectY - screenHeight * 0.5, 16, screenHeight);
      });
    },
  });
}

function setupCameraNearUseDemo() {
  const canvas = document.getElementById("camera-near-use-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  function encodeDepth(distance, near, far) {
    return (1 / distance - 1 / near) / (1 / far - 1 / near);
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 0.72 : time * 0.74;
      const margin = 18;
      const gap = 14;
      const panelWidth = (width - margin * 2 - gap) / 2;
      const panelHeight = height - margin * 2;
      const leftRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const rightRect = { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };
      const far = 40;
      const distances = [18.2 + Math.sin(phase) * 0.35, 18.72 + Math.cos(phase * 1.08) * 0.08];
      const fontSize = Math.max(10, width * 0.013);

      function drawPanel(rect, near, color) {
        drawLessonCanvasPanel(ctx, rect, `near ${formatNumber(near, 1)}`, width);
        const trackX = rect.x + 18;
        const trackY = rect.y + rect.height * 0.5;
        const trackWidth = rect.width - 36;
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fillRect(trackX, trackY, trackWidth, 10);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = 1;
        ctx.strokeRect(trackX, trackY, trackWidth, 10);

        distances.forEach((distance, index) => {
          const encoded = encodeDepth(distance, near, far);
          const x = trackX + trackWidth * clamp(encoded, 0, 1);
          ctx.fillStyle = index === 0 ? color : "rgba(255, 245, 216, 0.92)";
          ctx.beginPath();
          ctx.arc(x, trackY + 5, index === 0 ? 7 : 5.5, 0, TAU);
          ctx.fill();
        });

        drawCanvasChip(ctx, `${formatNumber(distances[0], 1)} / ${formatNumber(distances[1], 1)}`, rect.x + rect.width * 0.5, rect.y + rect.height - 18, {
          fontSize,
          color: "rgba(239, 245, 247, 0.92)",
        });
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height, "#102535", "#183446");
      drawPanel(leftRect, 0.1, "rgba(247, 160, 74, 0.96)");
      drawPanel(rightRect, 1.0, "rgba(115, 221, 213, 0.96)");
    },
  });
}

function setupProjectionDemo() {
  const canvas = document.getElementById("projection-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const meshProgram = createProgram(gl, litVertexSource, litFragmentSource);
  const cube = buildCubeMesh(gl);

  const locations = {
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
    gl.uniformMatrix4fv(locations.model, false, model);
    gl.uniformMatrix4fv(locations.view, false, view);
    gl.uniformMatrix4fv(locations.projection, false, projection);
    gl.uniformMatrix3fv(locations.normalMatrix, false, upperLeftMat3(model));
    gl.uniform3fv(locations.baseColor, new Float32Array(baseColor));
    gl.uniform3fv(locations.accentColor, new Float32Array(accentColor));
    gl.uniform3fv(locations.cameraPosition, new Float32Array(camera));
    bindAttribute(gl, cube.position, locations.position, 3);
    bindAttribute(gl, cube.normal, locations.normal, 3);
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
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const distance = Number(projectionControls.distance.value) / 10;
      const useOrtho = projectionControls.ortho.checked;
      const projection = useOrtho
        ? mat4Orthographic(-3.4 * aspect, 3.4 * aspect, -3.4, 3.4, 0.1, 20)
        : mat4Perspective(degreesToRadians(Number(projectionControls.fov.value)), aspect, 0.1, 20);
      const camera = [0, 1.0, distance];
      const view = mat4LookAt(camera, [0, 0, 0], [0, 1, 0]);
      const spin = prefersReducedMotion ? 0.28 : time * 0.52;

      const frontModel = mat4Multiply(
        mat4Translation(-1.7, -0.15, 1.25),
        mat4Multiply(mat4RotationY(spin + 0.3), mat4Scaling(0.72, 0.72, 0.72))
      );
      const middleModel = mat4Multiply(
        mat4Translation(0.0, -0.15, 0.0),
        mat4Multiply(mat4RotationY(-spin * 0.7), mat4Scaling(0.72, 0.72, 0.72))
      );
      const backModel = mat4Multiply(
        mat4Translation(1.7, -0.15, -1.55),
        mat4Multiply(mat4RotationY(spin * 1.12 - 0.45), mat4Scaling(0.72, 0.72, 0.72))
      );

      gl.useProgram(meshProgram);
      gl.uniform3fv(locations.lightDirection, normalize3([0.58, 0.88, 0.46]));
      drawCube(frontModel, view, projection, camera, [0.28, 0.8, 0.96], [0.98, 0.77, 0.34]);
      drawCube(middleModel, view, projection, camera, [0.24, 0.77, 0.56], [0.95, 0.66, 0.33]);
      drawCube(backModel, view, projection, camera, [0.94, 0.58, 0.33], [0.39, 0.79, 0.97]);
    },
  });
}

function setupCameraCompareStoryDemo() {
  const canvas = document.getElementById("camera-compare-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const objects = [
    { depth: 1.2, color: "#73ddd5" },
    { depth: 2.1, color: "#f7a04a" },
    { depth: 3.15, color: "#9fd7ff" },
  ];
  const objectHeight = 0.62;

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 0.72 : time * 0.42;
      const margin = 18;
      const gap = 16;
      const stacked = width < 760;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap) / 2;
      const panelHeight = stacked ? (height - margin * 2 - gap) / 2 : height - margin * 2;
      const fov = degreesToRadians(lerp(42, 72, (Math.sin(phase) + 1) * 0.5));
      const orthoHalfHeight = lerp(1.55, 2.05, (Math.cos(phase * 0.86) + 1) * 0.5);

      function drawPanel(rect, title, perspective) {
        const diagramX = rect.x + 14;
        const diagramY = rect.y + 34;
        const diagramWidth = rect.width * 0.62;
        const diagramHeight = rect.height - 50;
        const screenX = rect.x + rect.width * 0.71;
        const screenY = rect.y + 48;
        const screenWidth = rect.width * 0.21;
        const screenHeight = rect.height - 78;
        const maxDepth = 3.8;

        function toDiagram(point) {
          return [
            diagramX + (point[0] / maxDepth) * diagramWidth,
            diagramY + diagramHeight * 0.5 - point[1] * (diagramHeight * 0.28),
          ];
        }

        ctx.fillStyle = "rgba(8, 21, 30, 0.22)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
        ctx.font = `${Math.max(11, width * 0.014)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(title, rect.x + 14, rect.y + 22);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.lineWidth = Math.max(1.6, width * 0.0025);
        ctx.beginPath();
        ctx.moveTo(diagramX, diagramY + diagramHeight * 0.5);
        ctx.lineTo(diagramX + diagramWidth, diagramY + diagramHeight * 0.5);
        ctx.stroke();

        const imagePlaneDepth = 0.9;
        const imagePlane = toDiagram([imagePlaneDepth, 0]);
        const topPlane = toDiagram([imagePlaneDepth, 1.05]);
        const bottomPlane = toDiagram([imagePlaneDepth, -1.05]);

        ctx.strokeStyle = perspective ? "rgba(247, 160, 74, 0.82)" : "rgba(115, 221, 213, 0.84)";
        ctx.beginPath();
        ctx.moveTo(topPlane[0], topPlane[1]);
        ctx.lineTo(bottomPlane[0], bottomPlane[1]);
        ctx.stroke();

        if (perspective) {
          const farHalfHeight = Math.tan(fov / 2) * maxDepth;
          const eye = toDiagram([0, 0]);
          const farTop = toDiagram([maxDepth, farHalfHeight]);
          const farBottom = toDiagram([maxDepth, -farHalfHeight]);

          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
          ctx.beginPath();
          ctx.moveTo(eye[0], eye[1]);
          ctx.lineTo(farTop[0], farTop[1]);
          ctx.moveTo(eye[0], eye[1]);
          ctx.lineTo(farBottom[0], farBottom[1]);
          ctx.stroke();

          ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
          ctx.beginPath();
          ctx.arc(eye[0], eye[1], Math.max(4.5, width * 0.006), 0, TAU);
          ctx.fill();
        } else {
          const volumeTop = toDiagram([maxDepth, orthoHalfHeight]);
          const volumeBottom = toDiagram([maxDepth, -orthoHalfHeight]);
          const nearTop = toDiagram([0, orthoHalfHeight]);
          const nearBottom = toDiagram([0, -orthoHalfHeight]);

          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
          ctx.beginPath();
          ctx.moveTo(nearTop[0], nearTop[1]);
          ctx.lineTo(volumeTop[0], volumeTop[1]);
          ctx.moveTo(nearBottom[0], nearBottom[1]);
          ctx.lineTo(volumeBottom[0], volumeBottom[1]);
          ctx.moveTo(nearTop[0], nearTop[1]);
          ctx.lineTo(nearBottom[0], nearBottom[1]);
          ctx.moveTo(volumeTop[0], volumeTop[1]);
          ctx.lineTo(volumeBottom[0], volumeBottom[1]);
          ctx.stroke();
        }

        ctx.fillStyle = "rgba(239, 245, 247, 0.16)";
        ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);

        const imageCenterY = screenY + screenHeight * 0.5;

        objects.forEach((object, index) => {
          const halfHeight = objectHeight * 0.5;
          const top = toDiagram([object.depth, halfHeight]);
          const bottom = toDiagram([object.depth, -halfHeight]);
          const barWidth = 12;

          ctx.fillStyle = object.color;
          ctx.globalAlpha = 0.86;
          ctx.fillRect(top[0] - barWidth * 0.5, top[1], barWidth, bottom[1] - top[1]);
          ctx.globalAlpha = 1;

          if (perspective) {
            const eye = toDiagram([0, 0]);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
            ctx.beginPath();
            ctx.moveTo(eye[0], eye[1]);
            ctx.lineTo(top[0], top[1]);
            ctx.moveTo(eye[0], eye[1]);
            ctx.lineTo(bottom[0], bottom[1]);
            ctx.stroke();
          } else {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
            ctx.beginPath();
            ctx.moveTo(top[0], top[1]);
            ctx.lineTo(imagePlane[0], top[1]);
            ctx.moveTo(bottom[0], bottom[1]);
            ctx.lineTo(imagePlane[0], bottom[1]);
            ctx.stroke();
          }

          const projectedHeight = perspective
            ? objectHeight * (0.95 / object.depth) / Math.tan(fov / 2)
            : objectHeight / orthoHalfHeight;
          const clamped = clamp(projectedHeight, 0.12, 0.94);
          const screenBarHeight = clamped * (screenHeight * 0.68);
          const screenBarWidth = screenWidth * 0.22;
          const screenBarX = screenX + screenWidth * (0.16 + index * 0.27);

          ctx.fillStyle = object.color;
          ctx.fillRect(screenBarX, imageCenterY - screenBarHeight * 0.5, screenBarWidth, screenBarHeight);
        });

        ctx.fillStyle = "rgba(239, 245, 247, 0.84)";
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(perspective ? "converging rays" : "parallel rays", rect.x + 14, rect.y + rect.height - 14);
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

      drawPanel({ x: margin, y: margin, width: panelWidth, height: panelHeight }, "Perspective camera", true);
      drawPanel(
        stacked
          ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
          : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
        "Orthographic camera",
        false
      );
    },
  });
}

function setupDepthPrecisionStoryDemo() {
  const canvas = document.getElementById("depth-precision-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  function encodeDepth(distance, near, far) {
    return (1 / distance - 1 / near) / (1 / far - 1 / near);
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 0.7 : time * 0.74;
      const far = 40;
      const surfaceA = 18.2 + Math.sin(phase) * 0.35;
      const surfaceB = surfaceA + 0.48 + Math.cos(phase * 1.13) * 0.08;
      const margin = 18;
      const gap = 16;
      const stacked = width < 820;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap) / 2;
      const panelHeight = stacked ? (height - margin * 2 - gap) / 2 : height - margin * 2;
      const panels = [
        { x: margin, y: margin, width: panelWidth, height: panelHeight, near: 0.6, title: "Near plane at 0.60" },
        stacked
          ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight, near: 0.02, title: "Near plane at 0.02" }
          : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight, near: 0.02, title: "Near plane at 0.02" },
      ];

      function drawPanel(panel) {
        drawLessonCanvasPanel(ctx, panel, panel.title, width);
        const inner = {
          x: panel.x + 16,
          y: panel.y + 34,
          width: panel.width - 32,
          height: panel.height - 48,
        };
        const axisY = inner.y + inner.height * 0.28;
        const axisX0 = inner.x + 26;
        const axisX1 = inner.x + inner.width * 0.58;
        const axisWidth = axisX1 - axisX0;
        const depthA = encodeDepth(surfaceA, panel.near, far);
        const depthB = encodeDepth(surfaceB, panel.near, far);
        const gapValue = depthB - depthA;
        const zoomMin = 0.98;
        const zoomMax = 1.0;
        const zoomRect = {
          x: inner.x + inner.width * 0.08,
          y: inner.y + inner.height * 0.58,
          width: inner.width * 0.84,
          height: inner.height * 0.2,
        };
        const markerA = zoomRect.x + clamp((depthA - zoomMin) / (zoomMax - zoomMin), 0, 1) * zoomRect.width;
        const markerB = zoomRect.x + clamp((depthB - zoomMin) / (zoomMax - zoomMin), 0, 1) * zoomRect.width;
        const overlapRisk = markerB - markerA < 8;
        const quantizationBins = 20;

        function worldX(distance) {
          return axisX0 + (distance / far) * axisWidth;
        }

        ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
        ctx.font = `${Math.max(11, width * 0.0125)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText("camera", inner.x, axisY - 18);

        ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
        ctx.beginPath();
        ctx.arc(inner.x + 8, axisY, 6, 0, TAU);
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(axisX0, axisY);
        ctx.lineTo(axisX1, axisY);
        ctx.stroke();

        const nearX = worldX(panel.near);
        ctx.strokeStyle = "rgba(115, 221, 213, 0.8)";
        ctx.beginPath();
        ctx.moveTo(nearX, axisY - 18);
        ctx.lineTo(nearX, axisY + 18);
        ctx.stroke();
        ctx.fillStyle = "rgba(115, 221, 213, 0.92)";
        ctx.font = `${Math.max(10, width * 0.0108)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
        ctx.fillText(`near ${formatNumber(panel.near, 2)}`, nearX - 18, axisY - 28);

        const farX = worldX(far);
        ctx.strokeStyle = "rgba(247, 160, 74, 0.62)";
        ctx.beginPath();
        ctx.moveTo(farX, axisY - 18);
        ctx.lineTo(farX, axisY + 18);
        ctx.stroke();
        ctx.fillStyle = "rgba(247, 160, 74, 0.94)";
        ctx.fillText(`far ${formatNumber(far, 0)}`, farX - 22, axisY - 28);

        const surfaces = [
          { depth: surfaceA, color: "#73ddd5", label: "surface A" },
          { depth: surfaceB, color: "#f7a04a", label: "surface B" },
        ];

        surfaces.forEach((surface, index) => {
          const x = worldX(surface.depth);
          ctx.strokeStyle = surface.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, axisY - 22);
          ctx.lineTo(x, axisY + 22);
          ctx.stroke();

          ctx.fillStyle = "rgba(239, 245, 247, 0.88)";
          ctx.font = `${Math.max(10, width * 0.0105)}px "Avenir Next", "Segoe UI", sans-serif`;
          ctx.fillText(surface.label, x - 20, axisY + 38 + index * 16);
        });

        ctx.fillStyle = "rgba(239, 245, 247, 0.78)";
        drawTextLines(
          ctx,
          [
            "The world-space gap stays the same.",
            "Only the near plane changes how tightly those far depths get packed.",
          ],
          inner.x,
          inner.y + inner.height * 0.42,
          16
        );

        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fillRect(zoomRect.x, zoomRect.y, zoomRect.width, zoomRect.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.strokeRect(zoomRect.x, zoomRect.y, zoomRect.width, zoomRect.height);

        for (let index = 0; index <= quantizationBins; index += 1) {
          const x = zoomRect.x + (zoomRect.width / quantizationBins) * index;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, zoomRect.y);
          ctx.lineTo(x, zoomRect.y + zoomRect.height);
          ctx.stroke();
        }

        ctx.fillStyle = "rgba(239, 245, 247, 0.9)";
        ctx.font = `${Math.max(10, width * 0.0105)}px "IBM Plex Mono", "SFMono-Regular", monospace`;
        ctx.fillText("stored depth zoom: 0.98 .. 1.00", zoomRect.x, zoomRect.y - 10);

        const markers = [
          { x: markerA, color: "#73ddd5", value: depthA },
          { x: markerB, color: "#f7a04a", value: depthB },
        ];
        markers.forEach((marker, index) => {
          ctx.strokeStyle = marker.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(marker.x, zoomRect.y - 6);
          ctx.lineTo(marker.x, zoomRect.y + zoomRect.height + 6);
          ctx.stroke();

          ctx.fillStyle = "rgba(239, 245, 247, 0.84)";
          ctx.font = `${Math.max(9, width * 0.0098)}px "Avenir Next", "Segoe UI", sans-serif`;
          ctx.fillText(
            index === 0 ? formatNumber(marker.value, 4) : formatNumber(marker.value, 4),
            marker.x - 18,
            zoomRect.y + zoomRect.height + 20 + index * 14
          );
        });

        const binA = Math.floor(depthA * quantizationBins);
        const binB = Math.floor(depthB * quantizationBins);
        ctx.fillStyle = overlapRisk ? "rgba(247, 160, 74, 0.92)" : "rgba(115, 221, 213, 0.92)";
        ctx.font = `${Math.max(10, width * 0.0108)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(
          overlapRisk
            ? `far values crowd together -> z-fighting risk`
            : `more room between stored depths`,
          zoomRect.x,
          zoomRect.y + zoomRect.height + 54
        );
        ctx.fillStyle = "rgba(239, 245, 247, 0.78)";
        ctx.fillText(
          `gap ${formatNumber(gapValue, 5)}  |  bins ${binA} and ${binB}`,
          zoomRect.x,
          zoomRect.y + zoomRect.height + 72
        );
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawPanel(panels[0]);
      drawPanel(panels[1]);
    },
  });
}


function evaluateProjectionCodeLabBindings(values) {
  const objectHeight = 1;
  const nearZ = 1.0;
  const farZ = -1.5;
  const nearDepth = values.camera_distance - nearZ;
  const farDepth = values.camera_distance - farZ;
  const perspectiveScale = 1 / Math.tan(degreesToRadians(values.fov) / 2);
  const nearScreenHeight = values.perspective ? (objectHeight * perspectiveScale) / nearDepth : objectHeight / values.ortho_height;
  const farScreenHeight = values.perspective ? (objectHeight * perspectiveScale) / farDepth : objectHeight / values.ortho_height;
  const ratio = nearScreenHeight / Math.max(farScreenHeight, 1e-6);

  const steps = [
    `Place the camera at distance ${formatNumber(values.camera_distance, 2)} looking toward the scene.`,
    values.perspective
      ? `Choose perspective projection with a ${formatNumber(values.fov, 1)}° field of view. Screen height now depends on depth.`
      : `Choose orthographic projection with a vertical size of ${formatNumber(values.ortho_height, 2)}. Screen height no longer depends on depth.`,
    `Project the near object at depth ${formatNumber(nearDepth, 2)} to screen height ${formatNumber(nearScreenHeight, 2)}.`,
    `Project the far object at depth ${formatNumber(farDepth, 2)} to screen height ${formatNumber(farScreenHeight, 2)}. The near/far size ratio is ${formatNumber(ratio, 2)}.`,
  ];

  const lowered = [
    "// CPU-side lesson bindings",
    values.perspective
      ? `mat4 uProjection = perspective(radians(${formatNumber(values.fov, 3)}), aspect, 0.1, 20.0);`
      : `mat4 uProjection = orthographic(-aspect * ${formatNumber(values.ortho_height, 3)}, aspect * ${formatNumber(values.ortho_height, 3)}, -${formatNumber(values.ortho_height, 3)}, ${formatNumber(values.ortho_height, 3)}, 0.1, 20.0);`,
    `vec3 cameraPos = vec3(0.0, 1.0, ${formatNumber(values.camera_distance, 3)});`,
    "",
    "// Vertex-stage projection",
    "vec4 viewPos = uView * worldPos;",
    "vec4 clipPos = uProjection * viewPos;",
    "vec3 ndc = clipPos.xyz / clipPos.w;",
  ].join("\n");

  return {
    values,
    nearDepth,
    farDepth,
    nearScreenHeight,
    farScreenHeight,
    ratio,
    steps,
    lowered,
  };
}

function updateProjectionCodeLabUi(derived, readouts, stepList, loweredOutput) {
  if (readouts.mode) {
    readouts.mode.textContent = derived.values.perspective ? "perspective" : "orthographic";
  }
  if (readouts.near) {
    readouts.near.textContent = formatNumber(derived.nearScreenHeight, 2);
  }
  if (readouts.far) {
    readouts.far.textContent = formatNumber(derived.farScreenHeight, 2);
  }
  if (readouts.ratio) {
    readouts.ratio.textContent = `${formatNumber(derived.ratio, 2)}x`;
  }
  renderCodeSteps(stepList, derived.steps);
  if (loweredOutput) {
    loweredOutput.textContent = derived.lowered;
  }
}

function drawProjectionCodeLab(ctx, canvas, derived) {
  const width = canvas.width;
  const height = canvas.height;
  const rect = {
    x: 18,
    y: 18,
    width: width - 36,
    height: height - 36,
  };
  const diagramWidth = rect.width * 0.64;
  const diagramHeight = rect.height - 42;
  const diagramX = rect.x + 14;
  const diagramY = rect.y + 30;
  const screenX = rect.x + rect.width * 0.74;
  const screenY = rect.y + 48;
  const screenWidth = rect.width * 0.18;
  const screenHeight = rect.height - 74;
  const maxDepth = 4.8;
  const objectHeight = 1;
  const objects = [
    { depth: derived.nearDepth, color: "rgba(247, 160, 74, 0.9)", label: "near" },
    { depth: derived.farDepth, color: "rgba(115, 221, 213, 0.9)", label: "far" },
  ];

  function toDiagram(point) {
    return [
      diagramX + (point[0] / maxDepth) * diagramWidth,
      diagramY + diagramHeight * 0.5 - point[1] * (diagramHeight * 0.28),
    ];
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawLessonCanvasBackground(ctx, width, height);
  drawLessonCanvasPanel(ctx, rect, "Projection setup", width);

  const imagePlaneDepth = 0.9;
  const imagePlane = toDiagram([imagePlaneDepth, 0]);
  const topPlane = toDiagram([imagePlaneDepth, 1.1]);
  const bottomPlane = toDiagram([imagePlaneDepth, -1.1]);

  ctx.strokeStyle = derived.values.perspective ? "rgba(247, 160, 74, 0.82)" : "rgba(115, 221, 213, 0.84)";
  ctx.lineWidth = Math.max(2, width * 0.003);
  ctx.beginPath();
  ctx.moveTo(topPlane[0], topPlane[1]);
  ctx.lineTo(bottomPlane[0], bottomPlane[1]);
  ctx.stroke();

  if (derived.values.perspective) {
    const fov = degreesToRadians(derived.values.fov);
    const eye = toDiagram([0, 0]);
    const farHalfHeight = Math.tan(fov / 2) * maxDepth;
    const farTop = toDiagram([maxDepth, farHalfHeight]);
    const farBottom = toDiagram([maxDepth, -farHalfHeight]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.beginPath();
    ctx.moveTo(eye[0], eye[1]);
    ctx.lineTo(farTop[0], farTop[1]);
    ctx.moveTo(eye[0], eye[1]);
    ctx.lineTo(farBottom[0], farBottom[1]);
    ctx.stroke();
    ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
    ctx.beginPath();
    ctx.arc(eye[0], eye[1], Math.max(5, width * 0.007), 0, TAU);
    ctx.fill();
  } else {
    const volumeTop = toDiagram([maxDepth, derived.values.ortho_height]);
    const volumeBottom = toDiagram([maxDepth, -derived.values.ortho_height]);
    const nearTop = toDiagram([0, derived.values.ortho_height]);
    const nearBottom = toDiagram([0, -derived.values.ortho_height]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.beginPath();
    ctx.moveTo(nearTop[0], nearTop[1]);
    ctx.lineTo(volumeTop[0], volumeTop[1]);
    ctx.moveTo(nearBottom[0], nearBottom[1]);
    ctx.lineTo(volumeBottom[0], volumeBottom[1]);
    ctx.moveTo(nearTop[0], nearTop[1]);
    ctx.lineTo(nearBottom[0], nearBottom[1]);
    ctx.moveTo(volumeTop[0], volumeTop[1]);
    ctx.lineTo(volumeBottom[0], volumeBottom[1]);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(239, 245, 247, 0.16)";
  ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);

  const imageCenterY = screenY + screenHeight * 0.5;
  const screenHeights = [derived.nearScreenHeight, derived.farScreenHeight];

  objects.forEach((object, index) => {
    const halfHeight = objectHeight * 0.5;
    const top = toDiagram([object.depth, halfHeight]);
    const bottom = toDiagram([object.depth, -halfHeight]);
    ctx.fillStyle = object.color;
    ctx.fillRect(top[0] - 6, top[1], 12, bottom[1] - top[1]);

    if (derived.values.perspective) {
      const eye = toDiagram([0, 0]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.beginPath();
      ctx.moveTo(eye[0], eye[1]);
      ctx.lineTo(top[0], top[1]);
      ctx.moveTo(eye[0], eye[1]);
      ctx.lineTo(bottom[0], bottom[1]);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.beginPath();
      ctx.moveTo(top[0], top[1]);
      ctx.lineTo(imagePlane[0], top[1]);
      ctx.moveTo(bottom[0], bottom[1]);
      ctx.lineTo(imagePlane[0], bottom[1]);
      ctx.stroke();
    }

    const clamped = clamp(screenHeights[index], 0.12, 0.98);
    const barHeight = clamped * (screenHeight * 0.66);
    const barWidth = screenWidth * 0.28;
    const barX = screenX + screenWidth * (0.14 + index * 0.42);
    ctx.fillRect(barX, imageCenterY - barHeight * 0.5, barWidth, barHeight);
  });

  ctx.fillStyle = "rgba(239, 245, 247, 0.84)";
  ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
  ctx.fillText(
    derived.values.perspective ? "distant objects shrink" : "parallel sizes stay matched",
    rect.x + 14,
    rect.y + rect.height - 14
  );
}

function setupProjectionCodeLab() {
  setupCodeLab({
    prefix: "projection-code",
    schema: [
      { name: "perspective", type: "bool" },
      { name: "fov", type: "number" },
      { name: "camera_distance", type: "number" },
      { name: "ortho_height", type: "number" },
    ],
    defaults: {
      perspective: true,
      fov: 56,
      camera_distance: 4.4,
      ortho_height: 1.9,
    },
    readoutIds: {
      mode: "projection-code-readout-mode",
      near: "projection-code-readout-near",
      far: "projection-code-readout-far",
      ratio: "projection-code-readout-ratio",
    },
    evaluate: evaluateProjectionCodeLabBindings,
    updateUi: updateProjectionCodeLabUi,
    getStatusMessage(parsed, derived) {
      return `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}. ${derived.values.perspective ? "Perspective" : "Orthographic"} mode gives a near/far size ratio of ${formatNumber(derived.ratio, 2)}x.`;
    },
    draw: drawProjectionCodeLab,
    levels: [
      {
        id: "guided", label: "Guided",
        source: "# Change fov to see foreshortening change\nperspective = true\nfov = 56\ncamera_distance = 4.4\northo_height = 1.9",
        instructions: "Widen fov to exaggerate perspective. Switch perspective = false to see orthographic projection flatten the scene.",
      },
      {
        id: "challenge", label: "Challenge",
        source: "# Goal: get the near/far ratio above 2.0x in perspective mode\nperspective = true\nfov = 56\ncamera_distance = 4.4\northo_height = 1.9",
        instructions: "Stay in perspective mode and push the near/far size ratio above 2.0x.",
        target: { match(derived) { return derived.values.perspective && derived.ratio > 2.0; } },
      },
      {
        id: "explore", label: "Explore",
        source: "perspective = true\nfov = 56\ncamera_distance = 4.4\northo_height = 1.9",
        instructions: "Try expressions like fov = 30 + 40 or camera_distance = sqrt(20).",
      },
    ],
  });
}


function initialize() {
  initializePage({
    canvasSetups: [
      ["projection-canvas", setupProjectionDemo],
      ["camera-compare-canvas", setupCameraCompareStoryDemo],
      ["depth-precision-canvas", setupDepthPrecisionStoryDemo],
      ["camera-fov-use-canvas", setupCameraFovUseDemo],
      ["camera-perspective-use-canvas", setupCameraPerspectiveUseDemo],
      ["camera-ortho-use-canvas", setupCameraOrthoUseDemo],
      ["camera-near-use-canvas", setupCameraNearUseDemo],
      ["projection-code-canvas", setupProjectionCodeLab]
    ],
    controls: [...Object.values(projectionControls)],
    extraSetup: [],
  });
}

initialize();
