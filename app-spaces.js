const spaceControls = getElementsById({
  rotation: "space-rotation"
});

const spaceProbeControls = getElementsById({
  stage: "space-probe-stage",
  x: "space-probe-x",
  y: "space-probe-y",
  z: "space-probe-z"
});

function buildCubeMesh(gl) {
  const cube = createCubeData();
  return {
    position: createArrayBuffer(gl, cube.positions),
    normal: createArrayBuffer(gl, cube.normals),
    index: createIndexBuffer(gl, cube.indices),
    count: cube.indices.length,
    positions: cube.positions,
    indices: cube.indices,
  };
}

function commonSpaceMatrices(canvas) {
  const aspect = canvas.width / Math.max(canvas.height, 1);
  const projection = mat4Perspective(degreesToRadians(48), aspect, 0.1, 20);
  const camera = [3.5, 2.7, 4.8];
  const view = mat4LookAt(camera, [0.2, 0.1, 0], [0, 1, 0]);
  const rawRotation = degreesToRadians(Number(spaceControls.rotation.value));
  const model = mat4Multiply(
    mat4Translation(1.35, 0.55, -0.4),
    mat4Multiply(mat4RotationY(rawRotation), mat4RotationX(rawRotation * 0.45))
  );
  return { aspect, projection, camera, view, model };
}

function setupSpaceObjectDemo() {
  const canvas = document.getElementById("space-object-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const meshProgram = createProgram(gl, litVertexSource, litFragmentSource);
  const lineProgram = createProgram(gl, lineVertexSource, lineFragmentSource);
  const cube = buildCubeMesh(gl);
  const axes = createWorldAxes(1.8);
  const axisBuffers = {
    position: createArrayBuffer(gl, axes.positions),
    color: createArrayBuffer(gl, axes.colors),
    count: axes.positions.length / 3,
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
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const projection = mat4Perspective(degreesToRadians(46), aspect, 0.1, 20);
      const camera = [3.4, 2.5, 4.2];
      const view = mat4LookAt(camera, [0, 0, 0], [0, 1, 0]);
      const extra = prefersReducedMotion ? 0 : time * 0.28;
      const model = mat4Multiply(mat4RotationY(extra), mat4RotationX(-0.35));

      gl.useProgram(lineProgram);
      gl.uniformMatrix4fv(lineLocations.matrix, false, mat4Multiply(projection, view));
      bindAttribute(gl, axisBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, axisBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, axisBuffers.count);

      gl.useProgram(meshProgram);
      gl.uniformMatrix4fv(meshLocations.model, false, model);
      gl.uniformMatrix4fv(meshLocations.view, false, view);
      gl.uniformMatrix4fv(meshLocations.projection, false, projection);
      gl.uniformMatrix3fv(meshLocations.normalMatrix, false, upperLeftMat3(model));
      gl.uniform3fv(meshLocations.lightDirection, normalize3([0.7, 0.9, 0.6]));
      gl.uniform3fv(meshLocations.baseColor, new Float32Array([0.31, 0.83, 0.71]));
      gl.uniform3fv(meshLocations.accentColor, new Float32Array([0.98, 0.75, 0.36]));
      gl.uniform3fv(meshLocations.cameraPosition, new Float32Array(camera));
      bindAttribute(gl, cube.position, meshLocations.position, 3);
      bindAttribute(gl, cube.normal, meshLocations.normal, 3);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.index);
      gl.drawElements(gl.TRIANGLES, cube.count, gl.UNSIGNED_SHORT, 0);
    },
  });
}

function setupSpaceWorldDemo() {
  const canvas = document.getElementById("space-world-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const meshProgram = createProgram(gl, litVertexSource, litFragmentSource);
  const lineProgram = createProgram(gl, lineVertexSource, lineFragmentSource);
  const cube = buildCubeMesh(gl);
  const axes = createWorldAxes(2.5);
  const axisBuffers = {
    position: createArrayBuffer(gl, axes.positions),
    color: createArrayBuffer(gl, axes.colors),
    count: axes.positions.length / 3,
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

  const cam = [3.5, 2.7, 4.8];
  const target = [0.2, 0.1, 0];
  const forward = normalize3([target[0] - cam[0], target[1] - cam[1], target[2] - cam[2]]);
  const right = normalize3(cross3(forward, [0, 1, 0]));
  const up = cross3(right, forward);
  const nearDist = 1.2;
  const halfW = 0.55;
  const halfH = 0.42;
  const nearCenter = [cam[0] + forward[0] * nearDist, cam[1] + forward[1] * nearDist, cam[2] + forward[2] * nearDist];
  const frustumCorners = [
    [nearCenter[0] - right[0] * halfW - up[0] * halfH, nearCenter[1] - right[1] * halfW - up[1] * halfH, nearCenter[2] - right[2] * halfW - up[2] * halfH],
    [nearCenter[0] + right[0] * halfW - up[0] * halfH, nearCenter[1] + right[1] * halfW - up[1] * halfH, nearCenter[2] + right[2] * halfW - up[2] * halfH],
    [nearCenter[0] + right[0] * halfW + up[0] * halfH, nearCenter[1] + right[1] * halfW + up[1] * halfH, nearCenter[2] + right[2] * halfW + up[2] * halfH],
    [nearCenter[0] - right[0] * halfW + up[0] * halfH, nearCenter[1] - right[1] * halfW + up[1] * halfH, nearCenter[2] - right[2] * halfW + up[2] * halfH],
  ];
  const frustumPositions = new Float32Array([
    ...cam, ...frustumCorners[0], ...cam, ...frustumCorners[1],
    ...cam, ...frustumCorners[2], ...cam, ...frustumCorners[3],
    ...frustumCorners[0], ...frustumCorners[1],
    ...frustumCorners[1], ...frustumCorners[2],
    ...frustumCorners[2], ...frustumCorners[3],
    ...frustumCorners[3], ...frustumCorners[0],
  ]);
  const gold = [0.96, 0.84, 0.42];
  const frustumColors = new Float32Array(frustumPositions.length);
  for (let i = 0; i < frustumColors.length; i += 3) {
    frustumColors[i] = gold[0];
    frustumColors[i + 1] = gold[1];
    frustumColors[i + 2] = gold[2];
  }
  const frustumBuffers = {
    position: createArrayBuffer(gl, frustumPositions),
    color: createArrayBuffer(gl, frustumColors),
    count: frustumPositions.length / 3,
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

      const { projection, camera, view, model } = commonSpaceMatrices(canvas);
      const matrix = mat4Multiply(projection, view);

      gl.useProgram(lineProgram);
      gl.uniformMatrix4fv(lineLocations.matrix, false, matrix);
      bindAttribute(gl, axisBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, axisBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, axisBuffers.count);

      gl.uniformMatrix4fv(lineLocations.matrix, false, matrix);
      bindAttribute(gl, frustumBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, frustumBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, frustumBuffers.count);

      gl.useProgram(meshProgram);
      gl.uniformMatrix4fv(meshLocations.model, false, model);
      gl.uniformMatrix4fv(meshLocations.view, false, view);
      gl.uniformMatrix4fv(meshLocations.projection, false, projection);
      gl.uniformMatrix3fv(meshLocations.normalMatrix, false, upperLeftMat3(model));
      gl.uniform3fv(meshLocations.lightDirection, normalize3([0.75, 0.8, 0.55]));
      gl.uniform3fv(meshLocations.baseColor, new Float32Array([0.32, 0.77, 0.9]));
      gl.uniform3fv(meshLocations.accentColor, new Float32Array([0.95, 0.66, 0.31]));
      gl.uniform3fv(meshLocations.cameraPosition, new Float32Array(camera));
      bindAttribute(gl, cube.position, meshLocations.position, 3);
      bindAttribute(gl, cube.normal, meshLocations.normal, 3);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.index);
      gl.drawElements(gl.TRIANGLES, cube.count, gl.UNSIGNED_SHORT, 0);
    },
  });
}

function setupSpaceClipDemo() {
  const canvas = document.getElementById("space-clip-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const flatProgram = createProgram(gl, flatVertexSource, flatFragmentSource);
  const lineProgram = createProgram(gl, lineVertexSource, lineFragmentSource);
  const cube = createCubeData();
  const transformedPositions = new Float32Array(cube.positions.length);
  const dynamicBuffer = createArrayBuffer(gl, transformedPositions, gl.DYNAMIC_DRAW);
  const indexBuffer = createIndexBuffer(gl, cube.indices);

  const ndcBounds = new Float32Array([
    -1, -1, 0, 1, -1, 0,
    1, -1, 0, 1, 1, 0,
    1, 1, 0, -1, 1, 0,
    -1, 1, 0, -1, -1, 0,
  ]);

  const ndcColors = new Float32Array([
    0.96, 0.68, 0.34, 0.96, 0.68, 0.34,
    0.96, 0.68, 0.34, 0.96, 0.68, 0.34,
    0.96, 0.68, 0.34, 0.96, 0.68, 0.34,
    0.96, 0.68, 0.34, 0.96, 0.68, 0.34,
  ]);

  const boundBuffers = {
    position: createArrayBuffer(gl, ndcBounds),
    color: createArrayBuffer(gl, ndcColors),
    count: ndcBounds.length / 3,
  };

  const flatLocations = {
    position: gl.getAttribLocation(flatProgram, "aPosition"),
    matrix: gl.getUniformLocation(flatProgram, "uMatrix"),
    color: gl.getUniformLocation(flatProgram, "uColor"),
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
    render() {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const { view, model } = commonSpaceMatrices(canvas);
      const clipAspect = canvas.width / Math.max(canvas.height, 1);
      const clipProjection = mat4Perspective(degreesToRadians(68), clipAspect, 0.1, 20);
      const mvp = mat4Multiply(mat4Multiply(clipProjection, view), model);

      for (let index = 0; index < cube.positions.length; index += 3) {
        const point = [
          cube.positions[index],
          cube.positions[index + 1],
          cube.positions[index + 2],
        ];
        const transformed = transformPoint(mvp, point);
        const w = transformed[3] || 1;
        transformedPositions[index] = transformed[0] / w;
        transformedPositions[index + 1] = transformed[1] / w;
        transformedPositions[index + 2] = transformed[2] / w;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, dynamicBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, transformedPositions);

      gl.useProgram(flatProgram);
      bindAttribute(gl, dynamicBuffer, flatLocations.position, 3);
      gl.uniformMatrix4fv(flatLocations.matrix, false, mat4Identity());
      gl.uniform4fv(flatLocations.color, new Float32Array([0.28, 0.82, 0.76, 0.4]));
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, cube.indices.length, gl.UNSIGNED_SHORT, 0);

      gl.useProgram(lineProgram);
      gl.uniformMatrix4fv(lineLocations.matrix, false, mat4Identity());
      bindAttribute(gl, boundBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, boundBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, boundBuffers.count);
    },
  });
}

