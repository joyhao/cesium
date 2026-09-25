import { cEnum, CEvent } from "../event/event";
import { Viewer } from "cesium";
import { viewerOptions } from "../entity/entity";
import { query } from "../utils";
import { CesiumInfo } from "../type/map.type";

export class JkBase extends EventTarget {
  // 当前项目所有地图子模块共享同一个 Cesium Viewer。
  static viewer: Viewer;
  // 地球椭球体（Ellipsoid）对象   WGS84
  ellipsoid;
  private fpsFrameCount = 0;
  private fpsLastTime = 0;
  private removePostRender?: () => void;
  container: HTMLElement | undefined;

  constructor(selector?: string) {
    super();
    if (selector) {
      this.container = query(selector);
      JkBase.viewer = new Viewer(this.container, viewerOptions);
      this.ellipsoid = JkBase.viewer.scene.globe.ellipsoid;
      this.startFps();
    }
  }

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

          this.dispatchEvent(
            new CustomEvent<CesiumInfo>(cEnum.fps_change, {
              detail: {
                fps,
              },
            })
          );
        }
      }
    );
  }

  stopFps() {
    this.removePostRender?.();
    this.removePostRender = undefined;
    this.fpsFrameCount = 0;
  }

  destroy() {
    if (!JkBase.viewer || JkBase.viewer.isDestroyed()) return;
    this.stopFps();
    JkBase.viewer.destroy();
  }

  // 统一封装事件订阅，并通过 CEvent 提供自定义事件名称和载荷类型提示。
  on<K extends keyof CEvent>(event: K, listener: (event: CEvent[K]) => void) {
    this.addEventListener(event, listener as EventListener);

    return () => {
      this.removeEventListener(event, listener as EventListener);
    };
  }
}
