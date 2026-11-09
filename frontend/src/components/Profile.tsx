import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from 'firebase/auth';
import './Profile.css';

interface StatRecord {
  _id: string;
  wpm: number;
  accuracy: number;
  wordCount: number;
  createdAt: string;
}

interface ProfileProps {
  onBack?: () => void;
}

export default function Profile({ onBack }: ProfileProps) {
  const { user, logOut, signIn, signUp, signInWithGoogle, signInWithGithub } = useAuth();
  const [stats, setStats] = useState<StatRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  // Auth form states (when logged out)
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const token = await user.getIdToken();

        // Sync display name with backend MongoDB automatically
        if (user.displayName) {
          fetch(`${import.meta.env.VITE_API_URL}/api/results/profile`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ displayName: user.displayName })
          }).catch(() => {});
        }

        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/results/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) throw new Error('Failed to load past results');
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
    setUpdateMsg('');
    try {
      const trimmed = displayName.trim();
      await updateProfile(user, { displayName: trimmed });
      const token = await user.getIdToken(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/results/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ displayName: trimmed })
      });
      if (!res.ok) {
        throw new Error('Failed to update name on backend');
      }
      setUpdateMsg('Name updated successfully!');
      setTimeout(() => setUpdateMsg(''), 3000);
    } catch (err: unknown) {
      setError('Failed to update name: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (isLoginTab) {
        await signIn(authEmail, authPassword);
      } else {
        await signUp(authEmail, authPassword);
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'github') => {
    setAuthError('');
    setAuthLoading(true);
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithGithub();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : `Failed to sign in with ${provider}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const validStats = stats.filter((s) => s.wpm > 0 && s.wpm <= 300);
  const bestWpm = validStats.length > 0 ? Math.max(...validStats.map((s) => s.wpm)) : 0;
  const avgAccuracy =
    validStats.length > 0
      ? Math.round(validStats.reduce((a, b) => a + b.accuracy, 0) / validStats.length)
      : 0;

  // --- 1. Logged Out View (Dedicated Sign-In Page) ---
  if (!user) {
    return (
      <div className="account-page fade-in">
        <div className="account-header">
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

        <div className="auth-card">
          <div className="auth-card-tabs">
            <button
              className={`auth-tab-btn ${isLoginTab ? 'active' : ''}`}
              onClick={() => { setIsLoginTab(true); setAuthError(''); }}
            >
              Sign In
            </button>
            <button
              className={`auth-tab-btn ${!isLoginTab ? 'active' : ''}`}
              onClick={() => { setIsLoginTab(false); setAuthError(''); }}
            >
              Create Account
            </button>
          </div>

          <h2 className="auth-card-title">{isLoginTab ? 'Welcome Back' : 'Join TypeBlitz'}</h2>
          <p className="auth-card-subtitle">
            {isLoginTab ? 'Sign in to save your typing tests and track your progress' : 'Save personal bests and compete on the global leaderboard'}
          </p>

          <div className="social-auth-grid">
            <button
              className="social-auth-btn google"
              onClick={() => handleSocialAuth('google')}
              disabled={authLoading}
            >
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              <span>Continue with Google</span>
            </button>
            <button
              className="social-auth-btn github"
              onClick={() => handleSocialAuth('github')}
              disabled={authLoading}
            >
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              <span>GitHub</span>
            </button>
          </div>

          <div className="auth-divider"><span>or with email</span></div>

          {authError && <div className="auth-error-banner">{authError}</div>}

          <form onSubmit={handleAuthSubmit} className="auth-form-card">
            <div className="auth-input-group">
              <label>Email</label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@domain.com"
                required
              />
            </div>
            <div className="auth-input-group">
              <label>Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="auth-submit-btn" disabled={authLoading}>
              {authLoading ? 'Please wait...' : isLoginTab ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- 2. Logged In User Account View ---
  return (
    <div className="account-page fade-in">
      <div className="account-header">
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

        <div className="account-title-bar">
          <div className="account-user-meta">
            <div className="account-avatar-large">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" />
              ) : (
                (user.displayName || user.email || 'T').slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <h2>{user.displayName || 'Typist'}</h2>
              <p className="account-email-sub">{user.email}</p>
            </div>
          </div>

          <button className="logout-btn" onClick={logOut}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="account-kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Peak Speed</span>
          <span className="kpi-value">{bestWpm} <small>WPM</small></span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Avg Accuracy</span>
          <span className="kpi-value">{avgAccuracy}%</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Tests Logged</span>
          <span className="kpi-value">{validStats.length}</span>
        </div>
      </div>

      {/* Display Name Updater */}
      <div className="account-section-card">
        <h3>Account Settings</h3>
        <form onSubmit={handleUpdateName} className="name-update-form">
          <label>Display Name (shown on Leaderboard)</label>
          <div className="input-group">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your public display name"
              maxLength={30}
            />
            <button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Update Name'}
            </button>
          </div>
          {updateMsg && <p className="success-inline">{updateMsg}</p>}
          {error && <p className="error-inline">{error}</p>}
        </form>
      </div>

      {/* Recent Tests Table */}
      <div className="account-section-card">
        <h3>Recent Typing Tests</h3>

        {loading && <p className="loading-text">Loading your test history...</p>}

        {!loading && validStats.length === 0 && (
          <div className="empty-tests-box">
            <p>No tests recorded yet.</p>
            {onBack && (
              <button className="lb-start-btn" onClick={onBack}>
                Start a test now
              </button>
            )}
          </div>
        )}

        {!loading && validStats.length > 0 && (
          <div className="account-table-wrapper">
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
                {validStats.map((stat) => (
                  <tr key={stat._id}>
                    <td className="wpm-cell">{stat.wpm.toFixed(0)}</td>
                    <td className="acc-cell">{stat.accuracy.toFixed(0)}%</td>
                    <td>{stat.wordCount}</td>
                    <td className="date-cell">{formatDate(stat.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
