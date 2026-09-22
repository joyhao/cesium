<style lang="scss" scoped src="./index.scss"></style>

<template>
  <section ref="container" class="container">
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

onMounted(() => {
  const map = new JkMap(".container");
  map.camera.on("camera_change", (event) => {
    const { height, level } = event.detail;
    info.height = height;
    info.level = level;
  });

  map.on("fps_change", (event) => {
    const { fps } = event.detail;
    info.fps = fps;
  });
});

onBeforeUnmount(() => {});
</script>
