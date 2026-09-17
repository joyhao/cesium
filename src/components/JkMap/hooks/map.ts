import { Viewer } from "cesium";
import { CEvent } from "../event/event";
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

  on<K extends keyof CEvent>(event: K, listener: (event: CEvent[K]) => void) {
    this.camera.addEventListener(event, listener as EventListener);

    return () => {
      this.camera.removeEventListener(event, listener as EventListener);
    };
  }

  destroy() {
    this.view.destroy();
    this.camera.destroy();
  }
}
