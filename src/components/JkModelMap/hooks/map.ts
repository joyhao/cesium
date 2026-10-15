import { JkBase } from "./base";
import { JkLayer } from "./layer";
import { JkCamera } from "./camera";

export class JkMap extends JkBase {
  layer: JkLayer;
  camera: JkCamera;


  private visibilityTimer?: ReturnType<typeof setTimeout>;

  constructor(selector: string) {
    super(selector);

    this.layer = new JkLayer();
    this.camera = new JkCamera();


    // 相机停止更新点位
    this.camera.on("camera_end", () => {
    });
  }

  destroy() {
    this.layer.destroy();
    this.camera.destroy();
    super.destroy();

    if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer);
      this.visibilityTimer = undefined;
    }
  }
}
