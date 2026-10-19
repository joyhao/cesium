import { JkBase } from "./base";
import { JkPath } from "./path";

// 复数路径管理：统一创建、查询、清理多条路径。
export class JkPaths extends JkBase {
  private paths: JkPath[] = [];

}
