<style lang="scss" scoped src="./index.scss"></style>

<template>
  <article class="jk-car">
    <canvas class="car"></canvas>
  </article>
</template>
<script setup lang="ts">
import { JkCar } from "./hooks/Car";

onMounted(() => {
  new JkCar(".car");
});
</script>
