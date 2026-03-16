"use strict";

const TAU = Math.PI * 2;
const demos = [];
const demoMap = new Map();

const motionQuery =
  typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };
let prefersReducedMotion = motionQuery.matches;
if (typeof motionQuery.addEventListener === "function") {
  motionQuery.addEventListener("change", (event) => {
    prefersReducedMotion = event.matches;
    markAllDemosDirty();
  });
} else if (typeof motionQuery.addListener === "function") {
  motionQuery.addListener((event) => {
    prefersReducedMotion = event.matches;
    markAllDemosDirty();
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function add2(a, b) {
  return [a[0] + b[0], a[1] + b[1]];
}

function subtract2(a, b) {
  return [a[0] - b[0], a[1] - b[1]];
}

function scale2(v, scalar) {
  return [v[0] * scalar, v[1] * scalar];
}

function scale2Components(v, sx, sy) {
  return [v[0] * sx, v[1] * sy];
}

function rotate2(v, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}

function dot2(a, b) {
  return a[0] * b[0] + a[1] * b[1];
}

function normalize2(v) {
  const length = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / length, v[1] / length];
}

function perpendicular2(v) {
  return [-v[1], v[0]];
}

function reflect2(direction, normal) {
  return subtract2(direction, scale2(normal, 2 * dot2(direction, normal)));
}

function formatNumber(value, digits = 2) {
  const rounded = Math.abs(value) < 10 ** -(digits + 1) ? 0 : value;
  return rounded.toFixed(digits);
}

function formatVector(values, digits = 2) {
  return `(${values.map((value) => formatNumber(value, digits)).join(", ")})`;
}

function rgbToCss(color) {
  return `rgb(${color
    .map((channel) => Math.round(clamp(channel, 0, 1) * 255))
    .join(", ")})`;
}

function cloneLessonDefaults(schema, defaults) {
  const values = {};
  for (const entry of schema) {
    const value = defaults[entry.name];
    values[entry.name] = Array.isArray(value) ? value.slice() : value;
  }
  return values;
}

function findLessonSchemaEntry(schema, name) {
  for (const entry of schema) {
    if (entry.name === name) {
      return entry;
    }
  }
  return null;
}

function lessonVectorSize(type) {
  if (type === "bool") {
    return 0;
  }
  if (type === "vec2") {
    return 2;
  }
  if (type === "vec3") {
    return 3;
  }
  if (type === "vec4") {
    return 4;
  }
  return 0;
}

function lessonComponentIndex(component, size) {
  if (component === "x" && size >= 1) {
    return 0;
  }
  if (component === "y" && size >= 2) {
    return 1;
  }
  if (component === "z" && size >= 3) {
    return 2;
  }
  if (component === "w" && size >= 4) {
    return 3;
  }
  return -1;
}

function stripLessonComment(line) {
  const commentIndex = line.indexOf("#");
  return commentIndex === -1 ? line : line.slice(0, commentIndex);
}


const EXPR_FUNCTIONS = [
  ["sin", 1, Math.sin],
  ["cos", 1, Math.cos],
  ["tan", 1, Math.tan],
  ["sqrt", 1, Math.sqrt],
  ["abs", 1, Math.abs],
  ["floor", 1, Math.floor],
  ["ceil", 1, Math.ceil],
  ["min", 2, Math.min],
  ["max", 2, Math.max],
  ["pow", 2, Math.pow],
  ["clamp", 3, function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }],
];

const EXPR_BUILTIN_NAMES = new Set([
  "vec2", "vec3", "vec4",
  "sin", "cos", "tan", "sqrt", "abs", "floor", "ceil",
  "min", "max", "pow", "clamp", "PI",
]);

function findExprFunction(name) {
  for (let i = 0; i < EXPR_FUNCTIONS.length; i += 1) {
    if (EXPR_FUNCTIONS[i][0] === name) return EXPR_FUNCTIONS[i];
  }
  return null;
}

function createExpressionParser() {
  const tokens = [];
  for (let i = 0; i < 64; i += 1) {
    tokens.push({ type: 0, value: 0, start: 0 });
  }
  return { tokens, count: 0, pos: 0, values: null };
}

function tokenizeLessonExpression(source, tokens) {
  let count = 0;
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source.charCodeAt(i);
    if (ch === 32 || ch === 9) { i += 1; continue; }
    if (count >= tokens.length) {
      tokens.push({ type: 0, value: 0, start: 0 });
    }
    const tok = tokens[count];
    tok.start = i;

    if (
      (ch >= 48 && ch <= 57) ||
      (ch === 46 && i + 1 < len && source.charCodeAt(i + 1) >= 48 && source.charCodeAt(i + 1) <= 57)
    ) {
      let j = i;
      while (j < len && source.charCodeAt(j) >= 48 && source.charCodeAt(j) <= 57) j += 1;
      if (j < len && source.charCodeAt(j) === 46) {
        j += 1;
        while (j < len && source.charCodeAt(j) >= 48 && source.charCodeAt(j) <= 57) j += 1;
      }
      tok.type = 0;
      tok.value = Number(source.slice(i, j));
      i = j;
      count += 1;
      continue;
    }

    if ((ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122) || ch === 95) {
      let j = i + 1;
      while (j < len) {
        const c = source.charCodeAt(j);
        if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 95) j += 1;
        else break;
      }
      const word = source.slice(i, j);
      if (word === "true" || word === "false") {
        tok.type = 8;
        tok.value = word === "true";
      } else {
        tok.type = 1;
        tok.value = word;
      }
      i = j;
      count += 1;
      continue;
    }

    if (ch === 43 || ch === 45 || ch === 42 || ch === 47) {
      tok.type = 2;
      tok.value = source[i];
      i += 1;
      count += 1;
      continue;
    }
    if (ch === 40) { tok.type = 3; tok.value = "("; i += 1; count += 1; continue; }
    if (ch === 41) { tok.type = 4; tok.value = ")"; i += 1; count += 1; continue; }
    if (ch === 44) { tok.type = 5; tok.value = ","; i += 1; count += 1; continue; }
    if (ch === 46) { tok.type = 6; tok.value = "."; i += 1; count += 1; continue; }

    throw new Error(`unexpected character '${source[i]}'`);
  }

  return count;
}

function exprPeek(parser) {
  return parser.pos < parser.count ? parser.tokens[parser.pos] : null;
}

function exprConsume(parser) {
  return parser.tokens[parser.pos++];
}

function exprExpect(parser, type, label) {
  const tok = exprPeek(parser);
  if (!tok || tok.type !== type) throw new Error(label || "unexpected token");
  return exprConsume(parser);
}

function evalExprArgList(parser) {
  const args = [];
  if (exprPeek(parser) && exprPeek(parser).type === 4) {
    exprConsume(parser);
    return args;
  }
  args.push(evalExprAdditive(parser));
  while (exprPeek(parser) && exprPeek(parser).type === 5) {
    exprConsume(parser);
    args.push(evalExprAdditive(parser));
  }
  exprExpect(parser, 4, "expected ')'");
  return args;
}

