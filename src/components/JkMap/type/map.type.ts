import {
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Primitive,
  GeometryAttributes,
  GeometryAttribute
} from "cesium";

// 从 CEvent 的 CustomEvent<T> 中取出载荷类型 T
export type DetailOf<E> = E extends CustomEvent<infer D> ? D : never;

export type CustomAttributes = GeometryAttributes & Record<string, GeometryAttribute>;


export interface LineBuffers {
  currentPositions: Float64Array;
  previousHigh: Float32Array;
  previousLow: Float32Array;
  nextHigh: Float32Array;
  nextLow: Float32Array;
  sides: Float32Array;
  indices: Uint32Array;
  params: Float32Array;
}



export type RectLike = {
  west: number;
  east: number;
  south: number;
  north: number;
};

// 主线程分批次追加点位（批量生成），避免一次性传输全量数据。
export type AddMessage = { type: "add"; points: Point[] };
// 用户手动添加的节点（点地图落点），worker 单独记录以便 clear_added 精确清除。
export type AddManualMessage = { type: "add_manual"; points: Point[] };
export type FilterMessage = { type: "filter"; rectangle: RectLike };
// 清除手动添加的节点，仅保留批量点位。
export type ClearAddedMessage = { type: "clear_added" };
// 删除指定 id 的节点。
export type RemoveMessage = { type: "remove"; id: number };
// 修改指定 id 节点的名称（label）。
export type UpdateMessage = { type: "update"; id: number; label: string };
export type InMessage =
  | AddMessage
  | AddManualMessage
  | FilterMessage
  | ClearAddedMessage
  | RemoveMessage
  | UpdateMessage;

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

// 单条线段数据：含唯一 id、标签与有序顶点列表。
export interface LineData {
  id: number;
  label: string;
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

// 已完成的线段记录：保留顶点与场景图元，供面板回显、相机定位与删除。
export interface LineRecord {
  id: number;
  name: string;
  positions: Cartesian3[];
  primitive?: Primitive;
  boundingSphere: BoundingSphere;
}

export interface LineChangeDetail {
  lines: LineInfo[];
}

// 节点添加：左键落点后派发，携带反投影后的世界坐标与经纬度，供弹窗表单预填与确认。
export interface AddPointRequestDetail {
  position: Cartesian3;
  lon: number;
  lat: number;
  height: number;
}

// hover 命中节点时派发，携带屏幕坐标与节点信息，供上层渲染编辑/删除图标。
export interface PointHoverDetail {
  id: number;
  x: number;
  y: number;
  label: string;
  lon: number;
  lat: number;
  height: number;
  // 是否为手动添加的节点（id < 0），便于上层区分操作范围。
  added: boolean;
}

// hover 命中线段时派发，携带屏幕坐标与线段信息，供上层渲染编辑/删除图标。
export interface LineHoverDetail {
  id: number;
  x: number;
  y: number;
  name: string;
}
