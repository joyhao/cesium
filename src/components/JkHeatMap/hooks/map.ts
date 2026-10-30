import { Cartesian3 } from "cesium";
import { JkBase } from "./base";
import { JkLayer } from "./layer";

export class JkMap extends JkBase {
  readonly layer: JkLayer;

  constructor(container: HTMLElement, config: AppConfig) {
    super(container);
    this.layer = new JkLayer(this.viewer, config);
    const { longitude, latitude, height } = config.city;
    this.viewer.camera.setView({
      destination: Cartesian3.fromDegrees(longitude, latitude, height),
    });
  }

  destroy() {
    this.layer.destroy();
    super.destroy();
  }
}
