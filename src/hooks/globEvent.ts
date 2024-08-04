import {
  Cartographic,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer,
  Math as _Math
} from 'cesium';

export function useGlobEvent(viewer: Viewer) {
  // 开启深度检测
  viewer.scene.globe.depthTestAgainstTerrain = true;
  //定义canvas屏幕点击事件
  var handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

  function _onClick(event: ScreenSpaceEventHandler.PositionedEvent) {
    //定义一个屏幕点击的事件，pickPosition封装的是获取点击的位置的坐标
    var position = viewer.scene.pickPosition(event.position);
    if (!position) return;
    console.log('笛卡尔3：', position);
    //将笛卡尔坐标转化为弧度坐标
    var cartographic = Cartographic.fromCartesian(position);
    console.log('弧度：', cartographic);

    //将弧度坐标转换为经纬度坐标
    var longitude = _Math.toDegrees(cartographic.longitude); //经度
    var latitude = _Math.toDegrees(cartographic.latitude); //纬度
    var height = cartographic.height; //高度
    console.log('经纬度：', longitude, latitude, height);
  }

  function onClick() {
    handler.setInputAction(_onClick, ScreenSpaceEventType.LEFT_CLICK);
  }

  onClick();

  return {};
}
