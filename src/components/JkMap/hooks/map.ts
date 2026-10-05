import { JkBase } from "./base";
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

  private visibilityTimer?: ReturnType<typeof setTimeout>;
  // 拖动期间实时同步的定时器句柄，moveEnd 时清除。
  private dragSyncTimer?: number;

  constructor(selector: string) {
    super(selector);

    this.layer = new JkLayer();
    this.fly = new JkFly();
    this.camera = new JkCamera();

    this.points = new JkPoints();

    // 相机变化（缩放/飞行等）后延迟同步视口内点位
    this.camera.on("camera_change", () => {
      this.points.scheduleVisibilityUpdate();
    });

    // 拖动地图：moveStart 起按间隔实时同步，moveEnd 停掉循环并补最后一次。
    this.camera.on("camera_start", () => {
      if (this.dragSyncTimer) return;
      this.dragSyncTimer = window.setInterval(() => {
        this.points.syncVisiblePoints();
      }, 150);
    });
    this.camera.on("camera_end", () => {
      if (this.dragSyncTimer) {
        clearInterval(this.dragSyncTimer);
        this.dragSyncTimer = undefined;
      }
      this.points.syncVisiblePoints();
    });
  }

  destroy() {
    this.points.destroy();
    this.camera.destroy();
    super.destroy();

    if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer);
      this.visibilityTimer = undefined;
    }
    if (this.dragSyncTimer) {
      clearInterval(this.dragSyncTimer);
      this.dragSyncTimer = undefined;
    }
  }
}
