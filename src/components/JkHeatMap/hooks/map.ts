import { Cartesian3, Math as CesiumMath } from "cesium";
import { JkBase } from "./base";
import { JkLayer } from "./layer";
import { JkCamera } from "./camera";

export class JkMap extends JkBase {
  readonly layer: JkLayer;
  readonly camera: JkCamera;

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
  }

  destroy() {
    this.camera.destroy();
    this.layer.destroy();
    super.destroy();
  }
}
