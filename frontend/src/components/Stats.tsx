import { memo, type ReactNode } from 'react';

type StatsProps = {
  wpm: number;
  rawWpm?: number;
  accuracy: number;
  consistency?: number;
  visible: boolean;
  isFailed?: boolean;
};

interface BadgeConfig {
  label: string;
  color: string;
  icon: ReactNode;
}

function getBadge(wpm: number, accuracy: number, isFailed?: boolean): BadgeConfig | null {
  if (isFailed || wpm <= 0 || wpm > 300) return null;

  // Perfect accuracy badge takes priority if at least 40 WPM
  if (accuracy === 100 && wpm >= 40) {
    return {
      label: 'Flawless',
      color: '#38bdf8',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h12l4 6-10 12L2 9z" />
          <path d="M11 3 8 9l4 12 4-12-3-6" />
          <path d="M2 9h20" />
        </svg>
      )
    };
  }

  if (wpm >= 140) {
    return {
      label: 'Apex Typist',
      color: '#facc15',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    };
  }

  if (wpm >= 110) {
    return {
      label: 'Inferno',
      color: '#f97316',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      )
    };
  }

  if (wpm >= 85) {
    return {
      label: 'Speedster',
      color: '#a855f7',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    };
  }

  if (wpm >= 60) {
    return {
      label: 'Rapid',
      color: '#10b981',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      )
    };
  }

  if (wpm >= 40) {
    return {
      label: 'Steady',
      color: '#06b6d4',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )
    };
  }

  return null;
}

const Stats = memo(({ wpm, rawWpm, accuracy, consistency, visible, isFailed }: StatsProps) => {
  if (!visible) return null;

  const displayWpm = isFailed ? 0 : wpm;
  const displayRaw = isFailed ? 0 : (rawWpm ?? wpm);
  const badge = getBadge(displayWpm, accuracy, isFailed);

  return (
    <div className="stats-container visible fade-in">
      <div className="stat-item">
        <span className="stat-label">wpm</span>
        <span className="stat-value">{displayWpm}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">raw</span>
        <span className="stat-value">{displayRaw}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">acc</span>
        <span className="stat-value">{accuracy}%</span>
      </div>
      {consistency !== undefined && (
        <div className="stat-item">
          <span className="stat-label">consistency</span>
          <span className="stat-value">{isFailed ? 0 : consistency}%</span>
        </div>
      )}
      {badge && (
        <div className="stat-item badge-item fade-in">
          <span className="stat-label">badge</span>
          <div className="badge-modern" style={{ '--badge-accent': badge.color } as React.CSSProperties}>
            <span className="badge-icon-wrap">{badge.icon}</span>
            <span className="badge-label-modern">{badge.label}</span>
          </div>
        </div>
      )}
    </div>
  );
});

Stats.displayName = 'Stats';

export default Stats;
