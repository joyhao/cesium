import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./assets/css/styles.css";
import "cesium/Build/Cesium/Widgets/widgets.css";

window.CESIUM_BASE_URL = "/cesium";

createApp(App).use(createPinia()).use(router).mount("#app");
