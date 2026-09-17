import { PointPosition } from "@com/JkMap/type/map.type";
import { defineStore } from "pinia";

const count = 100;
const BOUNDS = {
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
    const longitude = randomBetween(BOUNDS.minLongitude, BOUNDS.maxLongitude);
    const latitude = randomBetween(BOUNDS.minLatitude, BOUNDS.maxLatitude);

    return {
      id,
      longitude: Number(longitude.toFixed(6)),
      latitude: Number(latitude.toFixed(6)),
      height: 0,
    };
  }

  function createPoints(): PointPosition[] {
    return Array.from({ length: count }, (_, index) => createPoint(index + 1));
  }

  const points = ref(createPoints());

  return {
    points,
    createPoints,
  };
});
