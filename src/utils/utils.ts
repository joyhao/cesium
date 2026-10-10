import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Cartographic } from "@cesium/engine";
import { Point, RectLike } from "../components/JkMap/type/map.type";
import { JkColor } from "../components/JkMap/entity/entity";

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
export function isInRect(point: Point, rectangle: RectLike) {
  // 当前点位经纬度转换成笛卡尔坐标
  const cartographic = Cartographic.fromDegrees(
    point.lon,
    point.lat,
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
 * 选中橙、悬停黄、其余默认青；颜色业务由调用方通过 hoverId 注入，
 * 本函数为纯函数，不依赖任何实例状态，供 points 等模块复用。
 * @param ids 当前点位 id 列表
 * @param hoverId 当前悬停的点位 id
 */
/** 单点的颜色：选中橙、悬停黄、其余默认青。纯函数，供 computeColors 与单遍合并渲染复用。 */
export function pickColor(hoverId: number | undefined, id: number): number[] {
  if (hoverId === id) return JkColor.HOVER_COLOR;
  return JkColor.DEFAULT_COLOR;
}

export function computeColors(
  ids: number[],
  hoverId: number | undefined,
): Float32Array {
  const count = ids.length;
  const colors = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const color = pickColor(hoverId, ids[i]);
    colors[i * 4] = color[0];
    colors[i * 4 + 1] = color[1];
    colors[i * 4 + 2] = color[2];
    colors[i * 4 + 3] = color[3];
  }
  return colors;
}

/**
 * 加载 GLB/GLTF 模型并归一化后加入场景：居中对齐到原点、底部落到地面、整体缩放到 targetSize。
 * @param url 模型地址（public 下用根路径，如 /glb/car.glb）
 * @param scene 目标场景
 * @param targetSize 归一化后的最大边长，默认 4
 * @returns 加载完成的模型对象
 */
export function loadModel(
  url: string,
  scene: THREE.Scene,
  targetSize = 4,
): Promise<THREE.Object3D> {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(
      url,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = targetSize / maxDim;
        model.scale.setScalar(scale);
        model.position.set(
          -center.x * scale,
          -box.min.y * scale,
          -center.z * scale,
        );
        scene.add(model);
        resolve(model);
      },
      undefined,
      (error) => reject(error),
    );
  });
}

/**
 * 设置相机绕 target 的默认方位角（水平旋转角 theta），保持距离与高度不变。
 * @param camera 透视相机
 * @param target 注视点
 * @param deg 方位角（度），例如 -90
 */
export function setCameraDegree(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  deg: number,
): void {
  const spherical = new THREE.Spherical().setFromVector3(
    camera.position.clone().sub(target),
  );
  spherical.theta = THREE.MathUtils.degToRad(deg);
  camera.position
    .copy(target)
    .add(new THREE.Vector3().setFromSpherical(spherical));
}
