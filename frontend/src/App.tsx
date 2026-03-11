import { useCallback, useEffect, useState, useRef } from 'react';
import './App.css';
import Stats from './components/Stats';
import AuthModal from './components/AuthModal';
import Profile from './components/Profile';
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

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);

  // --- Init ---
  const startNewTest = useCallback(() => {
    const wordCount = selectedTime * WORDS_PER_SECOND;
    setWords(generateWords(wordCount));
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
  }, [selectedTime]);

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
    if (showAuthModal || showProfile) return;
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
  }, [status, words, startNewTest, currentWord, history, activeWordIndex, errors, startTime, showAuthModal, showProfile, finishTest]);

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
        ctx.strokeStyle = `rgba(212, 165, 49, ${alpha})`;
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
        <div className="logo"><span>type</span>blitz</div>
        <div className="auth-controls">
          {user ? (
            <div className="user-info">
              <span className="user-name" onClick={() => setShowProfile(true)} style={{cursor: 'pointer', textDecoration: 'underline'}}>
                {user.displayName || user.email || 'Developer'}
              </span>
              <button className="auth-btn" onClick={logOut}>Sign Out</button>
            </div>
          ) : (
            <button className="auth-btn" onClick={() => setShowAuthModal(true)}>Sign In</button>
          )}
        </div>
      </header>

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

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showProfile && <Profile onClose={() => setShowProfile(false)} />}
    </div>
  );
}

export default App;
