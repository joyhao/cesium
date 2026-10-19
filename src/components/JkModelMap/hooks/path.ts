import {
  Cartesian2,
  Cartesian3,
  Color,
  ArcType,
  GeometryInstance,
  Material,
  MaterialAppearance,
  Cartographic,
  CircleGeometry,
  PolylineGeometry,
  PolylineMaterialAppearance,
  Primitive,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer,
} from "cesium";
import { JkBase } from "./base";
import pathMaterialSource from "../shader/path.glsl";

// 单条路径：左键逐点落点，至少两个点时按相邻点生成贝塞尔曲线。
export class JkPath extends JkBase {
  viewer: Viewer;

  constructor() {
    super();
    this.viewer = JkBase.viewer;
  }



}