function evalExprPrimary(parser) {
  const tok = exprPeek(parser);
  if (!tok) throw new Error("unexpected end of expression");

  if (tok.type === 0) { exprConsume(parser); return tok.value; }
  if (tok.type === 8) { exprConsume(parser); return tok.value; }

  if (tok.type === 3) {
    exprConsume(parser);
    const val = evalExprAdditive(parser);
    exprExpect(parser, 4, "expected ')'");
    return val;
  }

  if (tok.type === 1) {
    const name = tok.value;
    exprConsume(parser);
    if (name === "PI") return Math.PI;

    const next = exprPeek(parser);
    if (next && next.type === 3) {
      exprConsume(parser);
      if (name === "vec2" || name === "vec3" || name === "vec4") {
        const size = Number(name[3]);
        const args = evalExprArgList(parser);
        if (args.length !== size) throw new Error(`${name} needs ${size} values`);
        for (let a = 0; a < args.length; a += 1) {
          if (typeof args[a] !== "number") throw new Error(`${name} values must be numbers`);
        }
        return args;
      }
      const fn = findExprFunction(name);
      if (!fn) throw new Error(`unknown function "${name}"`);
      const args = evalExprArgList(parser);
      if (args.length !== fn[1]) throw new Error(`${name} takes ${fn[1]} argument${fn[1] === 1 ? "" : "s"}`);
      for (let a = 0; a < args.length; a += 1) {
        if (typeof args[a] !== "number") throw new Error(`${name} arguments must be numbers`);
      }
      if (fn[1] === 1) return fn[2](args[0]);
      if (fn[1] === 2) return fn[2](args[0], args[1]);
      return fn[2](args[0], args[1], args[2]);
    }

    if (parser.values && name in parser.values) {
      const val = parser.values[name];
      return Array.isArray(val) ? val.slice() : val;
    }
    throw new Error(`unknown identifier "${name}"`);
  }

  throw new Error("unexpected token");
}

function evalExprPostfix(parser) {
  let value = evalExprPrimary(parser);
  while (exprPeek(parser) && exprPeek(parser).type === 6) {
    exprConsume(parser);
    const comp = exprExpect(parser, 1, "expected component name");
    if (!Array.isArray(value)) throw new Error("component access on non-vector");
    const idx = lessonComponentIndex(comp.value, value.length);
    if (idx === -1) throw new Error(`no component .${comp.value}`);
    value = value[idx];
  }
  return value;
}

function evalExprUnary(parser) {
  const tok = exprPeek(parser);
  if (tok && tok.type === 2 && tok.value === "-") {
    exprConsume(parser);
    const val = evalExprUnary(parser);
    if (typeof val === "number") return -val;
    if (Array.isArray(val)) {
      const r = [];
      for (let i = 0; i < val.length; i += 1) r.push(-val[i]);
      return r;
    }
    throw new Error("cannot negate this type");
  }
  return evalExprPostfix(parser);
}

function evalExprMultiplicative(parser) {
  let left = evalExprUnary(parser);
  while (true) {
    const tok = exprPeek(parser);
    if (!tok || tok.type !== 2 || (tok.value !== "*" && tok.value !== "/")) break;
    const op = tok.value;
    exprConsume(parser);
    const right = evalExprUnary(parser);
    if (typeof left === "number" && typeof right === "number") {
      left = op === "*" ? left * right : left / right;
    } else if (Array.isArray(left) && typeof right === "number") {
      const r = [];
      for (let i = 0; i < left.length; i += 1) r.push(op === "*" ? left[i] * right : left[i] / right);
      left = r;
    } else if (typeof left === "number" && Array.isArray(right)) {
      if (op === "/") throw new Error("cannot divide scalar by vector");
      const r = [];
      for (let i = 0; i < right.length; i += 1) r.push(left * right[i]);
      left = r;
    } else {
      throw new Error("type mismatch in arithmetic");
    }
  }
  return left;
}

function evalExprAdditive(parser) {
  let left = evalExprMultiplicative(parser);
  while (true) {
    const tok = exprPeek(parser);
    if (!tok || tok.type !== 2 || (tok.value !== "+" && tok.value !== "-")) break;
    const op = tok.value;
    exprConsume(parser);
    const right = evalExprMultiplicative(parser);
    if (typeof left === "number" && typeof right === "number") {
      left = op === "+" ? left + right : left - right;
    } else if (Array.isArray(left) && Array.isArray(right) && left.length === right.length) {
      const r = [];
      for (let i = 0; i < left.length; i += 1) r.push(op === "+" ? left[i] + right[i] : left[i] - right[i]);
      left = r;
    } else {
      throw new Error("type mismatch in arithmetic");
    }
  }
  return left;
}

function parseLessonExpressions(source, schema, defaults, lastGood, parser) {
  const values = lastGood ? cloneLessonDefaults(schema, lastGood) : cloneLessonDefaults(schema, defaults);
  const lines = source.split(/\r?\n/);
  let appliedCount = 0;
  const errors = [];

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const stripped = stripLessonComment(lines[index]).trim();
    if (!stripped) continue;

    const match = stripped.match(/^([A-Za-z_][A-Za-z0-9_]*(?:\.[xyzw])?)\s*=\s*(.+)$/);
    if (!match) {
      errors.push(`Line ${lineNumber}: expected name = expression.`);
      continue;
    }

    const lhs = match[1];
    const rhs = match[2].trim();
    const dotIndex = lhs.indexOf(".");
    const name = dotIndex === -1 ? lhs : lhs.slice(0, dotIndex);
    const component = dotIndex === -1 ? "" : lhs.slice(dotIndex + 1);
    const entry = findLessonSchemaEntry(schema, name);

    if (!entry) {
      errors.push(`Line ${lineNumber}: unknown binding "${name}".`);
      continue;
    }

    try {
      parser.count = tokenizeLessonExpression(rhs, parser.tokens);
      parser.pos = 0;
      parser.values = values;
      const result = evalExprAdditive(parser);

      if (parser.pos < parser.count) throw new Error("unexpected tokens after expression");

      if (component) {
        const size = lessonVectorSize(entry.type);
        const compIdx = lessonComponentIndex(component, size);
        if (compIdx === -1) throw new Error(`"${name}" has no ".${component}" component`);
        if (typeof result !== "number") throw new Error("component assignment requires a number");
        values[name][compIdx] = result;
      } else if (entry.type === "number") {
        if (typeof result !== "number") throw new Error("expected a number");
        values[name] = result;
      } else if (entry.type === "bool") {
        if (typeof result !== "boolean") throw new Error("expected true or false");
        values[name] = result;
      } else {
        const size = lessonVectorSize(entry.type);
        if (!Array.isArray(result) || result.length !== size) throw new Error(`expected ${entry.type}(...)`);
        values[name] = result;
      }
      appliedCount += 1;
    } catch (err) {
      errors.push(`Line ${lineNumber}: ${err.message}`);
    }
  }

  return { values, appliedCount, errors };
}

