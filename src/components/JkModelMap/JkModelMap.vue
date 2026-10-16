<style lang="scss" scoped src="./index.scss"></style>

<template>
  <section ref="container" class="container model-map-container">
    <button class="reset-view" type="button" @click="resetView">还原视角</button>
    <div v-if="selectedFeature" class="feature-info">
      <button class="feature-close" type="button" aria-label="关闭" @click="selectedFeature = null">×</button>
      <strong>{{ selectedFeature.name }}</strong>
      <dl>
        <template v-for="(value, key) in selectedFeature.properties" :key="key">
          <dt>{{ key }}</dt>
          <dd>{{ formatProperty(value) }}</dd>
        </template>
      </dl>
    </div>
    <div class="camera-info">
      <span>高度 {{ info.height.toLocaleString() }} m</span>
      <span>层级 {{ info.level }}</span>
      <span>航向角 {{ info.heading.toFixed(1) }}°</span>
      <span>俯仰角 {{ info.pitch.toFixed(1) }}°</span>
      <span>翻滚角 {{ info.roll.toFixed(1) }}°</span>
      <span>FPS {{ info.fps }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { JkMap } from "./hooks/map";
import type { ModelFeatureDetail } from "./type/map.type";

const selectedFeature = ref<ModelFeatureDetail | null>(null);
const info = reactive({
  height: 0,
  level: 0,
  heading: 0,
  pitch: 0,
  roll: 0,
  fps: 0,
});

let map: JkMap;

function resetView() {
  map?.resetView();
}

function formatProperty(value: unknown) {
  if (value == null) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

onMounted(() => {
  map = new JkMap(".model-map-container");

  map.camera.on("camera_change", (event) => {
    info.height = event.detail.height;
    info.level = event.detail.level;
    info.heading = event.detail.heading;
    info.pitch = event.detail.pitch;
    info.roll = event.detail.roll;
  });

  map.on("fps_change", (event) => {
    info.fps = event.detail.fps;
  });

  map.on("model_feature_pick", (event) => {
    selectedFeature.value = event.detail;
  });
});

onBeforeUnmount(() => {
  map?.destroy();
});
</script>
