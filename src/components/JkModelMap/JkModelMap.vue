<style lang="scss" scoped src="./index.scss"></style>

<template>
  <!-- 容器可获得键盘焦点，使撤销快捷键仅在地图区域内生效。 -->
  <section
    ref="container"
    class="container model-map-container"
    tabindex="0"
    @pointerdown="focusMap"
    @keydown="handleKeydown"
  >
    <button class="reset-view" type="button" @click="resetView">还原视角</button>
    <button class="switch-view" type="button" @click="switchView">切换视角</button>
    <aside class="path-list" aria-label="已保存路径" @keydown.stop>
      <h3>路径列表 <span>{{ pathsStore.paths.length }}</span></h3>
      <p v-if="!pathsStore.paths.length">暂无路径，绘制后自动保存</p>
      <ul v-else>
        <li v-for="path in pathsStore.paths" :key="path.id">
          <div class="path-description">
            <strong>{{ path.label }}</strong>
            <span>{{ path.points.length }} 个点</span>
          </div>
          <button
            type="button"
            :aria-label="`删除${path.label}`"
            @click.stop="pathsStore.removePath(path.id)"
          >删除</button>
        </li>
      </ul>
    </aside>
    <div class="feature-info">
      <div>模型Name：<strong>{{ feature.name }}</strong></div>
      <div>Feature ID：<strong>{{ feature.featureId }}</strong></div>
    </div>
    <div class="camera-info">
      <span>高度 {{ info.height.toLocaleString() }} m</span>
      <span>层级 {{ info.level }}</span>
      <span>航向角 {{ info.heading.toFixed(1) }}°</span>
      <span>俯仰角 {{ info.pitch.toFixed(1) }}°</span>
      <span>翻滚角 {{ info.roll.toFixed(1) }}°</span>
      <span>FPS {{ info.fps }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { JkMap } from "./hooks/map";
import { usePaths } from "../../stores/paths";
import { watch, type WatchStopHandle } from "vue";

const pathsStore = usePaths();
let stopPathsWatch: WatchStopHandle | undefined;
let syncingPaths = false;

// 当前选中模型构件的信息，用于右侧属性面板。
const feature = reactive<{ name: string; featureId?: number }>({
  name: "",
  featureId: undefined,
});
// 相机状态与渲染帧率，由地图事件同步到界面。
const info = reactive({
  height: 0,
  level: 0,
  heading: 0,
  pitch: 0,
  roll: 0,
  fps: 0,
});

let map: JkMap;

// 点击地图时获取焦点；不抢占按钮、表单或可编辑元素的焦点。
function focusMap(event: PointerEvent) {
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("input, textarea, select, button, [contenteditable]")) return;
  (event.currentTarget as HTMLElement).focus({ preventScroll: true });
}

// Ctrl+Z / Command+Z 撤销路径点，跳过文本编辑、输入法组合及其他组合键。
// 仅在撤销成功时阻止浏览器默认行为。
function handleKeydown(event: KeyboardEvent) {
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable]")) return;
  if (event.isComposing || !(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== "z") return;
  if (map?.layer.plane.paths.undo()) event.preventDefault();
}

// 恢复配置中的初始观察视角。
function resetView() {
  map?.resetView();
}

// 切换到地图类预设的观察视角。
function switchView() {
  map?.switchView();
}

// 将属性值转为展示文本；当前模板尚未使用此函数。
function formatProperty(value: unknown) {
  if (value == null) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

// DOM 就绪后创建地图，并监听相机、帧率和模型构件选择事件。
onMounted(() => {
  map = new JkMap(".model-map-container");
  map.layer.plane.paths.loadPaths(pathsStore.paths);
  map.on("model_paths_change", ({ detail }) => {
    syncingPaths = true;
    try {
      pathsStore.paths = detail.paths;
    } finally {
      syncingPaths = false;
    }
  });
  stopPathsWatch = watch(
    () => pathsStore.paths,
    (paths) => {
      if (!syncingPaths) map.layer.plane.paths.loadPaths(paths);
    },
    { deep: true, flush: "sync" },
  );

  map.camera.on("camera_change", (event) => {
    info.height = event.detail.height;
    info.level = event.detail.level;
    info.heading = event.detail.heading;
    info.pitch = event.detail.pitch;
    info.roll = event.detail.roll;
  });

  map.on("fps_change", (event) => {
    info.fps = event.detail.fps;
  });

  map.on("model_feature_pick", (event) => {
    if (!event.detail) {
      return;
    }
    feature.name = event.detail.name;
    feature.featureId = event.detail.featureId;
  });
});

// 组件卸载前释放地图资源及其内部事件监听。
onBeforeUnmount(() => {
  stopPathsWatch?.();
  map?.destroy();
});
</script>
