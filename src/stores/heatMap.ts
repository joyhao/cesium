import { HeatMapPoint } from "@com/JkHeatMap/type/heatMap.type";
import { defineStore } from "pinia";
export type { HeatMapPoint } from "@com/JkHeatMap/type/heatMap.type";


export const useHeatMap = defineStore("heatMap", () => {
  const points:HeatMapPoint[] = [
  { lon: 116.3675, lat: 39.9087, height: 50, value: 8.5 },
  { lon: 116.3975, lat: 39.9087, height: 120, value: 4.2 },
  { lon: 116.4271, lat: 39.9087, height: 80, value: 7.6 },
  { lon: 116.3512, lat: 39.9492, height: 60, value: 3.8 },
  { lon: 116.3854, lat: 39.9563, height: 150, value: 9.1 },
  { lon: 116.4178, lat: 39.9498, height: 100, value: 6.4 },
  { lon: 116.4365, lat: 39.9401, height: 180, value: 5.7 },
  { lon: 116.4039, lat: 39.9219, height: 90, value: 8.8 },
  { lon: 116.3975, lat: 39.8585, height: 40, value: 4.6 },
  { lon: 116.3975, lat: 39.8821, height: 130, value: 7.2 },
]

  return { points };
});
