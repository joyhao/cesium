<script setup lang="ts">
const mapRef = ref<HTMLDivElement>()
const viewerReady = ref(false)
const isPlaying = ref(true)
const timeLabel = ref('--:--:--')
let viewer: InstanceType<typeof Viewer> | undefined
let stopClock: (() => void) | undefined

const route = [
  [116.4074, 39.9042],
  [121.4737, 31.2304],
  [114.0579, 22.5431],
  [113.2644, 23.1291],
]

function flyHome() {
  viewer?.camera.flyTo({
    destination: Cartesian3.fromDegrees(111.5, 31.5, 4_100_000),
    duration: 1.4,
  })
}

function toggleAnimation() {
  if (!viewer) return
  viewer.clock.shouldAnimate = !viewer.clock.shouldAnimate
  isPlaying.value = viewer.clock.shouldAnimate
}

function resetAnimation() {
  if (!viewer) return
  viewer.clock.currentTime = JulianDate.clone(viewer.clock.startTime)
  viewer.clock.shouldAnimate = true
  isPlaying.value = true
}

onMounted(async () => {
  if (!mapRef.value) return
  const baseLayer = ImageryLayer.fromProviderAsync(
    Promise.resolve(new OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' })),
  )

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
    baseLayer,
  })

  const start = JulianDate.now()
  const stop = JulianDate.addSeconds(start, 48, new JulianDate())
  const position = new SampledPositionProperty()
  route.forEach(([longitude, latitude], index) => {
    const time = JulianDate.addSeconds(start, index * 16, new JulianDate())
    position.addSample(time, Cartesian3.fromDegrees(longitude, latitude, 250_000))
  })

  viewer.clock.startTime = JulianDate.clone(start)
  viewer.clock.stopTime = JulianDate.clone(stop)
  viewer.clock.currentTime = JulianDate.clone(start)
  viewer.clock.clockRange = ClockRange.LOOP_STOP
  viewer.clock.multiplier = 8
  viewer.clock.shouldAnimate = true

  viewer.entities.add({
    name: '演示航线',
    polyline: {
      positions: Cartesian3.fromDegreesArray(route.flat()),
      width: 4,
      material: Color.fromCssColorString('#33d6ff'),
      clampToGround: false,
    },
  })
  viewer.entities.add({
    name: '运动目标',
    position,
    point: {
      pixelSize: 14,
      color: Color.fromCssColorString('#f9c74f'),
      outlineColor: Color.WHITE,
      outlineWidth: 2,
    },
    path: {
      resolution: 1,
      material: Color.fromCssColorString('#f9c74f').withAlpha(0.7),
      width: 2,
      leadTime: 0,
      trailTime: 12,
    },
  })

  stopClock = viewer.clock.onTick.addEventListener((clock) => {
    timeLabel.value = JulianDate.toDate(clock.currentTime).toLocaleTimeString('zh-CN', { hour12: false })
  })
  flyHome()
  viewerReady.value = true
})

onBeforeUnmount(() => {
  stopClock?.()
  viewer?.destroy()
})
</script>

<template>
  <main class="app-shell">
    <div ref="mapRef" class="map" />
    <header class="topbar">
      <div class="brand"><span class="brand-mark">◈</span><span>CESIUM</span><small>ANIMATION LAB</small></div>
      <div class="status"><i /> 实时演示 <span>{{ timeLabel }}</span></div>
    </header>
    <section class="panel">
      <p class="eyebrow">ANIMATION COLLECTION</p>
      <h1>地球动画实验室</h1>
      <p class="description">在 Vue 3 + TypeScript 中探索 Cesium 的时间轴、路径与相机动画。</p>
      <div class="actions">
        <button class="primary" :disabled="!viewerReady" @click="toggleAnimation">{{ isPlaying ? '暂停航线' : '继续航线' }}</button>
        <button :disabled="!viewerReady" @click="resetAnimation">重置</button>
        <button :disabled="!viewerReady" @click="flyHome">回到全局</button>
      </div>
      <div class="route-card"><span>当前示例</span><strong>北京 → 上海 → 深圳 → 广州</strong><em>48 秒循环</em></div>
    </section>
    <footer>VUE 3 · TYPESCRIPT · VITE · CESIUM</footer>
  </main>
</template>
