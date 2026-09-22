import { Cartesian3, Cartographic, Color, Rectangle } from "cesium";
import { usePoints } from "@store/points";
import { cEnum } from "../event/event";
import type { PointPosition } from "../type/map.type";
import { JkBase } from "./base";

// 相机停止移动后延迟同步，避免拖动/缩放过程中反复增删 Entity。
const POINT_LOAD_DELAY = 300;

export class JkPoints extends JkBase {
  // 点位原始数据：10,000 个全球点位。
  private readonly points = usePoints().points;
  // 当前已经创建为 Cesium Entity 的点位 ID。
  private readonly loadedIds = new Set<number>();
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

  // 根据当前相机视口增量同步 Entity：可见点添加，离开视口的点移除。
  private syncVisiblePoints() {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    const rectangle = this.viewer.camera.computeViewRectangle(
      this.viewer.scene.globe.ellipsoid,
    );

    if (!rectangle) {
      this.clear();
      this.emitChange();
      return;
    }

    const visibleIds = new Set(
      this.points
        .filter((point) => this.isPointInRectangle(point, rectangle))
        .map((point) => point.id),
    );
    const previousCount = this.loadedIds.size;

    this.loadedIds.forEach((id) => {
      if (!visibleIds.has(id)) {
        this.removePoint(id);
      }
    });

    this.points.forEach((point) => {
      if (visibleIds.has(point.id) && !this.loadedIds.has(point.id)) {
        this.addPoint(point);
      }
    });

    if (previousCount !== this.loadedIds.size) {
      this.emitChange();
    }
  }

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
      cartographic.longitude >= rectangle.west ||
      cartographic.longitude <= rectangle.east
    ) &&
      cartographic.latitude >= rectangle.south &&
      cartographic.latitude <= rectangle.north;
  }

  private addPoint(point: PointPosition) {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    this.viewer.entities.add({
      id: this.getEntityId(point.id),
      position: Cartesian3.fromDegrees(
        point.longitude,
        point.latitude,
        point.height,
      ),
      point: {
        pixelSize: 7,
        color: Color.CYAN,
        outlineColor: Color.WHITE,
        outlineWidth: 1,
      },
    });

    this.loadedIds.add(point.id);
  }

  private removePoint(id: number) {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    this.viewer.entities.removeById(this.getEntityId(id));
    this.loadedIds.delete(id);
  }

  private getEntityId(id: number) {
    return `global-point-${id}`;
  }

  private emitChange() {
    this.dispatchEvent(
      new CustomEvent(cEnum.points_change, {
        detail: {
          loaded: this.loadedIds.size,
          total: this.points.length,
        },
      }),
    );
  }

  clear() {
    [...this.loadedIds].forEach((id) => this.removePoint(id));
  }

  destroy() {
    if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer);
      this.visibilityTimer = undefined;
    }

    this.clear();
  }
}
