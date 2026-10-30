import { ImageryLayer, UrlTemplateImageryProvider, Viewer } from "cesium";

export class JkLayer {
  private layers: ImageryLayer[] = [];

  constructor(private readonly viewer: Viewer, config: AppConfig) {
    const { token, vector, cia, subdomains } = config;
    this.layers = [
      viewer.imageryLayers.addImageryProvider(new UrlTemplateImageryProvider({
        url: `${vector}${token}`,
        subdomains,
        credit: "天地图",
        maximumLevel: 18,
      })),
      viewer.imageryLayers.addImageryProvider(new UrlTemplateImageryProvider({
        url: `${cia}${token}`,
        subdomains,
        credit: "天地图注记",
        maximumLevel: 18,
      })),
    ];
  }

  destroy() {
    if (!this.viewer.isDestroyed()) {
      this.layers.forEach((layer) => this.viewer.imageryLayers.remove(layer, true));
    }
    this.layers = [];
  }
}
