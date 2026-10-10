import { query } from "@/utils/utils";

export class JkCar {
  canvas: HTMLElement;
  constructor(selector: string) {
    this.canvas = query(selector);
  }
}
