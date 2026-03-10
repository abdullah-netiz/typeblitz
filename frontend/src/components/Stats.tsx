import { memo } from 'react';

type StatsProps = {
  wpm: number;
  accuracy: number;
  visible: boolean;
};

const Stats = memo(({ wpm, accuracy, visible }: StatsProps) => {
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
    </div>
  );
});

Stats.displayName = 'Stats';

export default Stats;
