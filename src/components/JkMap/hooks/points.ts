import {
  Cartesian2,
  Cartesian3,
  Color,
  LabelCollection,
  LabelStyle,
  Primitive,
} from "cesium";
import { usePoints, POINT_COUNT } from "@store/points";
import { cEnum } from "../event/event";
import type { PointPosition, WorkerResult } from "../type/map.type";
import { JkBase } from "./base";

import { CLICK_THRESHOLD } from "../entity/entity";
import { createCircle } from "../shape/circle";
import { computeColors } from "../utils";

export class JkPoints extends JkBase {
  worker = new Worker(new URL("../worker/points.worker.ts", import.meta.url), {
    type: "module",
  });

  viewer = JkBase.viewer;
  uPoint = usePoints();
  // 点位分帧生成，初始为空，随帧累积；totalCount 记录目标总数用于统计。
  points: PointPosition[] = [];
  private totalCount = 0;

  // 当前视口筛选出的点位，统计值以视口筛选结果为准。
  private visibleIds = new Set<number>();
  private visibleCount = 0;
  private visiblePrimitive?: Primitive;
  // 所有点位的文字标签集合，label 取自统一后的 PointPosition.label。
  private labelCollection?: LabelCollection;
  private visibilityTimer?: ReturnType<typeof setTimeout>;

  // 最近一次 Worker 回传的可见点位坐标与 id，供 CPU 拾取使用。
  private visiblePositions?: Float64Array;
  private visibleIdsList: number[] = [];
  // 被点击选中的点位 id 集合（再次点击取消）。
  private selectedIds = new Set<number>();
  // 当前鼠标悬停的点位 id（同一时刻最多一个，移开则为 undefined）。
  private hoverId: number | undefined = undefined;

  private hoverTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    super();

    // 分帧生成点位并增量下发，避免一次性生成 + 传输全量数据阻塞主线程。
    this.generatePointsInFrames();

    // 所有点位的文字标签集合（label 取自统一后的 PointPosition.label）。
    this.labelCollection = this.viewer.scene.primitives.add(
      new LabelCollection({ scene: this.viewer.scene }),
    );

    // 绑定事件
    this.worker.addEventListener("message", this.onWorkerMessage);

    this.on("on_left_click", (event) => {
      const { position } = event.detail;
      this.onLeftClick(position);
    });

