import {
  Cartesian3,
  Cartographic,
  CircleGeometry,
  EllipsoidSurfaceAppearance,
  GeometryInstance,
  Material,
  Primitive,
  PrimitiveCollection,
  Viewer,
} from "cesium";
import { JkBase } from "./base";
import { PolylineBuilder } from "@com/JkMap/shape/polyline";
import pathMarkerShader from "../shader/pathMarker.frag.glsl";

export class JkPath extends JkBase {
  readonly viewer: Viewer;
  private builder = new PolylineBuilder();
  private points: PrimitiveCollection;
  private primitive?: Primitive;
  private destroyed = false;

  constructor() {
    super();
    this.viewer = JkBase.viewer;
    this.builder.surfaceWidthMeters = 0.3;
    this.builder.ellipsoid = this.viewer.scene.globe.ellipsoid;
    this.points = this.viewer.scene.primitives.add(new PrimitiveCollection());
  }

  private addMarker(position: Cartesian3) {
    const ellipsoid = this.viewer.scene.globe.ellipsoid;
    const height = Cartographic.fromCartesian(position, ellipsoid).height;
    this.points.add(new Primitive({
      geometryInstances: new GeometryInstance({
        geometry: new CircleGeometry({
          center: position,
          radius: 0.25,
          height,
          ellipsoid,
          vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
        }),
      }),
      appearance: new EllipsoidSurfaceAppearance({
        aboveGround: true,
        material: new Material({
          fabric: {
            type: "JkPathMarker",
            source: pathMarkerShader,
          },
        }),
        flat: true,
        translucent: false,
        renderState: {
          depthTest: { enabled: false },
          depthMask: false,
          cull: { enabled: false },
        },
      }),
      asynchronous: false,
      allowPicking: false,
    }));
  }

  addPosition(position: Cartesian3) {
    if (this.destroyed || this.viewer.isDestroyed()) return;
    const positions = this.builder.getPositions();
    const previous = positions[positions.length - 1];
    if (previous && Cartesian3.distanceSquared(previous, position) < 0.0001)
      return;

    this.builder.addPoint(position);
    this.addMarker(position);
    this.updateLine();
    this.viewer.scene.requestRender();
  }

  get pointCount() {
    return this.builder.pointCount;
  }

  undo() {
    if (this.destroyed || this.viewer.isDestroyed() || !this.pointCount) return false;
    const positions = this.builder.getPositions();
    positions.pop();
    this.builder.reset();
    positions.forEach((position) => this.builder.addPoint(position));
    this.points.remove(this.points.get(this.points.length - 1));
    this.updateLine();
    this.viewer.scene.requestRender();
    return true;
  }

  private updateLine() {
    const primitive = this.builder.toPrimitive(false);
    if (!primitive) {
      if (this.primitive) this.viewer.scene.primitives.remove(this.primitive);
      this.primitive = undefined;
      return;
    }

    this.viewer.scene.primitives.add(primitive);
    if (this.primitive) this.viewer.scene.primitives.remove(this.primitive);
    this.primitive = primitive;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.offAllListeners();
    if (!this.viewer.isDestroyed()) {
      if (this.primitive) this.viewer.scene.primitives.remove(this.primitive);
      this.viewer.scene.primitives.remove(this.points);
      this.viewer.scene.requestRender();
    }
    this.primitive = undefined;
    this.builder.reset();
  }
}
