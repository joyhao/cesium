import type { Cartesian3 } from "cesium";
import { JkBase } from "./base";
import { JkPath } from "./path";

export class JkPaths extends JkBase {
  private paths: JkPath[] = [];
  private activePath?: JkPath;

  createPath() {
    const path = new JkPath();
    this.paths.push(path);
    this.activePath = path;
    return path;
  }

  addPosition(position: Cartesian3) {
    const path = this.activePath ?? this.createPath();
    path.addPosition(position);
    return path;
  }

  endPath() {
    this.activePath = undefined;
  }

  undo() {
    const path = this.paths[this.paths.length - 1];
    if (!path || !path.undo()) return false;
    if (!path.pointCount) {
      if (this.activePath === path) this.activePath = undefined;
      this.paths.pop();
      path.destroy();
    }
    return true;
  }

  clear() {
    this.paths.forEach((path) => path.destroy());
    this.paths = [];
    this.activePath = undefined;
  }

  destroy() {
    this.offAllListeners();
    this.clear();
  }
}
