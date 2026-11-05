/// <reference types="vite/client" />

declare module "*.glsl" {
  const value: string;
  export default value;
}

interface AppConfig {
  token: string;
  tilesetUrls: string[];
  cameraView: {
    heading: number;
    pitch: number;
  };

  heartMapCameraView: {
    longitude: number;
    latitude: number;
    height: number;
    level: number;
    heading: number;
    pitch: number;
    roll: number;
  };
  vector: string;
  cia: string;
  subdomains: string[];
  city: {
    longitude: number;
    latitude: number;
    height: number;
  };
}

interface Window {
  CESIUM_BASE_URL: string;
  AppConfig: AppConfig;
}
