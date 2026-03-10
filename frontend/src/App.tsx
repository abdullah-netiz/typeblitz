import { useCallback, useEffect, useState, useRef } from 'react';
import './App.css';
import Stats from './components/Stats';
import Caret from './components/Caret';
import AuthModal from './components/AuthModal';
import Profile from './components/Profile';
import { useAuth } from './context/AuthContext';
import { generateWords } from './utils/wordGenerator';
import { calculateWPM } from './utils/wpmCalculator';

const TEST_WORD_COUNT = 30;

type TestStatus = 'idle' | 'typing' | 'finished';

function App() {
  const [words, setWords] = useState<string[]>([]);
  
  // Phase 2 State: Word-by-word tracking
  const [history, setHistory] = useState<string[]>([]); // Typed words committed with Space
  const [currentWord, setCurrentWord] = useState<string>(''); // Currently typed word
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);
  
  const [status, setStatus] = useState<TestStatus>('idle');
  const [startTime, setStartTime] = useState<number | null>(null);
  
  // Cumulative errors typed
  const [errors, setErrors] = useState<number>(0);
  
  // Stats
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  // Caret position
  const [caretPos, setCaretPos] = useState({ top: 0, left: 0 });
  const typingAreaRef = useRef<HTMLDivElement>(null);

  // Authentication & UI State
  const { user, logOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);

  // Init words
  const startNewTest = useCallback(() => {
    setWords(generateWords(TEST_WORD_COUNT));
    setHistory([]);
    setCurrentWord('');
    setActiveWordIndex(0);
    setStatus('idle');
    setStartTime(null);
    setErrors(0);
    setWpm(0);
    setAccuracy(100);
    setSaveSuccess(null);
    setIsSaving(false);
  }, []);

  useEffect(() => {
    startNewTest();
  }, [startNewTest]);

  // Update Caret Position
  useEffect(() => {
    if (!typingAreaRef.current) return;
    
    // Select all letter and space elements in the active word
    const activeWordElements = typingAreaRef.current.querySelectorAll(`.word[data-index="${activeWordIndex}"] > .letter, .word[data-index="${activeWordIndex}"] > .space`);
    
    let activeElement: Element | undefined;
    const inputLength = currentWord.length;

    if (activeWordElements.length > 0) {
      if (inputLength === 0) {
        // Very beginning of the word
        activeElement = activeWordElements[0];
      } else if (inputLength < activeWordElements.length) {
        // Sitting on the next intended character
        activeElement = activeWordElements[inputLength];
      } else {
        // At the end of the word (or typing extra characters)
        activeElement = activeWordElements[activeWordElements.length - 1]; // Last rendered character
      }
    }

    if (activeElement) {
      const rect = activeElement.getBoundingClientRect();
      const parentRect = typingAreaRef.current.getBoundingClientRect();
      
      let left = rect.left - parentRect.left;
      const top = rect.top - parentRect.top;
      
      // If we typed all characters of the word, put the caret AFTER the last character
      if (inputLength >= activeWordElements.length && inputLength > 0) {
         left += rect.width;
      }
      
      setCaretPos({ left, top });
    }
  }, [currentWord, activeWordIndex, words, history]);

  // Helper to sync stats dynamically
  const fetchDynamicStats = useCallback((currentStart: number, currentHist: string[], currentInput: string, currentErr: number) => {
     let totalTyped = 0;
     let correct = 0;
     currentHist.forEach((word, idx) => {
       const wLength = word.length + 1; // +1 for the space that was used to commit
       totalTyped += wLength;
       // Count correct keystrokes
       const expected = words[idx];
       for(let i=0; i<word.length; i++){ if(word[i] === expected[i]) correct++; }
       correct++; // the space was "correct"
     });
     
     totalTyped += currentInput.length;
     for(let i=0; i<currentInput.length; i++){
       if(words[activeWordIndex] && currentInput[i] === words[activeWordIndex][i]) correct++;
     }
     
     return calculateWPM(totalTyped, currentErr, currentStart, Date.now());
  }, [words, activeWordIndex]);

  // Handle Save to API
  const saveTypingResult = useCallback(async (finalWpm: number, finalAcc: number, timeTaken: number, wordCount: number) => {
    if (!user) return; // Only save if logged in
    
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

  // Keyboard Event Handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (showAuthModal || showProfile) return; // Don't track typing when models are open

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
        // Simply remove the last character of current word
        setCurrentWord(prev => prev.slice(0, -1));
      } else if (activeWordIndex > 0) {
        // Go back to the previous word
        const prevWordIndex = activeWordIndex - 1;
        const previousTypedWord = history[prevWordIndex];
        
        // Remove the previous word from history
        const newHistory = [...history];
        newHistory.pop();
        
        setHistory(newHistory);
        setCurrentWord(previousTypedWord);
        setActiveWordIndex(prevWordIndex);
      }
      return;
    }

    if (e.key === ' ') {
      // Prevent committing if the word is entirely empty
      if (currentWord.length === 0) return;

      const expectedText = words[activeWordIndex];
      // Note: we don't automatically mark remainder spaces as errors according to classic Monkeytype logic.
      // E.g., if you type "t", space. It just shows the word as incorrectly finished.
      // But we can add an error to WPM total for missing characters.
      if (currentWord !== expectedText) {
         newErrors++;
         setErrors(newErrors);
      }

      setHistory(prev => [...prev, currentWord]);
      setCurrentWord('');
      setActiveWordIndex(prev => prev + 1);

      // Check if finished
      if (activeWordIndex === words.length - 1) {
         setStatus('finished');
         // Use the newly constructed history state for stats
         const finalHist = [...history, currentWord];
         const endTimeStr = Date.now();
         const timeTaken = endTimeStr - (currentStartTime || endTimeStr);
         
         const stats = fetchDynamicStats(currentStartTime || endTimeStr, finalHist, '', newErrors);
         setWpm(stats.wpm);
         setAccuracy(stats.accuracy);
         
         // Trigger Backend Save
         saveTypingResult(stats.wpm, stats.accuracy, timeTaken, words.length);
      }
      return;
    }

    // Normal Character Input
    const expectedChar = words[activeWordIndex]?.[currentWord.length];
    
    // Optional: Max length for extra chars
    if (currentWord.length >= (words[activeWordIndex]?.length || 0) + 10) return;

    if (e.key !== expectedChar) {
      newErrors++;
      setErrors(newErrors);
    }

    const nextInput = currentWord + e.key;
    setCurrentWord(nextInput);

  }, [status, words, startNewTest, currentWord, history, activeWordIndex, errors, startTime, fetchDynamicStats, showAuthModal, showProfile, saveTypingResult]);

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


  const renderWords = () => {
    return words.map((word, wIdx) => {
      // Determine what to display based on whether word is typed, currently typing, or future
      let typedWord = "";
      if (wIdx < activeWordIndex) {
        typedWord = history[wIdx];
      } else if (wIdx === activeWordIndex) {
        typedWord = currentWord;
      }

      const isCurrent = wIdx === activeWordIndex;
      const isTyped = wIdx < activeWordIndex;
      const characters = word.split('');
      
      // We also need to map extra characters typed beyond the word length
      const lettersToRender = Math.max(characters.length, typedWord.length);

      // Determine class for whole word underlining or errors if it was submitted incorrectly
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
                // Extra character typed
                charClass += " extra";
                displayChar = typedChar;
              } else if (typedChar === undefined) {
                // Not typed yet within the active word
                charClass += "";
              } else if (typedChar === char) {
                // Correctly typed
                charClass += " correct";
              } else {
                // Incorrectly typed
                charClass += " incorrect";
              }
            }

            return (
              <span key={`${wIdx}-${cIdx}`} className={charClass}>
                {displayChar}
              </span>
            );
          })}
          
          {/* Space between words - handled conceptually as the right boundary */}
          {wIdx !== words.length - 1 && (
             <span className={`space ${isTyped ? 'correct' : ''}`}>&nbsp;</span>
          )}
        </span>
      );
    });
  };

  return (
    <div className="typeblitz-container fade-in">
      <header className="header">
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

      <Stats wpm={wpm} accuracy={accuracy} visible={status === 'finished'} />

      {status !== 'finished' && (
        <div className="typing-area" ref={typingAreaRef}>
          <Caret left={caretPos.left} top={caretPos.top} isTyping={status === 'typing'} />
          {renderWords()}
        </div>
      )}

      {status === 'finished' && (
        <div className="restart-hint fade-in">
          <div>Test complete! Press <span>Tab</span> to restart.</div>
          
          {/* Cloud Save feedback */}
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
      
      {status !== 'finished' && (
        <div className="restart-hint">
          Press <span>Tab</span> to restart at any time.
        </div>
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showProfile && <Profile onClose={() => setShowProfile(false)} />}
    </div>
  );
}

export default App;