function setupSpaceContractDemo() {
  const canvas = document.getElementById("space-contract-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const stageColors = ["#f7a04a", "#f4c16e", "#9fd7ff", "#73ddd5"];
  const stageNames = ["Object", "World", "View", "Clip"];
  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.14 : time * 0.7;
      const triVerts = [
        [0.4 + Math.sin(phase * 0.92) * 0.1, 0.6, -0.2, 1],
        [0.9, -0.3 + Math.cos(phase * 1.06) * 0.08, 1.8, 1],
        [-0.5, 0.1, 3.6 + Math.sin(phase * 0.64) * 0.14, 1],
      ];
      const model = mat4Multiply(
        mat4Translation(0.3, 0.1, 2.0),
        mat4RotationY(0.3 + Math.sin(phase * 0.56) * 0.1)
      );
      const view = mat4LookAt([0, 0.8, 7.5], [0.2, 0, 1.5], [0, 1, 0]);
      const projection = mat4Perspective(degreesToRadians(60), 1.25, 0.5, 20);
      const triWorld = triVerts.map((v) => transformPoint(model, v));
      const triView = triWorld.map((v) => transformPoint(view, v));
      const triClip = triView.map((v) => transformPoint(projection, v));
      const stages = [triVerts, triWorld, triView, triClip];
      const margin = 18;
      const gap = 16;
      const panelWidth = (width - margin * 2 - gap) / 2;
      const panelHeight = (height - margin * 2 - gap) / 2;
      const rects = [
        { x: margin, y: margin, width: panelWidth, height: panelHeight },
        { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight },
        { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight },
        { x: margin + panelWidth + gap, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight },
      ];

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);

      for (let index = 0; index < rects.length; index += 1) {
        const rect = rects[index];
        const verts = stages[index];
        const isClip = index === 3;
        let extentX = 1.4;
        let extentY = 1.35;
        for (let vi = 0; vi < verts.length; vi += 1) {
          const v = verts[vi];
          if (isClip) {
            extentX = Math.max(extentX, Math.abs(v[3]) * 1.18, Math.abs(v[0]) * 1.1);
            extentY = Math.max(extentY, Math.abs(v[3]) * 1.18, Math.abs(v[1]) * 1.1);
          } else {
            extentX = Math.max(extentX, Math.abs(v[0]) * 1.2);
            extentY = Math.max(extentY, Math.abs(v[1]) * 1.22);
          }
        }
        drawLessonCanvasPanel(ctx, rect, stageNames[index], width);
        drawRectAxesGrid(ctx, rect, extentX, extentY, width);

        if (isClip) {
          const maxW = Math.max(Math.abs(verts[0][3]), Math.abs(verts[1][3]), Math.abs(verts[2][3]), 0.25);
          const topLeft = projectRectPoint(rect, [-maxW, maxW], extentX, extentY);
          const bottomRight = projectRectPoint(rect, [maxW, -maxW], extentX, extentY);
          ctx.strokeStyle = "rgba(255, 223, 132, 0.92)";
          ctx.lineWidth = Math.max(1.8, width * 0.0028);
          ctx.strokeRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
        }

        const canvasVerts = verts.map((v) => projectRectPoint(rect, v, extentX, extentY));
        ctx.beginPath();
        ctx.moveTo(canvasVerts[0][0], canvasVerts[0][1]);
        ctx.lineTo(canvasVerts[1][0], canvasVerts[1][1]);
        ctx.lineTo(canvasVerts[2][0], canvasVerts[2][1]);
        ctx.closePath();
        ctx.fillStyle = stageColors[index] + "30";
        ctx.fill();
        ctx.strokeStyle = stageColors[index];
        ctx.lineWidth = Math.max(1.8, width * 0.0028);
        ctx.stroke();
        for (let vi = 0; vi < canvasVerts.length; vi += 1) {
          drawCanvasDot(ctx, canvasVerts[vi], Math.max(4, width * 0.005), stageColors[index]);
        }
      }
    },
  });
}

function setupCameraFrameStoryDemo() {
  const canvas = document.getElementById("camera-frame-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const worldPoints = [
    { point: [0.72, 0.28], color: "rgba(247, 160, 74, 0.96)" },
    { point: [-0.84, -0.38], color: "rgba(159, 215, 255, 0.96)" },
    { point: [1.38, -0.54], color: "rgba(115, 221, 213, 0.96)" },
  ];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.08 : time * 0.72;
      const margin = 18;
      const gap = 16;
      const stacked = width < 760;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap) / 2;
      const panelHeight = stacked ? (height - margin * 2 - gap) / 2 : height - margin * 2;
      const worldRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const viewRect = stacked
        ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
        : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };
      const camera = [-1.18 + Math.sin(phase * 0.86) * 0.72, -0.64 + Math.cos(phase * 0.58) * 0.18];
      const target = [0.74, 0.22];
      const cameraAngle = Math.atan2(target[1] - camera[1], target[0] - camera[0]);
      const extentX = 2.8;
      const extentY = 2.25;

      function toView(point) {
        return rotate2(subtract2(point, camera), -cameraAngle);
      }

      function drawWorldPanel(rect) {
        drawLessonCanvasPanel(ctx, rect, "World", width);
        drawRectAxesGrid(ctx, rect, extentX, extentY, width);
        const cameraCanvas = projectRectPoint(rect, camera, extentX, extentY);
        const targetCanvas = projectRectPoint(rect, target, extentX, extentY);
        ctx.setLineDash([8, 6]);
        drawArrow2d(ctx, cameraCanvas, targetCanvas, "rgba(255, 223, 132, 0.82)", Math.max(1.8, width * 0.0028));
        ctx.setLineDash([]);
        drawCameraGlyph(ctx, cameraCanvas, cameraAngle, Math.max(10, width * 0.013), "rgba(255, 223, 132, 0.9)");
        for (const entry of worldPoints) {
          drawCanvasDot(
            ctx,
            projectRectPoint(rect, entry.point, extentX, extentY),
            Math.max(5, width * 0.006),
            entry.color
          );
        }
      }

      function drawViewPanel(rect) {
        drawLessonCanvasPanel(ctx, rect, "View", width);
        const origin = drawRectAxesGrid(ctx, rect, extentX, extentY, width);
        const viewTarget = toView(target);
        ctx.setLineDash([8, 6]);
        drawArrow2d(ctx, origin, projectRectPoint(rect, viewTarget, extentX, extentY), "rgba(255, 223, 132, 0.82)", Math.max(1.8, width * 0.0028));
        ctx.setLineDash([]);
        drawCameraGlyph(ctx, origin, 0, Math.max(10, width * 0.013), "rgba(255, 223, 132, 0.9)");
        for (const entry of worldPoints) {
          drawCanvasDot(
            ctx,
            projectRectPoint(rect, toView(entry.point), extentX, extentY),
            Math.max(5, width * 0.006),
            entry.color
          );
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawWorldPanel(worldRect);
      drawViewPanel(viewRect);
    },
  });
}

