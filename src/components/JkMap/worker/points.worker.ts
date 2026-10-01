import { Cartesian3, Rectangle } from "@cesium/engine";
import { isPointInRectangle } from "../utils";
import type { InMessage, PointPosition } from "../type/map.type";

// Worker 内累积主线程分批下发的点位，后续仅按视口矩形筛选。
let points: PointPosition[] = [];

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<InMessage>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};

ctx.onmessage = (event: MessageEvent<InMessage>) => {
  const message = event.data;

  if (message.type === "add") {
    points.push(...message.points);
    return;
  }

  if (message.type === "filter") {
    console.log(message);

    const visible = points.filter((point) =>
      isPointInRectangle(point, message.rectangle),
    );

    // 直接以扁平 Float64Array 输出 xyz，省去主线程再次转换。
    const positions = new Float64Array(visible.length * 3);
    const ids = new Array<number>(visible.length);

    for (let i = 0; i < visible.length; i++) {
      const point = visible[i];
      const cartesian = Cartesian3.fromDegrees(
        point.longitude,
        point.latitude,
        point.height,
      );
      positions[i * 3] = cartesian.x;
      positions[i * 3 + 1] = cartesian.y;
      positions[i * 3 + 2] = cartesian.z;
      ids[i] = point.id;
    }

    // 转移 positions.buffer 所有权，零拷贝回传主线程。
    ctx.postMessage({ type: "result", positions, ids }, [positions.buffer]);
  }
};
