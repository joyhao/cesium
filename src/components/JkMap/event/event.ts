import type {
  AddPointRequestDetail,
  CameraChangeDetail,
  CesiumInfo,
  DrawingChangeDetail,
  LineChangeDetail,
  LineHoverDetail,
  PointHoverDetail,
  Position,
  PointsChangeDetail,
  MovePosition,
} from "../type/map.type";

/** 自定义事件名称 */
export enum cEnum {
  camera_change = "camera_change",
  camera_start = "camera_start",
  camera_end = "camera_end",
  fps_change = "fps_change",
  points_change = "points_change",
  on_left_click = "on_left_click",
  on_right_click = "on_right_click",
  on_move_click = "on_move_click",
  drawing_change = "drawing_change",
  line_change = "line_change",
  add_point_request = "add_point_request",
  point_hover = "point_hover",
  line_hover = "line_hover",
}

/** 自定义事件名称与事件对象类型的映射 */
export interface CEvent {
  camera_change: CustomEvent<CameraChangeDetail>;
  camera_start: CustomEvent<{}>;
  camera_end: CustomEvent<{}>;
  fps_change: CustomEvent<CesiumInfo>;
  points_change: CustomEvent<PointsChangeDetail>;
  on_left_click: CustomEvent<Position>;
  on_right_click: CustomEvent<{}>;
  on_move_click: CustomEvent<MovePosition>;
  drawing_change: CustomEvent<DrawingChangeDetail>;
  line_change: CustomEvent<LineChangeDetail>;
  add_point_request: CustomEvent<AddPointRequestDetail>;
  point_hover: CustomEvent<PointHoverDetail | null>;
  line_hover: CustomEvent<LineHoverDetail | null>;
}
