import { Viewer } from "cesium";
import { viewerOptions } from "../entity/entity";

export class JkBase {
  readonly viewer: Viewer;

  constructor(container: HTMLElement) {
    this.viewer = new Viewer(container, viewerOptions);
  }

  destroy() {
    if (!this.viewer.isDestroyed()) this.viewer.destroy();
  }
}
