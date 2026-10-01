import circleVertShader from "@com/JkMap/shader/circle.vert.glsl";
import circleFragShader from "@com/JkMap/shader/circle.frag.glsl";
import { JkColor } from "../entity/entity";
import {
  Appearance,
  BoundingSphere,
  ComponentDatatype,
  Geometry,
  GeometryAttribute,
  GeometryAttributes,
  GeometryInstance,
  Primitive,
  PrimitiveType,
} from "cesium";

export function createCircle(positions: Float64Array, ids: number[]) {
  const appearance = new Appearance({
    vertexShaderSource: circleVertShader,
    fragmentShaderSource: circleFragShader,
    // 半透明
    translucent: true,
    closed: false,
    renderState: {
      // 绘制时写入深度缓冲 让点之间能正确互相遮挡
      depthMask: true,
      // 启深度测试
      depthTest: {
        enabled: true,
      },
    },
  });

  const primitive = new Primitive({
    geometryInstances: new GeometryInstance({
      geometry: createGeometry(positions, ids),
    }),
    appearance: appearance,
    // 自定义 Geometry 没有对应 worker，无法异步加载，必须同步创建。
    // 坐标已由 Worker 算好，这里只做轻量包装，同步开销很小。
    asynchronous: false,
    allowPicking: false,
    // 几何体创建完成后，释放 geometryInstances 数组的引用。
    releaseGeometryInstances: true,
  });

  return primitive;
}

/**
 * 所有点位的 xyz 写入同一个 Geometry，使用 PrimitiveType.POINTS 让 GPU 以
 * gl_PointSize 渲染圆点；每个点再带一个 aColor 顶点属性用于点击变色。
 * 只有一个几何体、一次 draw call，渲染 1 万点也很轻量。
 */
function createGeometry(positions: Float64Array, ids: number[]) {
  const count = positions.length / 3;
  const colors = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    let color = [];
    //   if (this.selectedIds.has(ids[i])) color = JkColor.SELECTED_COLOR;
    //   else if (this.hoverId === ids[i]) color = JkColor.HOVER_COLOR;
    //   else

    color = JkColor.DEFAULT_COLOR;
    colors[i * 4] = color[0];
    colors[i * 4 + 1] = color[1];
    colors[i * 4 + 2] = color[2];
    colors[i * 4 + 3] = color[3];
  }

  const attributes = new GeometryAttributes();
  attributes.position = new GeometryAttribute({
    componentDatatype: ComponentDatatype.DOUBLE,
    componentsPerAttribute: 3,
    values: positions,
  });
  // @ts-ignore
  attributes.aColor = new GeometryAttribute({
    componentDatatype: ComponentDatatype.FLOAT,
    componentsPerAttribute: 4,
    values: colors,
  });

  return new Geometry({
    attributes,
    primitiveType: PrimitiveType.POINTS,
    boundingSphere: BoundingSphere.fromVertices(positions),
  });
}
