import { memo } from 'react';

type StatsProps = {
  wpm: number;
  accuracy: number;
  visible: boolean;
};

function getBadge(wpm: number, accuracy: number): { emoji: string; label: string; color: string } | null {
  if (!wpm && !accuracy) return null;

  // Perfect accuracy badge takes priority
  if (accuracy === 100) {
    return { emoji: '💎', label: 'Flawless', color: '#60a5fa' };
  }

  if (wpm >= 150) return { emoji: '⚡', label: 'Lightning', color: '#facc15' };
  if (wpm >= 120) return { emoji: '🔥', label: 'Inferno', color: '#f97316' };
  if (wpm >= 100) return { emoji: '🚀', label: 'Rocket', color: '#a78bfa' };
  if (wpm >= 80) return { emoji: '🏎️', label: 'Speed Racer', color: '#f43f5e' };
  if (wpm >= 60) return { emoji: '🐆', label: 'Cheetah', color: '#10b981' };
  if (wpm >= 40) return { emoji: '🐇', label: 'Rabbit', color: '#34d399' };
  return { emoji: '🐢', label: 'Turtle', color: '#8b949e' };
}

const Stats = memo(({ wpm, accuracy, visible }: StatsProps) => {
  const badge = visible ? getBadge(wpm, accuracy) : null;

  return (
    <div className={`stats-container ${visible ? 'visible' : ''}`}>
      <div className="stat-item tooltip">
        <span className="stat-label">wpm</span>
        <span className="stat-value">{wpm}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">acc</span>
        <span className="stat-value">{accuracy}%</span>
      </div>
      {badge && (
        <div className="stat-item badge-item fade-in">
          <span className="stat-label">badge</span>
          <div className="badge" style={{ '--badge-color': badge.color } as React.CSSProperties}>
            <span className="badge-emoji">{badge.emoji}</span>
            <span className="badge-label">{badge.label}</span>
          </div>
        </div>
      )}
    </div>
  );
});

Stats.displayName = 'Stats';

export default Stats;