function setupWorkedExampleStoryDemo() {
  const canvas = document.getElementById("worked-example-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const stageNames = ["Object", "World", "View", "Clip", "NDC"];
  const stageColors = ["#f7a04a", "#f4c16e", "#9fd7ff", "#f8b37d", "#73ddd5"];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 0.6 : time * 0.72;
      const triVerts = [
        [0.4 + Math.sin(phase * 0.84) * 0.1, 0.6, -0.2, 1],
        [0.9, -0.3 + Math.cos(phase * 1.06) * 0.08, 1.8, 1],
        [-0.5, 0.1 + Math.sin(phase * 0.58) * 0.06, 3.6, 1],
      ];
      const model = mat4Multiply(
        mat4Translation(0.3, 0.1, 2.0),
        mat4RotationY(0.3 + Math.sin(phase * 0.5) * 0.1)
      );
      const view = mat4LookAt([0, 0.8, 7.5], [0.2, 0, 1.5], [0, 1, 0]);
      const projection = mat4Perspective(degreesToRadians(60), 1.2, 0.5, 20);
      const triWorld = triVerts.map((v) => transformPoint(model, v));
      const triView = triWorld.map((v) => transformPoint(view, v));
      const triClip = triView.map((v) => transformPoint(projection, v));
      const triNdc = triClip.map((v) => {
        const w = Math.abs(v[3]) < 1e-6 ? 1e-6 : v[3];
        return [v[0] / w, v[1] / w, v[2] / w];
      });
      const stages = [triVerts, triWorld, triView, triClip, triNdc];
      const currentStage = prefersReducedMotion ? 2 : Math.floor((time * 0.72) % stages.length);
      const margin = 18;
      const gap = 14;
      const footerHeight = 0;
      const columns = width >= 980 ? 5 : 3;
      const rows = Math.ceil(stages.length / columns);
      const boxWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
      const boxHeight = (height - margin * 2 - footerHeight - gap * (rows - 1)) / rows;
      const rects = [];

      for (let index = 0; index < stages.length; index += 1) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        rects.push({
          x: margin + column * (boxWidth + gap),
          y: margin + row * (boxHeight + gap),
          width: boxWidth,
          height: boxHeight,
        });
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);

      if (rows === 1) {
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
        for (let index = 0; index < rects.length - 1; index += 1) {
          const left = rects[index];
          const right = rects[index + 1];
          const start = [left.x + left.width + 6, left.y + left.height * 0.5];
          const end = [right.x - 6, right.y + right.height * 0.5];
          drawArrow2d(ctx, start, end, "rgba(255, 255, 255, 0.16)", Math.max(1.4, width * 0.0024));
        }
      }

      for (let index = 0; index < rects.length; index += 1) {
        const rect = rects[index];
        const verts = stages[index];
        const isClip = index === 3;
        const isNdc = index === 4;
        const isActive = index === currentStage;
        let extentX = isNdc ? 1.1 : 1.35;
        let extentY = isNdc ? 1.1 : 1.35;
        if (!isNdc) {
          for (let vi = 0; vi < verts.length; vi += 1) {
            const v = verts[vi];
            if (isClip) {
              extentX = Math.max(extentX, Math.abs(v[3]) * 1.15, Math.abs(v[0]) * 1.1);
              extentY = Math.max(extentY, Math.abs(v[3]) * 1.15, Math.abs(v[1]) * 1.1);
            } else {
              extentX = Math.max(extentX, Math.abs(v[0]) * 1.2);
              extentY = Math.max(extentY, Math.abs(v[1]) * 1.2);
            }
          }
        }

        ctx.fillStyle = isActive ? "rgba(255, 255, 255, 0.1)" : "rgba(8, 21, 30, 0.22)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = isActive ? "rgba(255, 245, 216, 0.82)" : "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = isActive ? Math.max(2, width * 0.003) : 1;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(stageNames[index], rect.x + 12, rect.y + 18);

        const readout = formatVector([verts[0][0], verts[0][1]], 2);
        ctx.fillStyle = "rgba(239, 245, 247, 0.6)";
        ctx.font = `${Math.max(9, width * 0.01)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(readout, rect.x + 12, rect.y + 32);

        drawRectAxesGrid(ctx, rect, extentX, extentY, width, 0.62);
        if (isClip) {
          const maxW = Math.max(Math.abs(verts[0][3]), Math.abs(verts[1][3]), Math.abs(verts[2][3]), 0.25);
          const topLeft = projectRectPoint(rect, [-maxW, maxW], extentX, extentY, 16, 24, 0.62);
          const bottomRight = projectRectPoint(rect, [maxW, -maxW], extentX, extentY, 16, 24, 0.62);
          ctx.strokeStyle = "rgba(248, 179, 125, 0.9)";
          ctx.lineWidth = Math.max(1.6, width * 0.0026);
          ctx.strokeRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
        }
        if (isNdc) {
          const topLeft = projectRectPoint(rect, [-1, 1], extentX, extentY, 16, 24, 0.62);
          const bottomRight = projectRectPoint(rect, [1, -1], extentX, extentY, 16, 24, 0.62);
          ctx.strokeStyle = "rgba(115, 221, 213, 0.9)";
          ctx.lineWidth = Math.max(1.6, width * 0.0026);
          ctx.strokeRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
        }

        const canvasVerts = verts.map((v) => projectRectPoint(rect, v, extentX, extentY, 16, 24, 0.62));
        ctx.beginPath();
        ctx.moveTo(canvasVerts[0][0], canvasVerts[0][1]);
        ctx.lineTo(canvasVerts[1][0], canvasVerts[1][1]);
        ctx.lineTo(canvasVerts[2][0], canvasVerts[2][1]);
        ctx.closePath();
        ctx.fillStyle = stageColors[index] + "30";
        ctx.fill();
        ctx.strokeStyle = stageColors[index];
        ctx.lineWidth = Math.max(1.6, width * 0.0026);
        ctx.stroke();
        for (let vi = 0; vi < canvasVerts.length; vi += 1) {
          drawCanvasDot(
            ctx,
            canvasVerts[vi],
            Math.max(4, width * 0.005),
            stageColors[index],
            isActive ? "rgba(255, 245, 216, 0.96)" : "",
            Math.max(1.5, width * 0.002)
          );
        }
        if (isClip) {
          const chipFont = Math.max(8, width * 0.009);
          for (let vi = 0; vi < canvasVerts.length; vi += 1) {
            drawCanvasChip(ctx, `w=${formatNumber(verts[vi][3], 1)}`, canvasVerts[vi][0], canvasVerts[vi][1] + 14, {
              fontSize: chipFont,
              color: "rgba(248, 179, 125, 0.94)",
            });
          }
        }
      }
    },
  });
}

function setupGameSpacesStoryDemo() {
  const canvas = document.getElementById("game-spaces-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const shipLocal = [
    [-0.7, -0.34],
    [0.86, 0],
    [-0.7, 0.34],
    [-0.22, 0],
  ];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.12 : time * 0.76;
      const margin = 18;
      const gap = 16;
      const stacked = width < 920;
      const panelWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap * 2) / 3;
      const panelHeight = stacked ? (height - margin * 2 - gap * 2) / 3 : height - margin * 2;
      const objectRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const worldRect = stacked
        ? { x: margin, y: margin + panelHeight + gap, width: panelWidth, height: panelHeight }
        : { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };
      const viewRect = stacked
        ? { x: margin, y: margin + (panelHeight + gap) * 2, width: panelWidth, height: panelHeight }
        : { x: margin + (panelWidth + gap) * 2, y: margin, width: panelWidth, height: panelHeight };
      const worldExtentX = 3.8;
      const worldExtentY = 2.8;
      const objectExtentX = 2.1;
      const objectExtentY = 1.6;

      const shipWorld = [
        0.42 + Math.cos(phase * 0.86) * 1.12,
        -0.1 + Math.sin(phase * 0.94) * 0.84,
      ];
      const shipVelocity = [
        -Math.sin(phase * 0.86) * 1.12 * 0.86,
        Math.cos(phase * 0.94) * 0.84 * 0.94,
      ];
      const shipForward = normalize2(shipVelocity);
      const shipAngle = Math.atan2(shipForward[1], shipForward[0]);
      const cameraWorld = add2(shipWorld, rotate2([-1.26, -0.22], shipAngle));
      const pickupWorld = [
        1.92 + Math.cos(phase * 0.44) * 0.28,
        1.02 + Math.sin(phase * 0.58) * 0.22,
      ];
      const enemyWorld = [
        -1.48 + Math.sin(phase * 0.62) * 0.34,
        1.18 + Math.cos(phase * 0.52) * 0.2,
      ];

      function worldToView(point) {
        return rotate2(subtract2(point, cameraWorld), -shipAngle);
      }

      function projectInRect(rect, point, extentX, extentY) {
        return projectRectPoint(rect, point, extentX, extentY, 16, 22, 0.6);
      }

      function drawShip(rect, center, angle, extentX, extentY, fill, stroke) {
        const points = shipLocal.map((point) => add2(center, rotate2(point, angle)));
        ctx.beginPath();
        for (let index = 0; index < points.length; index += 1) {
          const projected = projectInRect(rect, points[index], extentX, extentY);
          if (index === 0) {
            ctx.moveTo(projected[0], projected[1]);
          } else {
            ctx.lineTo(projected[0], projected[1]);
          }
        }
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = Math.max(1.8, width * 0.0028);
        ctx.fill();
        ctx.stroke();
      }

      function drawPickup(rect, point, extentX, extentY, color) {
        const p = projectInRect(rect, point, extentX, extentY);
        ctx.save();
        ctx.translate(p[0], p[1]);
        ctx.rotate(phase * 0.8);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.8, width * 0.0026);
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 10);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      function drawPanelBackground(rect, title, extentX, extentY) {
        drawLessonCanvasPanel(ctx, rect, title, width);
        drawRectAxesGrid(ctx, rect, extentX, extentY, width, 0.6);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);

      drawPanelBackground(objectRect, "Object", objectExtentX, objectExtentY);
      drawShip(objectRect, [0, 0], 0, objectExtentX, objectExtentY, "rgba(247, 160, 74, 0.24)", "rgba(247, 160, 74, 0.96)");
      const objectOrigin = projectInRect(objectRect, [0, 0], objectExtentX, objectExtentY);
      drawArrow2d(
        ctx,
        objectOrigin,
        projectInRect(objectRect, [1.18, 0], objectExtentX, objectExtentY),
        "rgba(247, 160, 74, 0.94)",
        Math.max(2.1, width * 0.003)
      );
      drawArrow2d(
        ctx,
        objectOrigin,
        projectInRect(objectRect, [0, 0.96], objectExtentX, objectExtentY),
        "rgba(115, 221, 213, 0.94)",
        Math.max(2.1, width * 0.003)
      );
      drawPanelBackground(worldRect, "World", worldExtentX, worldExtentY);
      drawShip(worldRect, shipWorld, shipAngle, worldExtentX, worldExtentY, "rgba(247, 160, 74, 0.22)", "rgba(247, 160, 74, 0.96)");
      drawPickup(worldRect, pickupWorld, worldExtentX, worldExtentY, "rgba(115, 221, 213, 0.94)");
      drawPickup(worldRect, enemyWorld, worldExtentX, worldExtentY, "rgba(159, 215, 255, 0.92)");
      const shipWorldCanvas = projectInRect(worldRect, shipWorld, worldExtentX, worldExtentY);
      const cameraWorldCanvas = projectInRect(worldRect, cameraWorld, worldExtentX, worldExtentY);
      drawCameraGlyph(ctx, cameraWorldCanvas, shipAngle, Math.max(9, width * 0.0115), "rgba(255, 223, 132, 0.88)");
      const chipFont = Math.max(10, width * 0.012);
      drawCanvasChip(ctx, "camera", cameraWorldCanvas[0], cameraWorldCanvas[1] + 18, { fontSize: chipFont, color: "rgba(255, 223, 132, 0.94)" });
      const pickupWorldCanvas = projectInRect(worldRect, pickupWorld, worldExtentX, worldExtentY);
      drawCanvasChip(ctx, "pickup", pickupWorldCanvas[0], pickupWorldCanvas[1] + 16, { fontSize: chipFont, color: "rgba(115, 221, 213, 0.94)" });
      const enemyWorldCanvas = projectInRect(worldRect, enemyWorld, worldExtentX, worldExtentY);
      drawCanvasChip(ctx, "enemy", enemyWorldCanvas[0], enemyWorldCanvas[1] + 16, { fontSize: chipFont, color: "rgba(159, 215, 255, 0.94)" });
      ctx.setLineDash([8, 6]);
      drawArrow2d(ctx, cameraWorldCanvas, shipWorldCanvas, "rgba(255, 223, 132, 0.82)", Math.max(1.8, width * 0.0027));
      ctx.setLineDash([]);

      drawPanelBackground(viewRect, "View", worldExtentX, worldExtentY);
      const cameraOrigin = projectInRect(viewRect, [0, 0], worldExtentX, worldExtentY);
      drawCameraGlyph(ctx, cameraOrigin, 0, Math.max(9, width * 0.0115), "rgba(255, 223, 132, 0.88)");
      drawCanvasChip(ctx, "camera at origin", cameraOrigin[0], cameraOrigin[1] + 18, { fontSize: chipFont, color: "rgba(255, 223, 132, 0.94)" });
      drawShip(
        viewRect,
        worldToView(shipWorld),
        0,
        worldExtentX,
        worldExtentY,
        "rgba(247, 160, 74, 0.22)",
        "rgba(247, 160, 74, 0.96)"
      );
      drawPickup(viewRect, worldToView(pickupWorld), worldExtentX, worldExtentY, "rgba(115, 221, 213, 0.94)");
      drawPickup(viewRect, worldToView(enemyWorld), worldExtentX, worldExtentY, "rgba(159, 215, 255, 0.92)");
      ctx.setLineDash([8, 6]);
      drawArrow2d(
        ctx,
        cameraOrigin,
        projectInRect(viewRect, worldToView(shipWorld), worldExtentX, worldExtentY),
        "rgba(255, 223, 132, 0.82)",
        Math.max(1.8, width * 0.0027)
      );
      ctx.setLineDash([]);
    },
  });
}

function setupSpaceAttachmentUseDemo() {
  const canvas = document.getElementById("space-attachment-use-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const shipLocal = [
    [-0.72, -0.32],
    [0.88, 0],
    [-0.72, 0.32],
    [-0.24, 0],
  ];
  const socketLocal = [0.54, 0];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.12 : time * 0.8;
      const margin = 18;
      const gap = 14;
      const panelWidth = (width - margin * 2 - gap) / 2;
      const panelHeight = height - margin * 2;
      const leftRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const rightRect = { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };
      const worldCenter = [0.12 + Math.cos(phase * 0.74) * 0.44, -0.04 + Math.sin(phase * 0.66) * 0.34];
      const shipAngle = phase * 0.86;
      const socketWorld = add2(worldCenter, rotate2(socketLocal, shipAngle));
      const fontSize = Math.max(10, width * 0.013);

      function project(rect, point, extentX, extentY) {
        return projectRectPoint(rect, point, extentX, extentY, 14, 18, 0.6);
      }

      function drawShip(rect, center, angle, extentX, extentY, fill, stroke) {
        ctx.beginPath();
        for (let index = 0; index < shipLocal.length; index += 1) {
          const point = add2(center, rotate2(shipLocal[index], angle));
          const projected = project(rect, point, extentX, extentY);
          if (index === 0) {
            ctx.moveTo(projected[0], projected[1]);
          } else {
            ctx.lineTo(projected[0], projected[1]);
          }
        }
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = Math.max(1.8, width * 0.0028);
        ctx.fill();
        ctx.stroke();
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);

      drawLessonCanvasPanel(ctx, leftRect, "Local", width);
      drawRectAxesGrid(ctx, leftRect, 1.9, 1.6, width, 0.6);
      drawShip(leftRect, [0, 0], 0, 1.9, 1.6, "rgba(247, 160, 74, 0.22)", "rgba(247, 160, 74, 0.96)");
      const localOrigin = project(leftRect, [0, 0], 1.9, 1.6);
      const localSocketCanvas = project(leftRect, socketLocal, 1.9, 1.6);
      drawArrow2d(ctx, localOrigin, localSocketCanvas, "rgba(115, 221, 213, 0.96)", Math.max(2.1, width * 0.003));
      drawCanvasDot(ctx, localSocketCanvas, Math.max(5.5, width * 0.0065), "rgba(115, 221, 213, 0.96)");
      drawCanvasChip(ctx, "socket", localSocketCanvas[0] + 16, localSocketCanvas[1] - 14, {
        fontSize,
        color: "rgba(115, 221, 213, 0.98)",
      });

      drawLessonCanvasPanel(ctx, rightRect, "World", width);
      drawRectAxesGrid(ctx, rightRect, 2.6, 2.1, width, 0.6);
      ctx.strokeStyle = "rgba(255, 223, 132, 0.22)";
      ctx.lineWidth = Math.max(1.3, width * 0.0022);
      ctx.beginPath();
      for (let step = 0; step <= 18; step += 1) {
        const samplePhase = phase - (18 - step) * 0.12;
        const sampleCenter = [
          0.12 + Math.cos(samplePhase * 0.74) * 0.44,
          -0.04 + Math.sin(samplePhase * 0.66) * 0.34,
        ];
        const sampleSocket = add2(sampleCenter, rotate2(socketLocal, samplePhase * 0.86));
        const projected = project(rightRect, sampleSocket, 2.6, 2.1);
        if (step === 0) {
          ctx.moveTo(projected[0], projected[1]);
        } else {
          ctx.lineTo(projected[0], projected[1]);
        }
      }
      ctx.stroke();
      drawShip(rightRect, worldCenter, shipAngle, 2.6, 2.1, "rgba(247, 160, 74, 0.22)", "rgba(247, 160, 74, 0.96)");
      const socketWorldCanvas = project(rightRect, socketWorld, 2.6, 2.1);
      drawCanvasDot(
        ctx,
        socketWorldCanvas,
        Math.max(6, width * 0.007),
        "rgba(115, 221, 213, 0.98)",
        "rgba(239, 245, 247, 0.94)",
        Math.max(1.6, width * 0.0023)
      );
      drawCanvasChip(ctx, "M*socket", socketWorldCanvas[0] + 18, socketWorldCanvas[1] - 14, {
        fontSize,
        color: "rgba(115, 221, 213, 0.98)",
      });
    },
  });
}

function setupSpaceWorldUseDemo() {
  const canvas = document.getElementById("space-world-use-canvas");
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
      const phase = prefersReducedMotion ? 1.06 : time * 0.8;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const extentX = 3.7;
      const extentY = 2.9;
      const player = [
        -1.52 + Math.cos(phase * 0.74) * 0.4,
        -0.56 + Math.sin(phase * 0.86) * 0.28,
      ];
      const enemy = [
        0.98 + Math.sin(phase * 0.58) * 0.62,
        0.96 + Math.cos(phase * 0.66) * 0.42,
      ];
      const delta = subtract2(enemy, player);
      const distance = Math.hypot(delta[0], delta[1]);
      const inRange = distance < 2.4;
      const color = inRange ? "rgba(115, 221, 213, 0.98)" : "rgba(247, 160, 74, 0.98)";
      const fontSize = Math.max(10, width * 0.013);

      function project(point) {
        return projectRectPoint(rect, point, extentX, extentY, 16, 20, 0.6);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawLessonCanvasPanel(ctx, rect, "Shared scene", width);
      drawRectAxesGrid(ctx, rect, extentX, extentY, width, 0.6);

      const playerCanvas = project(player);
      const enemyCanvas = project(enemy);
      const rangeEdge = project(add2(player, [2.4, 0]));
      ctx.strokeStyle = "rgba(255, 223, 132, 0.24)";
      ctx.lineWidth = Math.max(1.3, width * 0.0023);
      ctx.beginPath();
      ctx.arc(playerCanvas[0], playerCanvas[1], Math.abs(rangeEdge[0] - playerCanvas[0]), 0, TAU);
      ctx.stroke();

      drawArrow2d(ctx, playerCanvas, enemyCanvas, color, Math.max(2.2, width * 0.003));
      drawCanvasDot(ctx, playerCanvas, Math.max(8, width * 0.0092), "rgba(247, 160, 74, 0.96)");
      drawCanvasDot(ctx, enemyCanvas, Math.max(8, width * 0.0092), "rgba(159, 215, 255, 0.96)");
      drawCanvasChip(ctx, `d ${formatNumber(distance, 2)}`, (playerCanvas[0] + enemyCanvas[0]) * 0.5, (playerCanvas[1] + enemyCanvas[1]) * 0.5 - 14, {
        fontSize,
        color,
      });
    },
  });
}

function setupWorldSpaceAiDemo() {
  const canvas = document.getElementById("world-space-ai-canvas");
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
      const phase = prefersReducedMotion ? 1.1 : time * 0.6;
      const rect = { x: 18, y: 18, width: width - 36, height: height - 36 };
      const extentX = 4.2;
      const extentY = 3.2;

      const guard = [0.4, -0.2];
      const guardAngle = 0.5 + Math.sin(phase * 0.42) * 0.6;
      const guardForward = [Math.cos(guardAngle), Math.sin(guardAngle)];
      const coneHalf = 0.52;
      const coneRange = 2.6;

      const player = [
        -1.4 + Math.sin(phase * 0.54) * 1.8,
        0.6 + Math.cos(phase * 0.72) * 1.2,
      ];
      const delta = subtract2(player, guard);
      const distance = Math.hypot(delta[0], delta[1]);
      const dir = distance > 1e-6 ? scale2(delta, 1 / distance) : [1, 0];
      const dotValue = dot2(dir, guardForward);
      const inCone = distance < coneRange && dotValue > Math.cos(coneHalf);

      function project(point) {
        return projectRectPoint(rect, point, extentX, extentY, 16, 20, 0.56);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);
      drawLessonCanvasPanel(ctx, rect, "World space", width);
      drawRectAxesGrid(ctx, rect, extentX, extentY, width, 0.56);

      const guardCanvas = project(guard);
      const coneTipLeft = project(add2(guard, scale2(rotate2(guardForward, coneHalf), coneRange)));
      const coneTipRight = project(add2(guard, scale2(rotate2(guardForward, -coneHalf), coneRange)));

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(guardCanvas[0], guardCanvas[1]);
      ctx.lineTo(coneTipLeft[0], coneTipLeft[1]);
      const arcCenter = project(guard);
      const arcRadiusX = Math.abs(coneTipLeft[0] - guardCanvas[0]);
      const arcRadiusY = Math.abs(coneTipLeft[1] - guardCanvas[1]);
      const arcRadius = Math.hypot(coneTipLeft[0] - guardCanvas[0], coneTipLeft[1] - guardCanvas[1]);
      const startAngle = Math.atan2(coneTipLeft[1] - guardCanvas[1], coneTipLeft[0] - guardCanvas[0]);
      const endAngle = Math.atan2(coneTipRight[1] - guardCanvas[1], coneTipRight[0] - guardCanvas[0]);
      ctx.arc(guardCanvas[0], guardCanvas[1], arcRadius, startAngle, endAngle, false);
      ctx.closePath();
      ctx.fillStyle = inCone ? "rgba(232, 82, 82, 0.14)" : "rgba(255, 223, 132, 0.08)";
      ctx.fill();
      ctx.strokeStyle = inCone ? "rgba(232, 82, 82, 0.5)" : "rgba(255, 223, 132, 0.3)";
      ctx.lineWidth = Math.max(1.4, width * 0.0024);
      ctx.stroke();
      ctx.restore();

      const playerCanvas = project(player);
      const vecColor = inCone ? "rgba(232, 82, 82, 0.9)" : "rgba(115, 221, 213, 0.9)";
      ctx.setLineDash([6, 5]);
      drawArrow2d(ctx, guardCanvas, playerCanvas, vecColor, Math.max(1.8, width * 0.0027));
      ctx.setLineDash([]);

      const guardFwdEnd = project(add2(guard, scale2(guardForward, 1.1)));
      drawArrow2d(ctx, guardCanvas, guardFwdEnd, "rgba(255, 223, 132, 0.8)", Math.max(2, width * 0.003));

      drawCanvasDot(ctx, guardCanvas, Math.max(8, width * 0.009), "rgba(247, 160, 74, 0.96)");
      drawCanvasDot(ctx, playerCanvas, Math.max(8, width * 0.009), inCone ? "rgba(232, 82, 82, 0.96)" : "rgba(115, 221, 213, 0.96)");

      const chipFont = Math.max(9, width * 0.011);
      drawCanvasChip(ctx, "guard", guardCanvas[0], guardCanvas[1] + 18, { fontSize: chipFont, color: "rgba(247, 160, 74, 0.94)" });
      drawCanvasChip(ctx, "player", playerCanvas[0], playerCanvas[1] + 18, { fontSize: chipFont, color: inCone ? "rgba(232, 82, 82, 0.94)" : "rgba(115, 221, 213, 0.94)" });
      drawCanvasChip(ctx, "forward", guardFwdEnd[0] + 8, guardFwdEnd[1] - 12, { fontSize: chipFont, color: "rgba(255, 223, 132, 0.9)", align: "left" });

      const midVec = [(guardCanvas[0] + playerCanvas[0]) * 0.5, (guardCanvas[1] + playerCanvas[1]) * 0.5 - 14];
      drawCanvasChip(ctx, `dot ${formatNumber(dotValue, 2)}`, midVec[0], midVec[1], { fontSize: chipFont, color: vecColor });

      const statusText = inCone ? "DETECTED" : "hidden";
      const statusColor = inCone ? "rgba(232, 82, 82, 0.96)" : "rgba(115, 221, 213, 0.8)";
      drawCanvasChip(ctx, statusText, rect.x + rect.width - 12, rect.y + 30, { fontSize: Math.max(11, width * 0.013), color: statusColor, align: "right" });
    },
  });
}

function setupTangentSpaceIntroDemo() {
  const canvas = document.getElementById("tangent-space-intro-canvas");
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
      const phase = prefersReducedMotion ? 0.8 : time * 0.5;
      const surfaceAngle = Math.sin(phase * 0.48) * 0.45;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#183446");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      const cx = width * 0.38;
      const cy = height * 0.58;
      const arrowLen = Math.max(50, width * 0.1);

      const t = [Math.cos(surfaceAngle), -Math.sin(surfaceAngle)];
      const n = [Math.sin(surfaceAngle), Math.cos(surfaceAngle)];

      const surfaceLen = Math.max(80, width * 0.22);
      const surfaceLeft = [cx - t[0] * surfaceLen, cy - t[1] * surfaceLen];
      const surfaceRight = [cx + t[0] * surfaceLen, cy + t[1] * surfaceLen];

      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = Math.max(2.5, width * 0.004);
      ctx.beginPath();
      ctx.moveTo(surfaceLeft[0], surfaceLeft[1]);
      ctx.lineTo(surfaceRight[0], surfaceRight[1]);
      ctx.stroke();

      const hashCount = 7;
      const hashLen = Math.max(6, width * 0.012);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = Math.max(1, width * 0.0015);
      for (let i = 0; i <= hashCount; i += 1) {
        const frac = i / hashCount;
        const hx = surfaceLeft[0] + (surfaceRight[0] - surfaceLeft[0]) * frac;
        const hy = surfaceLeft[1] + (surfaceRight[1] - surfaceLeft[1]) * frac;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx + n[0] * hashLen, hy - n[1] * hashLen);
        ctx.stroke();
      }

      const tEnd = [cx + t[0] * arrowLen, cy + t[1] * arrowLen];
      const nEnd = [cx - n[0] * arrowLen, cy + n[1] * arrowLen];
      const bEnd = [cx, cy - arrowLen * 0.7];

      drawArrow2d(ctx, [cx, cy], tEnd, "rgba(247, 160, 74, 0.94)", Math.max(2.4, width * 0.0038));
      drawArrow2d(ctx, [cx, cy], nEnd, "rgba(115, 221, 213, 0.94)", Math.max(2.4, width * 0.0038));
      drawArrow2d(ctx, [cx, cy], bEnd, "rgba(159, 215, 255, 0.8)", Math.max(2, width * 0.003));

      drawCanvasDot(ctx, [cx, cy], Math.max(5, width * 0.007), "rgba(255, 255, 255, 0.9)");

      const chipFont = Math.max(11, width * 0.014);
      drawCanvasChip(ctx, "T", tEnd[0] + 10, tEnd[1], { fontSize: chipFont, color: "rgba(247, 160, 74, 0.98)" });
      drawCanvasChip(ctx, "N", nEnd[0] + 10, nEnd[1] - 6, { fontSize: chipFont, color: "rgba(115, 221, 213, 0.98)" });
      drawCanvasChip(ctx, "B", bEnd[0] + 10, bEnd[1] - 4, { fontSize: chipFont, color: "rgba(159, 215, 255, 0.94)" });

      const nmapCx = width * 0.75;
      const nmapCy = height * 0.32;
      const nmapSize = Math.max(40, width * 0.07);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.strokeRect(nmapCx - nmapSize, nmapCy - nmapSize, nmapSize * 2, nmapSize * 2);
      const nmapGrad = ctx.createLinearGradient(nmapCx - nmapSize, nmapCy - nmapSize, nmapCx + nmapSize, nmapCy + nmapSize);
      nmapGrad.addColorStop(0, "rgba(128, 128, 255, 0.35)");
      nmapGrad.addColorStop(0.5, "rgba(148, 128, 255, 0.3)");
      nmapGrad.addColorStop(1, "rgba(128, 148, 255, 0.35)");
      ctx.fillStyle = nmapGrad;
      ctx.fillRect(nmapCx - nmapSize, nmapCy - nmapSize, nmapSize * 2, nmapSize * 2);

      drawCanvasChip(ctx, "normal map", nmapCx, nmapCy - nmapSize - 12, { fontSize: Math.max(9, width * 0.011), color: "rgba(239, 245, 247, 0.8)" });

      const perturbAngle = Math.sin(phase * 0.7) * 0.35;
      const nmapSampleN = [Math.sin(perturbAngle), Math.cos(perturbAngle)];
      const sampleDotCanvas = [nmapCx, nmapCy];
      const sampleArrowEnd = [nmapCx + nmapSampleN[0] * arrowLen * 0.55, nmapCy - nmapSampleN[1] * arrowLen * 0.55];
      drawArrow2d(ctx, sampleDotCanvas, sampleArrowEnd, "rgba(180, 160, 255, 0.9)", Math.max(2, width * 0.003));
      drawCanvasChip(ctx, "sample", sampleArrowEnd[0] + 8, sampleArrowEnd[1] - 8, { fontSize: Math.max(9, width * 0.011), color: "rgba(180, 160, 255, 0.94)", align: "left" });

      const resultCx = width * 0.75;
      const resultCy = height * 0.76;
      const worldN = [
        t[0] * nmapSampleN[0] + (-n[0]) * nmapSampleN[1],
        t[1] * nmapSampleN[0] + n[1] * nmapSampleN[1],
      ];
      const worldNLen = Math.hypot(worldN[0], worldN[1]) || 1;
      const worldNNorm = [worldN[0] / worldNLen, worldN[1] / worldNLen];
      const resultEnd = [resultCx + worldNNorm[0] * arrowLen * 0.7, resultCy - worldNNorm[1] * arrowLen * 0.7];
      drawArrow2d(ctx, [resultCx, resultCy], resultEnd, "rgba(115, 221, 213, 0.94)", Math.max(2.4, width * 0.0038));
      drawCanvasDot(ctx, [resultCx, resultCy], Math.max(4, width * 0.006), "rgba(255, 255, 255, 0.7)");
      drawCanvasChip(ctx, "world normal", resultEnd[0] + 10, resultEnd[1] - 6, { fontSize: Math.max(9, width * 0.011), color: "rgba(115, 221, 213, 0.94)", align: "left" });

      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = Math.max(1.2, width * 0.002);
      ctx.beginPath();
      ctx.moveTo(nmapCx, nmapCy + nmapSize + 4);
      ctx.quadraticCurveTo(nmapCx - nmapSize * 0.5, (nmapCy + nmapSize + resultCy) * 0.5, resultCx - 10, resultCy - 8);
      ctx.stroke();
      ctx.setLineDash([]);

      drawCanvasChip(ctx, "TBN ×", (nmapCx + resultCx) * 0.5 - 20, (nmapCy + nmapSize + resultCy) * 0.5, { fontSize: Math.max(10, width * 0.012), color: "rgba(239, 245, 247, 0.7)" });

      drawCanvasChip(ctx, "surface", cx, cy + 16, { fontSize: Math.max(9, width * 0.011), color: "rgba(255, 255, 255, 0.6)" });
    },
  });
}

function setupSpaceViewUseDemo() {
  const canvas = document.getElementById("space-view-use-canvas");
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
      const phase = prefersReducedMotion ? 1.12 : time * 0.82;
      const margin = 18;
      const gap = 14;
      const panelWidth = (width - margin * 2 - gap) / 2;
      const panelHeight = height - margin * 2;
      const leftRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const rightRect = { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };
      const camera = [
        0.34 + Math.cos(phase * 0.58) * 0.46,
        -0.24 + Math.sin(phase * 0.74) * 0.24,
      ];
      const cameraAngle = 0.28 + Math.sin(phase * 0.66) * 0.54;
      const targetWorld = [
        1.92 + Math.cos(phase * 0.42) * 0.34,
        0.78 + Math.sin(phase * 0.54) * 0.28,
      ];
      const targetView = rotate2(subtract2(targetWorld, camera), -cameraAngle);
      const fontSize = Math.max(10, width * 0.013);

      function project(rect, point, extentX, extentY) {
        return projectRectPoint(rect, point, extentX, extentY, 14, 18, 0.6);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);

      drawLessonCanvasPanel(ctx, leftRect, "World", width);
      drawRectAxesGrid(ctx, leftRect, 3.2, 2.4, width, 0.6);
      const cameraWorldCanvas = project(leftRect, camera, 3.2, 2.4);
      const targetWorldCanvas = project(leftRect, targetWorld, 3.2, 2.4);
      drawCameraGlyph(ctx, cameraWorldCanvas, cameraAngle, Math.max(9, width * 0.011), "rgba(255, 223, 132, 0.9)");
      drawArrow2d(ctx, cameraWorldCanvas, targetWorldCanvas, "rgba(115, 221, 213, 0.9)", Math.max(2.1, width * 0.0029));
      drawCanvasDot(ctx, targetWorldCanvas, Math.max(7, width * 0.0082), "rgba(159, 215, 255, 0.96)");

      drawLessonCanvasPanel(ctx, rightRect, "View", width);
      drawRectAxesGrid(ctx, rightRect, 3.2, 2.4, width, 0.6);
      const cameraOrigin = project(rightRect, [0, 0], 3.2, 2.4);
      const targetViewCanvas = project(rightRect, targetView, 3.2, 2.4);
      drawCameraGlyph(ctx, cameraOrigin, 0, Math.max(9, width * 0.011), "rgba(255, 223, 132, 0.9)");
      drawArrow2d(ctx, cameraOrigin, targetViewCanvas, "rgba(115, 221, 213, 0.9)", Math.max(2.1, width * 0.0029));
      drawCanvasDot(ctx, targetViewCanvas, Math.max(7, width * 0.0082), "rgba(159, 215, 255, 0.96)");
      drawCanvasChip(ctx, "camera at 0", cameraOrigin[0] + 18, cameraOrigin[1] - 16, {
        fontSize,
        color: "rgba(255, 223, 132, 0.98)",
      });
    },
  });
}

function setupSpaceScreenUseDemo() {
  const canvas = document.getElementById("space-screen-use-canvas");
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
      const margin = 18;
      const gap = 14;
      const panelWidth = (width - margin * 2 - gap) / 2;
      const panelHeight = height - margin * 2;
      const leftRect = { x: margin, y: margin, width: panelWidth, height: panelHeight };
      const rightRect = { x: margin + panelWidth + gap, y: margin, width: panelWidth, height: panelHeight };
      const ndc = [
        Math.sin(phase * 0.82) * 0.78,
        Math.cos(phase * 0.64) * 0.72,
      ];
      const cols = 8;
      const rows = 6;
      const pixel = [
        (ndc[0] * 0.5 + 0.5) * cols,
        (1 - (ndc[1] * 0.5 + 0.5)) * rows,
      ];
      const cell = [
        Math.min(cols - 1, Math.max(0, Math.floor(pixel[0]))),
        Math.min(rows - 1, Math.max(0, Math.floor(pixel[1]))),
      ];
      const fontSize = Math.max(10, width * 0.012);

      function projectNdc(rect, point) {
        return projectRectPoint(rect, point, 1.15, 1.15, 14, 18, 0.6);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawLessonCanvasBackground(ctx, width, height);

      drawLessonCanvasPanel(ctx, leftRect, "NDC", width);
      drawRectAxesGrid(ctx, leftRect, 1.15, 1.15, width, 0.6);
      const ndcTopLeft = projectNdc(leftRect, [-1, 1]);
      const ndcBottomRight = projectNdc(leftRect, [1, -1]);
      ctx.strokeStyle = "rgba(115, 221, 213, 0.9)";
      ctx.lineWidth = Math.max(1.6, width * 0.0025);
      ctx.strokeRect(
        ndcTopLeft[0],
        ndcTopLeft[1],
        ndcBottomRight[0] - ndcTopLeft[0],
        ndcBottomRight[1] - ndcTopLeft[1]
      );
      const ndcPoint = projectNdc(leftRect, ndc);
      drawCanvasDot(ctx, ndcPoint, Math.max(6, width * 0.0072), "rgba(115, 221, 213, 0.98)");

      drawLessonCanvasPanel(ctx, rightRect, "Pixels", width);
      const plot = { x: rightRect.x + 16, y: rightRect.y + 34, width: rightRect.width - 32, height: rightRect.height - 48 };
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= cols; x += 1) {
        const px = plot.x + (plot.width / cols) * x;
        ctx.beginPath();
        ctx.moveTo(px, plot.y);
        ctx.lineTo(px, plot.y + plot.height);
        ctx.stroke();
      }
      for (let y = 0; y <= rows; y += 1) {
        const py = plot.y + (plot.height / rows) * y;
        ctx.beginPath();
        ctx.moveTo(plot.x, py);
        ctx.lineTo(plot.x + plot.width, py);
        ctx.stroke();
      }
      const cellWidth = plot.width / cols;
      const cellHeight = plot.height / rows;
      ctx.fillStyle = "rgba(247, 160, 74, 0.28)";
      ctx.fillRect(plot.x + cell[0] * cellWidth, plot.y + cell[1] * cellHeight, cellWidth, cellHeight);
      const pixelPoint = [
        plot.x + (pixel[0] / cols) * plot.width,
        plot.y + (pixel[1] / rows) * plot.height,
      ];
      drawCanvasDot(ctx, pixelPoint, Math.max(5.2, width * 0.0064), "rgba(247, 160, 74, 0.98)");
      drawCanvasChip(ctx, "vp", (leftRect.x + leftRect.width + rightRect.x) * 0.5, height * 0.5, {
        fontSize,
        color: "rgba(255, 245, 216, 0.98)",
      });
    },
  });
}

function setupSpaceMapStoryDemo() {
  const canvas = document.getElementById("space-map-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const stageNames = ["Object", "World", "View", "Clip", "NDC"];
  const transformLabels = ["M", "V", "P", "/w"];
  const stageColors = ["#f7a04a", "#f4c16e", "#9fd7ff", "#f8b37d", "#73ddd5"];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.15 : time * 0.72;
      const triVerts = [
        [0.4 + Math.sin(phase * 0.86) * 0.1, 0.6, -0.2, 1],
        [0.9, -0.3 + Math.cos(phase * 1.04) * 0.08, 1.8, 1],
        [-0.5, 0.1 + Math.sin(phase * 0.62) * 0.06, 3.6, 1],
      ];
      const model = mat4Multiply(
        mat4Translation(0.3, 0.1, 2.0),
        mat4RotationY(0.3 + Math.sin(phase * 0.5) * 0.1)
      );
      const view = mat4LookAt([0, 0.8, 7.5], [0.2, 0, 1.5], [0, 1, 0]);
      const projection = mat4Perspective(degreesToRadians(60), Math.max(width / Math.max(height, 1), 1.2), 0.5, 20);
      const triWorld = triVerts.map((v) => transformPoint(model, v));
      const triView = triWorld.map((v) => transformPoint(view, v));
      const triClip = triView.map((v) => transformPoint(projection, v));
      const triNdc = triClip.map((v) => {
        const w = Math.abs(v[3]) < 1e-6 ? 1e-6 : v[3];
        return [v[0] / w, v[1] / w, v[2] / w];
      });
      const stages = [triVerts, triWorld, triView, triClip, triNdc];

      const columns = width < 720 ? 3 : 5;
      const gap = 14;
      const margin = 18;
      const rows = Math.ceil(stages.length / columns);
      const boxWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
      const boxHeight = (height - margin * 2 - gap * (rows - 1)) / rows;
      const rects = [];

      for (let index = 0; index < stages.length; index += 1) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        rects.push({
          x: margin + column * (boxWidth + gap),
          y: margin + row * (boxHeight + gap),
          width: boxWidth,
          height: boxHeight,
        });
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

      if (rows === 1) {
        ctx.font = `${Math.max(10, width * 0.012)}px "Avenir Next", "Segoe UI", sans-serif`;
        for (let index = 0; index < rects.length - 1; index += 1) {
          const left = rects[index];
          const right = rects[index + 1];
          const startX = left.x + left.width + 6;
          const y = left.y + left.height * 0.5;
          const endX = right.x - 6;

          ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
          ctx.lineWidth = Math.max(1.5, width * 0.0026);
          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
          ctx.stroke();

          const pillWidth = 28;
          const pillX = (startX + endX) * 0.5 - pillWidth * 0.5;
          const pillY = y - 12;
          ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
          ctx.fillRect(pillX, pillY, pillWidth, 24);
          ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
          ctx.fillText(transformLabels[index], pillX + 8, pillY + 16);
        }
      }

      for (let index = 0; index < stages.length; index += 1) {
        const rect = rects[index];
        const verts = stages[index];
        const plotX = rect.x + 12;
        const plotY = rect.y + 30;
        const plotWidth = rect.width - 24;
        const plotHeight = rect.height - 42;

        let extentX = 1.4;
        let extentY = 1.4;
        if (index === 4) {
          extentX = 1.15;
          extentY = 1.15;
        } else {
          for (let vi = 0; vi < verts.length; vi += 1) {
            const v = verts[vi];
            if (index === 3) {
              extentX = Math.max(extentX, Math.abs(v[3]) * 1.2, Math.abs(v[0]) * 1.15);
              extentY = Math.max(extentY, Math.abs(v[3]) * 1.2, Math.abs(v[1]) * 1.15);
            } else {
              extentX = Math.max(extentX, Math.abs(v[0]) * 1.2, Math.abs(v[1]) * 1.2);
              extentY = Math.max(extentY, Math.abs(v[0]) * 0.95, Math.abs(v[1]) * 1.2);
            }
          }
        }

        function toStageCanvas(point) {
          return [
            plotX + plotWidth * 0.5 + (point[0] / extentX) * (plotWidth * 0.5 - 8),
            plotY + plotHeight * 0.5 - (point[1] / extentY) * (plotHeight * 0.5 - 8),
          ];
        }

        ctx.fillStyle = "rgba(8, 21, 30, 0.24)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
        ctx.font = `${Math.max(10, width * 0.013)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(stageNames[index], rect.x + 12, rect.y + 20);

        const leftAxis = toStageCanvas([-extentX, 0]);
        const rightAxis = toStageCanvas([extentX, 0]);
        const topAxis = toStageCanvas([0, extentY]);
        const bottomAxis = toStageCanvas([0, -extentY]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.beginPath();
        ctx.moveTo(leftAxis[0], leftAxis[1]);
        ctx.lineTo(rightAxis[0], rightAxis[1]);
        ctx.moveTo(topAxis[0], topAxis[1]);
        ctx.lineTo(bottomAxis[0], bottomAxis[1]);
        ctx.stroke();

        if (index === 3) {
          const maxW = Math.max(Math.abs(verts[0][3]), Math.abs(verts[1][3]), Math.abs(verts[2][3]), 0.2);
          const topLeft = toStageCanvas([-maxW, maxW]);
          const bottomRight = toStageCanvas([maxW, -maxW]);
          ctx.strokeStyle = "rgba(248, 179, 125, 0.94)";
          ctx.strokeRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
        }

        if (index === 4) {
          const topLeft = toStageCanvas([-1, 1]);
          const bottomRight = toStageCanvas([1, -1]);
          ctx.strokeStyle = "rgba(115, 221, 213, 0.92)";
          ctx.strokeRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
        }

        const canvasVerts = verts.map((v) => toStageCanvas(v));
        ctx.beginPath();
        ctx.moveTo(canvasVerts[0][0], canvasVerts[0][1]);
        ctx.lineTo(canvasVerts[1][0], canvasVerts[1][1]);
        ctx.lineTo(canvasVerts[2][0], canvasVerts[2][1]);
        ctx.closePath();
        ctx.fillStyle = stageColors[index] + "30";
        ctx.fill();
        ctx.strokeStyle = stageColors[index];
        ctx.lineWidth = Math.max(1.6, width * 0.0026);
        ctx.stroke();
        for (let vi = 0; vi < canvasVerts.length; vi += 1) {
          ctx.fillStyle = stageColors[index];
          ctx.beginPath();
          ctx.arc(canvasVerts[vi][0], canvasVerts[vi][1], Math.max(3.5, width * 0.005), 0, TAU);
          ctx.fill();
        }
        if (index === 3) {
          const chipFont = Math.max(8, width * 0.009);
          for (let vi = 0; vi < canvasVerts.length; vi += 1) {
            drawCanvasChip(ctx, `w=${formatNumber(verts[vi][3], 1)}`, canvasVerts[vi][0], canvasVerts[vi][1] + 14, {
              fontSize: chipFont,
              color: "rgba(248, 179, 125, 0.94)",
            });
          }
        }
      }
    },
  });
}

