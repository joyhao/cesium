import {
  Cesium3DTileset,
  CustomShader,
  HeadingPitchRange,
  LightingModel,
  Math as CesiumMath,
  UrlTemplateImageryProvider,
  Viewer,
} from "cesium";
import { JkBase } from "./base";
import tilesetFragmentShader from "../shader/tileset.frag.glsl";

// 创建并叠加天地图矢量底图和注记图层。
export class JkLayer extends JkBase {
  viewer: Viewer;
  AppConfig = inject<AppConfig>("AppConfig") as AppConfig;
  private tilesets: Cesium3DTileset[] = [];
  private customShader?: CustomShader;

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
    this.customShader = new CustomShader({
      lightingModel: LightingModel.UNLIT,
      fragmentShaderText: tilesetFragmentShader,
    });

    const results = await Promise.allSettled(
      tilesetUrls.map((url) => Cesium3DTileset.fromUrl(url)),
    );

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`3D Tiles 加载失败：${tilesetUrls[index]}`, result.reason);
        return;
      }
      if (index === 0) {
      result.value.customShader = this.customShader;
        
      }
      this.tilesets.push(result.value);
      this.viewer.scene.primitives.add(result.value);
    });

    this.resetView();
  }


  resetView() {
    const tileset = this.tilesets[0];

    void this.viewer.zoomTo(
      tileset,
      new HeadingPitchRange(
        CesiumMath.toRadians(this.AppConfig.cameraView.heading),
        CesiumMath.toRadians(this.AppConfig.cameraView.pitch),
        tileset.boundingSphere.radius * 2,
      ),
    );
  }


  destroy() {
    if (!this.viewer.isDestroyed()) {
      this.tilesets.forEach((tileset) => {
        this.viewer.scene.primitives.remove(tileset);
      });
    }
    this.tilesets = [];
    this.customShader?.destroy();
    this.customShader = undefined;
  }


}
