function setupHeroDemo() {
  const canvas = document.getElementById("hero-canvas");
  const gl = getGlContext(canvas);
  if (!gl) {
    return;
  }

  const meshProgram = createProgram(gl, litVertexSource, litFragmentSource);
  const lineProgram = createProgram(gl, lineVertexSource, lineFragmentSource);
  const sphere = createSphereData(1.06, 24, 28);
  const orbits = createOrbitLines(1.8, 1.38, 80);
  const axes = createWorldAxes(1.9);

  const sphereBuffers = {
    position: createArrayBuffer(gl, sphere.positions),
    normal: createArrayBuffer(gl, sphere.normals),
    index: createIndexBuffer(gl, sphere.indices),
    count: sphere.indices.length,
  };

  const orbitBuffers = {
    position: createArrayBuffer(gl, orbits.positions),
    color: createArrayBuffer(gl, orbits.colors),
    count: orbits.positions.length / 3,
  };

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
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const projection = mat4Perspective(degreesToRadians(44), aspect, 0.1, 20);
      const cameraAngle = prefersReducedMotion ? 0.85 : time * 0.18;
      const camera = [
        Math.cos(cameraAngle) * 4.6,
        1.75 + Math.sin(cameraAngle * 0.6) * 0.3,
        Math.sin(cameraAngle) * 4.6,
      ];
      const view = mat4LookAt(camera, [0, 0, 0], [0, 1, 0]);

      const rotationY = prefersReducedMotion ? 0.65 : time * 0.55;
      const rotationX = prefersReducedMotion ? -0.28 : Math.sin(time * 0.42) * 0.18 - 0.3;
      const model = mat4Multiply(mat4RotationY(rotationY), mat4RotationX(rotationX));

      const lineMatrix = mat4Multiply(projection, view);

      gl.useProgram(lineProgram);
      gl.uniformMatrix4fv(lineLocations.matrix, false, lineMatrix);
      bindAttribute(gl, orbitBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, orbitBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, orbitBuffers.count);

      bindAttribute(gl, axisBuffers.position, lineLocations.position, 3);
      bindAttribute(gl, axisBuffers.color, lineLocations.color, 3);
      gl.drawArrays(gl.LINES, 0, axisBuffers.count);

      gl.useProgram(meshProgram);
      gl.uniformMatrix4fv(meshLocations.model, false, model);
      gl.uniformMatrix4fv(meshLocations.view, false, view);
      gl.uniformMatrix4fv(meshLocations.projection, false, projection);
      gl.uniformMatrix3fv(meshLocations.normalMatrix, false, upperLeftMat3(model));
      gl.uniform3fv(meshLocations.lightDirection, normalize3([0.7, 1.0, 0.4]));
      gl.uniform3fv(meshLocations.baseColor, new Float32Array([0.36, 0.82, 0.76]));
      gl.uniform3fv(meshLocations.accentColor, new Float32Array([0.98, 0.72, 0.35]));
      gl.uniform3fv(meshLocations.cameraPosition, new Float32Array(camera));
      bindAttribute(gl, sphereBuffers.position, meshLocations.position, 3);
      bindAttribute(gl, sphereBuffers.normal, meshLocations.normal, 3);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffers.index);
      gl.drawElements(gl.TRIANGLES, sphereBuffers.count, gl.UNSIGNED_SHORT, 0);
    },
  });
}


function initialize() {
  initializePage({
    canvasSetups: [
      ["hero-canvas", setupHeroDemo]
    ],
    controls: [],
    extraSetup: [],
  });
}

initialize();
