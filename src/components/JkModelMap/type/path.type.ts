export interface PathVertex {
  lon: number;
  lat: number;
  height: number;
}

export interface PathData {
  id: number;
  label: string;
  points: PathVertex[];
}
