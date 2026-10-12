import polylineVertShader from "@com/JkMap/shader/polyline.vert.glsl";
import polylineFragShader from "@com/JkMap/shader/polyline.frag.glsl";
import {
  Appearance,
  BoundingSphere,
  Cartesian3,
  ComponentDatatype,
  Geometry,
  GeometryAttribute,
  GeometryAttributes,
  GeometryInstance,
  Primitive,
  PrimitiveType,
} from "cesium";

export const LINE_WIDTH_PIXELS = 10;

type CustomAttributes = GeometryAttributes & Record<string, GeometryAttribute>;

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

interface LineBuffers {
  currentPositions: Float64Array;
  previousHigh: Float32Array;
  previousLow: Float32Array;
  nextHigh: Float32Array;
  nextLow: Float32Array;
  sides: Float32Array;
  indices: Uint32Array;
  params: Float32Array;
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

  constructor(capacity = DEFAULT_CAPACITY_SEGMENTS) {
    this.capacity = capacity;
    this.buffers = this.allocBuffers(capacity);
  }

  private allocBuffers(capacity: number): LineBuffers {
    const v = capacity * 4;
    return {
      currentPositions: new Float64Array(v * 3),
      previousHigh: new Float32Array(v * 3),
      previousLow: new Float32Array(v * 3),
      nextHigh: new Float32Array(v * 3),
      nextLow: new Float32Array(v * 3),
      sides: new Float32Array(v),
      params: new Float32Array(v),
      indices: new Uint32Array(capacity * 6),
    };
  }

  get pointCount() {
    return this.positions.length;
  }

  get segmentCount() {
    return this.segs;
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

  /** 把任意点列（此处为曲线密集点）写入预分配缓冲，构造成可渲染的四边形序列。 */
  private buildGeometry(points: Cartesian3[]) {
    const segCount = points.length - 1;
    if (segCount < 1) {
      this.vertexCount = 0;
      this.segs = 0;
      return;
    }
    if (segCount > this.capacity) this.grow(segCount);

    const b = this.buffers;
    // 沿整条线的归一化参数 t：0=起点，1=终点，用于 shader 里的颜色渐变。
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
        const base = vertex * 3;
        b.currentPositions[base] = current.x;
        b.currentPositions[base + 1] = current.y;
        b.currentPositions[base + 2] = current.z;
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
  }

  toPrimitive(): Primitive | undefined {
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

    // 基础 Appearance 不支持自定义 uniforms（那是 Material 体系），
    // 因此用 #define 把线宽注入着色器源码，LINE_WIDTH_PIXELS 仍是唯一来源。
    const vertexShaderSource = `#define LINE_WIDTH ${LINE_WIDTH_PIXELS}.0\n${polylineVertShader}`;

    return new Primitive({
      geometryInstances: new GeometryInstance({ geometry }),
      appearance: new Appearance({
        vertexShaderSource,
        fragmentShaderSource: polylineFragShader,
        translucent: false,
        renderState: { depthTest: { enabled: true } },
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
