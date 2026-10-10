import { JkCarBase } from "./base";
import { loadModel } from "@/utils/utils";
import * as THREE from "three";
import vert from "../shaders/vert.glsl";
import frag from "../shaders/frag.glsl";

/** Fresnel 边缘光参数。 */

export class JkCar extends JkCarBase {
  /** 外壳材质引用，用于每帧更新动画时间 uniform。 */
  private rimMaterial?: THREE.ShaderMaterial;

  constructor(selector: string) {
    super(selector);
    this.init();
  }

  async init() {
    const model = await loadModel("/glb/car.glb", this.scene, 4);
    this.modelMaterial(model);
  }

  /**
   * 每帧回调：推进 shader 动画时间。
   */
  protected update(delta: number): void {
    if (this.rimMaterial) this.rimMaterial.uniforms.uTime.value += delta;
  }

  /**
   * 给模型套一层外壳，同一个 ShaderMaterial 同时叠加渐变底色与 Fresnel 边缘光。
   * 用 MultiplyBlending 把白模染成渐变色，并保留原 PBR/HDR 光照与阴影。
   * GLSL 源码见 shaders/vert.glsl / frag.glsl。
   * @param object 模型对象
   */
  modelMaterial(object: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(object);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        // Fresnel 边缘光颜色（青蓝）
        uRimColor: { value: new THREE.Color(0x4ea1ff) },
        // 边缘集中度：越大边缘光越细
        uRimPower: { value: 3.0 },
        // 边缘光强度
        uRimStrength: { value: 1.2 },
        // 渐变底部颜色（深蓝）
        uColorBottom: { value: new THREE.Color(0x123a5e) },
        // 渐变顶部颜色（青蓝）
        uColorTop: { value: new THREE.Color(0x4ea1ff) },
        // 渐变归一化范围：模型世界包围盒的上下边界 Y
        uMinY: { value: box.min.y },
        uMaxY: { value: box.max.y },
        // 车长轴：取水平方向（X/Z）中较长者作为车长，沿它做车头→车尾扫描
        uUseX: { value: box.max.x - box.min.x >= box.max.z - box.min.z ? 1.0 : 0.0 },
        uMinLen: { value: box.max.x - box.min.x >= box.max.z - box.min.z ? box.min.x : box.min.z },
        uMaxLen: { value: box.max.x - box.min.x >= box.max.z - box.min.z ? box.max.x : box.max.z },
        // 动画时间（秒），每帧累加
        uTime: { value: 0 },
      },
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      blending: THREE.MultiplyBlending,
      premultipliedAlpha: true,
      depthWrite: false,
    });
    this.rimMaterial = material;

    // 先收集所有网格（遍历中不要直接 add，否则会递归访问新加的外壳导致栈溢出）
    const meshes: THREE.Mesh[] = [];
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) meshes.push(mesh);
    });

    // 给每个网格套一层同几何体的外壳
    meshes.forEach((mesh) => {
      const shell = new THREE.Mesh(mesh.geometry, material);
      mesh.add(shell);
    });
  }
}
