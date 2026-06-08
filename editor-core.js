export const DEFAULT_CANVAS_WIDTH = 1280;
export const DEFAULT_CANVAS_HEIGHT = 720;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function toAlphaByte(alpha) {
  return Math.round(clamp(Number(alpha) || 0, 0, 1) * 255);
}

export function formatDayLabel(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  return text.toUpperCase().startsWith("DAY") ? text : `DAY ${text}`;
}

export function fontString(size, family = "Arial, sans-serif", weight = 700) {
  return `${weight} ${Math.max(1, size)}px ${family}`;
}

export function measureVisibleText(ctx, text, font) {
  ctx.save();
  ctx.font = font;
  const metrics = ctx.measureText(text || " ");
  ctx.restore();

  const left = metrics.actualBoundingBoxLeft ?? 0;
  const right = metrics.actualBoundingBoxRight ?? metrics.width;
  const ascent = metrics.actualBoundingBoxAscent ?? 0;
  const descent = metrics.actualBoundingBoxDescent ?? 0;

  return {
    width: Math.max(1, left + right),
    height: Math.max(1, ascent + descent),
    left,
    right,
    ascent,
    descent
  };
}

export function textLines(text) {
  const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
  return lines.length ? lines : [""];
}

export function measureMultilineText(ctx, text, font, fontSize) {
  const lines = textLines(text);
  const measuredLines = lines.map((line) => ({
    text: line,
    metrics: measureVisibleText(ctx, line, font)
  }));
  const maxWidth = measuredLines.reduce((maximum, line) => Math.max(maximum, line.metrics.width), 1);
  const maxAscent = measuredLines.reduce((maximum, line) => Math.max(maximum, line.metrics.ascent), 1);
  const maxDescent = measuredLines.reduce((maximum, line) => Math.max(maximum, line.metrics.descent), 1);
  const lineHeight = Math.max(1, fontSize * 1.12, maxAscent + maxDescent);
  const height = maxAscent + maxDescent + lineHeight * (measuredLines.length - 1);

  return {
    width: maxWidth,
    height: Math.max(1, height),
    ascent: maxAscent,
    descent: maxDescent,
    lineHeight,
    lines: measuredLines
  };
}

export function getBackgroundPadding(layer) {
  if (!layer.backgroundEnabled) {
    return { left: 0, right: 0, top: 0, bottom: 0 };
  }

  return {
    left: Math.max(0, Number(layer.backgroundPadLeft) || 0),
    right: Math.max(0, Number(layer.backgroundPadRight) || 0),
    top: Math.max(0, Number(layer.backgroundPadTop) || 0),
    bottom: Math.max(0, Number(layer.backgroundPadBottom) || 0)
  };
}

export function calculateDayBadge(ctx, badge, canvasWidth) {
  if (!badge.enabled) {
    return null;
  }

  const text = formatDayLabel(badge.text);
  if (!text) {
    return null;
  }

  const scale = Math.max(0.1, numberOr(badge.scale, 1));
  const baseFontSize = Math.max(10, numberOr(badge.fontSize, 80));
  const fontSize = baseFontSize * scale;
  const outerPad = Math.max(0, numberOr(badge.outerPad, 0));
  const padX = Math.max(0, numberOr(badge.padX, Math.floor(baseFontSize / 2))) * scale;
  const padY = Math.max(0, numberOr(badge.padY, Math.floor(baseFontSize / 4))) * scale;
  const font = fontString(fontSize, badge.fontFamily, badge.fontWeight);
  const metrics = measureVisibleText(ctx, text, font);
  const width = metrics.width + padX * 2;
  const height = metrics.height + padY * 2;

  return {
    text,
    font,
    metrics,
    x: canvasWidth - outerPad - width,
    y: outerPad,
    width,
    height,
    scale,
    padX,
    padY
  };
}

function overlapsVertically(top, bottom, badge) {
  return Boolean(badge && top < badge.y + badge.height && bottom > badge.y);
}

function availableRowBounds(layer, badge, canvasWidth, metrics, padding) {
  const edgePad = Math.max(0, Number(layer.edgePad) || 0);
  let left = edgePad;
  let right = canvasWidth - edgePad;
  const textTop = layer.y - metrics.height / 2 - padding.top;
  const textBottom = layer.y + metrics.height / 2 + padding.bottom;

  if (layer.avoidDayBadge && overlapsVertically(textTop, textBottom, badge)) {
    const gap = Math.max(0, Number(layer.dayBadgeGap) || 0);
    right = Math.min(right, badge.x - gap);
  }

  return {
    left,
    right,
    width: Math.max(0, right - left)
  };
}

function fitFontSize(ctx, layer, badge, canvasWidth, padding) {
  if (!layer.autoFit) {
    return Math.max(10, Number(layer.fontSize) || 80);
  }

  const minSize = Math.max(8, Number(layer.autoMinSize) || 10);
  const maxSize = Math.max(minSize, Number(layer.autoMaxSize) || 160);

  for (let size = maxSize; size >= minSize; size -= 2) {
    const font = fontString(size, layer.fontFamily, layer.fontWeight);
    const metrics = measureMultilineText(ctx, layer.text, font, size);
    const row = availableRowBounds(layer, badge, canvasWidth, metrics, padding);
    if (metrics.width + padding.left + padding.right <= row.width) {
      return size;
    }
  }

  return minSize;
}

export function calculateTextLayout(ctx, layer, badge, canvasWidth) {
  const padding = getBackgroundPadding(layer);
  const fontSize = fitFontSize(ctx, layer, badge, canvasWidth, padding);
  const font = fontString(fontSize, layer.fontFamily, layer.fontWeight);
  const metrics = measureMultilineText(ctx, layer.text, font, fontSize);
  const row = availableRowBounds(layer, badge, canvasWidth, metrics, padding);
  const x = numberOr(layer.x, canvasWidth / 2);
  const y = numberOr(layer.y, 0);
  const firstBaselineY = y - metrics.height / 2 + metrics.ascent;
  const lines = metrics.lines.map((line, index) => ({
    text: line.text,
    baselineX: x + (line.metrics.left - line.metrics.right) / 2,
    baselineY: firstBaselineY + index * metrics.lineHeight,
    metrics: line.metrics
  }));
  const firstLine = lines[0] ?? { baselineX: x, baselineY: y };

  return {
    x,
    y,
    font,
    fontSize,
    metrics,
    row,
    baselineX: firstLine.baselineX,
    baselineY: firstLine.baselineY,
    lines,
    textBounds: {
      left: x - metrics.width / 2,
      right: x + metrics.width / 2,
      top: y - metrics.height / 2,
      bottom: y + metrics.height / 2
    },
    backgroundBounds: {
      left: x - metrics.width / 2 - padding.left,
      right: x + metrics.width / 2 + padding.right,
      top: y - metrics.height / 2 - padding.top,
      bottom: y + metrics.height / 2 + padding.bottom
    }
  };
}

export function getSmartCenterX(ctx, layer, badge, canvasWidth) {
  const padding = getBackgroundPadding(layer);
  const fontSize = fitFontSize(ctx, layer, badge, canvasWidth, padding);
  const font = fontString(fontSize, layer.fontFamily, layer.fontWeight);
  const metrics = measureMultilineText(ctx, layer.text, font, fontSize);
  const row = availableRowBounds(layer, badge, canvasWidth, metrics, padding);
  return row.left + row.width / 2;
}

export function pointInBounds(point, bounds, extra = 0) {
  return point.x >= bounds.left - extra &&
    point.x <= bounds.right + extra &&
    point.y >= bounds.top - extra &&
    point.y <= bounds.bottom + extra;
}
