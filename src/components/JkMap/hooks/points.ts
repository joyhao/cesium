import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  LabelCollection,
  LabelStyle,
  Primitive,
} from "cesium";
import { usePoints, POINT_COUNT } from "@store/points";
import { cEnum } from "../event/event";
import type { Point, WorkerResult } from "../type/map.type";
import { JkBase } from "./base";

import { CLICK_THRESHOLD } from "../entity/entity";
import { createCircle } from "../shape/circle";
import { pickColor } from "../../../utils/utils";

export class JkPoints extends JkBase {
  worker = new Worker(new URL("../worker/points.worker.ts", import.meta.url), {
    type: "module",
  });

  viewer = JkBase.viewer;
  uPoint = usePoints();
  // 点位分帧生成，初始为空，随帧累积；totalCount 记录目标总数用于统计。
  points: Point[] = [];
  private totalCount = 0;

  private visibleCount = 0;
  private visiblePrimitive?: Primitive;
  // 所有点位的文字标签集合，label 取自统一后的 Point.label。
  private labelCollection?: LabelCollection;
  private visibilityTimer?: ReturnType<typeof setTimeout>;

  // 最近一次 Worker 回传的可见点位完整对象与坐标，供渲染、拾取、标签使用。
  private visiblePositions?: Float64Array;
  private visiblePoints: Point[] = [];

  // 当前鼠标悬停的点位 id（同一时刻最多一个，移开则为 undefined）。
  private hoverId: number | undefined = undefined;
  // 当前悬停的点位完整对象，供上层计算屏幕坐标、渲染编辑/删除图标使用。
  private hoveredPoint?: Point;
  // 手动添加节点的 id 集合（与 worker 的 manualIds 对应），用于标记 added 与清除。
  private addedIds = new Set<number>();
  // 下次 Worker 回传结果时强制重建（标签文字变更但可见集合不变时用）。
  private pendingForceRebuild = false;
  // 下次 Worker 回传结果时打印当前节点数组（增/删/改操作后置位）。
  // 真正反映当前数据的是 Worker 回传的过滤结果 data.points，而非主线程镜像。
  private pendingPrint = false;

  private hoverTimer?: ReturnType<typeof setTimeout>;

  // 节点添加模式：开启后左键在地图上落点，而非进行点位拾取。
  private isAddPoint = false;
  // 待确认落点的世界坐标：左键落点后弹窗，确认才真正作为点位下发。
  private pendingCartesian?: Cartesian3;

  constructor() {
    super();

    // 分帧生成点位并增量下发，避免一次性生成 + 传输全量数据阻塞主线程。
    this.generatePointsInFrames();

    // 所有点位的文字标签集合（label 取自统一后的 Point.label）。
    this.labelCollection = this.viewer.scene.primitives.add(
      new LabelCollection({ scene: this.viewer.scene }),
    );

    // 绑定事件
    this.worker.addEventListener("message", this.onWorkerMessage);

    // 相机移动时若正悬停某节点，重新计算其屏幕坐标并派发，使图标跟随节点。
    this.viewer.camera.changed.addEventListener(() => {
      if (this.hoveredPoint && !this.isAddPoint) this.emitHover();
    });

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
    // 节点添加模式：左键落点，不进入拾取逻辑。
    if (this.isAddPoint) {
      this.addPoint(position);
      return;
    }

    // 普通模式：仅做点位拾取，命中则打印 id（手动节点也是普通点位，自然命中）。
    const id = this.pickPoint(position);
    if (id !== undefined) {
      console.log(id);
    }
  }

  /** 切换节点添加模式，返回新模式是否开启。 */
  toggleAddPoint(): boolean {
    this.isAddPoint = !this.isAddPoint;
    if (!this.isAddPoint) {
      this.viewer.scene.canvas.style.cursor = "default";
    }
    return this.isAddPoint;
  }

  /**
   * 左键落点：反投影屏幕坐标到世界坐标，暂存为待确认坐标并发出请求，
   * 由弹窗表单确认名称（label）后才真正落图。
   */
  private addPoint(position: Cartesian2) {
    const cart =
      this.viewer.scene.pickPosition(position) ??
      this.viewer.camera.pickEllipsoid(
        position,
        this.viewer.scene.globe.ellipsoid,
      );
    if (!cart) return;

    const cartographic = Cartographic.fromCartesian(cart);
    const lon = (cartographic.longitude * 180) / Math.PI;
    const lat = (cartographic.latitude * 180) / Math.PI;
    const height = cartographic.height;

    // 暂存待确认坐标，弹窗确认后再落点。
    this.pendingCartesian = cart;
    this.emit(cEnum.add_point_request, { position: cart, lon, lat, height });
  }

