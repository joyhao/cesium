import { useViewer } from './viewer';
import { useCamera } from './camera';
import { useGlobEvent } from './globEvent';
import { useShape } from './shape';
export async function useCesiumMain(ele: string) {
  const { getViewer } = await useViewer();
  const { setView } = useCamera();
  const viewer = getViewer(ele);
  const {} = useGlobEvent(viewer);
  const {} = useShape(viewer);
  setView(viewer);
}
