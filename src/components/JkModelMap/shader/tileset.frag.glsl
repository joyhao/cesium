void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
  // 读取模型局部坐标系的 Z 值作为高度，不代表真实海拔。
  float height = fsInput.attributes.positionMC.z;

  // 将高度缩放后取周期小数，并在每个周期最后 6% 生成窄条纹。
  float band = step(0.94, fract(height * 0.08));

  // 定义模型基础蓝色与条纹高亮青色（RGB 分量范围为 0 到 1）。
  vec3 baseColor = vec3(0.08, 0.35, 0.52);
  vec3 highlightColor = vec3(0.12, 0.88, 1.0);

  // 普通区域使用基础色；条纹区域以 75% 的比例混合为高亮色。
  material.diffuse = mix(baseColor, highlightColor, band * 0.75);

  // 添加少量自发光，使模型颜色稍微明亮，不完全依赖场景光照。
  material.emissive = material.diffuse * 0.12;
}
