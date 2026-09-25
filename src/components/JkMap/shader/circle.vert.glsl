in vec3 position3DHigh;
in vec3 position3DLow;
in float batchId;
in vec4 aColor;

out vec4 vColor;

void main(){
  vec4 position=czm_computePosition();
  gl_Position=czm_modelViewProjectionRelativeToEye*position;
  
  // 用世界坐标系下的真实距离：顶点世界坐标 - 相机世界坐标。
  // 近(放大/滚轮前滚) → 距离小 → 点大；远(缩小) → 距离大 → 点小。
  float dist=length(position.xyz-czm_viewerPositionWC);
  float baseSize=40.;
  float refDist=1.e7;
  gl_PointSize=clamp(baseSize*(refDist/dist),10.,64.);
  vColor=aColor;
}
