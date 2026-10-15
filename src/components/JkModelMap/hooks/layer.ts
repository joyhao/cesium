import {
  Cesium3DTileset,
  HeadingPitchRange,
  Math as CesiumMath,
  UrlTemplateImageryProvider,
  Viewer,
} from "cesium";
import { JkBase } from "./base";

// 创建并叠加天地图矢量底图和注记图层。
export class JkLayer extends JkBase {
  viewer: Viewer;
  AppConfig = inject<AppConfig>("AppConfig") as AppConfig;
  private tilesets: Cesium3DTileset[] = [];

  constructor() {
    super();
    this.viewer = JkBase.viewer;
    this.init();
    void this.loadTileset();
  }



  init() {
    const { token, vector, subdomains, cia } = this.AppConfig;

    const baseProvider = new UrlTemplateImageryProvider({
      url: `${vector}${token}`,
      subdomains,
      credit: "天地图",
      maximumLevel: 18,
    });
    const annotationProvider = new UrlTemplateImageryProvider({
      url: `${cia}${token}`,
      subdomains,
      credit: "天地图注记",
      maximumLevel: 18,
    });

    this.viewer.imageryLayers.addImageryProvider(baseProvider);
    this.viewer.imageryLayers.addImageryProvider(annotationProvider);
  }

  async loadTileset() {
    const tilesetUrls = this.AppConfig.tilesetUrls;
    const results = await Promise.allSettled(
      tilesetUrls.map((url) => Cesium3DTileset.fromUrl(url)),
    );

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`3D Tiles 加载失败：${tilesetUrls[index]}`, result.reason);
        return;
      }

      this.tilesets.push(result.value);
      this.viewer.scene.primitives.add(result.value);
    });

    const tileset = this.tilesets[0];
    await this.viewer.zoomTo(
      tileset,
      // heading 水平方向的朝向角  0 表示正北朝向，pitch俯仰角  为 -90° 实现正上方俯视；range：相机到目标的距离 。
      new HeadingPitchRange(0, -CesiumMath.PI_OVER_TWO, tileset.boundingSphere.radius * 2),
    );
  }

  destroy() {
    if (!this.viewer.isDestroyed()) {
      this.tilesets.forEach((tileset) => {
        this.viewer.scene.primitives.remove(tileset);
      });
    }
    this.tilesets = [];
  }


}
