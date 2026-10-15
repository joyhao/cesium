<style lang="scss" scoped src="./index.scss"></style>

<template>
  <section ref="container" class="container model-map-container">
    <div class="camera-info">
      <span>高度 {{ info.height.toLocaleString() }} m</span>
      <span>层级 {{ info.level }}</span>
      <span>FPS {{ info.fps }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { JkMap } from "./hooks/map";

const info = reactive({
  height: 0,
  level: 0,
  fps: 0,
});

let map: JkMap;

onMounted(() => {
  map = new JkMap(".model-map-container");

  map.camera.on("camera_change", (event) => {
    info.height = event.detail.height;
    info.level = event.detail.level;
  });

  map.on("fps_change", (event) => {
    info.fps = event.detail.fps;
  });
});

onBeforeUnmount(() => {
  map?.destroy();
});
</script>
