import { defineStore } from "pinia";
import type { PointPosition } from "@com/JkMap/type/map.type";
import { randomBetween } from "@/components/JkMap/utils";

// 全局点位总数：点位数据全部保存在 Store 中，但只把视口内的点创建为 Cesium Entity。
const POINT_COUNT = 10_000;

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
      createGlobalPoint(index)
    );
  }

  return {
    createPoints,
  };
});
