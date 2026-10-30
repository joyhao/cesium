// Cesium 材质入口，逐片元计算圆盘颜色；圆形轮廓由外部 CircleGeometry 提供。
czm_material czm_getMaterial(czm_materialInput materialInput) {
  // 初始化默认材质，再覆盖颜色和透明度。
  czm_material material = czm_getDefaultMaterial(materialInput);

  // st 为二维纹理坐标，(0.5, 0.5) 为中心；length 计算到中心的距离，不是实际米数。
  float radius = length(materialInput.st - vec2(0.5));

  // step：radius < 0.42 返回 0，否则返回 1。
  // mix：参数为 0 时取青色，为 1 时取白色，形成青色内圆和白色外圈，非平滑渐变。
  material.diffuse = mix(vec3(0.0, 1.0, 1.0), vec3(1.0), step(0.42, radius));

  // 1.0 表示完全不透明。
  material.alpha = 1.0;
  return material;
}
