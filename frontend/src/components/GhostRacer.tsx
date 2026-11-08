import { memo } from 'react';

interface GhostRacerProps {
  userProgress: number; // 0 to 100
  ghostProgress: number; // 0 to 100
  userWpm: number;
  pbWpm: number;
  visible: boolean;
}

const GhostRacer = memo(({ userProgress, ghostProgress, userWpm, pbWpm, visible }: GhostRacerProps) => {
  if (!visible) return null;

  const diffProgress = userProgress - ghostProgress;
  const isAhead = diffProgress >= 0;

  return (
    <div className="ghost-racer-container fade-in">
      <div className="ghost-racer-header">
        <div className="racer-label user-label">
          <span className="dot user-dot" />
          <span>You: {userWpm} WPM</span>
        </div>
        <div className={`racer-delta ${isAhead ? 'ahead' : 'behind'}`}>
          {isAhead
            ? `+${Math.abs(Math.round(diffProgress))}% ahead of PB`
            : `-${Math.abs(Math.round(diffProgress))}% behind PB`}
        </div>
        <div className="racer-label ghost-label">
          <span className="dot ghost-dot" />
          <span>PB Pace: {pbWpm} WPM</span>
        </div>
      </div>

      <div className="ghost-track">
        {/* User bar */}
        <div
          className="ghost-progress-bar user-bar"
          style={{ width: `${Math.min(100, Math.max(0, userProgress))}%` }}
        />
        {/* Ghost bar */}
        <div
          className="ghost-progress-bar ghost-bar"
          style={{ width: `${Math.min(100, Math.max(0, ghostProgress))}%` }}
        />

        {/* Ghost runner pin - sleek minimal PB pill */}
        <div
          className="ghost-pin"
          style={{ left: `${Math.min(98, Math.max(2, ghostProgress))}%` }}
          title={`Personal Best: ${pbWpm} WPM`}
        >
          <span className="ghost-pin-tag">PB</span>
        </div>
      </div>
    </div>
  );
});

GhostRacer.displayName = 'GhostRacer';

export default GhostRacer;
