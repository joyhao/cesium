in vec3 position3DHigh;
in vec3 position3DLow;
in float aParam;
in float batchId;

out float vParam;

void main() {
  gl_Position = czm_modelViewProjectionRelativeToEye * czm_computePosition();
  vParam = aParam;
}