function setCodeStatus(element, message, isError = false) {
  if (!element) {
    return;
  }
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

function renderCodeSteps(list, steps) {
  if (!list) {
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const step of steps) {
    const item = document.createElement("li");
    item.textContent = step;
    fragment.appendChild(item);
  }

  list.replaceChildren(fragment);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function highlightLessonBindingTarget(target) {
  const dotIndex = target.indexOf(".");
  if (dotIndex === -1) {
    return `<span class="token-binding">${escapeHtml(target)}</span>`;
  }

  return [
    `<span class="token-binding">${escapeHtml(target.slice(0, dotIndex))}</span>`,
    `<span class="token-punctuation">.</span>`,
    `<span class="token-property">${escapeHtml(target.slice(dotIndex + 1))}</span>`,
  ].join("");
}

function highlightLessonCodeFragment(text, schemaNames) {
  const pattern = /[A-Za-z_][A-Za-z0-9_]*|(?:\d+\.\d+|\d+|\.\d+)|[=(),.+\-*/]/g;
  let result = "";
  let cursor = 0;
  let match = pattern.exec(text);

  while (match) {
    result += escapeHtml(text.slice(cursor, match.index));
    const token = match[0];
    let className = "";
    if (/^(?:\d+\.\d+|\d+|\.\d+)$/.test(token)) {
      className = "token-number";
    } else if (token === "true" || token === "false") {
      className = "token-keyword";
    } else if (EXPR_BUILTIN_NAMES.has(token)) {
      className = "token-builtin";
    } else if (schemaNames && schemaNames.has(token)) {
      className = "token-binding";
    } else if (/^[=+\-*/]$/.test(token)) {
      className = "token-operator";
    } else if (/^[(),.]$/.test(token)) {
      className = "token-punctuation";
    }
    if (className) {
      result += `<span class="${className}">${escapeHtml(token)}</span>`;
    } else {
      result += escapeHtml(token);
    }
    cursor = pattern.lastIndex;
    match = pattern.exec(text);
  }

  result += escapeHtml(text.slice(cursor));
  return result;
}

function highlightLessonBindings(source, schemaNames) {
  const lines = source.split(/\r?\n/);
  const highlighted = [];

  for (const line of lines) {
    const commentIndex = line.indexOf("#");
    const body = commentIndex === -1 ? line : line.slice(0, commentIndex);
    const comment = commentIndex === -1 ? "" : line.slice(commentIndex);
    const assignmentMatch = body.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*(?:\.[xyzw])?)(\s*)=(\s*)(.*)$/);

    let html = "";
    if (assignmentMatch) {
      html =
        `${escapeHtml(assignmentMatch[1])}` +
        `${highlightLessonBindingTarget(assignmentMatch[2])}` +
        `${escapeHtml(assignmentMatch[3])}` +
        `<span class="token-operator">=</span>` +
        `${escapeHtml(assignmentMatch[4])}` +
        `${highlightLessonCodeFragment(assignmentMatch[5], schemaNames)}`;
    } else {
      html = highlightLessonCodeFragment(body, schemaNames);
    }

    if (comment) {
      html += `<span class="token-comment">${escapeHtml(comment)}</span>`;
    }

    highlighted.push(html);
  }

  return highlighted.join("\n");
}

function setupLessonCodeEditor(input, highlight, schemaNames) {
  const noopEditor = { refresh() {} };
  if (!input || !highlight) {
    return noopEditor;
  }

  function syncScroll() {
    highlight.scrollTop = input.scrollTop;
    highlight.scrollLeft = input.scrollLeft;
  }

  function refresh() {
    highlight.innerHTML = highlightLessonBindings(input.value || "", schemaNames);
    syncScroll();
  }

  input.addEventListener("input", refresh);
  input.addEventListener("scroll", syncScroll);
  refresh();

  return { refresh };
}

function wrapUnit(value) {
  return value - Math.floor(value);
}

function drawLessonCanvasBackground(ctx, width, height, top = "#102535", bottom = "#183446") {
  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, top);
  background.addColorStop(1, bottom);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
}

function wrapCanvasTextLine(ctx, text, maxWidth) {
  const normalized = `${text ?? ""}`;
  if (!Number.isFinite(maxWidth) || maxWidth <= 0 || !normalized.includes(" ")) {
    return [normalized];
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [""];
  }

  const lines = [];
  let current = words[0];
  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${current} ${words[index]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[index];
    }
  }
  lines.push(current);
  return lines;
}

function drawLessonCanvasPanel(ctx, rect, title, width) {
  ctx.save();
  ctx.fillStyle = "rgba(8, 21, 30, 0.22)";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = "rgba(239, 245, 247, 0.94)";
  ctx.font = `${Math.max(11, width * 0.014)}px "Avenir Next", "Segoe UI", sans-serif`;
  drawTextLines(ctx, [title], rect.x + 14, rect.y + 10, Math.max(14, width * 0.014 * 1.18), rect.width - 28);
  ctx.restore();
}

