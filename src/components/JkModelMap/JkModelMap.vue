<style lang="scss" scoped src="./index.scss"></style>

<template>
  <section ref="container" class="container model-map-container">
    <button class="reset-view" type="button" @click="resetView">还原视角</button>
    <button class="switch-view" type="button" @click="switchView">切换视角</button>
    <div class="feature-info">
      <div>模型Name：<strong>{{ feature.name }}</strong></div>
      <div>Feature ID：<strong>{{ feature.featureId }}</strong></div>
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

const feature = reactive<{ name: string; featureId?: number }>({
  name: "",
  featureId: undefined,
});
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

function switchView() {
  map?.switchView();
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
    if (!event.detail) {
      return;
    }
    feature.name = event.detail.name;
    feature.featureId = event.detail.featureId;
  });
});

onBeforeUnmount(() => {
  map?.destroy();
});
</script>
