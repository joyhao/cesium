import {
  Cesium3DTileset,
  Cesium3DTileFeature,
  Cartesian2,
  Cartesian3,
  CustomShader,
  HeadingPitchRange,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  LightingModel,
  CustomShaderTranslucencyMode,
  UniformType,
  Math as CesiumMath,
  UrlTemplateImageryProvider,
  Viewer,
} from "cesium";
import { JkBase } from "./base";
import glassFragmentShader from "../shader/glass.frag.glsl";
import modelFragmentShader from "../shader/model.frag.glsl";
import { JkPlane } from "./plane";

// 创建并叠加天地图矢量底图和注记图层。
export class JkLayer extends JkBase {
  viewer: Viewer;
  AppConfig = inject<AppConfig>("AppConfig") as AppConfig;
  private tilesets: Cesium3DTileset[] = [];
  private glassShader?: CustomShader;
  private modelShader?: CustomShader;
  private pickHandler?: ScreenSpaceEventHandler;
  private loadPromise: Promise<void>;
  plane: JkPlane;

  // 承载高亮着色器的 tileset（index 1 为模型，缺失时退回玻璃 index 0），
  // 供能量罩等外部模块与模型位置联动。
  get modelTileset(): Cesium3DTileset | undefined {
    return this.tilesets[1] ?? this.tilesets[0];
  }

  // 模型中心（ECEF 世界坐标），能量罩定位用。
  get center(): Cartesian3 | undefined {
    return this.modelTileset?.boundingSphere.center;
  }

  // 模型包围球半径（米），能量罩尺寸用。
  get modelRadius(): number {
    return this.modelTileset?.boundingSphere.radius ?? 0;
  }

  // 瓦片加载完成时机，供外部在模型就绪后联动。
  get ready(): Promise<void> {
    return this.loadPromise;
  }


  constructor() {
    super();
    this.viewer = JkBase.viewer;
    this.init();
    this.plane = new JkPlane();
    this.loadPromise = this.loadTileset();
  }



  init() {
    // 玻璃 tileset 为半透明，拾取时也需要写入其深度，避免落点穿到下方地球。
    this.viewer.scene.pickTranslucentDepth = true;
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
      const picked = this.viewer.scene.pick(movement.position);
      if (!picked || !(picked instanceof Cesium3DTileFeature)) {
        if (this.modelShader) {
          this.modelShader.uniforms.uTargetId.value = [22, 16, 21, -1, -1, -1, -1, -1];
        }
        this.emit("model_feature_pick", null);
        return;
      }

      const featureId = picked.featureId;
      if (this.modelShader) {
        this.modelShader.uniforms.uTargetId.value = [22, 16, 21, featureId, -1, -1, -1, -1];
      }
      this.emit("model_feature_pick", {
        name: picked.getProperty("name"),
        featureId,
      });
    }, ScreenSpaceEventType.LEFT_CLICK);

    // 默认显示地球（球体与贴图）。运行时可用 setGlobeVisible(false) 隐藏。
    this.setGlobeVisible(true);
  }

  async loadTileset() {
    const tilesetUrls = this.AppConfig.tilesetUrls;
    this.glassShader = new CustomShader({
      lightingModel: LightingModel.PBR,
      translucencyMode: CustomShaderTranslucencyMode.TRANSLUCENT,
      fragmentShaderText: glassFragmentShader,
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
        // 等 Cesium 完成该 tileset 的 featureId 计算后再创建并绑定着色器，
        // 避免编译时 featureId 通道尚未就绪导致 fsInput.featureIds.featureId_0 报错。
        const attachModelShader = () => {
          if (!this.modelShader) {
            this.modelShader = new CustomShader({
              lightingModel: LightingModel.PBR,
              fragmentShaderText: modelFragmentShader,
              uniforms: {
                uTargetId: {
                  type: "float[8]" as unknown as UniformType,
                  value: new Float32Array(8).fill(-1),
                },
                uColorA: { type: UniformType.VEC3, value: new Cartesian3(0.65, 0.35, 1.0) },
                uColorB: { type: UniformType.VEC3, value: new Cartesian3(0.2, 0.85, 1.0) },
              },
            });
          }
          result.value.customShader = this.modelShader;
          this.modelShader.uniforms.uTargetId.value = [22, 16, 21, -1, -1, -1, -1, -1];
        };
        if (result.value.tilesLoaded) {
          attachModelShader();
        } else {
          result.value.allTilesLoaded.addEventListener(attachModelShader);
        }
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


  switchView() {
    const tileset = this.tilesets[0];
    if (!tileset) return;

    void this.viewer.flyTo(tileset, {
      offset: new HeadingPitchRange(
        CesiumMath.toRadians(76.8),
        CesiumMath.toRadians(-35.8),
        tileset.boundingSphere.radius * 1.5,
      ),
      duration: 1.5,
    });
  }



  // 显隐地球（球体与贴图）。隐藏后场景只显示 3D Tiles 模型与能量罩。
  setGlobeVisible(visible: boolean) {
    this.viewer.scene.globe.show = visible;
  }

  destroy() {
    this.plane.destroy();
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