function drawCanvasChip(ctx, text, x, y, options = {}) {
  if (!text) {
    return;
  }

  const fontSize = options.fontSize || 11;
  const paddingX = options.paddingX || Math.max(6, fontSize * 0.52);
  const paddingY = options.paddingY || Math.max(3, fontSize * 0.26);
  const align = options.align || "center";

  ctx.save();
  ctx.font = `${fontSize}px "Avenir Next", "Segoe UI", sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const textWidth = ctx.measureText(text).width;
  const chipWidth = textWidth + paddingX * 2;
  const chipHeight = fontSize + paddingY * 2;

  let chipX = x;
  if (align === "center") {
    chipX -= chipWidth * 0.5;
  } else if (align === "right") {
    chipX -= chipWidth;
  }

  let chipY = y - chipHeight * 0.5;
  chipX = Math.min(Math.max(chipX, 4), Math.max(4, ctx.canvas.width - chipWidth - 4));
  chipY = Math.min(Math.max(chipY, 4), Math.max(4, ctx.canvas.height - chipHeight - 4));

  ctx.fillStyle = options.background || "rgba(8, 21, 30, 0.8)";
  ctx.fillRect(chipX, chipY, chipWidth, chipHeight);
  ctx.strokeStyle = options.border || "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 1;
  ctx.strokeRect(chipX + 0.5, chipY + 0.5, chipWidth - 1, chipHeight - 1);
  ctx.fillStyle = options.color || "rgba(239, 245, 247, 0.94)";
  ctx.fillText(text, chipX + paddingX, chipY + chipHeight * 0.5 + 0.5);
  ctx.restore();
}

function drawArrow2d(ctx, from, to, color, lineWidth = 2.2) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const head = Math.max(7, lineWidth * 3.4);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0], to[1]);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(to[0], to[1]);
  ctx.lineTo(to[0] - ux * head - uy * head * 0.55, to[1] - uy * head + ux * head * 0.55);
  ctx.lineTo(to[0] - ux * head + uy * head * 0.55, to[1] - uy * head - ux * head * 0.55);
  ctx.closePath();
  ctx.fill();
}

function projectRectPoint(rect, point, extentX, extentY, paddingX = 16, paddingY = 18, centerY = 0.56) {
  return [
    rect.x + rect.width * 0.5 + (point[0] / extentX) * (rect.width * 0.5 - paddingX),
    rect.y + rect.height * centerY - (point[1] / extentY) * (rect.height * 0.5 - paddingY),
  ];
}

function drawRectAxesGrid(ctx, rect, extentX, extentY, width, centerY = 0.56) {
  const maxX = Math.max(1, Math.floor(extentX));
  const maxY = Math.max(1, Math.floor(extentY));

  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  for (let index = -maxY; index <= maxY; index += 1) {
    const start = projectRectPoint(rect, [-extentX, index], extentX, extentY, 16, 18, centerY);
    const end = projectRectPoint(rect, [extentX, index], extentX, extentY, 16, 18, centerY);
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
  }

  for (let index = -maxX; index <= maxX; index += 1) {
    const start = projectRectPoint(rect, [index, -extentY], extentX, extentY, 16, 18, centerY);
    const end = projectRectPoint(rect, [index, extentY], extentX, extentY, 16, 18, centerY);
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
  }

  const origin = projectRectPoint(rect, [0, 0], extentX, extentY, 16, 18, centerY);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = Math.max(1.5, width * 0.0028);
  ctx.beginPath();
  ctx.moveTo(rect.x + 14, origin[1]);
  ctx.lineTo(rect.x + rect.width - 14, origin[1]);
  ctx.moveTo(origin[0], rect.y + 16);
  ctx.lineTo(origin[0], rect.y + rect.height - 16);
  ctx.stroke();
  return origin;
}

function drawCanvasDot(ctx, point, radius, fillStyle, strokeStyle = "", lineWidth = 0) {
  ctx.beginPath();
  ctx.arc(point[0], point[1], radius, 0, TAU);
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth || 1.5;
    ctx.stroke();
  }
}

function drawCameraGlyph(ctx, center, angle, size, fillStyle, strokeStyle = "rgba(239, 245, 247, 0.92)") {
  const forward = [Math.cos(angle), -Math.sin(angle)];
  const right = [-forward[1], forward[0]];
  const tip = [center[0] + forward[0] * size * 1.1, center[1] + forward[1] * size * 1.1];
  const left = [
    center[0] - forward[0] * size * 0.68 + right[0] * size * 0.66,
    center[1] - forward[1] * size * 0.68 + right[1] * size * 0.66,
  ];
  const rightPoint = [
    center[0] - forward[0] * size * 0.68 - right[0] * size * 0.66,
    center[1] - forward[1] * size * 0.68 - right[1] * size * 0.66,
  ];

  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = Math.max(1.5, size * 0.14);
  ctx.beginPath();
  ctx.moveTo(tip[0], tip[1]);
  ctx.lineTo(left[0], left[1]);
  ctx.lineTo(rightPoint[0], rightPoint[1]);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawCanvasDot(ctx, center, Math.max(3, size * 0.18), "rgba(8, 21, 30, 0.78)", strokeStyle, Math.max(1.2, size * 0.08));
}

function drawTextLines(ctx, lines, x, y, lineHeight, maxWidth = Infinity) {
  ctx.save();
  ctx.textBaseline = "top";
  let cursorY = y;
  for (let index = 0; index < lines.length; index += 1) {
    const wrapped = wrapCanvasTextLine(ctx, lines[index], maxWidth);
    for (const line of wrapped) {
      ctx.fillText(line, x, cursorY);
      cursorY += lineHeight;
    }
  }
  ctx.restore();
  return cursorY - y;
}

function setupCodeLab(config) {
  const canvas = document.getElementById(config.canvasId || `${config.prefix}-canvas`);
  const ctx = get2dContext(canvas);
  const input = document.getElementById(config.inputId || `${config.prefix}-input`);
  const highlight = document.getElementById(config.highlightId || `${config.prefix}-highlight`);
  const resetButton = document.getElementById(config.resetId || `${config.prefix}-reset`);
  const status = document.getElementById(config.statusId || `${config.prefix}-status`);
  const stepList = document.getElementById(config.stepListId || `${config.prefix}-steps`);
  const loweredOutput = document.getElementById(config.loweredId || `${config.prefix}-lowered`);
  const tabsContainer = document.getElementById(`${config.prefix}-tabs`);
  const instructionsEl = document.getElementById(`${config.prefix}-instructions`);
  const matchEl = document.getElementById(`${config.prefix}-match`);
  if (!ctx || !input || !resetButton) return;

  const readouts = {};
  for (const [key, elementId] of Object.entries(config.readoutIds || {})) {
    readouts[key] = document.getElementById(elementId);
  }

  const schemaNames = new Set();
  for (const entry of config.schema) schemaNames.add(entry.name);

  const levels = config.levels || null;
  const hasLevels = levels && levels.length > 0;
  const parser = createExpressionParser();
  const levelSources = {};
  let currentLevelIndex = 0;

  const state = {
    lastGood: null,
    derived: null,
    pendingFrame: 0,
  };

  function getDefaultSource() {
    if (hasLevels) return levels[currentLevelIndex].source || "";
    return config.defaultSource || input.value;
  }

  const editor = setupLessonCodeEditor(input, highlight, schemaNames);

  if (hasLevels) {
    for (let i = 0; i < levels.length; i += 1) {
      levelSources[levels[i].id] = levels[i].source || "";
    }
    input.value = levels[0].source || "";
    editor.refresh();
  }

  if (hasLevels && tabsContainer) {
    const tabBar = document.createElement("div");
    tabBar.className = "code-lab-tabs";
    for (let i = 0; i < levels.length; i += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-lab-tab";
      btn.textContent = levels[i].label;
      btn.dataset.levelIndex = i;
      if (i === 0) btn.classList.add("is-active");
      btn.addEventListener("click", function () { switchLevel(Number(this.dataset.levelIndex)); });
      tabBar.appendChild(btn);
    }
    tabsContainer.appendChild(tabBar);
  }

  function switchLevel(index) {
    if (hasLevels) levelSources[levels[currentLevelIndex].id] = input.value;
    currentLevelIndex = index;
    input.value = levelSources[levels[index].id];
    editor.refresh();
    if (tabsContainer) {
      const tabs = tabsContainer.querySelectorAll(".code-lab-tab");
      for (let i = 0; i < tabs.length; i += 1) tabs[i].classList.toggle("is-active", i === index);
    }
    if (instructionsEl) {
      instructionsEl.textContent = levels[index].instructions || "";
      instructionsEl.hidden = !levels[index].instructions;
    }
    state.lastGood = null;
    evaluate();
  }

  function evaluate() {
    const parsed = parseLessonExpressions(input.value, config.schema, config.defaults, state.lastGood, parser);
    const derived = config.evaluate(parsed.values);
    state.derived = derived;
    if (parsed.errors.length === 0) state.lastGood = parsed.values;

    if (config.updateUi) config.updateUi(derived, readouts, stepList, loweredOutput);

    if (parsed.errors.length > 0) {
      setCodeStatus(status, parsed.errors[0], true);
    } else {
      setCodeStatus(
        status,
        config.getStatusMessage
          ? config.getStatusMessage(parsed, derived)
          : `Applied ${parsed.appliedCount} binding${parsed.appliedCount === 1 ? "" : "s"}.`
      );
    }

    updateMatch(derived);
    markAllDemosDirty();
  }

  function updateMatch(derived) {
    if (!matchEl || !hasLevels) return;
    const level = levels[currentLevelIndex];
    if (!level.target) {
      matchEl.hidden = true;
      return;
    }
    matchEl.hidden = false;
    const matched = level.target.match(derived);
    matchEl.classList.toggle("is-matched", matched);
    matchEl.innerHTML = matched
      ? '<span class="code-lab-match-icon is-matched"></span> Target reached!'
      : '<span class="code-lab-match-icon"></span> Keep adjusting\u2026';
  }

  function scheduleEvaluate() {
    if (state.pendingFrame) return;
    state.pendingFrame = requestAnimationFrame(function () {
      state.pendingFrame = 0;
      evaluate();
    });
  }

  input.addEventListener("input", scheduleEvaluate);

  resetButton.addEventListener("click", function () {
    const src = getDefaultSource();
    if (hasLevels) levelSources[levels[currentLevelIndex].id] = src;
    input.value = src;
    editor.refresh();
    state.lastGood = null;
    evaluate();
  });

  if (hasLevels && instructionsEl && levels[0].instructions) {
    instructionsEl.textContent = levels[0].instructions;
    instructionsEl.hidden = false;
  }

  evaluate();

  registerDemo({
    canvas,
    visible: true,
    needsRender: true,
    render() {
      resizeCanvasToDisplaySize(canvas);
      if (!state.derived) return;
      let targetDerived = null;
      if (hasLevels && levels[currentLevelIndex].target && levels[currentLevelIndex].target.defaults) {
        targetDerived = config.evaluate(levels[currentLevelIndex].target.defaults);
      }
      config.draw(ctx, canvas, state.derived, targetDerived);
    },
  });
}

function getCanvasPointer(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(rect.width, 1);
  const scaleY = canvas.height / Math.max(rect.height, 1);
  return [
    (event.clientX - rect.left) * scaleX,
    (event.clientY - rect.top) * scaleY,
  ];
}

function barycentricCoordinates(point, a, b, c) {
  const denominator =
    (b[1] - c[1]) * (a[0] - c[0]) +
    (c[0] - b[0]) * (a[1] - c[1]);

  if (Math.abs(denominator) < 1e-6) {
    return null;
  }

  const alpha =
    ((b[1] - c[1]) * (point[0] - c[0]) +
      (c[0] - b[0]) * (point[1] - c[1])) /
    denominator;
  const beta =
    ((c[1] - a[1]) * (point[0] - c[0]) +
      (a[0] - c[0]) * (point[1] - c[1])) /
    denominator;
  const gamma = 1 - alpha - beta;

  return [alpha, beta, gamma];
}

function vec2(x = 0, y = 0) {
  return [x, y];
}

function vec3(x = 0, y = 0, z = 0) {
  return [x, y, z];
}

function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtract3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale3(v, scalar) {
  return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
}

function multiply3(a, b) {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}

function mix3(a, b, t) {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];
}

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize3(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function reflect3(direction, normal) {
  return subtract3(direction, scale3(normal, 2 * dot3(direction, normal)));
}

function colorToRgba(color, alpha = 1) {
  return `rgba(${Math.round(clamp(color[0], 0, 1) * 255)}, ${Math.round(clamp(color[1], 0, 1) * 255)}, ${Math.round(
    clamp(color[2], 0, 1) * 255
  )}, ${alpha})`;
}

function mat4Identity() {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

function mat4Multiply(a, b) {
  const out = new Float32Array(16);

  const a00 = a[0];
  const a01 = a[1];
  const a02 = a[2];
  const a03 = a[3];
  const a10 = a[4];
  const a11 = a[5];
  const a12 = a[6];
  const a13 = a[7];
  const a20 = a[8];
  const a21 = a[9];
  const a22 = a[10];
  const a23 = a[11];
  const a30 = a[12];
  const a31 = a[13];
  const a32 = a[14];
  const a33 = a[15];

  const b00 = b[0];
  const b01 = b[1];
  const b02 = b[2];
  const b03 = b[3];
  const b10 = b[4];
  const b11 = b[5];
  const b12 = b[6];
  const b13 = b[7];
  const b20 = b[8];
  const b21 = b[9];
  const b22 = b[10];
  const b23 = b[11];
  const b30 = b[12];
  const b31 = b[13];
  const b32 = b[14];
  const b33 = b[15];

  out[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;

  out[4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;

  out[8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;

  out[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
  out[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
  out[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
  out[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;

  return out;
}

function mat4Translation(tx, ty, tz) {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    tx, ty, tz, 1,
  ]);
}

function mat4Scaling(sx, sy, sz) {
  return new Float32Array([
    sx, 0, 0, 0,
    0, sy, 0, 0,
    0, 0, sz, 0,
    0, 0, 0, 1,
  ]);
}

function mat4RotationX(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1,
  ]);
}

function mat4RotationY(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1,
  ]);
}

function mat4RotationZ(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

function mat4Perspective(fieldOfView, aspect, near, far) {
  const f = 1 / Math.tan(fieldOfView / 2);
  const rangeInv = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0,
  ]);
}

function mat4Orthographic(left, right, bottom, top, near, far) {
  return new Float32Array([
    2 / (right - left), 0, 0, 0,
    0, 2 / (top - bottom), 0, 0,
    0, 0, 2 / (near - far), 0,
    (left + right) / (left - right),
    (bottom + top) / (bottom - top),
    (near + far) / (near - far),
    1,
  ]);
}

function mat4LookAt(eye, target, up) {
  const zAxis = normalize3(subtract3(eye, target));
  const xAxis = normalize3(cross3(up, zAxis));
  const yAxis = cross3(zAxis, xAxis);

  return new Float32Array([
    xAxis[0], yAxis[0], zAxis[0], 0,
    xAxis[1], yAxis[1], zAxis[1], 0,
    xAxis[2], yAxis[2], zAxis[2], 0,
    -dot3(xAxis, eye), -dot3(yAxis, eye), -dot3(zAxis, eye), 1,
  ]);
}

function upperLeftMat3(matrix) {
  return new Float32Array([
    matrix[0], matrix[1], matrix[2],
    matrix[4], matrix[5], matrix[6],
    matrix[8], matrix[9], matrix[10],
  ]);
}

function transformPoint(matrix, point) {
  const x = point[0];
  const y = point[1];
  const z = point[2];
  const w = 1;

  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12] * w,
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13] * w,
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14] * w,
    matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15] * w,
  ];
}

function resizeCanvasToDisplaySize(canvas) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.floor(canvas.clientWidth * pixelRatio);
  const height = Math.floor(canvas.clientHeight * pixelRatio);
  if (canvas.width === width && canvas.height === height) {
    return false;
  }
  canvas.width = width;
  canvas.height = height;
  return true;
}

function get2dContext(canvas) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    return null;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    markCanvasFailure(canvas, "Canvas is unavailable in this browser.");
    return null;
  }

  return context;
}

function intersectRayCircle(origin, direction, center, radius, maxDistance = Infinity) {
  const offset = subtract2(origin, center);
  const b = 2 * dot2(offset, direction);
  const c = dot2(offset, offset) - radius * radius;
  const discriminant = b * b - 4 * c;
  if (discriminant < 0) {
    return null;
  }

  const root = Math.sqrt(discriminant);
  const near = (-b - root) * 0.5;
  const far = (-b + root) * 0.5;
  const t = near > 0.0001 ? near : far > 0.0001 ? far : null;
  if (t === null || t > maxDistance) {
    return null;
  }

  const point = add2(origin, scale2(direction, t));
  return {
    t,
    point,
    normal: normalize2(subtract2(point, center)),
  };
}

function buildCompareScene(overrides = {}) {
  const sampleValue =
    overrides.sample !== undefined ? overrides.sample : Number(compareControls.sample?.value || 50) / 100;
  const driftValue =
    overrides.drift !== undefined ? overrides.drift : Number(compareControls.drift?.value || 0) / 100;
  const camera = [0, -1.02];
  const screenY = -0.56;
  const screenHalfWidth = 0.84;
  const sampleX = lerp(-screenHalfWidth * 0.9, screenHalfWidth * 0.9, sampleValue);
  const light = [0.88, 0.88];

  const objects = [
    {
      name: "near shape",
      center: [-0.22 + driftValue * 0.46, 0.04 + driftValue * 0.06],
      radius: 0.28,
      fill: "rgba(58, 185, 229, 0.78)",
      stroke: "rgba(166, 241, 255, 0.98)",
      solid: "#34b3de",
    },
    {
      name: "far shape",
      center: [0.24 - driftValue * 0.12, 0.34],
      radius: 0.38,
      fill: "rgba(241, 141, 78, 0.74)",
      stroke: "rgba(255, 216, 181, 0.98)",
      solid: "#ef8d4e",
    },
  ];

  const screenPoint = [sampleX, screenY];
  const primaryDirection = normalize2(subtract2(screenPoint, camera));
  let primaryHit = null;

  for (const object of objects) {
    const hit = intersectRayCircle(camera, primaryDirection, object.center, object.radius);
    if (!hit) {
      continue;
    }

    if (!primaryHit || hit.t < primaryHit.t) {
      primaryHit = {
        ...hit,
        object,
      };
    }
  }

  let shadowQuery = null;
  let reflectionQuery = null;
  let primaryEnd = add2(camera, scale2(primaryDirection, 2.4));

  if (primaryHit) {
    primaryEnd = primaryHit.point;

    const reflectionDirection = normalize2(reflect2(primaryDirection, primaryHit.normal));
    reflectionQuery = {
      direction: reflectionDirection,
      end: add2(primaryHit.point, scale2(reflectionDirection, 0.9)),
    };

    const toLight = subtract2(light, primaryHit.point);
    const lightDistance = Math.hypot(toLight[0], toLight[1]) || 1;
    const shadowDirection = scale2(toLight, 1 / lightDistance);
    let blocker = null;

    for (const object of objects) {
      if (object === primaryHit.object) {
        continue;
      }

      const hit = intersectRayCircle(
        add2(primaryHit.point, scale2(shadowDirection, 0.02)),
        shadowDirection,
        object.center,
        object.radius,
        lightDistance
      );

      if (!hit) {
        continue;
      }

      if (!blocker || hit.t < blocker.t) {
        blocker = {
          ...hit,
          object,
        };
      }
    }

    shadowQuery = {
      direction: shadowDirection,
      light,
      blocked: blocker,
    };
  }

  const projectedObjects = objects
    .map((object) => {
      const projectionScale = (screenY - camera[1]) / (object.center[1] - camera[1]);
      return {
        ...object,
        screenX: camera[0] + (object.center[0] - camera[0]) * projectionScale,
        screenRadius: object.radius * projectionScale,
        depth: object.center[1] - camera[1],
      };
    })
    .sort((a, b) => b.depth - a.depth);

  return {
    camera,
    screenY,
    screenHalfWidth,
    screenPoint,
    light,
    objects,
    projectedObjects,
    primaryDirection,
    primaryHit,
    primaryEnd,
    shadowQuery,
    reflectionQuery,
  };
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(info || "Shader compilation failed.");
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(info || "Program link failed.");
  }

  return program;
}

function createArrayBuffer(gl, data, usage = gl.STATIC_DRAW) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  return buffer;
}

function createIndexBuffer(gl, data) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

function createCheckerTexture(gl, size, cells) {
  const texture = gl.createTexture();
  const pixels = new Uint8Array(size * size * 4);
  const cellSize = size / cells;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cellX = Math.floor(x / cellSize);
      const cellY = Math.floor(y / cellSize);
      const isDark = (cellX + cellY) % 2 === 0;
      const offset = (y * size + x) * 4;

      if (isDark) {
        pixels[offset] = 21;
        pixels[offset + 1] = 65;
        pixels[offset + 2] = 91;
      } else {
        pixels[offset] = 236;
        pixels[offset + 1] = 209;
        pixels[offset + 2] = 142;
      }
      pixels[offset + 3] = 255;
    }
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    size,
    size,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return texture;
}

function getGlContext(canvas) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    return null;
  }

  const gl = canvas.getContext("webgl", {
    antialias: true,
    alpha: true,
    premultipliedAlpha: false,
  });

  if (!gl) {
    markCanvasFailure(canvas, "WebGL is unavailable in this browser.");
    return null;
  }

  return gl;
}

function registerDemo(demo) {
  demos.push(demo);
  demoMap.set(demo.canvas, demo);
}

const observer =
  typeof window.IntersectionObserver === "function"
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const demo = demoMap.get(entry.target);
            if (!demo) {
              continue;
            }
            demo.visible = entry.isIntersecting;
            demo.needsRender = true;
          }
        },
        { threshold: 0.08 }
      )
    : null;

function setupReveals() {
  const revealBlocks = document.querySelectorAll(".reveal-block");

  if (prefersReducedMotion || typeof window.IntersectionObserver !== "function") {
    revealBlocks.forEach((element) => {
      element.classList.add("is-visible");
    });
    return;
  }

  revealBlocks.forEach((element) => {
    element.classList.add("reveal-enabled");
  });

  const revealObserver = new IntersectionObserver(
    (entries, currentObserver) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      }
    },
    { threshold: 0, rootMargin: '0px 0px 200px 0px' }
  );

  revealBlocks.forEach((element) => {
    revealObserver.observe(element);
  });
}

function markCanvasFailure(canvas, label) {
  const parent = canvas.parentElement;
  if (!parent) {
    return;
  }

  parent.classList.add("webgl-fallback");
  parent.setAttribute("data-webgl-fallback", label);
}

function safeSetup(label, setupFn) {
  const canvas = document.getElementById(label);
  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }

  try {
    setupFn();
  } catch (error) {
    console.error(`Failed to initialize ${label}.`, error);
    markCanvasFailure(canvas, `Unable to initialize ${label}.`);
  }
}

const lineVertexSource = `
precision mediump float;

attribute vec3 aPosition;
attribute vec3 aColor;
uniform mat4 uMatrix;
varying mediump vec3 vColor;

void main() {
  vColor = aColor;
  gl_Position = uMatrix * vec4(aPosition, 1.0);
}
`;

const lineFragmentSource = `
precision mediump float;
varying mediump vec3 vColor;

void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
`;

const flatVertexSource = `
attribute vec3 aPosition;
uniform mat4 uMatrix;

void main() {
  gl_Position = uMatrix * vec4(aPosition, 1.0);
}
`;

const flatFragmentSource = `
precision mediump float;
uniform vec4 uColor;

void main() {
  gl_FragColor = uColor;
}
`;

const litVertexSource = `
precision mediump float;

attribute vec3 aPosition;
attribute vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;

varying mediump vec3 vWorldPosition;
varying mediump vec3 vNormal;

void main() {
  vec4 worldPosition = uModel * vec4(aPosition, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  gl_Position = uProjection * uView * worldPosition;
}
`;

const litFragmentSource = `
precision mediump float;

varying mediump vec3 vWorldPosition;
varying mediump vec3 vNormal;

uniform vec3 uLightDirection;
uniform vec3 uBaseColor;
uniform vec3 uAccentColor;
uniform vec3 uCameraPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDirection = normalize(uLightDirection);
  vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.0);
  float rim = smoothstep(0.2, 1.0, fresnel);

  vec3 color = uBaseColor * (0.24 + diffuse * 0.92) + uAccentColor * rim * 0.22;
  gl_FragColor = vec4(color, 1.0);
}
`;

const waveVertexSource = `
precision mediump float;

