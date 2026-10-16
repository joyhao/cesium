void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
  vec3 baseColor = vec3(0.20, 0.38, 0.58);
  vec3 accentColor = vec3(0.38, 0.72, 0.86);
  float height = fsInput.attributes.positionMC.z;
  float band = 0.5 + 0.5 * sin(height * 0.08);

  material.diffuse = mix(baseColor, accentColor, band * 0.22);
  material.emissive = accentColor * 0.035;
  material.roughness = 0.68;
  material.alpha = 1.0;
}
