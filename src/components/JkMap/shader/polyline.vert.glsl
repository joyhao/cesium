#ifndef LINE_WIDTH
#define LINE_WIDTH 10.0
#endif

in vec3 position3DHigh;
in vec3 position3DLow;
in vec3 aPreviousHigh;
in vec3 aPreviousLow;
in vec3 aNextHigh;
in vec3 aNextLow;
in float aSide;
in float aParam;
in float batchId;

out float vParam;

void main() {
  vec4 currentPosition = czm_computePosition();
  vec4 previousPosition = czm_translateRelativeToEye(aPreviousHigh, aPreviousLow);
  vec4 nextPosition = czm_translateRelativeToEye(aNextHigh, aNextLow);

  vec4 currentClip = czm_modelViewProjectionRelativeToEye * currentPosition;
  vec4 previousClip = czm_modelViewProjectionRelativeToEye * previousPosition;
  vec4 nextClip = czm_modelViewProjectionRelativeToEye * nextPosition;

  vec2 currentNdc = currentClip.xy / currentClip.w;
  vec2 previousNdc = previousClip.xy / previousClip.w;
  vec2 nextNdc = nextClip.xy / nextClip.w;
  vec2 direction = normalize(nextNdc - previousNdc);
  vec2 normal = vec2(-direction.y, direction.x);
  vec2 offsetNdc = normal * aSide * LINE_WIDTH / czm_viewport.zw;

  currentClip.xy += offsetNdc * currentClip.w;
  gl_Position = currentClip;

  vParam = aParam;
}
