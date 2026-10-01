import { defineStore } from "pinia";
import type { PointPosition } from "@com/JkMap/type/map.type";
import { randomBetween } from "@/components/JkMap/utils";

// 全局点位总数：点位数据全部保存在 Store 中，但只把视口内的点创建为 Cesium Entity。
export const POINT_COUNT = 10_000;

// 固定 5 个北京坐标（直接写成 PointPosition 形态，带地名 label），便于演示/定位；其余点位随机生成并标注简写经纬度。
const BEIJING_POINTS: PointPosition[] = [
  { id: 0, lon: 116.3975, lat: 39.9087, height: 0, label: "天安门" },
  { id: 1, lon: 116.2755, lat: 39.9999, height: 0, label: "颐和园" },
  { id: 2, lon: 116.3975, lat: 39.9928, height: 0, label: "鸟巢" },
  { id: 3, lon: 116.4271, lat: 39.9027, height: 0, label: "北京站" },
  { id: 4, lon: 116.3164, lat: 39.9836, height: 0, label: "中关村" },
];

// 使用经度均匀分布、sin(latitude) 均匀分布，让点位更接近球面均匀分布。
function createGlobalPoint(id: number): PointPosition {
  // 前 5 个点固定为北京坐标（已带地名 label），其余随机并标注简写经纬度。
  if (id < BEIJING_POINTS.length) {
    const { lon, lat, label } = BEIJING_POINTS[id];
    return { id, lon, lat, height: 0, label };
  }

  const lon = Number(randomBetween(-180, 180).toFixed(6));
  const lat = Number(
    ((Math.asin(randomBetween(-1, 1)) * 180) / Math.PI).toFixed(6),
  );

  return {
    id,
    lon,
    lat,
    height: 0,
    label: `${lon.toFixed(2)},${lat.toFixed(2)}`,
  };
}

export const usePoints = defineStore("points", () => {
  function createPoints(count = POINT_COUNT, start = 0): PointPosition[] {
    return Array.from({ length: count }, (_, index) =>
      createGlobalPoint(start + index),
    );
  }

  return {
    createPoints,
  };
});
