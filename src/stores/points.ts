import { defineStore } from "pinia";
import type { PointPosition } from "@com/JkMap/type/map.type";

const POINT_COUNT = 10000;
const CHINA_BOUNDS = {
  minLongitude: 73.5,
  maxLongitude: 135.1,
  minLatitude: 18.2,
  maxLatitude: 53.6,
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export const usePoints = defineStore("points", () => {
  function createPoint(id: number): PointPosition {
    return {
      id,
      longitude: Number(
        randomBetween(
          CHINA_BOUNDS.minLongitude,
          CHINA_BOUNDS.maxLongitude
        ).toFixed(6)
      ),
      latitude: Number(
        randomBetween(
          CHINA_BOUNDS.minLatitude,
          CHINA_BOUNDS.maxLatitude
        ).toFixed(6)
      ),
      height: 0,
    };
  }

  function createPoints(count = POINT_COUNT): PointPosition[] {
    return Array.from({ length: count }, (_, index) => createPoint(index + 1));
  }

  const points = ref<PointPosition[]>(createPoints());

  return {
    points,
    createPoints,
  };
});
