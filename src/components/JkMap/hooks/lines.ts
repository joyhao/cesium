import {
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Color,
  Entity,
  Label,
  LabelCollection,
  LabelStyle,
  Primitive,
} from "cesium";
import { cEnum } from "../event/event";
import { JkBase } from "./base";
import type {
  LineData,
  LineHoverDetail,
  LineRecord,
  Position,
} from "../type/map.type";
import { LINE_WIDTH_PIXELS, PolylineBuilder } from "../shape/polyline";

/** 点 p 到线段 ab 的最短距离及垂足（屏幕坐标），供线段 hover 拾取。 */
function pointToSegment(p: Cartesian2, a: Cartesian2, b: Cartesian2) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const foot = new Cartesian2(a.x + t * dx, a.y + t * dy);
  const dist = Math.hypot(p.x - foot.x, p.y - foot.y);
  return { dist, foot };
}

/**
 * 线段绘制与回显模块：从 JkPoints 抽取出的画线逻辑。
 * 负责连线模式开关、左键加点、右键结束，以及已完成线段的记录 / 定位 / 删除 / 高亮。
 * 事件沿 JkBase 的全局总线派发，订阅方（如 JkMap.vue）直接监听即可。
 */
export class JkLines extends JkBase {
  viewer = JkBase.viewer;

  // 连线模式开关：true=左键追加折线顶点、右键结束；false=普通拾取模式
  isLine = false;

  private builder = new PolylineBuilder();
  private primitive?: Primitive;

  // 已绘制线段列表（用于回显面板），以及高亮叠加与当前聚焦项。
  private records: LineRecord[] = [];
  private seq = 0;
  private highlightEntity?: Entity;
  private focusedId?: number;

  // 当前鼠标悬停的线段 id（同一时刻最多一条），移开则为 undefined。
  private hoverLineId?: number;
  // 当前悬停线段的屏幕信息与名称，供上层渲染编辑/删除图标。
  private hoveredLine?: LineHoverDetail;
  // 线段 hover 拾取的节流定时器。
  private hoverTimer?: ReturnType<typeof setTimeout>;
  // 屏幕空间 hover 命中阈值（像素），略大于线宽以便容易选中。
  private readonly LINE_HOVER_THRESHOLD = 12;

  // 线段名称文字标签集合，每条已绘制线段在场景里显示一个标签。
  private labelCollection?: LabelCollection;
  // 线段 id → 场景标签对象的映射，便于重命名 / 删除时定位。
  private lineLabels = new Map<number, Label>();


  constructor() {
    super();

    // 线段名称文字标签集合（每条已绘制线段在场景里显示一个标签）。
    this.labelCollection = this.viewer.scene.primitives.add(
      new LabelCollection({ scene: this.viewer.scene }),
    );

    this.on("on_left_click", (event) => {
      console.log(2222);
      const { position } = event.detail;
      this.onLeftClick(event, position);
    });
    this.on("on_right_click", () => this.finish());
    // 连线态：重新断言十字光标；非连线态：节流做线段 hover 拾取，命中则派发 line_hover。
    this.on("on_move_click", (event) => {
      if (this.isLine) {
        queueMicrotask(() => {
          this.viewer.scene.canvas.style.cursor = "crosshair";
        });
        return;
      }
      const endPosition = event.detail.endPosition;
      if (this.hoverTimer) return;
      this.hoverTimer = setTimeout(() => {
        this.hoverTimer = undefined;
        this.applyLineHover(endPosition);
      }, 30);
    });
  }

  /**
   * 左键点击处理：仅在连线模式下追加折点。
   * 由 isLine 开关拦截，非连线态不响应。
   */
  onLeftClick(event: CustomEvent<Position>, position: Cartesian2) {
    if (!this.isLine) return;
    this.addPoint(position);
  }

  /** 左键：在地图坐标处追加一个折线顶点并重绘。 */
  addPoint(position: Cartesian2) {
    const scene = this.viewer.scene;
    const mapPosition =
      (scene.pickPositionSupported
        ? scene.pickPosition(position)
        : undefined) ??
      this.viewer.camera.pickEllipsoid(position, scene.globe.ellipsoid);
    if (!mapPosition) return;
    this.builder.addPoint(mapPosition);
    this.redraw();
  }

