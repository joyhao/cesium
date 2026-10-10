import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { query, setCameraAzimuth } from "@/utils/utils";

export class JkCarBase {
  protected canvas!: HTMLElement;
  protected parent: HTMLElement;

  protected renderer: THREE.WebGLRenderer;
  protected scene: THREE.Scene;
  protected camera: THREE.PerspectiveCamera;
  protected controls: OrbitControls;
  protected stats: Stats;
  protected camInfo!: HTMLElement;
  protected clock = new THREE.Clock();
  protected frameId = 0;
  width: number;
  height: number;

  constructor(selector?: string) {
    if (selector) {
      this.canvas = query(selector);
    }
    this.parent = this.canvas.parentElement as HTMLElement;
    this.width = this.parent.clientWidth;
    this.height = this.parent.clientHeight;

    // 场景与背景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f1420);

    // 相机
    this.camera = new THREE.PerspectiveCamera(
      50,
      this.width / this.height,
      0.1,
      1000,
    );
    this.camera.position.set(6, 4, 6);
    this.camera.lookAt(0, 0, 0);

    // 渲染器
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 鼠标交互
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.5, 0);

    // 默认视角方位角 -90°
    setCameraAzimuth(this.camera, this.controls.target, 270);
    this.controls.update();

    // 灯光
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    // 坐标轴：红=X 绿=Y 蓝=Z
    this.scene.add(new THREE.AxesHelper(5));

    // 网格地面：略低于 y=0，避免与坐标轴 X/Z 线共面产生 z-fighting 闪烁
    const grid = new THREE.GridHelper(20, 20, 0x4a90d9, 0x2a3344);
    grid.position.y = -0.01;
    this.scene.add(grid);

    // FPS 面板：用 class 控制样式，清掉库自带的内联 position 以免覆盖 class
    this.stats = new Stats();
    this.stats.dom.classList.add("jk-fps");
    this.parent.appendChild(this.stats.dom);

    // 摄像机旋转角度信息
    this.camInfo = document.createElement("div");
    this.camInfo.className = "jk-cam-info";
    this.parent.appendChild(this.camInfo);

    window.addEventListener("resize", this.onResize);
    this.animate();
  }

  protected onResize = () => {
    this.width = this.parent.clientWidth;
    this.height = this.parent.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  };

  protected animate = () => {
    this.frameId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    this.update(delta);
    this.controls.update();
    this.stats.update();

    // 实时更新旋转角度：方位角(绕Y)
    const azimuth = THREE.MathUtils.radToDeg(this.controls.getAzimuthalAngle());
    this.camInfo.textContent = `方位角 ${azimuth.toFixed(1)}°`;

    this.renderer.render(this.scene, this.camera);
  };

  /** 每帧回调，子类可重写以更新动画。 */
  protected update(_delta: number): void {}

  /** 销毁资源，组件卸载时调用。 */
  public dispose(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener("resize", this.onResize);
    this.controls.dispose();
    this.stats.dom.remove();
    this.camInfo.remove();
    this.renderer.dispose();
  }
}