    this.on("on_move_click", (event) => {
      const { startPosition, endPosition } = event.detail;
      this.onMoveClick(startPosition, endPosition);
    });
  }

  onLeftClick(position: Cartesian2) {
    const id = this.pickPoint(position);
    if (id === undefined) return;

    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);

    // 颜色变了但点位集合没变，强制重建以应用新颜色。
    if (this.visiblePositions) {
      this.replacePrimitive(this.visiblePositions, this.visibleIdsList, true);
    }
  }

  onMoveClick(startPosition: Cartesian2, endPosition: Cartesian2) {
    // 节流：一个周期内只处理一次，避免高频 mousemove 卡顿。
    if (this.hoverTimer) return;
    this.hoverTimer = setTimeout(() => {
      this.hoverTimer = undefined;
      this.applyHover(endPosition);
    }, 30);
  }

  private onWorkerMessage = (event: MessageEvent<WorkerResult>) => {
    const data = event.data;
    if (data.type !== "result") return;
    this.replacePrimitive(data.positions, data.ids);
  };

  /** 拾取鼠标下的点位并更新 hover 状态，命中变化才重绘。 */
  private applyHover(position: Cartesian2) {
    const id = this.pickPoint(position);
    if (id === this.hoverId) return;
    this.hoverId = id;
    // 悬停在点位上显示手型光标，提示可点击；移开恢复默认。
    if (this.viewer) {
      this.viewer.scene.canvas.style.cursor =
        id !== undefined ? "pointer" : "default";
    }
    if (this.visiblePositions) {
      this.replacePrimitive(this.visiblePositions, this.visibleIdsList, true);
    }
  }

  /** 把屏幕坐标反投影到可见点位，返回容差内最近的那个点 id。 */
  private pickPoint(position: Cartesian2): number | undefined {
    if (!this.viewer || !this.visiblePositions) return undefined;

    const scene = JkBase.viewer.scene;
    let bestId: number | undefined;
    let bestDist = CLICK_THRESHOLD;

    for (let i = 0; i < this.visibleIdsList.length; i++) {
      const cart = new Cartesian3(
        this.visiblePositions[i * 3],
        this.visiblePositions[i * 3 + 1],
        this.visiblePositions[i * 3 + 2],
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

  /**
   * 分帧生成点位：每帧只生成一小批（默认 1000），立即发给 Worker 并刷新视口，
   * 帧间让出主线程，避免一次性循环 30 万点阻塞渲染。
   */
  private generatePointsInFrames(chunkSize = 1000) {
    this.totalCount = POINT_COUNT;

    let generated = 0;

    const step = () => {
      const end = Math.min(generated + chunkSize, this.totalCount);

      const chunk = this.uPoint.createPoints(chunkSize, generated);

      this.points.push(...chunk);
      this.worker.postMessage({ type: "add", points: chunk });

      generated = end;

      if (generated < this.totalCount) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
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
   * 计算视口矩形，交给 Worker 筛选点位并返回坐标数组
   * @returns
   */
  syncVisiblePoints() {
    //  地球椭球体（Ellipsoid）对象   WGS84
    const rectangle = this.viewer.camera.computeViewRectangle(
      this.viewer.scene.globe.ellipsoid,
    );

    // 相机正在初始化或视角朝向太空时没有有效视口，直接清空。
    if (!rectangle) {
      this.replacePrimitive(new Float64Array(0), []);
      return;
    }

    this.worker.postMessage({
      type: "filter",
      rectangle,
    });
  }

  /** 用 Worker 回传的坐标数组批量构建一个 Primitive。 */
  private replacePrimitive(
    positions: Float64Array,
    ids: number[],
    force = false,
  ) {
    // Worker 只按经纬度视口矩形粗筛，这里再按屏幕坐标精筛画布外的点，
    // 保证统计数与实际渲染数一致（否则会出现"显示 5 个只见 4 个"）。
    const visible = this.cullToCanvas(positions, ids);
    const nextIds = new Set(visible.ids);
    const setChanged = !this.sameVisibleSet(nextIds);

    // 视口内点位集合未变化（且非强制重绘）时不重建，避免无谓开销。
    if (!force && !setChanged) return;

    // 视口内无点位时直接清空：空几何会让 Cesium 创建 0 字节顶点缓冲而抛错。
    if (visible.positions.length === 0) {
      this.removeVisiblePrimitive();
      this.labelCollection?.removeAll();
      this.visiblePrimitive = undefined;
      this.visibleIds = nextIds;
      this.visibleCount = 0;
      this.visiblePositions = visible.positions;
      this.visibleIdsList = visible.ids;
      this.emitChange();
      return;
    }

    const colors = computeColors(visible.ids, this.selectedIds, this.hoverId);
    const primitive = createCircle(visible.positions, colors);

    if (primitive) {
      this.viewer.scene.primitives.add(primitive);
    }

    this.removeVisiblePrimitive();

    this.visiblePrimitive = primitive;
    this.visibleIds = nextIds;
    this.visibleCount = visible.positions.length / 3;
    this.visiblePositions = visible.positions;
    this.visibleIdsList = visible.ids;
    // 点位集合变化时才重建标签；hover/点击只改色，跳过标签重建避免抖动。
    if (setChanged) this.updateLabels(visible.positions, visible.ids);
    this.emitChange();
  }

  /**
   * 按屏幕坐标剔除画布外的点。Worker 的经纬度视口矩形是包围盒，边界处可能比
   * 实际画布更大；保留约半个最大点径的边距，让边缘只露一半的点仍算可见。
   */
  private cullToCanvas(positions: Float64Array, ids: number[]) {
    const scene = this.viewer.scene;
    const { clientWidth: width, clientHeight: height } = scene.canvas;
    const keptPositions = new Float64Array(positions.length);
    const keptIds: number[] = [];
    const cart = new Cartesian3();
    const margin = 32;
    let n = 0;

    for (let i = 0; i < ids.length; i++) {
      cart.x = positions[i * 3];
      cart.y = positions[i * 3 + 1];
      cart.z = positions[i * 3 + 2];

      const screen = scene.cartesianToCanvasCoordinates(cart);
      if (
        !screen ||
        screen.x < -margin ||
        screen.x > width + margin ||
        screen.y < -margin ||
        screen.y > height + margin
      ) {
        continue;
      }

      keptPositions[n * 3] = cart.x;
      keptPositions[n * 3 + 1] = cart.y;
      keptPositions[n * 3 + 2] = cart.z;
      keptIds.push(ids[i]);
      n++;
    }

    return { positions: keptPositions.subarray(0, n * 3), ids: keptIds };
  }

  /** 用统一后的 PointPosition.label 重建标签集合；仅在可见点位集合变化时调用。 */
  private updateLabels(positions: Float64Array, ids: number[]) {
    if (!this.labelCollection) return;
    this.labelCollection.removeAll();

    for (let i = 0; i < ids.length; i++) {
      const point = this.points[ids[i]];
      if (!point) continue;

      this.labelCollection.add({
        position: new Cartesian3(
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2],
        ),
        text: point.label,
        font: "12px sans-serif",
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 2,
        style: LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cartesian2(0, -14),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
    }
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

  private emitChange() {
    this.emit(cEnum.points_change, {
      loaded: this.visibleCount,
      total: this.totalCount,
    });
  }

  clear() {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    this.removeVisiblePrimitive();
    this.labelCollection?.removeAll();
    this.visibleIds.clear();
    this.visibleCount = 0;
    this.visiblePositions = undefined;
    this.visibleIdsList = [];
    this.hoverId = undefined;
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

    this.worker.terminate();

    if (this.labelCollection && !this.viewer.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.labelCollection);
      this.labelCollection = undefined;
    }

    this.clear();
  }
}
