void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
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

  // 命中目标 featureId 时，用 A->B 渐变覆盖（基于局部高度做渐变）。
  if (uTargetId >= 0.0 && abs(float(fsInput.featureIds.featureId_0) - uTargetId) < 0.5) {
    float t = 0.5 + 0.5 * sin(fsInput.attributes.positionMC.z * 0.15);
    vec3 hiColor = mix(uColorA, uColorB, t);
    material.diffuse = hiColor;
    // 提高自发光占比，让高亮要素明显发亮、不被场景光照压暗。
    material.emissive = hiColor * 0.8;
    material.roughness = 0.4;
    material.alpha = 1.0;
  }
}
