void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
  // X、Y 方向等权叠加，形成局部 XY 平面上的对角线渐变。
  vec2 position = fsInput.attributes.positionMC.xy;
  const vec2 minXY = vec2(0.0, 0.0);
  const vec2 maxXY = vec2(100.0, 100.0);
  vec2 normalized = (position - minXY) / (maxXY - minXY);
  float t = clamp((normalized.x + normalized.y) * 0.5, 0.0, 1.0);
  vec3 startColor = vec3(0.012, 0.0, 0.047);
  vec3 endColor = vec3(1.0, 1.0, 1.0);
  vec3 gradientColor = mix(startColor, endColor, t);
  material.diffuse = gradientColor;
  material.emissive = gradientColor * 0.18;
  material.alpha = 0.38;

  // 低粗糙度使 PBR 高光更集中，玻璃的高光由模型 PBR 光照计算。
  material.roughness = 0.12;
}