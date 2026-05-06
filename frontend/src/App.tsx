import { useCallback, useEffect, useState, useRef } from 'react';
import './App.css';
import Stats from './components/Stats';
import AuthModal from './components/AuthModal';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import { useAuth } from './context/AuthContext';
import { generateWords } from './utils/wordGenerator';
import { calculateWPM } from './utils/wpmCalculator';

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
  const [words, setWords] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<number>(30);
  const [timeLeft, setTimeLeft] = useState<number>(30);

  const [history, setHistory] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);

  const [status, setStatus] = useState<TestStatus>('idle');
  const [startTime, setStartTime] = useState<number | null>(null);

  const [errors, setErrors] = useState<number>(0);
  const [includePunctuation, setIncludePunctuation] = useState(false);
  const [includeNumbers, setIncludeNumbers] = useState(false);

  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  // Smooth caret via direct DOM manipulation (no React rerenders)
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

  const { user, logOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // --- Init ---
  const startNewTest = useCallback(() => {
    const wordCount = selectedTime * WORDS_PER_SECOND;
    setWords(generateWords(wordCount, { punctuation: includePunctuation, numbers: includeNumbers }));
    setHistory([]);
    setCurrentWord('');
    setActiveWordIndex(0);
    setStatus('idle');
    setStartTime(null);
    setTimeLeft(selectedTime);
    setErrors(0);
    setWpm(0);
    setAccuracy(100);
    setSaveSuccess(null);
    setIsSaving(false);
    scrollOffsetRef.current = 0;
    currentWpmRef.current = 0;
    particlesRef.current = [];
    if (wordsInnerRef.current) {
      wordsInnerRef.current.style.transform = 'translate3d(0,0,0)';
    }
  }, [selectedTime, includePunctuation, includeNumbers]);

  useEffect(() => {
    startNewTest();
  }, [startNewTest]);

  // --- Save to API ---
  const saveTypingResult = useCallback(async (finalWpm: number, finalAcc: number, timeTaken: number, wordCount: number) => {
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
  }, [user]);

  const finishTest = useCallback((currentStartTime: number, finalHist: string[], currentErr: number) => {
    setStatus('finished');
    const endTime = Date.now();
    const timeTaken = endTime - currentStartTime;
    let totalTyped = 0;
    let correct = 0;
    finalHist.forEach((word, idx) => {
      totalTyped += word.length + 1;
      const expected = words[idx];
      for (let i = 0; i < word.length; i++) { if (word[i] === expected[i]) correct++; }
      correct++;
    });
    const stats = calculateWPM(totalTyped, currentErr, currentStartTime, endTime);
    setWpm(stats.wpm);
    setAccuracy(stats.accuracy);
    saveTypingResult(stats.wpm, stats.accuracy, timeTaken, finalHist.length);
  }, [words, saveTypingResult]);

  // --- Smooth caret positioning via rAF (bypasses React batching) ---
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
    let correct = 0;
    currentHist.forEach((word, idx) => {
      totalTyped += word.length + 1;
      const expected = words[idx];
      for (let i = 0; i < word.length; i++) { if (word[i] === expected[i]) correct++; }
      correct++;
    });
    totalTyped += currentInput.length;
    for (let i = 0; i < currentInput.length; i++) {
      if (words[activeWordIndex] && currentInput[i] === words[activeWordIndex][i]) correct++;
    }
    return calculateWPM(totalTyped, currentErr, currentStart, Date.now());
  }, [words, activeWordIndex]);

  // --- Countdown timer ---
  useEffect(() => {
    let interval: number;
    if (status === 'typing' && startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = selectedTime - elapsed;
        if (remaining <= 0) {
          setTimeLeft(0);
          const finalHist = [...history];
          if (currentWord.length > 0) finalHist.push(currentWord);
          finishTest(startTime, finalHist, errors);
          clearInterval(interval);
        } else {
          setTimeLeft(remaining);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [status, startTime, selectedTime, history, currentWord, errors, finishTest]);

  // --- Keyboard handler ---
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Detect caps lock
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }

    if (showAuthModal || showProfile || showLeaderboard) return;
    if (status === 'finished') {
      if (e.key === 'Tab') { e.preventDefault(); startNewTest(); }
      return;
    }
    if (e.key === 'Tab') { e.preventDefault(); startNewTest(); return; }
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
    let newErrors = errors;

    if (e.key === 'Backspace') {
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

    if (e.key === ' ') {
      if (currentWord.length === 0) return;
      if (currentWord !== words[activeWordIndex]) { newErrors++; setErrors(newErrors); }
      setHistory(prev => [...prev, currentWord]);
      setCurrentWord('');
      setActiveWordIndex(prev => prev + 1);
      if (activeWordIndex === words.length - 1) {
        finishTest(currentStartTime || Date.now(), [...history, currentWord], newErrors);
      }
      return;
    }

    if (currentWord.length >= (words[activeWordIndex]?.length || 0) + 10) return;
    if (e.key !== words[activeWordIndex]?.[currentWord.length]) { newErrors++; setErrors(newErrors); }
    setCurrentWord(prev => prev + e.key);
  }, [status, words, startNewTest, currentWord, history, activeWordIndex, errors, startTime, showAuthModal, showProfile, showLeaderboard, finishTest]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // --- Live WPM ---
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

  // --- Particle system on canvas ---
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

    const spawnParticle = () => {
      particlesRef.current.push({
        x: w * 0.95 + Math.random() * w * 0.05,
        y: h * 0.2 + Math.random() * h * 0.6,
        vx: -(1.5 + Math.random() * 3),
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

      // Spawn rate: 0 at idle, ramps up with WPM
      const spawnRate = activity > 0.05 ? Math.min(wpmNow / 12, 10) * activity : 0;

      if (spawnRate > 0 && time - lastSpawn > 1000 / Math.max(spawnRate, 1)) {
        spawnParticle();
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

        if (p.life >= p.maxLife || alpha < 0.005 || p.x < -20) {
          particles.splice(i, 1);
          continue;
        }

        // Draw streak
        const streakLen = p.size * 4 * speedMult;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + streakLen, p.y);
        ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
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

  // --- Time selection ---
  const handleTimeSelect = (time: number) => {
    if (time === selectedTime) return;
    setSelectedTime(time);
    setTimeLeft(time);
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
      <header className={`header ${isFocused ? 'header-hidden' : ''}`}>
        <div className="logo" onClick={() => startNewTest()} style={{cursor: 'pointer'}}>
          <span>type</span>blitz
        </div>
        <div className="header-right">
          <button className="icon-btn" onClick={() => setShowLeaderboard(true)} title="Leaderboard">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
          </button>
          
          <button className="icon-btn" onClick={() => setShowNotifications(!showNotifications)} title="Notifications">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <span className="dot" />
          </button>

          <div className="auth-controls">
            {user ? (
              <div className="user-nav">
                <button className="icon-btn user-avatar" onClick={() => setShowProfile(!showProfile)}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" />
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  )}
                </button>
                {showProfile && (
                  <div className="dropdown-menu">
                    <div className="dropdown-header">
                      <strong>{user.displayName || 'Typist'}</strong>
                      <span>{user.email}</span>
                    </div>
                    <button onClick={() => { setShowProfile(false); setShowProfile(true); }}>Account Details</button>
                    <button onClick={logOut}>Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <button className="auth-btn" onClick={() => setShowAuthModal(true)}>Sign In</button>
            )}
          </div>
        </div>
      </header>

      {showNotifications && (
        <div className="notifications-dropdown fade-in">
          <div className="dropdown-header">Notifications</div>
          <div className="notification-item">Welcome to TypeBlitz! Start typing to see your stats.</div>
          <div className="notification-item dimmed">Join the leaderboard to compete with others.</div>
        </div>
      )}

      <div className={`config-bar ${isFocused ? 'header-hidden' : ''}`}>
        <div className="config-group">
          <button 
            className={`config-btn ${!includePunctuation && !includeNumbers ? 'active' : ''}`}
            onClick={() => { setIncludePunctuation(false); setIncludeNumbers(false); }}
          >
            lowercase
          </button>
          <button 
            className={`config-btn ${includePunctuation ? 'active' : ''}`}
            onClick={() => setIncludePunctuation(!includePunctuation)}
          >
            punctuation
          </button>
          <button 
            className={`config-btn ${includeNumbers ? 'active' : ''}`}
            onClick={() => setIncludeNumbers(!includeNumbers)}
          >
            numbers
          </button>
        </div>
      </div>

      {/* Rolling time selector */}
      {status === 'idle' && (
        <div className="time-selector fade-in">
          <div className="time-roller">
            <div className="time-roller-mask" />
            <div
              className="time-roller-track"
              style={{ transform: `translateY(-${selectedTimeIndex * 2.4}rem)` }}
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
              />
            ))}
          </div>
        </div>
      )}

      {status === 'typing' && (
        <div className="timer-display">{timeLeft}</div>
      )}

      <Stats wpm={wpm} accuracy={accuracy} visible={status === 'finished'} />

      {status !== 'finished' && (
        <div className="typing-area-wrapper">
          <canvas ref={canvasRef} className="particle-canvas" />
          {capsLockOn && status === 'typing' && (
            <div className="capslock-indicator">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L3 14h6v6h6v-6h6L12 2z" />
              </svg>
              CAPS LOCK
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

      {status === 'finished' && (
        <div className="restart-hint fade-in">
          <div>Test complete! Press <span>Tab</span> to restart.</div>
          {user && (
            <div className={`save-status ${isSaving ? 'saving' : saveSuccess ? 'success' : 'error'}`}>
              {isSaving && 'Saving to cloud...'}
              {!isSaving && saveSuccess === true && 'Stats saved to your profile!'}
              {!isSaving && saveSuccess === false && 'Failed to save stats.'}
            </div>
          )}
          {!user && (
            <div className="save-status hint">Sign in to save your typing stats to the leaderboard.</div>
          )}
        </div>
      )}

      <div className={`restart-hint ${isFocused ? 'hint-dimmed' : ''}`}>
        Press <span>Tab</span> to restart at any time.
      </div>

      <footer className={`footer ${isFocused ? 'header-hidden' : ''}`}>
        <div className="footer-links">
          <a href="#" onClick={e => e.preventDefault()}><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z"/></svg> Twitter</a>
          <a href="#" onClick={e => e.preventDefault()}><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.23 10.23 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.419-2.157 2.419z"/></svg> Discord</a>
          <a href="#" onClick={e => e.preventDefault()}><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg> GitHub</a>
          <a href="#" onClick={e => e.preventDefault()} className="patreon"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M0 .48v23.04h4.22V.48zm15.385 0c-4.764 0-8.641 3.88-8.641 8.65 0 4.755 3.877 8.623 8.641 8.623 4.75 0 8.615-3.868 8.615-8.623 0-4.77-3.865-8.65-8.615-8.65z"/></svg> Support</a>
        </div>
        <div className="footer-info">
          <span>Privacy</span>
          <span>Security</span>
          <span>Contact</span>
          <span className="version">v1.2.0</span>
        </div>
      </footer>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showProfile && <Profile onClose={() => setShowProfile(false)} />}
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
}

export default App;
