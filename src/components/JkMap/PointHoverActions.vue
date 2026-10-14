<template>
  <div class="point-actions" :style="style" @mousedown.stop @click.stop>
    <button
      class="pa-btn"
      type="button"
      title="编辑"
      @click="$emit('edit')"
      v-html="editIcon"
    ></button>
    <button
      class="pa-btn pa-danger"
      type="button"
      title="删除"
      @click="$emit('delete')"
      v-html="deleteIcon"
    ></button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { EDIT_ICON, DELETE_ICON } from "./icons";

const props = defineProps<{ x: number; y: number }>();
const emit = defineEmits<{ edit: []; delete: [] }>();

const editIcon = EDIT_ICON;
const deleteIcon = DELETE_ICON;

// 图标条置于节点右侧并垂直居中，避免遮挡节点本身。
const style = computed(() => ({
  left: `${props.x + 14}px`,
  top: `${props.y}px`,
}));
</script>

<style scoped lang="scss">
.point-actions {
  position: absolute;
  z-index: 2;
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 6px;
  background: rgba(5, 14, 25, 0.9);
  border: 1px solid rgba(126, 191, 230, 0.35);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transform: translateY(-50%);
  pointer-events: auto;
}

.pa-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #cfe2f2;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;

  &:hover {
    background: rgba(78, 161, 255, 0.2);
    color: #fff;
  }
}

.pa-danger:hover {
  background: rgba(255, 90, 90, 0.22);
  color: #ff7a7a;
}
</style>
