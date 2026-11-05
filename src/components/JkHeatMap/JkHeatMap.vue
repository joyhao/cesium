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
   * 暂时只传入演示数据并输出计算结果，方便调试，不创建热力网格。
   */
  map.heatMap.setData(heatMapStore.points);
  console.log("热力图数据范围", map.heatMap.getBounds());
  console.log("热力图 ENU 局部坐标", map.heatMap.getLocalData());
  map.camera.onChange((state) => Object.assign(info, state));
});

onBeforeUnmount(() => {
  map?.destroy();
  map = undefined;
});
</script>