function setupClipStoryDemo() {
  const canvas = document.getElementById("clip-story-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const readouts = {
    view: document.getElementById("clip-story-readout-view"),
    clip: document.getElementById("clip-story-readout-clip"),
    ndc: document.getElementById("clip-story-readout-ndc"),
    pixel: document.getElementById("clip-story-readout-pixel"),
  };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render(time) {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const phase = prefersReducedMotion ? 1.2 : time * 0.74;
      const triView = [
        [Math.sin(phase * 0.86) * 0.4, 0.35 + Math.cos(phase * 1.12) * 0.15, -(1.0 + Math.sin(phase * 0.54) * 0.3)],
        [0.6 + Math.sin(phase * 0.72) * 0.15, -0.2, -(3.2 + Math.cos(phase * 0.44) * 0.4)],
        [-0.5, 0.1 + Math.sin(phase * 0.92) * 0.12, -(5.2 + Math.sin(phase * 0.38) * 0.5)],
      ];
      const projection = mat4Perspective(degreesToRadians(58), 1.2, 0.5, 6.2);
      const triClip = triView.map((v) => transformPoint(projection, v));
      const triNdc = triClip.map((v) => {
        const w = Math.abs(v[3]) < 1e-6 ? 1e-6 : v[3];
        return [v[0] / w, v[1] / w, v[2] / w];
      });
      const ndcCenter = [(triNdc[0][0] + triNdc[1][0] + triNdc[2][0]) / 3, (triNdc[0][1] + triNdc[1][1] + triNdc[2][1]) / 3];
      const viewportPoint = [
        (ndcCenter[0] * 0.5 + 0.5) * width,
        (1 - (ndcCenter[1] * 0.5 + 0.5)) * height,
      ];
      const margin = 18;
      const gap = 16;
      const stacked = width < 820;
      const columns = stacked ? 1 : 3;
      const boxWidth = stacked ? width - margin * 2 : (width - margin * 2 - gap * (columns - 1)) / columns;
      const boxHeight = stacked ? (height - margin * 2 - gap * 2) / 3 : height - margin * 2;

      const rects = [
        { x: margin, y: margin, width: boxWidth, height: boxHeight },
        stacked
          ? { x: margin, y: margin + boxHeight + gap, width: boxWidth, height: boxHeight }
          : { x: margin + boxWidth + gap, y: margin, width: boxWidth, height: boxHeight },
        stacked
          ? { x: margin, y: margin + (boxHeight + gap) * 2, width: boxWidth, height: boxHeight }
          : { x: margin + (boxWidth + gap) * 2, y: margin, width: boxWidth, height: boxHeight },
      ];

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      drawLessonCanvasBackground(ctx, width, height);

      function drawConnector(fromRect, toRect, label) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        let start;
        let end;
        if (stacked) {
          start = [fromRect.x + fromRect.width * 0.5, fromRect.y + fromRect.height + 5];
          end = [toRect.x + toRect.width * 0.5, toRect.y - 5];
          drawArrow2d(ctx, start, end, "rgba(255, 255, 255, 0.18)", Math.max(1.6, width * 0.0025));
        } else {
          start = [fromRect.x + fromRect.width + 8, fromRect.y + fromRect.height * 0.5];
          end = [toRect.x - 8, toRect.y + toRect.height * 0.5];
          drawArrow2d(ctx, start, end, "rgba(255, 255, 255, 0.18)", Math.max(1.6, width * 0.0025));
        }
        drawCanvasChip(ctx, label, (start[0] + end[0]) * 0.5, (start[1] + end[1]) * 0.5, {
          fontSize: Math.max(10, width * 0.013),
        });
        ctx.restore();
      }

      function drawPanelFrame(rect, title) {
        drawLessonCanvasPanel(ctx, rect, title, width);
        return {
          x: rect.x + 12,
          y: rect.y + 34,
          width: rect.width - 24,
          height: rect.height - 46,
        };
      }

      drawConnector(rects[0], rects[1], "P");
      drawConnector(rects[1], rects[2], "/w");

      function drawViewSpace(rect) {
        const fov = degreesToRadians(58);
        const near = 0.5;
        const far = 6.2;
        const maxHalfWidth = Math.tan(fov / 2) * far;
        const plot = drawPanelFrame(rect, "View");

        function toCanvas(point) {
          const x = point[0];
          const depth = point[1];
          return [
            plot.x + plot.width * 0.5 + (x / maxHalfWidth) * (plot.width * 0.42),
            plot.y + (depth / far) * plot.height,
          ];
        }

        const eye = toCanvas([0, 0]);
        const nearLeft = toCanvas([-Math.tan(fov / 2) * near, near]);
        const nearRight = toCanvas([Math.tan(fov / 2) * near, near]);
        const farLeft = toCanvas([-Math.tan(fov / 2) * far, far]);
        const farRight = toCanvas([Math.tan(fov / 2) * far, far]);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = Math.max(1.8, width * 0.0028);
        ctx.beginPath();
        ctx.moveTo(eye[0], eye[1]);
        ctx.lineTo(farLeft[0], farLeft[1]);
        ctx.moveTo(eye[0], eye[1]);
        ctx.lineTo(farRight[0], farRight[1]);
        ctx.moveTo(nearLeft[0], nearLeft[1]);
        ctx.lineTo(nearRight[0], nearRight[1]);
        ctx.moveTo(farLeft[0], farLeft[1]);
        ctx.lineTo(farRight[0], farRight[1]);
        ctx.stroke();

        const viewCanvasVerts = triView.map((v) => toCanvas([v[0], -v[2]]));
        ctx.beginPath();
        ctx.moveTo(viewCanvasVerts[0][0], viewCanvasVerts[0][1]);
        ctx.lineTo(viewCanvasVerts[1][0], viewCanvasVerts[1][1]);
        ctx.lineTo(viewCanvasVerts[2][0], viewCanvasVerts[2][1]);
        ctx.closePath();
        ctx.fillStyle = "rgba(115, 221, 213, 0.2)";
        ctx.fill();
        ctx.strokeStyle = "rgba(115, 221, 213, 0.9)";
        ctx.lineWidth = Math.max(1.6, width * 0.0026);
        ctx.stroke();
        for (let vi = 0; vi < viewCanvasVerts.length; vi += 1) {
          ctx.fillStyle = "#73ddd5";
          ctx.beginPath();
          ctx.arc(viewCanvasVerts[vi][0], viewCanvasVerts[vi][1], Math.max(4, width * 0.006), 0, TAU);
          ctx.fill();
        }
      }

      function drawClipSpace(rect) {
        const plot = drawPanelFrame(rect, "Clip");
        let extent = 1.2;
        for (let vi = 0; vi < triClip.length; vi += 1) {
          const v = triClip[vi];
          extent = Math.max(extent, Math.abs(v[3]) * 1.25, Math.abs(v[0]) * 1.15, Math.abs(v[1]) * 1.15);
        }

        function toCanvas(point) {
          return [
            plot.x + plot.width * 0.5 + (point[0] / extent) * (plot.width * 0.5 - 8),
            plot.y + plot.height * 0.5 - (point[1] / extent) * (plot.height * 0.5 - 8),
          ];
        }

        const leftAxis = toCanvas([-extent, 0]);
        const rightAxis = toCanvas([extent, 0]);
        const topAxis = toCanvas([0, extent]);
        const bottomAxis = toCanvas([0, -extent]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.beginPath();
        ctx.moveTo(leftAxis[0], leftAxis[1]);
        ctx.lineTo(rightAxis[0], rightAxis[1]);
        ctx.moveTo(topAxis[0], topAxis[1]);
        ctx.lineTo(bottomAxis[0], bottomAxis[1]);
        ctx.stroke();

        const maxW = Math.max(Math.abs(triClip[0][3]), Math.abs(triClip[1][3]), Math.abs(triClip[2][3]), 0.2);
        const topLeft = toCanvas([-maxW, maxW]);
        const bottomRight = toCanvas([maxW, -maxW]);
        ctx.strokeStyle = "rgba(248, 179, 125, 0.94)";
        ctx.lineWidth = Math.max(1.8, width * 0.0028);
        ctx.strokeRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
        drawCanvasChip(ctx, "w-box", plot.x + plot.width - 12, plot.y + 16, {
          align: "right",
          fontSize: Math.max(10, width * 0.0125),
          color: "rgba(248, 179, 125, 0.98)",
        });

        const clipCanvasVerts = triClip.map((v) => toCanvas([v[0], v[1]]));
        ctx.beginPath();
        ctx.moveTo(clipCanvasVerts[0][0], clipCanvasVerts[0][1]);
        ctx.lineTo(clipCanvasVerts[1][0], clipCanvasVerts[1][1]);
        ctx.lineTo(clipCanvasVerts[2][0], clipCanvasVerts[2][1]);
        ctx.closePath();
        ctx.fillStyle = "rgba(248, 179, 125, 0.2)";
        ctx.fill();
        ctx.strokeStyle = "rgba(248, 179, 125, 0.9)";
        ctx.lineWidth = Math.max(1.6, width * 0.0026);
        ctx.stroke();
        const chipFont = Math.max(8, width * 0.009);
        for (let vi = 0; vi < clipCanvasVerts.length; vi += 1) {
          ctx.fillStyle = "#f8b37d";
          ctx.beginPath();
          ctx.arc(clipCanvasVerts[vi][0], clipCanvasVerts[vi][1], Math.max(4, width * 0.006), 0, TAU);
          ctx.fill();
          drawCanvasChip(ctx, `w=${formatNumber(triClip[vi][3], 1)}`, clipCanvasVerts[vi][0], clipCanvasVerts[vi][1] + 14, {
            fontSize: chipFont,
            color: "rgba(248, 179, 125, 0.94)",
          });
        }
      }

      function drawNdc(rect) {
        const plot = drawPanelFrame(rect, "NDC");
        const extent = 1.15;

        function toCanvas(point) {
          return [
            plot.x + plot.width * 0.5 + (point[0] / extent) * (plot.width * 0.5 - 8),
            plot.y + plot.height * 0.5 - (point[1] / extent) * (plot.height * 0.5 - 8),
          ];
        }

        const leftAxis = toCanvas([-extent, 0]);
        const rightAxis = toCanvas([extent, 0]);
        const topAxis = toCanvas([0, extent]);
        const bottomAxis = toCanvas([0, -extent]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.beginPath();
        ctx.moveTo(leftAxis[0], leftAxis[1]);
        ctx.lineTo(rightAxis[0], rightAxis[1]);
        ctx.moveTo(topAxis[0], topAxis[1]);
        ctx.lineTo(bottomAxis[0], bottomAxis[1]);
        ctx.stroke();

        const topLeft = toCanvas([-1, 1]);
        const bottomRight = toCanvas([1, -1]);
        ctx.strokeStyle = "rgba(115, 221, 213, 0.92)";
        ctx.lineWidth = Math.max(1.8, width * 0.0028);
        ctx.strokeRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
        drawCanvasChip(ctx, "[-1,1]", plot.x + plot.width - 12, plot.y + 16, {
          align: "right",
          fontSize: Math.max(10, width * 0.0125),
          color: "rgba(115, 221, 213, 0.98)",
        });

        const ndcCanvasVerts = triNdc.map((v) => toCanvas([v[0], v[1]]));
        ctx.beginPath();
        ctx.moveTo(ndcCanvasVerts[0][0], ndcCanvasVerts[0][1]);
        ctx.lineTo(ndcCanvasVerts[1][0], ndcCanvasVerts[1][1]);
        ctx.lineTo(ndcCanvasVerts[2][0], ndcCanvasVerts[2][1]);
        ctx.closePath();
        ctx.fillStyle = "rgba(115, 221, 213, 0.2)";
        ctx.fill();
        ctx.strokeStyle = "rgba(115, 221, 213, 0.9)";
        ctx.lineWidth = Math.max(1.6, width * 0.0026);
        ctx.stroke();
        for (let vi = 0; vi < ndcCanvasVerts.length; vi += 1) {
          ctx.fillStyle = "#73ddd5";
          ctx.beginPath();
          ctx.arc(ndcCanvasVerts[vi][0], ndcCanvasVerts[vi][1], Math.max(4, width * 0.006), 0, TAU);
          ctx.fill();
        }
      }

      drawViewSpace(rects[0]);
      drawClipSpace(rects[1]);
      drawNdc(rects[2]);

      if (readouts.view) {
        readouts.view.textContent = formatVector(triView[0], 2);
      }
      if (readouts.clip) {
        readouts.clip.textContent = formatVector(triClip[0], 2);
      }
      if (readouts.ndc) {
        readouts.ndc.textContent = formatVector(triNdc[0], 2);
      }
      if (readouts.pixel) {
        readouts.pixel.textContent = `(${Math.round(viewportPoint[0])}, ${Math.round(viewportPoint[1])})`;
      }
    },
  });
}


