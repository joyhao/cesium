import {
  Cartesian3,
  Color,
  EllipsoidGeometry,
  GeometryInstance,
  Material,
  MaterialAppearance,
  Math as CesiumMath,
  Matrix4,
  Primitive,
  Transforms,
  VertexFormat,
  Viewer,
} from "cesium";
import { cEnum } from "../event/event";
import { JkBase } from "./base";

import shieldMaterialSource from "../shader/shield.glsl";

export interface JkShieldOptions {
  // 椭球三个半轴半径（米），默认球形；改成 [r, r, r * 0.5] 可当罩在楼顶的圆顶。
  radii?: [number, number, number];
  color?: Color;
  opacity?: number;
}

interface ResolvedShieldOptions {
  radii: [number, number, number];
  color: Color;
  opacity: number;
}

// 能量罩：在指定世界坐标渲染半透明发光椭球"护罩"，动画由 czm_frameNumber 驱动。
export class JkEnergyShield extends JkBase {
  viewer: Viewer;
  private primitive?: Primitive;
  private destroyed = false;
  private material?: Material;
  private options: ResolvedShieldOptions = {
    radii: [50, 50, 50],
    color: Color.fromCssColorString("#33d6ff"),
    opacity: 1.0,
  };

  constructor() {
    super();
    this.viewer = JkBase.viewer;
  }

  private ensureMaterial(): Material {
    if (this.material) return this.material;
    this.material = new Material({
      fabric: {
        type: "EnergyShield",
        uniforms: {
          uColor: this.options.color,
          uOpacity: this.options.opacity,
        },
        source: shieldMaterialSource,
      },
    });
    return this.material;
  }

  // 在 center 显示/更新能量罩；options 省略时沿用上次配置。
  show(center: Cartesian3, options?: JkShieldOptions) {
    if (this.destroyed || this.viewer.isDestroyed()) return;
    if (options) {
      this.options = {
        radii: options.radii ?? this.options.radii,
        color: options.color ?? this.options.color,
        opacity: options.opacity ?? this.options.opacity,
      };
    }

    const material = this.ensureMaterial();
    material.uniforms.uColor = this.options.color;
    material.uniforms.uOpacity = this.options.opacity;

    if (this.primitive) {
      // 仅更新位置：半径变化需重建几何（见 setRadii）。ENU 朝向使半圆底座水平对齐地面。
      this.primitive.modelMatrix = Transforms.eastNorthUpToFixedFrame(center);
      return;
    }

    const geometry = new EllipsoidGeometry({
      radii: new Cartesian3(this.options.radii[0], this.options.radii[1], this.options.radii[2]),
      // 只取上半球（圆锥 0~90°），形成半圆穹顶而非整球。
      minimumCone: 0.0,
      maximumCone: CesiumMath.PI_OVER_TWO,
      vertexFormat: VertexFormat.POSITION_NORMAL_AND_ST,
    });
    // ENU 朝向：局部 +Z 对齐当地"上"，半圆底座水平落在 center 所在平面（调用方把 center 设为地面点）。
    this.primitive = new Primitive({
      geometryInstances: new GeometryInstance({ geometry }),
      modelMatrix: Transforms.eastNorthUpToFixedFrame(center),
      appearance: new MaterialAppearance({
        material,
        translucent: true,
        closed: false,
      }),
      // 护罩不拦截拾取，避免遮挡下方要素高亮。
      allowPicking: false,
      asynchronous: false,
    });
    this.viewer.scene.primitives.add(this.primitive);

    this.emit(cEnum.shield_change, { visible: true });
  }

  hide() {
    if (this.primitive) this.primitive.show = false;
    this.emit(cEnum.shield_change, { visible: false });
  }

  showAgain() {
    if (this.primitive) this.primitive.show = true;
    this.emit(cEnum.shield_change, { visible: true });
  }

  setColor(color: Color) {
    this.options.color = color;
    if (this.material) this.material.uniforms.uColor = color;
  }

  setOpacity(opacity: number) {
    this.options.opacity = opacity;
    if (this.material) this.material.uniforms.uOpacity = opacity;
  }

  setRadii(radii: [number, number, number]) {
    if (!this.primitive) {
      this.options.radii = radii;
      return;
    }
    // 半径变化需重建几何：移除旧 primitive 后以新半径重建（保留位置与显隐）。
    const center = Matrix4.getTranslation(this.primitive.modelMatrix, new Cartesian3());
    const wasShown = this.primitive.show;
    this.viewer.scene.primitives.remove(this.primitive);
    this.primitive = undefined;
    this.show(center, { radii });
    if (!wasShown) {
      this.primitive!.show = false;
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.offAllListeners();
    if (this.primitive && !this.viewer.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.primitive);
    }
    this.primitive = undefined;
    this.material = undefined;
  }
}
