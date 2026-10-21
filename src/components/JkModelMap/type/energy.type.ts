
import {
    Color,
    Math as CesiumMath,
} from "cesium";


export interface JkShieldOptions {
    // 椭球三个半轴半径（米），默认球形；改成 [r, r, r * 0.5] 可当罩在楼顶的圆顶。
    radii?: [number, number, number];
    color?: Color;
    opacity?: number;
}

export interface ResolvedShieldOptions {
    radii: [number, number, number];
    color: Color;
    opacity: number;
}