function setupSpaceProbeDemo() {
  const canvas = document.getElementById("space-probe-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const label = document.getElementById("space-stage-label");
  const note = document.getElementById("space-stage-note");
  const readouts = {
    object: document.getElementById("space-readout-object"),
    world: document.getElementById("space-readout-world"),
    view: document.getElementById("space-readout-view"),
    clip: document.getElementById("space-readout-clip"),
    ndc: document.getElementById("space-readout-ndc"),
  };
  const stageCards = Array.from(document.querySelectorAll("[data-space-stage]"));
  const stageNames = [
    "Object space",
    "World space",
    "View space",
    "Clip space",
    "Normalized device coordinates",
  ];
  const stageNotes = [
    "The vertex still lives in the model’s own local coordinate frame.",
    "The model matrix has placed the vertex into the shared scene.",
    "The view matrix has rewritten the scene relative to the camera.",
    "Projection has produced a homogeneous clip coordinate that still carries w.",
    "The divide by w has happened, so the point now lives inside the screen-ready canonical box.",
  ];

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const stage = Number(spaceProbeControls.stage?.value || 0);
      const object = [
        Number(spaceProbeControls.x?.value || 0) / 50,
        Number(spaceProbeControls.y?.value || 0) / 50,
        Number(spaceProbeControls.z?.value || 0) / 50,
        1,
      ];

      const model = mat4Multiply(
        mat4Translation(1.2, -0.18, -0.7),
        mat4Multiply(mat4RotationY(0.56), mat4RotationX(-0.32))
      );
      const camera = [1.9, 1.25, 4.1];
      const view = mat4LookAt(camera, [0.35, 0.1, 0], [0, 1, 0]);
      const projection = mat4Perspective(degreesToRadians(52), width / Math.max(height, 1), 0.1, 20);

      const world = transformPoint(model, object);
      const viewPoint = transformPoint(view, world);
      const clip = transformPoint(projection, viewPoint);
      const safeW = clip[3] || 1;
      const ndc = [clip[0] / safeW, clip[1] / safeW, clip[2] / safeW, 1];
      const values = [object, world, viewPoint, clip, ndc];

      function stageToCanvas(point, extentX, extentY) {
        const margin = 28;
        return [
          width * 0.5 + (point[0] / Math.max(extentX, 1e-6)) * (width * 0.5 - margin),
          height * 0.5 - (point[1] / Math.max(extentY, 1e-6)) * (height * 0.5 - margin),
        ];
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#102535");
      background.addColorStop(1, "#183344");
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

      let extentX = 2.2;
      let extentY = 2.2;
      const current = values[stage];
      if (stage < 3) {
        extentX = Math.max(2.2, Math.abs(current[0]) * 1.35, Math.abs(current[1]) * 1.35);
        extentY = Math.max(2.2, Math.abs(current[0]) * 0.95, Math.abs(current[1]) * 1.35);
      } else if (stage === 3) {
        extentX = Math.max(1.2, Math.abs(current[3]) * 1.35, Math.abs(current[0]) * 1.2);
        extentY = Math.max(1.2, Math.abs(current[3]) * 1.35, Math.abs(current[1]) * 1.2);
      } else {
        extentX = 1.25;
        extentY = 1.25;
      }

      const axisX = stageToCanvas([extentX, 0], extentX, extentY);
      const axisNegX = stageToCanvas([-extentX, 0], extentX, extentY);
      const axisY = stageToCanvas([0, extentY], extentX, extentY);
      const axisNegY = stageToCanvas([0, -extentY], extentX, extentY);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = Math.max(1.5, width * 0.003);
      ctx.beginPath();
      ctx.moveTo(axisNegX[0], axisNegX[1]);
      ctx.lineTo(axisX[0], axisX[1]);
      ctx.moveTo(axisNegY[0], axisNegY[1]);
      ctx.lineTo(axisY[0], axisY[1]);
      ctx.stroke();

      if (stage === 3) {
        const clipW = Math.max(Math.abs(clip[3]), 0.2);
        const topLeft = stageToCanvas([-clipW, clipW], extentX, extentY);
        const bottomRight = stageToCanvas([clipW, -clipW], extentX, extentY);
        ctx.strokeStyle = "rgba(244, 171, 101, 0.86)";
        ctx.strokeRect(
          topLeft[0],
          topLeft[1],
          bottomRight[0] - topLeft[0],
          bottomRight[1] - topLeft[1]
        );
      }

      if (stage === 4) {
        const topLeft = stageToCanvas([-1, 1], extentX, extentY);
        const bottomRight = stageToCanvas([1, -1], extentX, extentY);
        ctx.strokeStyle = "rgba(244, 171, 101, 0.86)";
        ctx.strokeRect(
          topLeft[0],
          topLeft[1],
          bottomRight[0] - topLeft[0],
          bottomRight[1] - topLeft[1]
        );
      }

      const pointCanvas = stageToCanvas(current, extentX, extentY);
      ctx.fillStyle = "#73ddd5";
      ctx.beginPath();
      ctx.arc(pointCanvas[0], pointCanvas[1], Math.max(6, width * 0.0115), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.94)";
      ctx.lineWidth = Math.max(1.6, width * 0.003);
      ctx.stroke();

      if (label) {
        label.textContent = stageNames[stage];
      }
      if (note) {
        note.textContent = stageNotes[stage];
      }
      if (readouts.object) {
        readouts.object.textContent = formatVector(object, 2);
      }
      if (readouts.world) {
        readouts.world.textContent = formatVector(world, 2);
      }
      if (readouts.view) {
        readouts.view.textContent = formatVector(viewPoint, 2);
      }
      if (readouts.clip) {
        readouts.clip.textContent = formatVector(clip, 2);
      }
      if (readouts.ndc) {
        readouts.ndc.textContent = formatVector(ndc, 2);
      }
      for (const card of stageCards) {
        const index = Number(card.dataset.spaceStage);
        card.classList.toggle("is-active", index === stage);
      }
    },
  });
}


