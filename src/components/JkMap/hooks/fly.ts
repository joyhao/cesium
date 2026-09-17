import { Cartesian3, Viewer } from "cesium";

export class JkFly {
  viewer: Viewer;
  AppConfig = inject<AppConfig>("AppConfig") as AppConfig;

  constructor(viewer: Viewer) {
    this.viewer = viewer;
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
