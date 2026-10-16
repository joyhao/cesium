#define MAX_HIGHLIGHT 8

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

  // 命中 uTargetId 数组中任一 featureId 时，用 A->B 渐变覆盖（基于局部高度做渐变 + 时间动画）。
  float fid = float(fsInput.featureIds.featureId_0);
  float time = float(czm_frameNumber) * 0.03;
  for (int i = 0; i < MAX_HIGHLIGHT; i++) {
    if (uTargetId[i] >= 0.0 && abs(fid - uTargetId[i]) < 0.5) {
      // 随时间沿高度流动的渐变
      float t = 0.5 + 0.5 * sin(fsInput.attributes.positionMC.z * 0.15 + time);
      vec3 hiColor = mix(uColorA, uColorB, t);
      // 亮度呼吸脉冲，让高亮要素明显"流动发光"
      float pulse = 0.7 + 0.3 * sin(time * 2.0);
      material.diffuse = hiColor;
      // 提高自发光占比，让高亮要素明显发亮、不被场景光照压暗。
      material.emissive = hiColor * 0.8 * pulse;
      material.roughness = 0.4;
      material.alpha = 1.0;
      break;
    }
  }
}
