import { Math as CesiumMath, Viewer } from "cesium";

import type { CameraInfo } from "../type/camera.type";

export class JkCamera {
  private events = new EventTarget();
  private disposers: Array<() => void> = [];
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 0;

  constructor(private readonly viewer: Viewer) {
    this.disposers.push(
      viewer.camera.changed.addEventListener(this.publish),
      viewer.scene.postRender.addEventListener(() => {
        this.frameCount++;
        const now = performance.now();
        const elapsed = now - this.lastTime;
        if (elapsed < 500) return;
        this.fps = Math.round(this.frameCount * 1000 / elapsed);
        this.frameCount = 0;
        this.lastTime = now;
        this.publish();
      }),
    );
  }

  getInfo(): CameraInfo {
    const camera = this.viewer.camera;
    const position = camera.positionCartographic;
    const circumference = 2 * Math.PI * this.viewer.scene.globe.ellipsoid.maximumRadius;
    const level = position.height <= 0 ? 18 :
      Math.min(18, Math.max(0, Math.round(Math.log2(circumference / position.height))));
    return {
      longitude: CesiumMath.toDegrees(position.longitude),
      latitude: CesiumMath.toDegrees(position.latitude),
      height: position.height,
      heading: CesiumMath.toDegrees(camera.heading),
      pitch: CesiumMath.toDegrees(camera.pitch),
      roll: CesiumMath.toDegrees(camera.roll),
      level,
      fps: this.fps,
    };
  }

  private publish = () => {
    this.events.dispatchEvent(new CustomEvent<CameraInfo>("camera_change", { detail: this.getInfo() }));
  };

  onChange(listener: (info: CameraInfo) => void) {
    const handler = (event: Event) => listener((event as CustomEvent<CameraInfo>).detail);
    this.events.addEventListener("camera_change", handler);
    const off = () => this.events.removeEventListener("camera_change", handler);
    this.disposers.push(off);
    listener(this.getInfo());
    return off;
  }

  destroy() {
    this.disposers.forEach((dispose) => dispose());
    this.disposers = [];
  }
}
