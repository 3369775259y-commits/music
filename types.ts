export enum AppMode {
  JELLYFISH = 'JELLYFISH',
  SNOW = 'SNOW',
  RAIN = 'RAIN',
}

export interface HandData {
  x: number; // 0-1 (normalized screen coordinates - Centroid)
  y: number; // 0-1
  isPinching: boolean;
  pinchDistance: number; // 0-1 (approximate)
  isPresent: boolean;
  landmarks?: { x: number; y: number; z: number }[]; // Raw landmarks for skeleton
}

export interface SongData {
  title: string;
  artist: string;
  lrcString: string; // Raw LRC format string
  coverColor: string;
}

export interface LyricLine {
  time: number; // Time in seconds
  text: string;
}