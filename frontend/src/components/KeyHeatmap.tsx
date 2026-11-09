import { memo } from 'react';
import { type HeatmapAnalytics, getKeyStyleClass, getKeyTextStyleClass } from '../utils/heatmapUtils';

export type { HeatmapAnalytics };

interface KeyHeatmapProps {
  analytics: HeatmapAnalytics;
}

// QWERTY keyboard layout rows
const KEYBOARD_ROWS = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  ['space']
];

// Row X offsets mathematically centered in 600px viewBox
const ROW_OFFSETS = [17, 39, 61, 83, 140];

const KeyHeatmap = memo(({ analytics }: KeyHeatmapProps) => {
  const { keyStats, sluggishPairs, fingerErrors } = analytics;
  const totalErrors = Object.values(fingerErrors).reduce((a, b) => a + b, 0);

  return (
    <div className="heatmap-container fade-in">
      <div className="heatmap-header">
        <h3>Key Burst Heatmap & Accuracy</h3>
        <p>Post-test ergonomic analysis matched to your active theme</p>
      </div>

      <div className="keyboard-svg-wrapper">
        <svg viewBox="0 0 600 226" className="keyboard-svg" preserveAspectRatio="xMidYMid meet">
          {KEYBOARD_ROWS.map((row, rIdx) => {
            let xOffset = ROW_OFFSETS[rIdx];
            const y = 12 + rIdx * 42;

            return row.map((key) => {
              const stats = keyStats[key];
              const isSpace = key === 'space';
              const width = isSpace ? 320 : 38;
              const height = 34;
              const currentX = xOffset;
              xOffset += width + 6;

              const rectClass = getKeyStyleClass(stats);
              const textClass = getKeyTextStyleClass(stats);

              return (
                <g key={key} className="key-group">
                  <rect
                    x={currentX}
                    y={y}
                    width={width}
                    height={height}
                    rx={6}
                    className={rectClass}
                  />
                  <text
                    x={currentX + width / 2}
                    y={y + height / 2 + 5}
                    textAnchor="middle"
                    className={textClass}
                    fontSize={isSpace ? 11 : 13}
                    fontFamily="var(--font-mono)"
                    fontWeight="600"
                  >
                    {isSpace ? 'SPACE' : key.toUpperCase()}
                  </text>
                  {stats && stats.errors > 0 && (
                    <text
                      x={currentX + width - 5}
                      y={y + 11}
                      textAnchor="end"
                      fill="var(--error-color)"
                      fontSize="9"
                      fontWeight="700"
                    >
                      {stats.errors}
                    </text>
                  )}
                </g>
              );
            });
          })}
        </svg>
      </div>

      <div className="analytics-grid">
        {/* Slowest Key Transitions */}
        <div className="analytics-card">
          <div className="card-header-group">
            <h4>Slowest Key Combinations</h4>
            <span className="card-subtitle">Where your fingers paused the longest before typing the next letter</span>
          </div>
          {sluggishPairs.length === 0 ? (
            <div className="empty-hint">Smooth cadence across all keys. No notable hesitation detected!</div>
          ) : (
            <div className="sluggish-list">
              {sluggishPairs.slice(0, 4).map((p, idx) => (
                <div key={idx} className="sluggish-item">
                  <div className="pair-info">
                    <span className="pair-badge">"{p.pair}"</span>
                    <span className="pair-desc">{p.description}</span>
                  </div>
                  <span className="pair-latency">
                    {p.slowdownFactor > 1.1 ? `${p.slowdownFactor}x slower` : 'Slight delay'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Finger Error Distribution */}
        <div className="analytics-card">
          <div className="card-header-group">
            <h4>Finger Error Distribution</h4>
            <span className="card-subtitle">Breakdown of misstrikes per typing finger</span>
          </div>
          {totalErrors === 0 ? (
            <div className="empty-hint">100% clean typing! Zero finger misstrikes.</div>
          ) : (
            <div className="finger-list">
              {Object.entries(fingerErrors)
                .filter(([, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([finger, count]) => (
                  <div key={finger} className="finger-item">
                    <span className="finger-name">{finger}</span>
                    <div className="finger-bar-wrapper">
                      <div
                        className="finger-bar-fill"
                        style={{ width: `${Math.min(100, Math.round((count / totalErrors) * 100))}%` }}
                      />
                    </div>
                    <span className="finger-count">{count} err</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

KeyHeatmap.displayName = 'KeyHeatmap';

export default KeyHeatmap;
