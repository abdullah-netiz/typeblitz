import { type HeatmapAnalytics, type SluggishPair, getFingerForChar } from './heatmapUtils';

export class CadenceTracker {
  private keyStats: Record<string, { typed: number; errors: number }> = {};
  private transitions: Record<string, number[]> = {};
  private fingerErrors: Record<string, number> = {};
  private intervals: number[] = [];
  private keystrokeTimestamps: number[] = [];
  private lastChar: string | null = null;
  private lastCharTime: number | null = null;

  public reset() {
    this.keyStats = {};
    this.transitions = {};
    this.fingerErrors = {};
    this.intervals = [];
    this.keystrokeTimestamps = [];
    this.lastChar = null;
    this.lastCharTime = null;
  }

  public recordKeystroke(char: string, isError: boolean, timestamp: number = Date.now()) {
    const key = char === ' ' ? 'space' : char.toLowerCase();
    this.keystrokeTimestamps.push(timestamp);

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

    // 2. Transition latency & cadence interval
    if (this.lastChar !== null && this.lastCharTime !== null) {
      const dt = timestamp - this.lastCharTime;
      // Filter out long pauses (> 2000ms) for transition cadence
      if (dt > 10 && dt < 2000) {
        this.intervals.push(dt);
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

  /**
   * Consistency calculation following Monkeytype's statistical algorithm:
   * 1. Samples raw keystrokes into 1-second time slices across the test.
   * 2. Calculates per-second raw WPM.
   * 3. Calculates the Mean (avg) and Standard Deviation (sigma).
   * 4. Computes the Coefficient of Variation (CoV = sigma / mean).
   * 5. Maps to a 0–100% scale: (1 - CoV) * 100.
   */
  public getConsistency(testStartTime?: number, testEndTime?: number): number {
    if (this.keystrokeTimestamps.length < 4) return 100;

    const start = testStartTime ?? this.keystrokeTimestamps[0];
    const end = testEndTime ?? this.keystrokeTimestamps[this.keystrokeTimestamps.length - 1];
    const durationMs = Math.max(1000, end - start);

    // Group into 1-second buckets (or 500ms if test duration is under 2 seconds)
    const totalSeconds = Math.max(1, Math.floor(durationMs / 1000));
    const bucketInterval = totalSeconds >= 2 ? 1000 : 500;
    const bucketCount = Math.max(2, Math.floor(durationMs / bucketInterval));

    const bucketCounts: number[] = new Array(bucketCount).fill(0);

    for (const t of this.keystrokeTimestamps) {
      const offset = t - start;
      if (offset >= 0 && offset < durationMs) {
        const idx = Math.min(bucketCount - 1, Math.floor(offset / bucketInterval));
        bucketCounts[idx]++;
      }
    }

    // Convert raw keystrokes in bucket to per-minute speed (raw WPM): (chars / 5) * (60000 / interval)
    const rawWpms = bucketCounts.map((count) => (count / 5) * (60000 / bucketInterval));

    // Calculate mean raw WPM
    const mean = rawWpms.reduce((a, b) => a + b, 0) / rawWpms.length;
    if (mean <= 0) return 100;

    // Calculate sample standard deviation
    const variance = rawWpms.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / rawWpms.length;
    const stdDev = Math.sqrt(variance);

    // Monkeytype Coefficient of Variation (CoV)
    const cov = stdDev / mean;

    // Map to percentage: standard steady typists score 75–95%, erratic stops lower score
    const consistency = Math.round(Math.max(0, Math.min(100, (1 - cov) * 100)));
    return consistency;
  }

  public getAnalytics(): HeatmapAnalytics {
    const rawPairs: { pair: string; avgTimeMs: number }[] = [];
    let totalTime = 0;
    let totalCount = 0;

    for (const [pair, times] of Object.entries(this.transitions)) {
      if (times.length >= 1 && pair.trim().length >= 2) {
        const sum = times.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / times.length);
        totalTime += sum;
        totalCount += times.length;
        rawPairs.push({ pair, avgTimeMs: avg });
      }
    }

    const baselineAvg = totalCount > 0 ? Math.round(totalTime / totalCount) : 180;

    // Sort descending by slowest transition
    rawPairs.sort((a, b) => b.avgTimeMs - a.avgTimeMs);

    const sluggishPairs: SluggishPair[] = rawPairs.map((p) => {
      const factor = baselineAvg > 0 ? Number((p.avgTimeMs / baselineAvg).toFixed(1)) : 1.0;
      let description = 'Slight pause';
      if (factor >= 2.5 || p.avgTimeMs >= 500) {
        description = 'Noticeable pause';
      } else if (factor >= 1.8 || p.avgTimeMs >= 350) {
        description = 'Hesitation';
      } else if (factor >= 1.3) {
        description = 'Slight pause';
      } else {
        description = 'Minor delay';
      }

      return {
        pair: p.pair,
        avgTimeMs: p.avgTimeMs,
        slowdownFactor: factor,
        description,
      };
    });

    return {
      keyStats: { ...this.keyStats },
      sluggishPairs,
      fingerErrors: { ...this.fingerErrors },
      averageTransitionMs: baselineAvg,
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
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.wpm === 'number' && parsed.wpm > 0 && parsed.wpm <= 300) {
        return parsed;
      }
      localStorage.removeItem(`typeblitz_pb_${mode}_${duration}`);
    }
    const generic = localStorage.getItem('typeblitz_pb_words_30');
    if (generic) {
      const parsed = JSON.parse(generic);
      if (parsed && typeof parsed.wpm === 'number' && parsed.wpm > 0 && parsed.wpm <= 300) {
        return parsed;
      }
      localStorage.removeItem('typeblitz_pb_words_30');
    }
  } catch {
    // ignore
  }
  return null;
}

export function savePersonalBest(pb: PBRun): boolean {
  if (pb.wpm <= 0 || pb.wpm > 300) return false;
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
