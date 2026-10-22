import React, { useState, useEffect, useRef } from 'react';
import { audioSystem } from '../services/audioService';

export type ReadingSpeed = 'normal' | 'fast' | 'instant';

interface TypewriterBlockProps {
  text: string;
  isLast: boolean;
  onComplete?: () => void;
}

const SPEED_MAP: Record<ReadingSpeed, number> = {
  normal: 14,
  fast: 5,
  instant: 0,
};

const TypewriterBlock: React.FC<TypewriterBlockProps> = ({ text, isLast, onComplete }) => {
  const [speedMode, setSpeedMode] = useState<ReadingSpeed>(() => {
    try {
      const saved = localStorage.getItem('penumbra_reading_speed') as ReadingSpeed;
      return saved === 'normal' || saved === 'fast' || saved === 'instant' ? saved : 'normal';
    } catch {
      return 'normal';
    }
  });

  const [displayedLength, setDisplayedLength] = useState(() => (isLast && speedMode !== 'instant' ? 0 : text.length));
  const [isTyping, setIsTyping] = useState(() => isLast && speedMode !== 'instant');
  const intervalRef = useRef<number | null>(null);

  const handleSetSpeed = (newSpeed: ReadingSpeed) => {
    setSpeedMode(newSpeed);
    try {
      localStorage.setItem('penumbra_reading_speed', newSpeed);
    } catch {}
    if (newSpeed === 'instant' && isTyping) {
      handleSkip();
    }
  };

  const handleSkip = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setDisplayedLength(text.length);
    setIsTyping(false);
    if (onComplete) onComplete();
  };

  // Keyboard shortcut: Space or Enter skips typing
  useEffect(() => {
    if (!isTyping) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTyping, text.length]);

  // Main typing effect loop
  useEffect(() => {
    if (!isLast) {
      setDisplayedLength(text.length);
      setIsTyping(false);
      return;
    }

    if (speedMode === 'instant') {
      setDisplayedLength(text.length);
      setIsTyping(false);
      if (onComplete) onComplete();
      return;
    }

    setDisplayedLength(0);
    setIsTyping(true);
    let i = 0;
    
    if (intervalRef.current) clearInterval(intervalRef.current);

    const charDelay = SPEED_MAP[speedMode] || 14;

    intervalRef.current = window.setInterval(() => {
      if (i < text.length) {
        // Skip markdown bold tags instantly to prevent visible star glitch
        if (text.charAt(i) === '*' && text.charAt(i + 1) === '*') {
          i += 2;
        } else {
          i += 1;
          const char = text.charAt(i - 1);
          if (char !== ' ' && char !== '\n') {
            if (Math.random() > 0.4) audioSystem.playTypingSound();
          }
        }
        setDisplayedLength(i);
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsTyping(false);
        if (onComplete) onComplete();
      }
    }, charDelay);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, isLast, speedMode]);

  const displayedText = text.slice(0, displayedLength);
  const paragraphs = displayedText.split('\n');

  return (
    <div className="relative group/typewriter">
      {/* READING SPEED & SKIP CONTROLS BAR (Only visible on the active/last passage) */}
      {isLast && (
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gold-dim/15 text-[10px] uppercase font-display tracking-widest text-parchment-dim select-none">
          <div className="flex items-center gap-1.5">
            <span className="text-gold-dim">⚡ Lectura:</span>
            <button
              onClick={() => handleSetSpeed('normal')}
              className={`px-2 py-0.5 rounded transition-all ${speedMode === 'normal' ? 'bg-gold/20 text-gold font-bold border border-gold/40' : 'hover:text-parchment hover:bg-white/5'}`}
              title="Velocidad habitual de la pluma"
            >
              1x
            </button>
            <button
              onClick={() => handleSetSpeed('fast')}
              className={`px-2 py-0.5 rounded transition-all ${speedMode === 'fast' ? 'bg-gold/20 text-gold font-bold border border-gold/40' : 'hover:text-parchment hover:bg-white/5'}`}
              title="Velocidad rápida"
            >
              2x
            </button>
            <button
              onClick={() => handleSetSpeed('instant')}
              className={`px-2 py-0.5 rounded transition-all ${speedMode === 'instant' ? 'bg-gold/20 text-gold font-bold border border-gold/40' : 'hover:text-parchment hover:bg-white/5'}`}
              title="Texto revelado inmediatamente"
            >
              Directo
            </button>
          </div>

          {isTyping && (
            <button
              onClick={handleSkip}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-void/80 hover:bg-gold/15 border border-gold-dim/40 hover:border-gold text-gold transition-all animate-pulse shadow-sm"
              title="Saltar animación (Espacio o Enter)"
            >
              <span>Revelar todo</span>
              <span className="text-[9px] opacity-60 font-mono">[Espacio]</span>
            </button>
          )}
        </div>
      )}

      {/* NARRATIVE TEXT PARAGRAPHS */}
      <div onClick={isTyping ? handleSkip : undefined} className={isTyping ? 'cursor-pointer' : ''} title={isTyping ? "Click o pulsa Espacio para saltar animación" : ""}>
        {paragraphs.map((paragraph, idx) => {
          if (paragraph.trim() === '') return null;

          const isFirstOfBlock = idx === 0;
          const dropCapClass = (isFirstOfBlock && isLast) ? 'drop-cap' : '';

          // Fix broken markdown tags if cut off midway through typing
          const numStars = (paragraph.match(/\*\*/g) || []).length;
          let safeParagraph = paragraph;
          if (numStars % 2 !== 0) {
            safeParagraph += '**';
          }

          const parts = safeParagraph.split(/(\*\*.*?\*\*)/g);

          return (
            <p key={idx} className={`mb-6 text-xl leading-relaxed text-parchment font-serif tracking-wide text-justify ${dropCapClass}`}>
              {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                  return <strong key={i} className="text-bone font-bold drop-shadow-sm">{part.slice(2, -2)}</strong>;
                }
                if (part === '**') return null;
                return part;
              })}
              {/* Typewriter cursor */}
              {isTyping && idx === paragraphs.length - 1 && (
                <span className="inline-block w-2 h-4 bg-gold animate-pulse ml-1 align-middle shadow-[0_0_8px_rgba(197,160,89,0.8)]"></span>
              )}
            </p>
          );
        })}
      </div>
    </div>
  );
};

export default TypewriterBlock;