function evaluateSpacesCodeLabBindings(values) {
  const viewport = [640, 360];
  const object = [values.object[0], values.object[1], values.object[2], 1];
  const model = mat4Multiply(
    mat4Translation(values.model_translate[0], values.model_translate[1], values.model_translate[2]),
    mat4Multiply(mat4RotationY(degreesToRadians(values.model_rotate_y)), mat4RotationX(-0.32))
  );
  const view = mat4LookAt([1.9, 1.25, 4.1], [0.35, 0.1, 0], [0, 1, 0]);
  const projection = mat4Perspective(degreesToRadians(values.fov), viewport[0] / viewport[1], 0.1, 20);
  const world = transformPoint(model, object);
  const viewPoint = transformPoint(view, world);
  const clip = transformPoint(projection, viewPoint);
  const safeW = Math.abs(clip[3]) < 1e-6 ? (clip[3] < 0 ? -1e-6 : 1e-6) : clip[3];
  const ndc = [clip[0] / safeW, clip[1] / safeW, clip[2] / safeW];
  const pixel = [
    (ndc[0] * 0.5 + 0.5) * viewport[0],
    (1 - (ndc[1] * 0.5 + 0.5)) * viewport[1],
  ];

  const steps = [
    `Bind the object-space vertex ${formatVector(object, 2)} before any scene transform happens.`,
    `Apply the model matrix: translate ${formatVector(values.model_translate, 2)} and rotate Y by ${formatNumber(values.model_rotate_y, 1)}°, giving world ${formatVector(world, 2)}.`,
    `Apply the fixed camera view matrix to get ${formatVector(viewPoint, 2)} in view space.`,
    `Projection with fov ${formatNumber(values.fov, 1)}° produces clip ${formatVector(clip, 2)}.`,
    `Divide by w = ${formatNumber(safeW, 2)} to reach NDC ${formatVector(ndc, 2)}.`,
    `Viewport-map NDC into a ${viewport[0]} x ${viewport[1]} framebuffer pixel at (${Math.round(pixel[0])}, ${Math.round(pixel[1])}).`,
  ];

  const lowered = [
    "// CPU-side lesson bindings",
    `mat4 uModel = translate(vec3(${formatNumber(values.model_translate[0], 3)}, ${formatNumber(values.model_translate[1], 3)}, ${formatNumber(values.model_translate[2], 3)}))`,
    `             * rotateY(radians(${formatNumber(values.model_rotate_y, 3)}));`,
    "mat4 uView = lookAt(vec3(1.900, 1.250, 4.100), vec3(0.350, 0.100, 0.000), vec3(0.0, 1.0, 0.0));",
    `mat4 uProjection = perspective(radians(${formatNumber(values.fov, 3)}), 640.0 / 360.0, 0.1, 20.0);`,
    "",
    "// Vertex-stage flow",
    `vec4 objectPos = vec4(${formatNumber(values.object[0], 3)}, ${formatNumber(values.object[1], 3)}, ${formatNumber(values.object[2], 3)}, 1.0);`,
    "vec4 worldPos = uModel * objectPos;",
    "vec4 viewPos = uView * worldPos;",
    "vec4 clipPos = uProjection * viewPos;",
    "gl_Position = clipPos;",
    "vec3 ndc = clipPos.xyz / clipPos.w; // done after clip-space output",
  ].join("\n");

  return {
    values,
    viewport,
    object,
    world,
    viewPoint,
    clip,
    ndc,
    pixel,
    steps,
    lowered,
    stages: [
      { label: "Object", value: object, color: "#f7a04a" },
      { label: "World", value: world, color: "#f6c56b" },
      { label: "View", value: viewPoint, color: "#9fd7ff" },
      { label: "Clip", value: clip, color: "#f8b37d" },
      { label: "NDC", value: ndc, color: "#73ddd5" },
    ],
  };
}

