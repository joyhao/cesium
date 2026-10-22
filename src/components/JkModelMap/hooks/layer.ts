import {
  Cesium3DTileset,
  Cesium3DTileFeature,
  Cartesian2,
  Cartesian3,
  Cartographic,
  CustomShader,
  HeadingPitchRange,
  Matrix4,
  Matrix3,
  Transforms,
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
  private removeGlassFrameUpdate?: () => void;
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
      uniforms: {
        // 模型中心的眼空间坐标，由 configureGlassGradient 随相机更新。
        uGradientCenterEC: { type: UniformType.VEC3, value: new Cartesian3() },
        // 将眼空间方向旋转到模型中心的 ENU（东、北、上）坐标系。
        uEyeToGradient: { type: UniformType.MAT3, value: Matrix3.clone(Matrix3.IDENTITY) },
        // ±1 只是初始化占位；模型 0 加载后改为 ±包围球半径，单位米。
        // 这是 XY 方向的近似包围范围，不是模型真实长宽，也不是 UV 坐标。
        uGradientMinXY: { type: UniformType.VEC2, value: new Cartesian2(-1, -1) },
        uGradientMaxXY: { type: UniformType.VEC2, value: new Cartesian2(1, 1) },
      },
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
        this.configureGlassGradient(result.value);
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
                uGradientCenterEC: { type: UniformType.VEC3, value: new Cartesian3() },
                uEyeToGradient: { type: UniformType.MAT3, value: Matrix3.clone(Matrix3.IDENTITY) },
                uGradientMinXY: { type: UniformType.VEC2, value: new Cartesian2(-1, -1) },
                uGradientMaxXY: { type: UniformType.VEC2, value: new Cartesian2(1, 1) },
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

  /** 为模型 0 建立跨瓦片一致的渐变空间；使用包围球近似范围，非精确包围盒。 */
  private configureGlassGradient(tileset: Cesium3DTileset) {
    const shader = this.glassShader;
    if (!shader) return;
    this.removeGlassFrameUpdate?.();
    const centerEC = new Cartesian3();
    const worldToLocal = new Matrix4();
    const eyeToLocal = new Matrix4();
    const rotation = new Matrix3();
    const minXY = new Cartesian2();
    const maxXY = new Cartesian2();
    const update = () => {
      const sphere = tileset.boundingSphere;
      // 世界坐标 → 模型中心 ENU；再组合眼空间 → 世界坐标，得到眼空间 → ENU。
      const frame = Transforms.eastNorthUpToFixedFrame(sphere.center, this.viewer.scene.globe.ellipsoid);
      Matrix4.inverseTransformation(frame, worldToLocal);
      Matrix4.multiply(worldToLocal, this.viewer.camera.inverseViewMatrix, eyeToLocal);
      Matrix4.getMatrix3(eyeToLocal, rotation);
      // shader 先在眼空间减去中心，再旋转，避免直接相减两个巨大的 ECEF 坐标。
      Matrix4.multiplyByPoint(this.viewer.camera.viewMatrix, sphere.center, centerEC);
      // 两轴暂用同一个半径近似，最小值保护可避免 shader 归一化时除以零。
      const radius = Math.max(sphere.radius, 0.001);
      minXY.x = minXY.y = -radius;
      maxXY.x = maxXY.y = radius;
      // 玻璃与内部模型共享范围，模型 shader 延迟创建后也会在渲染前同步。
      for (const target of [shader, this.modelShader]) {
        if (!target) continue;
        target.setUniform("uGradientCenterEC", centerEC);
        target.setUniform("uEyeToGradient", rotation);
        target.setUniform("uGradientMinXY", minXY);
        target.setUniform("uGradientMaxXY", maxXY);
      }
    };
    update();
    // 眼空间随相机变化，每次渲染前更新；destroy 中移除监听。
    this.removeGlassFrameUpdate = this.viewer.scene.preRender.addEventListener(update);
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
    this.removeGlassFrameUpdate?.();
    this.removeGlassFrameUpdate = undefined;
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