attribute vec3 aPosition;
attribute vec2 aUv;

uniform mat4 uViewProjection;
uniform float uTime;
uniform float uAmplitude;

varying mediump vec2 vUv;
varying mediump float vWave;

void main() {
  float wave = sin((aPosition.x * 3.4) + uTime * 0.65) *
               cos((aPosition.z * 2.45) - uTime * 0.33);
  vec3 displaced = aPosition + vec3(0.0, wave * uAmplitude, 0.0);
  vUv = aUv;
  vWave = wave;
  gl_Position = uViewProjection * vec4(displaced, 1.0);
}
`;

const waveFragmentSource = `
precision mediump float;

varying mediump vec2 vUv;
varying mediump float vWave;

uniform float uTime;
uniform float uStripeDensity;
uniform float uShift;

void main() {
  float stripes = 0.5 + 0.5 * sin(vUv.x * (uStripeDensity * 3.6) + uTime * 1.2 + vWave * 3.4);
  float bands = 0.5 + 0.5 * sin(vUv.y * 24.0 - uTime * 0.85 + uShift * 5.0);

  vec3 cool = vec3(0.10, 0.53, 0.70);
  vec3 mint = vec3(0.14, 0.83, 0.66);
  vec3 warm = vec3(0.95, 0.63, 0.34);
  vec3 dusk = vec3(0.32, 0.16, 0.47);

  vec3 mixA = mix(cool, mint, 0.5 + 0.5 * vWave);
  vec3 mixB = mix(dusk, warm, bands);
  vec3 color = mix(mixA, mixB, stripes * 0.55 + 0.15);

  vec2 centeredUv = vUv - vec2(0.5);
  float vignette = 1.0 - smoothstep(0.18, 0.78, length(centeredUv));
  gl_FragColor = vec4(color * vignette, 1.0);
}
`;

const texturedVertexSource = `
precision mediump float;

