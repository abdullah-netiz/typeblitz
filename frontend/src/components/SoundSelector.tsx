import { useState, useRef, useEffect, type ReactNode } from 'react';
import { soundEngine, type SoundProfile } from '../audio/soundEngine';

interface SoundSelectorProps {
  onProfileChange?: (profile: SoundProfile) => void;
}

interface ProfileConfig {
  id: SoundProfile;
  label: string;
  desc: string;
  icon: ReactNode;
}

const PROFILES: ProfileConfig[] = [
  {
    id: 'cream-linear',
    label: 'Cream Linear',
    desc: 'Soft & thocky bottom-out',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h16M4 6h16M4 18h16" />
      </svg>
    )
  },
  {
    id: 'holy-panda',
    label: 'Holy Panda',
    desc: 'Tactile bump & crisp snap',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h5l3-7 4 14 3-7h5" />
      </svg>
    )
  },
  {
    id: 'model-m',
    label: 'IBM Model M',
    desc: 'Buckling spring metallic click',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
      </svg>
    )
  },
  {
    id: 'off',
    label: 'Muted',
    desc: 'Silent mode',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    )
  },
];

export default function SoundSelector({ onProfileChange }: SoundSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<SoundProfile>(soundEngine.getSettings().profile);
  const [volume, setVolume] = useState<number>(soundEngine.getSettings().volume);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const selectProfile = (newProfile: SoundProfile) => {
    setProfile(newProfile);
    soundEngine.setProfile(newProfile);
    if (newProfile !== 'off') {
      soundEngine.playKey(' ', false);
    }
    onProfileChange?.(newProfile);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    soundEngine.setVolume(newVol);
  };

  const currentConfig = PROFILES.find(p => p.id === profile) || PROFILES[0];
  const isMuted = profile === 'off';

  return (
    <div className="sound-selector-wrapper" ref={dropdownRef}>
      <button
        className="icon-btn sound-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Tactile Audio Profiles"
      >
        <span className="sound-svg-icon">
          {isMuted ? (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </span>
        <span className="sound-label-compact">{currentConfig.label}</span>
      </button>

      {isOpen && (
        <div className="sound-dropdown-menu fade-in">
          <div className="dropdown-title">Tactile Audio Profiles</div>

          <div className="sound-profiles-list">
            {PROFILES.map((p) => {
              const isSelected = p.id === profile;
              return (
                <button
                  key={p.id}
                  className={`sound-profile-item ${isSelected ? 'active' : ''}`}
                  onClick={() => selectProfile(p.id)}
                >
                  <span className="profile-icon-svg">{p.icon}</span>
                  <div className="profile-meta">
                    <span className="profile-title">{p.label}</span>
                    <span className="profile-desc">{p.desc}</span>
                  </div>
                  {isSelected && <span className="profile-check">✓</span>}
                </button>
              );
            })}
          </div>

          {!isMuted && (
            <div className="volume-control-box">
              <div className="volume-label">
                <span>Volume</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="volume-slider"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
