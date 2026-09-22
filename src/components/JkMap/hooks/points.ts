import { Cartesian3, Color, Rectangle } from "cesium";
import { usePoints } from "@store/points";
import { JkBase } from "./base";

export class JkPoints extends JkBase {
  private entityIds: string[] = [];
  private removeCameraListener?: () => void;
  private visibilityTimer?: ReturnType<typeof setTimeout>;
  viewer = JkBase.viewer;

  constructor() {
    super();
    this.init();
  }

  init() {
    const { points } = usePoints();

    if (!this.viewer || this.viewer.isDestroyed()) return;

    this.clear();
    this.entityIds = points.map((point) => {
      const id = `random-point-${point.id}`;

      this.viewer.entities.add({
        id,
        show: false,
        position: Cartesian3.fromDegrees(
          point.longitude,
          point.latitude,
          point.height
        ),
        point: {
          pixelSize: 7,
          color: Color.CYAN,
          outlineColor: Color.WHITE,
          outlineWidth: 1,
        },
      });

      return id;
    });
  }

  scheduleVisibilityUpdate = () => {
    console.log("----");

    if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer);
    }

    this.visibilityTimer = setTimeout(() => {
      this.visibilityTimer = undefined;
      this.updateVisibility();
    }, 3000);
  };

  private updateVisibility = () => {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    const rectangle = this.viewer.camera.computeViewRectangle(
      this.viewer.scene.globe.ellipsoid
    );

    if (!rectangle) {
      this.entityIds.forEach((id) => {
        const entity = this.viewer.entities.getById(id);
        if (entity) entity.show = true;
      });
      return;
    }

    const { points } = usePoints();
    points.forEach((point) => {
      const entity = this.viewer.entities.getById(`random-point-${point.id}`);
      if (!entity) return;

      const position = Cartesian3.fromDegrees(
        point.longitude,
        point.latitude,
        point.height
      );
      const cartographic =
        this.viewer.scene.globe.ellipsoid.cartesianToCartographic(position);

      entity.show = Rectangle.contains(rectangle, cartographic);
    });
  };

  clear() {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    this.entityIds.forEach((id) => this.viewer.entities.removeById(id));
    this.entityIds = [];
  }

  destroy() {
    this.removeCameraListener?.();
    this.removeCameraListener = undefined;

    if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer);
      this.visibilityTimer = undefined;
    }

    this.clear();
  }
}
