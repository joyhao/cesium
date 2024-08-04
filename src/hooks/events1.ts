import {
  Cartesian2,
  Color,
  ScreenSpaceEventType,
  Viewer,
  defined
} from 'cesium';

export function useEvents() {
  /**
   * 鼠标移上
   * @param viewer
   */
  function onMouse(viewer: Viewer) {
    const highlighted = {
      feature: undefined,
      originalColor: new Color()
    };

    // 3dTiles
    function movement(events: { endPosition: Cartesian2 }) {
      const pickedFeature = viewer.scene.pick(events.endPosition);
      if (defined(highlighted.feature)) {
        // @ts-ignore
        highlighted.feature.color = highlighted.originalColor;
        highlighted.feature = undefined;
      }

      if (!defined(pickedFeature)) {
        return;
      }

      // 3dTiles
      highlighted.feature = pickedFeature;
      pickedFeature.color = Color.RED.withAlpha(0.5);
    }

    function leftClick(events: any) {
      const feature = viewer.scene.pick(events.position);
      if (!defined(feature)) {
        return;
      }

      console.log(feature);
    }

    function rightClick(events: any) {
      const feature = viewer.scene.pick(events.position);
      if (!defined(feature)) {
        return;
      }

      console.log(feature);
    }

    viewer.screenSpaceEventHandler.setInputAction(
      movement,
      ScreenSpaceEventType.MOUSE_MOVE
    );

    viewer.screenSpaceEventHandler.setInputAction(
      leftClick,
      ScreenSpaceEventType.LEFT_CLICK
    );
    viewer.screenSpaceEventHandler.setInputAction(
      rightClick,
      ScreenSpaceEventType.RIGHT_CLICK
    );
  }

  return {
    onMouse
  };
}
