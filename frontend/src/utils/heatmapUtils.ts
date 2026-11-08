export interface KeyStats {
  typed: number;
  errors: number;
}

export interface HeatmapAnalytics {
  keyStats: Record<string, KeyStats>;
  sluggishPairs: { pair: string; avgTimeMs: number }[];
  fingerErrors: Record<string, number>;
}

export function getKeyColor(stats?: KeyStats): string {
  if (!stats || stats.typed === 0) return 'rgba(255, 255, 255, 0.05)';
  const errorRate = stats.errors / stats.typed;
  if (errorRate === 0) return 'rgba(16, 185, 129, 0.35)'; // Crisp green
  if (errorRate < 0.1) return 'rgba(234, 179, 8, 0.45)';  // Amber yellow
  if (errorRate < 0.25) return 'rgba(249, 115, 22, 0.6)'; // Orange
  return 'rgba(244, 63, 94, 0.75)'; // Crimson rose
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
