import { JkBase } from "./base";
import { query } from "../utils";
import { JkLayer } from "./layer";
import { JkFly } from "./fly";
import { JkCamera } from "./camera";
import { JkPoints } from "./points";
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
  }

  destroy() {
    this.points.destroy();
    this.camera.destroy();
    super.destroy();
  }
}
