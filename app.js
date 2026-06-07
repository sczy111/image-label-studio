import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  calculateDayBadge,
  calculateTextLayout,
  clamp,
  getSmartCenterX,
  pointInBounds,
  toAlphaByte
} from "./editor-core.js?v=20260605-badge-scale";
import { restoreSettings, saveSettings } from "./editor-storage.js?v=20260605-badge-scale";

const canvas = document.querySelector("#editor-canvas");
const ctx = canvas.getContext("2d");
const stage = document.querySelector("#canvas-stage");
const emptyState = document.querySelector("#empty-state");
const layerList = document.querySelector("#layer-list");
const toast = document.querySelector("#toast");

const state = {
  theme: "dark",
  width: DEFAULT_CANVAS_WIDTH,
  height: DEFAULT_CANVAS_HEIGHT,
  image: null,
  imageName: "labelled-image",
  imageFit: "stretch",
  selectedLayerId: null,
  nextLayerId: 1,
  drag: null,
  badge: {
    enabled: true,
    text: "246",
    scale: 1,
    fontSize: 80,
    outerPad: 0,
    padX: 40,
    padY: 20,
    fontFamily: "Arial, sans-serif",
    fontWeight: 700,
    textColor: "#ffffff",
    backgroundColor: "#000000"
  },
  layers: []
};

const controls = {
  themeToggle: document.querySelector("#theme-toggle"),
  themeLabel: document.querySelector("#theme-label"),
  canvasWidth: document.querySelector("#canvas-width"),
  canvasHeight: document.querySelector("#canvas-height"),
  imageFit: document.querySelector("#image-fit"),
  imageInput: document.querySelector("#image-input"),
  dayEnabled: document.querySelector("#day-enabled"),
  dayText: document.querySelector("#day-text"),
  dayScale: document.querySelector("#day-scale"),
  dayFontSize: document.querySelector("#day-font-size"),
  dayOuterPad: document.querySelector("#day-outer-pad"),
  dayPadX: document.querySelector("#day-pad-x"),
  dayPadY: document.querySelector("#day-pad-y"),
  dayTextColor: document.querySelector("#day-text-color"),
  dayBgColor: document.querySelector("#day-bg-color"),
  layerText: document.querySelector("#layer-text"),
  layerX: document.querySelector("#layer-x"),
  layerY: document.querySelector("#layer-y"),
  layerColor: document.querySelector("#layer-color"),
  layerWeight: document.querySelector("#layer-weight"),
  layerAutoFit: document.querySelector("#layer-auto-fit"),
  layerFontSize: document.querySelector("#layer-font-size"),
  layerAutoMaxSize: document.querySelector("#layer-auto-max-size"),
  layerAvoidDay: document.querySelector("#layer-avoid-day"),
  layerDayGap: document.querySelector("#layer-day-gap"),
  layerBgEnabled: document.querySelector("#layer-bg-enabled"),
  layerBgColor: document.querySelector("#layer-bg-color"),
  layerBgAlpha: document.querySelector("#layer-bg-alpha"),
  layerBgPadLeft: document.querySelector("#layer-bg-pad-left"),
  layerBgPadRight: document.querySelector("#layer-bg-pad-right"),
  layerBgPadTop: document.querySelector("#layer-bg-pad-top"),
  layerBgPadBottom: document.querySelector("#layer-bg-pad-bottom")
};

function createTextLayer(overrides = {}) {
  const id = state.nextLayerId++;
  return {
    id,
    name: `Text ${id}`,
    text: "New caption",
    x: state.width / 2,
    y: state.height / 2,
    fontFamily: "Arial, sans-serif",
    fontWeight: 700,
    color: "#ffffff",
    fontSize: 80,
    autoFit: true,
    autoMinSize: 10,
    autoMaxSize: 120,
    edgePad: 0,
    avoidDayBadge: true,
    dayBadgeGap: 12,
    backgroundEnabled: true,
    backgroundColor: "#000000",
    backgroundAlpha: 0.5,
    backgroundPadLeft: 24,
    backgroundPadRight: 24,
    backgroundPadTop: 24,
    backgroundPadBottom: 24,
    ...overrides
  };
}

