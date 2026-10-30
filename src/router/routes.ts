// 路由表同时作为侧边栏菜单的数据源，避免重复维护页面菜单。
export const routes = [
  {
    path: "/",
    redirect: "/heat-map",
    meta: { hidden: true },
  },
  {
    path: "/three-car",
    name: "threeCar",
    component: () => import("../views/ThreeCar/ThreeCar.vue"),
    meta: { title: "ThreeCar", icon: "🚗" },
  },
  {
    path: "/map",
    name: "map",
    component: () => import("../views/MapView/MapView.vue"),
    meta: { title: "地图演示", icon: "◉" },
  },
  {
    path: "/heat-map",
    name: "heatMap",
    component: () => import("../views/HeatMap/HeatMap.vue"),
    meta: { title: "立体热力图", icon: "◉" },
  },
  {
    path: "/model-map",
    name: "modelMap",
    component: () => import("../views/ModelMap/ModelMap.vue"),
    meta: { title: "模型地图", icon: "◉" },
  },
  {
    path: "/demo-one",
    name: "demoOne",
    component: () => import("../views/DemoOne.vue"),
    meta: { title: "测试页面一", icon: "①" },
  },
  {
    path: "/demo-two",
    name: "demoTwo",
    component: () => import("../views/DemoTwo.vue"),
    meta: { title: "测试页面二", icon: "②" },
  },
];

// 菜单直接由路由表生成：meta.hidden 跳过重定向等辅助路由，meta.title 为菜单文案
export const menus = routes
  .filter((route) => !route.meta?.hidden && !route.redirect)
  .map((route) => ({
    to: route.path,
    icon: (route.meta?.icon as string) ?? "·",
    label: (route.meta?.title as string) ?? route.name ?? route.path,
  }));