attribute vec3 aPosition;
attribute vec2 aUv;

uniform mat4 uModel;
uniform mat4 uViewProjection;

varying mediump vec2 vUv;

void main() {
  vUv = aUv;
  gl_Position = uViewProjection * uModel * vec4(aPosition, 1.0);
}
`;

const texturedFragmentSource = `
precision mediump float;

varying mediump vec2 vUv;

uniform sampler2D uTexture;
uniform float uUvScale;

void main() {
  vec2 uv = vUv * uUvScale;
  vec4 sampleColor = texture2D(uTexture, uv);
  float edge = 0.5 + 0.5 * sin(vUv.x * 3.14159) * sin(vUv.y * 3.14159);
  vec3 color = mix(sampleColor.rgb * 0.88, sampleColor.rgb, edge);
  gl_FragColor = vec4(color, 1.0);
}
`;

const materialVertexSource = `
precision mediump float;

attribute vec3 aPosition;
attribute vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;

varying mediump vec3 vWorldPosition;
varying mediump vec3 vNormal;

void main() {
  vec4 worldPosition = uModel * vec4(aPosition, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  gl_Position = uProjection * uView * worldPosition;
}
`;

const materialFragmentSource = `
precision mediump float;

varying mediump vec3 vWorldPosition;
varying mediump vec3 vNormal;

uniform vec3 uLightDirection;
uniform vec3 uBaseColor;
uniform vec3 uCameraPosition;
uniform float uSpecularStrength;
uniform float uShininess;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDirection = normalize(uLightDirection);
  vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
  vec3 halfVector = normalize(lightDirection + viewDirection);

  float diffuse = max(dot(normal, lightDirection), 0.0);
  float specular = pow(max(dot(normal, halfVector), 0.0), uShininess) * uSpecularStrength;
  float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.0);

  vec3 ambient = uBaseColor * 0.18;
  vec3 diffuseColor = uBaseColor * diffuse * 0.92;
  vec3 specularColor = vec3(1.0, 0.96, 0.88) * specular;
  vec3 rimColor = vec3(0.28, 0.72, 0.95) * fresnel * 0.18;

  gl_FragColor = vec4(ambient + diffuseColor + specularColor + rimColor, 1.0);
}
`;

const colorVertexSource = `
precision mediump float;

