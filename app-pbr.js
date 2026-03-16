const pbrControls = getElementsById({
  roughness: "pbr-roughness",
  metalness: "pbr-metalness",
  environment: "pbr-environment"
});

const pbrCodeControls = getElementsById({
  roughness: "pbr-code-roughness",
  metalness: "pbr-code-metalness",
  diffuse: "pbr-code-diffuse",
  specular: "pbr-code-specular",
  fresnel: "pbr-code-fresnel",
  env: "pbr-code-env"
});

function setupPbrDemo() {
  const canvas = document.getElementById("pbr-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) {
    return;
  }

  const readouts = {
    f0: document.getElementById("pbr-f0-readout"),
    lobe: document.getElementById("pbr-lobe-readout"),
    response: document.getElementById("pbr-response-readout"),
    environment: document.getElementById("pbr-environment-readout"),
  };
  const offscreen = document.createElement("canvas");
  const offscreenSize = 180;
  offscreen.width = offscreenSize;
  offscreen.height = offscreenSize;
  const offscreenCtx = offscreen.getContext("2d");
  if (!offscreenCtx) {
    return;
  }

  const imageData = offscreenCtx.createImageData(offscreenSize, offscreenSize);
  const pixels = imageData.data;
  const state = {
    key: "",
  };

  function sampleEnvironment(direction, rotation) {
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);
    const x = direction[0] * cosR - direction[2] * sinR;
    const y = direction[1];
    const z = direction[0] * sinR + direction[2] * cosR;
    const skyT = clamp(y * 0.5 + 0.5, 0, 1);
    const sky = mix3([0.94, 0.67, 0.38], [0.2, 0.44, 0.78], skyT);
    const ground = mix3([0.17, 0.18, 0.22], [0.34, 0.27, 0.2], clamp(-y * 0.8, 0, 1));
    const blend = clamp(y * 2 + 0.5, 0, 1);
    const sunDirection = normalize3([0.62, 0.48, 0.62]);
    const sun = Math.pow(Math.max(dot3([x, y, z], sunDirection), 0), 36);
    const base = mix3(ground, sky, blend);
    return add3(base, [sun * 0.65, sun * 0.48, sun * 0.22]);
  }

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const roughness = Number(pbrControls.roughness?.value || 38) / 100;
      const metalness = Number(pbrControls.metalness?.value || 24) / 100;
      const environmentRotation = (Number(pbrControls.environment?.value || 18) / 100) * TAU;
      const key = `${width}|${height}|${roughness.toFixed(3)}|${metalness.toFixed(3)}|${environmentRotation.toFixed(3)}`;
      if (state.key === key) {
        return;
      }
      state.key = key;

      const baseColor = [0.88, 0.45, 0.18];
      const f0 = mix3([0.04, 0.04, 0.04], baseColor, metalness);
      const view = [0, 0, 1];
      const lightDirection = normalize3([
        Math.cos(environmentRotation * 0.75) * 0.58,
        0.62,
        0.5 + Math.sin(environmentRotation * 0.75) * 0.18,
      ]);

      const radius = offscreenSize * 0.46;
      const center = offscreenSize * 0.5;
      const specularExponent = lerp(150, 8, Math.sqrt(roughness));
      const highlightScale = lerp(1.42, 0.32, roughness);

      for (let y = 0; y < offscreenSize; y += 1) {
        for (let x = 0; x < offscreenSize; x += 1) {
          const dx = (x + 0.5 - center) / radius;
          const dy = (center - (y + 0.5)) / radius;
          const r2 = dx * dx + dy * dy;
          const pixelIndex = (y * offscreenSize + x) * 4;
          if (r2 > 1) {
            pixels[pixelIndex] = 0;
            pixels[pixelIndex + 1] = 0;
            pixels[pixelIndex + 2] = 0;
            pixels[pixelIndex + 3] = 0;
            continue;
          }

          const dz = Math.sqrt(1 - r2);
          const normal = [dx, dy, dz];
          const halfVector = normalize3(add3(lightDirection, view));
          const noL = Math.max(dot3(normal, lightDirection), 0);
          const noV = Math.max(dot3(normal, view), 0);
          const noH = Math.max(dot3(normal, halfVector), 0);
          const fresnel = Math.pow(1 - noV, 5);
          const fresnelColor = mix3(f0, [1, 1, 1], fresnel);
          const reflection = reflect3([-view[0], -view[1], -view[2]], normal);
          const envSample = sampleEnvironment(reflection, environmentRotation);
          const ambientSample = sampleEnvironment(normal, environmentRotation);
          const diffuse = scale3(baseColor, (1 - metalness) * (0.2 + noL * 0.82));
          const ambient = scale3(multiply3(ambientSample, mix3(baseColor, [0.9, 0.92, 0.96], 0.2)), (1 - metalness) * 0.42 + 0.08);
          const specular = scale3(
            multiply3(mix3(envSample, fresnelColor, 0.45), fresnelColor),
            Math.pow(noH, specularExponent) * highlightScale + fresnel * lerp(0.18, 0.42, 1 - roughness)
          );
          const combined = add3(add3(diffuse, ambient), specular);
          const mapped = [
            combined[0] / (1 + combined[0]),
            combined[1] / (1 + combined[1]),
            combined[2] / (1 + combined[2]),
          ];
          const display = [
            Math.pow(clamp(mapped[0], 0, 1), 1 / 2.2),
            Math.pow(clamp(mapped[1], 0, 1), 1 / 2.2),
            Math.pow(clamp(mapped[2], 0, 1), 1 / 2.2),
          ];

          pixels[pixelIndex] = Math.round(display[0] * 255);
          pixels[pixelIndex + 1] = Math.round(display[1] * 255);
          pixels[pixelIndex + 2] = Math.round(display[2] * 255);
          pixels[pixelIndex + 3] = 255;
        }
      }

      offscreenCtx.putImageData(imageData, 0, 0);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#123248");
      background.addColorStop(0.45, "#2b5a78");
      background.addColorStop(0.58, "#d49352");
      background.addColorStop(1, "#1e262e");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      const sunX = width * (0.74 + Math.cos(environmentRotation) * 0.08);
      const sunY = height * (0.2 - Math.sin(environmentRotation) * 0.03);
      const sunGradient = ctx.createRadialGradient(sunX, sunY, width * 0.02, sunX, sunY, width * 0.22);
      sunGradient.addColorStop(0, "rgba(255, 234, 179, 0.58)");
      sunGradient.addColorStop(1, "rgba(255, 211, 128, 0)");
      ctx.fillStyle = sunGradient;
      ctx.fillRect(0, 0, width, height);

      const sphereSize = Math.min(width * 0.42, height * 0.72);
      const sphereX = width * 0.11;
      const sphereY = height * 0.16;
      ctx.drawImage(offscreen, sphereX, sphereY, sphereSize, sphereSize);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = Math.max(1.6, width * 0.0032);
      ctx.beginPath();
      ctx.arc(sphereX + sphereSize * 0.5, sphereY + sphereSize * 0.5, sphereSize * 0.5, 0, TAU);
      ctx.stroke();

      const infoX = sphereX + sphereSize + width * 0.08;
      const infoY = height * 0.18;
      const cardWidth = width - infoX - width * 0.08;
      const rowGap = Math.max(16, height * 0.03);
      const swatchHeight = Math.max(50, height * 0.12);
      const cards = [
        {
          title: "Roughness reshapes the lobe",
          lines: ["Low roughness keeps a tight highlight.", "Higher roughness spreads energy wider."],
          color: "rgba(255, 244, 197, 0.18)",
          stroke: "rgba(255, 244, 197, 0.58)",
        },
        {
          title: "Metalness changes the reflective tint",
          lines: ["Dielectrics keep a small neutral F0.", "Metals push more base color into reflection."],
          color: "rgba(247, 160, 74, 0.16)",
          stroke: "rgba(247, 160, 74, 0.58)",
        },
        {
          title: "Environment still matters",
          lines: ["Sky and horizon feed the reflection.", "Rotating the world changes the material."],
          color: "rgba(115, 221, 213, 0.16)",
          stroke: "rgba(115, 221, 213, 0.52)",
        },
      ];

      ctx.font = `${Math.max(17, width * 0.024)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.fillStyle = "rgba(247, 250, 252, 0.96)";
      ctx.fillText("Material response", infoX, infoY - 12);

      for (let index = 0; index < cards.length; index += 1) {
        const cardY = infoY + index * (swatchHeight + rowGap);
        const card = cards[index];
        ctx.fillStyle = card.color;
        ctx.strokeStyle = card.stroke;
        ctx.lineWidth = 1.4;
        ctx.fillRect(infoX, cardY, cardWidth, swatchHeight);
        ctx.strokeRect(infoX, cardY, cardWidth, swatchHeight);
        ctx.fillStyle = "rgba(247, 250, 252, 0.96)";
        ctx.font = `${Math.max(14, width * 0.019)}px "Avenir Next", "Segoe UI", sans-serif`;
        ctx.fillText(card.title, infoX + 14, cardY + 20);
        ctx.fillStyle = "rgba(225, 236, 242, 0.84)";
        ctx.font = `${Math.max(11, width * 0.014)}px "Avenir Next", "Segoe UI", sans-serif`;
        drawTextLines(ctx, card.lines, infoX + 14, cardY + 30, 16);
      }

      if (readouts.f0) {
        readouts.f0.textContent = formatVector(f0, 2);
      }
      if (readouts.lobe) {
        readouts.lobe.textContent = roughness < 0.22 ? "tight" : roughness < 0.58 ? "medium" : "broad";
      }
      if (readouts.response) {
        readouts.response.textContent =
          metalness < 0.33 ? "dielectric leaning" : metalness < 0.66 ? "hybrid surface" : "metal dominant";
      }
      if (readouts.environment) {
        const normalizedRotation = ((environmentRotation / TAU) % 1 + 1) % 1;
        readouts.environment.textContent =
          normalizedRotation < 0.34 ? "warm horizon" : normalizedRotation < 0.67 ? "blue sky" : "ground spill";
      }
    },
  });
}


function setupFresnelDemo() {
  const canvas = document.getElementById("fresnel-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) return;

  const offscreen = document.createElement("canvas");
  const offSize = 140;
  offscreen.width = offSize;
  offscreen.height = offSize;
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;
  const imageData = offCtx.createImageData(offSize, offSize);
  const pixels = imageData.data;
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

      const f0 = 0.04;
      const view = [0, 0, 1];
      const radius = offSize * 0.46;
      const center = offSize * 0.5;

      for (let y = 0; y < offSize; y++) {
        for (let x = 0; x < offSize; x++) {
          const dx = (x + 0.5 - center) / radius;
          const dy = (center - (y + 0.5)) / radius;
          const r2 = dx * dx + dy * dy;
          const idx = (y * offSize + x) * 4;
          if (r2 > 1) { pixels[idx] = pixels[idx+1] = pixels[idx+2] = 0; pixels[idx+3] = 0; continue; }
          const dz = Math.sqrt(1 - r2);
          const cosTheta = dz;
          const fresnel = f0 + (1 - f0) * Math.pow(1 - cosTheta, 5);
          const diffuse = Math.max(dz, 0) * 0.3;
          const val = diffuse * (1 - fresnel) + fresnel;
          const mapped = Math.pow(clamp(val / (1 + val), 0, 1), 1 / 2.2);
          pixels[idx] = Math.round(mapped * 220 + 35);
          pixels[idx+1] = Math.round(mapped * 230 + 25);
          pixels[idx+2] = Math.round(mapped * 250 + 5);
          pixels[idx+3] = 255;
        }
      }
      offCtx.putImageData(imageData, 0, 0);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#123248");
      bgGrad.addColorStop(1, "#1e262e");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const sphereSize = Math.min(w * 0.38, h * 0.72);
      const sphereX = w * 0.06;
      const sphereY = (h - sphereSize) * 0.5;
      ctx.drawImage(offscreen, sphereX, sphereY, sphereSize, sphereSize);
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = Math.max(1.6, w * 0.003);
      ctx.beginPath();
      ctx.arc(sphereX + sphereSize / 2, sphereY + sphereSize / 2, sphereSize / 2, 0, TAU);
      ctx.stroke();

      ctx.fillStyle = "rgba(239,245,247,0.92)";
      ctx.font = `${Math.max(13, w * 0.02)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("Center: low F (head-on)", sphereX, sphereY - 8);
      ctx.fillText("Rim: high F (grazing)", sphereX, sphereY + sphereSize + 18);

      const graphX = sphereX + sphereSize + w * 0.08;
      const graphY = h * 0.15;
      const graphW = w - graphX - w * 0.06;
      const graphH = h * 0.7;

      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.strokeRect(graphX, graphY, graphW, graphH);

      ctx.fillStyle = "rgba(200,220,230,0.7)";
      ctx.font = `${Math.max(11, w * 0.016)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("F", graphX - 14, graphY - 4);
      ctx.fillText("1.0", graphX - 26, graphY + 6);
      ctx.fillText("F0", graphX - 22, graphY + graphH + 4);
      ctx.fillText("cos\u03B8", graphX + graphW + 4, graphY + graphH + 4);
      ctx.fillText("0", graphX - 8, graphY + graphH + 4);
      ctx.fillText("1", graphX + graphW - 4, graphY + graphH + 16);

      ctx.strokeStyle = "rgba(115,221,213,0.9)";
      ctx.lineWidth = Math.max(2, w * 0.004);
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const cosT = i / 100;
        const f = f0 + (1 - f0) * Math.pow(1 - cosT, 5);
        const px = graphX + cosT * graphW;
        const py = graphY + (1 - f) * graphH;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.fillStyle = "rgba(255,244,197,0.85)";
      ctx.font = `${Math.max(11, w * 0.016)}px "SFMono-Regular","Menlo",monospace`;
      ctx.fillText("F = F0 + (1-F0)(1-cos\u03B8)\u2075", graphX + 8, graphY + 20);
      ctx.fillText(`F0 = ${f0}  (dielectric)`, graphX + 8, graphY + 36);
    },
  });
}

function setupRoughnessLobeDemo() {
  const canvas = document.getElementById("roughness-lobe-canvas");
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
      const roughness = 0.5 + Math.sin(t * 0.4) * 0.45;
      const key = `${w}|${h}|${roughness.toFixed(2)}`;
      if (state.key === key) return;
      state.key = key;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#123248");
      bgGrad.addColorStop(1, "#1e262e");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const surfaceY = h * 0.72;
      const reflectX = w * 0.5;
      const normalLen = h * 0.35;

      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = Math.max(2, w * 0.003);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, surfaceY);
      ctx.lineTo(w * 0.9, surfaceY);
      ctx.stroke();

      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(reflectX, surfaceY);
      ctx.lineTo(reflectX, surfaceY - normalLen - 20);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(200,220,230,0.6)";
      ctx.font = `${Math.max(11, w * 0.016)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("N", reflectX + 6, surfaceY - normalLen - 10);
      ctx.fillText("surface", w * 0.85, surfaceY + 18);

      const inAngle = -0.6;
      const inLen = normalLen * 0.8;
      ctx.strokeStyle = "rgba(255,223,132,0.8)";
      ctx.lineWidth = Math.max(2, w * 0.003);
      const inEndX = reflectX + Math.sin(inAngle) * inLen;
      const inEndY = surfaceY - Math.cos(inAngle) * inLen;
      drawArrow2d(ctx, [inEndX, inEndY], [reflectX, surfaceY], "rgba(255,223,132,0.8)", Math.max(2, w * 0.003));

      ctx.fillStyle = "rgba(255,223,132,0.7)";
      ctx.fillText("incoming", inEndX - 30, inEndY - 8);

      const exponent = lerp(80, 4, Math.sqrt(roughness));
      const lobePoints = [];
      for (let i = -60; i <= 60; i++) {
        const angle = (i / 60) * (Math.PI * 0.48);
        const intensity = Math.pow(Math.max(Math.cos(angle), 0), exponent);
        const lobeLen = normalLen * 0.9 * intensity;
        const mirrorAngle = 0.6;
        const totalAngle = mirrorAngle + angle;
        const px = reflectX + Math.sin(totalAngle) * lobeLen;
        const py = surfaceY - Math.cos(totalAngle) * lobeLen;
        lobePoints.push([px, py]);
      }

      ctx.fillStyle = "rgba(115,221,213,0.15)";
      ctx.strokeStyle = "rgba(115,221,213,0.8)";
      ctx.lineWidth = Math.max(2, w * 0.003);
      ctx.beginPath();
      ctx.moveTo(reflectX, surfaceY);
      for (const p of lobePoints) ctx.lineTo(p[0], p[1]);
      ctx.lineTo(reflectX, surfaceY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(239,245,247,0.92)";
      ctx.font = `${Math.max(15, w * 0.022)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText(`Roughness: ${roughness.toFixed(2)}`, w * 0.06, 28);
      ctx.fillStyle = "rgba(200,220,230,0.7)";
      ctx.font = `${Math.max(12, w * 0.017)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText(roughness < 0.3 ? "Tight lobe: sharp highlight" : roughness < 0.7 ? "Medium lobe: moderate spread" : "Wide lobe: broad, soft highlight", w * 0.06, 50);
    },
  });
}

