uniform vec3 uRimColor;
uniform float uRimPower;
uniform float uRimStrength;

uniform vec3 uColorBottom;
uniform vec3 uColorTop;

uniform float uTime;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vT;
varying float vLen;

void main() {
  // 底→顶渐变作为底色
  vec3 grad = mix(uColorBottom, uColorTop, vT);

  // Fresnel 边缘光：视线与法线越垂直（越靠边缘）越强，并随时间呼吸脉动
  float rimDot =
    1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0);
  float rim = pow(rimDot, uRimPower);
  float pulse = 0.8 + 0.4 * sin(uTime * 3.0);
  vec3 add1 = uRimColor * rim * uRimStrength * pulse;

  // 自下而上扫过的亮带（动画）：fract 让亮带循环移动
  float band = smoothstep(0.08, 0.0, abs(fract(vT - uTime * 0.25) - 0.5));
  vec3 scan = vec3(0.6, 0.9, 1.0) * band * 0.8;

  // 车头→车尾扫过的亮带（动画）：沿车长方向 vLen 移动，用暖色区分
  float bandLen = smoothstep(0.08, 0.0, abs(fract(vLen - uTime * 0.25) - 0.5));
  vec3 scanLen = vec3(1.0, 0.7, 0.3) * bandLen * 0.8;

  // 渐变底色 + 边缘光 + 两条扫描亮带；配合 MultiplyBlending 把白模染成渐变并保留原光照
  vec3 color = grad + add1 + scan + scanLen;
  gl_FragColor = vec4(color, 1.0);
}
