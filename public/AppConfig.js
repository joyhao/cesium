window.AppConfig = {
  token: "7b56707d6a4618fb1835e58163ba2e10",
  tilesetUrls: [
    "http://localhost:9528/static/zibobeizuoyequ-ground/tileset.json",
    "http://localhost:9528/static/zibobeizuoyequ-manual/tileset.json",
  ],
  cameraView: {
    heading: 178.1,
    pitch: -35.6,
  },
  // 热力图独立初始视角，不影响模型地图使用的 cameraView。
  heartMapCameraView: {
    longitude: 116.468116, // 相机经度，单位度。
    latitude: 39.853439, // 相机纬度，单位度。
    height: 1715, // 相机相对参考椭球面的高度，单位米，不是距地面高度。
    level: 15, // 参考层级；界面仍根据实际相机高度估算，不直接用此值定位。
    heading: 352.1, // 航向角，单位度，0 朝北、90 朝东。
    pitch: -13.0, // 俯仰角，单位度，0 为水平，-90 为垂直向下。
    roll: 0.0, // 翻滚角，单位度，0 表示不侧倾。
  },
  vector:
    "https://{s}.tianditu.gov.cn/vec_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=vec&tileMatrixSet=w&TileMatrix={z}&TileRow={y}&TileCol={x}&style=default&format=tiles&tk=",
  cia: "https://{s}.tianditu.gov.cn/cia_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=cia&tileMatrixSet=w&TileMatrix={z}&TileRow={y}&TileCol={x}&style=default&format=tiles&tk=",
  subdomains: ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"],
  city: {
    longitude: 116.3975,
    latitude: 39.9087,
    height: 56095,
  },
};
