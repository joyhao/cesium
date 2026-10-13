<style lang="scss" scoped src="./index.scss"></style>

<template>
  <section ref="container" class="container" :class="{ drawing: isLine }">
    <div class="camera-info">
      <span>高度 {{ info.height.toLocaleString() }} m</span>
      <span>层级 {{ info.level }}</span>
      <span>FPS {{ info.fps }}</span>
      <span>点位 {{ info.loadedPoints }} / {{ info.totalPoints }}</span>
    </div>


    <div class="toolbar">
      <button
        class="tool-btn"
        :class="{ active: isLine }"
        @click="drawLineClick"
      >
        {{ isLine ? "退出连线" : "连线模式" }}
      </button>
      <span v-if="isLine" class="tool-hint">左键加点 · 右键结束</span>
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


// 连线模式状态（驱动按钮高亮、文字与光标），由线段模块 toggleLine 同步。
const isLine = ref(false);

function drawLineClick() {
  isLine.value = map.lines.toggleLine();
}

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
