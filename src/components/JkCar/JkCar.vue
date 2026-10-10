<template>
  <article class="jk-car">
    <canvas ref="car"></canvas>
  </article>
</template>
<script setup lang="ts">
import { JkCar } from "./hooks/Car";

onMounted(() => {
  new JkCar();
});
</script>