function updateSpacesCodeLabUi(derived, readouts, stepList, loweredOutput) {
  if (readouts.object) {
    readouts.object.textContent = formatVector(derived.object, 2);
  }
  if (readouts.world) {
    readouts.world.textContent = formatVector(derived.world, 2);
  }
  if (readouts.view) {
    readouts.view.textContent = formatVector(derived.viewPoint, 2);
  }
  if (readouts.clip) {
    readouts.clip.textContent = formatVector(derived.clip, 2);
  }
  if (readouts.ndc) {
    readouts.ndc.textContent = formatVector(derived.ndc, 2);
  }
  if (readouts.pixel) {
    readouts.pixel.textContent = `(${Math.round(derived.pixel[0])}, ${Math.round(derived.pixel[1])})`;
  }
  renderCodeSteps(stepList, derived.steps);
  if (loweredOutput) {
    loweredOutput.textContent = derived.lowered;
  }
}

function drawSpacesCodeLab(ctx, canvas, derived) {
  const width = canvas.width;
  const height = canvas.height;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#102535");
  background.addColorStop(1, "#183446");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const columns = width < 700 ? 3 : 5;
  const gap = 14;
  const margin = 18;
  const rows = Math.ceil(derived.stages.length / columns);
  const boxWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
  const boxHeight = (height - margin * 2 - gap * (rows - 1)) / rows;
  const stageRects = [];

  for (let index = 0; index < derived.stages.length; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    stageRects.push({
      x: margin + column * (boxWidth + gap),
      y: margin + row * (boxHeight + gap),
      width: boxWidth,
      height: boxHeight,
    });
  }

  if (rows === 1) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = Math.max(1.5, width * 0.0028);
    for (let index = 0; index < stageRects.length - 1; index += 1) {
      const left = stageRects[index];
      const right = stageRects[index + 1];
      const startX = left.x + left.width + 6;
      const startY = left.y + left.height * 0.5;
      const endX = right.x - 6;
      const endY = right.y + right.height * 0.5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }

  for (let index = 0; index < derived.stages.length; index += 1) {
    const stage = derived.stages[index];
    const rect = stageRects[index];
    const plotX = rect.x + 12;
    const plotY = rect.y + 32;
    const plotWidth = rect.width - 24;
    const plotHeight = rect.height - 44;
    const stageValue = stage.value;

    let extentX = 1.4;
    let extentY = 1.4;
    if (stage.label === "Clip") {
      extentX = Math.max(1.2, Math.abs(derived.clip[3]) * 1.2, Math.abs(stageValue[0]) * 1.15);
      extentY = Math.max(1.2, Math.abs(derived.clip[3]) * 1.2, Math.abs(stageValue[1]) * 1.15);
    } else if (stage.label === "NDC") {
      extentX = 1.15;
      extentY = 1.15;
    } else {
      extentX = Math.max(1.35, Math.abs(stageValue[0]) * 1.2, Math.abs(stageValue[1]) * 1.2);
      extentY = Math.max(1.35, Math.abs(stageValue[0]) * 0.95, Math.abs(stageValue[1]) * 1.2);
    }

    function toStageCanvas(point) {
      return [
        plotX + plotWidth * 0.5 + (point[0] / extentX) * (plotWidth * 0.5 - 8),
        plotY + plotHeight * 0.5 - (point[1] / extentY) * (plotHeight * 0.5 - 8),
      ];
    }

    ctx.fillStyle = "rgba(8, 21, 30, 0.26)";
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

    ctx.fillStyle = "rgba(239, 245, 247, 0.92)";
    ctx.font = `${Math.max(10, width * 0.014)}px "Avenir Next", "Segoe UI", sans-serif`;
    ctx.fillText(stage.label, rect.x + 12, rect.y + 20);

    const leftAxis = toStageCanvas([-extentX, 0]);
    const rightAxis = toStageCanvas([extentX, 0]);
    const topAxis = toStageCanvas([0, extentY]);
    const bottomAxis = toStageCanvas([0, -extentY]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.beginPath();
    ctx.moveTo(leftAxis[0], leftAxis[1]);
    ctx.lineTo(rightAxis[0], rightAxis[1]);
    ctx.moveTo(topAxis[0], topAxis[1]);
    ctx.lineTo(bottomAxis[0], bottomAxis[1]);
    ctx.stroke();

    if (stage.label === "Clip") {
      const clipW = Math.max(Math.abs(derived.clip[3]), 0.2);
      const topLeft = toStageCanvas([-clipW, clipW]);
      const bottomRight = toStageCanvas([clipW, -clipW]);
      ctx.strokeStyle = "rgba(248, 179, 125, 0.9)";
      ctx.strokeRect(
        topLeft[0],
        topLeft[1],
        bottomRight[0] - topLeft[0],
        bottomRight[1] - topLeft[1]
      );
    }

    if (stage.label === "NDC") {
      const topLeft = toStageCanvas([-1, 1]);
      const bottomRight = toStageCanvas([1, -1]);
      ctx.strokeStyle = "rgba(115, 221, 213, 0.9)";
      ctx.strokeRect(
        topLeft[0],
        topLeft[1],
        bottomRight[0] - topLeft[0],
        bottomRight[1] - topLeft[1]
      );
    }

    const center = toStageCanvas([0, 0]);
    const point = toStageCanvas(stageValue);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.26)";
    ctx.lineWidth = Math.max(1.3, width * 0.0024);
    ctx.beginPath();
    ctx.moveTo(center[0], center[1]);
    ctx.lineTo(point[0], point[1]);
    ctx.stroke();

    ctx.fillStyle = stage.color;
    ctx.beginPath();
    ctx.arc(point[0], point[1], Math.max(4.5, width * 0.0065), 0, TAU);
    ctx.fill();
  }
}

