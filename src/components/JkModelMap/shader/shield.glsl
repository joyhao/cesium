// 能量罩材质：fresnel 边缘辉光 + 流动扫描线 + 网格纹理。
// 动画由 Cesium 内置自动 uniform czm_frameNumber 驱动，无需每帧更新 JS。
czm_material czm_getMaterial(czm_materialInput materialInput) {
  czm_material material = czm_getDefaultMaterial(materialInput);

  // 视角与法线夹角：边缘(轮廓)处 fresnel 趋近 0，正面趋近 1。
  vec3 positionToEyeEC = materialInput.positionToEyeEC;
  vec3 normalEC = materialInput.normalEC;
  float fresnel = abs(dot(normalize(positionToEyeEC), normalize(normalEC)));
  float edge = pow(1.0 - fresnel, 3.0);

  // 随时间流动的扫描线与网格纹理，营造能量场动感。
  float t = float(czm_frameNumber) * 0.02;
  float scan = 0.5 + 0.5 * sin(materialInput.st.t * 30.0 - t * 3.0);
  float grid = 0.5 + 0.5 * sin(materialInput.st.s * 60.0) * sin(materialInput.st.t * 60.0);

  vec3 baseColor = uColor.rgb;
  float alpha = (edge * 0.9 + 0.15) * (0.6 + 0.4 * scan) * (0.7 + 0.3 * grid) * uOpacity;

  material.diffuse = baseColor;
  material.emission = baseColor * (edge * 0.9 + 0.2 * scan);
  material.alpha = clamp(alpha, 0.0, 1.0);
  return material;
}
