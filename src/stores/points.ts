import { defineStore } from "pinia";
import type { PointPosition } from "@com/JkMap/type/map.type";

// 全局点位总数：点位数据全部保存在 Store 中，但只把视口内的点创建为 Cesium Entity。
const POINT_COUNT = 10_000;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// 使用经度均匀分布、sin(latitude) 均匀分布，让点位更接近球面均匀分布。
function createGlobalPoint(id: number): PointPosition {
  const longitude = randomBetween(-180, 180);
  const sinLatitude = randomBetween(-1, 1);
  const latitude = (Math.asin(sinLatitude) * 180) / Math.PI;

  return {
    id,
    longitude: Number(longitude.toFixed(6)),
    latitude: Number(latitude.toFixed(6)),
    height: 0,
  };
}

export const usePoints = defineStore("points", () => {
  function createPoints(count = POINT_COUNT): PointPosition[] {
    return Array.from({ length: count }, (_, index) =>
      createGlobalPoint(index + 1),
    );
  }

  // 原始点位数据保持在 Pinia 中，JkPoints 只负责视口内 Entity 的加载和移除。
  const points = ref<PointPosition[]>(createPoints());

  // 整体替换点位数据；地图点位管理器可在需要时重新同步视口内实体。
  function regenerate(count = POINT_COUNT) {
    points.value = createPoints(count);
  }

  return {
    points,
    createPoints,
    regenerate,
  };
});
