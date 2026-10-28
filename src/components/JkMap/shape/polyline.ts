import polylineVertShader from "@com/JkMap/shader/polyline.vert.glsl";
import polylineSurfaceVertShader from "@com/JkMap/shader/polylineSurface.vert.glsl";
import polylineFragShader from "@com/JkMap/shader/polyline.frag.glsl";
import {
  Appearance,
  BoundingSphere,
  Cartesian3,
  ComponentDatatype,
  Ellipsoid,
  Geometry,
  GeometryAttribute,
  GeometryAttributes,
  GeometryInstance,
  Primitive,
  PrimitiveType,
} from "cesium";
import { CustomAttributes, LineBuffers } from "../type/map.type";

export const LINE_WIDTH_PIXELS = 10;


function setVec3Attribute(
  attributes: CustomAttributes,
  name: string,
  values: Float32Array,
) {
  attributes[name] = new GeometryAttribute({
    componentDatatype: ComponentDatatype.FLOAT,
    componentsPerAttribute: 3,
    values,
  });
}

// 把世界坐标拆成 high / low 两份 float32，供 Shader 在 eye 空间还原，避免 float 精度抖动。
function writeEncoded(
  highValues: Float32Array,
  lowValues: Float32Array,
  vertex: number,
  position: Cartesian3,
) {
  const high = new Cartesian3(
    Math.fround(position.x),
    Math.fround(position.y),
    Math.fround(position.z),
  );
  const low = Cartesian3.subtract(position, high, new Cartesian3());
  const offset = vertex * 3;
  highValues.set([high.x, high.y, high.z], offset);
  lowValues.set([low.x, low.y, low.z], offset);
}