attribute vec2 aPosition;
attribute vec2 aUv;

varying mediump vec2 vUv;

void main() {
  vUv = aUv;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const colorFragmentSource = `
precision mediump float;

varying mediump vec2 vUv;

uniform float uTime;
uniform float uExposure;
uniform float uGamma;
uniform float uToneMap;

void main() {
  vec2 uv = vUv;
  vec2 p = uv * 2.0 - 1.0;

  vec3 skyLow = vec3(0.10, 0.18, 0.42);
  vec3 skyHigh = vec3(0.95, 0.58, 0.22);
  vec3 sky = mix(skyLow, skyHigh, smoothstep(-0.65, 0.9, p.y));

  vec2 sunOffset = p - vec2(0.38, 0.24 + sin(uTime * 0.25) * 0.03);
  float sun = exp(-dot(sunOffset, sunOffset) * 16.0) * 8.0;
  float halo = exp(-dot(sunOffset, sunOffset) * 3.2) * 2.2;

  float bands = 0.5 + 0.5 * sin((uv.x * 10.0) + uTime * 0.25);
  float horizonGlow = smoothstep(0.24, -0.25, abs(p.y + 0.12)) * 1.4;

  vec3 color = sky;
  color += vec3(1.0, 0.86, 0.65) * sun;
  color += vec3(1.0, 0.62, 0.32) * halo;
  color += vec3(0.20, 0.55, 0.92) * bands * horizonGlow * 0.65;

  color *= uExposure;

  if (uToneMap > 0.5) {
    color = color / (1.0 + color);
  }

  color = pow(max(color, 0.0), vec3(1.0 / uGamma));
  gl_FragColor = vec4(color, 1.0);
}
`;

function createCubeData() {
  const positions = new Float32Array([
    -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
    1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1,
    -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1,
    -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1,
    1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1,
    -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1,
  ]);

  const normals = new Float32Array([
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ]);

  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23,
  ]);

  return { positions, normals, indices };
}

function buildCubeMesh(gl) {
  const cube = createCubeData();
  return {
    position: createArrayBuffer(gl, cube.positions),
    normal: createArrayBuffer(gl, cube.normals),
    index: createIndexBuffer(gl, cube.indices),
    count: cube.indices.length,
  };
}

