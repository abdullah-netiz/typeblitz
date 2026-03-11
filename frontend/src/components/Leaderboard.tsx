import { useEffect, useState } from 'react';
import './Leaderboard.css';

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  bestWpm: number;
  bestAccuracy: number;
  totalTests: number;
}

export default function Leaderboard({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/results/leaderboard`);
        if (!res.ok) throw new Error('Failed to load leaderboard');
        const data = await res.json();
        setEntries(data);
      } catch (err: any) {
        setError(err.message || 'Error loading leaderboard');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="leaderboard-modal" onClick={e => e.stopPropagation()}>
        <div className="leaderboard-header">
          <h2>Leaderboard</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {loading && <div className="leaderboard-loading">Loading...</div>}
        {error && <div className="leaderboard-error">{error}</div>}

        {!loading && !error && entries.length === 0 && (
          <div className="leaderboard-empty">No results yet. Be the first to type!</div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="leaderboard-table">
            <div className="leaderboard-row leaderboard-row-header">
              <span className="lb-rank">#</span>
              <span className="lb-name">Name</span>
              <span className="lb-wpm">Best WPM</span>
              <span className="lb-acc">Accuracy</span>
              <span className="lb-tests">Tests</span>
            </div>
            {entries.map((entry) => (
              <div
                key={entry.rank}
                className={`leaderboard-row ${entry.rank === 1 ? 'rank-1' : ''} ${entry.rank === 2 ? 'rank-2' : ''} ${entry.rank === 3 ? 'rank-3' : ''}`}
              >
                <span className="lb-rank">
                  {entry.rank === 1 ? '👑' : entry.rank}
                </span>
                <span className="lb-name">
                  {entry.displayName}
                  {entry.rank === 1 && <span className="tk-badge">TK</span>}
                </span>
                <span className="lb-wpm">{entry.bestWpm}</span>
                <span className="lb-acc">{entry.bestAccuracy}%</span>
                <span className="lb-tests">{entry.totalTests}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
