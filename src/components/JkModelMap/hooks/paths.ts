import type { Cartesian3 } from "cesium";
import { JkBase } from "./base";
import { JkPath } from "./path";
import type { PathData } from "../type/path.type";

export class JkPaths extends JkBase {
  private paths: JkPath[] = [];
  private labels = new Map<number, string>();
  private activePath?: JkPath;
  private nextId = 1;
  private visible = true;

  setVisible(visible: boolean) {
    this.visible = visible;
    this.paths.forEach((path) => path.setVisible(visible));
  }

  setPathVisible(id: number, visible: boolean) {
    this.paths.find((path) => path.id === id)?.setVisible(this.visible && visible);
  }

  loadPaths(data: PathData[]) {
    const existing = new Map(this.paths.map((path) => [path.id, path]));
    const ids = new Set(data.map((path) => path.id));
    for (const path of this.paths) {
      if (ids.has(path.id)) continue;
      if (this.activePath === path) this.activePath = undefined;
      path.destroy();
    }
    this.labels.clear();
    this.paths = data.map((record) => {
      const path = existing.get(record.id) ?? new JkPath(record.id);
      path.setPoints(record.points);
      path.setVisible(this.visible);
      this.labels.set(record.id, record.label);
      this.nextId = Math.max(this.nextId, record.id + 1);
      return path;
    });
    this.emit("model_paths_loaded", { paths: this.getPaths() });
  }

  getPaths(): PathData[] {
    return this.paths.map((path) => ({
      id: path.id,
      label: this.labels.get(path.id) ?? `路径 ${path.id}`,
      points: path.getPoints(),
    }));
  }

  private notifyChange() {
    this.emit("model_paths_change", { paths: this.getPaths() });
  }

  createPath() {
    const path = new JkPath(this.nextId++);
    path.setVisible(this.visible);
    this.paths.push(path);
    this.labels.set(path.id, `路径 ${path.id}`);
    this.activePath = path;
    this.notifyChange();
    return path;
  }

  addPosition(position: Cartesian3) {
    const path = this.activePath ?? this.createPath();
    if (path.addPosition(position)) this.notifyChange();
    return path;
  }

  endPath() {
    this.activePath = undefined;
  }

  undo() {
    const path = [...this.paths].reverse().find((path) => path.pointCount > 0);
    if (!path || !path.undo()) return false;
    if (!path.pointCount) {
      if (this.activePath === path) this.activePath = undefined;
      this.paths = this.paths.filter((item) => item !== path);
      this.labels.delete(path.id);
      path.destroy();
    }
    this.notifyChange();
    return true;
  }

  clear() {
    this.releasePaths();
    this.notifyChange();
  }

  private releasePaths() {
    this.paths.forEach((path) => path.destroy());
    this.paths = [];
    this.labels.clear();
    this.activePath = undefined;
  }

  destroy() {
    this.offAllListeners();
    this.releasePaths();
  }
}
