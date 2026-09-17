<script setup lang="ts">
provide("AppConfig", window.AppConfig);
</script>

<template>
  <article class="app">
    <SideBar />
    <main class="content">
      <RouterView />
    </main>
  </article>
</template>
