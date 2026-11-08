import { type HeatmapAnalytics, getFingerForChar } from './heatmapUtils';

export class CadenceTracker {
  private keyStats: Record<string, { typed: number; errors: number }> = {};
  private transitions: Record<string, number[]> = {};
  private fingerErrors: Record<string, number> = {};
  private lastChar: string | null = null;
  private lastCharTime: number | null = null;

  public reset() {
    this.keyStats = {};
    this.transitions = {};
    this.fingerErrors = {};
    this.lastChar = null;
    this.lastCharTime = null;
  }

  public recordKeystroke(char: string, isError: boolean, timestamp: number = Date.now()) {
    const key = char === ' ' ? 'space' : char.toLowerCase();

    // 1. Key stats
    if (!this.keyStats[key]) {
      this.keyStats[key] = { typed: 0, errors: 0 };
    }
    this.keyStats[key].typed++;
    if (isError) {
      this.keyStats[key].errors++;

      // Finger stats
      const finger = getFingerForChar(char);
      this.fingerErrors[finger] = (this.fingerErrors[finger] || 0) + 1;
    }

    // 2. Transition latency
    if (this.lastChar !== null && this.lastCharTime !== null) {
      const dt = timestamp - this.lastCharTime;
      // Filter out pauses > 1200ms
      if (dt > 10 && dt < 1200) {
        const pair = `${this.lastChar}${char}`.toLowerCase();
        if (!this.transitions[pair]) {
          this.transitions[pair] = [];
        }
        this.transitions[pair].push(dt);
      }
    }

    this.lastChar = char;
    this.lastCharTime = timestamp;
  }

  public getAnalytics(): HeatmapAnalytics {
    // Calculate sluggish transition pairs (min 2 occurrences or slowest pairs)
    const sluggishPairs: { pair: string; avgTimeMs: number }[] = [];

    for (const [pair, times] of Object.entries(this.transitions)) {
      if (times.length >= 1 && pair.trim().length >= 2) {
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        sluggishPairs.push({ pair, avgTimeMs: avg });
      }
    }

    // Sort descending by avgTimeMs
    sluggishPairs.sort((a, b) => b.avgTimeMs - a.avgTimeMs);

    return {
      keyStats: { ...this.keyStats },
      sluggishPairs,
      fingerErrors: { ...this.fingerErrors }
    };
  }
}

// Personal Best Storage Helper
export interface PBRun {
  wpm: number;
  accuracy: number;
  mode: string;
  duration: number;
  date: string;
}

export function getPersonalBest(duration: number, mode: string = 'words'): PBRun | null {
  try {
    const raw = localStorage.getItem(`typeblitz_pb_${mode}_${duration}`);
    if (raw) return JSON.parse(raw);
    // Fallback to generic PB
    const generic = localStorage.getItem('typeblitz_pb_words_30');
    if (generic) return JSON.parse(generic);
  } catch {
    // ignore
  }
  return null;
}

export function savePersonalBest(pb: PBRun): boolean {
  try {
    const current = getPersonalBest(pb.duration, pb.mode);
    if (!current || pb.wpm > current.wpm) {
      localStorage.setItem(`typeblitz_pb_${pb.mode}_${pb.duration}`, JSON.stringify(pb));
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
