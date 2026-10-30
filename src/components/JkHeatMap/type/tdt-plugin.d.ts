declare module "tdt-terrain-cesium-plugin" {
  import type { Viewer } from "cesium";

  interface GeoWTFSOptions {
    url: string;
    icoUrl: string;
    subdomains: string[];
    metadata: {
      boundBox: { minX: number; minY: number; maxX: number; maxY: number };
      minLevel: number;
      maxLevel: number;
    };
    aotuCollide: boolean;
    collisionPadding: number[];
    serverFirstStyle: boolean;
  }

  class GeoWTFS {
    constructor(viewer: Viewer, options: GeoWTFSOptions);
    activate(): void;
    destroy(): void;
  }

  const plugin: { GeoWTFS: typeof GeoWTFS };
  export default plugin;
}
