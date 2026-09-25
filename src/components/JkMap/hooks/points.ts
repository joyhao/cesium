import {
  Appearance,
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  ComponentDatatype,
  Geometry,
  GeometryAttribute,
  GeometryAttributes,
  GeometryInstance,
  Primitive,
  PrimitiveType,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
} from "cesium";
import { usePoints, POINT_COUNT } from "@store/points";
import { cEnum } from "../event/event";
import type { PointPosition } from "../type/map.type";
import { JkBase } from "./base";

import circleVertShader from "@com/JkMap/shader/circle.vert.glsl";
import circleFragShader from "@com/JkMap/shader/circle.frag.glsl";

type WorkerResult = { type: "result"; positions: Float64Array; ids: number[] };

const DEFAULT_COLOR: [number, number, number, number] = [0, 0.85, 1, 1];
const SELECTED_COLOR: [number, number, number, number] = [1, 0.4, 0.1, 1];
const HOVER_COLOR: [number, number, number, number] = [1, 1, 0.4, 1];
// 点击命中容差（像素），pointSize 为 8，取 10 较宽松。
const CLICK_THRESHOLD = 10;
// 鼠标移动拾取节流（毫秒），避免高频 mousemove 造成卡顿。
const HOVER_THROTTLE = 30;

export class JkPoints extends JkBase {
  viewer = JkBase.viewer;
  uPoint = usePoints();
  // 点位分帧生成，初始为空，随帧累积；totalCount 记录目标总数用于统计。
  points: PointPosition[] = [];
  private totalCount = 0;

  // 当前视口筛选出的点位，统计值以视口筛选结果为准。
  private visibleIds = new Set<number>();
  private visibleCount = 0;
  private visiblePrimitive?: Primitive;
  private visibilityTimer?: ReturnType<typeof setTimeout>;
  private worker: Worker;

  // 最近一次 Worker 回传的可见点位坐标与 id，供 CPU 拾取使用。
  private visiblePositions?: Float64Array;
  private visibleIdsList: number[] = [];
  // 被点击选中的点位 id 集合（再次点击取消）。
  private selectedIds = new Set<number>();
  // 当前鼠标悬停的点位 id（同一时刻最多一个，移开则为 undefined）。
  private hoverId: number | undefined = undefined;

  private handler: ScreenSpaceEventHandler;
  private hoverTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    super();
    // 点位筛选放到 Worker 执行，主线程只负责建 Primitive。
    this.worker = new Worker(
      new URL("../worker/points.worker.ts", import.meta.url),
      { type: "module" }
    );
    this.worker.onmessage = this.onWorkerMessage;
    // 分帧生成点位并增量下发，避免一次性生成 + 传输全量数据阻塞主线程。
    this.generatePointsInFrames(POINT_COUNT);

