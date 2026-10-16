import {
  Cesium3DTileset,
  Cesium3DTileFeature,
  Cartesian2,
  CustomShader,
  HeadingPitchRange,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  LightingModel,
  CustomShaderTranslucencyMode,
  Math as CesiumMath,
  UrlTemplateImageryProvider,
  Viewer,
} from "cesium";
import { JkBase } from "./base";
import glassFragmentShader from "../shader/glass.frag.glsl";
import modelFragmentShader from "../shader/model.frag.glsl";

// 创建并叠加天地图矢量底图和注记图层。
export class JkLayer extends JkBase {
  viewer: Viewer;
  AppConfig = inject<AppConfig>("AppConfig") as AppConfig;
  private tilesets: Cesium3DTileset[] = [];
  private glassShader?: CustomShader;
  private modelShader?: CustomShader;
  private pickHandler?: ScreenSpaceEventHandler;

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

    // 禁用 Cesium 默认双击缩放，避免拾取要素时相机自动移动。
    this.viewer.screenSpaceEventHandler.removeInputAction(
      ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
    );

    this.pickHandler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.pickHandler.setInputAction((movement: { position: Cartesian2 }) => {
      const feature = this.viewer.scene.pick(movement.position);
      if (!feature) return
      const propertyName = feature.getProperty("name")
      this.emit("model_feature_pick", {
        name: propertyName
      });
    }, ScreenSpaceEventType.LEFT_CLICK);
  }

  async loadTileset() {
    const tilesetUrls = this.AppConfig.tilesetUrls;
    this.glassShader = new CustomShader({
      lightingModel: LightingModel.PBR,
      translucencyMode: CustomShaderTranslucencyMode.TRANSLUCENT,
      fragmentShaderText: glassFragmentShader,
    });
    this.modelShader = new CustomShader({
      lightingModel: LightingModel.PBR,
      fragmentShaderText: modelFragmentShader,
    });

    const results = await Promise.allSettled(
      tilesetUrls.map((url) => Cesium3DTileset.fromUrl(url)),
    );

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `3D Tiles 加载失败：${tilesetUrls[index]}`,
          result.reason,
        );
        return;
      }
      if (index === 0) {
        result.value.customShader = this.glassShader;
      } else if (index === 1) {
        result.value.customShader = this.modelShader;
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
    this.pickHandler?.destroy();
    this.pickHandler = undefined;
    if (!this.viewer.isDestroyed()) {
      this.tilesets.forEach((tileset) => {
        this.viewer.scene.primitives.remove(tileset);
      });
    }
    this.tilesets = [];
    this.glassShader?.destroy();
    this.glassShader = undefined;
    this.modelShader?.destroy();
    this.modelShader = undefined;
  }
}
