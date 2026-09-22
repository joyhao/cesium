export interface PointPosition {
  id: number;
  longitude: number;
  latitude: number;
  height: number;
}

export interface AppConfig {
  token: string;
  vector: string;
  cia: string;
  subdomains: string[];
  city: {
    longitude: number;
    latitude: number;
    height: number;
  };
}

export interface CameraChangeDetail {
  height: number;
  level: number;
}

export interface PointsChangeDetail {
  loaded: number;
  total: number;
}

export interface CesiumInfo {
  fps: number;
}
