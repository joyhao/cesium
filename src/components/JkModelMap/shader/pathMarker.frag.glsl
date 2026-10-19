czm_material czm_getMaterial(czm_materialInput materialInput) {
  czm_material material = czm_getDefaultMaterial(materialInput);
  float radius = length(materialInput.st - vec2(0.5));
  material.diffuse = mix(vec3(0.0, 1.0, 1.0), vec3(1.0), step(0.42, radius));
  material.alpha = 1.0;
  return material;
}
