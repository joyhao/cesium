uniform float uMinY;
uniform float uMaxY;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vT;

void main() {
  // 世界坐标 Y 归一化（底→顶）
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vT = clamp((worldPos.y - uMinY) / (uMaxY - uMinY), 0.0, 1.0);

  // 视图空间法线与视线方向，供 Fresnel 边缘光使用
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPosition;
}
