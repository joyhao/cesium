import { Cartesian3, Math as CesiumMath } from "cesium";
import { JkBase } from "./base";
import { JkLayer } from "./layer";
import { JkCamera } from "./camera";
import { JkHeatMap } from "./heatMap";

export class JkMap extends JkBase {
  readonly layer: JkLayer;
  readonly camera: JkCamera;
  /**
   * 立体热力图模块，供外部传入数据、读取范围和调试坐标转换。
   */
  readonly heatMap: JkHeatMap;

  constructor(container: HTMLElement, config: AppConfig) {
    super(container);
    this.layer = new JkLayer(this.viewer, config);
    const { longitude, latitude, height, heading, pitch, roll } = config.heartMapCameraView;
    this.viewer.camera.setView({
      destination: Cartesian3.fromDegrees(longitude, latitude, height),
      orientation: {
        heading: CesiumMath.toRadians(heading),
        pitch: CesiumMath.toRadians(pitch),
        roll: CesiumMath.toRadians(roll),
      },
    });
    this.camera = new JkCamera(this.viewer);
    this.heatMap = new JkHeatMap(this.viewer);
  }

  destroy() {
    // 先释放热力图图元，再由基类销毁 Viewer。
    this.heatMap.destroy();
    this.camera.destroy();
    this.layer.destroy();
    super.destroy();
  }
}
