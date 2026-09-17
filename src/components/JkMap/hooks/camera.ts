import { Viewer } from "cesium";
import { cEnum, CEvent } from "../event/event";

import { CameraChangeDetail } from "../type/map.type";

export class JkCamera extends EventTarget {
  viewer: Viewer;
  height = 0;
  level = 0;

  constructor(viewer: Viewer) {
    super();

    this.viewer = viewer;
    this.update();
    this.viewer.camera.changed.addEventListener(this.update);
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

  on<K extends keyof CEvent>(event: K, listener: (event: CEvent[K]) => void) {
    this.addEventListener(event, listener as EventListener);

    return () => {
      this.removeEventListener(event, listener as EventListener);
    };
  }

  destroy() {
    this.viewer.camera.changed.removeEventListener(this.update);
  }
}
