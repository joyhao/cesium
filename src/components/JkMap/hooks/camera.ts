import { Viewer } from "cesium";
import { cEnum, CEvent } from "../event/event";

import { CameraChangeDetail } from "../type/map.type";
import { JkBase } from "./base";

export class JkCamera extends JkBase {
  viewer: Viewer;
  height = 0;
  level = 0;
  removeCameraChanged?: () => void;

  constructor() {
    super();

    this.viewer = JkBase.viewer;

    this.removeCameraChanged = this.viewer.camera.changed.addEventListener(
      this.update
    );
  }

  private update = () => {
    const height = this.viewer.camera.positionCartographic.height;
    this.height = Math.round(height);
    this.level = this.heightToLevel(height);

    this.dispatchEvent(
      new CustomEvent<CameraChangeDetail>(cEnum.camera_change, {
        detail: {
          height: this.height,
          level: this.level,
        },
      })
    );
  };

  heightToLevel(height: number) {
    const EARTH_RADIUS = 6_378_137;
    const MAX_LEVEL = 18;

    if (height <= 0) return MAX_LEVEL;

    const circumference = 2 * Math.PI * EARTH_RADIUS;
    const level = Math.round(Math.log2(circumference / height));

    return Math.min(MAX_LEVEL, Math.max(0, level));
  }

  destroy() {
    this.removeCameraChanged?.();
    this.removeCameraChanged = undefined;
  }
}
