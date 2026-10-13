import { JkBase } from "./base";
import { JkLayer } from "./layer";
import { JkFly } from "./fly";
import { JkCamera } from "./camera";
import { JkPoints } from "./points";
import { JkLines } from "./lines";
// 地图门面类：统一组装 Viewer、底图、相机、飞行和点位模块。
export class JkMap extends JkBase {
  layer: JkLayer;
  fly: JkFly;
  camera: JkCamera;
  points: JkPoints;
  lines: JkLines;

  private visibilityTimer?: ReturnType<typeof setTimeout>;

  constructor(selector: string) {
    super(selector);

    this.lines = new JkLines(this.bus);
    this.layer = new JkLayer();
    this.fly = new JkFly();
    this.camera = new JkCamera(this.bus);

    this.points = new JkPoints(this.bus);

    // 相机变化（缩放/飞行等）后延迟同步视口内点位
    // this.camera.on("camera_change", () => {
    //   this.points.scheduleVisibilityUpdate();
    // });

    // 相机停止更新点位
    this.camera.on("camera_end", () => {
      this.points.syncVisiblePoints();
    });
  }

  destroy() {
    this.lines.destroy();
    this.points.destroy();
    this.camera.destroy();
    super.destroy();

    if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer);
      this.visibilityTimer = undefined;
    }
  }
}
