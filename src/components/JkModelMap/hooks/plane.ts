import { JkBase } from "./base";
import { JkPaths } from "./paths";
import { JkCars } from "./cars";

export class JkPlane extends JkBase {
  readonly paths: JkPaths;
  readonly cars: JkCars;

  constructor() {
    super();
    this.paths = new JkPaths();
    this.cars = new JkCars();
    this.on("model_paths_change", ({ detail }) => {
      this.cars.sync(detail.paths, false);
      detail.paths.forEach((path) => this.paths.setPathVisible(path.id, !this.cars.hasPath(path.id)));
    });
    this.on("model_paths_loaded", ({ detail }) => {
      const firstPath = detail.paths[0];
      this.cars.sync(firstPath ? [firstPath] : []);
      detail.paths.forEach((path) => this.paths.setPathVisible(path.id, !this.cars.hasPath(path.id)));
    });
    this.on("model_position_pick", ({ detail }) => {
      this.paths.addPosition(detail.position);
    });
    this.on("model_path_end", () => {
      this.paths.endPath();
    });
  }

  destroy() {
    this.offAllListeners();
    this.cars.destroy();
    this.paths.destroy();
  }
}
