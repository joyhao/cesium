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

  constructor(paths: PathData[] = []) {
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
    this.sync(paths);
  }

  sync(paths: PathData[], createMissing = true) {
    if (this.destroyed) return;
    const validPaths = paths.filter((path) => {
      if (!path || !Array.isArray(path.points)) return false;
      const first = path.points[0];
      return first && path.points.some((point) =>
        point.lon !== first.lon || point.lat !== first.lat || point.height !== first.height,
      );
    });
    const ids = new Set(validPaths.map((path) => path.id));
    for (const [id, car] of this.cars) {
      if (ids.has(id)) continue;
      car.destroy();
      this.cars.delete(id);
      this.speedFactors.delete(id);
    }
    for (const path of validPaths) {
      const existing = this.cars.get(path.id);
      if (existing) existing.setPath(path.points);
      else if (createMissing) {
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

  hasPath(id: number) {
    return this.cars.has(id);
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
