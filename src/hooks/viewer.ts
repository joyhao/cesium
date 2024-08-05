import {
  Cartesian3,
  createWorldTerrainAsync,
  UrlTemplateImageryProvider,
  Viewer,
  Math as _Math,
  WebMercatorTilingScheme,
  CameraEventType,
  KeyboardEventModifier,
  HeadingPitchRoll,
  Transforms,
  FeatureDetection
} from 'cesium';
import { MAP } from './entity.ts';
export function useViewer() {
  function getViewer(ele: string) {
    const viewer = new Viewer(ele, {
      infoBox: false,
      animation: false,
      timeline: false,
      homeButton: false,
      geocoder: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      baseLayerPicker: false,
      fullscreenButton: false
      // 地球
      //  globe: false
    });

    // 抗锯齿
    // @ts-ignore
    viewer.scene.fxaa = false;
    viewer.scene.postProcessStages.fxaa.enabled = true;
    // 水雾特效
    viewer.scene.globe.showGroundAtmosphere = true;

    // 高德
    // viewer.imageryLayers.addImageryProvider(
    //   new UrlTemplateImageryProvider({
    //     url: 'http://webst02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scale=1&style=8'
    //   })
    // );

    //start 天地图
    // // 影像图
    // viewer.imageryLayers.addImageryProvider(
    //   new UrlTemplateImageryProvider({
    //     url: MAP.TDT_IMG_W, //url地址
    //     subdomains: MAP.subdomains, //天地图8个服务器
    //     tilingScheme: new WebMercatorTilingScheme(),
    //     maximumLevel: 18
    //   })
    // );

    // // 影像标注
    viewer.imageryLayers.addImageryProvider(
      new UrlTemplateImageryProvider({
        url: MAP.TDT_CVA_W, //url地址
        subdomains: MAP.subdomains, //天地图8个服务器
        tilingScheme: new WebMercatorTilingScheme(),
        maximumLevel: 18
      })
    );

    // // 国界服务
    // viewer.imageryLayers.addImageryProvider(
    //   new UrlTemplateImageryProvider({
    //     url: MAP.TDT_IBO_W, //url地址
    //     subdomains: MAP.subdomains, //天地图8个服务器
    //     tilingScheme: new WebMercatorTilingScheme(),
    //     maximumLevel: 10
    //   })
    // );

    //end 天地图

    const destination = Cartesian3.fromDegrees(106.56924, 29.5304, 100000);
    const heading = _Math.toRadians(90);
    const hpr = new HeadingPitchRoll(heading, 0, 0);
    const orientation = Transforms.headingPitchRollQuaternion(destination, hpr);

    // 将三维球定位到中国
    viewer.camera.flyTo({
      destination: destination,
      orientation: orientation,
      complete: function callback() {
        // 定位完成之后的回调函数
      }
    });

    return viewer;
  }

  return {
    getViewer
  };
}
