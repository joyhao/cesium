import { cEnum, CEvent } from "../event/event";
import { Viewer } from "cesium";
import { viewerOptions } from "../entity/entity";
import { query } from "../utils";
import { CesiumInfo } from "../type/map.type";

export class JkBase extends EventTarget {
  static viewer: Viewer;
  private fpsFrameCount = 0;
  private fpsLastTime = 0;
  private removePostRender?: () => void;
  container: HTMLElement | undefined;

  constructor(selector?: string) {
    super();
    if (selector) {
      this.container = query(selector);
      JkBase.viewer = new Viewer(this.container, viewerOptions);
      this.startFps();
    }
  }

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
    JkBase.viewer.destroy();
    this.stopFps();
  }

  on<K extends keyof CEvent>(event: K, listener: (event: CEvent[K]) => void) {
    this.addEventListener(event, listener as EventListener);

    return () => {
      this.removeEventListener(event, listener as EventListener);
    };
  }
}
