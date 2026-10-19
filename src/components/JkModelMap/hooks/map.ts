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
  private shieldHidden = false;

  constructor(selector: string) {
    super(selector);

    this.layer = new JkLayer();
    this.camera = new JkCamera();
    this.shield = new JkEnergyShield();

    // 模型加载完成后把半圆能量罩罩在模型上，与模型联动。
    this.layer.ready
      .then(() => {
        const c = this.layer.center;
        const r = this.layer.modelRadius;
        if (!c || r <= 0) return;
        // 底座落在地面、拱到模型顶部，整体放大 1.15 倍让扩散范围更大：ENU 半圆。
        const k = 1.15;
        const carto = Cartographic.fromCartesian(c);
        const ground = Cartesian3.fromRadians(carto.longitude, carto.latitude, 0);
        this.shield.show(ground, { radii: [r * k, r * k, (carto.height + r) * k] });
        // 依据当前相机距离决定初始显隐。
        this.updateShieldVisibility();
      })

    // 相机移动时按距离切换能量罩：贴近模型则隐藏，拉远则显示。
    this.camera.on("camera_change", () => {
      this.updateShieldVisibility();
    });
  }

  // 相机贴近模型时隐藏能量罩避免遮挡，拉远则显示；带迟滞避免临界抖动。
  private updateShieldVisibility() {
    const c = this.layer.center;
    const r = this.layer.modelRadius;
    if (!c || r <= 0) return;
    const dist = Cartesian3.distance(this.camera.viewer.camera.positionWC, c);
    if (dist < r * 1.5) {
      if (!this.shieldHidden) {
        this.shield.hide();
        this.shieldHidden = true;
      }
    } else if (dist > r * 2.0) {
      if (this.shieldHidden) {
        this.shield.showAgain();
        this.shieldHidden = false;
      }
    }
  }

  resetView() {
    this.layer.resetView();
  }

  switchView() {
    this.layer.switchView();
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
