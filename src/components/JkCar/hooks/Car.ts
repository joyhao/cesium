import { JkCarBase } from "./base";
import { loadModel } from "@/utils/utils";

export class JkCar extends JkCarBase {
  constructor(selector: string) {
    super(selector);
    loadModel("/glb/car.glb", this.scene).catch((error) => {
      console.error("加载 car.glb 失败:", error);
    });
  }
}
