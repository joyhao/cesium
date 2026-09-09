import { createApp } from "vue";
import App from "./App.vue";
import "@css/styles.css";
import "cesium/Build/Cesium/Widgets/widgets.css";

window.CESIUM_BASE_URL = "/cesium";

createApp(App).mount("#app");
