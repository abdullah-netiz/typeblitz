import { useState, useRef, useEffect } from 'react';
import { soundEngine, type SoundProfile } from '../audio/soundEngine';

interface SoundSelectorProps {
  onProfileChange?: (profile: SoundProfile) => void;
}

const PROFILES: { id: SoundProfile; label: string; desc: string; icon: string }[] = [
  { id: 'cream-linear', label: 'Cream Linear', desc: 'Soft & thocky bottom-out', icon: '🧈' },
  { id: 'holy-panda', label: 'Holy Panda', desc: 'Tactile bump & crisp snap', icon: '🐼' },
  { id: 'model-m', label: 'IBM Model M', desc: 'Buckling spring metallic click', icon: '⌨️' },
  { id: 'off', label: 'Muted', desc: 'Silent mode', icon: '🔇' },
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

  return (
    <div className="sound-selector-wrapper" ref={dropdownRef}>
      <button
        className="icon-btn sound-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Tactile Audio Profiles"
      >
        <span className="sound-icon">{currentConfig.icon}</span>
        <span className="sound-label-compact">{currentConfig.label}</span>
      </button>

      {isOpen && (
        <div className="sound-dropdown-menu fade-in">
          <div className="dropdown-title">Tactile Audio (Web Audio API)</div>

          <div className="sound-profiles-list">
            {PROFILES.map((p) => {
              const isSelected = p.id === profile;
              return (
                <button
                  key={p.id}
                  className={`sound-profile-item ${isSelected ? 'active' : ''}`}
                  onClick={() => selectProfile(p.id)}
                >
                  <span className="profile-icon">{p.icon}</span>
                  <div className="profile-meta">
                    <span className="profile-title">{p.label}</span>
                    <span className="profile-desc">{p.desc}</span>
                  </div>
                  {isSelected && <span className="profile-check">✓</span>}
                </button>
              );
            })}
          </div>

          {profile !== 'off' && (
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
