import { useViewer } from './viewer';
import { useModel } from './model';
import {
  Cartesian2,
  Color,
  defined,
  HeadingPitchRange,
  Property,
  Math as _Math,
  ScreenSpaceEventType,
  HeadingPitchRoll,
  Cesium3DTileContent,
  Cesium3DTileStyle
} from 'cesium';
import { useCamera } from './camera';
import { useEvents } from './events';
export async function useCesiumMain(ele: string, uri: string) {
  const { getViewer } = useViewer();
  const { setView } = useCamera();
  const viewer = getViewer(ele);
  const { addTitles, addGlb, cssStyle, zoomCenter } = useModel(viewer);
  const { onMousemove } = useEvents(viewer);
  setView(viewer);

  // 加载3DTiles模型
  // const model = await addTitles(
  //   'http://127.0.0.1:9400/static/3D/b33/tileset.json'
  // );

  // cssStyle(model, {
  //   color: 'color("red")'
  // });

  /**
   * 加载glb模型
   * @returns
   */

  // uri = `http://127.0.0.1:9400/static/3D/air1.glb`;
  // const air1 = addGlb('air1', uri, 116.0678219, 39.9389436, 5000, 0);

  // const eAir1 = viewer.entities.add(air1);
  // viewer.trackedEntity = eAir1;

  // ----- 加载glb模型 end

  // onMousemove(eAir1, ({ flag, entity, model }) => {
  //   if (flag) {
  //     model.color = Color.RED as unknown as Property;
  //   } else {
  //     model.color = new Color() as unknown as Property;
  //   }
  // });
}
