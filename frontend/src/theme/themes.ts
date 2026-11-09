export interface Theme {
  id: string;
  name: string;
  background: string;
  surface: string;
  untyped: string;
  correct: string;
  error: string;
  errorExtra: string;
  accent: string;
  sub: string;
  description: string;
}

export const THEMES: Record<string, Theme> = {
  'midnight-cyber': {
    id: 'midnight-cyber',
    name: 'Midnight Cyber',
    background: '#0B0F19',
    surface: '#111827',
    untyped: '#475569',
    correct: '#E2E8F0',
    error: '#F43F5E',
    errorExtra: '#BE123C',
    accent: '#06B6D4',
    sub: '#64748B',
    description: 'Deep cyber space with neon cyan & rose'
  },
  'tokyo-night': {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    background: '#1A1B26',
    surface: '#24283B',
    untyped: '#565F89',
    correct: '#C0CAF5',
    error: '#F7768E',
    errorExtra: '#DB4B4B',
    accent: '#7AA2F7',
    sub: '#7982A9',
    description: 'Classic dark Tokyo synth aesthetic'
  },
  'nordic-slate': {
    id: 'nordic-slate',
    name: 'Nordic Slate',
    background: '#242933',
    surface: '#2E3440',
    untyped: '#4C566A',
    correct: '#ECEFF4',
    error: '#BF616A',
    errorExtra: '#A34B54',
    accent: '#88C0D0',
    sub: '#707C93',
    description: 'Cool arctic stones and muted frost'
  },
  'botanical-olive': {
    id: 'botanical-olive',
    name: 'Botanical Olive',
    background: '#191E1A',
    surface: '#222923',
    untyped: '#4B5E52',
    correct: '#E3E8E3',
    error: '#E06C75',
    errorExtra: '#BE5059',
    accent: '#98C379',
    sub: '#6C8375',
    description: 'Earthy forest tones with organic sage'
  },
  'coffee-espresso': {
    id: 'coffee-espresso',
    name: 'Coffee Espresso',
    background: '#181513',
    surface: '#241F1C',
    untyped: '#5E534D',
    correct: '#EAD8C7',
    error: '#D95757',
    errorExtra: '#B83E3E',
    accent: '#D9A066',
    sub: '#8C7D75',
    description: 'Warm roasted cafe tones with honey amber'
  }
};

export const DEFAULT_THEME = 'botanical-olive';

export function applyTheme(themeId: string): void {
  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
  const root = document.documentElement;

  root.style.setProperty('--bg-color', theme.background);
  root.style.setProperty('--bg-surface', theme.surface);
  root.style.setProperty('--main-color', theme.accent);
  root.style.setProperty('--main-color-dim', `${theme.accent}1a`);
  root.style.setProperty('--caret-color', theme.accent);
  root.style.setProperty('--sub-color', theme.untyped);
  root.style.setProperty('--text-dim', theme.sub);
  root.style.setProperty('--text-color', theme.correct);
  root.style.setProperty('--error-color', theme.error);
  root.style.setProperty('--error-extra-color', theme.errorExtra);
  root.style.setProperty('--accent-color', theme.accent);

  try {
    localStorage.setItem('typeblitz_theme', theme.id);
  } catch {
    // Ignore storage errors in private browsing
  }
}
