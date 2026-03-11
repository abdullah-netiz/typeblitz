import { useCallback, useEffect, useState, useRef } from 'react';
import './App.css';
import Stats from './components/Stats';
import Caret from './components/Caret';
import AuthModal from './components/AuthModal';
import Profile from './components/Profile';
import { useAuth } from './context/AuthContext';
import { generateWords } from './utils/wordGenerator';
import { calculateWPM } from './utils/wpmCalculator';

const TIME_OPTIONS = [15, 30, 60, 120] as const;
const WORDS_PER_SECOND = 3; // generate enough words to fill the timer

type TestStatus = 'idle' | 'typing' | 'finished';

function App() {
  const [words, setWords] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<number>(30);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  
  // Word-by-word tracking
  const [history, setHistory] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);
  
  const [status, setStatus] = useState<TestStatus>('idle');
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const [errors, setErrors] = useState<number>(0);
  
  // Stats
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  // Caret position
  const [caretPos, setCaretPos] = useState({ top: 0, left: 0 });
  const typingAreaRef = useRef<HTMLDivElement>(null);
  const wordsInnerRef = useRef<HTMLDivElement>(null);
  
  // Line scroll offset
  const [scrollOffset, setScrollOffset] = useState(0);

  // Authentication & UI State
  const { user, logOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);

  // Init words
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
    setScrollOffset(0);
  }, [selectedTime]);

  useEffect(() => {
    startNewTest();
  }, [startNewTest]);

  // Helper to compute final stats and finish test
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
  }, [words]);

  // Update Caret Position & Line Scroll
  useEffect(() => {
    if (!wordsInnerRef.current) return;
    
    const activeWordElements = wordsInnerRef.current.querySelectorAll(`.word[data-index="${activeWordIndex}"] > .letter, .word[data-index="${activeWordIndex}"] > .space`);
    
    let activeElement: Element | undefined;
    const inputLength = currentWord.length;

    if (activeWordElements.length > 0) {
      if (inputLength === 0) {
        activeElement = activeWordElements[0];
      } else if (inputLength < activeWordElements.length) {
        activeElement = activeWordElements[inputLength];
      } else {
        activeElement = activeWordElements[activeWordElements.length - 1];
      }
    }

    if (activeElement) {
      const innerRect = wordsInnerRef.current.getBoundingClientRect();
      const rect = activeElement.getBoundingClientRect();
      
      let left = rect.left - innerRect.left;
      const top = rect.top - innerRect.top;
      
      if (inputLength >= activeWordElements.length && inputLength > 0) {
         left += rect.width;
      }
      
      setCaretPos({ left, top });

      // Compute line height from first word element
      const firstWord = wordsInnerRef.current.querySelector('.word');
      if (firstWord) {
        const lineHeight = firstWord.getBoundingClientRect().height;
        // How many lines down is the active word (relative to un-scrolled position)?
        const activeLine = Math.round(top / lineHeight);
        // Keep the active word on the first visible line (scroll when it reaches line 1+)
        const targetScroll = Math.max(0, activeLine) * lineHeight;
        if (targetScroll !== scrollOffset) {
          setScrollOffset(targetScroll);
        }
      }
    }
  }, [currentWord, activeWordIndex, words, history, scrollOffset]);

  // Helper to sync stats dynamically
  const fetchDynamicStats = useCallback((currentStart: number, currentHist: string[], currentInput: string, currentErr: number) => {
     let totalTyped = 0;
     let correct = 0;
     currentHist.forEach((word, idx) => {
       totalTyped += word.length + 1;
       const expected = words[idx];
       for(let i=0; i<word.length; i++){ if(word[i] === expected[i]) correct++; }
       correct++;
     });
     
     totalTyped += currentInput.length;
     for(let i=0; i<currentInput.length; i++){
       if(words[activeWordIndex] && currentInput[i] === words[activeWordIndex][i]) correct++;
     }
     
     return calculateWPM(totalTyped, currentErr, currentStart, Date.now());
  }, [words, activeWordIndex]);

  // Handle Save to API
  const saveTypingResult = useCallback(async (finalWpm: number, finalAcc: number, timeTaken: number, wordCount: number) => {
    if (!user) return;
    
    setIsSaving(true);
    setSaveSuccess(null);

    try {
      const token = await user.getIdToken(true);
      const res = await fetch('http://localhost:5000/api/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          wpm: finalWpm,
          accuracy: finalAcc,
          wordCount,
          timeTakenMs: timeTaken
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
      } else {
        console.error("Failed to save result", await res.text());
        setSaveSuccess(false);
      }
    } catch (err) {
      console.error("Network error saving result", err);
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  // Countdown timer
  useEffect(() => {
    let interval: number;
    if (status === 'typing' && startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = selectedTime - elapsed;
        if (remaining <= 0) {
          setTimeLeft(0);
          // Time's up — finish
          const finalHist = [...history];
          if (currentWord.length > 0) {
            finalHist.push(currentWord);
          }
          finishTest(startTime, finalHist, errors);
          clearInterval(interval);
        } else {
          setTimeLeft(remaining);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [status, startTime, selectedTime, history, currentWord, errors, finishTest]);

  // Keyboard Event Handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (showAuthModal || showProfile) return;

    if (status === 'finished') {
      if (e.key === 'Tab') {
        e.preventDefault();
        startNewTest();
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      startNewTest();
      return;
    }

    if (e.key.length !== 1 && e.key !== 'Backspace') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();

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

      const expectedText = words[activeWordIndex];
      if (currentWord !== expectedText) {
         newErrors++;
         setErrors(newErrors);
      }

      setHistory(prev => [...prev, currentWord]);
      setCurrentWord('');
      setActiveWordIndex(prev => prev + 1);

      // Check if all words typed (unlikely with timer, but safety)
      if (activeWordIndex === words.length - 1) {
         const finalHist = [...history, currentWord];
         finishTest(currentStartTime || Date.now(), finalHist, newErrors);
      }
      return;
    }

    // Normal Character Input
    if (currentWord.length >= (words[activeWordIndex]?.length || 0) + 10) return;

    if (e.key !== words[activeWordIndex]?.[currentWord.length]) {
      newErrors++;
      setErrors(newErrors);
    }

    setCurrentWord(prev => prev + e.key);

  }, [status, words, startNewTest, currentWord, history, activeWordIndex, errors, startTime, showAuthModal, showProfile, finishTest]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Live WPM update interval
  useEffect(() => {
    let interval: number;
    if (status === 'typing' && startTime) {
      interval = setInterval(() => {
        const stats = fetchDynamicStats(startTime, history, currentWord, errors);
        setWpm(stats.wpm);
        setAccuracy(stats.accuracy);
      }, 500); 
    }
    return () => clearInterval(interval);
  }, [status, startTime, currentWord, history, errors, fetchDynamicStats]);

  const handleTimeSelect = (time: number) => {
    setSelectedTime(time);
    setTimeLeft(time);
  };

  const isFocused = status === 'typing';

  const renderWords = () => {
    return words.map((word, wIdx) => {
      let typedWord = "";
      if (wIdx < activeWordIndex) {
        typedWord = history[wIdx];
      } else if (wIdx === activeWordIndex) {
        typedWord = currentWord;
      }

      const isCurrent = wIdx === activeWordIndex;
      const isTyped = wIdx < activeWordIndex;
      const characters = word.split('');
      const lettersToRender = Math.max(characters.length, typedWord.length);

      let wordClass = "word";
      if (isTyped && typedWord !== word) {
        wordClass += " error-underline";
      }

      return (
        <span key={wIdx} data-index={wIdx} className={wordClass}>
          {Array.from({ length: lettersToRender }).map((_, cIdx) => {
            const char = characters[cIdx] || ''; 
            const typedChar = typedWord[cIdx];
            
            let charClass = "letter";
            let displayChar = char;

            if (isTyped || isCurrent) {
              if (cIdx >= characters.length) {
                charClass += " extra";
                displayChar = typedChar;
              } else if (typedChar === undefined) {
                charClass += "";
              } else if (typedChar === char) {
                charClass += " correct";
              } else {
                charClass += " incorrect";
              }
            }

            return (
              <span key={`${wIdx}-${cIdx}`} className={charClass}>
                {displayChar}
              </span>
            );
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
        <div className="logo">
          <span>type</span>blitz
        </div>
        
        <div className="auth-controls">
          {user ? (
            <div className="user-info">
               <span className="user-name" onClick={() => setShowProfile(true)} style={{cursor: 'pointer', textDecoration: 'underline'}}>
                  {user.displayName || user.email || 'Developer'}
               </span>
               <button className="auth-btn" onClick={logOut}>Sign Out</button>
            </div>
          ) : (
            <button className="auth-btn" onClick={() => setShowAuthModal(true)}>
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Time selector - hidden during typing */}
      {status === 'idle' && (
        <div className="time-selector fade-in">
          {TIME_OPTIONS.map(t => (
            <button
              key={t}
              className={`time-btn ${selectedTime === t ? 'active' : ''}`}
              onClick={() => handleTimeSelect(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Timer display - visible during typing */}
      {status === 'typing' && (
        <div className="timer-display">
          {timeLeft}
        </div>
      )}

      <Stats wpm={wpm} accuracy={accuracy} visible={status === 'finished'} />

      {status !== 'finished' && (
        <div className="typing-area" ref={typingAreaRef}>
          <div
            className="words-inner"
            ref={wordsInnerRef}
            style={{ transform: `translateY(-${scrollOffset}px)` }}
          >
            <Caret left={caretPos.left} top={caretPos.top} isTyping={status === 'typing'} />
            {renderWords()}
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
            <div className="save-status hint">
               Sign in to save your typing stats to the leaderboard.
            </div>
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