function setupMetalVsDielectricDemo() {
  const canvas = document.getElementById("metal-vs-dielectric-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) return;

  const offscreen = document.createElement("canvas");
  const offSize = 120;
  offscreen.width = offSize;
  offscreen.height = offSize;
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;
  const imageData = offCtx.createImageData(offSize, offSize);
  const pixels = imageData.data;
  const state = { key: "" };

  function renderSphere(baseColor, metalness) {
    const f0 = mix3([0.04, 0.04, 0.04], baseColor, metalness);
    const lightDir = normalize3([0.5, 0.6, 0.8]);
    const view = [0, 0, 1];
    const radius = offSize * 0.44;
    const center = offSize * 0.5;

    for (let y = 0; y < offSize; y++) {
      for (let x = 0; x < offSize; x++) {
        const dx = (x + 0.5 - center) / radius;
        const dy = (center - (y + 0.5)) / radius;
        const r2 = dx * dx + dy * dy;
        const idx = (y * offSize + x) * 4;
        if (r2 > 1) { pixels[idx] = pixels[idx+1] = pixels[idx+2] = 0; pixels[idx+3] = 0; continue; }
        const dz = Math.sqrt(1 - r2);
        const n = [dx, dy, dz];
        const halfV = normalize3(add3(lightDir, view));
        const noL = Math.max(dot3(n, lightDir), 0);
        const noV = Math.max(dot3(n, view), 0);
        const noH = Math.max(dot3(n, halfV), 0);
        const fresnel = Math.pow(1 - noV, 5);
        const fColor = mix3(f0, [1, 1, 1], fresnel);
        const diff = scale3(baseColor, (1 - metalness) * (0.15 + noL * 0.85));
        const spec = scale3(fColor, Math.pow(noH, 60) * 1.2 + fresnel * 0.3);
        const combined = add3(diff, spec);
        const mapped = [
          Math.pow(clamp(combined[0] / (1 + combined[0]), 0, 1), 1/2.2),
          Math.pow(clamp(combined[1] / (1 + combined[1]), 0, 1), 1/2.2),
          Math.pow(clamp(combined[2] / (1 + combined[2]), 0, 1), 1/2.2),
        ];
        pixels[idx] = Math.round(mapped[0] * 255);
        pixels[idx+1] = Math.round(mapped[1] * 255);
        pixels[idx+2] = Math.round(mapped[2] * 255);
        pixels[idx+3] = 255;
      }
    }
    offCtx.putImageData(imageData, 0, 0);
  }

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
      bgGrad.addColorStop(0, "#123248");
      bgGrad.addColorStop(1, "#1e262e");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const baseColor = [0.88, 0.72, 0.18];
      const sphereSize = Math.min(w * 0.32, h * 0.65);
      const gap = w * 0.1;
      const totalW = sphereSize * 2 + gap;
      const startX = (w - totalW) / 2;
      const startY = (h - sphereSize) * 0.5 + 10;

      renderSphere(baseColor, 0.0);
      ctx.drawImage(offscreen, startX, startY, sphereSize, sphereSize);
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(startX + sphereSize / 2, startY + sphereSize / 2, sphereSize / 2, 0, TAU);
      ctx.stroke();

      renderSphere(baseColor, 1.0);
      ctx.drawImage(offscreen, startX + sphereSize + gap, startY, sphereSize, sphereSize);
      ctx.beginPath();
      ctx.arc(startX + sphereSize * 1.5 + gap, startY + sphereSize / 2, sphereSize / 2, 0, TAU);
      ctx.stroke();

      ctx.fillStyle = "rgba(239,245,247,0.92)";
      ctx.font = `${Math.max(14, w * 0.022)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("Dielectric (plastic)", startX, startY - 10);
      ctx.fillText("Metal (gold)", startX + sphereSize + gap, startY - 10);

      ctx.fillStyle = "rgba(200,220,230,0.75)";
      ctx.font = `${Math.max(11, w * 0.016)}px "SFMono-Regular","Menlo",monospace`;
      ctx.fillText("F0 = 0.04 (neutral)", startX, startY + sphereSize + 18);
      ctx.fillText("White specular, colored diffuse", startX, startY + sphereSize + 34);
      ctx.fillText("F0 = baseColor", startX + sphereSize + gap, startY + sphereSize + 18);
      ctx.fillText("Tinted specular, no diffuse", startX + sphereSize + gap, startY + sphereSize + 34);
    },
  });
}

function setupEnergyConservationDemo() {
  const canvas = document.getElementById("energy-conservation-canvas");
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
      bgGrad.addColorStop(0, "#123248");
      bgGrad.addColorStop(1, "#1e262e");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const metalness = 0.5 + Math.sin(t * 0.3) * 0.5;
      const angles = [0, 15, 30, 45, 60, 75, 85];
      const barW = Math.min(w / (angles.length * 2 + 2), 40);
      const maxBarH = h * 0.55;
      const startX = (w - angles.length * barW * 2.2) / 2;
      const baseY = h * 0.8;

      ctx.fillStyle = "rgba(239,245,247,0.92)";
      ctx.font = `${Math.max(14, w * 0.022)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText(`Energy conservation (metalness: ${metalness.toFixed(2)})`, 20, 28);

      ctx.fillStyle = "rgba(200,220,230,0.6)";
      ctx.font = `${Math.max(10, w * 0.014)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("diffuse + specular \u2264 1.0 at every angle", 20, 48);

      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX - 10, baseY);
      ctx.lineTo(startX + angles.length * barW * 2.2, baseY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(startX - 10, baseY - maxBarH);
      ctx.lineTo(startX + angles.length * barW * 2.2, baseY - maxBarH);
      ctx.stroke();

      ctx.fillStyle = "rgba(200,220,230,0.5)";
      ctx.font = `${Math.max(9, w * 0.013)}px "SFMono-Regular","Menlo",monospace`;
      ctx.fillText("1.0", startX - 30, baseY - maxBarH + 4);
      ctx.fillText("0.0", startX - 30, baseY + 4);

      for (let i = 0; i < angles.length; i++) {
        const cosTheta = Math.cos(angles[i] * Math.PI / 180);
        const f0Val = lerp(0.04, 0.8, metalness);
        const fresnel = f0Val + (1 - f0Val) * Math.pow(1 - cosTheta, 5);
        const specular = clamp(fresnel, 0, 1);
        const diffuse = clamp((1 - metalness) * (1 - specular), 0, 1 - specular);
        const x = startX + i * barW * 2.2;

        ctx.fillStyle = "rgba(115,221,213,0.8)";
        ctx.fillRect(x, baseY - diffuse * maxBarH, barW * 0.9, diffuse * maxBarH);
        ctx.fillStyle = "rgba(247,160,74,0.85)";
        ctx.fillRect(x, baseY - (diffuse + specular) * maxBarH, barW * 0.9, specular * maxBarH);

        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x, baseY - (diffuse + specular) * maxBarH, barW * 0.9, (diffuse + specular) * maxBarH);

        ctx.fillStyle = "rgba(200,220,230,0.7)";
        ctx.font = `${Math.max(9, w * 0.012)}px "SFMono-Regular","Menlo",monospace`;
        ctx.fillText(`${angles[i]}\u00B0`, x + 2, baseY + 14);
      }

      const legendX = w * 0.7;
      const legendY = h * 0.12;
      ctx.fillStyle = "rgba(115,221,213,0.8)";
      ctx.fillRect(legendX, legendY, 14, 14);
      ctx.fillStyle = "rgba(247,160,74,0.85)";
      ctx.fillRect(legendX, legendY + 20, 14, 14);
      ctx.fillStyle = "rgba(200,220,230,0.85)";
      ctx.font = `${Math.max(11, w * 0.016)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("Diffuse", legendX + 20, legendY + 12);
      ctx.fillText("Specular", legendX + 20, legendY + 32);

      ctx.fillStyle = "rgba(200,220,230,0.5)";
      ctx.font = `${Math.max(10, w * 0.014)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("View angle \u03B8", startX + angles.length * barW * 1.1 - 40, baseY + 28);
    },
  });
}

function setupPbrCodeDemo() {
  const canvas = document.getElementById("pbr-code-canvas");
  const ctx = get2dContext(canvas);
  if (!ctx) return;

  const offscreen = document.createElement("canvas");
  const offSize = 140;
  offscreen.width = offSize;
  offscreen.height = offSize;
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;
  const imageData = offCtx.createImageData(offSize, offSize);
  const pixels = imageData.data;
  const state = { key: "" };

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      const w = canvas.width;
      const h = canvas.height;
      const roughness = Number(pbrCodeControls.roughness?.value || 38) / 100;
      const metalness = Number(pbrCodeControls.metalness?.value || 50) / 100;
      const showDiffuse = Boolean(pbrCodeControls.diffuse?.checked);
      const showSpecular = Boolean(pbrCodeControls.specular?.checked);
      const showFresnel = Boolean(pbrCodeControls.fresnel?.checked);
      const showEnv = Boolean(pbrCodeControls.env?.checked);
      const key = `${w}|${h}|${roughness.toFixed(2)}|${metalness.toFixed(2)}|${showDiffuse}|${showSpecular}|${showFresnel}|${showEnv}`;
      if (state.key === key) return;
      state.key = key;

      const baseColor = [0.88, 0.45, 0.18];
      const f0 = mix3([0.04, 0.04, 0.04], baseColor, metalness);
      const lightDir = normalize3([0.5, 0.6, 0.8]);
      const view = [0, 0, 1];
      const specExp = lerp(120, 6, Math.sqrt(roughness));
      const radius = offSize * 0.44;
      const center = offSize * 0.5;

      for (let y = 0; y < offSize; y++) {
        for (let x = 0; x < offSize; x++) {
          const dx = (x + 0.5 - center) / radius;
          const dy = (center - (y + 0.5)) / radius;
          const r2 = dx * dx + dy * dy;
          const idx = (y * offSize + x) * 4;
          if (r2 > 1) { pixels[idx] = pixels[idx+1] = pixels[idx+2] = 0; pixels[idx+3] = 0; continue; }
          const dz = Math.sqrt(1 - r2);
          const n = [dx, dy, dz];
          const halfV = normalize3(add3(lightDir, view));
          const noL = Math.max(dot3(n, lightDir), 0);
          const noV = Math.max(dot3(n, view), 0);
          const noH = Math.max(dot3(n, halfV), 0);
          const fresnelVal = Math.pow(1 - noV, 5);
          const fColor = showFresnel ? mix3(f0, [1, 1, 1], fresnelVal) : f0;
          let color = [0, 0, 0];
          if (showDiffuse) color = add3(color, scale3(baseColor, (1 - metalness) * (0.15 + noL * 0.7)));
          if (showSpecular) color = add3(color, scale3(fColor, Math.pow(noH, specExp) * lerp(1.2, 0.3, roughness)));
          if (showEnv) {
            const envVal = 0.12 + noV * 0.12;
            color = add3(color, scale3(mix3([0.2, 0.4, 0.7], baseColor, metalness * 0.5), envVal));
          }
          const mapped = [
            Math.pow(clamp(color[0] / (1 + color[0]), 0, 1), 1/2.2),
            Math.pow(clamp(color[1] / (1 + color[1]), 0, 1), 1/2.2),
            Math.pow(clamp(color[2] / (1 + color[2]), 0, 1), 1/2.2),
          ];
          pixels[idx] = Math.round(mapped[0] * 255);
          pixels[idx+1] = Math.round(mapped[1] * 255);
          pixels[idx+2] = Math.round(mapped[2] * 255);
          pixels[idx+3] = 255;
        }
      }
      offCtx.putImageData(imageData, 0, 0);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#123248");
      bgGrad.addColorStop(1, "#1e262e");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const sphereSize = Math.min(w * 0.5, h * 0.8);
      const sphereX = (w - sphereSize) / 2;
      const sphereY = (h - sphereSize) / 2;
      ctx.drawImage(offscreen, sphereX, sphereY, sphereSize, sphereSize);
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sphereX + sphereSize / 2, sphereY + sphereSize / 2, sphereSize / 2, 0, TAU);
      ctx.stroke();

      const labels = [];
      if (showDiffuse) labels.push("diffuse");
      if (showSpecular) labels.push("specular");
      if (showFresnel) labels.push("fresnel");
      if (showEnv) labels.push("environment");
      ctx.fillStyle = "rgba(239,245,247,0.85)";
      ctx.font = `${Math.max(12, w * 0.02)}px "Avenir Next","Segoe UI",sans-serif`;
      ctx.fillText("Active: " + (labels.length > 0 ? labels.join(" + ") : "none"), 14, 22);
    },
  });
}

/* ── Chapter 14 new demos ─────────────────────────────────────────── */


function initialize() {
  initializePage({
    canvasSetups: [
      ["pbr-canvas", setupPbrDemo],
      ["fresnel-canvas", setupFresnelDemo],
      ["roughness-lobe-canvas", setupRoughnessLobeDemo],
      ["metal-vs-dielectric-canvas", setupMetalVsDielectricDemo],
      ["energy-conservation-canvas", setupEnergyConservationDemo],
      ["pbr-code-canvas", setupPbrCodeDemo]
    ],
    controls: [...Object.values(pbrControls), ...Object.values(pbrCodeControls)],
    extraSetup: [],
  });
}

initialize();
