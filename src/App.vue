<script setup lang="ts">
const mapRef = ref<HTMLDivElement>();
let viewer: InstanceType<typeof Viewer> | undefined;

onMounted(async () => {
  if (!mapRef.value) return;

  viewer = new Viewer(mapRef.value, {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
  });
});

onBeforeUnmount(() => {});
</script>

<template>
  <section ref="mapRef" class="map"></section>
</template>
