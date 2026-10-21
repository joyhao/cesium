void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
  // 局部 X 在 0～100 范围内，从 glassColor 线性过渡到 highlightColor。
  float x = fsInput.attributes.positionMC.y;
  const float minX = 0.0;
  const float maxX = 100.0;
  float t = clamp((x - minX) / (maxX - minX), 0.0, 1.0);
  // 临时可视化 t：黑色为 0，白色为 1，灰色为中间值。
  material.diffuse = vec3(0.0);
  material.emissive = vec3(t);
  material.alpha = 1.0;

  // 低粗糙度使 PBR 高光更集中，玻璃的高光由模型 PBR 光照计算。
  material.roughness = 0.12;
}
