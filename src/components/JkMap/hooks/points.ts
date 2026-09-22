import {
  Cartesian3,
  Cartographic,
  Color,
  ColorGeometryInstanceAttribute,
  EllipsoidGeometry,
  GeometryInstance,
  PerInstanceColorAppearance,
  Primitive,
  Rectangle,
  Transforms,
} from "cesium";
import { usePoints } from "@store/points";
import { cEnum } from "../event/event";
import type { PointPosition } from "../type/map.type";
import { JkBase } from "./base";

// 相机停止移动后延迟重建 Primitive，避免拖动过程中频繁提交 GPU 数据。
const POINT_LOAD_DELAY = 300;
const POINT_RADIUS = 5_000;

export class JkPoints extends JkBase {
  // 点位原始数据全部保存在 Pinia，Cesium 只渲染当前视口内的点。
  private readonly points = usePoints().points;
  private visibleIds = new Set<number>();
  private visiblePrimitive?: Primitive;
  private visibilityTimer?: ReturnType<typeof setTimeout>;
  viewer = JkBase.viewer;

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
    }, POINT_LOAD_DELAY);
  };

  /**
   * 根据当前相机视口重建点位 Primitive。
   * Primitive 不支持像 Entity 一样逐个增删，因此每次视口变化时批量替换。
   */
  syncVisiblePoints() {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    const rectangle = this.viewer.camera.computeViewRectangle(
      this.viewer.scene.globe.ellipsoid,
    );

    const visiblePoints = rectangle
      ? this.points.filter((point) => this.isPointInRectangle(point, rectangle))
      : [];

    this.replacePrimitive(visiblePoints);
  }

  /** 判断点位是否在当前视口矩形内，同时处理跨越 ±180° 经线的情况。 */
  private isPointInRectangle(point: PointPosition, rectangle: Rectangle) {
    const cartographic = Cartographic.fromDegrees(
      point.longitude,
      point.latitude,
      point.height,
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

  /** 批量创建当前视口点位，并替换上一批 Primitive。 */
  private replacePrimitive(points: PointPosition[]) {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    const nextIds = new Set(points.map((point) => point.id));
    const nextPrimitive = points.length
      ? new Primitive({
          geometryInstances: points.map((point) => this.createGeometryInstance(point)),
          appearance: new PerInstanceColorAppearance({
            flat: true,
            translucent: false,
          }),
          asynchronous: false,
          allowPicking: false,
          releaseGeometryInstances: true,
        })
      : undefined;

    if (nextPrimitive) {
      this.viewer.scene.primitives.add(nextPrimitive);
    }

    if (this.visiblePrimitive) {
      this.viewer.scene.primitives.remove(this.visiblePrimitive);
      this.visiblePrimitive.destroy();
    }

    this.visiblePrimitive = nextPrimitive;
    this.visibleIds = nextIds;
    this.emitChange();
  }

  private createGeometryInstance(point: PointPosition) {
    return new GeometryInstance({
      id: `global-point-${point.id}`,
      geometry: new EllipsoidGeometry({
        radii: new Cartesian3(POINT_RADIUS, POINT_RADIUS, POINT_RADIUS),
      }),
      modelMatrix: Transforms.eastNorthUpToFixedFrame(
        Cartesian3.fromDegrees(point.longitude, point.latitude, point.height),
      ),
      attributes: {
        color: ColorGeometryInstanceAttribute.fromColor(Color.CYAN),
      },
    });
  }

  private emitChange() {
    this.dispatchEvent(
      new CustomEvent(cEnum.points_change, {
        detail: {
          loaded: this.visibleIds.size,
          total: this.points.length,
        },
      }),
    );
  }

  clear() {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    if (this.visiblePrimitive) {
      this.viewer.scene.primitives.remove(this.visiblePrimitive);
      this.visiblePrimitive.destroy();
      this.visiblePrimitive = undefined;
    }

    this.visibleIds.clear();
  }

  destroy() {
    if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer);
      this.visibilityTimer = undefined;
    }

    this.clear();
  }
}
