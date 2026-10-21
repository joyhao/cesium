import {
  Cesium3DTileset,
  Cesium3DTileFeature,
  Cartesian2,
  Cartesian3,
  Cartographic,
  CustomShader,
  HeadingPitchRange,
  Matrix4,
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

// 创建并叠加天地图矢量底图和注记图层。
export class JkLayer extends JkBase {
  viewer: Viewer;
  AppConfig = inject<AppConfig>("AppConfig") as AppConfig;
  private tilesets: Cesium3DTileset[] = [];
  private glassShader?: CustomShader;
  private modelShader?: CustomShader;
  private pickHandler?: ScreenSpaceEventHandler;
  private loadPromise: Promise<void>;
  private destroyed = false;

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
    this.loadPromise = this.loadTileset();
  }

  init() {

    // 控制：模型、实体等对象是否与地球地形进行深度测试，也就是地形能不能挡住它们
    // true：地形可以遮挡对象
    // false（默认）：不让对象被地形按深度遮挡
    this.viewer.scene.globe.depthTestAgainstTerrain = false;
    // Translucent  拾取半透明
    this.viewer.scene.pickTranslucentDepth = false;
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
      // 用于获取屏幕某个位置选中的对象，常用于点击选择模型或构件
      const picked = this.viewer.scene.pick(movement.position) as Cesium3DTileFeature;


      let position: Cartesian3 | undefined;
      if (this.viewer.scene.pickPositionSupported) {
        position = this.viewer.scene.pickPosition(movement.position);

      }
      if (!position) {
        const ray = this.viewer.camera.getPickRay(movement.position);
        if (ray) {
          position = this.viewer.scene.globe.pick(ray, this.viewer.scene);
        }
      }
      if (position && Number.isFinite(position.x)) {
        const cartographic = Cartographic.fromCartesian(position);

        const coordinates = {
          longitude: CesiumMath.toDegrees(cartographic.longitude),
          latitude: CesiumMath.toDegrees(cartographic.latitude),
          height: cartographic.height,
        };

        this.emit("model_position_pick", {
          position,
          ...coordinates,
        });
      }

      if (!picked || !(picked instanceof Cesium3DTileFeature)) {
        if (this.modelShader) {
          this.modelShader.uniforms.uTargetId.value = [
            22, 16, 21, -1, -1, -1, -1, -1,
          ];
        }
        this.emit("model_feature_pick", null);
        return;
      }

      const featureId = picked.featureId;
      if (this.modelShader) {
        this.modelShader.uniforms.uTargetId.value = [
          22,
          16,
          21,
          featureId,
          -1,
          -1,
          -1,
          -1,
        ];
      }


      this.emit("model_feature_pick", {
        name: picked.getProperty("name"),
        featureId,
      });
    }, ScreenSpaceEventType.LEFT_CLICK);

    // 右键结束当前路径，下一次左键点击会开始一条新路径。
    this.pickHandler.setInputAction(() => {
      this.emit("model_path_end", {});
    }, ScreenSpaceEventType.RIGHT_CLICK);


  }

  async loadTileset() {
    const tilesetUrls = this.AppConfig.tilesetUrls;
    // material.diffuse	材质的基础颜色
    // material.roughness	粗糙度，越小高光越集中，越大越柔和
    // material.metallic	金属度
    // material.emissive	自发光颜色
    // material.alpha	不透明度，是否按半透明渲染还取决于透明模式配置
    this.glassShader = new CustomShader({
      // 基于物理的渲染光照模型  , 用来模拟材质在光照下的表现
      lightingModel: LightingModel.PBR,
      translucencyMode: CustomShaderTranslucencyMode.TRANSLUCENT,
      fragmentShaderText: glassFragmentShader,
    });


    // Promise.all()：其中一个失败，整体就会拒绝，但不会自动取消其他任务。
    // Promise.allSettled()：等全部任务结束，再逐个检查成功或失败。
    const results = await Promise.allSettled(
      tilesetUrls.map((url) => Cesium3DTileset.fromUrl(url)),
    );

    if (this.destroyed || this.viewer.isDestroyed()) {
      results.forEach((result) => {
        if (result.status === "fulfilled" && !result.value.isDestroyed()) {
          result.value.destroy();
        }
      });
      return;
    }

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
                uColorA: {
                  type: UniformType.VEC3,
                  value: new Cartesian3(0.65, 0.35, 1.0),
                },
                uColorB: {
                  type: UniformType.VEC3,
                  value: new Cartesian3(0.2, 0.85, 1.0),
                },
              },
            });
          }
          result.value.customShader = this.modelShader;
          this.modelShader.uniforms.uTargetId.value = [
            22, 16, 21, -1, -1, -1, -1, -1,
          ];
        };
        if (result.value.tilesLoaded) {
          attachModelShader();
        }
         else {
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



  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.offAllListeners();
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
