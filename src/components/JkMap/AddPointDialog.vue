<template>
  <div v-if="data" class="modal-mask" @click.self="$emit('cancel')">
    <div class="modal">
      <h3 class="modal-title">{{ title ?? "添加节点" }}</h3>
      <form class="form" @submit.prevent="confirm">
        <label class="field">
          <span class="label">名称</span>
          <input
            ref="inputRef"
            v-model="name"
            class="input"
            type="text"
            placeholder="请输入节点名称"
          />
        </label>
        <div class="coords">
          <div class="coord">
            <span>经度</span><b>{{ data.lon.toFixed(6) }}</b>
          </div>
          <div class="coord">
            <span>纬度</span><b>{{ data.lat.toFixed(6) }}</b>
          </div>
          <div class="coord">
            <span>高程</span><b>{{ data.height.toFixed(2) }} m</b>
          </div>
        </div>
        <div class="actions">
          <button type="button" class="btn cancel" @click="$emit('cancel')">
            取消
          </button>
          <button type="submit" class="btn confirm" :disabled="!name.trim()">
            确定
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import type { AddPointRequestDetail } from "./type/map.type";

const props = defineProps<{
  data: AddPointRequestDetail | null;
  name?: string;
  title?: string;
}>();
const emit = defineEmits<{ confirm: [label: string]; cancel: [] }>();

const name = ref(props.name ?? "");
const inputRef = ref<HTMLInputElement>();

onMounted(() => {
  nextTick(() => inputRef.value?.focus());
});

function confirm() {
  const label = name.value.trim();
  if (!label) return;
  emit("confirm", label);
}
</script>

<style scoped lang="scss">
.modal-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  z-index: 20;
}

.modal {
  width: 320px;
  padding: 20px 22px;
  border-radius: 10px;
  background: #1f2733;
  color: #e6edf3;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  font-size: 14px;
}

.modal-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
}

.field {
  display: flex;
  align-items: center;
  gap: 12px;
}

.label {
  flex: 0 0 40px;
  color: #9aa7b4;
}

.input {
  flex: 1;
  height: 34px;
  padding: 0 10px;
  border: 1px solid #38444f;
  border-radius: 6px;
  background: #141b22;
  color: #e6edf3;
  outline: none;

  &:focus {
    border-color: #4aa3ff;
  }
}

.coords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin: 16px 0 4px;
  color: #9aa7b4;

  .coord {
    display: flex;
    gap: 6px;

    b {
      color: #cfd8e0;
      font-weight: 600;
    }
  }
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  height: 32px;
  padding: 0 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.cancel {
  background: #38444f;
  color: #e6edf3;

  &:hover {
    background: #444f5b;
  }
}

.confirm {
  background: #4aa3ff;
  color: #fff;

  &:hover {
    background: #3b90e8;
  }

  &:disabled {
    background: #2b3a49;
    color: #6b7785;
    cursor: not-allowed;
  }
}
</style>
