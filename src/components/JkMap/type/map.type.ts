import { Cartesian2 } from "cesium";

// 从 CEvent 的 CustomEvent<T> 中取出载荷类型 T
export type DetailOf<E> = E extends CustomEvent<infer D> ? D : never;

export type RectLike = {
  west: number;
  east: number;
  south: number;
  north: number;
};

// 主线程分批次追加点位，避免一次性传输全量数据。
export type AddMessage = { type: "add"; points: Point[] };
export type FilterMessage = { type: "filter"; rectangle: RectLike };
export type InMessage = AddMessage | FilterMessage;

export type WorkerResult = {
  type: "result";
  positions: Float64Array;
  points: Point[];
};

export interface Point {
  id: number;
  lon: number;
  lat: number;
  height: number;
  label: string;
}

export interface LineVertex {
  lon: number;
  lat: number;
  height: number;
}

// 单条线段数据：含唯一 id、名称与有序顶点列表。
export interface LineData {
  id: number;
  name: string;
  points: LineVertex[];
}

export interface Position {
  position: Cartesian2;
}

export interface MovePosition {
  startPosition: Cartesian2;
  endPosition: Cartesian2;
}

export interface AppConfig {
  token: string;
  vector: string;
  cia: string;
  subdomains: string[];
  city: {
    longitude: number;
    latitude: number;
    height: number;
  };
}

export interface CameraChangeDetail {
  height: number;
  level: number;
}

export interface PointsChangeDetail {
  loaded: number;
  total: number;
}

export interface CesiumInfo {
  fps: number;
}

export interface DrawingChangeDetail {
  drawing: boolean;
}

export interface LineInfo {
  id: number;
  name: string;
  count: number;
}

export interface LineChangeDetail {
  lines: LineInfo[];
}
