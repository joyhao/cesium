// Cesium Fabric 材质入口；uColor、uLine 由 TypeScript 中的 uniforms 注入。
czm_material czm_getMaterial(czm_materialInput materialInput)
{
    // 初始化默认材质，保留未显式设置的法线、高光等字段。
    czm_material material = czm_getDefaultMaterial(materialInput);

    // 对线条而言，st.t 是横向纹理坐标：中心为 0.5，两侧边缘为 0 和 1。
    // 映射后 edge 在中心为 0，在两侧边缘为 1。
    float edge = abs(materialInput.st.t - 0.5) * 2.0;

    // 亮芯权重：中心区域为 1，向边缘平滑衰减至 0。
    float core = 1.0 - smoothstep(0.15, 1.0, edge);

    // 内层 mix：边缘使用半亮度基础色，中心最多混入 75% 白色，形成亮芯。
    // 外层 mix：uLine=0 时点使用基础色，uLine=1 时线使用亮芯渐变色。
    vec3 color = mix(uColor.rgb, mix(uColor.rgb * 0.5, vec3(1.0), core * 0.75), uLine);

    // 关闭漫反射颜色贡献，使用自发光颜色，避免依赖场景光照。
    material.diffuse = vec3(0.0);
    material.emission = color;

    // 沿用基础色的 alpha；实际透明混合还取决于外观的 translucent 设置。
    material.alpha = uColor.a;
    return material;
}
