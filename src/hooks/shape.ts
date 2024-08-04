import { Cartesian2, Cartesian3, defined, Viewer } from 'cesium';
import { address } from './entity';
export function useShape(viewer: Viewer) {
  for (let i = 0; i < address.length; i++) {
    const item = address[i];
    const scratch = new Cartesian2();

    viewer.scene.preRender.addEventListener(function () {
      const position = Cartesian3.fromDegrees(item.degrees[0], item.degrees[1]);
      const canvasPosition = viewer.scene.cartesianToCanvasCoordinates(
        position,
        scratch
      );
      const dom = document.getElementById(item.name) as HTMLElement;

      if (defined(canvasPosition)) {
        dom.style.top = `${canvasPosition.y}px`;
        dom.style.left = `${canvasPosition.x}px`;
      }
    });
  }
  return {};
}
