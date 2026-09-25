import {
  Appearance,
  BoundingSphere,
  ComponentDatatype,
  Geometry,
  GeometryAttribute,
  GeometryAttributes,
  GeometryInstance,
  Primitive,
  PrimitiveType,
} from "cesium";
import { usePoints } from "@store/points";
import { cEnum } from "../event/event";
import type { PointPosition } from "../type/map.type";
import { JkBase } from "./base";

import circleVertShader from "@com/JkMap/shader/circle.vert.glsl";
import circleFragShader from "@com/JkMap/shader/circle.frag.glsl";

type WorkerResult = { type: "result"; positions: Float64Array; ids: number[] };

export class JkPoints extends JkBase {
  viewer = JkBase.viewer;
  uPoint = usePoints();
  points = this.uPoint.createPoints();

  // 当前视口筛选出的点位，统计值以视口筛选结果为准。
  private visibleIds = new Set<number>();
  private visibleCount = 0;
  private visiblePrimitive?: Primitive;
  private visibilityTimer?: ReturnType<typeof setTimeout>;
  private worker: Worker;

  constructor() {
    super();
    // 点位筛选放到 Worker 执行，主线程只负责建 Primitive。
    this.worker = new Worker(
      new URL("../worker/points.worker.ts", import.meta.url),
      { type: "module" }
    );
    this.worker.onmessage = this.onWorkerMessage;
    // 全量点位只下发一次，后续只传视口矩形。
    this.worker.postMessage({ type: "init", points: this.points });
    this.syncVisiblePoints();
  }

  private onWorkerMessage = (event: MessageEvent<WorkerResult>) => {
    const data = event.data;
    if (data.type !== "result") return;
    this.replacePrimitive(data.positions, data.ids);
  };

  scheduleVisibilityUpdate = () => {
    if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer);
    }

    this.visibilityTimer = setTimeout(() => {
      this.visibilityTimer = undefined;
      this.syncVisiblePoints();
    }, 300);
  };

  /** 计算视口矩形，交给 Worker 筛选点位并返回坐标数组。 */
  syncVisiblePoints() {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    const rectangle = this.viewer.camera.computeViewRectangle(this.ellipsoid);

    // 相机正在初始化或视角朝向太空时没有有效视口，直接清空。
    if (!rectangle) {
      this.replacePrimitive(new Float64Array(0), []);
      return;
    }

    this.worker.postMessage({
      type: "filter",
      rectangle: {
        west: rectangle.west,
        east: rectangle.east,
        south: rectangle.south,
        north: rectangle.north,
      },
    });
  }

  /** 用 Worker 回传的坐标数组批量构建一个 Primitive。 */
  private replacePrimitive(positions: Float64Array, ids: number[]) {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    const nextIds = new Set(ids);

    // 视口内点位集合未变化时不重建 Primitive，避免无谓开销。
    if (this.sameVisibleSet(nextIds)) return;

    const nextPrimitive = positions.length
      ? new Primitive({
          geometryInstances: new GeometryInstance({
            geometry: this.createGeometryFromPositions(positions),
          }),
          appearance: new Appearance({
            vertexShaderSource: circleVertShader,
            fragmentShaderSource: circleFragShader,
            // 半透明
            translucent: true,
            closed: false,
            renderState: {
              // 绘制时写入深度缓冲 让点之间能正确互相遮挡
              depthMask: true,
              // 启深度测试
              depthTest: {
                enabled: true,
              },
            },
          }),
          // 自定义 Geometry 没有对应 worker，无法异步加载，必须同步创建。
          // 坐标已由 Worker 算好，这里只做轻量包装，同步开销很小。
          asynchronous: false,
          allowPicking: false,
          // 几何体创建完成后，释放 geometryInstances 数组的引用。
          releaseGeometryInstances: true,
        })
      : undefined;

    if (nextPrimitive) {
      this.viewer.scene.primitives.add(nextPrimitive);
    }

    this.removeVisiblePrimitive();

    this.visiblePrimitive = nextPrimitive;
    this.visibleIds = nextIds;
    this.visibleCount = positions.length / 3;
    this.emitChange();
  }

  /**
   * 对比上一次视口点位集合是否完全一致（数量与每个 id 都相同）
   * @param nextIds
   * @returns
   */
  private sameVisibleSet(nextIds: Set<number>) {
    const sameSize = nextIds.size === this.visibleIds.size;
    const allContained = [...nextIds].every((id) => this.visibleIds.has(id));
    return sameSize && allContained;
  }

  /** 移除并销毁上一个 Primitive；销毁中抛错忽略即可。 */
  private removeVisiblePrimitive() {
    const prev = this.visiblePrimitive;
    if (!prev || !this.viewer || this.viewer.isDestroyed()) return;

    this.visiblePrimitive = undefined;
    try {
      this.viewer.scene.primitives.remove(prev);
      if (!prev.isDestroyed()) prev.destroy();
    } catch {
      // 仍在销毁流程中的 Primitive 忽略异常。
    }
  }

  /**
   * 所有点位的 xyz 写入同一个 Geometry，使用 PrimitiveType.POINTS 让 GPU 以
   * gl_PointSize 渲染圆点。相比为每个点生成球体顶点的 EllipsoidGeometry，
   * 这种方式只有一个几何体、一次 draw call，渲染 1 万点也很轻量。
   */
  private createGeometryFromPositions(positions: Float64Array) {
    const attributes = new GeometryAttributes();
    attributes.position = new GeometryAttribute({
      componentDatatype: ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: positions,
    });

    return new Geometry({
      attributes,
      primitiveType: PrimitiveType.POINTS,
      boundingSphere: BoundingSphere.fromVertices(positions),
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

    this.worker.terminate();
    this.clear();
  }
}
