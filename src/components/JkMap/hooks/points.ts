import {
  Appearance,
  BoundingSphere,
  Cartesian3,
  Cartographic,
  ComponentDatatype,
  Geometry,
  GeometryAttribute,
  GeometryAttributes,
  GeometryInstance,
  Primitive,
  PrimitiveType,
  Rectangle,
} from "cesium";
import { usePoints } from "@store/points";
import { cEnum } from "../event/event";
import type { PointPosition } from "../type/map.type";
import { JkBase } from "./base";

import circleVertShader from "@com/JkMap/shader/circle.vert.glsl";
import circleFragShader from "@com/JkMap/shader/circle.frag.glsl";

export class JkPoints extends JkBase {
  viewer = JkBase.viewer;
  uPoint = usePoints();
  points = this.uPoint.createPoints();

  // 当前视口筛选出的点位，统计值以视口筛选结果为准。
  private visibleIds = new Set<number>();
  private visibleCount = 0;
  private visiblePrimitive?: Primitive;
  private visibilityTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    super();
    this.syncVisiblePoints();
  }

  scheduleVisibilityUpdate = () => {
    if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer);
    }

    this.visibilityTimer = setTimeout(() => {
      this.visibilityTimer = undefined;
      this.syncVisiblePoints();
    }, 300);
  };

  /** 计算视口内点位，并用一个 Primitive 批量替换上一帧点位。 */
  syncVisiblePoints() {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    const rectangle = this.viewer.camera.computeViewRectangle(
      this.viewer.scene.globe.ellipsoid
    );

    // 相机正在初始化或视角朝向太空时没有有效视口，此时不应把全部点误认为可见。
    if (!rectangle) {
      this.replacePrimitive([]);
      return;
    }

    const visiblePoints = this.points.filter((point) =>
      this.isPointInRectangle(point, rectangle)
    );

    this.replacePrimitive(visiblePoints);
  }

  /** 判断点位是否位于当前相机可视矩形内，兼容跨越 ±180° 经线的情况。 */
  private isPointInRectangle(point: PointPosition, rectangle: Rectangle) {
    const cartographic = Cartographic.fromDegrees(
      point.longitude,
      point.latitude,
      point.height
    );

    if (rectangle.west <= rectangle.east) {
      return Rectangle.contains(rectangle, cartographic);
    }

    return (
      (cartographic.longitude >= rectangle.west ||
        cartographic.longitude <= rectangle.east) &&
      cartographic.latitude >= rectangle.south &&
      cartographic.latitude <= rectangle.north
    );
  }

  /** 批量构建一个 Primitive；不会为每个点创建 Entity 或独立几何体。 */
  private replacePrimitive(points: PointPosition[]) {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    const nextIds = new Set(points.map((point) => point.id));
    // 视口内点位集合未变化时不重建 Primitive，避免无谓开销。
    if (this.sameVisibleSet(nextIds)) return;

    const nextPrimitive = points.length
      ? new Primitive({
          geometryInstances: new GeometryInstance({
            geometry: this.createPointGeometry(points),
          }),
          appearance: new Appearance({
            vertexShaderSource: circleVertShader,
            fragmentShaderSource: circleFragShader,
            translucent: true,
            closed: false,
            renderState: {
              depthMask: true,
              depthTest: {
                enabled: true,
              },
            },
          }),
          // 自定义 Geometry 没有对应 worker，无法异步加载，必须同步创建。
          // 视口点位已批量进单个轻量 POINTS 几何体，同步开销很小。
          asynchronous: false,
          allowPicking: false,
          releaseGeometryInstances: true,
        })
      : undefined;

    if (nextPrimitive) {
      this.viewer.scene.primitives.add(nextPrimitive);
    }

    this.removeVisiblePrimitive();

    this.visiblePrimitive = nextPrimitive;
    this.visibleIds = nextIds;
    this.visibleCount = points.length;
    this.emitChange();
  }

  /** 对比上一次视口点位集合是否完全一致（数量与每个 id 都相同）。 */
  private sameVisibleSet(nextIds: Set<number>) {
    if (nextIds.size !== this.visibleIds.size) return false;
    for (const id of nextIds) {
      if (!this.visibleIds.has(id)) return false;
    }
    return true;
  }

  /** 移除并销毁上一个 Primitive；异步加载中的 Primitive 销毁可能抛错，忽略即可。 */
  private removeVisiblePrimitive() {
    const prev = this.visiblePrimitive;
    if (!prev || !this.viewer || this.viewer.isDestroyed()) return;

    this.visiblePrimitive = undefined;
    try {
      this.viewer.scene.primitives.remove(prev);
      if (!prev.isDestroyed()) prev.destroy();
    } catch {
      // 仍在异步创建的 Primitive 被提前销毁时忽略异常。
    }
  }

  /**
   * 所有点位写入同一个 Geometry，使用 PrimitiveType.POINTS 让 GPU 以
   * gl_PointSize 渲染圆点。相比为每个点生成球体顶点的 EllipsoidGeometry，
   * 这种方式只有一个几何体、一次 draw call，渲染 1 万点也很轻量。
   */
  private createPointGeometry(points: PointPosition[]) {
    const positions = points.map((point) =>
      Cartesian3.fromDegrees(point.longitude, point.latitude, point.height)
    );
    const positionValues = new Float64Array(positions.length * 3);

    positions.forEach((position, index) => {
      positionValues[index * 3] = position.x;
      positionValues[index * 3 + 1] = position.y;
      positionValues[index * 3 + 2] = position.z;
    });

    const attributes = new GeometryAttributes();
    attributes.position = new GeometryAttribute({
      componentDatatype: ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: positionValues,
    });

    return new Geometry({
      attributes,
      primitiveType: PrimitiveType.POINTS,
      boundingSphere: BoundingSphere.fromPoints(positions),
    });
  }

  private emitChange() {
    this.dispatchEvent(
      new CustomEvent(cEnum.points_change, {
        detail: {
          loaded: this.visibleCount,
          total: this.points.length,
        },
      })
    );
  }

  clear() {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    this.removeVisiblePrimitive();
    this.visibleIds.clear();
    this.visibleCount = 0;
    this.emitChange();
  }

  destroy() {
    if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer);
      this.visibilityTimer = undefined;
    }

    this.clear();
  }
}