// 单段 Catmull-Rom 插值（经过 p1、p2；p0、p3 控制切线），t∈[0,1]。
function catmullRom(
  p0: Cartesian3,
  p1: Cartesian3,
  p2: Cartesian3,
  p3: Cartesian3,
  t: number,
): Cartesian3 {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 *
    (2 * b +
      (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t2 +
      (-a + 3 * b - 3 * c + d) * t3);
  return new Cartesian3(
    f(p0.x, p1.x, p2.x, p3.x),
    f(p0.y, p1.y, p2.y, p3.y),
    f(p0.z, p1.z, p2.z, p3.z),
  );
}

const DEFAULT_CAPACITY_SEGMENTS = 4096;

/**
 * 折线缓冲构建器：保存点击的控制点，再用 Catmull-Rom 样条插值加密成平滑曲线，
 * 最终按四边形方式连成曲线。预分配定长缓冲，每次重建只覆盖写入、不重复申请内存。
 *
 * 注意：曲线模式下，新增控制点会改变前面控制点之间的弧度，因此每次点击都需按当前
 * 全部控制点重算整条曲线（不再增量只更新新增段）。Cesium 自定义 Geometry 不支持
 * 局部更新 GPU 缓冲，Primitive 仍需每次重建。
 */
export class PolylineBuilder {
  private positions: Cartesian3[] = [];
  private buffers: LineBuffers;
  private capacity: number;
  private vertexCount = 0;
  private segs = 0;
  private boundingSphere = new BoundingSphere();
  /** 每段控制点之间插值出的曲线细分段数，越大越平滑。 */
  stepsPerSegment = 16;
  /** 渲染模式：true=曲线(Catmull-Rom)，false=折线(直线段)。运行时可切换。 */
  curved = true;
  surfaceWidthMeters = 0;
  ellipsoid = Ellipsoid.WGS84;

  constructor(capacity = DEFAULT_CAPACITY_SEGMENTS) {
    this.capacity = capacity;
    this.buffers = this.allocBuffers(capacity);
  }

  private allocBuffers(capacity: number): LineBuffers {
    // capacity 为线段容量，每段用 4 个顶点组成线带四边形。
    const v = capacity * 4;
    return {
      // 每个顶点的世界坐标 x、y、z；使用双精度保存，避免 ECEF 大坐标精度损失。
      currentPositions: new Float64Array(v * 3),
      // 前一个路径点坐标的高位部分，与低位一起供 shader 还原并计算线条方向。
      previousHigh: new Float32Array(v * 3),
      // 前一个路径点的低位残差，补偿单个 Float32 无法保存的坐标精度。
      previousLow: new Float32Array(v * 3),
      // 后一个路径点坐标的高位部分，每个顶点保存 x、y、z 三个分量。
      nextHigh: new Float32Array(v * 3),
      // 后一个路径点的低位残差，与 nextHigh 配对使用。
      nextLow: new Float32Array(v * 3),
      // 顶点位于线条的哪一侧：-1 或 1，用于屏幕空间线宽展开。
      sides: new Float32Array(v),
      // 每个顶点沿路径的渐变参数，传给片元 shader 控制颜色过渡。
      params: new Float32Array(v),
      // 每段四边形由 2 个三角形组成，每个三角形 3 个顶点索引，共 6 个索引。
      indices: new Uint32Array(capacity * 6),
    };
  }

  get pointCount() {
    return this.positions.length;
  }

  get segmentCount() {
    return this.segs;
  }

  /** 返回当前控制点的副本，供外部记录 / 回显已绘制线段。 */
  getPositions(): Cartesian3[] {
    return this.positions.slice();
  }

  addPoint(position: Cartesian3): void {
    this.positions.push(position);
  }

  /** 折线模式：直接返回原始控制点，直线段依次相连。 */
  private getStraightPoints(): Cartesian3[] {
    return this.positions.slice();
  }

  /** 曲线模式：用 Catmull-Rom 把控制点插值加密成平滑曲线上的密集点。 */
  private getCurvePoints(): Cartesian3[] {
    const pts = this.positions;
    
    const n = pts.length;
    if (n < 2) return pts.slice();
    if (n < 3) return [pts[0], pts[1]];

    const steps = this.stepsPerSegment;
    const result: Cartesian3[] = [];
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(n - 1, i + 2)];
      // 非末段不含 t=1 的端点，避免与下一段起点重复。
      const last = i === n - 2;
      const max = last ? steps : steps - 1;
      for (let s = 0; s <= max; s++) {
        result.push(catmullRom(p0, p1, p2, p3, s / steps));
      }
    }
    return result;
  }

  // 容量不足时翻倍（曲线模式下缓冲会被整体覆盖，拷贝旧数据并非必需但无害）。
  private grow(minSegments: number) {
    const next = Math.max(minSegments, this.capacity * 2);
    const old = this.buffers;
    const b = this.allocBuffers(next);
    b.currentPositions.set(
      old.currentPositions.subarray(0, this.vertexCount * 3),
    );
    b.previousHigh.set(old.previousHigh.subarray(0, this.vertexCount * 3));
    b.previousLow.set(old.previousLow.subarray(0, this.vertexCount * 3));
    b.nextHigh.set(old.nextHigh.subarray(0, this.vertexCount * 3));
    b.nextLow.set(old.nextLow.subarray(0, this.vertexCount * 3));
    b.sides.set(old.sides.subarray(0, this.vertexCount));
    b.params.set(old.params.subarray(0, this.vertexCount));
    b.indices.set(old.indices.subarray(0, this.segs * 6));
    this.buffers = b;
    this.capacity = next;
  }

  private buildGeometry(points: Cartesian3[]) {
    const segCount = points.length - 1;
    if (segCount < 1) {
      this.vertexCount = 0;
      this.segs = 0;
      return;
    }
    if (segCount > this.capacity) this.grow(segCount);

    const b = this.buffers;
   
    const denom = segCount > 1 ? segCount - 1 : 1;
    for (let segment = 0; segment < segCount; segment++) {
      const start = points[segment];
      const end = points[segment + 1];
      const previous = points[Math.max(0, segment - 1)];
      const next = points[Math.min(points.length - 1, segment + 2)];
      const firstVertex = segment * 4;
      for (let corner = 0; corner < 4; corner++) {
        const vertex = firstVertex + corner;
        const isEnd = corner >= 2;
        const current = isEnd ? end : start;
        const expanded = Cartesian3.clone(current);
        if (this.surfaceWidthMeters > 0) {
          const normal = this.ellipsoid.geodeticSurfaceNormal(current, new Cartesian3());
          const direction = Cartesian3.subtract(
            this.curved ? (isEnd ? next : end) : end,
            this.curved ? (isEnd ? start : previous) : start,
            new Cartesian3(),
          );
          const side = Cartesian3.cross(normal, direction, new Cartesian3());
          if (Cartesian3.magnitudeSquared(side) > 1e-12) {
            Cartesian3.normalize(side, side);
            Cartesian3.multiplyByScalar(
              side,
              (corner % 2 === 0 ? -1 : 1) * this.surfaceWidthMeters * 0.5,
              side,
            );
            Cartesian3.add(current, side, expanded);
          }
        }
        const base = vertex * 3;
        b.currentPositions[base] = expanded.x;
        b.currentPositions[base + 1] = expanded.y;
        b.currentPositions[base + 2] = expanded.z;
        writeEncoded(
          b.previousHigh,
          b.previousLow,
          vertex,
          isEnd ? start : previous,
        );
        writeEncoded(b.nextHigh, b.nextLow, vertex, isEnd ? next : end);
        b.sides[vertex] = corner % 2 === 0 ? -1 : 1;
        b.params[vertex] = isEnd ? (segment + 1) / denom : segment / denom;
      }
      this.buffers.indices.set(
        [
          firstVertex,
          firstVertex + 1,
          firstVertex + 2,
          firstVertex + 2,
          firstVertex + 1,
          firstVertex + 3,
        ],
        segment * 6,
      );
    }
    this.vertexCount = segCount * 4;
    this.segs = segCount;
    this.boundingSphere = BoundingSphere.fromPoints(points);
    this.boundingSphere.radius += Math.max(0, this.surfaceWidthMeters) * 0.5;
  }

  toPrimitive(depthTest = true): Primitive | undefined {
    if (this.positions.length < 2) return undefined;

    this.buildGeometry(
      this.curved ? this.getCurvePoints() : this.getStraightPoints(),
    );
    if (this.segs < 1) return undefined;

    const b = this.buffers;
    const v = this.vertexCount;
    const attributes = new GeometryAttributes() as CustomAttributes;
    attributes.position = new GeometryAttribute({
      componentDatatype: ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: b.currentPositions.subarray(0, v * 3),
    });
    setVec3Attribute(
      attributes,
      "aPreviousHigh",
      b.previousHigh.subarray(0, v * 3),
    );
    setVec3Attribute(
      attributes,
      "aPreviousLow",
      b.previousLow.subarray(0, v * 3),
    );
    setVec3Attribute(attributes, "aNextHigh", b.nextHigh.subarray(0, v * 3));
    setVec3Attribute(attributes, "aNextLow", b.nextLow.subarray(0, v * 3));
    attributes.aSide = new GeometryAttribute({
      componentDatatype: ComponentDatatype.FLOAT,
      componentsPerAttribute: 1,
      values: b.sides.subarray(0, v),
    });
    attributes.aParam = new GeometryAttribute({
      componentDatatype: ComponentDatatype.FLOAT,
      componentsPerAttribute: 1,
      values: b.params.subarray(0, v),
    });

    const geometry = new Geometry({
      attributes,
      indices: b.indices.subarray(0, this.segs * 6),
      primitiveType: PrimitiveType.TRIANGLES,
      boundingSphere: this.boundingSphere,
    });

    const vertexShaderSource = this.surfaceWidthMeters > 0
      ? polylineSurfaceVertShader
      : polylineVertShader;

    return new Primitive({
      geometryInstances: new GeometryInstance({ geometry }),
      appearance: new Appearance({
        vertexShaderSource,
        fragmentShaderSource: polylineFragShader,
        translucent: false,
        renderState: { depthTest: { enabled: depthTest } },
      }),
      asynchronous: false,
      allowPicking: false,
      releaseGeometryInstances: true,
    });
  }

  reset(): void {
    this.positions = [];
    this.vertexCount = 0;
    this.segs = 0;
    this.boundingSphere = new BoundingSphere();
  }
}
