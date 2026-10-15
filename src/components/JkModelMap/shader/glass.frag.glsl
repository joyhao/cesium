void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
  // 读取模型局部坐标系的 Z 值作为高度，不代表真实海拔。
  float height = fsInput.attributes.positionMC.z;

  // 玻璃采用浅青蓝底色，条纹区域混入高亮青色。
  vec3 glassColor = vec3(0.18, 0.72, 0.82);
  vec3 highlightColor = vec3(0.48, 0.95, 1.0);
  material.diffuse = mix(glassColor, highlightColor, 0.55);

  // 设置较低不透明度，让模型呈现半透明玻璃效果。
  material.alpha = 0.38;

  // 少量自发光增强玻璃边缘和条纹的可见度。
  material.emissive = mix(glassColor, highlightColor, 0.5) * 0.18;

  // 低粗糙度使 PBR 高光更集中，玻璃的高光由模型 PBR 光照计算。
  material.roughness = 0.12;
}
