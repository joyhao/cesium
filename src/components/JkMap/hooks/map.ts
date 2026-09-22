import { JkBase } from "./base";
import { query } from "../utils";
import { JkLayer } from "./layer";
import { JkFly } from "./fly";
import { JkCamera } from "./camera";
import { JkPoints } from "./points";
// 地图门面类：统一组装 Viewer、底图、相机、飞行和点位模块。
export class JkMap extends JkBase {
  layer: JkLayer;
  fly: JkFly;
  camera: JkCamera;
  points: JkPoints;
  constructor(selector: string) {
    super(selector);

    this.layer = new JkLayer();
    this.fly = new JkFly();
    this.camera = new JkCamera();

    this.points = new JkPoints();

    // 相机变化后延迟同步视口内点位，避免连续拖动时频繁增删 Entity。
    this.camera.on("camera_change", () => {
      this.points.scheduleVisibilityUpdate();
    });
  }

  destroy() {
    this.points.destroy();
    this.camera.destroy();
    super.destroy();
  }
}
