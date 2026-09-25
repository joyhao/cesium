in vec4 vColor;

void main(){
  vec2 coordinate=gl_PointCoord*2.-1.;
  float distanceFromCenter=dot(coordinate,coordinate);
  
  if(distanceFromCenter>1.){
    discard;
  }
  
  float r=sqrt(distanceFromCenter);
  
  // 用 Cesium 自动注入的 czm_frameNumber 驱动水波纹流动，无需手动传 u_time。
  float u_time=float(czm_frameNumber)*.06;
  
  // 水波纹：从中心向外扩散的同心环，随时间流动；叠加两路正弦形成干涉感。
  float ripple=sin(r*18.-u_time*4.)*.5+.5;
  float ripple2=sin(r*30.-u_time*6.3)*.5+.5;
  float wave=ripple*.6+ripple2*.4;
  
  float edge=1.-smoothstep(.65,1.,distanceFromCenter);
  
  // 去掉实心背景：颜色仅出现在水波纹的波峰，波谷处透明，呈现涟漪环纹。
  float mask=edge*wave;
  vec3 color=vColor.rgb*(.6+.5*wave)*(1.-r*.25);
  
  out_FragColor=vec4(color,vColor.a*mask);
}
