import assert from "node:assert/strict";
import {
  SETTINGS_STORAGE_KEY,
  createSavedSettings,
  restoreSettings,
  saveSettings
} from "../editor-storage.js";

function createState() {
  return {
    theme: "light",
    width: 1280,
    height: 720,
    image: { shouldNotBeSaved: true },
    imageName: "private-image-name",
    imageFit: "stretch",
    selectedLayerId: 3,
    nextLayerId: 4,
    drag: { shouldNotBeSaved: true },
    badge: {
      enabled: true,
      text: "246",
      scale: 1.5,
      fontSize: 80,
      outerPad: 0,
      padX: 40,
      padY: 20,
      fontFamily: "Arial, sans-serif",
      fontWeight: 700,
      textColor: "#ffffff",
      backgroundColor: "#000000"
    },
    layers: [{
      id: 3,
      name: "Main caption",
      text: "Remember me",
      x: 640,
      y: 360,
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
      backgroundPadLeft: 40,
      backgroundPadRight: 24,
      backgroundPadTop: 18,
      backgroundPadBottom: 30
    }]
  };
}

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}

const original = createState();
const saved = createSavedSettings(original);
assert.equal(saved.layers[0].backgroundPadLeft, 40);
assert.equal(saved.theme, "light");
assert.equal(saved.badge.scale, 1.5);
assert.equal("image" in saved, false);
assert.equal("imageName" in saved, false);
assert.equal("drag" in saved, false);

const storage = createStorage();
assert.equal(saveSettings(original, storage), true);
assert.ok(storage.getItem(SETTINGS_STORAGE_KEY));

const restored = createState();
restored.layers = [];
restored.selectedLayerId = null;
restored.nextLayerId = 1;
assert.equal(restoreSettings(restored, storage), true);
assert.equal(restored.layers[0].text, "Remember me");
assert.equal(restored.theme, "light");
assert.equal(restored.badge.scale, 1.5);
assert.equal(restored.layers[0].backgroundPadLeft, 40);
assert.equal(restored.layers[0].backgroundPadBottom, 30);
assert.equal(restored.selectedLayerId, 3);
assert.equal(restored.nextLayerId, 4);

storage.setItem(SETTINGS_STORAGE_KEY, "{not-json");
assert.equal(restoreSettings(createState(), storage), false);

console.log("editor-storage tests passed");
