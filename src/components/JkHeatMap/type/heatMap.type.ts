import type { Matrix4 } from "cesium";

// 立体热力图单个采样点，经纬度字段沿用项目现有的 lon / lat 命名。
export interface HeatMapPoint {
  /**
   * 经度，单位度。
   */
  lon: number;
  /**
   * 纬度，单位度。
   */
  lat: number;
  /**
   * 相对参考椭球面的高度，单位米，不是热力柱的高度。
   */
  height: number;
  /**
   * 热力强度，用于后续颜色或形态映射；不是实际测量数据。
   */
  value: number;
}

/**
 * 采样数据的数值范围；经纬度为度，高度为米，value 沿用业务强度单位。
 */
export interface HeatMapBounds {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
  minHeight: number;
  maxHeight: number;
  minValue: number;
  maxValue: number;
}

/**
 * ENU 局部采样点，x 向东、y 向北、z 向上，坐标单位为米。
 * z 是相对局部原点的坐标，不是原始椭球高度，也不是热力隆起高度。
 */
export interface HeatMapLocalPoint {
  x: number;
  y: number;
  z: number;
  value: number;
}

/**
 * 局部坐标转换结果；modelMatrix 可将局部网格变换回世界坐标。
 */
export interface HeatMapLocalData {
  modelMatrix: Matrix4;
  points: HeatMapLocalPoint[];
}

/**
 * 规则网格结果，按行存储：节点索引 = 行号 * columns + 列号。
 * positions 依次保存每个节点的 x、y、z，单位米；当前 z 为 0，尚未计算曲面高度。
 * columns、rows 为节点数，不是网格单元数；modelMatrix 用于将网格放回世界空间。
 */
export interface HeatMapGrid {
  modelMatrix: Matrix4;
  columns: number;
  rows: number;
  spacing: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  positions: Float64Array;
}
