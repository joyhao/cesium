<script setup lang="ts">
const now = ref(new Date());
const timer = setInterval(() => (now.value = new Date()), 1000);
onBeforeUnmount(() => clearInterval(timer));

const items = [
  { name: '实体动画', desc: 'Entity + SampledPositionProperty 沿时间轴运动' },
  { name: '相机动画', desc: 'flyTo / lookAt / setView 相机飞行与视角控制' },
  { name: '路径动画', desc: 'PathGraphics 尾迹展示与 leadTime / trailTime' },
  { name: '材质动画', desc: 'ColorMaterialProperty 动态颜色与闪烁效果' },
];
</script>

<template>
  <section class="page page-demo">
    <header class="demo-head">
      <p class="eyebrow">TEST PAGE 01</p>
      <h1>测试页面一</h1>
      <p class="desc">用于验证路由与布局的占位页面，可在此扩展第一个 Cesium 动画示例。</p>
    </header>
    <div class="demo-clock">{{ now.toLocaleTimeString('zh-CN', { hour12: false }) }}</div>
    <ul class="demo-list">
      <li v-for="item in items" :key="item.name">
        <strong>{{ item.name }}</strong>
        <span>{{ item.desc }}</span>
      </li>
    </ul>
  </section>
</template>
