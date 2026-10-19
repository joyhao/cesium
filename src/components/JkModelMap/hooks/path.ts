import {
  BillboardCollection,
  Cartesian3,
  HorizontalOrigin,
  Primitive,
  VerticalOrigin,
  Viewer,
} from "cesium";
import { JkBase } from "./base";
import { PolylineBuilder } from "@com/JkMap/shape/polyline";

export class JkPath extends JkBase {
  readonly viewer: Viewer;
  private builder = new PolylineBuilder();
  private points: BillboardCollection;
  private dotImage: HTMLCanvasElement;
  private primitive?: Primitive;
  private destroyed = false;

  constructor() {
    super();
    this.viewer = JkBase.viewer;
    this.dotImage = this.createDotImage();
    this.points = this.viewer.scene.primitives.add(new BillboardCollection());
  }

  private createDotImage(): HTMLCanvasElement {
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 10, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "white";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 8, 0, Math.PI * 2);
    ctx.fillStyle = "cyan";
    ctx.fill();
    return canvas;
  }

  addPosition(position: Cartesian3) {
    if (this.destroyed || this.viewer.isDestroyed()) return;
    const positions = this.builder.getPositions();
    const previous = positions[positions.length - 1];
    if (previous && Cartesian3.distanceSquared(previous, position) < 0.0001)
      return;

    this.builder.addPoint(position);
    this.points.add({
      position,
      image: this.dotImage,
      scale: 0.5,
      horizontalOrigin: HorizontalOrigin.CENTER,
      verticalOrigin: VerticalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    });
    this.updateLine();
    this.viewer.scene.requestRender();
  }

  private updateLine() {
    const primitive = this.builder.toPrimitive(false);
    if (!primitive) return;

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
