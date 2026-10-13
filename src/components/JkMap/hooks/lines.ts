import {
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Color,
  Entity,
  Primitive,
} from "cesium";
import { cEnum } from "../event/event";
import { JkBase } from "./base";
import type { LineRecord, Position } from "../type/map.type";
import { LINE_WIDTH_PIXELS, PolylineBuilder } from "../shape/polyline";

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


  constructor(bus: EventTarget) {
    super(undefined, bus);

    this.on("on_left_click", (event) => {
      
      const { position } = event.detail;

      this.onLeftClick(event, position);
    });
    this.on("on_right_click", () => this.finish());
    // 连线态下每次 mousemove 重新断言十字光标，覆盖 points 的悬停手型光标。
    this.on("on_move_click", () => {
      if (this.isLine) {
        queueMicrotask(() => {
          this.viewer.scene.canvas.style.cursor = "crosshair";
        });
      }
    });
  }

  /**
   * 左键点击处理：仅在连线模式下追加折点。
   * 连线态调用 stopImmediatePropagation 阻断后续监听（JkPoints 的点位拾取）——本模块
   * 监听注册早于 JkPoints，故可独占左键，从而把“连线态跳过拾取”逻辑收归此处。
   */
  onLeftClick(event: CustomEvent<Position>, position: Cartesian2) {
    if (!this.isLine) return;
    event.stopImmediatePropagation();
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

  /** 右键：结束当前线段并归档（仅连线模式下有效）。 */
  finish() {
    if (!this.isLine) return;
    const primitive = this.primitive;
    if (primitive && this.builder.pointCount >= 2) {
      const positions = this.builder.getPositions();
      this.records.push({
        id: ++this.seq,
        name: `线段 ${this.seq}`,
        positions,
        primitive,
        boundingSphere: BoundingSphere.fromPoints(positions),
      });
      this.emitChange();
    } else if (primitive) {
      // 不足两个控制点、未成形时移除半成品。
      this.viewer.scene.primitives.remove(primitive);
    }
    // 清空当前绘制状态以开始新一条线；已记录的 Primitive 会保留在场景中。
    this.builder.reset();
    this.primitive = undefined;
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
    if (this.focusedId === id) this.clearHighlight();
    this.records.splice(idx, 1);
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

    this.clearHighlight();
    for (const l of this.records) {
      if (l.primitive && !this.viewer.isDestroyed()) {
        this.viewer.scene.primitives.remove(l.primitive);
      }
    }
    this.records = [];
  }
}
