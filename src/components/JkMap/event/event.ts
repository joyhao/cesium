import type {
  CameraChangeDetail,
  CesiumInfo,
  PointsChangeDetail,
} from "../type/map.type";

/** 自定义事件名称 */
export enum cEnum {
  camera_change = "camera_change",
  fps_change = "fps_change",
  points_change = "points_change",
}

/** 自定义事件名称与事件对象类型的映射 */
export interface CEvent {
  camera_change: CustomEvent<CameraChangeDetail>;
  fps_change: CustomEvent<CesiumInfo>;
  points_change: CustomEvent<PointsChangeDetail>;
}
