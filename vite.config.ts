import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import path from "path";

export default defineConfig({
  server: {
    port: 8889,
    strictPort: false,
    open: true,
  },
  plugins: [
    vue(),
    AutoImport({
      imports: [
        "vue",
        {
          // Cesium 常用类自动导入（按需继续补充）
          cesium: [
            "Cartesian3",
            "ClockRange",
            "Color",
            "ImageryLayer",
            "JulianDate",
            "OpenStreetMapImageryProvider",
            "SampledPositionProperty",
            "Viewer",
          ],
        },
      ],
      dts: "src/auto-imports.d.ts",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@assets": path.resolve(__dirname, "src/assets"),
      "@css": path.resolve(__dirname, "src/assets/css"),
      "@img": path.resolve(__dirname, "src/assets/img"),
      "@com": path.resolve(__dirname, "src/components"),
      "@views": path.resolve(__dirname, "src/views"),
    },
  },
  optimizeDeps: {
    exclude: ["cesium"],
    // cesium 被 exclude 后按源码加载，其内部引用的这两个包（含 CJS 依赖如 mersenne-twister）必须预构建为 ESM
    include: ["@cesium/engine", "@cesium/widgets"],
  },
});
