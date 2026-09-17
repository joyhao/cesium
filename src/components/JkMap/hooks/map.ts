import { Viewer } from "cesium";
import { JkView } from "./view";
import { query } from "../utils";
import { JkLayer } from "./layer";
import { JkFly } from "./fly";
import { JkCamera } from "./camera";

export class JkMap {
  container: HTMLElement;
  view: JkView;
  viewer: Viewer;
  layer: JkLayer;
  fly: JkFly;
  camera: JkCamera;
  constructor(selector: string) {
    this.container = query(selector);
    this.view = new JkView(this.container);
    this.viewer = this.view.viewer;
    this.layer = new JkLayer(this.viewer);
    this.fly = new JkFly(this.viewer);
    this.camera = new JkCamera(this.viewer);
  }

  destroy() {
    this.view.destroy();
    this.camera.destroy();
  }
}
