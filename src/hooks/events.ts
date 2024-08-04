import {
  Cartesian2,
  Color,
  Entity,
  ModelGraphics,
  ScreenSpaceEventType,
  Viewer,
  defined
} from 'cesium';

export interface iEventParams {
  flag: boolean;
  entity: Entity;
  model: ModelGraphics;
}

/**
 * @param  flag 是否选中
 * @param entity 需要监听的实体
 */
export type iFn = ({ flag, entity, model }: iEventParams) => void;
export function useEvents(viewer: Viewer) {
  /**
   *
   * @param entity 需要监听的实体
   * @param fn 回调函数
   */
  function onMousemove(entity: Entity, fn: iFn) {
    function _movement(events: { endPosition: Cartesian2 }) {
      if (!entity.model) return;
      const pickedFeature = viewer.scene.pick(events.endPosition);
      if (defined(pickedFeature) && pickedFeature.id === entity) {
        fn({
          flag: true,
          entity,
          model: entity.model
        });
      } else {
        fn({
          flag: false,
          entity,
          model: entity.model
        });
      }
    }

    viewer.screenSpaceEventHandler.setInputAction(
      _movement,
      ScreenSpaceEventType.MOUSE_MOVE
    );
  }
  return {
    onMousemove
  };
}
