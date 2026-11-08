import { useState, useRef, useEffect } from 'react';
import { THEMES, type Theme } from '../theme/themes';

interface ThemeSelectorProps {
  currentTheme: string;
  onSelectTheme: (themeId: string) => void;
}

export default function ThemeSelector({ currentTheme, onSelectTheme }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const activeTheme = THEMES[currentTheme] || THEMES['midnight-cyber'];

  return (
    <div className="theme-selector-wrapper" ref={dropdownRef}>
      <button
        className="icon-btn theme-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Change Color Theme"
      >
        <span
          className="theme-swatch-mini"
          style={{ backgroundColor: activeTheme.accent }}
        />
        <span className="theme-name-label">{activeTheme.name}</span>
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="theme-dropdown-menu fade-in">
          <div className="dropdown-title">Select Color Theme</div>
          <div className="theme-options-list">
            {Object.values(THEMES).map((theme: Theme) => {
              const isSelected = theme.id === currentTheme;
              return (
                <button
                  key={theme.id}
                  className={`theme-option-item ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    onSelectTheme(theme.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="theme-preview-dots">
                    <span style={{ backgroundColor: theme.background }} className="dot-bg" />
                    <span style={{ backgroundColor: theme.accent }} className="dot-accent" />
                    <span style={{ backgroundColor: theme.error }} className="dot-error" />
                  </div>
                  <div className="theme-meta">
                    <span className="theme-title">{theme.name}</span>
                    <span className="theme-desc">{theme.description}</span>
                  </div>
                  {isSelected && <span className="theme-check">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