    // 点击拾取：命中点位则切换其选中态并重新着色。
    this.handler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.handler.setInputAction(
      this.onLeftClick,
      ScreenSpaceEventType.LEFT_CLICK
    );
    // 悬停拾取：鼠标移到点位上即切换其悬停态并重新着色。
    this.handler.setInputAction(
      this.onMouseMove,
      ScreenSpaceEventType.MOUSE_MOVE
    );
  }

  private onWorkerMessage = (event: MessageEvent<WorkerResult>) => {
    const data = event.data;
    if (data.type !== "result") return;
    this.replacePrimitive(data.positions, data.ids);
  };

  private onLeftClick = (movement: { position: Cartesian2 }) => {
    const id = this.pickPoint(movement.position);
    if (id === undefined) return;

    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);

    // 颜色变了但点位集合没变，强制重建以应用新颜色。
    if (this.visiblePositions) {
      this.replacePrimitive(this.visiblePositions, this.visibleIdsList, true);
    }
  };

  private onMouseMove = (
    movement: { startPosition: Cartesian2; endPosition: Cartesian2 }
  ) => {
    // 节流：一个周期内只处理一次，避免高频 mousemove 卡顿。
    if (this.hoverTimer) return;
    const endPosition = movement.endPosition;
    this.hoverTimer = setTimeout(() => {
      this.hoverTimer = undefined;
      this.applyHover(endPosition);
    }, HOVER_THROTTLE);
  };

  /** 拾取鼠标下的点位并更新 hover 状态，命中变化才重绘。 */
  private applyHover(position: Cartesian2) {
    const id = this.pickPoint(position);
    if (id === this.hoverId) return;
    this.hoverId = id;
    // 悬停在点位上显示手型光标，提示可点击；移开恢复默认。
    if (this.viewer) {
      this.viewer.scene.canvas.style.cursor = id !== undefined ? "pointer" : "default";
    }
    if (this.visiblePositions) {
      this.replacePrimitive(this.visiblePositions, this.visibleIdsList, true);
    }
  }

  /** 把屏幕坐标反投影到可见点位，返回容差内最近的那个点 id。 */
  private pickPoint(position: Cartesian2): number | undefined {
    if (!this.viewer || !this.visiblePositions) return undefined;

    const scene = this.viewer.scene;
    let bestId: number | undefined;
    let bestDist = CLICK_THRESHOLD;

    for (let i = 0; i < this.visibleIdsList.length; i++) {
      const cart = new Cartesian3(
        this.visiblePositions[i * 3],
        this.visiblePositions[i * 3 + 1],
        this.visiblePositions[i * 3 + 2]
      );
      const screen = scene.cartesianToCanvasCoordinates(cart);
      if (!screen) continue;

      const dx = screen.x - position.x;
      const dy = screen.y - position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= bestDist) {
        bestDist = dist;
        bestId = this.visibleIdsList[i];
      }
    }

    return bestId;
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

  /**
   * 分帧生成点位：每帧只生成一小批（默认 1 万），立即发给 Worker 并刷新视口，
   * 帧间让出主线程，避免一次性循环 30 万点阻塞渲染。
   */
  private generatePointsInFrames(total: number, chunkSize = 10_000) {
    this.totalCount = total;
    let generated = 0;

    const step = () => {
      if (!this.viewer || this.viewer.isDestroyed()) return;

      const end = Math.min(generated + chunkSize, total);
      const chunk = this.uPoint.createPoints(end - generated, generated);
      this.points.push(...chunk);
      this.worker.postMessage({ type: "add", points: chunk });
      this.syncVisiblePoints();

      generated = end;
      if (generated < total) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }

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
  private replacePrimitive(
    positions: Float64Array,
    ids: number[],
    force = false
  ) {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    const nextIds = new Set(ids);

    // 视口内点位集合未变化时不重建 Primitive，避免无谓开销。
    if (!force && this.sameVisibleSet(nextIds)) return;

    const nextPrimitive = positions.length
      ? new Primitive({
          geometryInstances: new GeometryInstance({
            geometry: this.createGeometryFromPositions(positions, ids),
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
    this.visiblePositions = positions;
    this.visibleIdsList = ids;
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
   * gl_PointSize 渲染圆点；每个点再带一个 aColor 顶点属性用于点击变色。
   * 只有一个几何体、一次 draw call，渲染 1 万点也很轻量。
   */
  private createGeometryFromPositions(positions: Float64Array, ids: number[]) {
    const count = positions.length / 3;
    const colors = new Float32Array(count * 4);

    for (let i = 0; i < count; i++) {
      let color: [number, number, number, number];
      if (this.selectedIds.has(ids[i])) color = SELECTED_COLOR;
      else if (this.hoverId === ids[i]) color = HOVER_COLOR;
      else color = DEFAULT_COLOR;
      colors[i * 4] = color[0];
      colors[i * 4 + 1] = color[1];
      colors[i * 4 + 2] = color[2];
      colors[i * 4 + 3] = color[3];
    }

    const attributes = new GeometryAttributes();
    attributes.position = new GeometryAttribute({
      componentDatatype: ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: positions,
    });
    // @ts-ignore
    attributes.aColor = new GeometryAttribute({
      componentDatatype: ComponentDatatype.FLOAT,
      componentsPerAttribute: 4,
      values: colors,
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
          total: this.totalCount,
        },
      })
    );
  }

  clear() {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    this.removeVisiblePrimitive();
    this.visibleIds.clear();
    this.visibleCount = 0;
    this.visiblePositions = undefined;
    this.visibleIdsList = [];
    this.hoverId = undefined;
    if (this.viewer) this.viewer.scene.canvas.style.cursor = "default";
    this.emitChange();
  }

  destroy() {
    if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer);
      this.visibilityTimer = undefined;
    }
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = undefined;
    }

    this.handler.destroy();
    this.worker.terminate();
    this.clear();
  }
}
