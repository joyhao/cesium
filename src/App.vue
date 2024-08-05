<template>
  <section id="cesiumContainer"></section>
  <section class="shape" v-for="(item, index) in addressList" :id="item.name">
    <div class="line"></div>

    <button
      class="btn"
      :style="{
        '--pitch': `${90 + cPitch}deg`,
      }"
    >
      <i
        v-for="c in 5"
        :style="{
          '--c': c,
        }"
      ></i>
    </button>

    {{ item.degrees }}
  </section>
</template>
<script setup lang="ts">
import { useCesiumMain } from "./hooks/cesiumMain";
import { address } from "./hooks/entity";
const addressList = reactive(address);
let cPitch = ref(0);
onMounted(() => {
  const { callback } = useCesiumMain("cesiumContainer");

  callback.cameraChanged = (pitch, heading) => {
    cPitch.value = pitch;
  };
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html,
body {
  overflow: hidden;
}
#app {
  max-width: 100%;
  margin: 0 auto;
  padding: 0;
  text-align: center;
  overflow: hidden;
  perspective: 500px;
}

.cesium-viewer-bottom {
  display: none;
}

.shape {
  position: absolute;
  left: 0;
  top: 0;
  color: #fff;
  text-shadow: 0 0 8px rgba(0, 0, 0, 0.75);
  pointer-events: none;
  transform-style: preserve-3d;
  .btn {
    position: relative;
    width: 25px;
    height: 25px;
    border-radius: 50%;
    padding: 0;
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.75);
    pointer-events: all;
    transform: rotateX(var(--pitch));
    i {
      width: 100%;
      height: 100%;
      position: absolute;
      border: 1px solid #fff;
      scale: 1;
      border-radius: 50%;
      display: block;
      animation: scale1 5s calc(var(--c) * 1s) linear infinite forwards;
      left: 0;
      top: 0;
      pointer-events: none;
    }
  }
}

@keyframes scale1 {
  0% {
    scale: 1;
    opacity: 1;
  }
  100% {
    scale: 5;
    opacity: 0;
  }
}
</style>
<style scoped>
#cesiumContainer {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
