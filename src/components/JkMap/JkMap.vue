<style lang="scss" scoped src="./index.scss"></style>

<template>
  <section ref="container" class="container">
    <div class="camera-info">
      <span>高度 {{ cameraInfo.height.toLocaleString() }} m</span>
      <span>层级 {{ cameraInfo.level }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { JkMap } from "./hooks/map";

const cameraInfo = reactive({
  height: 0,
  level: 0,
});

onMounted(() => {
  const map = new JkMap(".container");
  map.on("camera_change", (event) => {
    const { height, level } = event.detail;
    cameraInfo.height = height;
    cameraInfo.level = level;
  });
});

onBeforeUnmount(() => {});
</script>
