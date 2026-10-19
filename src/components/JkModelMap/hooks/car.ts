import {
  Cartesian3, HeadingPitchRoll, Matrix4, Model,
  Transforms, Math as CesiumMath,
} from "cesium";
import { JkBase } from "./base";
import type { PathVertex } from "../type/path.type";

export interface CarOptions {
  /** GLB/glTF 模型地址，默认使用 public/glb/car2.glb。 */
  url?: string;
  /** 行驶速度，单位米/秒；小于或等于 0 时停留在当前位置。 */
  speed?: number;
  /** 模型缩放倍率，用于适配模型本身的尺寸单位。 */
  scale?: number;
  /** 车头相对路径方向的修正角，单位度。 */
  headingOffset?: number;
  /** 相对路径点椭球高度的偏移，单位米，不会自动贴地。 */
  heightOffset?: number;
}

/** 单辆车的模型与运动状态；由 JkCars 统一驱动更新，不自行注册动画循环。 */
export class JkCar extends JkBase {
  /** 对应的路径 ID，用于路径与车辆一一关联。 */
  readonly id: number;
  private model?: Model;
  /** 路径点的 ECEF 世界坐标，已应用高度偏移。 */
  private positions: Cartesian3[] = [];
  /** 从起点到每个顶点的累计距离，单位米。 */
  private distances: number[] = [];
  /** 当前沿路径行驶的距离，单位米。 */
  private distance = 0;
  private destroyed = false;
  /** 比较路径内容，避免无关路径变化导致本车重新从起点行驶。 */
  private signature = "";
  /** 当前世界变换，同时供异步模型加载完成后恢复最新位置。 */
  private matrix = new Matrix4();
  private position = new Cartesian3();
  private direction = new Cartesian3();
  private options: Required<CarOptions>;

  constructor(id: number, points: PathVertex[], options: CarOptions = {}) {
    super();
    this.id = id;
    this.options = {
      url: options.url || `${import.meta.env.BASE_URL}glb/car2.glb`,
      speed: options.speed ?? 2,
      scale: options.scale ?? 1,
      headingOffset: options.headingOffset ?? 0,
      heightOffset: options.heightOffset ?? 0,
    };
    this.setPath(points);
    void this.loadModel();
  }

  /** 异步创建模型；加入场景后仍可能在纹理加载或着色器编译阶段报错。 */
  private async loadModel() {
    try {
      const model = await Model.fromGltfAsync({
        url: this.options.url,
        modelMatrix: Matrix4.clone(this.matrix),
        scale: this.options.scale,
        allowPicking: false,
      });
      // 加载期间路径可能已被删除，避免把迟到的模型重新加入场景。
      if (this.destroyed || JkBase.viewer.isDestroyed()) {
        if (!model.isDestroyed()) model.destroy();
        return;
      }
      model.errorEvent.addEventListener((error) => {
        if (!this.destroyed) console.error(`车辆 ${this.id} 渲染失败：${this.options.url}`, error);
      });
      this.model = JkBase.viewer.scene.primitives.add(model);
      model.modelMatrix = Matrix4.clone(this.matrix);
      model.show = this.positions.length > 0;
      JkBase.viewer.scene.requestRender();
    } catch (error) {
      if (!this.destroyed) console.error(`车辆 ${this.id} 加载失败：${this.options.url}`, error);
    }
  }

  /** 更新经纬高路径，过滤相邻重合点；路径发生变化时重置到起点。 */
  setPath(points: PathVertex[]) {
    if (this.destroyed) return;
    const signature = JSON.stringify(points);
    if (signature === this.signature) return;
    this.signature = signature;
    const ellipsoid = JkBase.viewer.scene.globe.ellipsoid;
    this.positions = points.map((point) => Cartesian3.fromDegrees(
      point.lon, point.lat, point.height + this.options.heightOffset, ellipsoid,
    )).filter((point, index, positions) => index === 0 ||
      Cartesian3.distanceSquared(point, positions[index - 1]) > 1e-8);
    this.distances = [0];
    for (let index = 1; index < this.positions.length; index++) {
      this.distances.push(this.distances[index - 1] +
        Cartesian3.distance(this.positions[index - 1], this.positions[index]));
    }
    this.distance = 0;
    this.update(0);
  }

  setSpeed(speed: number) {
    if (!Number.isFinite(speed) || speed < 0 || this.destroyed) return;
    this.options.speed = speed;
  }

  /** 按时间增量（秒）推进位置；单点停留，多点到终点后跳回起点循环。 */
  update(deltaSeconds: number) {
    if (this.destroyed || !this.positions.length) {
      if (this.model) this.model.show = false;
      return;
    }
    const total = this.distances[this.distances.length - 1];
    if (total > 0) this.distance = (this.distance + Math.max(0, this.options.speed) * deltaSeconds) % total;
    // 用累计距离定位当前线段，再在线段两个世界坐标之间做直线插值。
    let segment = 0;
    while (segment < this.positions.length - 2 && this.distances[segment + 1] <= this.distance) segment++;
    const start = this.positions[segment];
    const end = this.positions[Math.min(segment + 1, this.positions.length - 1)];
    const length = Cartesian3.distance(start, end);
    Cartesian3.lerp(start, end, length > 0 ? (this.distance - this.distances[segment]) / length : 0, this.position);
    Cartesian3.subtract(end, start, this.direction);
    // 将行进方向转入当前位置的 ENU（东、北、上）坐标系，计算航向与坡度。
    // 此处以模型局部 +X 轴为前进方向，模型车头差异由 headingOffset 修正。
    const frame = Transforms.eastNorthUpToFixedFrame(this.position, JkBase.viewer.scene.globe.ellipsoid);
    const inverse = Matrix4.inverseTransformation(frame, new Matrix4());
    const local = Matrix4.multiplyByPointAsVector(inverse, this.direction, new Cartesian3());
    const heading = length > 0 ? Math.atan2(-local.y, local.x) : 0;
    const pitch = length > 0 ? -Math.atan2(local.z, Math.hypot(local.x, local.y)) : 0;
    Transforms.headingPitchRollToFixedFrame(
      this.position,
      new HeadingPitchRoll(heading + CesiumMath.toRadians(this.options.headingOffset), pitch, 0),
      JkBase.viewer.scene.globe.ellipsoid,
      undefined,
      this.matrix,
    );
    if (this.model) {
      this.model.show = true;
      this.model.modelMatrix = Matrix4.clone(this.matrix);
    }
  }

  /** 释放本车图元；不调用父类 destroy，避免销毁共享 Viewer。 */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.model && !JkBase.viewer.isDestroyed()) {
      JkBase.viewer.scene.primitives.remove(this.model);
    }
    this.model = undefined;
    this.positions = [];
    this.offAllListeners();
  }
}
