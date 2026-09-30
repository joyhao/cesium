import { Cartesian2 } from "cesium";


// 从 CEvent 的 CustomEvent<T> 中取出载荷类型 T
export type DetailOf<E> = E extends CustomEvent<infer D> ? D : never;

export type WorkerResult = { type: "result"; positions: Float64Array; ids: number[] };




export interface PointPosition {
  id: number;
  longitude: number;
  latitude: number;
  height: number;
}
export interface Position{
   position: Cartesian2
}

export interface MovePosition{
  startPosition: Cartesian2;
   endPosition: Cartesian2
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
