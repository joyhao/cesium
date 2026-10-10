<style lang="scss" scoped src="./index.scss"></style>

<template>
  <article class="jk-car">
    <canvas class="car"></canvas>
  </article>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import { JkCar } from "./hooks/Car";

let car: JkCar | null = null;

onMounted(() => {
  car = new JkCar(".car");
});

onBeforeUnmount(() => {
  car?.dispose();
  car = null;
});
</script>