  /** 重绘当前正在绘制的线段。 */
  private redraw() {
    if (this.primitive) {
      this.viewer.scene.primitives.remove(this.primitive);
      this.primitive = undefined;
    }
    const next = this.builder.toPrimitive();
    if (next) {
      this.viewer.scene.primitives.add(next);
      this.primitive = next;
    }
  }

  /** 屏幕空间距离拾取线段：把每条已绘制线段的控制点投影到画布，求鼠标到各线段最短距离，返回阈值内最近者。 */
  private pickLine(position: Cartesian2): LineHoverDetail | undefined {
    const scene = this.viewer.scene;
    let best: LineHoverDetail | undefined;
    let bestDist = this.LINE_HOVER_THRESHOLD;

    for (const rec of this.records) {
      const screenPts: Cartesian2[] = [];
      for (const c of rec.positions) {
        const s = scene.cartesianToCanvasCoordinates(c);
        if (s) screenPts.push(s);
      }
      for (let i = 0; i < screenPts.length - 1; i++) {
        const { dist, foot } = pointToSegment(
          position,
          screenPts[i],
          screenPts[i + 1],
        );
        if (dist <= bestDist) {
          bestDist = dist;
          best = { id: rec.id, x: foot.x, y: foot.y, name: rec.name };
        }
      }
    }
    return best;
  }

  /** 拾取鼠标下的线段并更新 hover 状态，命中变化才重派发，避免无谓刷新。 */
  private applyLineHover(position: Cartesian2) {
    const detail = this.pickLine(position);
    const id = detail?.id;
    if (id === this.hoverLineId) return;
    this.hoverLineId = id;
    this.hoveredLine = detail;
    this.emitLineHover();
  }

  /** 派发 line_hover（无悬停则派发 null），供上层渲染编辑/删除图标。 */
  private emitLineHover() {
    this.emit(cEnum.line_hover, this.hoveredLine ?? null);
  }

  /** 右键：结束当前线段并归档（仅连线模式下有效）。name 可选，缺省为「线段 N」。 */
  finish(name?: string) {
    if (!this.isLine) return;
    const primitive = this.primitive;
    if (primitive && this.builder.pointCount >= 2) {
      const positions = this.builder.getPositions();
      const record: LineRecord = {
        id: ++this.seq,
        name: name ?? `线段 ${this.seq}`,
        positions,
        primitive,
        boundingSphere: BoundingSphere.fromPoints(positions),
      };
      this.records.push(record);
      this.addLineLabel(record);
      this.emitChange();
    } else if (primitive) {
      // 不足两个控制点、未成形时移除半成品。
      this.viewer.scene.primitives.remove(primitive);
    }
    // 清空当前绘制状态以开始新一条线；已记录的 Primitive 会保留在场景中。
    this.builder.reset();
    this.primitive = undefined;
  }

  /** 批量加载线段数据（如默认示例线段）：经纬度转世界坐标、构图元、加标签并归档。 */
  loadLines(data: LineData[]) {
    for (const item of data) {
      if (item.points.length < 2) continue;
      const positions = item.points.map((p) =>
        Cartesian3.fromDegrees(p.lon, p.lat, p.height),
      );
      const builder = new PolylineBuilder();
      for (const p of positions) builder.addPoint(p);
      const primitive = builder.toPrimitive();
      if (!primitive) continue;
      this.viewer.scene.primitives.add(primitive);
      const record: LineRecord = {
        id: item.id,
        name: item.label,
        positions,
        primitive,
        boundingSphere: BoundingSphere.fromPoints(positions),
      };
      this.records.push(record);
      this.addLineLabel(record);
      // 推进自增序号，避免新绘制线段与已加载数据 id 冲突。
      if (item.id > this.seq) this.seq = item.id;
    }
    this.emitChange();
  }

