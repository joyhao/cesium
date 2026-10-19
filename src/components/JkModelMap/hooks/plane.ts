import { JkBase } from "./base";
import { JkPaths } from "./paths";

export class JkPlane extends JkBase {
  readonly paths: JkPaths;

  constructor() {
    super();
    this.paths = new JkPaths();
    this.on("model_position_pick", ({ detail }) => {
      this.paths.addPosition(detail.position);
    });
    this.on("model_path_end", () => {
      this.paths.endPath();
    });
  }

  destroy() {
    this.offAllListeners();
    this.paths.destroy();
  }
}
