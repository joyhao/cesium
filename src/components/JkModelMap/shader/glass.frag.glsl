void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
  // 各瓦片统一到模型中心的 ENU 坐标系，范围由模型 0 的包围球传入。
  vec3 position = uEyeToGradient * (fsInput.attributes.positionEC - uGradientCenterEC);
  vec2 normalized = (position.xy - uGradientMinXY) / (uGradientMaxXY - uGradientMinXY);
  float t = clamp((normalized.x + normalized.y) * 0.5, 0.0, 1.0);
  vec3 startColor = vec3(0.10, 0.22, 0.55);
  vec3 endColor = vec3(0.25, 0.90, 0.85);
  vec3 gradientColor = mix(startColor, endColor, t);
  material.diffuse = gradientColor;
  material.emissive = gradientColor * 0.18;
  material.alpha = 0.38;

  // 低粗糙度使 PBR 高光更集中，玻璃的高光由模型 PBR 光照计算。
  material.roughness = 0.12;
}