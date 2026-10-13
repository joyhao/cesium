import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import glsl from "vite-plugin-glsl";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import path from "path";

export default defineConfig({
  server: {
    port: 8889,
    strictPort: false,
    open: true,
    hmr: true,
  },
  plugins: [
    vue(),
    glsl(),
    AutoImport({
      imports: [
        "vue",
        "vue-router",
        {
          // vue-router preset 不含创建路由的 API，手动补充
          "vue-router": [
            "createRouter",
            "createWebHistory",
            "createWebHashHistory",
          ],
        },
        {
          // Cesium 常用类自动导入（按需继续补充）
          cesium: [
            "Cartesian3",
            "ClockRange",
            "Color",
            "ImageryLayer",
            "JulianDate",
            "OpenStreetMapImageryProvider",
            "UrlTemplateImageryProvider",
            "SampledPositionProperty",
            "Viewer",
          
          ],
        },
      ],
      dts: "src/auto-imports.d.ts",
    }),
    // 模板中的组件自动导入（扫描 src/components）
    Components({ dts: "src/components.d.ts" }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@asset": path.resolve(__dirname, "src/assets"),
      "@css": path.resolve(__dirname, "src/assets/css"),
      "@img": path.resolve(__dirname, "src/assets/img"),
      "@com": path.resolve(__dirname, "src/components"),
      "@view": path.resolve(__dirname, "src/views"),
      "@store": path.resolve(__dirname, "src/stores"),
    },
  },
  optimizeDeps: {
    // 让 Vite 用 esbuild 预构建 cesium 及其子包，将其内部 CJS 依赖（如 mersenne-twister）
    // 封装为带 default 导出的 ESM，避免浏览器直接加载 CJS 源码时报
    // "does not provide an export named 'default'" 的错误。
    // 注意：不能 exclude cesium，否则其内部的 @cesium/engine 等子包不会被扫描预构建。
    include: ["cesium", "@cesium/engine", "@cesium/widgets", "mersenne-twister"],
  },
});
