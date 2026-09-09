import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: [
        'vue',
        {
          // Cesium 常用类自动导入（按需继续补充）
          cesium: [
            'Cartesian3',
            'ClockRange',
            'Color',
            'ImageryLayer',
            'JulianDate',
            'OpenStreetMapImageryProvider',
            'SampledPositionProperty',
            'Viewer',
          ],
        },
      ],
      dts: 'src/auto-imports.d.ts',
    }),
  ],
  optimizeDeps: {
    exclude: ['cesium'],
  },
})
