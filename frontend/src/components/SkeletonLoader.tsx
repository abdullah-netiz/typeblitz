import React from 'react';
import './SkeletonLoader.css';

export function SkeletonBox({
  width,
  height,
  borderRadius,
  className = '',
  style = {},
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`skeleton-box ${className}`}
      style={{
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
        ...(borderRadius !== undefined ? { borderRadius } : {}),
        ...style,
      }}
    />
  );
}

export function ServerWakeupNotice({
  message = "Connecting to backend on Render (free tier cold start can take ~20–30s)...",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="server-wakeup-banner fade-in">
      <div className="server-wakeup-banner-content">
        <span className="server-pulse-dot" />
        <div>
          <div className="server-wakeup-title">{message}</div>
          <div className="server-wakeup-hint">Thanks for your patience — data will appear automatically once connected.</div>
        </div>
      </div>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry} title="Retry connection">
          Retry
        </button>
      )}
    </div>
  );
}

export function LeaderboardSkeleton({
  rowCount = 8,
  isWakingUp = false,
  onRetry,
}: {
  rowCount?: number;
  isWakingUp?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="lb-skeleton-wrapper fade-in">
      {isWakingUp && <ServerWakeupNotice onRetry={onRetry} />}
      <div className="lb-table-wrapper">
        <div className="leaderboard-table">
          <div className="leaderboard-row leaderboard-row-header">
            <span className="lb-rank">#</span>
            <span className="lb-name">Typist</span>
            <span className="lb-wpm">Peak WPM</span>
            <span className="lb-acc">Accuracy</span>
            <span className="lb-tests">Tests</span>
          </div>
          {Array.from({ length: rowCount }).map((_, idx) => (
            <div key={idx} className="leaderboard-row skeleton-row">
              <span className="lb-rank">
                <SkeletonBox className="skeleton-rank" />
              </span>
              <span className="lb-name">
                <SkeletonBox className="skeleton-avatar" />
                <SkeletonBox
                  className="skeleton-text"
                  width={`${75 + (idx % 4) * 25}px`}
                />
              </span>
              <span className="lb-wpm">
                <SkeletonBox className="skeleton-text skeleton-num" width="46px" />
              </span>
              <span className="lb-acc">
                <SkeletonBox className="skeleton-text skeleton-num" width="38px" />
              </span>
              <span className="lb-tests">
                <SkeletonBox className="skeleton-text skeleton-num" width="28px" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RecentScoresSkeleton({
  rowCount = 6,
  isWakingUp = false,
  onRetry,
}: {
  rowCount?: number;
  isWakingUp?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="recent-scores-skeleton-wrapper fade-in">
      {isWakingUp && <ServerWakeupNotice onRetry={onRetry} />}
      <div className="account-table-wrapper">
        <table className="stats-table skeleton-table">
          <thead>
            <tr>
              <th>WPM</th>
              <th>ACCURACY</th>
              <th>WORDS</th>
              <th>DATE</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, idx) => (
              <tr key={idx} className="skeleton-tr">
                <td>
                  <SkeletonBox className="skeleton-text skeleton-num" width="48px" height="1.15rem" />
                </td>
                <td>
                  <SkeletonBox className="skeleton-text skeleton-num" width="40px" />
                </td>
                <td>
                  <SkeletonBox className="skeleton-text skeleton-num" width="30px" />
                </td>
                <td>
                  <SkeletonBox className="skeleton-text" width={`${110 + (idx % 3) * 15}px`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
