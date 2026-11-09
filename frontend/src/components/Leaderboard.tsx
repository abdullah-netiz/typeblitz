import { useEffect, useState } from 'react';
import './Leaderboard.css';

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  bestWpm: number;
  bestAccuracy: number;
  totalTests: number;
}

interface LeaderboardProps {
  onBack?: () => void;
}

const FILTER_OPTIONS = [
  { id: 'all', label: 'All-Time' },
  { id: '15', label: 'Time 15' },
  { id: '30', label: 'Time 30' },
  { id: '60', label: 'Time 60' },
];

export default function Leaderboard({ onBack }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/results/leaderboard`);
        if (!res.ok) throw new Error('Failed to load leaderboard data');
        const data = await res.json();
        setEntries(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading leaderboard');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="leaderboard-page fade-in">
      <div className="lb-page-header">
        <div className="lb-title-wrap">
          <div className="lb-breadcrumbs">
            {onBack && (
              <button className="lb-back-btn" onClick={onBack}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Back to Test</span>
                <kbd className="esc-key">esc</kbd>
              </button>
            )}
          </div>
          <h2>Global Leaderboard</h2>
          <p className="lb-subtitle">All-time top typists ranked by peak speed and accuracy</p>
        </div>

        <div className="lb-filter-pills">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.id}
              className={`lb-filter-btn ${selectedFilter === f.id ? 'active' : ''}`}
              onClick={() => setSelectedFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="lb-content-card">
        {loading && (
          <div className="leaderboard-loading">
            <div className="loading-spinner" />
            <p>Fetching rankings...</p>
          </div>
        )}

        {error && <div className="leaderboard-error">{error}</div>}

        {!loading && !error && entries.length === 0 && (
          <div className="leaderboard-empty">
            <p>No test results yet.</p>
            {onBack && (
              <button className="lb-start-btn" onClick={onBack}>
                Be the first to set a record!
              </button>
            )}
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="lb-table-wrapper">
            <div className="leaderboard-table">
              <div className="leaderboard-row leaderboard-row-header">
                <span className="lb-rank">#</span>
                <span className="lb-name">Typist</span>
                <span className="lb-wpm">Peak WPM</span>
                <span className="lb-acc">Accuracy</span>
                <span className="lb-tests">Tests</span>
              </div>
              {entries.map((entry) => (
                <div
                  key={entry.rank}
                  className={`leaderboard-row ${entry.rank === 1 ? 'rank-1' : ''} ${entry.rank === 2 ? 'rank-2' : ''} ${entry.rank === 3 ? 'rank-3' : ''}`}
                >
                  <span className="lb-rank">
                    {entry.rank === 1 ? (
                      <span className="rank-crown gold" title="1st Place">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 14h14v2H5v-2z" />
                        </svg>
                      </span>
                    ) : entry.rank === 2 ? (
                      <span className="rank-crown silver" title="2nd Place">
                        2
                      </span>
                    ) : entry.rank === 3 ? (
                      <span className="rank-crown bronze" title="3rd Place">
                        3
                      </span>
                    ) : (
                      entry.rank
                    )}
                  </span>
                  <span className="lb-name">
                    <span className="typist-avatar-placeholder">
                      {entry.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="typist-name-text">{entry.displayName}</span>
                    {entry.rank === 1 && <span className="tk-badge">Apex</span>}
                  </span>
                  <span className="lb-wpm">{entry.bestWpm}</span>
                  <span className="lb-acc">{entry.bestAccuracy}%</span>
                  <span className="lb-tests">{entry.totalTests}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
