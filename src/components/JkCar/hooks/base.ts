import { query } from "@/utils/utils";

export class JkCarBase {
  static canvas: HTMLElement;
  constructor(selector?: string) {
    if (selector) {
      JkCarBase.canvas = query(selector);
    }
  }
}
