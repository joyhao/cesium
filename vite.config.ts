import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import path from "path";

export default defineConfig({
  server: {
    port: 8889,
    strictPort: false,
    open: true,
    hmr: true
  },
  plugins: [
    vue(),
    AutoImport({
      imports: [
        "vue",
        "vue-router",
        {
          // vue-router preset 不含创建路由的 API，手动补充
          "vue-router": ["createRouter", "createWebHistory", "createWebHashHistory"],
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
    exclude: ["cesium"],
    // cesium 被 exclude 后按源码加载，其内部引用的这两个包（含 CJS 依赖如 mersenne-twister）必须预构建为 ESM
    include: ["@cesium/engine", "@cesium/widgets"],
  },
});
