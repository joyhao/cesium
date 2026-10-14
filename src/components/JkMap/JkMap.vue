<style lang="scss" scoped src="./index.scss"></style>

<template>
  <section ref="container" class="container" :class="{ drawing: isLine }">
    <div class="camera-info">
      <span>高度 {{ info.height.toLocaleString() }} m</span>
      <span>层级 {{ info.level }}</span>
      <span>FPS {{ info.fps }}</span>
      <span>点位 {{ info.loadedPoints }} / {{ info.totalPoints }}</span>
    </div>


    <div class="toolbar">
      <button
        class="tool-btn"
        :class="{ active: isLine }"
        @click="drawLineClick"
      >
        {{ isLine ? "退出连线" : "连线模式" }}
      </button>
      <span v-if="isLine" class="tool-hint">左键加点 · 右键结束</span>
      <button
        class="tool-btn"
        :class="{ active: isAddPoint }"
        @click="addPointClick"
      >
        {{ isAddPoint ? "退出添加" : "节点添加" }}
      </button>
      <span v-if="isAddPoint" class="tool-hint">左键落点 · 再次点击按钮退出</span>
    </div>

    <AddPointDialog
      v-if="showAddDialog"
      :data="addDialogData"
      :name="editName"
      :title="editTitle"
      @confirm="onAddConfirm"
      @cancel="onAddCancel"
    />

    <PointHoverActions
      v-if="hovered"
      :x="hovered.x"
      :y="hovered.y"
      @edit="onEdit"
      @delete="onDelete"
    />
  </section>
</template>

<script setup lang="ts">
import { Cartesian3 } from "cesium";
import { JkMap } from "./hooks/map";
import AddPointDialog from "./AddPointDialog.vue";
import PointHoverActions from "./PointHoverActions.vue";
import type {
  AddPointRequestDetail,
  PointHoverDetail,
} from "./type/map.type";

// 将 Cesium 事件转换为 Vue 响应式状态，供右上角信息面板展示。
const info = reactive({
  height: 0,
  level: 0,
  fps: 0,
  loadedPoints: 0,
  totalPoints: 0,
});

// 地图实例负责统一创建 Viewer、图层、相机和点位模块。
let map: JkMap;


// 连线模式状态（驱动按钮高亮、文字与光标），由线段模块 toggleLine 同步。
const isLine = ref(false);
const isAddPoint = ref(false);

// 节点添加弹窗：左键落点后请求打开，确认/取消后关闭。
const showAddDialog = ref(false);
const addDialogData = ref<AddPointRequestDetail | null>(null);
// 弹窗标题与预填名称（编辑节点时复用同一弹窗）。
const editName = ref("");
const editTitle = ref("添加节点");
// 编辑态下正在编辑的节点 id（null 表示当前为新增节点）。
const pendingEditId = ref<number | null>(null);

// hover 节点时显示的编辑/删除图标条及其屏幕坐标。
const hovered = ref<PointHoverDetail | null>(null);

function drawLineClick() {
  isLine.value = map.lines.toggleLine();
}

function addPointClick() {
  if (!map) return;
  isAddPoint.value = map.points.toggleAddPoint();
}

// 弹窗确认：编辑态更新 label，新增态落点。
function onAddConfirm(label: string) {
  if (pendingEditId.value !== null) {
    map.points.updatePointLabel(pendingEditId.value, label);
  } else {
    map.points.commitAddPoint(label);
  }
  closeDialog();
}

// 弹窗取消：新增态丢弃待确认坐标；编辑态无需特殊处理。
function onAddCancel() {
  map.points.cancelAddPoint();
  closeDialog();
}

// 统一关闭弹窗并重置编辑态。
function closeDialog() {
  pendingEditId.value = null;
  editName.value = "";
  editTitle.value = "添加节点";
  showAddDialog.value = false;
  addDialogData.value = null;
}

// 点击图标“编辑”：打开预填名称的弹窗，提交后改名为该节点 label。
function onEdit() {
  if (!hovered.value) return;
  const p = hovered.value;
  addDialogData.value = {
    position: Cartesian3.fromDegrees(p.lon, p.lat, p.height),
    lon: p.lon,
    lat: p.lat,
    height: p.height,
  };
  editName.value = p.label;
  editTitle.value = "编辑节点";
  pendingEditId.value = p.id;
  showAddDialog.value = true;
  hovered.value = null;
}

// 点击图标“删除”：从地图与 Worker 中移除该节点。
function onDelete() {
  if (!hovered.value) return;
  map.points.removePoint(hovered.value.id);
  hovered.value = null;
}

onMounted(() => {
  map = new JkMap(".container");

  map.camera.on("camera_change", (event) => {
    const { height, level } = event.detail;

    info.height = height;
    info.level = level;
  });

  map.on("fps_change", (event) => {
    const { fps } = event.detail;
    info.fps = fps;
  });

  map.points.on("points_change", (event) => {
    const { loaded, total } = event.detail;
    info.loadedPoints = loaded;
    info.totalPoints = total;
  });

  // 左键落点后弹出表单，填写名称（label）后再落图。
  map.points.on("add_point_request", (event) => {
    addDialogData.value = event.detail;
    editName.value = "";
    editTitle.value = "添加节点";
    pendingEditId.value = null;
    showAddDialog.value = true;
  });

  // hover 节点时显示编辑/删除图标条。
  map.points.on("point_hover", (event) => {
    hovered.value = event.detail;
  });
});

onBeforeUnmount(() => {
  map.destroy();
});
</script>
