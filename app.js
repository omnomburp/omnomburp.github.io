const pageModules = [
  ["home-page", "./app-home.js"],
  ["chapter-vectors", "./app-vectors.js"],
  ["chapter-spaces", "./app-spaces.js"],
  ["chapter-normals", "./app-normals.js"],
  ["chapter-shaders", "./app-shaders.js"],
  ["chapter-rendering", "./app-rendering.js"],
  ["chapter-cameras", "./app-cameras.js"],
  ["chapter-textures", "./app-textures.js"],
  ["chapter-materials", "./app-materials.js"],
  ["chapter-shadows", "./app-shadows.js"],
  ["chapter-raytracing", "./app-raytracing.js"],
  ["chapter-color", "./app-color.js"],
  ["chapter-transparency", "./app-transparency.js"],
  ["chapter-pbr", "./app-pbr.js"],
  ["chapter-animation", "./app-animation.js"],
  ["chapter-acceleration", "./app-acceleration.js"],
];

async function bootstrap() {
  const body = document.body;
  if (!body) {
    return;
  }

  const entry = pageModules.find(([className]) => body.classList.contains(className));
  if (!entry) {
    return;
  }

  try {
    const module = await import(entry[1]);
    if (typeof module.initialize === "function") {
      module.initialize();
    }
  } catch (error) {
    console.error(`Failed to load page module ${entry[1]}.`, error);
  }
}

bootstrap();
