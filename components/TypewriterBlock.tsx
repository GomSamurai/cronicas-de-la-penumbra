import React, { useState, useEffect } from 'react';
import { audioSystem } from '../services/audioService';

interface TypewriterBlockProps {
  text: string;
  isLast: boolean;
  speed?: number; // ms per char
}

const TypewriterBlock: React.FC<TypewriterBlockProps> = ({ text, isLast, speed = 12 }) => {
  const [displayedLength, setDisplayedLength] = useState(isLast ? 0 : text.length);
  const [isTyping, setIsTyping] = useState(isLast);
  
  useEffect(() => {
    if (!isLast) {
      setDisplayedLength(text.length);
      setIsTyping(false);
      return;
    }

    setDisplayedLength(0);
    setIsTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      // Type multiple characters at once if needed, but 1 is usually fine
      if (i < text.length) {
        // Skip markdown asterisks instantly so we don't type out formatting characters
        if (text.charAt(i) === '*' && text.charAt(i+1) === '*') {
           i += 2;
        } else {
           i += 1;
           // Play sound for visible characters
           const char = text.charAt(i-1);
           if (char !== ' ' && char !== '\n') {
              // Throttle sound slightly based on random to avoid audio clipping
              if (Math.random() > 0.3) audioSystem.playTypingSound();
           }
        }
        setDisplayedLength(i);
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, isLast, speed]);

  useEffect(() => {
    const handleGlobalClick = () => {
      if (isTyping) {
        setDisplayedLength(text.length);
        setIsTyping(false);
      }
    };

    if (isTyping) {
       // Timeout ensures it doesn't trigger on the same click that started the narrative
       setTimeout(() => window.addEventListener('click', handleGlobalClick), 50);
    }

    return () => window.removeEventListener('click', handleGlobalClick);
  }, [isTyping, text.length]);

  const handleSkip = () => {
    if (isTyping) {
      setDisplayedLength(text.length);
      setIsTyping(false);
    }
  };

  const displayedText = text.slice(0, displayedLength);

  // We preserve original empty lines by just splitting by \n
  const paragraphs = displayedText.split('\n');
  
  return (
    <div onClick={handleSkip} className={isTyping ? 'cursor-pointer' : ''} title={isTyping ? "Click para saltar animación" : ""}>
       {paragraphs.map((paragraph, idx) => {
         if (paragraph.trim() === '') return null; // Skip completely empty lines
         
         const isFirstOfBlock = idx === 0;
         const dropCapClass = (isFirstOfBlock && isLast) ? 'drop-cap' : '';
         
         // Fix broken markdown if cut off mid-way:
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
             {/* Cursor is shown on the last paragraph being typed */}
             {isTyping && idx === paragraphs.length - 1 && <span className="inline-block w-2 h-4 bg-gold animate-pulse ml-1 align-middle"></span>}
           </p>
         );
       })}
    </div>
  );
};

export default TypewriterBlock;