function selectedLayer() {
  return state.layers.find((layer) => layer.id === state.selectedLayerId) ?? null;
}

function currentBadge() {
  return calculateDayBadge(ctx, state.badge, state.width);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1800);
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  controls.themeToggle.checked = state.theme === "light";
  controls.themeLabel.textContent = state.theme === "light" ? "Light mode" : "Dark mode";
}

function rgba(hex, alpha) {
  const cleaned = hex.replace("#", "");
  const value = Number.parseInt(cleaned, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${toAlphaByte(alpha) / 255})`;
}

function drawSourceImage() {
  ctx.clearRect(0, 0, state.width, state.height);
  ctx.fillStyle = state.image || state.theme === "dark" ? "#252f3b" : "#e3e9ef";
  ctx.fillRect(0, 0, state.width, state.height);

  if (!state.image) {
    return;
  }

  const sourceWidth = state.image.naturalWidth || state.image.width;
  const sourceHeight = state.image.naturalHeight || state.image.height;

  if (state.imageFit === "stretch") {
    ctx.drawImage(state.image, 0, 0, state.width, state.height);
    return;
  }

  const scale = state.imageFit === "cover"
    ? Math.max(state.width / sourceWidth, state.height / sourceHeight)
    : Math.min(state.width / sourceWidth, state.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  ctx.drawImage(state.image, (state.width - width) / 2, (state.height - height) / 2, width, height);
}

function drawBadge(badge) {
  if (!badge) {
    return;
  }

  ctx.fillStyle = state.badge.backgroundColor;
  ctx.fillRect(badge.x, badge.y, badge.width, badge.height);
  ctx.save();
  ctx.font = badge.font;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = state.badge.textColor;
  const baselineX = badge.x + badge.padX + badge.metrics.left;
  const baselineY = badge.y + badge.padY + badge.metrics.ascent;
  ctx.fillText(badge.text, baselineX, baselineY);
  ctx.restore();
}

function drawTextLayer(layer, badge, drawSelection = true) {
  const layout = calculateTextLayout(ctx, layer, badge, state.width);
  if (layer.backgroundEnabled && layer.backgroundAlpha > 0) {
    const box = layout.backgroundBounds;
    ctx.fillStyle = rgba(layer.backgroundColor, layer.backgroundAlpha);
    ctx.fillRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
  }

  ctx.save();
  ctx.font = layout.font;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = layer.color;
  ctx.fillText(layer.text, layout.baselineX, layout.baselineY);
  ctx.restore();

  if (drawSelection && layer.id === state.selectedLayerId) {
    const box = layout.backgroundBounds;
    ctx.save();
    ctx.strokeStyle = "#68d4c2";
    ctx.lineWidth = Math.max(1, state.width / 640);
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
    ctx.restore();
  }

  return layout;
}

function render(drawSelection = true) {
  canvas.width = state.width;
  canvas.height = state.height;
  drawSourceImage();
  const badge = currentBadge();
  if (state.image) {
    for (const layer of state.layers) {
      drawTextLayer(layer, badge, drawSelection);
    }
    drawBadge(badge);
  }
  document.querySelector("#canvas-size-label").textContent = `${state.width} x ${state.height}`;
  emptyState.classList.toggle("is-hidden", Boolean(state.image));
  canvas.classList.toggle("is-draggable", Boolean(selectedLayer()));
  saveSettings(state, window.localStorage);
}

function renderLayerList() {
  layerList.replaceChildren();
  for (const layer of [...state.layers].reverse()) {
    const button = document.createElement("button");
    button.className = `layer-item${layer.id === state.selectedLayerId ? " is-selected" : ""}`;
    button.type = "button";
    button.dataset.layerId = String(layer.id);

    const dot = document.createElement("span");
    dot.className = "layer-dot";
    dot.style.background = layer.color;
    const name = document.createElement("span");
    name.className = "layer-item-text";
    name.textContent = layer.text || layer.name;
    button.append(dot, name);
    button.addEventListener("click", () => {
      state.selectedLayerId = layer.id;
      syncInspector();
      renderLayerList();
      render();
    });
    layerList.append(button);
  }
}

function syncBadgeControls() {
  controls.canvasWidth.value = state.width;
  controls.canvasHeight.value = state.height;
  controls.imageFit.value = state.imageFit;
  controls.dayEnabled.checked = state.badge.enabled;
  controls.dayText.value = state.badge.text;
  controls.dayScale.value = state.badge.scale ?? 1;
  controls.dayFontSize.value = state.badge.fontSize;
  controls.dayOuterPad.value = state.badge.outerPad;
  controls.dayPadX.value = state.badge.padX;
  controls.dayPadY.value = state.badge.padY;
  controls.dayTextColor.value = state.badge.textColor;
  controls.dayBgColor.value = state.badge.backgroundColor;
}

function syncInspector() {
  const layer = selectedLayer();
  document.querySelector("#inspector-empty").classList.toggle("is-hidden", Boolean(layer));
  document.querySelector("#inspector-fields").classList.toggle("is-hidden", !layer);
  document.querySelector("#background-panel").classList.toggle("is-hidden", !layer);
  document.querySelector("#selected-layer-label").textContent = layer ? layer.text : "No layer selected";
  document.querySelector("#inspector-title").textContent = layer ? layer.name : "Selected text";

  if (!layer) {
    return;
  }

  controls.layerText.value = layer.text;
  controls.layerX.value = Math.round(layer.x);
  controls.layerY.value = Math.round(layer.y);
  controls.layerColor.value = layer.color;
  controls.layerWeight.value = String(layer.fontWeight);
  controls.layerAutoFit.checked = layer.autoFit;
  controls.layerFontSize.value = layer.fontSize;
  controls.layerFontSize.disabled = layer.autoFit;
  controls.layerAutoMaxSize.value = layer.autoMaxSize;
  controls.layerAutoMaxSize.disabled = !layer.autoFit;
  controls.layerAvoidDay.checked = layer.avoidDayBadge;
  controls.layerDayGap.value = layer.dayBadgeGap;
  controls.layerBgEnabled.checked = layer.backgroundEnabled;
  controls.layerBgColor.value = layer.backgroundColor;
  controls.layerBgAlpha.value = layer.backgroundAlpha;
  controls.layerBgPadLeft.value = layer.backgroundPadLeft;
  controls.layerBgPadRight.value = layer.backgroundPadRight;
  controls.layerBgPadTop.value = layer.backgroundPadTop;
  controls.layerBgPadBottom.value = layer.backgroundPadBottom;
  document.querySelector("#background-fields").classList.toggle("is-hidden", !layer.backgroundEnabled);
}

function selectAndCenterLayer(layer) {
  state.layers.push(layer);
  state.selectedLayerId = layer.id;
  layer.x = getSmartCenterX(ctx, layer, currentBadge(), state.width);
  syncInspector();
  renderLayerList();
  render();
}

function addLayer(overrides = {}) {
  selectAndCenterLayer(createTextLayer(overrides));
}

function deleteSelectedLayer() {
  if (!state.selectedLayerId) {
    return;
  }
  state.layers = state.layers.filter((layer) => layer.id !== state.selectedLayerId);
  state.selectedLayerId = state.layers.at(-1)?.id ?? null;
  syncInspector();
  renderLayerList();
  render();
}

function centerSelectedLayer() {
  const layer = selectedLayer();
  if (!layer) {
    return;
  }
  layer.x = getSmartCenterX(ctx, layer, currentBadge(), state.width);
  syncInspector();
  render();
}

function loadImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    showToast("Choose an image file.");
    return;
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    if (state.image?.objectUrl) {
      URL.revokeObjectURL(state.image.objectUrl);
    }
    image.objectUrl = url;
    state.image = image;
    state.imageName = file.name.replace(/\.[^.]+$/, "") || "labelled-image";
    render();
    showToast(`Loaded ${file.name}`);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    showToast("Could not load that image.");
  };
  image.src = url;
}

function createDemoImage() {
  const demo = document.createElement("canvas");
  demo.width = state.width;
  demo.height = state.height;
  const demoCtx = demo.getContext("2d");
  const gradient = demoCtx.createLinearGradient(0, 0, state.width, state.height);
  gradient.addColorStop(0, "#244f66");
  gradient.addColorStop(0.56, "#3f7480");
  gradient.addColorStop(1, "#bca264");
  demoCtx.fillStyle = gradient;
  demoCtx.fillRect(0, 0, state.width, state.height);
  demoCtx.fillStyle = "rgba(255,255,255,0.22)";
  for (let index = 0; index < 9; index += 1) {
    demoCtx.beginPath();
    demoCtx.arc(100 + index * 150, 90 + (index % 3) * 34, 48 + index * 3, 0, Math.PI * 2);
    demoCtx.fill();
  }
  demoCtx.fillStyle = "#566b47";
  demoCtx.fillRect(0, state.height * 0.65, state.width, state.height * 0.35);
  state.image = demo;
  state.imageName = "image-label-studio-demo";
  render();
  showToast("Demo image ready.");
}

function exportPng() {
  render(false);
  canvas.toBlob((blob) => {
    if (!blob) {
      showToast("Export failed.");
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${state.imageName}_labelled.png`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    render(true);
    showToast("PNG exported.");
  }, "image/png");
}

function eventPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * state.width / rect.width,
    y: (event.clientY - rect.top) * state.height / rect.height
  };
}

function hitTest(point) {
  const badge = currentBadge();
  for (const layer of [...state.layers].reverse()) {
    const layout = calculateTextLayout(ctx, layer, badge, state.width);
    if (pointInBounds(point, layout.backgroundBounds, 8)) {
      return layer;
    }
  }
  return null;
}

canvas.addEventListener("pointerdown", (event) => {
  const point = eventPoint(event);
  const layer = hitTest(point);
  if (!layer) {
    return;
  }
  state.selectedLayerId = layer.id;
  state.drag = { id: layer.id, dx: point.x - layer.x, dy: point.y - layer.y };
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add("is-dragging");
  syncInspector();
  renderLayerList();
  render();
});

canvas.addEventListener("pointermove", (event) => {
  if (!state.drag) {
    return;
  }
  const layer = selectedLayer();
  if (!layer || layer.id !== state.drag.id) {
    return;
  }
  const point = eventPoint(event);
  layer.x = clamp(point.x - state.drag.dx, 0, state.width);
  layer.y = clamp(point.y - state.drag.dy, 0, state.height);
  syncInspector();
  render();
});

function endDrag() {
  state.drag = null;
  canvas.classList.remove("is-dragging");
}

canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

stage.addEventListener("keydown", (event) => {
  const layer = selectedLayer();
  if (!layer || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    return;
  }
  event.preventDefault();
  const amount = event.shiftKey ? 10 : 1;
  if (event.key === "ArrowLeft") layer.x -= amount;
  if (event.key === "ArrowRight") layer.x += amount;
  if (event.key === "ArrowUp") layer.y -= amount;
  if (event.key === "ArrowDown") layer.y += amount;
  layer.x = clamp(layer.x, 0, state.width);
  layer.y = clamp(layer.y, 0, state.height);
  syncInspector();
  render();
});

for (const eventName of ["dragenter", "dragover"]) {
  stage.addEventListener(eventName, (event) => {
    event.preventDefault();
    stage.classList.add("is-drag-over");
  });
}

for (const eventName of ["dragleave", "drop"]) {
  stage.addEventListener(eventName, (event) => {
    event.preventDefault();
    stage.classList.remove("is-drag-over");
  });
}

stage.addEventListener("drop", (event) => {
  loadImageFile(event.dataTransfer.files[0]);
});

function bindNumeric(control, object, key, { min = -Infinity, max = Infinity, onChange } = {}) {
  const update = () => {
    object[key] = clamp(Number(control.value) || 0, min, max);
    onChange?.();
    render();
  };
  control.addEventListener("input", update);
  control.addEventListener("change", update);
}

