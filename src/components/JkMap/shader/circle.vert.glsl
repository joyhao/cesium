in vec3 position3DHigh;
in vec3 position3DLow;

void main(){
  vec4 position=czm_computePosition();
  gl_Position=czm_modelViewProjectionRelativeToEye*position;
  gl_PointSize=8.;
}