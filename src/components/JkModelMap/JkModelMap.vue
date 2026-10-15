<style lang="scss" scoped src="./index.scss"></style>

<template>
  <section ref="container" class="container model-map-container">
    <button class="reset-view" type="button" @click="resetView">还原视角</button>
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
});

onBeforeUnmount(() => {
  map?.destroy();
});
</script>
