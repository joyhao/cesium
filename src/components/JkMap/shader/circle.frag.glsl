in vec4 vColor;

void main(){
  vec2 coordinate=gl_PointCoord*2.-1.;
  float distanceFromCenter=dot(coordinate,coordinate);
  
  if(distanceFromCenter>1.){
    discard;
  }
  
  float edge=1.-smoothstep(.65,1.,distanceFromCenter);
  out_FragColor=vec4(vColor.rgb,vColor.a*edge);
}
