import { Cartesian3, Matrix4, PrimitiveCollection, Transforms, Viewer } from "cesium";
import type { HeatMapBounds, HeatMapLocalData, HeatMapPoint } from "../type/heatMap.type";

export class JkHeatMap {
    private readonly primitives: PrimitiveCollection;
    private destroyed = false;
    // 保存通过校验的数据副本，与外部 store 对象隔离。
    private points: HeatMapPoint[] = [];

    constructor(private readonly viewer: Viewer) {
        // 子集合只存放热力图图元，后续统一显隐、清空和释放，不影响底图。
        this.primitives = viewer.scene.primitives.add(new PrimitiveCollection());
    }

    /**
     *  替换整批采样点；校验失败时抛错，保留原数据，不静默丢弃点位。 
     * */
    setData(points: readonly HeatMapPoint[]) {
        // 先校验并复制完整批次，全部成功后再替换，避免只写入部分数据。
        const nextPoints = points.map((point, index) => {
            if (!point ||
                !Number.isFinite(point.lon) || Math.abs(point.lon) > 180 ||
                !Number.isFinite(point.lat) || Math.abs(point.lat) > 90 ||
                !Number.isFinite(point.height) || !Number.isFinite(point.value)) {
                throw new Error(`热力图第 ${index + 1} 个采样点无效，请检查经纬度、高度和热力值`);
            }
            return { lon: point.lon, lat: point.lat, height: point.height, value: point.value };
        });
        this.points = nextPoints;
    }

    getData(): HeatMapPoint[] {
        return this.points
    }

    /**
     *  每次读取时重新计算范围
     * */
    getBounds(): HeatMapBounds | undefined {
        const first = this.points[0];
        if (!first) return undefined;

        // 以首个点初始化，而不是以 0 初始化，兼容负经纬度和负高度。
        const bounds: HeatMapBounds = {
            minLon: first.lon, maxLon: first.lon,
            minLat: first.lat, maxLat: first.lat,
            minHeight: first.height, maxHeight: first.height,
            minValue: first.value, maxValue: first.value,
        };
        for (const point of this.points) {
            bounds.minLon = Math.min(bounds.minLon, point.lon);
            bounds.maxLon = Math.max(bounds.maxLon, point.lon);
            bounds.minLat = Math.min(bounds.minLat, point.lat);
            bounds.maxLat = Math.max(bounds.maxLat, point.lat);
            bounds.minHeight = Math.min(bounds.minHeight, point.height);
            bounds.maxHeight = Math.max(bounds.maxHeight, point.height);
            bounds.minValue = Math.min(bounds.minValue, point.value);
            bounds.maxValue = Math.max(bounds.maxValue, point.value);
        }
        return bounds;
    }

    /**
     * 将经纬高采样点转换为统一的 ENU 米制局部坐标，供后续网格计算使用。
     * 适用于当前城市范围数据；暂不处理跨越 ±180° 经线的大范围数据。
     * 每次根据当前数据重新计算，空数据或地图已销毁时返回 undefined。
     */
    getLocalData(): HeatMapLocalData | undefined {
        const bounds = this.getBounds();
        if (!bounds) return undefined;

        /**
         * 中点为原点
         */
        const origin = Cartesian3.fromDegrees(
            (bounds.minLon + bounds.maxLon) * 0.5,
            (bounds.minLat + bounds.maxLat) * 0.5,
            (bounds.minHeight + bounds.maxHeight) * 0.5,
        );

        // start  构造以 origin 为原点的相对坐标系
        const modelMatrix = Transforms.eastNorthUpToFixedFrame(origin);
        const worldToLocal = Matrix4.inverseTransformation(modelMatrix, new Matrix4());
        // end

        const points = this.points.map((point) => {
            // point.lon, point.lat, point.height  地理坐标 经纬度 高度 
            //  Cartesian3.fromDegrees  转换成 世界坐标 x、y、z  单位米
            const world = Cartesian3.fromDegrees(point.lon, point.lat, point.height);

            // 以 origin 为原点相对坐标 x、y、z  单位米  
            const local = Matrix4.multiplyByPoint(worldToLocal, world, new Cartesian3());

            return { x: local.x, y: local.y, z: local.z, value: point.value };
        });
        return { modelMatrix, points };
    }

    /** 
     * 释放热力图资源，不销毁外部传入的共享 Viewer。
     *  
     * */
    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.points = [];
        if (this.viewer.isDestroyed()) return;

        // 场景移除子集合时会按默认行为一并销毁其中的图元。
        if (!this.primitives.isDestroyed()) {
            this.viewer.scene.primitives.remove(this.primitives);
        }
        this.viewer.scene.requestRender();
    }
}
