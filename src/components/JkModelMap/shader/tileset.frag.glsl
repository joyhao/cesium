void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
  float height = fsInput.attributes.positionMC.z;
  float band = step(0.94, fract(height * 0.08));
  vec3 baseColor = vec3(0.08, 0.35, 0.52);
  vec3 highlightColor = vec3(0.12, 0.88, 1.0);
  material.diffuse = mix(baseColor, highlightColor, band * 0.75);
  material.emissive = material.diffuse * 0.12;
}
