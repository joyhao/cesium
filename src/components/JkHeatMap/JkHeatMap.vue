<style lang="scss" scoped src="./index.scss"></style>

<template>
  <section class="heat-map-container">
    <div ref="container" class="map-canvas"></div>
    <div class="camera-info">
      <span>经度 {{ info.longitude.toFixed(6) }}°</span>
      <span>纬度 {{ info.latitude.toFixed(6) }}°</span>
      <span>高度 {{ info.height.toFixed(0) }} m</span>
      <span>层级 {{ info.level }}</span>
      <span>航向角 {{ info.heading.toFixed(1) }}°</span>
      <span>俯仰角 {{ info.pitch.toFixed(1) }}°</span>
      <span>翻滚角 {{ info.roll.toFixed(1) }}°</span>
      <span>FPS {{ info.fps }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CameraInfo } from "./type/camera.type";
import { JkMap } from "./hooks/map";
import { useHeatMap } from "../../stores/heatMap";

const heatMapStore = useHeatMap();

const info = reactive<CameraInfo>({
  longitude: 0, latitude: 0, height: 0,
  heading: 0, pitch: 0, roll: 0, level: 0, fps: 0,
});
const container = ref<HTMLElement>();
const config = inject<AppConfig>("AppConfig");
let map: JkMap | undefined;

onMounted(() => {
  if (!container.value || !config) return;
  map = new JkMap(container.value, config);
  /**
   * 传入演示数据并计算局部坐标和规则网格，输出结果供断点调试。
   * 当前仅生成网格数据，不创建渲染图元。
   */
  map.heatMap.setData(heatMapStore.points);
 
  const grid = map.heatMap.createGrid(200);
  map.camera.onChange((state) => Object.assign(info, state));
});

onBeforeUnmount(() => {
  map?.destroy();
  map = undefined;
});
</script>