function createSphereData(radius, latBands, lonBands) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let lat = 0; lat <= latBands; lat += 1) {
    const v = lat / latBands;
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let lon = 0; lon <= lonBands; lon += 1) {
      const u = lon / lonBands;
      const theta = u * TAU;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      const x = sinPhi * cosTheta;
      const y = cosPhi;
      const z = sinPhi * sinTheta;

      positions.push(x * radius, y * radius, z * radius);
      normals.push(x, y, z);
    }
  }

  for (let lat = 0; lat < latBands; lat += 1) {
    for (let lon = 0; lon < lonBands; lon += 1) {
      const first = lat * (lonBands + 1) + lon;
      const second = first + lonBands + 1;
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

function createPlaneData(size, columns, rows) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      const v = row / rows;
      positions.push((u - 0.5) * size, 0, (v - 0.5) * size);
      uvs.push(u, v);
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const topLeft = row * (columns + 1) + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + columns + 1;
      const bottomRight = bottomLeft + 1;
      indices.push(topLeft, bottomLeft, topRight);
      indices.push(topRight, bottomLeft, bottomRight);
    }
  }

  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}

function createScreenQuadData() {
  return {
    positions: new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1,
    ]),
    uvs: new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1,
    ]),
  };
}

function createGridLines(extent, step) {
  const positions = [];
  const colors = [];

  for (let value = -extent; value <= extent; value += step) {
    const isAxis = value === 0;
    const tone = isAxis ? [0.38, 0.65, 0.73] : [0.45, 0.53, 0.61];
    const weight = isAxis ? 1 : 0.72;
    const color = tone.map((channel) => clamp(channel * weight, 0, 1));

    positions.push(-extent, value, 0, extent, value, 0);
    positions.push(value, -extent, 0, value, extent, 0);
    colors.push(...color, ...color, ...color, ...color);
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
  };
}

function createAxisArrows(length) {
  const positions = new Float32Array([
    0, 0, 0, length, 0, 0,
    length, 0, 0, length - 0.16, 0.1, 0,
    length, 0, 0, length - 0.16, -0.1, 0,

    0, 0, 0, 0, length, 0,
    0, length, 0, 0.1, length - 0.16, 0,
    0, length, 0, -0.1, length - 0.16, 0,
  ]);

  const colors = new Float32Array([
    0.96, 0.53, 0.38, 0.96, 0.53, 0.38,
    0.96, 0.53, 0.38, 0.96, 0.53, 0.38,
    0.96, 0.53, 0.38, 0.96, 0.53, 0.38,

    0.29, 0.86, 0.77, 0.29, 0.86, 0.77,
    0.29, 0.86, 0.77, 0.29, 0.86, 0.77,
    0.29, 0.86, 0.77, 0.29, 0.86, 0.77,
  ]);

  return { positions, colors };
}

function createWorldAxes(length) {
  const positions = new Float32Array([
    -length, 0, 0, length, 0, 0,
    0, -length, 0, 0, length, 0,
    0, 0, -length, 0, 0, length,
  ]);

  const colors = new Float32Array([
    0.95, 0.47, 0.32, 0.95, 0.47, 0.32,
    0.34, 0.88, 0.66, 0.34, 0.88, 0.66,
    0.34, 0.65, 0.98, 0.34, 0.65, 0.98,
  ]);

  return { positions, colors };
}

function createOrbitLines(radiusA, radiusB, segments) {
  const positions = [];
  const colors = [];

  for (let i = 0; i < segments; i += 1) {
    const a0 = (i / segments) * TAU;
    const a1 = ((i + 1) / segments) * TAU;

    positions.push(
      Math.cos(a0) * radiusA, 0, Math.sin(a0) * radiusA,
      Math.cos(a1) * radiusA, 0, Math.sin(a1) * radiusA
    );
    positions.push(
      0, Math.cos(a0) * radiusB, Math.sin(a0) * radiusB,
      0, Math.cos(a1) * radiusB, Math.sin(a1) * radiusB
    );

    colors.push(
      0.46, 0.88, 0.99, 0.46, 0.88, 0.99,
      0.97, 0.68, 0.36, 0.97, 0.68, 0.36
    );
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
  };
}

function createNormalLines(positions, normals, length, step = 6) {
  const linePositions = [];
  const colors = [];

  for (let vertex = 0; vertex < positions.length / 3; vertex += step) {
    const index = vertex * 3;
    const px = positions[index];
    const py = positions[index + 1];
    const pz = positions[index + 2];
    const nx = normals[index];
    const ny = normals[index + 1];
    const nz = normals[index + 2];

    linePositions.push(px, py, pz, px + nx * length, py + ny * length, pz + nz * length);
    colors.push(0.42, 0.92, 0.95, 0.96, 0.65, 0.35);
  }

  return {
    positions: new Float32Array(linePositions),
    colors: new Float32Array(colors),
  };
}

function createLightArrow(length) {
  const positions = new Float32Array([
    0, 0, 0, 0, 0, length,
    0, 0, length, 0.12, 0, length - 0.16,
    0, 0, length, -0.12, 0, length - 0.16,
    0, 0, length, 0, 0.12, length - 0.16,
    0, 0, length, 0, -0.12, length - 0.16,
  ]);

  const colors = new Float32Array([
    1.0, 0.78, 0.38, 1.0, 0.78, 0.38,
    1.0, 0.78, 0.38, 1.0, 0.78, 0.38,
    1.0, 0.78, 0.38, 1.0, 0.78, 0.38,
    1.0, 0.78, 0.38, 1.0, 0.78, 0.38,
  ]);

  return { positions, colors };
}

function bindAttribute(gl, buffer, location, size) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

function markAllDemosDirty() {
  for (const demo of demos) {
    demo.needsRender = true;
  }
}

function updateHeaderOffset() {
  const header = document.querySelector(".site-header");
  if (!header) {
    return;
  }

  const offset = Math.ceil(header.getBoundingClientRect().height) + 18;
  document.documentElement.style.setProperty("--header-offset", `${offset}px`);
}

function setupHeaderOffset() {
  const header = document.querySelector(".site-header");
  if (!header) {
    return;
  }

  updateHeaderOffset();

  if (typeof window.ResizeObserver === "function") {
    const headerObserver = new ResizeObserver(() => {
      updateHeaderOffset();
    });
    headerObserver.observe(header);
  }

  window.addEventListener("resize", updateHeaderOffset, { passive: true });
  window.addEventListener("orientationchange", updateHeaderOffset, { passive: true });
}

function startRenderLoop() {
  const draw = (frameTime) => {
    const time = frameTime * 0.001;
    for (const demo of demos) {
      if (!demo.visible && !demo.needsRender) {
        continue;
      }
      demo.render(time);
      demo.needsRender = false;
    }
    requestAnimationFrame(draw);
  };

  requestAnimationFrame(draw);
}


function bindDirtyInputs(inputs) {
  for (const input of inputs) {
    if (!input) {
      continue;
    }

    input.addEventListener("input", markAllDemosDirty);
    input.addEventListener("change", markAllDemosDirty);
  }

  window.addEventListener("resize", markAllDemosDirty, { passive: true });
}

function getElementsById(spec) {
  const elements = {};
  for (const [key, id] of Object.entries(spec)) {
    elements[key] = document.getElementById(id);
  }
  return elements;
}

function initializePage({ canvasSetups = [], controls = [], extraSetup = [] } = {}) {
  setupHeaderOffset();
  setupReveals();

  for (const [canvasId, setupFn] of canvasSetups) {
    safeSetup(canvasId, setupFn);
  }

  for (const setupFn of extraSetup) {
    setupFn();
  }

  bindDirtyInputs(controls);

  for (const demo of demos) {
    if (observer) {
      observer.observe(demo.canvas);
    }
  }

  if (demos.length > 0) {
    startRenderLoop();
  }
}

