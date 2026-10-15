import { Viewer, Event, Math as ViewerMath } from "cesium";
import { cEnum } from "../event/event";

import { JkBase } from "./base";

// 监听 Cesium 相机变化，并向上层发布高度和层级信息。
export class JkCamera extends JkBase {
  viewer: Viewer;
  height = 0;
  level = 0;
  // 收集所有事件监听的移除函数，destroy 时统一执行，避免每个监听写一对字段。
  private disposers: Event.RemoveCallback[] = [];

  constructor() {
    super();

    this.viewer = JkBase.viewer;

    this.disposers.push(
      this.viewer.camera.changed.addEventListener(this.update),
      this.viewer.camera.moveStart.addEventListener(this.start),
      this.viewer.camera.moveEnd.addEventListener(this.end),
    );
  }

  private update = () => {
    const camera = this.viewer.camera;
    const height = camera.positionCartographic.height;
    this.height = Math.round(height);
    this.level = this.heightToLevel(height);

    this.emit(cEnum.camera_change, {
      height: this.height,
      level: this.level,
      heading: ViewerMath.toDegrees(camera.heading),
      pitch: ViewerMath.toDegrees(camera.pitch),
      roll: ViewerMath.toDegrees(camera.roll),
    });
  };

  private start = () => {
    this.emit(cEnum.camera_start, {});
  };

  private end = () => {
    this.emit(cEnum.camera_end, {});
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
    this.offAllListeners();
    this.disposers.forEach((dispose) => dispose());
    this.disposers = [];
  }
}
