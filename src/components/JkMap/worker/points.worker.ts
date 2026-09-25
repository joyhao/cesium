import { Cartesian3, Rectangle } from "@cesium/engine";
import { isPointInRectangle } from "../utils";
import type { PointPosition } from "../type/map.type";

type RectLike = { west: number; east: number; south: number; north: number };

type InitMessage = { type: "init"; points: PointPosition[] };
type FilterMessage = { type: "filter"; rectangle: RectLike };
type InMessage = InitMessage | FilterMessage;

// Worker 内只持有一次下发的全量点位，后续仅按视口矩形筛选。
let points: PointPosition[] = [];

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<InMessage>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};

ctx.onmessage = (event: MessageEvent<InMessage>) => {
  const message = event.data;

  if (message.type === "init") {
    points = message.points;
    return;
  }

  if (message.type === "filter") {
    // 主线程发来的是弧度矩形，重建成 Cesium Rectangle 复用同一套判定逻辑。
    const rect = Rectangle.fromRadians(
      message.rectangle.west,
      message.rectangle.south,
      message.rectangle.east,
      message.rectangle.north
    );

    const visible = points.filter((point) => isPointInRectangle(point, rect));

    // 直接以扁平 Float64Array 输出 xyz，省去主线程再次转换。
    const positions = new Float64Array(visible.length * 3);
    const ids = new Array<number>(visible.length);

    for (let i = 0; i < visible.length; i++) {
      const point = visible[i];
      const cartesian = Cartesian3.fromDegrees(
        point.longitude,
        point.latitude,
        point.height
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