function setupSpacesCodeLab() {
  setupCodeLab({
    prefix: "spaces-code",
    schema: [
      { name: "object", type: "vec3" },
      { name: "model_translate", type: "vec3" },
      { name: "model_rotate_y", type: "number" },
      { name: "fov", type: "number" },
    ],
    defaults: {
      object: vec3(0.88, 0.44, 1.08),
      model_translate: vec3(1.2, -0.18, -0.7),
      model_rotate_y: 32,
      fov: 52,
    },
    readoutIds: {
      object: "spaces-code-readout-object",
      world: "spaces-code-readout-world",
      view: "spaces-code-readout-view",
      clip: "spaces-code-readout-clip",
      ndc: "spaces-code-readout-ndc",
      pixel: "spaces-code-readout-pixel",
    },
    evaluate: evaluateSpacesCodeLabBindings,
    updateUi: updateSpacesCodeLabUi,
    getStatusMessage(parsed, derived) {
      return `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}. Clip space still carries w = ${formatNumber(derived.clip[3], 2)} until the divide produces NDC.`;
    },
    draw: drawSpacesCodeLab,
    levels: [
      {
        id: "guided", label: "Guided",
        source: "# Change fov to see the projection change\nobject = vec3(0.88, 0.44, 1.08)\nmodel_translate = vec3(1.20, -0.18, -0.70)\nmodel_rotate_y = 32\nfov = 52",
        instructions: "Change model_rotate_y to spin the object in world space. Widen fov to see the clip and NDC values shift.",
      },
      {
        id: "challenge", label: "Challenge",
        source: "# Goal: get the pixel near the viewport center (320, 180)\nobject = vec3(0.88, 0.44, 1.08)\nmodel_translate = vec3(1.20, -0.18, -0.70)\nmodel_rotate_y = 32\nfov = 52",
        instructions: "Adjust model_translate and model_rotate_y so the final pixel lands near (320, 180) in the 640x360 viewport.",
        target: { match(derived) { return Math.abs(derived.pixel[0] - 320) < 30 && Math.abs(derived.pixel[1] - 180) < 30; } },
      },
      {
        id: "explore", label: "Explore",
        source: "object = vec3(0.88, 0.44, 1.08)\nmodel_translate = vec3(1.20, -0.18, -0.70)\nmodel_rotate_y = 32\nfov = 52",
        instructions: "Try expressions like model_rotate_y = 45 + 30 or fov = 90 - 20.",
      },
    ],
  });
}


function initialize() {
  initializePage({
    canvasSetups: [
      ["space-object-canvas", setupSpaceObjectDemo],
      ["space-world-canvas", setupSpaceWorldDemo],
      ["space-clip-canvas", setupSpaceClipDemo],
      ["space-contract-canvas", setupSpaceContractDemo],
      ["game-spaces-canvas", setupGameSpacesStoryDemo],
      ["space-attachment-use-canvas", setupSpaceAttachmentUseDemo],
      ["space-world-use-canvas", setupSpaceWorldUseDemo],
      ["world-space-ai-canvas", setupWorldSpaceAiDemo],
      ["tangent-space-intro-canvas", setupTangentSpaceIntroDemo],
      ["space-view-use-canvas", setupSpaceViewUseDemo],
      ["space-screen-use-canvas", setupSpaceScreenUseDemo],
      ["camera-frame-canvas", setupCameraFrameStoryDemo],
      ["worked-example-canvas", setupWorkedExampleStoryDemo],
      ["space-map-canvas", setupSpaceMapStoryDemo],
      ["clip-story-canvas", setupClipStoryDemo],
      ["space-probe-canvas", setupSpaceProbeDemo],
      ["spaces-code-canvas", setupSpacesCodeLab]
    ],
    controls: [...Object.values(spaceControls), ...Object.values(spaceProbeControls)],
    extraSetup: [],
  });
}

initialize();
