import { Cartographic } from "@cesium/engine";
import { PointPosition, RectLike } from "./type/map.type";
import { JkColor } from "./entity/entity";

export function query(selector: string) {
  return document.querySelector(selector) as HTMLElement;
}

export function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** 返回一个在 ms 毫秒后 resolve 的 Promise，用于 await 让出主线程/延时。 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 判断点位是否位于当前相机可视矩形内，兼容跨越 ±180° 经线的情况。
 * @param point 点位
 * @param rectangle  相机视野范围  单位是弧度
 * @returns
 */
export function isPointInRectangle(point: PointPosition, rectangle: RectLike) {
  // 当前点位经纬度转换成笛卡尔坐标
  const cartographic = Cartographic.fromDegrees(
    point.longitude,
    point.latitude,
    point.height,
  );

  const lon = cartographic.longitude;
  const lat = cartographic.latitude;

  // 当前视口没有跨越子午线
  if (rectangle.west <= rectangle.east) {
    return (
      lon >= rectangle.west &&
      lon <= rectangle.east &&
      lat >= rectangle.south &&
      lat <= rectangle.north
    );
  }

  // 跨越子午线：经度被 ±180° 切开，落在 [west, 180] 或 [-180, east] 任一区间即算东西向命中
  const inLonCross = lon >= rectangle.west || lon <= rectangle.east;
  const inLat = lat >= rectangle.south && lat <= rectangle.north;

  return inLonCross && inLat;
}

/**
 * 根据每个点的选中/悬停态算出 aColor 颜色数组（每点 4 个分量）。
 * 选中橙、悬停黄、其余默认青；颜色业务由调用方通过 selectedIds/hoverId 注入，
 * 本函数为纯函数，不依赖任何实例状态，供 points 等模块复用。
 * @param ids 当前点位 id 列表
 * @param selectedIds 已选中的点位 id 集合
 * @param hoverId 当前悬停的点位 id
 */
export function computeColors(
  ids: number[],
  selectedIds: Set<number>,
  hoverId: number | undefined,
): Float32Array {
  const count = ids.length;
  const colors = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    let color: number[];
    if (selectedIds.has(ids[i])) color = JkColor.SELECTED_COLOR;
    else if (hoverId === ids[i]) color = JkColor.HOVER_COLOR;
    else color = JkColor.DEFAULT_COLOR;

    colors[i * 4] = color[0];
    colors[i * 4 + 1] = color[1];
    colors[i * 4 + 2] = color[2];
    colors[i * 4 + 3] = color[3];
  }
  return colors;
}
