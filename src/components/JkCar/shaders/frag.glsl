uniform vec3 uRimColor;
uniform float uRimPower;
uniform float uRimStrength;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // 视线方向与法线越接近垂直（越靠边缘），rim 越大
  float rimDot = 1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0);
  float rim = pow(rimDot, uRimPower);
  // 仅输出边缘光，配合 AdditiveBlending 叠加到原 PBR 车身上
  gl_FragColor = vec4(uRimColor * rim * uRimStrength, rim);
}
