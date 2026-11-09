export interface KeyStats {
  typed: number;
  errors: number;
}

export interface SluggishPair {
  pair: string;
  avgTimeMs: number;
  slowdownFactor: number;
  description: string;
}

export interface HeatmapAnalytics {
  keyStats: Record<string, KeyStats>;
  sluggishPairs: SluggishPair[];
  fingerErrors: Record<string, number>;
  averageTransitionMs: number;
}

export function getKeyStyleClass(stats?: KeyStats): string {
  if (!stats || stats.typed === 0) return 'key-rect-untyped';
  const errorRate = stats.errors / stats.typed;
  if (errorRate === 0) return 'key-rect-clean';
  if (errorRate <= 0.15) return 'key-rect-slight-err';
  return 'key-rect-high-err';
}

export function getKeyTextStyleClass(stats?: KeyStats): string {
  if (!stats || stats.typed === 0) return 'key-text-untyped';
  if (stats.errors > 0) return 'key-text-err';
  return 'key-text-clean';
}

export function getFingerForChar(char: string): string {
  const c = char.toLowerCase();
  if (['1', 'q', 'a', 'z'].includes(c)) return 'Left Pinky';
  if (['2', 'w', 's', 'x'].includes(c)) return 'Left Ring';
  if (['3', 'e', 'd', 'c'].includes(c)) return 'Left Middle';
  if (['4', '5', 'r', 't', 'f', 'g', 'v', 'b'].includes(c)) return 'Left Index';
  if ([' '].includes(c)) return 'Thumbs';
  if (['6', '7', 'y', 'u', 'h', 'j', 'n', 'm'].includes(c)) return 'Right Index';
  if (['8', 'i', 'k', ','].includes(c)) return 'Right Middle';
  if (['9', 'o', 'l', '.'].includes(c)) return 'Right Ring';
  return 'Right Pinky';
}
