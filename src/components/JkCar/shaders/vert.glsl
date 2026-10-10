uniform float uMinY;
uniform float uMaxY;
uniform float uMinLen;
uniform float uMaxLen;
uniform float uUseX; // 1.0 = 车长沿 X 轴；0.0 = 车长沿 Z 轴

varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vT;
varying float vLen;

void main() {
  // 世界坐标 Y 归一化（底→顶），以及车长方向归一化（车头→车尾）
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vT = clamp((worldPos.y - uMinY) / (uMaxY - uMinY), 0.0, 1.0);
  // 取水平方向中较长者作为车长轴
  float axisPos = mix(worldPos.z, worldPos.x, uUseX);
  vLen = clamp((axisPos - uMinLen) / (uMaxLen - uMinLen), 0.0, 1.0);

  // 视图空间法线与视线方向，供 Fresnel 边缘光使用
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPosition;
}
