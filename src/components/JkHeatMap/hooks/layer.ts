import { ImageryLayer, UrlTemplateImageryProvider, Viewer } from "cesium";
import Tdt3dPlug from "tdt-terrain-cesium-plugin";

export class JkLayer {
  private layers: ImageryLayer[] = [];
  private labels?: InstanceType<typeof Tdt3dPlug.GeoWTFS>;
  private removeInitialLabels?: () => void;

  constructor(private readonly viewer: Viewer, config: AppConfig) {
    const { token, vector, subdomains } = config;
    this.layers = [
      viewer.imageryLayers.addImageryProvider(new UrlTemplateImageryProvider({
        url: `${vector}${token}`,
        subdomains,
        credit: "天地图",
        maximumLevel: 18,
      })),
    ];
    const serviceUrl = "https://t{s}.tianditu.gov.cn/mapservice/";
    this.labels = new Tdt3dPlug.GeoWTFS(viewer, {
      url: `${serviceUrl}GetTiles?lxys={z},{x},{y}&VERSION=1.0.0&tk=${encodeURIComponent(token)}`,
      icoUrl: `${serviceUrl}GetIcon?id={id}&tk=${encodeURIComponent(token)}`,
      subdomains,
      metadata: {
        boundBox: { minX: -180, minY: -90, maxX: 180, maxY: 90 },
        minLevel: 1,
        maxLevel: 20,
      },
      aotuCollide: true,
      collisionPadding: [5, 10, 8, 5],
      serverFirstStyle: true,
    });
    this.removeInitialLabels = viewer.scene.globe.tileLoadProgressEvent.addEventListener((pending: number) => {
      if (pending !== 0 || !viewer.scene.globe.tilesLoaded) return;
      this.removeInitialLabels?.();
      this.removeInitialLabels = undefined;
      this.labels?.activate();
    });
  }

  destroy() {
    this.removeInitialLabels?.();
    this.removeInitialLabels = undefined;
    this.labels?.destroy();
    this.labels = undefined;
    if (!this.viewer.isDestroyed()) {
      this.layers.forEach((layer) => this.viewer.imageryLayers.remove(layer, true));
    }
    this.layers = [];
  }
}