  /** 弹窗确认后，把节点作为普通点位下发 Worker，由现有渲染管线统一着色/打标签。 */
  commitAddPoint(label: string) {
    if (!this.pendingCartesian) return;

    const cartographic = Cartographic.fromCartesian(this.pendingCartesian);
    const lon = (cartographic.longitude * 180) / Math.PI;
    const lat = (cartographic.latitude * 180) / Math.PI;
    const height = cartographic.height;
    // 时间戳*1000 + 随机后缀，避免与批量点位（0..N）冲突；正数 id，靠 worker 的 manualIds 区分手动节点。
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const point: Point = { id, lon, lat, height, label };
    this.addedIds.add(id);

    // 与批量点位走同一条 “add → filter → replacePrimitive → eachList” 链路，
    // 颜色、标签、悬停、点击全部复用既有逻辑，不再单独维护一套渲染分支。
    this.worker.postMessage({ type: "add_manual", points: [point] });
    this.pendingCartesian = undefined;

    // 立即按当前视口重新筛选，让新点进入可见集合并重绘；
    // 待 Worker 回传过滤结果后再打印当前节点数组。
    this.pendingPrint = true;
    this.syncVisiblePoints();
  }

  /** 取消本次添加，丢弃待确认坐标。 */
  cancelAddPoint() {
    this.pendingCartesian = undefined;
  }

  onMoveClick(startPosition: Cartesian2, endPosition: Cartesian2) {
    // 节点添加模式：固定十字光标，不处理悬停拾取。
    if (this.isAddPoint) {
      this.viewer.scene.canvas.style.cursor = "crosshair";
      return;
    }
    // 节流：一个周期内只处理一次，避免高频 mousemove 卡顿。
    if (this.hoverTimer) return;
    this.hoverTimer = setTimeout(() => {
      this.hoverTimer = undefined;
      this.applyHover(endPosition);
    }, 30);
  }

  /** 拾取鼠标下的点位并更新 hover 状态，命中变化才重绘。 */
  private applyHover(position: Cartesian2) {
    const id = this.pickPoint(position);
    if (id === this.hoverId) return;
    this.hoverId = id;
    // 命中点位显示手型光标，提示可点击；移开恢复默认。
    // 连线态的十字光标由 JkLines 在 on_move_click 中重新断言，不在此处理。
    this.viewer.scene.canvas.style.cursor =
      id !== undefined ? "pointer" : "default";
    if (this.visiblePositions) {
      this.replacePrimitive(this.visiblePositions, this.visiblePoints, true);
    }
    // 同步悬停节点详情给上层，用于渲染编辑/删除图标。
    this.hoveredPoint =
      id !== undefined
        ? this.visiblePoints.find((p) => p.id === id)
        : undefined;
    this.emitHover();
  }

  /** 计算悬停节点的屏幕坐标并派发 point_hover（无悬停或不在屏幕内则派发 null）。 */
  private emitHover() {
    if (!this.hoveredPoint) {
      this.emit(cEnum.point_hover, null);
      return;
    }
    const cart = Cartesian3.fromDegrees(
      this.hoveredPoint.lon,
      this.hoveredPoint.lat,
      this.hoveredPoint.height,
    );
    const screen = this.viewer.scene.cartesianToCanvasCoordinates(cart);
    if (!screen) {
      this.emit(cEnum.point_hover, null);
      return;
    }
    this.emit(cEnum.point_hover, {
      id: this.hoveredPoint.id,
      x: screen.x,
      y: screen.y,
      label: this.hoveredPoint.label,
      lon: this.hoveredPoint.lon,
      lat: this.hoveredPoint.lat,
      height: this.hoveredPoint.height,
      added: this.addedIds.has(this.hoveredPoint.id),
    });
  }

  /** 删除指定节点：从 Worker 移除后重新按视口筛选重绘。 */
  removePoint(id: number) {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    this.worker.postMessage({ type: "remove", id });
    this.addedIds.delete(id);
    this.hoveredPoint = undefined;
    this.hoverId = undefined;
    this.emitHover();
    // 待 Worker 回传过滤结果后再打印当前节点数组。
    this.pendingPrint = true;
    this.syncVisiblePoints();
  }

  /** 修改指定节点的名称（label）：更新 Worker 并强制重建标签文字。 */
  updatePointLabel(id: number, label: string) {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    this.worker.postMessage({ type: "update", id, label });
    if (this.hoveredPoint?.id === id) this.hoveredPoint.label = label;
    // 可见集合未变，需强制重建才能刷新文字标签。
    this.pendingForceRebuild = true;
    // 待 Worker 回传过滤结果（已含新 label）后再打印当前节点数组。
    this.pendingPrint = true;
    this.syncVisiblePoints();
  }

