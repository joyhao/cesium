import { Viewer } from "cesium";
import { viewerOptions } from "../entity/entity";

export class JkView {
  container: HTMLElement;
  viewer: Viewer;
  constructor(container: HTMLElement) {
    this.container = container;
    this.viewer = new Viewer(this.container, viewerOptions);
  }

  destroy() {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    this.viewer.destroy();
  }
}