function bindLayerInput(control, key, parse = (value) => value) {
  control.addEventListener("input", () => {
    const layer = selectedLayer();
    if (!layer) {
      return;
    }
    layer[key] = parse(control.type === "checkbox" ? control.checked : control.value);
    syncInspector();
    renderLayerList();
    render();
  });
}

controls.imageInput.addEventListener("change", () => loadImageFile(controls.imageInput.files[0]));
controls.themeToggle.addEventListener("input", () => {
  state.theme = controls.themeToggle.checked ? "light" : "dark";
  applyTheme();
  render();
});
document.querySelector("#demo-button").addEventListener("click", createDemoImage);
document.querySelector("#export-button").addEventListener("click", exportPng);
document.querySelector("#add-layer-button").addEventListener("click", () => addLayer());
document.querySelector("#delete-layer-button").addEventListener("click", deleteSelectedLayer);
document.querySelector("#recenter-button").addEventListener("click", centerSelectedLayer);

bindNumeric(controls.canvasWidth, state, "width", { min: 64, max: 8192, onChange: () => { canvas.width = state.width; } });
bindNumeric(controls.canvasHeight, state, "height", { min: 64, max: 8192, onChange: () => { canvas.height = state.height; } });
controls.imageFit.addEventListener("change", () => { state.imageFit = controls.imageFit.value; render(); });
controls.dayEnabled.addEventListener("input", () => { state.badge.enabled = controls.dayEnabled.checked; render(); });
controls.dayText.addEventListener("input", () => { state.badge.text = controls.dayText.value; render(); });
bindNumeric(controls.dayScale, state.badge, "scale", { min: 0.1, max: 4 });
bindNumeric(controls.dayFontSize, state.badge, "fontSize", { min: 10, max: 400 });
bindNumeric(controls.dayOuterPad, state.badge, "outerPad", { min: 0, max: 400 });
bindNumeric(controls.dayPadX, state.badge, "padX", { min: 0, max: 400 });
bindNumeric(controls.dayPadY, state.badge, "padY", { min: 0, max: 400 });
controls.dayTextColor.addEventListener("input", () => { state.badge.textColor = controls.dayTextColor.value; render(); });
controls.dayBgColor.addEventListener("input", () => { state.badge.backgroundColor = controls.dayBgColor.value; render(); });

bindLayerInput(controls.layerText, "text");
bindLayerInput(controls.layerX, "x", Number);
bindLayerInput(controls.layerY, "y", Number);
bindLayerInput(controls.layerColor, "color");
bindLayerInput(controls.layerWeight, "fontWeight", Number);
bindLayerInput(controls.layerAutoFit, "autoFit", Boolean);
bindLayerInput(controls.layerFontSize, "fontSize", Number);
bindLayerInput(controls.layerAutoMaxSize, "autoMaxSize", Number);
bindLayerInput(controls.layerAvoidDay, "avoidDayBadge", Boolean);
bindLayerInput(controls.layerDayGap, "dayBadgeGap", Number);
bindLayerInput(controls.layerBgEnabled, "backgroundEnabled", Boolean);
bindLayerInput(controls.layerBgColor, "backgroundColor");
bindLayerInput(controls.layerBgAlpha, "backgroundAlpha", (value) => clamp(Number(value), 0, 1));
bindLayerInput(controls.layerBgPadLeft, "backgroundPadLeft", Number);
bindLayerInput(controls.layerBgPadRight, "backgroundPadRight", Number);
bindLayerInput(controls.layerBgPadTop, "backgroundPadTop", Number);
bindLayerInput(controls.layerBgPadBottom, "backgroundPadBottom", Number);

const restoredSettings = restoreSettings(state, window.localStorage);
applyTheme();
syncBadgeControls();

if (restoredSettings) {
  syncInspector();
  renderLayerList();
  render();
} else {
  addLayer({
    name: "Main caption",
    text: "Minimap Character Marker",
    y: 360
  });
}
