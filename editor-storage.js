export const SETTINGS_STORAGE_KEY = "image-label-studio-settings-v1";

function copyBadge(badge = {}) {
  return {
    enabled: badge.enabled,
    text: badge.text,
    scale: badge.scale ?? 1,
    fontSize: badge.fontSize,
    outerPad: badge.outerPad,
    padX: badge.padX,
    padY: badge.padY,
    fontFamily: badge.fontFamily,
    fontWeight: badge.fontWeight,
    textColor: badge.textColor,
    backgroundColor: badge.backgroundColor
  };
}

function copyLayer(layer = {}) {
  return {
    id: layer.id,
    name: layer.name,
    text: layer.text,
    x: layer.x,
    y: layer.y,
    fontFamily: layer.fontFamily,
    fontWeight: layer.fontWeight,
    color: layer.color,
    fontSize: layer.fontSize,
    autoFit: layer.autoFit,
    autoMinSize: layer.autoMinSize,
    autoMaxSize: layer.autoMaxSize,
    edgePad: layer.edgePad,
    avoidDayBadge: layer.avoidDayBadge,
    dayBadgeGap: layer.dayBadgeGap,
    backgroundEnabled: layer.backgroundEnabled,
    backgroundColor: layer.backgroundColor,
    backgroundAlpha: layer.backgroundAlpha,
    backgroundPadLeft: layer.backgroundPadLeft,
    backgroundPadRight: layer.backgroundPadRight,
    backgroundPadTop: layer.backgroundPadTop,
    backgroundPadBottom: layer.backgroundPadBottom
  };
}

export function createSavedSettings(state) {
  return {
    version: 1,
    theme: state.theme,
    width: state.width,
    height: state.height,
    imageFit: state.imageFit,
    selectedLayerId: state.selectedLayerId,
    nextLayerId: state.nextLayerId,
    badge: copyBadge(state.badge),
    layers: state.layers.map(copyLayer)
  };
}

export function saveSettings(state, storage) {
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(createSavedSettings(state)));
    return true;
  } catch {
    return false;
  }
}

export function restoreSettings(state, storage) {
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return false;
    }

    const saved = JSON.parse(raw);
    if (saved.version !== 1 || !Array.isArray(saved.layers) || !saved.badge) {
      return false;
    }

    state.theme = saved.theme === "light" ? "light" : "dark";
    state.width = saved.width;
    state.height = saved.height;
    state.imageFit = saved.imageFit;
    state.badge = { ...state.badge, ...copyBadge(saved.badge) };
    state.layers = saved.layers.map(copyLayer);

    const maxLayerId = state.layers.reduce((maximum, layer) => Math.max(maximum, Number(layer.id) || 0), 0);
    state.nextLayerId = Math.max(Number(saved.nextLayerId) || 1, maxLayerId + 1);
    state.selectedLayerId = state.layers.some((layer) => layer.id === saved.selectedLayerId)
      ? saved.selectedLayerId
      : state.layers.at(-1)?.id ?? null;
    return true;
  } catch {
    return false;
  }
}
