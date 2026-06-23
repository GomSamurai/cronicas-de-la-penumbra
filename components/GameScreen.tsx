import React, { useState, useEffect, useRef } from 'react';
import { GameState, TurnData, CharacterAttributes, InventoryItem, DiceRollLogEntry, NarrativeThread, Trauma, Phobia } from '../types';
import { audioSystem } from '../services/audioService';
import TypewriterBlock from './TypewriterBlock';
import { exportStoryToPDF } from '../services/exportService';
import AudioController from './AudioController';

interface GameScreenProps {
  gameState: GameState;
  onAction: (action: string) => void;
  onRegisterDiceRoll: (entry: DiceRollLogEntry) => void;
  isLoading: boolean;
  onSave: () => void;
  onLoad: (file: File) => void;
  onReset: () => void;
}

type MobileTab = 'character' | 'narrative' | 'inventory';

const GameScreen: React.FC<GameScreenProps> = ({ gameState, onAction, onRegisterDiceRoll, isLoading, onSave, onLoad, onReset }) => {
  const [customInput, setCustomInput] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('narrative');
  const [showExitModal, setShowExitModal] = useState(false);
  const [showDiceLog, setShowDiceLog] = useState(false);
  
  // Inventory Interaction State
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [combineSource, setCombineSource] = useState<string | null>(null);
  const [itemChatInput, setItemChatInput] = useState('');
  const [showItemChat, setShowItemChat] = useState(false);

  // Thread Interaction State
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  // Dice Rolling State
  const [diceRolling, setDiceRolling] = useState(false);
  const [rollResult, setRollResult] = useState<number | null>(null);
  const [waitingForDismiss, setWaitingForDismiss] = useState(false);

  // Visual Effects State
  const [showDamageFlash, setShowDamageFlash] = useState(false);
  
  // --- VISCERAL INSTABILITY STATE ---
  const [aberrationAmount, setAberrationAmount] = useState('0px');
  const [isTextGlitching, setIsTextGlitching] = useState(false);
  
  const prevHpRef = useRef(gameState.hp);
  const glitchTimeoutRef = useRef<number | null>(null);
  const aberrationTimeoutRef = useRef<number | null>(null);

  // Refs for scrolling
  const lastTurnRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomControlsRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const itemChatInputRef = useRef<HTMLInputElement>(null);
  const diceSectionRef = useRef<HTMLDivElement>(null);
  
  const turnRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Game Over State
  const isDead = gameState.hp <= 0;

  useEffect(() => {
    audioSystem.setMode('game');
    
    // Cleanup heartbeat when leaving game
    return () => {
       audioSystem.updateHeartbeat(100, 100); 
       if (glitchTimeoutRef.current) window.clearTimeout(glitchTimeoutRef.current);
       if (aberrationTimeoutRef.current) window.clearTimeout(aberrationTimeoutRef.current);
    };
  }, []);

  // --- VISCERAL FEEDBACK LOGIC ---
  useEffect(() => {
     // 1. Damage Flash Logic
     if (gameState.hp < prevHpRef.current) {
        setShowDamageFlash(true);
        setTimeout(() => setShowDamageFlash(false), 500);
     }
     prevHpRef.current = gameState.hp;

     // 2. Heartbeat Audio Logic
     audioSystem.updateHeartbeat(gameState.hp, gameState.maxHp);
  }, [gameState.hp, gameState.maxHp]);

  // --- CALCULATE SEVERITY ---
  const calculateSeverity = () => {
      // Thresholds: Effects only start appearing if stats drop below 50%
      const THRESHOLD = 0.5;

      const hpRatio = gameState.hp / gameState.maxHp;
      const sanityRatio = gameState.sanity / 100;
      
      // STRICT SAFE ZONE: If both are fine, return 0 immediately
      if (hpRatio >= THRESHOLD && sanityRatio >= THRESHOLD) {
         return 0;
      }

      // Calculate severity (0.0 to 1.0 per stat)
      // Formula: 1 - (Current / Threshold). 
      // Ex: 0.25 HP (25%) / 0.5 Threshold = 0.5. 1 - 0.5 = 0.5 Severity.
      const hpSeverity = hpRatio < THRESHOLD ? (1 - (hpRatio / THRESHOLD)) : 0; 
      const sanitySeverity = sanityRatio < THRESHOLD ? (1 - (sanityRatio / THRESHOLD)) : 0;

      return hpSeverity + sanitySeverity;
  };

  // --- LOOP 1: TEXT BLUR/SHAKE (Independent) ---
  useEffect(() => {
      const totalSeverity = calculateSeverity();

      // Only schedule if there is ANY severity
      if (totalSeverity > 0) {
         const scheduleGlitch = () => {
            // Safety cap for timing math
            const safeSeverity = Math.min(totalSeverity, 1.5);
            
            // Base wait time: 
            // Low severity (0.1) -> ~45 seconds
            // High severity (1.5) -> ~15 seconds
            const severityFactor = (1.5 - safeSeverity) / 1.5; 
            const baseWait = 15000 + (severityFactor * 30000); 
            const randomVariance = Math.random() * 20000;
            const totalDelay = baseWait + randomVariance;

            glitchTimeoutRef.current = window.setTimeout(() => {
               setIsTextGlitching(true);
               
               setTimeout(() => {
                  setIsTextGlitching(false);
                  scheduleGlitch();
               }, 1200);

            }, totalDelay);
         };

         scheduleGlitch();
      } else {
         // CLEANUP: If healthy, ensure no pending glitches and reset state
         if (glitchTimeoutRef.current) window.clearTimeout(glitchTimeoutRef.current);
         setIsTextGlitching(false);
      }

      return () => {
         if (glitchTimeoutRef.current) window.clearTimeout(glitchTimeoutRef.current);
      };
  }, [gameState.hp, gameState.maxHp, gameState.sanity]);


  // --- LOOP 2: CHROMATIC ABERRATION PULSE (Independent) ---
  useEffect(() => {
      const totalSeverity = calculateSeverity();

      if (totalSeverity > 0) {
         const scheduleAberration = () => {
            const safeSeverity = Math.min(totalSeverity, 1.5);
            
            // Base wait time: Slightly different than glitch to desync them
            const severityFactor = (1.5 - safeSeverity) / 1.5; 
            const baseWait = 12000 + (severityFactor * 28000); 
            const randomVariance = Math.random() * 25000;
            const totalDelay = baseWait + randomVariance;

            aberrationTimeoutRef.current = window.setTimeout(() => {
               // Trigger Aberration
               // Max offset scales with severity
               const maxOffset = totalSeverity * 2.5; 
               setAberrationAmount(`${maxOffset.toFixed(2)}px`);
               
               // Hold for short burst then reset
               setTimeout(() => {
                  setAberrationAmount('0px');
                  scheduleAberration();
               }, 600); // 600ms pulse

            }, totalDelay);
         };

         scheduleAberration();
      } else {
         // CLEANUP: If healthy, ensure no pending aberration and reset state
         if (aberrationTimeoutRef.current) window.clearTimeout(aberrationTimeoutRef.current);
         setAberrationAmount('0px');
      }

      return () => {
         if (aberrationTimeoutRef.current) window.clearTimeout(aberrationTimeoutRef.current);
      };
  }, [gameState.hp, gameState.maxHp, gameState.sanity]);


  // Determine Low Health Visual Pulse (Vignette)
  const isAgony = gameState.hp < (gameState.maxHp * 0.4);

  // ------------------------------

  useEffect(() => {
    setShowOptions(false);
    if (window.innerWidth < 1024) {
      setMobileTab('narrative');
    }
    setRollResult(null);
    setDiceRolling(false);
    setWaitingForDismiss(false);
    setSelectedItem(null);
    setCombineSource(null);
    setShowItemChat(false);
    setItemChatInput('');
    setSelectedThreadId(null);
  }, [gameState.turnCount]);

  useEffect(() => {
    if (!isLoading && mobileTab === 'narrative' && scrollContainerRef.current) {
       if (gameState.narrativeHistory.length === 1) {
          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
       } else if (lastTurnRef.current) {
          setTimeout(() => {
             lastTurnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
       }
    }
  }, [gameState.narrativeHistory.length, isLoading, mobileTab]);

  useEffect(() => {
    if (isLoading && loadingRef.current && mobileTab === 'narrative') {
      setTimeout(() => {
        loadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isLoading, mobileTab]);

  useEffect(() => {
    if (showOptions && mobileTab === 'narrative') {
      setTimeout(() => {
        if (lastTurnRef.current) {
          lastTurnRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } else if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' });
        }
      }, 150);
    }
  }, [showOptions, mobileTab]);

  useEffect(() => {
    if (showItemChat && itemChatInputRef.current) {
      itemChatInputRef.current.focus();
    }
  }, [showItemChat]);

  // --- ATTRIBUTE CALCULATION LOGIC ---
  const getEffectiveAttribute = (attr: keyof CharacterAttributes, baseValue: number) => {
     let modifier = 0;
     if (gameState.traumas) {
       gameState.traumas.forEach(t => {
         if (t.modifier && t.modifier.attribute === attr) {
            modifier += t.modifier.value;
         }
       });
     }
     return {
        value: baseValue + modifier,
        isPenalized: modifier < 0
     };
  };

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim() && !isLoading && !isDead) {
      audioSystem.playLowButton();
      onAction(customInput);
      setCustomInput('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoad(file);
    }
  };

  const scrollToTurn = (index: number) => {
    audioSystem.playClick();
    setMobileTab('narrative');
    setTimeout(() => {
      const element = turnRefs.current[index];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('bg-gold-dim/10');
        setTimeout(() => element.classList.remove('bg-gold-dim/10'), 1500);
      }
    }, 100);
  };

  const handleRollDice = (e: React.MouseEvent) => {
    if (!gameState.pendingChallenge || isDead) return;
    e.stopPropagation(); 
    diceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    audioSystem.playDiceRoll();
    setDiceRolling(true);
    
    setTimeout(() => {
      const d20 = Math.floor(Math.random() * 20) + 1;
      setRollResult(d20);
      setDiceRolling(false);
      setWaitingForDismiss(true);
      
      const attrKey = gameState.pendingChallenge!.attribute;
      const baseAttr = gameState.character.attributes[attrKey];
      const effectiveAttr = getEffectiveAttribute(attrKey, baseAttr).value;

      const total = d20 + effectiveAttr;
      const success = total >= gameState.pendingChallenge!.difficulty;
      
      if (success || d20 === 20) {
        setTimeout(() => audioSystem.playSuccess(), 200);
      }
    }, 1500);
  };

  const handleDismissResult = () => {
    if (!waitingForDismiss || rollResult === null || !gameState.pendingChallenge) return;
    audioSystem.playClick();
    
    const d20 = rollResult;
    const attrKey = gameState.pendingChallenge.attribute;
    const baseAttr = gameState.character.attributes[attrKey];
    const effectiveAttr = getEffectiveAttribute(attrKey, baseAttr).value;

    const total = d20 + effectiveAttr;
    const success = total >= gameState.pendingChallenge.difficulty;
    
    let resultType: 'success' | 'failure' | 'critical' | 'fumble' = success ? 'success' : 'failure';
    let resultText = success ? 'ÉXITO' : 'FALLO';
    
    if (d20 === 20) { resultText = 'CRÍTICO'; resultType = 'critical'; }
    if (d20 === 1) { resultText = 'PIFIA'; resultType = 'fumble'; }

    onRegisterDiceRoll({
      turnIndex: gameState.turnCount,
      attribute: attrKey,
      roll: d20,
      modifier: effectiveAttr, // Store effective modifier
      total: total,
      difficulty: gameState.pendingChallenge.difficulty,
      result: resultType,
      context: gameState.pendingChallenge.context,
      timestamp: Date.now()
    });

    const systemMsg = `[SISTEMA] Tirada de ${attrKey.toUpperCase()}: D20(${d20}) + Total(${effectiveAttr}) = ${total}. DC: ${gameState.pendingChallenge.difficulty}. Resultado: ${resultText}.`;
    onAction(systemMsg);
    setWaitingForDismiss(false);
  };

  // --- ITEM ACTIONS ---
  const handleItemClick = (itemName: string) => {
    if (waitingForDismiss || diceRolling || isDead) return;
    audioSystem.playClick();
    if (combineSource) {
      if (combineSource !== itemName) handleCombineFinish(itemName);
      else setCombineSource(null);
    } else {
      setSelectedItem(selectedItem === itemName ? null : itemName);
      setShowItemChat(false);
    }
  };

  // --- THREAD ACTIONS ---
  const handleThreadClick = (threadId: string) => {
    if (waitingForDismiss || diceRolling || isDead) return;
    audioSystem.playClick();
    setSelectedThreadId(threadId);
  };

  const handleUseItem = (itemName: string) => {
    audioSystem.playLowButton();
    onAction(`[USAR] ${itemName}`);
    setSelectedItem(null);
  };

  const handleInspectItem = (itemName: string) => {
    audioSystem.playClick();
    onAction(`[INSPECCIONAR] ${itemName}`);
    setSelectedItem(null);
  };

  const handleDiscardItem = (itemName: string) => {
    if (confirm(`¿Abandonar ${itemName} para siempre?`)) {
      audioSystem.playLowButton();
      onAction(`[TIRAR] ${itemName}`);
      setSelectedItem(null);
    }
  };

  const handleCombineStart = (itemName: string) => {
    audioSystem.playClick();
    setCombineSource(itemName);
    setSelectedItem(null);
  };

  const handleCombineFinish = (targetItemName: string) => {
     if (!combineSource) return;
     audioSystem.playSuccess();
     onAction(`[COMBINAR] ${combineSource} con ${targetItemName}`);
     setCombineSource(null);
  };

  const handleItemChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemChatInput.trim() && selectedItem) {
       audioSystem.playLowButton();
       onAction(`[ACCION_ITEM] ${selectedItem} | ${itemChatInput}`);
       setItemChatInput('');
       setSelectedItem(null);
    }
  };

  const hpPercent = Math.min(100, (gameState.hp / gameState.maxHp) * 100);
  const sanityPercent = Math.min(100, gameState.sanity); 
  const cleanArchetype = (fullStr: string) => fullStr.split('(')[0].trim();
  const maxInventorySlots = 6 + Math.floor(gameState.character.attributes.fuerza / 2);
  const currentInventoryCount = gameState.inventory.length;
  const isOverburdened = currentInventoryCount > maxInventorySlots;

  const getConditionText = () => {
     if (gameState.hp <= 0) return "Fallecido";
     if (gameState.hp < gameState.maxHp * 0.25) return "Agónico";
     if (gameState.sanity < 20) return "Demente";
     if (gameState.hp < gameState.maxHp * 0.5) return "Malherido";
     if (gameState.sanity < 50) return "Perturbado";
     if (gameState.hp < gameState.maxHp) return "Magullado";
     return "Vigoroso";
  };
  const conditionText = getConditionText();

  const activeItemObj = selectedItem ? gameState.inventory.find(i => i.name === selectedItem) : null;
  const activeThreadObj = selectedThreadId ? gameState.activeThreads.find(t => t.id === selectedThreadId) : null;

  const getRollResultText = () => {
     if (rollResult === null || !gameState.pendingChallenge) return null;
     if (rollResult === 20) return { text: "¡CRÍTICO!", color: "text-gold animate-pulse" };
     if (rollResult === 1) return { text: "¡PIFIA!", color: "text-blood-bright animate-pulse" };
     
     const attrKey = gameState.pendingChallenge.attribute;
     const effectiveAttr = getEffectiveAttribute(attrKey, gameState.character.attributes[attrKey]).value;

     const total = rollResult + effectiveAttr;
     const success = total >= gameState.pendingChallenge.difficulty;
     return success ? { text: "ÉXITO", color: "text-gold" } : { text: "FALLO", color: "text-blood-bright" };
  };
  const resultInfo = getRollResultText();

  // Combine Traumas and Phobias for display if any exist
  const hasAfflictions = (gameState.traumas && gameState.traumas.length > 0) || (gameState.phobias && gameState.phobias.length > 0);

  return (
    <div className={`fixed inset-0 bg-void text-parchment overflow-hidden font-serif selection:bg-blood selection:text-white transition-all duration-1000`}>
      
      {/* --- ATMOSPHERIC LAYERS --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-texture opacity-30"></div>
          
          {/* Base Vignette */}
          <div className="absolute inset-0 bg-vignette animate-pulse-slow"></div>

          {/* Agony Vignette (Low HP) */}
          <div className={`absolute inset-0 bg-gradient-radial from-transparent to-blood/40 mix-blend-overlay transition-opacity duration-1000 ${isAgony ? 'opacity-100 animate-heartbeat-visual' : 'opacity-0'}`}></div>

          {/* Damage Flash Overlay */}
          {showDamageFlash && <div className="absolute inset-0 bg-blood/50 mix-blend-color-burn z-[60] animate-damage-flash pointer-events-none"></div>}

          <div className="bg-mist animate-mist-1"></div>
          <div className="bg-mist animate-mist-2"></div>
          <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                  <div key={i} className="ash-particle" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: `${Math.random() * 3 + 1}px`, height: `${Math.random() * 3 + 1}px`, '--duration': `${Math.random() * 15 + 10}s`, '--delay': `-${Math.random() * 20}s`, } as React.CSSProperties}></div>
              ))}
          </div>
      </div>
      
      {/* ----------------- HEADER (FIXED 64px) ----------------- */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-panel border-b border-gold-dim z-[100] flex items-center justify-between px-4 lg:px-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-4">
           <span className="text-gold font-display tracking-[0.2em] font-bold text-sm hidden md:inline shadow-black drop-shadow-md">
             Crónicas de la Penumbra
           </span>
           <span className="text-gold font-display tracking-[0.2em] font-bold text-sm md:hidden">
             Crónicas
           </span>
        </div>
        
        <div className="flex items-center gap-3 md:gap-5">
           <AudioController variant="header" />
           <div className="h-4 w-px bg-gold-dim/30"></div>

           {/* PDF Export - ENABLED EVEN IF DEAD */}
           <button onClick={() => exportStoryToPDF(gameState)} className="flex items-center gap-2 text-parchment hover:text-gold transition-colors uppercase text-xs tracking-[0.2em] font-bold" title="Exportar PDF">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span className="hidden lg:inline">PDF</span>
           </button>
           
           {/* Save - DISABLED IF DEAD (Permadeath style) */}
           <button onClick={onSave} disabled={isDead} className={`flex items-center gap-2 text-parchment hover:text-gold transition-colors uppercase text-xs tracking-[0.2em] font-bold ${isDead ? 'opacity-30 cursor-not-allowed' : ''}`} title="Guardar">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
           </button>

           {/* Load */}
           <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-parchment hover:text-gold transition-colors uppercase text-xs tracking-[0.2em] font-bold" title="Cargar">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
           </button>
           <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
           
           <div className="h-4 w-px bg-gold-dim/30"></div>

           {/* Home / Exit */}
           <button onClick={() => setShowExitModal(true)} className="flex items-center gap-2 text-blood-bright hover:text-red-400 transition-colors uppercase text-xs tracking-[0.2em] font-bold" title="Salir / Inicio">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
           </button>
        </div>
      </header>

      {/* ----------------- MAIN LAYOUT (Fixed Top-16) ----------------- */}
      <div className="fixed top-16 bottom-0 left-0 right-0 z-10 flex overflow-hidden p-4 gap-4 pb-20 lg:pb-4">
        
        {/* LEFT COLUMN: Character */}
        <aside className={`
            flex-col bg-panel/90 backdrop-blur-sm border border-gold-dim/30 z-20 shadow-xl overflow-hidden rounded-2xl
            ${mobileTab === 'character' ? 'flex absolute top-0 left-4 right-4 bottom-24 z-40' : 'hidden'} 
            lg:flex lg:static lg:w-72 xl:w-80 lg:inset-auto lg:h-auto
        `}>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="text-center pb-6 border-b border-gold-dim/20 mb-6">
                 <h2 className="text-2xl xl:text-3xl font-display text-bone mb-2">{gameState.character.name}</h2>
                 <p className="text-gold italic text-lg font-serif">{cleanArchetype(gameState.character.archetype)}</p>
              </div>
              <div className="space-y-8 mb-8">
                  <div className="group">
                     <div className="flex justify-between items-baseline mb-2">
                        <span className="text-xs uppercase tracking-[0.2em] font-display font-bold text-parchment-dim">Vitalidad</span>
                        <span className={`font-display font-bold text-lg ${gameState.hp < 6 ? 'text-blood-bright animate-pulse' : 'text-bone'}`}>{gameState.hp}/{gameState.maxHp}</span>
                     </div>
                     <div className="h-2 bg-void border border-gold-dim/30 rounded-full overflow-hidden"><div className="h-full bg-blood transition-all duration-700 ease-out rounded-full" style={{ width: `${hpPercent}%` }}/></div>
                  </div>
                  <div className="group">
                     <div className="flex justify-between items-baseline mb-2">
                        <span className="text-xs uppercase tracking-[0.2em] font-display font-bold text-parchment-dim">Cordura</span>
                        <span className="font-display font-bold text-lg text-bone">{gameState.sanity}%</span>
                     </div>
                     <div className="h-2 bg-void border border-gold-dim/30 rounded-full overflow-hidden"><div className="h-full bg-sanity transition-all duration-700 ease-out rounded-full" style={{ width: `${sanityPercent}%` }}/></div>
                  </div>
              </div>
              
              {/* --- NEW: AFFLICTIONS SECTION --- */}
              {hasAfflictions && (
                <div className="mb-10 animate-fade-in">
                   <h3 className="text-blood-bright text-xs uppercase tracking-[0.2em] mb-4 font-display font-bold border-b border-gold-dim/20 pb-2">Afecciones</h3>
                   <div className="space-y-3">
                      {gameState.traumas && gameState.traumas.map((t, i) => (
                         <div key={`t-${i}`} className="bg-blood/10 border border-blood/40 p-3 rounded-lg flex items-start gap-3 group" title={t.description}>
                            <span className="text-blood-bright text-xs mt-1">⚡</span>
                            <div>
                               <p className="text-parchment font-display font-bold text-sm tracking-wide">{t.name}</p>
                               <span className="text-[9px] text-blood-bright uppercase tracking-widest">{t.effect}</span>
                            </div>
                         </div>
                      ))}
                      {gameState.phobias && gameState.phobias.map((p, i) => (
                         <div key={`p-${i}`} className="bg-sanity/10 border border-sanity/40 p-3 rounded-lg flex items-start gap-3 group" title={p.description}>
                            <span className="text-sanity text-xs mt-1">👁</span>
                            <div>
                               <p className="text-parchment font-display font-bold text-sm tracking-wide">{p.name}</p>
                               <span className="text-[9px] text-sanity uppercase tracking-widest">Gatillo: {p.trigger}</span>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
              )}

              <div className="mb-10">
                 <h3 className="text-gold-dim text-xs uppercase tracking-[0.2em] mb-4 font-display font-bold border-b border-gold-dim/20 pb-2">Atributos</h3>
                 <div className="grid grid-cols-2 gap-2">
                   {(Object.entries(gameState.character.attributes) as [keyof CharacterAttributes, number][]).map(([key, value]) => {
                      const effective = getEffectiveAttribute(key, value);
                      return (
                        <div key={key} className={`bg-void/50 border p-2 text-center rounded-lg transition-colors duration-500 ${effective.isPenalized ? 'border-blood/50 bg-blood/5' : 'border-gold-dim/20'}`}>
                           <span className={`block text-xl font-display font-bold ${effective.isPenalized ? 'text-blood-bright' : 'text-bone'}`}>
                             {effective.value}
                           </span>
                           <span className="text-[9px] uppercase tracking-widest text-parchment-dim block">{key}</span>
                        </div>
                      );
                   })}
                 </div>
              </div>
              <div className="mb-10">
                 <h3 className="text-gold-dim text-xs uppercase tracking-[0.2em] mb-4 font-display font-bold border-b border-gold-dim/20 pb-2">Crónica</h3>
                 <div className="space-y-3">
                    <div className="flex justify-between items-center bg-void/30 p-3 rounded-lg border border-white/5">
                       <span className="text-[10px] uppercase tracking-widest text-parchment-dim">Pasajes</span>
                       <span className="text-3xl font-display text-gold drop-shadow-lg">{gameState.turnCount}</span>
                    </div>
                    <div className="flex justify-between items-center bg-void/30 p-3 rounded-lg border border-white/5">
                       <span className="text-[10px] uppercase tracking-widest text-parchment-dim">Estado</span>
                       <span className={`text-base font-display font-bold tracking-widest uppercase ${conditionText === 'Vigoroso' ? 'text-bone' : conditionText === 'Agónico' || conditionText === 'Demente' ? 'text-blood-bright' : 'text-parchment'}`}>{conditionText}</span>
                    </div>
                    
                    {/* --- TOKEN DISPLAY --- */}
                    {gameState.sessionTokens && (
                      <div className="bg-void/30 p-3 rounded-lg border border-white/5 space-y-2">
                          <div className="flex justify-between items-center mb-1 pb-1 border-b border-white/5">
                             <span className="text-[9px] uppercase tracking-widest text-parchment-dim">Consumo</span>
                             <span className="text-[9px] uppercase tracking-widest text-gold-dim font-bold">Tokens</span>
                          </div>
                          <div className="flex justify-between text-[10px] font-mono">
                             <span className="text-zinc-500">Total:</span>
                             <span className="text-parchment">{gameState.sessionTokens.totalTokens.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[9px] font-mono text-zinc-600">
                             <span>(Últ. Turno: {gameState.lastTurnTokens?.totalTokens.toLocaleString() || 0})</span>
                          </div>
                      </div>
                    )}
                 </div>
              </div>
           </div>
           <div className="p-4 border-t border-gold-dim/20 bg-void/20 flex justify-center">
              <button onClick={() => { audioSystem.playClick(); setShowDiceLog(true); }} className="w-10 h-10 flex items-center justify-center text-parchment-dim hover:text-gold transition-all hover:bg-white/5 rounded-full border border-transparent hover:border-gold-dim/30 group" title="Registro de Azar">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 group-hover:scale-110 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
              </button>
           </div>
        </aside>

        {/* CENTER COLUMN: Narrative */}
        <main className={`
            flex-col min-w-0 bg-void/50 border border-gold-dim/30 rounded-2xl overflow-hidden relative shadow-2xl backdrop-blur-sm
            ${mobileTab === 'narrative' ? 'flex w-full' : 'hidden'}
            lg:flex lg:flex-1
        `}>
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 lg:px-16 scroll-smooth">
             <div className="max-w-3xl mx-auto">
                <div className="text-center pt-10 pb-16 mb-12 border-b border-gold-dim/20 animate-fade-in select-none">
                   <p className="text-gold-dim text-[10px] tracking-[0.5em] uppercase font-display mb-6 opacity-80">Libro Primero</p>
                   <h1 className="text-5xl md:text-7xl font-display font-bold text-bone mb-4 tracking-tight drop-shadow-lg">{gameState.character.name}</h1>
                   <div className="flex justify-center items-center gap-4 my-8">
                      <div className="h-px w-20 bg-gradient-to-r from-transparent via-gold-dim to-transparent"></div>
                      <span className="text-gold italic font-serif text-3xl md:text-4xl tracking-wide">{cleanArchetype(gameState.character.archetype)}</span>
                      <div className="h-px w-20 bg-gradient-to-r from-transparent via-gold-dim to-transparent"></div>
                   </div>
                   {gameState.character.bio && <p className="text-parchment-dim text-lg md:text-xl italic font-serif max-w-2xl mx-auto leading-relaxed opacity-80 mt-6 px-4">"{gameState.character.bio}"</p>}
                   <div className="mt-16 text-gold/60 text-xs tracking-[0.3em] uppercase">— Inicio de la Crónica —</div>
                </div>

                {/* 
                   DYNAMIC CONTAINER FOR TEXT EFFECTS 
                   Applying style variable for dynamic aberration amount.
                   Applying conditional class for intermittent glitch.
                */}
                <div 
                   className={`transition-all duration-300 dynamic-aberration ${isTextGlitching ? 'text-instability' : ''}`}
                   style={{ '--aberration-amount': aberrationAmount } as React.CSSProperties}
                >
                  {gameState.narrativeHistory.map((turn, index) => {
                    const isLast = index === gameState.narrativeHistory.length - 1;
                    return (
                      <div key={index} ref={el => { turnRefs.current[index] = el; if (isLast) lastTurnRef.current = el; }} className={`mb-12 transition-all duration-1000 p-4 rounded-xl ${!isLast ? 'opacity-70' : 'opacity-100 animate-fade-in'}`}>
                         {isLast && index > 0 && <div className="flex justify-center mb-10 opacity-40"><div className="text-gold-dim text-xl">❖</div></div>}
                         <TypewriterBlock text={turn.narrative} isLast={isLast} />
                      </div>
                    );
                  })}
                </div>
                
                {/* GAME OVER MESSAGE */}
                {isDead && (
                   <div className="my-12 p-8 border border-blood/50 bg-black/80 rounded-xl text-center animate-fade-in">
                      <h2 className="text-4xl font-display text-blood-bright mb-4 tracking-widest uppercase">Fin de la Vigilia</h2>
                      <p className="text-parchment-dim italic font-serif">La oscuridad reclama lo que es suyo. Tu historia ha terminado.</p>
                      <button onClick={() => setShowExitModal(true)} className="mt-8 px-6 py-2 border border-zinc-700 hover:border-parchment text-zinc-500 hover:text-white uppercase text-xs tracking-widest transition-colors">Volver al Inicio</button>
                   </div>
                )}

                {gameState.pendingChallenge && !isLoading && !isDead && (
                  <div ref={diceSectionRef} onClick={waitingForDismiss ? handleDismissResult : undefined} className={`my-8 mx-auto max-w-md p-6 bg-void border border-gold-dim rounded-xl shadow-[0_0_30px_rgba(197,160,89,0.15)] text-center animate-fade-in relative overflow-hidden ${waitingForDismiss ? 'cursor-pointer hover:border-gold transition-colors hover:shadow-[0_0_40px_rgba(197,160,89,0.3)]' : ''}`}>
                    <div className="absolute inset-0 bg-gold/5 pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col items-center">
                      <h3 className="text-gold-dim font-display uppercase tracking-[0.2em] text-xs mb-4 border-b border-gold-dim/20 pb-2 w-full">Ritual de Azar: {gameState.pendingChallenge.attribute}</h3>
                      <p className="text-lg font-serif italic text-parchment mb-6 leading-tight">"{gameState.pendingChallenge.context}"</p>
                      <div className="flex justify-center items-center gap-6 mb-6 text-sm">
                        <div className="text-center opacity-70"><div className="text-[10px] uppercase tracking-widest text-parchment-dim mb-1">Dificultad</div><div className="text-2xl font-display text-bone">{gameState.pendingChallenge.difficulty}</div></div>
                        <div className="text-gold text-lg">vs</div>
                        {/* UPDATED: Show EFFECTIVE Stat in challenge modal */}
                        <div className="text-center">
                            <div className="text-[10px] uppercase tracking-widest text-parchment-dim mb-1">Bonificador</div>
                            <div className={`text-2xl font-display ${getEffectiveAttribute(gameState.pendingChallenge.attribute, gameState.character.attributes[gameState.pendingChallenge.attribute]).isPenalized ? 'text-blood-bright' : 'text-gold'}`}>
                                +{getEffectiveAttribute(gameState.pendingChallenge.attribute, gameState.character.attributes[gameState.pendingChallenge.attribute]).value}
                            </div>
                        </div>
                      </div>
                      {rollResult === null ? (
                         <button onClick={(e) => { e.stopPropagation(); handleRollDice(e); }} disabled={diceRolling} className="bg-gold text-void px-8 py-3 rounded-lg font-display font-bold uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50 w-full">{diceRolling ? "El destino gira..." : "Lanzar D20"}</button>
                      ) : (
                         <div className="animate-fade-in w-full">
                            <div className={`bg-panel border rounded-lg p-4 mb-4 relative overflow-hidden ${resultInfo?.color.includes('gold') ? 'border-gold shadow-[0_0_15px_rgba(197,160,89,0.3)]' : 'border-blood-bright shadow-[0_0_15px_rgba(255,85,85,0.3)]'}`}>
                               <div className="text-6xl font-display font-bold text-white mb-2 relative z-10">{rollResult}</div>
                               <div className="text-[10px] text-parchment-dim uppercase tracking-widest font-mono">
                                  {rollResult} (Dado) + {getEffectiveAttribute(gameState.pendingChallenge.attribute, gameState.character.attributes[gameState.pendingChallenge.attribute]).value} (Total) = <span className="text-white font-bold">{rollResult + getEffectiveAttribute(gameState.pendingChallenge.attribute, gameState.character.attributes[gameState.pendingChallenge.attribute]).value}</span>
                               </div>
                            </div>
                            {resultInfo && <div className={`text-xl font-display font-bold tracking-[0.3em] mb-4 ${resultInfo.color}`}>{resultInfo.text}</div>}
                            <p className="mt-4 text-[10px] text-zinc-500 uppercase tracking-widest animate-pulse">[ Click aquí para aceptar destino ]</p>
                         </div>
                      )}
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div ref={loadingRef} className="py-8 flex flex-col items-center justify-center gap-3 opacity-80">
                    <div className="flex gap-2"><span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:-0.3s]"></span><span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:-0.15s]"></span><span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce"></span></div>
                    <span className="text-gold font-display text-[10px] uppercase tracking-[0.3em] animate-pulse">Escribiendo el destino...</span>
                  </div>
                )}
                
                {!showOptions && !isLoading && !gameState.pendingChallenge && !isDead && (
                   <div className="flex justify-center py-12 animate-fade-in">
                      <button onClick={() => { audioSystem.playClick(); setShowOptions(true); }} className="group relative px-8 py-4 overflow-hidden border border-gold text-gold font-display tracking-[0.2em] text-sm uppercase transition-all duration-300 hover:text-void rounded-xl">
                         <span className="absolute inset-0 bg-gold translate-y-full transition-transform duration-300 group-hover:translate-y-0"></span>
                         <span className="relative z-10 flex items-center gap-2"><span>Desvelar Destino</span><span className="text-xs">▼</span></span>
                      </button>
                   </div>
                )}
                <div className="h-20"></div>
             </div>
          </div>

          {showOptions && !gameState.pendingChallenge && !isDead && (
             <div ref={bottomControlsRef} className="flex-none bg-panel border-t border-gold-dim/40 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30 animate-[fadeIn_0.5s_ease-out]">
                <div className="max-w-4xl mx-auto p-6 md:p-8">
                   {gameState.currentTurn?.suggestedActions && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                         {gameState.currentTurn.suggestedActions.map((action, idx) => (
                            <button key={idx} onClick={() => { audioSystem.playLowButton(); onAction(action); }} disabled={isLoading} className="text-left px-4 py-3 bg-void border border-gold-dim/40 hover:border-gold hover:bg-zinc-900 text-parchment hover:text-bone transition-all duration-200 rounded-lg shadow-sm group">
                               <span className="text-gold-dim group-hover:text-gold mr-2 text-sm">➤</span><span className="font-serif italic text-lg">{action}</span>
                            </button>
                         ))}
                      </div>
                   )}
                   <form onSubmit={handleSendCustom} className="relative">
                      <input type="text" value={customInput} onChange={(e) => setCustomInput(e.target.value)} disabled={isLoading} placeholder="Describe tu acción..." className="w-full bg-void border border-gold-dim/30 py-3 pl-4 pr-12 text-lg text-bone placeholder-zinc-700 focus:outline-none focus:border-gold transition-colors font-serif italic rounded-lg" />
                      <button type="submit" disabled={!customInput.trim() || isLoading} className="absolute right-2 top-1/2 -translate-y-1/2 text-gold hover:text-white disabled:opacity-0 transition-opacity p-2">⏎</button>
                   </form>
                </div>
             </div>
          )}
        </main>

        {/* RIGHT COLUMN: Inventory */}
        <aside className={`
           flex-col bg-panel/90 backdrop-blur-sm border border-gold-dim/30 z-20 shadow-xl overflow-hidden rounded-2xl
           ${mobileTab === 'inventory' ? 'flex absolute top-0 left-4 right-4 bottom-24 z-40' : 'hidden'}
           lg:flex lg:static lg:w-72 xl:w-80 lg:inset-auto lg:h-auto
        `}>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="mb-10">
                  <div className="flex justify-between items-center border-b border-gold-dim/20 pb-2 mb-4">
                     <h3 className="text-gold-dim text-xs uppercase tracking-[0.2em] font-display font-bold">Inventario</h3>
                     <span className={`text-[10px] font-display font-bold tracking-widest ${isOverburdened ? 'text-blood-bright' : 'text-parchment-dim'}`}>{currentInventoryCount} / {maxInventorySlots}</span>
                  </div>
                  {combineSource && (
                     <div className="mb-4 bg-gold/10 border border-gold p-2 text-center rounded animate-pulse">
                        <p className="text-xs text-gold font-bold uppercase tracking-widest mb-1">Modo Combinación</p>
                        <p className="text-xs text-parchment-dim">Selecciona el segundo objeto...</p>
                        <button onClick={() => setCombineSource(null)} className="mt-2 text-[10px] underline text-zinc-500 hover:text-white">Cancelar</button>
                     </div>
                  )}
                  <ul className="space-y-3">
                     {gameState.inventory.length === 0 ? <li className="text-zinc-600 italic text-sm">Bolsillos vacíos.</li> : 
                        gameState.inventory.map((item: InventoryItem, i) => {
                           const isSelected = selectedItem === item.name;
                           const isSource = combineSource === item.name;
                           const isLocked = waitingForDismiss || diceRolling;
                           return (
                              <li key={i} className={`relative ${isLocked ? 'cursor-not-allowed opacity-50 grayscale' : ''}`} onClick={() => handleItemClick(item.name)}>
                                 <div className={`flex flex-col gap-1 transition-all group cursor-pointer p-2 rounded-lg border ${isSource ? 'border-gold bg-gold/10' : ''} ${isSelected ? 'border-gold-dim bg-white/5' : 'border-transparent hover:bg-white/5'} ${combineSource && !isSource ? 'animate-pulse hover:border-gold cursor-copy' : ''}`}>
                                   <div className="flex items-start gap-2">
                                     <span className="text-gold-dim mt-1.5 text-[8px] group-hover:text-gold transition-colors">◆</span>
                                     <span className={`text-lg font-serif leading-tight ${isSelected || isSource ? 'text-bone' : 'text-parchment'}`}>{item.name}</span>
                                   </div>
                                   
                                   {/* RENDER TAGS */}
                                   {item.tags && item.tags.length > 0 && (
                                     <div className="flex flex-wrap gap-1 ml-4 mt-1">
                                       {item.tags.map((tag, tIdx) => (
                                          <span key={tIdx} className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-300 bg-zinc-900/80">
                                            {tag}
                                          </span>
                                       ))}
                                     </div>
                                   )}
                                 </div>
                              </li>
                           );
                        })
                     }
                  </ul>
                  {isOverburdened && <div className="mt-4 text-[10px] text-blood-bright uppercase tracking-widest text-center animate-pulse">¡Sobrecargado! Debes tirar algo.</div>}
              </div>
              
              {/* NEW: ACTIVE THREADS SECTION */}
              {gameState.activeThreads && gameState.activeThreads.length > 0 && (
                <div className="mb-10">
                   <h3 className="text-gold-dim text-xs uppercase tracking-[0.2em] mb-4 font-display font-bold border-b border-gold-dim/20 pb-2">Hilos del Destino</h3>
                   <div className="space-y-3">
                      {gameState.activeThreads.map((thread, i) => (
                         <div key={i} onClick={() => handleThreadClick(thread.id)} className={`bg-black/20 border transition-all duration-300 p-3 rounded-lg flex items-start gap-3 cursor-pointer group ${selectedThreadId === thread.id ? 'border-gold bg-white/5' : 'border-gold-dim/20 hover:border-gold-dim hover:bg-white/5'}`}>
                            <span className={`text-xs mt-1 transition-colors ${selectedThreadId === thread.id ? 'text-gold' : 'text-zinc-600 group-hover:text-gold'}`}>✦</span>
                            <div>
                               <p className={`font-display font-bold text-sm tracking-wide transition-colors ${selectedThreadId === thread.id ? 'text-bone drop-shadow' : 'text-parchment brightness-110'}`}>{thread.title}</p>
                               <span className="text-[9px] text-zinc-400 uppercase tracking-widest group-hover:text-zinc-300">Activo</span>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
              )}

              <div>
                  <h3 className="text-gold-dim text-xs uppercase tracking-[0.2em] mb-4 font-display font-bold border-b border-gold-dim/20 pb-2">Códice</h3>
                  <div className="space-y-4">
                     {gameState.worldFacts.map((fact, i) => (
                        <button key={i} onClick={() => scrollToTurn(fact.turnIndex)} className="block w-full text-left relative pl-3 border-l border-gold-dim/30 hover:border-gold transition-colors py-1 group focus:outline-none" title="Ver recuerdo">
                           <p className="text-parchment brightness-110 text-md italic font-serif leading-relaxed text-justify group-hover:text-bone transition-colors">"{fact.text}"</p>
                        </button>
                     ))}
                     {gameState.worldFacts.length === 0 && <p className="text-zinc-700 text-xs uppercase tracking-widest text-center py-4">Mente en blanco.</p>}
                  </div>
              </div>
           </div>
        </aside>

        {/* MOBILE TABS */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4 h-16 bg-panel/95 backdrop-blur border border-gold-dim rounded-2xl flex items-center justify-around z-50 shadow-2xl">
           <button onClick={() => { audioSystem.playClick(); setMobileTab('character'); }} className={`flex flex-col items-center justify-center w-full h-full rounded-l-2xl transition-colors ${mobileTab === 'character' ? 'text-gold bg-white/5' : 'text-zinc-500'}`}>
              <span className="text-lg mb-1">👤</span><span className="text-[9px] uppercase tracking-widest font-display font-bold">Personaje</span>
           </button>
           <div className="w-px h-8 bg-gold-dim/20"></div>
           <button onClick={() => { audioSystem.playClick(); setMobileTab('narrative'); }} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${mobileTab === 'narrative' ? 'text-gold bg-white/5' : 'text-zinc-500'}`}>
              <span className="text-lg mb-1">📜</span><span className="text-[9px] uppercase tracking-widest font-display font-bold">Historia</span>
           </button>
           <div className="w-px h-8 bg-gold-dim/20"></div>
           <button onClick={() => { audioSystem.playClick(); setMobileTab('inventory'); }} className={`flex flex-col items-center justify-center w-full h-full rounded-r-2xl transition-colors ${mobileTab === 'inventory' ? 'text-gold bg-white/5' : 'text-zinc-500'}`}>
              <span className="text-lg mb-1">🎒</span><span className="text-[9px] uppercase tracking-widest font-display font-bold">Códice</span>
           </button>
        </div>
      </div>

      {/* INSPECTOR MODAL (Inventory) */}
      {activeItemObj && !combineSource && (
         <div className="fixed z-[60] bg-black/95 border border-gold p-6 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-fade-in left-4 right-4 bottom-24 lg:left-auto lg:bottom-auto lg:top-24 lg:right-[22rem] lg:w-80 flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gold-dim/50">
               <div className="flex items-center gap-3"><span className="text-gold text-2xl">◆</span><h4 className="text-gold font-display font-bold text-xl uppercase tracking-wider">{activeItemObj.name}</h4></div>
               <button onClick={() => setSelectedItem(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            
            {/* ITEM TAGS IN MODAL */}
            {activeItemObj.tags && activeItemObj.tags.length > 0 && (
               <div className="flex flex-wrap gap-2 mb-4">
                  {activeItemObj.tags.map((tag, tIdx) => (
                    <span key={tIdx} className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-zinc-600 text-zinc-200 bg-zinc-900">
                       {tag}
                    </span>
                  ))}
               </div>
            )}

            <p className="text-parchment font-serif text-lg leading-relaxed italic mb-6">{activeItemObj.description}</p>
            <div className={`grid grid-cols-2 gap-3 mb-4 ${showItemChat ? 'hidden' : 'grid'}`}>
               <button onClick={() => handleUseItem(activeItemObj.name)} disabled={isLoading} className="px-4 py-3 border border-zinc-700 hover:border-gold hover:text-gold hover:bg-white/5 text-parchment-dim font-display text-xs tracking-[0.2em] font-bold transition-all rounded shadow-sm">USAR</button>
               <button onClick={() => handleInspectItem(activeItemObj.name)} disabled={isLoading} className="px-4 py-3 border border-zinc-700 hover:border-gold hover:text-gold hover:bg-white/5 text-parchment-dim font-display text-xs tracking-[0.2em] font-bold transition-all rounded shadow-sm">EXAMINAR</button>
               <button onClick={() => handleCombineStart(activeItemObj.name)} disabled={isLoading} className="px-4 py-3 border border-zinc-700 hover:border-gold hover:text-gold hover:bg-white/5 text-parchment-dim font-display text-xs tracking-[0.2em] font-bold transition-all rounded shadow-sm">COMBINAR</button>
               <button onClick={() => handleDiscardItem(activeItemObj.name)} disabled={isLoading} className="px-4 py-3 border border-zinc-800 hover:border-blood hover:bg-blood/10 hover:text-blood-bright text-zinc-500 font-display text-xs tracking-[0.2em] font-bold transition-all rounded shadow-sm">DESCARTAR</button>
               <button onClick={() => { audioSystem.playClick(); setShowItemChat(true); }} disabled={isLoading} className="col-span-2 px-4 py-3 border border-gold/40 hover:bg-gold/10 hover:border-gold text-gold font-display text-xs tracking-[0.2em] font-bold transition-all rounded shadow-[0_0_10px_rgba(197,160,89,0.1)]">ACCIÓN LIBRE</button>
            </div>
            {showItemChat && (
              <div className="flex flex-col gap-2 animate-fade-in">
                 <div className="text-[10px] text-gold uppercase tracking-widest mb-1 flex justify-between"><span>Acción con {activeItemObj.name}</span><button onClick={() => setShowItemChat(false)} className="underline text-zinc-500 hover:text-white">Volver</button></div>
                 <form onSubmit={handleItemChatSubmit}>
                    <input ref={itemChatInputRef} type="text" value={itemChatInput} onChange={(e) => setItemChatInput(e.target.value)} placeholder="¿Qué intentas hacer?" className="w-full bg-void border border-gold-dim/50 p-3 text-parchment text-sm font-serif italic focus:outline-none focus:border-gold rounded mb-2" />
                    <button type="submit" disabled={!itemChatInput.trim() || isLoading} className="w-full py-2 bg-gold/10 border border-gold/50 text-gold hover:bg-gold hover:text-void font-display uppercase text-xs font-bold tracking-widest transition-colors rounded">EJECUTAR</button>
                 </form>
              </div>
            )}
         </div>
      )}

      {/* NEW: THREAD INSPECTOR MODAL */}
      {activeThreadObj && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedThreadId(null)}></div>
             <div className="relative bg-panel border-2 border-gold-dim rounded-xl w-full max-w-lg shadow-[0_0_60px_rgba(197,160,89,0.15)] p-8 md:p-12 animate-fade-in flex flex-col items-center text-center">
                 <button onClick={() => setSelectedThreadId(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">✕</button>
                 
                 <div className="text-gold-dim opacity-50 text-2xl mb-4">✦</div>
                 
                 <div className="text-xs uppercase tracking-[0.3em] text-gold-dim font-display font-bold mb-6 border-b border-gold-dim/20 pb-2">Hilo del Destino</div>
                 
                 <h2 className="text-3xl md:text-4xl font-display font-bold text-bone mb-6 drop-shadow-lg">{activeThreadObj.title}</h2>
                 
                 <div className="w-full h-px bg-gradient-to-r from-transparent via-gold-dim/50 to-transparent mb-6"></div>
                 
                 <div className="max-h-[50vh] overflow-y-auto custom-scrollbar px-2">
                    <p className="text-xl text-parchment font-serif leading-relaxed italic">
                        {activeThreadObj.description || "Un misterio aún no revelado..."}
                    </p>
                 </div>

                 <div className="mt-8 pt-6 border-t border-gold-dim/20 w-full flex justify-center">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 bg-void/50 px-4 py-1 rounded-full border border-white/5">Estado: Activo</span>
                 </div>
             </div>
         </div>
      )}

      {/* EXIT MODAL */}
      {showExitModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowExitModal(false)}></div>
            <div className="relative bg-panel border border-gold-dim rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in">
               <h3 className="text-xl font-display text-bone mb-4">¿Abandonar la Vigilia?</h3>
               <p className="text-parchment-dim font-serif mb-8">El progreso no guardado se perderá en la oscuridad.</p>
               <div className="flex gap-4 justify-center">
                  <button onClick={() => setShowExitModal(false)} className="px-6 py-2 border border-zinc-700 text-parchment-dim hover:text-white hover:border-parchment rounded-lg transition-colors uppercase text-xs tracking-widest">Continuar</button>
                  <button onClick={() => { setShowExitModal(false); onReset(); }} className="px-6 py-2 bg-blood/20 border border-blood text-blood-bright hover:bg-blood/40 rounded-lg transition-colors uppercase text-xs tracking-widest font-bold">Salir</button>
               </div>
            </div>
         </div>
      )}

      {/* DICE LOG MODAL */}
      {showDiceLog && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowDiceLog(false)}></div>
            <div className="relative bg-panel border border-gold-dim rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl animate-fade-in flex flex-col max-h-[85vh]">
               <div className="flex justify-between items-center mb-6 border-b border-gold-dim/30 pb-4">
                  <h3 className="text-xl font-display text-gold tracking-widest uppercase font-bold">Registro de Azar</h3>
                  <button onClick={() => setShowDiceLog(false)} className="text-zinc-500 hover:text-white transition-colors">✕</button>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                  {gameState.diceLog && gameState.diceLog.length > 0 ? (
                     gameState.diceLog.map((entry, idx) => {
                        const isSuccess = entry.result === 'success' || entry.result === 'critical';
                        const isCrit = entry.result === 'critical';
                        const isFumble = entry.result === 'fumble';
                        return (
                           <div key={idx} className="bg-void/40 border border-gold-dim/10 rounded-lg p-3 hover:border-gold-dim/30 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                 <span className="text-[10px] uppercase tracking-widest text-zinc-500">Turno {entry.turnIndex}</span>
                                 <span className={`text-[10px] uppercase tracking-widest font-bold ${isSuccess ? 'text-gold' : 'text-blood-bright'}`}>{entry.result === 'critical' ? '¡CRÍTICO!' : entry.result === 'fumble' ? '¡PIFIA!' : isSuccess ? 'ÉXITO' : 'FALLO'}</span>
                              </div>
                              <div className="mb-2">
                                 <span className="block text-parchment font-serif italic text-sm">{entry.context}</span>
                                 <span className="text-xs text-gold-dim uppercase tracking-wider font-bold">{entry.attribute}</span>
                              </div>
                              <div className="flex items-center gap-2 bg-black/20 p-2 rounded border border-white/5">
                                 <div className="flex-1 text-center border-r border-white/5"><div className="text-[9px] text-zinc-500 uppercase">Dado</div><div className={`font-display font-bold ${isCrit ? 'text-gold' : isFumble ? 'text-blood-bright' : 'text-parchment'}`}>{entry.roll}</div></div>
                                 <div className="flex-1 text-center border-r border-white/5"><div className="text-[9px] text-zinc-500 uppercase">Base</div><div className="text-parchment font-display">+{entry.modifier}</div></div>
                                 <div className="flex-1 text-center border-r border-white/5"><div className="text-[9px] text-zinc-500 uppercase">Total</div><div className="text-bone font-display font-bold">{entry.total}</div></div>
                                 <div className="flex-1 text-center"><div className="text-[9px] text-zinc-500 uppercase">Dificultad</div><div className="text-parchment-dim font-display">{entry.difficulty}</div></div>
                              </div>
                           </div>
                        );
                     })
                  ) : (
                     <div className="text-center py-10 text-zinc-600 italic font-serif">El destino aún no ha sido tentado.</div>
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default GameScreen;