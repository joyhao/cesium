import { Viewer } from "cesium";

// 点击命中容差（像素），pointSize 为 16，取 18 较宽松。
export const CLICK_THRESHOLD = 18;

export const viewerOptions: Viewer.ConstructorOptions = {
  animation: false,
  baseLayerPicker: false,
  baseLayer: undefined,
  fullscreenButton: false,
  geocoder: false,
  homeButton: false,
  infoBox: false,
  navigationHelpButton: false,
  sceneModePicker: false,
  selectionIndicator: false,
  timeline: false,
};

export const JkColor = {
  DEFAULT_COLOR: [0, 0.85, 1, 1],
  SELECTED_COLOR: [1, 0.4, 0.1, 1],
  HOVER_COLOR: [1, 1, 0.4, 1],
};
