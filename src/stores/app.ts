import { defineStore } from "pinia";

/** 全局应用状态：当前页面标题、主题、菜单折叠等 */
export const useAppStore = defineStore("app", {
  state: () => ({
    /** 当前路由标题（由 router.afterEach 同步） */
    currentTitle: "",
    /** 侧边栏折叠 */
    sidebarCollapsed: false,
  }),
  getters: {
    sidebarWidth: (state) => (state.sidebarCollapsed ? "64px" : "216px"),
  },
  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },
  },
});
