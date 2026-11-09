import { useCallback, useEffect, useState, useRef } from 'react';
import './App.css';
import Stats from './components/Stats';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import ThemeSelector from './components/ThemeSelector';
import SoundSelector from './components/SoundSelector';
import KeyHeatmap, { type HeatmapAnalytics } from './components/KeyHeatmap';
import { useAuth } from './context/AuthContext';
import { generateWords } from './utils/wordGenerator';
import { calculateWPM } from './utils/wpmCalculator';
import { getRandomCodeWords, type TypingMode } from './utils/codeSnippets';
import { applyTheme, DEFAULT_THEME } from './theme/themes';
import { soundEngine } from './audio/soundEngine';
import { CadenceTracker, savePersonalBest } from './utils/cadenceTracker';

const TIME_OPTIONS = [15, 30, 60, 120] as const;
const WORDS_PER_SECOND = 3;

type TestStatus = 'idle' | 'typing' | 'finished';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  opacity: number;
}

function App() {
  const [mode, setMode] = useState<TypingMode>('words');
  const [suddenDeath, setSuddenDeath] = useState(false);
  const [suddenDeathFailed, setSuddenDeathFailed] = useState<string | null>(null);

  const [selectedTime, setSelectedTime] = useState<number>(30);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [zenElapsed, setZenElapsed] = useState<number>(0);

  const [includePunctuation, setIncludePunctuation] = useState(false);
  const [includeNumbers, setIncludeNumbers] = useState(false);

  const [words, setWords] = useState<string[]>(() =>
    generateWords(30 * WORDS_PER_SECOND, { punctuation: false, numbers: false })
  );

  const [history, setHistory] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);

  const [status, setStatus] = useState<TestStatus>('idle');
  const [startTime, setStartTime] = useState<number | null>(null);

  const [errors, setErrors] = useState<number>(0);

  const [wpm, setWpm] = useState(0);
  const [rawWpm, setRawWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [consistency, setConsistency] = useState(100);


  // Key burst heatmap & analytics
  const cadenceTrackerRef = useRef(new CadenceTracker());
  const [heatmapAnalytics, setHeatmapAnalytics] = useState<HeatmapAnalytics | null>(null);

  // Themes
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('typeblitz_theme') || DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  // Smooth caret via direct DOM manipulation
  const typingAreaRef = useRef<HTMLDivElement>(null);
  const wordsInnerRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);
  const scrollOffsetRef = useRef(0);

  // Particle system refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const currentWpmRef = useRef(0);
  const lastKeystrokeRef = useRef(0);

  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'test' | 'leaderboard' | 'account'>('test');
  const [showNotifications, setShowNotifications] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const [capsLockOn, setCapsLockOn] = useState(false);

  // First-visit onboarding tooltip for theme & sound
  const [showOnboardingTip, setShowOnboardingTip] = useState(() => {
    try {
      return localStorage.getItem('typeblitz_guide_seen') !== 'true';
    } catch {
      return false;
    }
  });

  const dismissOnboardingTip = useCallback(() => {
    setShowOnboardingTip(false);
    try {
      localStorage.setItem('typeblitz_guide_seen', 'true');
    } catch {
      // ignore
    }
  }, []);

  // Initialize theme
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const handleSelectTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    applyTheme(themeId);
    dismissOnboardingTip();
  };



  // --- Start / Reset Test Helper ---
  const startTestWith = useCallback((
    targetMode: TypingMode = mode,
    targetTime: number = selectedTime,
    targetPunct: boolean = includePunctuation,
    targetNums: boolean = includeNumbers
  ) => {
    let newWords: string[] = [];
    if (targetMode === 'words') {
      const wordCount = targetTime * WORDS_PER_SECOND;
      newWords = generateWords(wordCount, { punctuation: targetPunct, numbers: targetNums });
    } else if (targetMode === 'zen') {
      newWords = generateWords(120, { punctuation: targetPunct, numbers: targetNums });
    } else {
      newWords = getRandomCodeWords(targetMode);
    }

    setWords(newWords);
    setHistory([]);
    setCurrentWord('');
    setActiveWordIndex(0);
    setStatus('idle');
    setStartTime(null);
    setTimeLeft(targetTime);
    setZenElapsed(0);
    setErrors(0);
    setWpm(0);
    setRawWpm(0);
    setAccuracy(100);
    setConsistency(100);
    setSaveSuccess(null);
    setIsSaving(false);
    setSuddenDeathFailed(null);
    setHeatmapAnalytics(null);

    cadenceTrackerRef.current.reset();
    scrollOffsetRef.current = 0;
    currentWpmRef.current = 0;
    particlesRef.current = [];

    if (wordsInnerRef.current) {
      wordsInnerRef.current.style.transform = 'translate3d(0,0,0)';
    }
  }, [mode, selectedTime, includePunctuation, includeNumbers]);

  const startNewTest = useCallback(() => {
    startTestWith(mode, selectedTime, includePunctuation, includeNumbers);
  }, [startTestWith, mode, selectedTime, includePunctuation, includeNumbers]);

  // --- Save to API & PB ---
  const saveTypingResult = useCallback(async (finalWpm: number, finalAcc: number, timeTaken: number, wordCount: number) => {
    // Save personal best locally
    savePersonalBest({
      wpm: finalWpm,
      accuracy: finalAcc,
      mode,
      duration: selectedTime,
      date: new Date().toISOString()
    });

    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      const token = await user.getIdToken(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ wpm: finalWpm, accuracy: finalAcc, wordCount, timeTakenMs: timeTaken })
      });
      setSaveSuccess(res.ok);
      if (!res.ok) console.error("Failed to save result", await res.text());
    } catch (err) {
      console.error("Network error saving result", err);
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  }, [user, mode, selectedTime]);

  const finishTest = useCallback((currentStartTime: number, finalHist: string[], currentErr: number, failureReason?: string) => {
    setStatus('finished');
    const endTime = Date.now();
    const timeTaken = endTime - currentStartTime;
    const isFailed = Boolean(failureReason);

    let totalTyped = 0;
    finalHist.forEach((word) => {
      totalTyped += word.length + 1;
    });

    const stats = calculateWPM(totalTyped, currentErr, currentStartTime, endTime);
    setWpm(stats.wpm);
    setRawWpm(stats.rawWpm);
    setAccuracy(stats.accuracy);
    const cons = cadenceTrackerRef.current.getConsistency(currentStartTime, endTime);
    setConsistency(cons);

    if (isFailed) {
      setSuddenDeathFailed(failureReason || 'Sudden Death failed');
    } else {
      setSuddenDeathFailed(null);
      saveTypingResult(stats.wpm, stats.accuracy, timeTaken, finalHist.length);
    }

    // Capture post-test keyboard cadence analytics
    const analytics = cadenceTrackerRef.current.getAnalytics();
    setHeatmapAnalytics(analytics);
  }, [saveTypingResult]);

  // --- Smooth caret positioning via rAF ---
  const updateCaretPosition = useCallback(() => {
    if (!wordsInnerRef.current || !caretRef.current) return;

    const inner = wordsInnerRef.current;
    const caret = caretRef.current;
    const activeWordEl = inner.querySelector(`.word[data-index="${activeWordIndex}"]`);
    if (!activeWordEl) return;

    const letterEls = activeWordEl.querySelectorAll('.letter, .space');
    const inputLength = currentWord.length;

    let targetEl: Element | undefined;
    if (letterEls.length > 0) {
      if (inputLength === 0) {
        targetEl = letterEls[0];
      } else if (inputLength < letterEls.length) {
        targetEl = letterEls[inputLength];
      } else {
        targetEl = letterEls[letterEls.length - 1];
      }
    }

    if (targetEl) {
      const innerRect = inner.getBoundingClientRect();
      const rect = targetEl.getBoundingClientRect();
      let left = rect.left - innerRect.left;
      const top = rect.top - innerRect.top;
      if (inputLength >= letterEls.length && inputLength > 0) {
        left += rect.width;
      }
      caret.style.transform = `translate3d(${left}px, ${top}px, 0)`;

      // Line scroll
      const firstWord = inner.querySelector('.word');
      if (firstWord) {
        const lineHeight = firstWord.getBoundingClientRect().height;
        const activeLine = Math.round(top / lineHeight);
        const targetScroll = Math.max(0, activeLine) * lineHeight;
        if (Math.abs(targetScroll - scrollOffsetRef.current) > 1) {
          scrollOffsetRef.current = targetScroll;
          inner.style.transform = `translate3d(0, -${targetScroll}px, 0)`;
        }
      }
    }
  }, [activeWordIndex, currentWord]);

  useEffect(() => {
    requestAnimationFrame(updateCaretPosition);
  }, [updateCaretPosition]);

  // --- Stats helper ---
  const fetchDynamicStats = useCallback((currentStart: number, currentHist: string[], currentInput: string, currentErr: number) => {
    let totalTyped = 0;
    currentHist.forEach((word) => {
      totalTyped += word.length + 1;
    });
    totalTyped += currentInput.length;
    return calculateWPM(totalTyped, currentErr, currentStart, Date.now());
  }, []);

  // --- Countdown timer & Ghost Racer updates ---
  useEffect(() => {
    let interval: number;
    if (status === 'typing' && startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;

        if (mode === 'zen') {
          setZenElapsed(Math.floor(elapsed));
        } else {
          const remaining = selectedTime - Math.floor(elapsed);
          if (remaining <= 0) {
            setTimeLeft(0);
            const finalHist = [...history];
            if (currentWord.length > 0) finalHist.push(currentWord);
            finishTest(startTime, finalHist, errors);
            clearInterval(interval);
            return;
          } else {
            setTimeLeft(remaining);
          }
        }

      }, 100);
    }
    return () => clearInterval(interval);
  }, [status, startTime, selectedTime, history, currentWord, errors, finishTest, mode]);

  // --- Keyboard handler with Tactile Audio & Sudden Death ---
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Detect caps lock
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }

    if (activeView !== 'test') {
      if (e.key === 'Escape') {
        e.preventDefault();
        setActiveView('test');
      }
      return;
    }
    if (status === 'finished') {
      if (e.key === 'Tab') { e.preventDefault(); startNewTest(); }
      return;
    }
    if (e.key === 'Tab') { e.preventDefault(); startNewTest(); return; }

    // End Zen Mode session early with Shift+Enter
    if (mode === 'zen' && e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      if (status === 'typing' && startTime) {
        const finalHist = [...history];
        if (currentWord.length > 0) finalHist.push(currentWord);
        finishTest(startTime, finalHist, errors);
      }
      return;
    }

    if (e.key.length !== 1 && e.key !== 'Backspace') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();

    lastKeystrokeRef.current = Date.now();

    let currentStartTime = startTime;
    if (status === 'idle') {
      setStatus('typing');
      currentStartTime = Date.now();
      setStartTime(currentStartTime);
    }

    // Sudden Death Rule: No backspacing allowed
    if (e.key === 'Backspace') {
      if (suddenDeath) {
        soundEngine.playKey('Backspace', true);
        cadenceTrackerRef.current.recordKeystroke('Backspace', true);
        finishTest(currentStartTime || Date.now(), [...history, currentWord], errors + 1, "Sudden Death failed: Backspacing is prohibited!");
        return;
      }

      soundEngine.playKey('Backspace', false);
      if (currentWord.length > 0) {
        setCurrentWord(prev => prev.slice(0, -1));
      } else if (activeWordIndex > 0) {
        const prevWordIndex = activeWordIndex - 1;
        const previousTypedWord = history[prevWordIndex];
        const newHistory = [...history];
        newHistory.pop();
        setHistory(newHistory);
        setCurrentWord(previousTypedWord);
        setActiveWordIndex(prevWordIndex);
      }
      return;
    }

    let newErrors = errors;

    if (e.key === ' ') {
      if (currentWord.length === 0) return;
      const isWordError = currentWord !== words[activeWordIndex];

      if (isWordError) {
        soundEngine.playKey(' ', true);
        cadenceTrackerRef.current.recordKeystroke(' ', true);
        if (suddenDeath) {
          finishTest(currentStartTime || Date.now(), [...history, currentWord], errors + 1, `Sudden Death failed on word "${currentWord}"`);
          return;
        }
        newErrors++;
        setErrors(newErrors);
      } else {
        soundEngine.playKey(' ', false);
        cadenceTrackerRef.current.recordKeystroke(' ', false);
      }

      setHistory(prev => [...prev, currentWord]);
      setCurrentWord('');
      setActiveWordIndex(prev => prev + 1);

      if (activeWordIndex === words.length - 1) {
        finishTest(currentStartTime || Date.now(), [...history, currentWord], newErrors);
      }
      return;
    }

    // Character keypress
    const expectedChar = words[activeWordIndex]?.[currentWord.length];
    const isCharError = e.key !== expectedChar;

    if (isCharError) {
      soundEngine.playKey(e.key, true);
      cadenceTrackerRef.current.recordKeystroke(e.key, true);

      if (suddenDeath) {
        finishTest(
          currentStartTime || Date.now(),
          [...history, currentWord + e.key],
          errors + 1,
          `Sudden Death failed on key '${e.key}' (expected '${expectedChar || 'space'}')`
        );
        return;
      }
      newErrors++;
      setErrors(newErrors);
    } else {
      soundEngine.playKey(e.key, false);
      cadenceTrackerRef.current.recordKeystroke(e.key, false);
    }

    if (currentWord.length >= (words[activeWordIndex]?.length || 0) + 10) return;
    setCurrentWord(prev => prev + e.key);
  }, [
    status, words, startNewTest, currentWord, history, activeWordIndex, errors,
    startTime, activeView, finishTest, suddenDeath, mode
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // --- Live dynamic WPM updates ---
  useEffect(() => {
    let interval: number;
    if (status === 'typing' && startTime) {
      interval = setInterval(() => {
        const stats = fetchDynamicStats(startTime, history, currentWord, errors);
        setWpm(stats.wpm);
        setAccuracy(stats.accuracy);
        currentWpmRef.current = stats.wpm;
      }, 500);
    }
    return () => clearInterval(interval);
  }, [status, startTime, currentWord, history, errors, fetchDynamicStats]);

  // --- Canvas Particle system ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const spawnParticle = (side: 'left' | 'right') => {
      const fromRight = side === 'right';
      particlesRef.current.push({
        x: fromRight ? w * 0.95 + Math.random() * w * 0.05 : Math.random() * w * 0.05,
        y: h * 0.2 + Math.random() * h * 0.6,
        vx: fromRight ? -(1.5 + Math.random() * 3) : (1.5 + Math.random() * 3),
        vy: (Math.random() - 0.5) * 0.6,
        life: 0,
        maxLife: 35 + Math.random() * 25,
        size: 1 + Math.random() * 1.5,
        opacity: 0.25 + Math.random() * 0.35,
      });
    };

    let lastSpawn = 0;
    const animate = (time: number) => {
      ctx.clearRect(0, 0, w, h);

      const wpmNow = currentWpmRef.current;
      const timeSinceKey = Date.now() - lastKeystrokeRef.current;
      const activity = timeSinceKey < 500 ? 1 : Math.max(0, 1 - (timeSinceKey - 500) / 800);
      const spawnRate = activity > 0.05 ? Math.min(wpmNow / 12, 10) * activity : 0;

      if (spawnRate > 0 && time - lastSpawn > 1000 / Math.max(spawnRate, 1)) {
        spawnParticle('right');
        spawnParticle('left');
        lastSpawn = time;
      }

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        const speedMult = 1 + wpmNow / 60;
        p.x += p.vx * speedMult;
        p.y += p.vy;

        const lifeRatio = p.life / p.maxLife;
        const fadeIn = Math.min(p.life / 5, 1);
        const fadeOut = 1 - lifeRatio;
        const alpha = p.opacity * fadeIn * fadeOut * activity;

        if (p.life >= p.maxLife || alpha < 0.005 || p.x < -20 || p.x > w + 20) {
          particles.splice(i, 1);
          continue;
        }

        const streakLen = p.size * 4 * speedMult;
        const tailX = p.vx < 0 ? p.x + streakLen : p.x - streakLen;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(tailX, p.y);
        ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleTimeSelect = (time: number) => {
    if (time === selectedTime) return;
    setSelectedTime(time);
    startTestWith(mode, time, includePunctuation, includeNumbers);
  };

  const handleModeSelect = (newMode: TypingMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    startTestWith(newMode, selectedTime, includePunctuation, includeNumbers);
  };

  const selectedTimeIndex = TIME_OPTIONS.indexOf(selectedTime as typeof TIME_OPTIONS[number]);
  const isFocused = status === 'typing';

  // --- Render words ---
  const renderWords = () => {
    return words.map((word, wIdx) => {
      let typedWord = "";
      if (wIdx < activeWordIndex) typedWord = history[wIdx];
      else if (wIdx === activeWordIndex) typedWord = currentWord;

      const isCurrent = wIdx === activeWordIndex;
      const isTyped = wIdx < activeWordIndex;
      const characters = word.split('');
      const lettersToRender = Math.max(characters.length, typedWord.length);
      let wordClass = "word";
      if (isTyped && typedWord !== word) wordClass += " error-underline";

      return (
        <span key={wIdx} data-index={wIdx} className={wordClass}>
          {Array.from({ length: lettersToRender }).map((_, cIdx) => {
            const char = characters[cIdx] || '';
            const typedChar = typedWord[cIdx];
            let charClass = "letter";
            let displayChar = char;
            if (isTyped || isCurrent) {
              if (cIdx >= characters.length) { charClass += " extra"; displayChar = typedChar; }
              else if (typedChar === undefined) { /* untyped */ }
              else if (typedChar === char) { charClass += " correct"; }
              else { charClass += " incorrect"; }
            }
            return (<span key={`${wIdx}-${cIdx}`} className={charClass}>{displayChar}</span>);
          })}
          {wIdx !== words.length - 1 && (
            <span className={`space ${isTyped ? 'correct' : ''}`}>&nbsp;</span>
          )}
        </span>
      );
    });
  };

  return (
    <div className={`typeblitz-container fade-in ${isFocused ? 'focused' : ''}`}>
      {/* Header */}
      <header className={`header ${isFocused ? 'header-hidden' : ''}`}>
        <div className="header-left">
          <div className="logo" onClick={() => { setActiveView('test'); startNewTest(); }} style={{ cursor: 'pointer' }}>
            <span>type</span>blitz
          </div>

          <nav className="header-nav-tabs">
            <button
              className={`nav-tab-btn ${activeView === 'test' ? 'active' : ''}`}
              onClick={() => setActiveView('test')}
              title="Typing Test"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
              </svg>
              <span>Test</span>
            </button>
            <button
              className={`nav-tab-btn ${activeView === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setActiveView('leaderboard')}
              title="Global Leaderboard"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
              </svg>
              <span>Leaderboard</span>
            </button>
          </nav>
        </div>

        <div className="header-right">
          {/* First-visit onboarding hover guide */}
          {showOnboardingTip && status !== 'typing' && (
            <div className="onboarding-guide-tip fade-in">
              <div className="guide-tip-arrow" />
              <div className="guide-tip-header">
                <span className="guide-tip-spark">✦</span>
                <span className="guide-tip-title">Style & Audio</span>
                <button className="guide-tip-close" onClick={dismissOnboardingTip} title="Dismiss">✕</button>
              </div>
              <p className="guide-tip-text">
                Customize your color theme and mechanical keyboard sounds here anytime!
              </p>
              <button className="guide-tip-btn" onClick={dismissOnboardingTip}>
                Got it
              </button>
            </div>
          )}

          {/* Theme Selector */}
          <ThemeSelector currentTheme={currentTheme} onSelectTheme={handleSelectTheme} />

          {/* Sound Profile Selector */}
          <SoundSelector />

          {/* Notifications */}
          <div className="notification-nav">
            <button className="icon-btn" onClick={() => setShowNotifications(!showNotifications)} title="Notifications">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <span className="dot" />
            </button>
            {showNotifications && (
              <div className="notifications-dropdown fade-in">
                <div className="dropdown-header">Notifications</div>
                <div className="notification-item">Welcome to TypeBlitz! Try mechanical switch audio & dark theme styles.</div>
                <div className="notification-item dimmed">Check the new full-page Leaderboards and Account stats.</div>
              </div>
            )}
          </div>

          {/* Account Tab Button */}
          <div className="auth-controls">
            {user ? (
              <button
                className={`icon-btn user-nav-tab-btn ${activeView === 'account' ? 'active' : ''}`}
                onClick={() => setActiveView(activeView === 'account' ? 'test' : 'account')}
                title="Account & Stats"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="user-avatar-mini" />
                ) : (
                  <span className="user-initial-mini">{(user.displayName || user.email || 'U').slice(0, 1).toUpperCase()}</span>
                )}
                <span className="user-name-text">{user.displayName || 'Account'}</span>
              </button>
            ) : (
              <button
                className={`auth-btn ${activeView === 'account' ? 'active' : ''}`}
                onClick={() => setActiveView('account')}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {activeView === 'test' && (
        <>
          {/* Modes Bar & Sudden Death toggle */}
          <div className={`modes-bar-wrapper ${isFocused ? 'header-hidden' : ''}`}>
            <div className="modes-group">
              <button
                className={`mode-btn ${mode === 'words' ? 'active' : ''}`}
                onClick={() => handleModeSelect('words')}
              >
                words
              </button>
              <button
                className={`mode-btn ${mode === 'javascript' ? 'active' : ''}`}
                onClick={() => handleModeSelect('javascript')}
              >
                javascript
              </button>
              <button
                className={`mode-btn ${mode === 'python' ? 'active' : ''}`}
                onClick={() => handleModeSelect('python')}
              >
                python
              </button>
              <button
                className={`mode-btn ${mode === 'json' ? 'active' : ''}`}
                onClick={() => handleModeSelect('json')}
              >
                json
              </button>
              <button
                className={`mode-btn ${mode === 'sql' ? 'active' : ''}`}
                onClick={() => handleModeSelect('sql')}
              >
                sql
              </button>
              <button
                className={`mode-btn ${mode === 'zen' ? 'active' : ''}`}
                onClick={() => handleModeSelect('zen')}
              >
                zen mode
              </button>
              <button
                className={`sudden-death-btn ${suddenDeath ? 'active' : ''}`}
                onClick={() => setSuddenDeath(!suddenDeath)}
                title="Sudden Death: 1 mistake or backspace = instant failure!"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>Sudden Death</span>
              </button>
            </div>

            {/* Sub-config bar for punctuation/numbers in word mode */}
            {mode === 'words' && (
              <div className="config-bar">
                <div className="config-group">
                  <button 
                    className={`config-btn ${!includePunctuation && !includeNumbers ? 'active' : ''}`}
                    onClick={() => {
                      setIncludePunctuation(false);
                      setIncludeNumbers(false);
                      startTestWith(mode, selectedTime, false, false);
                    }}
                  >
                    lowercase
                  </button>
                  <button 
                    className={`config-btn ${includePunctuation ? 'active' : ''}`}
                    onClick={() => {
                      const next = !includePunctuation;
                      setIncludePunctuation(next);
                      startTestWith(mode, selectedTime, next, includeNumbers);
                    }}
                  >
                    punctuation
                  </button>
                  <button 
                    className={`config-btn ${includeNumbers ? 'active' : ''}`}
                    onClick={() => {
                      const next = !includeNumbers;
                      setIncludeNumbers(next);
                      startTestWith(mode, selectedTime, includePunctuation, next);
                    }}
                  >
                    numbers
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Time selector (hidden in Zen mode) */}
          {status === 'idle' && mode !== 'zen' && (
            <div className="time-selector fade-in">
              <div className="time-roller">
                <div className="time-roller-mask" />
                <div
                  className="time-roller-track"
                  style={{ transform: `translateY(-${selectedTimeIndex * 2.2}rem)` }}
                >
                  {TIME_OPTIONS.map(t => (
                    <div key={t} className={`time-roller-item ${selectedTime === t ? 'active' : ''}`}>
                      {t}s
                    </div>
                  ))}
                </div>
              </div>
              <div className="time-dots">
                {TIME_OPTIONS.map(t => (
                  <button
                    key={t}
                    className={`time-dot ${selectedTime === t ? 'active' : ''}`}
                    onClick={() => handleTimeSelect(t)}
                    title={`${t} seconds`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Live Timer or Zen HUD */}
          {status === 'typing' && mode !== 'zen' && (
            <div className="timer-display">{timeLeft}</div>
          )}

          {status === 'typing' && mode === 'zen' && (
            <div className="zen-hud">
              <span className="zen-badge">Zen Session: {zenElapsed}s</span>
              <button
                className="zen-finish-btn"
                onClick={() => {
                  const finalHist = [...history];
                  if (currentWord.length > 0) finalHist.push(currentWord);
                  finishTest(startTime || Date.now(), finalHist, errors);
                }}
              >
                End Session (Shift+Enter)
              </button>
            </div>
          )}

          {/* Sudden Death Failure Notice */}
          {status === 'finished' && suddenDeathFailed && (
            <div className="sudden-death-fail-banner fade-in">
              {suddenDeathFailed}
            </div>
          )}

          {/* Main Stats Output */}
          {status === 'finished' && (
            <Stats
              wpm={wpm}
              rawWpm={rawWpm}
              accuracy={accuracy}
              consistency={consistency}
              visible={true}
              isFailed={Boolean(suddenDeathFailed)}
            />
          )}

          {/* Post-Test Key Burst Heatmap */}
          {status === 'finished' && heatmapAnalytics && (
            <KeyHeatmap analytics={heatmapAnalytics} />
          )}

          {/* Typing Area */}
          {status !== 'finished' && (
            <div className="typing-area-wrapper">
              <canvas ref={canvasRef} className="particle-canvas" />
              {capsLockOn && status === 'typing' && (
                <div className="capslock-indicator">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L3 14h6v6h6v-6h6L12 2z" />
                  </svg>
                  CAPS LOCK ACTIVE
                </div>
              )}
              <div className="typing-area" ref={typingAreaRef}>
                <div className="words-inner" ref={wordsInnerRef}>
                  <div ref={caretRef} className={`caret ${status === 'typing' ? 'typing' : ''}`} />
                  {renderWords()}
                </div>
              </div>
            </div>
          )}

          {/* Post-test feedback & restart */}
          {status === 'finished' && (
            <div className="restart-hint fade-in">
              {user && (
                <div className={`save-status ${isSaving ? 'saving' : saveSuccess ? 'success' : 'error'}`}>
                  {isSaving && 'Saving to cloud...'}
                  {!isSaving && saveSuccess === true && 'Stats saved to your profile!'}
                  {!isSaving && saveSuccess === false && 'Failed to save stats.'}
                </div>
              )}
              {!user && (
                <div className="save-status hint">Sign in to save your typing stats to the global leaderboard.</div>
              )}
            </div>
          )}
        </>
      )}

      {/* Full-page Leaderboard Tab */}
      {activeView === 'leaderboard' && (
        <Leaderboard onBack={() => setActiveView('test')} />
      )}

      {/* Full-page Account Tab */}
      {activeView === 'account' && (
        <Profile onBack={() => setActiveView('test')} />
      )}

      {/* Small subtle restart instruction positioned just above footer links */}
      {activeView === 'test' && (
        <div className={`restart-hint-bottom ${isFocused ? 'hint-dimmed' : ''}`}>
          press <kbd>tab</kbd> to restart at any time
        </div>
      )}

      {/* Footer */}
      <footer className={`footer ${isFocused ? 'header-hidden' : ''}`}>
        <div className="footer-links">
          <a href="#" onClick={e => e.preventDefault()}><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z"/></svg> Twitter</a>
          <a href="#" onClick={e => e.preventDefault()}><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.23 10.23 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.078.078 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.419-2.157 2.419z"/></svg> Discord</a>
          <a href="https://github.com/abdullah-netiz/typeblitz" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg> GitHub</a>
          <a href="#" onClick={e => e.preventDefault()} className="patreon"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M0 .48v23.04h4.22V.48zm15.385 0c-4.764 0-8.641 3.88-8.641 8.65 0 4.755 3.877 8.623 8.641 8.623 4.75 0 8.615-3.868 8.615-8.623 0-4.77-3.865-8.65-8.615-8.65z"/></svg> Support</a>
        </div>
        <div className="footer-info">
          <span>Privacy</span>
          <span>Security</span>
          <span>Contact</span>
          <span className="version">v2.0.0</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
