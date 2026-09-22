import { Cartesian3, Viewer } from "cesium";
import { JkBase } from "./base";

// 根据全局配置执行地图初始定位。
export class JkFly extends JkBase {
  viewer: Viewer;
  AppConfig = inject<AppConfig>("AppConfig") as AppConfig;

  constructor() {
    super();
    this.viewer = JkBase.viewer;
    this.init();
  }

  init() {
    const { city } = this.AppConfig;

    const { longitude, latitude, height } = city;

    this.viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(longitude, latitude, height),
      duration: 3,
    });
  }
}