  /** 在场景里为一条已绘制线段添加文字标签（显示其名称），并记录映射。 */
  private addLineLabel(record: LineRecord) {
    if (!this.labelCollection) return;
    const label = this.labelCollection.add({
      position: record.boundingSphere.center,
      text: record.name,
      font: "16px sans-serif",
      fillColor: Color.WHITE,
      outlineColor: Color.BLACK,
      outlineWidth: 4,
      style: LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cartesian2(0, -5),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    });
    this.lineLabels.set(record.id, label);
  }

  /** 切换连线模式并同步光标，返回切换后的状态供 UI 同步。 */
  toggleLine(): boolean {
    this.isLine = !this.isLine;
    this.viewer.scene.canvas.style.cursor = this.isLine ? "crosshair" : "default";
    return this.isLine;
  }

  /** 对外暴露已绘制线段的精简信息（不含笛卡尔坐标），供面板渲染。 */
  get lineList() {
    return this.records.map((l) => ({
      id: l.id,
      name: l.name,
      count: l.positions.length,
    }));
  }

  private emitChange() {
    this.emit(cEnum.line_change, { lines: this.lineList });
  }

  /** 定位并高亮指定线段：相机飞行至其包围球，叠加一条亮色粗线。 */
  focusLine(id: number) {
    const record = this.records.find((l) => l.id === id);
    if (!record) return;
    this.focusedId = id;

    this.clearHighlight();
    this.highlightEntity = this.viewer.entities.add({
      polyline: {
        positions: record.positions,
        width: LINE_WIDTH_PIXELS + 6,
        material: Color.fromCssColorString("#ffd166").withAlpha(0.95),
      },
    });

    const radius = record.boundingSphere.radius || 1000;
    this.viewer.camera.flyToBoundingSphere(record.boundingSphere, {
      duration: 1.2,
      offset: { heading: 0, pitch: -Math.PI / 6, range: radius * 3 + 1000 },
    });
  }

  /** 删除指定线段：移除场景图元与高亮，并刷新面板。 */
  removeLine(id: number) {
    const idx = this.records.findIndex((l) => l.id === id);
    if (idx === -1) return;
    const record = this.records[idx];
    if (record.primitive && !this.viewer.isDestroyed()) {
      this.viewer.scene.primitives.remove(record.primitive);
    }
    // 同步移除该线段的场景标签。
    this.removeLineLabel(id);
    if (this.focusedId === id) this.clearHighlight();
    // 若删除的正是当前悬停线段，清空 hover 状态并通知上层收起图标。
    if (this.hoverLineId === id) {
      this.hoverLineId = undefined;
      this.hoveredLine = undefined;
      this.emitLineHover();
    }
    this.records.splice(idx, 1);
    this.emitChange();
  }

  /** 移除指定线段的场景标签（若存在）。 */
  private removeLineLabel(id: number) {
    const label = this.lineLabels.get(id);
    if (label && this.labelCollection) {
      this.labelCollection.remove(label);
    }
    this.lineLabels.delete(id);
  }

  /** 修改指定线段的名称（重命名），对应 points 的 updatePointLabel。 */
  updateLineName(id: number, name: string) {
    const record = this.records.find((l) => l.id === id);
    if (!record) return;
    record.name = name;
    // 同步刷新场景里的名称标签文字。
    const label = this.lineLabels.get(id);
    if (label) label.text = name;
    this.emitChange();
  }

  private clearHighlight() {
    if (this.highlightEntity) {
      this.viewer.entities.remove(this.highlightEntity);
      this.highlightEntity = undefined;
    }
  }

  /** 仅清理线段相关资源（不销毁共享 Viewer）。 */
  destroy() {
    this.offAllListeners();

    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = undefined;
    }
    this.hoverLineId = undefined;
    this.hoveredLine = undefined;

    this.clearHighlight();
    for (const l of this.records) {
      if (l.primitive && !this.viewer.isDestroyed()) {
        this.viewer.scene.primitives.remove(l.primitive);
      }
    }
    // 移除并销毁线段标签集合。
    if (this.labelCollection && !this.viewer.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.labelCollection);
      this.labelCollection = undefined;
    }
    this.lineLabels.clear();
    this.records = [];
  }
}
