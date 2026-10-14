import { Cartesian3 } from "@cesium/engine";
import { isInRect } from "../../../utils/utils";
import type { InMessage, Point } from "../type/map.type";

// Worker 内累积主线程分批下发的点位，后续仅按视口矩形筛选。
let pointList: Point[] = [];
// 手动添加节点的 id 集合，clear_added 据此精确清除，不依赖 id 正负号。
const manualIds = new Set<number>();

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<InMessage>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};

ctx.onmessage = (event: MessageEvent<InMessage>) => {
  const message = event.data;

  if (message.type === "add") {
    pointList.push(...message.points);
    return;
  }

  // 手动添加的节点：记录 id 并加入列表，供 clear_added 精确移除。
  if (message.type === "add_manual") {
    for (const point of message.points) manualIds.add(point.id);
    pointList.push(...message.points);
    return;
  }

  // 清除手动添加的节点，仅保留批量点位。
  if (message.type === "clear_added") {
    pointList = pointList.filter((point) => !manualIds.has(point.id));
    manualIds.clear();
    return;
  }

  // 删除指定 id 的节点（手动或批量均可）。
  if (message.type === "remove") {
    pointList = pointList.filter((point) => point.id !== message.id);
    return;
  }

  // 修改指定 id 节点的名称（label）。
  if (message.type === "update") {
    const target = pointList.find((point) => point.id === message.id);
    if (target) target.label = message.label;
    return;
  }

  if (message.type === "filter") {
    const { rectangle } = message;
    const visible = pointList.filter((point) => isInRect(point, rectangle));

    // 直接以扁平 Float64Array 输出 xyz，省去主线程再次转换。
    const positions = new Float64Array(visible.length * 3);
    const points = [];

    for (let i = 0; i < visible.length; i++) {
      const point = visible[i];
      const cartesian = Cartesian3.fromDegrees(
        point.lon,
        point.lat,
        point.height,
      );
      positions[i * 3] = cartesian.x;
      positions[i * 3 + 1] = cartesian.y;
      positions[i * 3 + 2] = cartesian.z;
      points[i] = point;
    }

    // 转移 positions.buffer 所有权，零拷贝回传主线程。
    ctx.postMessage({ type: "result", positions, points }, [positions.buffer]);
  }
};
