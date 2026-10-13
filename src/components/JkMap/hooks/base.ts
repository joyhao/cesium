import { cEnum, CEvent } from "../event/event";
import { ScreenSpaceEventHandler, ScreenSpaceEventType, Viewer } from "cesium";
import { viewerOptions } from "../entity/entity";
import { query } from "../../../utils/utils";
import { DetailOf, MovePosition, Position } from "../type/map.type";

export class JkBase {
  // 当前项目所有地图子模块共享同一个 Cesium Viewer。
  static viewer: Viewer;
  // 事件总线：跟随 JkMap 实例（非 static），由门面类创建后注入各子模块，
  // 使每次建图拥有独立总线，重建/卸载时随实例回收，避免全局单例污染。
  protected bus: EventTarget;
  private busOffs: Array<() => void> = [];
  private fpsFrameCount = 0;
  private fpsLastTime = 0;
  private removePostRender?: () => void;
  container: HTMLElement | undefined;
  canvas: HTMLCanvasElement | undefined;
  handler!: ScreenSpaceEventHandler;

  constructor(selector?: string, bus?: EventTarget) {
    this.bus = bus ?? new EventTarget();
    if (selector) {
      this.container = query(selector);
      JkBase.viewer = new Viewer(this.container, viewerOptions);
      this.startFps();
      this.startAction();
    }
  }

  /**
   * 注册 Cesium handler
   */
  private startAction() {
    this.handler = new ScreenSpaceEventHandler(JkBase.viewer.scene.canvas);
    this.handler.setInputAction(
      this.handleLeftClick,
      ScreenSpaceEventType.LEFT_CLICK,
    );
    this.handler.setInputAction(
      this.handleMouseMove,
      ScreenSpaceEventType.MOUSE_MOVE,
    );
    this.handler.setInputAction(
      this.handleRightClick,
      ScreenSpaceEventType.RIGHT_CLICK,
    );
  }

  private handleLeftClick = (movement: Position) => {
    const { position } = movement;
    this.emit(cEnum.on_left_click, { position });
  };

  private handleRightClick = () => {
    this.emit(cEnum.on_right_click, {});
  };

  private handleMouseMove = (movement: MovePosition) => {
    const { endPosition, startPosition } = movement;

    this.emit(cEnum.on_move_click, { endPosition, startPosition });
  };

  // 使用 Cesium postRender 统计实际完成的场景渲染帧，而不是浏览器刷新帧。
  startFps() {
    if (!JkBase.viewer || this.removePostRender) return;

    this.fpsLastTime = performance.now();
    this.fpsFrameCount = 0;

    this.removePostRender = JkBase.viewer.scene.postRender.addEventListener(
      () => {
        this.fpsFrameCount += 1;

        const now = performance.now();
        const elapsed = now - this.fpsLastTime;

        if (elapsed >= 500) {
          const fps = Math.round((this.fpsFrameCount * 1000) / elapsed);
          this.fpsFrameCount = 0;
          this.fpsLastTime = now;

          this.emit(cEnum.fps_change, { fps });
        }
      },
    );
  }

  stopFps() {
    this.removePostRender?.();
    this.removePostRender = undefined;
    this.fpsFrameCount = 0;
  }

  destroy() {
    if (!JkBase.viewer || JkBase.viewer.isDestroyed()) return;
    this.offAllListeners();
    this.stopFps();
    JkBase.viewer.destroy();
  }

  // 统一向本实例总线派发事件，供子模块调用（替换原本的 this.dispatchEvent）。
  emit<K extends keyof CEvent>(event: K, detail: DetailOf<CEvent[K]>) {
    this.bus.dispatchEvent(new CustomEvent(event, { detail }));
  }

  // 统一封装事件订阅（订阅到本实例总线），并通过 CEvent 提供类型提示。
  // 返回的退订函数同时记入 busOffs，destroy 时统一清理，防止监听泄漏。
  on<K extends keyof CEvent>(event: K, listener: (event: CEvent[K]) => void) {
    const handler = listener as EventListener;
    this.bus.addEventListener(event, handler);

    const off = () => this.bus.removeEventListener(event, handler);
    this.busOffs.push(off);
    return off;
  }

  // 统一退订本实例在总线上注册的所有监听。
  protected offAllListeners() {
    this.busOffs.forEach((off) => off());
    this.busOffs = [];
  }
}
