import { Rectangle, Cartographic } from "@cesium/engine";
import { PointPosition } from "./type/map.type";

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
export function isPointInRectangle(point: PointPosition, rectangle: Rectangle) {
  // 当前点位经纬度转换成笛卡尔坐标
  const cartographic = Cartographic.fromDegrees(
    point.longitude,
    point.latitude,
    point.height
  );

  // 当前视口没有跨越子午线
  if (rectangle.west <= rectangle.east) {
    return Rectangle.contains(rectangle, cartographic);
  }

  // 跨越子午线
  return (
    (cartographic.longitude >= rectangle.west ||
      cartographic.longitude <= rectangle.east) &&
    cartographic.latitude >= rectangle.south &&
    cartographic.latitude <= rectangle.north
  );
}
