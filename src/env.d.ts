/// <reference types="vite/client" />

interface AppConfig {
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

interface Window {
  CESIUM_BASE_URL: string;
  AppConfig: AppConfig;
}
