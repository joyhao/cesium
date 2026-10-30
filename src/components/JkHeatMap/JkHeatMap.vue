<style lang="scss" scoped src="./index.scss"></style>

<template>
  <section ref="container" class="heat-map-container"></section>
</template>

<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref } from "vue";
import { JkMap } from "./hooks/map";

const container = ref<HTMLElement>();
const config = inject<AppConfig>("AppConfig");
let map: JkMap | undefined;

onMounted(() => {
  if (!container.value || !config) return;
  map = new JkMap(container.value, config);
});

onBeforeUnmount(() => {
  map?.destroy();
  map = undefined;
});
</script>
