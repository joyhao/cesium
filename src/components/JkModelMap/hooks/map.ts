import { Cartesian3, Cartographic } from "cesium";
import { JkBase } from "./base";
import { JkLayer } from "./layer";
import { JkCamera } from "./camera";
import { JkEnergyShield } from "./energyShield";

export class JkMap extends JkBase {
  layer: JkLayer;
  camera: JkCamera;
  shield: JkEnergyShield;


  private visibilityTimer?: ReturnType<typeof setTimeout>;

  constructor(selector: string) {
    super(selector);

    this.layer = new JkLayer();
    this.camera = new JkCamera();
    this.shield = new JkEnergyShield();

    // 模型加载完成后把半圆能量罩罩在模型上，与模型联动。
    void this.layer.ready
      .then(() => {
        const c = this.layer.center;
        const r = this.layer.modelRadius;
        if (c && r > 0) {
          // 底座落在地面、拱到模型顶部，整体放大 1.15 倍让扩散范围更大：ENU 半圆。
          const k = 1.15;
          const carto = Cartographic.fromCartesian(c);
          const ground = Cartesian3.fromRadians(carto.longitude, carto.latitude, 0);
          this.shield.show(ground, { radii: [r * k, r * k, (carto.height + r) * k] });
        }
      })
      .catch(() => {});

    // 相机停止更新点位
    this.camera.on("camera_end", () => {
    });
  }

  resetView() {
    this.layer.resetView();
  }

  destroy() {
    this.layer.destroy();
    this.camera.destroy();
    this.shield.destroy();
    super.destroy();

    if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer);
      this.visibilityTimer = undefined;
    }
  }
}