  /**
   * 把屏幕坐标反投影到可见点位，返回容差内最近的那个点 id。
   * 手动添加的节点也是普通点位，会随视口筛选进入 visiblePoints，自然被命中。
   * @param position  鼠标位置
   * @returns
   */
  private pickPoint(position: Cartesian2): number | undefined {
    if (!this.viewer || !this.visiblePositions) return undefined;

    const scene = JkBase.viewer.scene;
    let bestId: number | undefined;
    let bestDist = CLICK_THRESHOLD;

    for (let i = 0; i < this.visiblePoints.length; i++) {
      const cart = new Cartesian3(
        this.visiblePositions[i * 3],
        this.visiblePositions[i * 3 + 1],
        this.visiblePositions[i * 3 + 2],
      );

      // 三维笛卡尔坐标 转换成 二维笛卡尔坐标(canvas 元素坐标)
      const screen = scene.cartesianToCanvasCoordinates(cart);
      if (!screen) continue;

      const dist = Math.hypot(screen.x - position.x, screen.y - position.y);
      if (dist <= bestDist) {
        bestDist = dist;
        bestId = this.visiblePoints[i].id;
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

  private onWorkerMessage = (event: MessageEvent<WorkerResult>) => {
    const data = event.data;
    if (data.type !== "result") return;
    // 仅改标签时可见集合不变，需借助强制标记触发标签重建。
    const force = this.pendingForceRebuild;
    this.pendingForceRebuild = false;
    this.replacePrimitive(data.positions, data.points, force);
    // 增/删/改操作完成、Worker 已回传最新过滤结果后，打印当前节点数组。
    // 此处 data.points 才是真正反映增删改后的数据（含原始批量点位）。
    if (this.pendingPrint) {
      this.pendingPrint = false;
      console.log("[节点数组]", data.points);
    }
  };

  /** 用 Worker 回传的坐标与完整点位批量构建一个 Primitive。 */
  private replacePrimitive(
    positions: Float64Array,
    points: Point[],
    force = false,
  ) {
    const setChanged = !this.sameVisibleSet(points);

    // 视口内点位集合未变化（且非强制重绘）时不重建，避免无谓开销。
    if (!force && !setChanged) return;

    // 单遍遍历点位：同时算颜色数组、按需重建标签，圆点与文字拧到一处。
    // rebuildLabels 在“集合变化”或“强制重建（如改标签）”时为真，才会刷新文字。
    const colors = this.eachList(positions, points, force || setChanged);

    const primitive = createCircle(positions, colors);

    if (primitive) {
      this.viewer.scene.primitives.add(primitive);
    }

    this.removeVisiblePrimitive();

    this.visiblePrimitive = primitive;
    this.visibleCount = positions.length / 3;

    this.visiblePositions = positions;
    this.visiblePoints = points;
    this.emitChange();
  }

  /**
   * 单遍遍历点位，同时产出 aColor 颜色数组与文字标签：
   * - 颜色每点必算（点击/悬停改色也走这里）；
   * - 标签仅在可见集合变化时重建（rebuildLabels=true），hover/点击只改色跳过，避免抖动。
   * 合并后每次重建只迭代点位一次，圆点与文字逻辑收进同一处。
   */
  private eachList(
    positions: Float64Array,
    points: Point[],
    rebuildLabels: boolean,
  ): Float32Array {
    const count = points.length;
    const colors = new Float32Array(count * 4);
    if (rebuildLabels) this.labelCollection?.removeAll();

    for (let i = 0; i < count; i++) {
      const point = points[i];

      const color = pickColor(this.hoverId, point.id);
      colors[i * 4] = color[0];
      colors[i * 4 + 1] = color[1];
      colors[i * 4 + 2] = color[2];
      colors[i * 4 + 3] = color[3];

      if (rebuildLabels) {
        this.labelCollection?.add({
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

    return colors;
  }

  /**
   * 对比上一次视口点位集合是否完全一致（数量与每个 id 都相同）
   * @param nextIds
   * @returns
   */
  private sameVisibleSet(nextPoints: Point[]): boolean {
    const prev = this.visiblePoints;
    if (nextPoints.length !== prev.length) return false;
    const prevIds = new Set(prev.map((p) => p.id));
    return nextPoints.every((p) => prevIds.has(p.id));
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
    this.visibleCount = 0;
    this.visiblePositions = undefined;
    this.visiblePoints = [];
    this.hoverId = undefined;
    this.hoveredPoint = undefined;
    this.addedIds.clear();
    this.emitChange();
  }

  /** 清空手动添加的节点：从 Worker 移除并重新筛选重绘。 */
  clearAdded() {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    this.pendingCartesian = undefined;
    this.addedIds.clear();
    this.worker.postMessage({ type: "clear_added" });
    // 待 Worker 回传过滤结果后再打印当前节点数组。
    this.pendingPrint = true;
    this.syncVisiblePoints();
  }

  destroy() {
    this.offAllListeners();
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

    this.pendingCartesian = undefined;
    this.clear();
  }
}
