import { defineStore } from "pinia";
import { ref, watch } from "vue";

import type { PathData, PathVertex } from "../components/JkModelMap/type/path.type";
export type { PathData, PathVertex } from "../components/JkModelMap/type/path.type";

const STORAGE_KEY = "jk-model-map-paths";

function loadPaths(): PathData[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(data)) return [];
    const ids = new Set<number>();
    return data.filter((path): path is PathData => {
      if (!path || !Number.isSafeInteger(path.id) || path.id < 1 || ids.has(path.id) ||
        typeof path.label !== "string" || !Array.isArray(path.points)) return false;
      const valid = path.points.every((point: unknown) => {
        if (!point || typeof point !== "object") return false;
        const vertex = point as PathVertex;
        return Number.isFinite(vertex.lon) && Math.abs(vertex.lon) <= 180 &&
          Number.isFinite(vertex.lat) && Math.abs(vertex.lat) <= 90 && Number.isFinite(vertex.height);
      });
      if (valid) ids.add(path.id);
      return valid;
    });
  } catch (error) {
    console.warn("读取本地路径失败", error);
    return [];
  }
}

export const usePaths = defineStore("paths", () => {
  const paths = ref<PathData[]>(loadPaths());
  let nextId = 1;

  watch(paths, (data) => {
    try {
      if (data.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("保存本地路径失败", error);
    }
  }, { deep: true, flush: "sync" });

  function createPath() {
    const id = Math.max(nextId, ...paths.value.map((path) => path.id + 1));
    nextId = id + 1;
    paths.value.push({ id, label: `路径 ${id}`, points: [] });
    return id;
  }

  function addPoint(id: number, point: PathVertex) {
    const path = paths.value.find((path) => path.id === id);
    if (!path) return false;
    path.points.push({ ...point });
    return true;
  }

  function undoPoint(id: number) {
    const path = paths.value.find((path) => path.id === id);
    if (!path?.points.length) return false;
    path.points.pop();
    return true;
  }

  function removePath(id: number) {
    paths.value = paths.value.filter((path) => path != null && path.id !== id);
  }

  return { paths, createPath, addPoint, undoPoint, removePath };
});
