import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

import { updateProfile } from 'firebase/auth';

interface StatRecord {
  _id: string;
  wpm: number;
  accuracy: number;
  wordCount: number;
  createdAt: string;
}

export default function Profile({ onClose }: { onClose: () => void }) {
  const { user, logOut } = useAuth();
  const [stats, setStats] = useState<StatRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();

        // Sync display name with backend MongoDB automatically
        if (user.displayName) {
          fetch(`${import.meta.env.VITE_API_URL}/api/results/profile`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ displayName: user.displayName })
          }).catch(() => {});
        }

        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/results/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error('Failed to load stats');
        const data = await res.json();
        setStats(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error connecting to backend');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;
    setIsUpdating(true);
    try {
      const trimmed = displayName.trim();
      await updateProfile(user, { displayName: trimmed });
      const token = await user.getIdToken(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/results/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ displayName: trimmed })
      });
      if (!res.ok) {
        throw new Error('Failed to update name on backend');
      }
      alert('Name updated successfully!');
    } catch (err: unknown) {
      setError('Failed to update name: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsUpdating(false);
    }
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        
        <div className="profile-header">
           <h2>{user?.email}</h2>
           <button className="logout-btn" onClick={() => { logOut(); onClose(); }}>Sign Out</button>
        </div>

        <form onSubmit={handleUpdateName} className="name-update-form">
          <div className="form-group">
            <label>Display Name</label>
            <div className="input-group">
              <input 
                type="text" 
                value={displayName} 
                onChange={e => setDisplayName(e.target.value)} 
                placeholder="Enter your name"
              />
              <button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </form>

        <div className="stats-divider" />

        <h3>Recent Tests</h3>
        
        <div className="stats-list">
          {loading && <p className="loading-text">Loading your history...</p>}
          {error && <p className="error-text">{error}</p>}
          
          {!loading && !error && stats.filter(s => s.wpm > 0 && s.wpm <= 300).length === 0 && (
            <p className="empty-text">No typing tests recorded yet. Start typing!</p>
          )}

          {!loading && !error && stats.filter(s => s.wpm > 0 && s.wpm <= 300).length > 0 && (
            <table className="stats-table">
              <thead>
                <tr>
                  <th>WPM</th>
                  <th>ACCURACY</th>
                  <th>WORDS</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {stats.filter(s => s.wpm > 0 && s.wpm <= 300).map(stat => (
                  <tr key={stat._id}>
                    <td className="wpm-cell">{stat.wpm.toFixed(0)}</td>
                    <td>{stat.accuracy.toFixed(0)}%</td>
                    <td>{stat.wordCount}</td>
                    <td className="date-cell">{formatDate(stat.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
