import React, { useState, useEffect, useRef } from 'react';
import { audioSystem } from '../services/audioService';
import { 
  getAllReadingPreferences,
  onTypographyChange, 
  ReadingPreferences,
  SPEED_MAP
} from '../services/typographyService';

interface TypewriterBlockProps {
  text: string;
  isLast: boolean;
  onComplete?: () => void;
  onTypingStateChange?: (isTyping: boolean) => void;
}

const TypewriterBlock: React.FC<TypewriterBlockProps> = ({ 
  text, 
  isLast, 
  onComplete,
  onTypingStateChange 
}) => {
  const [prefs, setPrefs] = useState<ReadingPreferences>(getAllReadingPreferences);

  useEffect(() => {
    return onTypographyChange((newPrefs) => {
      setPrefs(newPrefs);
    });
  }, []);

  const speedMode = prefs.readingSpeed;
  const [displayedLength, setDisplayedLength] = useState(() => (isLast && speedMode !== 'instant' ? 0 : text.length));
  const [isTyping, setIsTyping] = useState(() => isLast && speedMode !== 'instant');
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (onTypingStateChange) {
      onTypingStateChange(isTyping);
    }
  }, [isTyping, onTypingStateChange]);

  const handleSkip = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setDisplayedLength(text.length);
    setIsTyping(false);
    if (onComplete) onComplete();
  };

  // Keyboard shortcut: Space, Enter or Escape skips typing
  useEffect(() => {
    if (!isTyping) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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

    const charDelay = SPEED_MAP[speedMode]?.delay ?? 14;

    intervalRef.current = window.setInterval(() => {
      if (i < text.length) {
        // Skip markdown bold tags instantly to avoid visible double asterisk glitch
        if (text.charAt(i) === '*' && text.charAt(i + 1) === '*') {
          i += 2;
        } else {
          i += 1;
          const char = text.charAt(i - 1);
          if (char !== ' ' && char !== '\n' && prefs.typingAudio) {
            if (Math.random() > 0.45) audioSystem.playTypingSound();
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
  }, [text, isLast, speedMode, prefs.typingAudio]);

  const displayedText = text.slice(0, displayedLength);
  const paragraphs = displayedText.split('\n');

  return (
    <div 
      className={`relative select-text ${isTyping ? 'cursor-pointer' : ''}`}
      onClick={isTyping ? handleSkip : undefined}
      title={isTyping ? "Haz click o pulsa [Espacio] para revelar el pasaje de inmediato" : undefined}
    >
      {paragraphs.map((paragraph, idx) => {
        if (paragraph.trim() === '') return null;

        const isFirstOfBlock = idx === 0;
        const dropCapClass = (isFirstOfBlock && isLast && prefs.dropCap) ? 'drop-cap' : '';

        // Repair incomplete markdown bold tags while streaming
        const numStars = (paragraph.match(/\*\*/g) || []).length;
        let safeParagraph = paragraph;
        if (numStars % 2 !== 0) {
          safeParagraph += '**';
        }

        const parts = safeParagraph.split(/(\*\*.*?\*\*)/g);

        return (
          <p 
            key={idx} 
            className={`mb-6 text-parchment tracking-wide transition-all duration-300 leading-relaxed ${dropCapClass}`}
            style={{
              fontSize: 'var(--penumbra-narrative-size, 1.25rem)',
              lineHeight: 'var(--penumbra-narrative-line-height, 1.75)',
              fontFamily: 'var(--penumbra-narrative-font, "Cormorant Garamond", serif)',
              textAlign: prefs.alignment === 'justify' ? 'justify' : 'left'
            }}
          >
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                return (
                  <strong key={i} className="text-bone font-bold drop-shadow-sm">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              if (part === '**') return null;
              return part;
            })}

            {/* Subtle animated feather cursor during active typing */}
            {isTyping && idx === paragraphs.length - 1 && (
              <span 
                className="inline-block w-2 h-4 bg-gold animate-pulse ml-1 align-middle shadow-[0_0_8px_rgba(197,160,89,0.8)]"
                title="Escribiendo..."
              />
            )}
          </p>
        );
      })}
    </div>
  );
};

export default TypewriterBlock;
