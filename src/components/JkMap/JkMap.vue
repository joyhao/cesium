<style lang="scss" scoped src="./index.scss"></style>

<template>
  <section ref="container" class="container">
    <div class="camera-info">
      <span>高度 {{ info.height.toLocaleString() }} m</span>
      <span>层级 {{ info.level }}</span>
      <span>FPS {{ info.fps }}</span>
      <span>点位 {{ info.loadedPoints }} / {{ info.totalPoints }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { JkMap } from "./hooks/map";

// 将 Cesium 事件转换为 Vue 响应式状态，供右上角信息面板展示。
const info = reactive({
  height: 0,
  level: 0,
  fps: 0,
  loadedPoints: 0,
  totalPoints: 0,
});

// 地图实例负责统一创建 Viewer、图层、相机和点位模块。
let map: JkMap;

onMounted(() => {
  map = new JkMap(".container");

  map.camera.on("camera_change", (event) => {
    const { height, level } = event.detail;

    info.height = height;
    info.level = level;
  });

  map.on("fps_change", (event) => {
    const { fps } = event.detail;
    info.fps = fps;
  });

  map.points.on("points_change", (event) => {
    const { loaded, total } = event.detail;
    info.loadedPoints = loaded;
    info.totalPoints = total;
  });
});

onBeforeUnmount(() => {
  map.destroy();
});
</script>
