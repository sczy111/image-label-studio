import assert from "node:assert/strict";
import {
  calculateDayBadge,
  calculateTextLayout,
  formatDayLabel,
  getBackgroundPadding,
  getSmartCenterX,
  toAlphaByte
} from "../editor-core.js";

function createContext() {
  return {
    font: "",
    save() {},
    restore() {},
    measureText(text) {
      const match = this.font.match(/(\d+)px/);
      const size = match ? Number(match[1]) : 80;
      const width = text.length * size * 0.58;
      return {
        width,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: width,
        actualBoundingBoxAscent: size * 0.75,
        actualBoundingBoxDescent: size * 0.2
      };
    }
  };
}

function createLayer(overrides = {}) {
  return {
    text: "A fairly long caption",
    x: 640,
    y: 360,
    fontFamily: "Arial, sans-serif",
    fontWeight: 700,
    fontSize: 80,
    autoFit: true,
    autoMinSize: 10,
    autoMaxSize: 160,
    edgePad: 0,
    avoidDayBadge: true,
    dayBadgeGap: 12,
    backgroundEnabled: true,
    backgroundPadLeft: 10,
    backgroundPadRight: 20,
    backgroundPadTop: 30,
    backgroundPadBottom: 40,
    ...overrides
  };
}

const ctx = createContext();
const badge = calculateDayBadge(ctx, {
  enabled: true,
  text: "246",
  scale: 1,
  fontSize: 80,
  outerPad: 0,
  padX: 40,
  padY: 20,
  fontFamily: "Arial, sans-serif",
  fontWeight: 700
}, 1280);

assert.equal(formatDayLabel("246"), "DAY 246");
assert.equal(formatDayLabel("day 31"), "day 31");
assert.equal(formatDayLabel(""), "");
assert.equal(toAlphaByte(0), 0);
assert.equal(toAlphaByte(0.5), 128);
assert.equal(toAlphaByte(1), 255);
assert.equal(toAlphaByte(4), 255);

assert.deepEqual(getBackgroundPadding(createLayer()), {
  left: 10,
  right: 20,
  top: 30,
  bottom: 40
});

const middleLayout = calculateTextLayout(ctx, createLayer({ y: 360 }), badge, 1280);
assert.equal(middleLayout.row.width, 1280);
assert.equal(middleLayout.backgroundBounds.left, middleLayout.textBounds.left - 10);
assert.equal(middleLayout.backgroundBounds.right, middleLayout.textBounds.right + 20);
assert.equal(middleLayout.backgroundBounds.top, middleLayout.textBounds.top - 30);
assert.equal(middleLayout.backgroundBounds.bottom, middleLayout.textBounds.bottom + 40);

const topLayer = createLayer({ y: 50 });
const topLayout = calculateTextLayout(ctx, topLayer, badge, 1280);
assert.ok(topLayout.row.right <= badge.x - topLayer.dayBadgeGap);
assert.ok(topLayout.row.width < middleLayout.row.width);

const zeroPositionLayout = calculateTextLayout(ctx, createLayer({ x: 0, y: 0 }), badge, 1280);
assert.equal(zeroPositionLayout.x, 0);
assert.equal(zeroPositionLayout.y, 0);

const zeroPaddingBadge = calculateDayBadge(ctx, {
  enabled: true,
  text: "1",
  scale: 1,
  fontSize: 80,
  outerPad: 0,
  padX: 0,
  padY: 0,
  fontFamily: "Arial, sans-serif",
  fontWeight: 700
}, 1280);
assert.equal(zeroPaddingBadge.padX, 0);
assert.equal(zeroPaddingBadge.padY, 0);

const doubleBadge = calculateDayBadge(ctx, {
  enabled: true,
  text: "246",
  scale: 2,
  fontSize: 80,
  outerPad: 0,
  padX: 40,
  padY: 20,
  fontFamily: "Arial, sans-serif",
  fontWeight: 700
}, 1280);
assert.equal(doubleBadge.scale, 2);
assert.equal(doubleBadge.padX, badge.padX * 2);
assert.equal(doubleBadge.padY, badge.padY * 2);
assert.equal(doubleBadge.width, badge.width * 2);
assert.equal(doubleBadge.height, badge.height * 2);

const centeredTopX = getSmartCenterX(ctx, topLayer, badge, 1280);
assert.equal(centeredTopX, topLayout.row.left + topLayout.row.width / 2);

console.log("editor-core tests passed");
