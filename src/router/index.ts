import { useAppStore } from "../stores/app";
import { routes } from "./routes";

const router = createRouter({
  history: createWebHistory(),
  routes: routes,
});

router.afterEach((to) => {
  document.title = `${to.meta.title ?? "页面"} · Cesium 动画集合测试`;
  // 同步当前标题到全局状态
  useAppStore().currentTitle = (to.meta.title as string) ?? "";
});

export default router;
