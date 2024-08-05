import {
  ArcType,
  Cartesian2,
  Cartesian3,
  Color,
  defined,
  ShadowMode,
  Viewer
} from 'cesium';
import { getAddress } from './entity';
export function useShape(viewer: Viewer) {
  const address = getAddress();
  viewer.scene.preRender.addEventListener(function () {
    for (let i = 0; i < address.length; i++) {
      const item = address[i];
      const scratch = new Cartesian2();
      const position = Cartesian3.fromDegrees(item.degrees[0], item.degrees[1]);
      const canvasPosition = viewer.scene.cartesianToCanvasCoordinates(
        position,
        scratch
      );

      if (defined(canvasPosition)) {
        if (item.ele) {
          item.ele.style.top = `${canvasPosition.y}px`;
          item.ele.style.left = `${canvasPosition.x}px`;
        }
      }
    }
  });

  for (let i = 0; i < address.length; i++) {
    const item = address[i];
    const nItem = address[i + 1];
    if (nItem) {
      const line = viewer.entities.add({
        name: `${item.name}-${nItem.name}`,
        polyline: {
          positions: Cartesian3.fromDegreesArray([
            ...item.degrees,
            ...nItem.degrees
          ]),
          width: 5,
          arcType: ArcType.GEODESIC,
          material: new Color(1, 1, 1, 1),
          clampToGround: true,
          zIndex: 30
        }
      });
    }
  }

  return {};
}
