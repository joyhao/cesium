<script setup lang="ts">
import { useAppStore } from "../stores/app";
import { menus } from "../router/routes";

const appStore = useAppStore();
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
    <div class="brand">
      <span class="brand-mark">◈</span>
      <span v-if="!appStore.sidebarCollapsed"
        >CESIUM<small>ANIMATION LAB</small></span
      >
    </div>
    <nav class="menu">
      <RouterLink
        v-for="m in menus"
        :key="m.to"
        :to="m.to"
        class="menu-item"
        active-class="active"
        :title="m.label"
      >
        <i>{{ m.icon }}</i>
        <span v-if="!appStore.sidebarCollapsed">{{ m.label }}</span>
      </RouterLink>
    </nav>
    <button class="collapse-btn" @click="appStore.toggleSidebar()">
      {{ appStore.sidebarCollapsed ? "»" : "«" }}
    </button>
    <footer v-if="!appStore.sidebarCollapsed" class="side-foot">
      VUE 3 · PINIA · CESIUM
    </footer>
  </aside>
</template>
