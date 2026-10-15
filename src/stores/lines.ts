import { defineStore } from "pinia";
import type { LineData, LineVertex } from "@com/JkMap/type/map.type";

// 线段类型定义见 @com/JkMap/type/map.type，此处重新导出便于按 store 路径引用。
export type { LineData, LineVertex };

// 北京区域 10 条示例线段（字面量数据，类似 BEIJING_POINTS 的写法），供回显/演示。
export const BEIJING_LINES: LineData[] = [
  {
    id: 0,
    label: "长安街",
    points: [
      { lon: 116.3675, lat: 39.9087, height: 0 },
      { lon: 116.3975, lat: 39.9087, height: 0 },
      { lon: 116.4271, lat: 39.9087, height: 0 },
    ],
  },
  {
    id: 1,
    label: "二环北段",
    points: [
      { lon: 116.3512, lat: 39.9492, height: 0 },
      { lon: 116.3854, lat: 39.9563, height: 0 },
      { lon: 116.4178, lat: 39.9498, height: 0 },
      { lon: 116.4365, lat: 39.9401, height: 0 },
    ],
  },
  {
    id: 2,
    label: "机场高速",
    points: [
      { lon: 116.4039, lat: 39.9219, height: 0 },
      { lon: 116.4833, lat: 39.9712, height: 0 },
      { lon: 116.5681, lat: 40.0478, height: 0 },
      { lon: 116.6031, lat: 40.0805, height: 0 },
    ],
  },
  {
    id: 3,
    label: "京藏高速",
    points: [
      { lon: 116.3319, lat: 39.9492, height: 0 },
      { lon: 116.3312, lat: 39.9856, height: 0 },
      { lon: 116.3308, lat: 40.0203, height: 0 },
    ],
  },
  {
    id: 4,
    label: "南中轴",
    points: [
      { lon: 116.3975, lat: 39.8585, height: 0 },
      { lon: 116.3975, lat: 39.8821, height: 0 },
      { lon: 116.3975, lat: 39.9087, height: 0 },
    ],
  },
  {
    id: 5,
    label: "北四环",
    points: [
      { lon: 116.3004, lat: 39.9901, height: 0 },
      { lon: 116.3521, lat: 39.9928, height: 0 },
      { lon: 116.4147, lat: 39.9921, height: 0 },
      { lon: 116.4788, lat: 39.9905, height: 0 },
    ],
  },
  {
    id: 6,
    label: "东三环",
    points: [
      { lon: 116.4531, lat: 39.8812, height: 0 },
      { lon: 116.4559, lat: 39.9187, height: 0 },
      { lon: 116.4578, lat: 39.9542, height: 0 },
    ],
  },
  {
    id: 7,
    label: "西二环",
    points: [
      { lon: 116.3512, lat: 39.8812, height: 0 },
      { lon: 116.3498, lat: 39.9187, height: 0 },
      { lon: 116.3531, lat: 39.9542, height: 0 },
    ],
  },
  {
    id: 8,
    label: "通州线",
    points: [
      { lon: 116.4581, lat: 39.9027, height: 0 },
      { lon: 116.5289, lat: 39.9051, height: 0 },
      { lon: 116.6058, lat: 39.9092, height: 0 },
      { lon: 116.6578, lat: 39.9123, height: 0 },
    ],
  },
  {
    id: 9,
    label: "海淀线",
    points: [
      { lon: 116.2841, lat: 39.9612, height: 0 },
      { lon: 116.3064, lat: 39.9845, height: 0 },
      { lon: 116.3289, lat: 40.0137, height: 0 },
      { lon: 116.3412, lat: 40.0342, height: 0 },
    ],
  },
];

export const useLines = defineStore("lines", () => {
  // 直接暴露 10 条北京示例线段数据。
  const lines: LineData[] = BEIJING_LINES;

  return {
    lines,
  };
});
