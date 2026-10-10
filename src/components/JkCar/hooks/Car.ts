import { JkCarBase } from "./base";
import { loadModel } from "@/utils/utils";
import * as THREE from "three";
import vert from "../shaders/vert.glsl";
import frag from "../shaders/frag.glsl";

/** Fresnel 边缘光参数。 */

export class JkCar extends JkCarBase {
  constructor(selector: string) {
    super(selector);
    this.init();
  }

  async init() {
    const model = await loadModel("/glb/car.glb", this.scene, 4);
    this.modelMaterial(model);
  }

  modelMaterial(object: THREE.Object3D): void {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uRimColor: { value: new THREE.Color(0x4ea1ff) },
        uRimPower: { value: 3.0 },
        uRimStrength: { value: 1.2 },
      },
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // 先收集所有网格（遍历中不要直接 add，否则会递归访问新加的外壳导致栈溢出）
    const meshes: THREE.Mesh[] = [];
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) meshes.push(mesh);
    });

    // 给每个网格套一层同几何体的外壳，作为发光层
    meshes.forEach((mesh) => {
      const shell = new THREE.Mesh(mesh.geometry, material);
      mesh.add(shell);
    });
  }
}
