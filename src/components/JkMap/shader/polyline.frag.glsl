in float vParam;

void main() {
  // 沿线段从起点到终点做颜色渐变，起止颜色直接写在 shader 里。
  vec3 startColor = vec3(1.0, 0.85, 0.1); // 起：暖黄
  vec3 endColor = vec3(0.1, 0.7, 1.0);   // 终：青蓝
  vec3 color = mix(startColor, endColor, clamp(vParam, 0.0, 1.0));
  out_FragColor = vec4(color, 1.0);
}
