import { useViewer } from './viewer';
import { useCamera } from './camera';
import { useGlobEvent } from './globEvent';
import { useShape } from './shape';
export function useCesiumMain(ele: string) {
  const { getViewer } = useViewer();
  const { setView } = useCamera();
  const viewer = getViewer(ele);
  const { callback } = useGlobEvent(viewer);
  const {} = useShape(viewer);
  setView(viewer);
  return {
    callback
  };
}
