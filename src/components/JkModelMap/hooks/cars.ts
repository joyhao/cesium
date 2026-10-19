import { JkBase } from "./base";
import { JkCar } from "./car";
import type { PathData } from "../type/path.type";

export class JkCars extends JkBase {
  private cars = new Map<number, JkCar>();
  private readonly modelUrl = `${import.meta.env.BASE_URL}glb/car2.glb`;
  private removeUpdate: () => void;
  private lastTime = performance.now();
  private destroyed = false;
  private speed = 20;
  private speedFactors = new Map<number, number>();

  constructor() {
    super();
    this.removeUpdate = JkBase.viewer.scene.preUpdate.addEventListener(
      () => {
        const now = performance.now();
        const delta = Math.min(Math.max(0, (now - this.lastTime) / 1000), 0.1);
        this.lastTime = now;
        for (const car of this.cars.values()) car.update(delta);
        if (this.cars.size) JkBase.viewer.scene.requestRender();
      },
    );
  }

  sync(paths: PathData[]) {
    if (this.destroyed) return;
    const ids = new Set(paths.map((path) => path.id));
    for (const [id, car] of this.cars) {
      if (ids.has(id)) continue;
      car.destroy();
      this.cars.delete(id);
      this.speedFactors.delete(id);
    }
    for (const path of paths) {
      const existing = this.cars.get(path.id);
      if (existing) existing.setPath(path.points);
      else {
        const speedFactor = 0.9 + Math.random() * 0.2;
        this.speedFactors.set(path.id, speedFactor);
        this.cars.set(path.id, new JkCar(path.id, path.points, {
          url: this.modelUrl,
          scale: 100,
          speed: this.speed * speedFactor,
        }));
      }
    }
    JkBase.viewer.scene.requestRender();
  }

  setSpeed(speed: number) {
    if (!Number.isFinite(speed) || speed < 0 || this.destroyed) return;
    this.speed = speed;
    for (const [id, car] of this.cars) {
      car.setSpeed(speed * (this.speedFactors.get(id) ?? 1));
    }
    JkBase.viewer.scene.requestRender();
  }

  get count() {
    return this.cars.size;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.removeUpdate();
    this.cars.forEach((car) => car.destroy());
    this.cars.clear();
    this.speedFactors.clear();
    this.offAllListeners();
  }
}
