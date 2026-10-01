<script setup lang="ts">
const stats = [
  { label: "路由", value: "/demo-two" },
  { label: "组件", value: "DemoTwo.vue" },
  { label: "懒加载", value: "是" },
];

const toggled = ref(false);
</script>

<template>
  <section class="page page-demo">
    <header class="demo-head">
      <p class="eyebrow">TEST PAGE 02</p>
      <h1>测试页面二</h1>
      <p class="desc">
        第二个占位页面，验证左侧菜单高亮与页面切换时地图资源的正确销毁。
      </p>
    </header>
    <div class="demo-stats">
      <div v-for="s in stats" :key="s.label" class="stat-card">
        <span>{{ s.label }}</span>
        <strong>{{ s.value }}</strong>
      </div>
    </div>
    <button class="demo-btn" @click="toggled = !toggled">
      {{ toggled ? "已切换 · 点击还原" : "交互测试 · 点击切换" }}
    </button>
  </section>
</template>
