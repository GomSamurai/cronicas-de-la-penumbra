import React, { useState, useEffect, useRef } from 'react';
import { GameState, TurnData, CharacterAttributes, InventoryItem, DiceRollLogEntry, NarrativeThread, Trauma, Phobia, NPC, LocationInfo, TacticalCondition, GraveyardSoul } from '../types';
import { audioSystem } from '../services/audioService';
import TypewriterBlock from './TypewriterBlock';
import { exportStoryToPDF } from '../services/exportService';
import AudioController from './AudioController';
import SettingsModal, { getVisualEffectsSetting } from './SettingsModal';
import AtlasModal from './AtlasModal';

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

const LOADING_WHISPERS = [
  "Los hilos del destino se anudan en la penumbra...",
  "La oscuridad sopesa las consecuencias de tu elección...",
  "El eco de tus pasos despierta a los durmientes...",
  "Las sombras reescriben los designios del azar...",
  "El hierro y la sangre aguardan el desenlace...",
  "Un suspiro gélido recorre los pasillos olvidados..."
];

const GameScreen: React.FC<GameScreenProps> = ({ gameState, onAction, onRegisterDiceRoll, isLoading, onSave, onLoad, onReset }) => {
  const [customInput, setCustomInput] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('narrative');
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [visualEffectsEnabled, setVisualEffectsEnabled] = useState(getVisualEffectsSetting());
  const [showDiceLog, setShowDiceLog] = useState(false);
  const [showAtlasModal, setShowAtlasModal] = useState(false);
  const [whisperIdx, setWhisperIdx] = useState(0);
  
  // Inventory Interaction State
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [combineSource, setCombineSource] = useState<string | null>(null);
  const [itemChatInput, setItemChatInput] = useState('');
  const [showItemChat, setShowItemChat] = useState(false);

  // Thread Interaction State
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  // Dramatis Personae (NPC) State
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [showNpcChat, setShowNpcChat] = useState(false);
  const [npcChatInput, setNpcChatInput] = useState('');
  const [rightTab, setRightTab] = useState<'inventory' | 'npcs' | 'codex'>('inventory');
  const npcChatInputRef = useRef<HTMLInputElement>(null);

  // Dice Rolling State
  const [diceRolling, setDiceRolling] = useState(false);
  const [rollResult, setRollResult] = useState<number | null>(null);
  const [waitingForDismiss, setWaitingForDismiss] = useState(false);

  // Visual Effects State
  const [showDamageFlash, setShowDamageFlash] = useState(false);
  
  // --- VISCERAL INSTABILITY STATE ---
  const [aberrationAmount, setAberrationAmount] = useState('0px');
  const [isTextGlitching, setIsTextGlitching] = useState(false);
  const [isEyelidBlurring, setIsEyelidBlurring] = useState(false);
  
  const prevHpRef = useRef(gameState.hp);
  const glitchTimeoutRef = useRef<number | null>(null);
  const aberrationTimeoutRef = useRef<number | null>(null);
  const eyelidTimeoutRef = useRef<number | null>(null);

  // Refs for scrolling
  const lastTurnRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomControlsRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const itemChatInputRef = useRef<HTMLInputElement>(null);
  const hasSavedDeathRef = useRef(false);
  const diceSectionRef = useRef<HTMLDivElement>(null);
  
  const turnRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Game Over State
  const isDead = gameState.hp <= 0;

  useEffect(() => {
    audioSystem.setMode('game');
    audioSystem.updateTension(gameState.tensionLevel || 'calma', gameState.hp, gameState.maxHp, gameState.sanity);
    if (gameState.currentLocation) {
      audioSystem.updateLocationAcoustics(gameState.currentLocation.name, gameState.currentLocation.lighting);
    }
    
    // Cleanup audio and timers when leaving game
    return () => {
       audioSystem.updateTension('calma', 100, 100, 100);
       audioSystem.updateHeartbeat(100, 100); 
       audioSystem.stopTinnitus();
       if (glitchTimeoutRef.current) window.clearTimeout(glitchTimeoutRef.current);
       if (aberrationTimeoutRef.current) window.clearTimeout(aberrationTimeoutRef.current);
       if (eyelidTimeoutRef.current) window.clearTimeout(eyelidTimeoutRef.current);
    };
  }, []);

  // Update location acoustics dynamically
  useEffect(() => {
    if (gameState.currentLocation) {
      audioSystem.updateLocationAcoustics(gameState.currentLocation.name, gameState.currentLocation.lighting);
    }
  }, [gameState.currentLocation?.name, gameState.currentLocation?.lighting]);

  // --- VISCERAL FEEDBACK & ADAPTIVE AUDIO LOGIC ---
  useEffect(() => {
     // 1. Damage Flash Logic
     if (gameState.hp < prevHpRef.current) {
        setShowDamageFlash(true);
        setTimeout(() => setShowDamageFlash(false), 500);
     }
     prevHpRef.current = gameState.hp;

     // 2. Adaptive Tension & Audio Update
     audioSystem.updateTension(gameState.tensionLevel || 'calma', gameState.hp, gameState.maxHp, gameState.sanity);
  }, [gameState.tensionLevel, gameState.hp, gameState.maxHp, gameState.sanity]);

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


  // Determine Low Health Visual Pulse (Vignette) & Near Death
  const isNearDeath = gameState.hp < (gameState.maxHp * 0.25);
  const isAgony = gameState.hp < (gameState.maxHp * 0.4);

  // Eyelid defocus transient schedule on near death
  useEffect(() => {
    if (!visualEffectsEnabled) {
      setIsEyelidBlurring(false);
      return;
    }

    if (isNearDeath) {
      const scheduleEyelidBlur = () => {
        const delay = 14000 + Math.random() * 10000;
        eyelidTimeoutRef.current = window.setTimeout(() => {
          setIsEyelidBlurring(true);
          setTimeout(() => {
            setIsEyelidBlurring(false);
            scheduleEyelidBlur();
          }, 2000);
        }, delay);
      };

      scheduleEyelidBlur();
    } else {
      if (eyelidTimeoutRef.current) window.clearTimeout(eyelidTimeoutRef.current);
      setIsEyelidBlurring(false);
    }

    return () => {
      if (eyelidTimeoutRef.current) window.clearTimeout(eyelidTimeoutRef.current);
    };
  }, [isNearDeath, visualEffectsEnabled]);

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
    setSelectedNpcId(null);
    setShowNpcChat(false);
    setNpcChatInput('');
  }, [gameState.turnCount]);

  useEffect(() => {
    if (isDead && !hasSavedDeathRef.current) {
      hasSavedDeathRef.current = true;
      try {
        const graveyard: GraveyardSoul[] = JSON.parse(localStorage.getItem('penumbra_graveyard') || '[]');
        const id = gameState.character.name + '_' + Date.now();
        const deathLocation = gameState.currentLocation?.name || 'Paraje Desconocido';
        const deathCause = gameState.hp <= 0 ? 'Heridas mortales en combate o caída' : 'Locura irreversible y pánico';
        const legacyItem = gameState.inventory?.[0]?.name || 'Amuleto desgastado';
        graveyard.unshift({
           id: id,
           name: gameState.character.name,
           archetype: gameState.character.archetype,
           turns: gameState.turnCount,
           date: new Date().toISOString(),
           lastWords: gameState.narrativeHistory[gameState.narrativeHistory.length - 1]?.narrative.substring(0, 150) + '...',
           deathLocation,
           deathCause,
           legacyItem
        });
        localStorage.setItem('penumbra_graveyard', JSON.stringify(graveyard));
        localStorage.removeItem('penumbra_save');
      } catch(e) { console.error("Error guardando epitafio", e); }
    }
  }, [isDead, gameState]);

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
    if (!isLoading) return;
    const interval = window.setInterval(() => {
      setWhisperIdx(prev => (prev + 1) % LOADING_WHISPERS.length);
    }, 3200);
    return () => window.clearInterval(interval);
  }, [isLoading]);

  // Keyboard shortcut: keys 1..4 trigger suggested actions when options are revealed
  useEffect(() => {
    if (!showOptions || isLoading || isDead || !gameState.currentTurn?.suggestedActions) return;

    const handleKeyNav = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= gameState.currentTurn!.suggestedActions.length) {
        e.preventDefault();
        const action = gameState.currentTurn!.suggestedActions[num - 1];
        audioSystem.playLowButton();
        onAction(action);
      }
    };

    window.addEventListener('keydown', handleKeyNav);
    return () => window.removeEventListener('keydown', handleKeyNav);
  }, [showOptions, isLoading, isDead, gameState.currentTurn, onAction]);

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

  const handleEquipItem = (itemName: string) => {
    audioSystem.playClick();
    onAction(`[EQUIPAR/EMPUÑAR] ${itemName}`);
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
  const activeNpcObj = selectedNpcId ? (gameState.npcs || []).find(n => n.id === selectedNpcId) : null;

  // --- NPC ACTIONS ---
  const handleNpcClick = (npcId: string) => {
    if (waitingForDismiss || diceRolling || isDead) return;
    audioSystem.playClick();
    setSelectedNpcId(selectedNpcId === npcId ? null : npcId);
    setShowNpcChat(false);
  };

  const handleTalkToNpc = (npcName: string) => {
    audioSystem.playClick();
    onAction(`[HABLAR CON ${npcName}] Intento entablar conversación con cautela.`);
    setSelectedNpcId(null);
  };

  const handleInspectNpc = (npcName: string) => {
    audioSystem.playClick();
    onAction(`[EXAMINAR PNJ] Observo con atención los rasgos, heridas, armas y lenguaje corporal de ${npcName}.`);
    setSelectedNpcId(null);
  };

  const handleIntimidateNpc = (npcName: string) => {
    audioSystem.playLowButton();
    onAction(`[INTIMIDAR A ${npcName}] Doy un paso al frente y dejo clara mi amenaza.`);
    setSelectedNpcId(null);
  };

  const handleAttackNpc = (npcName: string) => {
    if (confirm(`¿Iniciar combate a muerte contra ${npcName}? La violencia en este mundo es letal y definitiva.`)) {
      audioSystem.playLowButton();
      onAction(`[COMBATE CONTRA ${npcName}] Desenfundó y ataco sin previo aviso.`);
      setSelectedNpcId(null);
    }
  };

  const handleNpcChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (npcChatInput.trim() && activeNpcObj) {
      audioSystem.playLowButton();
      onAction(`[INTERACCIÓN CON ${activeNpcObj.name}] ${npcChatInput}`);
      setNpcChatInput('');
      setSelectedNpcId(null);
    }
  };

  const getRelationshipBadge = (rel: string) => {
    switch (rel) {
      case 'aliado':
        return { label: 'Aliado', bg: 'bg-gold/10 text-gold border-gold/40' };
      case 'favorable':
        return { label: 'Favorable', bg: 'bg-emerald-950/40 text-emerald-400 border-emerald-700/40' };
      case 'neutral':
        return { label: 'Neutral', bg: 'bg-zinc-900 text-zinc-400 border-zinc-700' };
      case 'sospechoso':
        return { label: 'Sospechoso', bg: 'bg-amber-950/40 text-amber-400 border-amber-700/40' };
      case 'hostil':
        return { label: 'Hostil', bg: 'bg-blood/20 text-blood-bright border-blood/50' };
      case 'enemigo_mortal':
        return { label: 'Enemigo Mortal', bg: 'bg-blood/30 text-blood-bright border-blood animate-pulse font-bold' };
      default:
        return { label: rel, bg: 'bg-zinc-900 text-zinc-400 border-zinc-700' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'vivo':
        return { label: 'Vívido', icon: '●', color: 'text-zinc-300' };
      case 'herido':
        return { label: 'Malherido', icon: '🩸', color: 'text-blood-bright' };
      case 'inconsciente':
        return { label: 'Inconsciente', icon: '💤', color: 'text-amber-400' };
      case 'muerto':
        return { label: 'Cadáver', icon: '☠️', color: 'text-zinc-600 line-through' };
      case 'desaparecido':
        return { label: 'Desaparecido', icon: '🌫️', color: 'text-zinc-500 italic' };
      default:
        return { label: status, icon: '•', color: 'text-zinc-400' };
    }
  };

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
    <div className={`fixed inset-0 bg-void text-parchment overflow-hidden font-serif selection:bg-blood selection:text-white transition-all duration-1000 ${visualEffectsEnabled && isNearDeath ? 'agony-screen' : ''}`}>
      
      {/* --- ATMOSPHERIC LAYERS --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-texture opacity-30"></div>
          
          {/* Base Vignette */}
          <div className="absolute inset-0 bg-vignette animate-pulse-slow"></div>

          {/* Dynamic Tension Vignettes */}
          {gameState.tensionLevel === 'combate' && <div className="absolute inset-0 vignette-combate z-[2] transition-opacity duration-1000"></div>}
          {gameState.tensionLevel === 'agonico' && <div className="absolute inset-0 vignette-agonico z-[2] transition-opacity duration-1000"></div>}
          {gameState.tensionLevel === 'peligro' && <div className="absolute inset-0 vignette-peligro z-[2] transition-opacity duration-700"></div>}
          {gameState.tensionLevel === 'sospecha' && <div className="absolute inset-0 vignette-sospecha z-[2] transition-opacity duration-700"></div>}
          {gameState.tensionLevel === 'tension' && <div className="absolute inset-0 vignette-tension z-[2] transition-opacity duration-700"></div>}

          {/* Madness Living Shadows Vignette (< 40% sanity) */}
          {visualEffectsEnabled && gameState.sanity < 40 && (
            <div className="absolute inset-0 vignette-madness z-[3] transition-opacity duration-1000 pointer-events-none"></div>
          )}

          {/* Agony Arterial Pulse Vignette (< 25% HP) */}
          {visualEffectsEnabled && isNearDeath && (
            <div className="absolute inset-0 arterial-pulse z-[4] transition-opacity duration-700 pointer-events-none"></div>
          )}

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
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#0e0c0b]/95 backdrop-blur-md border-b border-gold-dim/40 z-[100] flex items-center justify-between px-4 lg:px-6 shadow-[0_4px_25px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(197,160,89,0.15)]">
        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
           <div className="flex items-center gap-2 shrink-0">
             <span className="text-gold-dim text-xs select-none">✦</span>
             <span className="text-gold font-display tracking-[0.22em] font-bold text-sm hidden md:inline drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
               Crónicas de la Penumbra
             </span>
             <span className="text-gold font-display tracking-[0.2em] font-bold text-sm md:hidden shrink-0">
               Crónicas
             </span>
           </div>

           {/* Interactive Cartography Button */}
           <button 
             onClick={() => { audioSystem.playClick(); setShowAtlasModal(true); }}
             className="hidden sm:flex items-center gap-2 text-xs border border-gold-dim/40 hover:border-gold bg-black/40 hover:bg-gold/10 px-2.5 py-1 rounded transition-all text-parchment-dim hover:text-gold shrink truncate max-w-[240px] md:max-w-xs group cursor-pointer"
             title="Abrir Atlas Cartográfico Mental"
           >
             <span className="text-gold group-hover:scale-110 transition-transform text-sm">🗺️</span>
             <span className="font-display uppercase tracking-wider text-[11px] text-bone group-hover:text-gold font-bold truncate">
               {gameState.currentLocation?.name ? gameState.currentLocation.name : "Cartografía"}
             </span>
           </button>

           {/* Tension Badge */}
           {gameState.tensionLevel && (
              <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded font-display font-bold border shrink-0 ${
                 gameState.tensionLevel === 'combate' || gameState.tensionLevel === 'peligro' || gameState.tensionLevel === 'agonico'
                   ? 'border-blood text-blood-bright bg-blood/10 animate-pulse'
                   : gameState.tensionLevel === 'tension' || gameState.tensionLevel === 'sospecha'
                   ? 'border-gold-dim text-gold bg-gold/10'
                   : 'border-zinc-700 text-zinc-400 bg-zinc-900'
              }`}>
                 {gameState.tensionLevel}
              </span>
           )}
        </div>
        
        <div className="flex items-center gap-3 md:gap-5">
           <AudioController variant="header" />
           
           {/* Settings Button */}
           <button 
             onClick={() => setShowSettingsModal(true)} 
             className="flex items-center gap-1 text-parchment hover:text-gold transition-colors uppercase text-xs tracking-[0.2em] font-bold" 
             title="Ajustes de la Vigilia"
           >
              <span className="text-sm">⚙️</span>
              <span className="hidden xl:inline">Ajustes</span>
           </button>

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
            flex-col gothic-panel z-20 overflow-hidden rounded-2xl
            ${mobileTab === 'character' ? 'flex absolute top-0 left-4 right-4 bottom-24 z-40' : 'hidden'} 
            lg:flex lg:static lg:w-72 xl:w-80 lg:inset-auto lg:h-auto
        `}>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="text-center pb-5 border-b border-gold-dim/30 mb-6 relative">
                 <div className="flex items-center justify-center gap-2 mb-2">
                   {gameState.character.icon && (
                     <span className="text-2xl filter drop-shadow-[0_0_8px_rgba(197,160,89,0.5)]">
                       {gameState.character.icon}
                     </span>
                   )}
                   <div className="inline-block px-3 py-0.5 rounded border border-gold-dim/30 bg-black/60 text-[10px] uppercase tracking-[0.25em] font-display text-gold-dim font-bold">
                     ✦ Vástago de la Vigilia ✦
                   </div>
                 </div>
                 <h2 className="text-2xl xl:text-3xl font-display font-bold text-bone tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                   {gameState.character.name}
                 </h2>
                 <div className="flex items-center justify-center gap-2 mt-1">
                   <span className="h-px w-6 bg-gradient-to-r from-transparent to-gold-dim"></span>
                   <p className="text-gold italic text-base font-serif tracking-wider">{cleanArchetype(gameState.character.archetype)}</p>
                   <span className="h-px w-6 bg-gradient-to-l from-transparent to-gold-dim"></span>
                 </div>
              </div>
              <div className="space-y-5 mb-8">
                  {/* Vitalidad */}
                  <div className="group">
                     <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-1.5">
                           <span className="text-blood-bright text-xs">🩸</span>
                           <span className="text-[11px] uppercase tracking-[0.2em] font-display font-bold text-parchment-dim group-hover:text-blood-bright transition-colors">Vitalidad</span>
                        </div>
                        <span className={`font-display font-bold text-sm px-2 py-0.5 rounded bg-black/50 border border-white/5 ${gameState.hp < 6 ? 'text-blood-bright border-blood/60 animate-pulse' : 'text-bone'}`}>
                          {gameState.hp} <span className="text-xs text-zinc-500">/ {gameState.maxHp}</span>
                        </span>
                     </div>
                     <div className="stat-bezel h-3.5">
                        <div className="h-full blood-liquid transition-all duration-700 ease-out rounded-full relative overflow-hidden" style={{ width: `${hpPercent}%` }}>
                           <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                        </div>
                     </div>
                  </div>

                  {/* Cordura */}
                  <div className="group">
                     <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-1.5">
                           <span className="text-sanity text-xs">👁️</span>
                           <span className="text-[11px] uppercase tracking-[0.2em] font-display font-bold text-parchment-dim group-hover:text-cyan-300 transition-colors">Cordura</span>
                        </div>
                        <span className="font-display font-bold text-sm px-2 py-0.5 rounded bg-black/50 border border-white/5 text-bone">
                          {gameState.sanity}<span className="text-xs text-zinc-500">%</span>
                        </span>
                     </div>
                     <div className="stat-bezel h-3.5">
                        <div className="h-full sanity-liquid transition-all duration-700 ease-out rounded-full relative overflow-hidden" style={{ width: `${sanityPercent}%` }}>
                           <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                        </div>
                     </div>
                  </div>
              </div>
              
              {/* --- NEW: AFFLICTIONS SECTION --- */}
              {hasAfflictions && (
                <div className="mb-8 animate-fade-in">
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

              {/* --- TACTICAL CONDITIONS (ESTADOS DE SUPERVIVENCIA) --- */}
              {gameState.conditions && gameState.conditions.length > 0 && (
                <div className="mb-8 animate-fade-in">
                   <h3 className="text-amber-500 text-xs uppercase tracking-[0.2em] mb-3 font-display font-bold border-b border-gold-dim/20 pb-2 flex items-center justify-between">
                     <span>Estados Tácticos</span>
                     <span className="text-[10px] text-zinc-400 font-mono">({gameState.conditions.length})</span>
                   </h3>
                   <div className="space-y-2">
                      {gameState.conditions.map((cond) => {
                         const getConditionStyle = (type: string) => {
                            switch(type) {
                              case 'hemorragia':
                                return { icon: '🩸', border: 'border-blood/60', bg: 'bg-blood/20', text: 'text-blood-bright' };
                              case 'intoxicacion':
                                return { icon: '☠️', border: 'border-emerald-600/50', bg: 'bg-emerald-950/40', text: 'text-emerald-400' };
                              case 'agotamiento':
                                return { icon: '⚠️', border: 'border-amber-600/50', bg: 'bg-amber-950/40', text: 'text-amber-400' };
                              case 'panico':
                                return { icon: '👁️', border: 'border-purple-600/50', bg: 'bg-purple-950/40', text: 'text-purple-300' };
                              default:
                                return { icon: '⚡', border: 'border-gold-dim/40', bg: 'bg-void/60', text: 'text-parchment' };
                            }
                         };
                         const style = getConditionStyle(cond.type);
                         return (
                            <div key={cond.id} className={`${style.bg} ${style.border} border p-2.5 rounded-lg flex items-start gap-2.5 text-xs shadow-md group`} title={cond.description}>
                               <span className="text-base select-none">{style.icon}</span>
                               <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                     <span className={`font-display font-bold uppercase tracking-wider ${style.text}`}>{cond.name}</span>
                                     <span className="text-[9px] uppercase tracking-widest text-zinc-400 px-1.5 py-0.2 bg-black/40 rounded border border-white/5">{cond.severity}</span>
                                  </div>
                                  <p className="text-[11px] text-parchment-dim mt-0.5 line-clamp-2 italic">{cond.description}</p>
                               </div>
                            </div>
                         );
                      })}
                   </div>
                </div>
              )}

              <div className="mb-8">
                 <h3 className="text-gold-dim text-xs uppercase tracking-[0.2em] mb-3.5 font-display font-bold border-b border-gold-dim/25 pb-2 flex items-center justify-between">
                    <span>Talismanes de Atributo</span>
                    <span className="text-[10px] text-gold-dim/60 font-mono">✦ D20 ✦</span>
                 </h3>
                 <div className="grid grid-cols-2 gap-2.5">
                   {(Object.entries(gameState.character.attributes) as [keyof CharacterAttributes, number][]).map(([key, value]) => {
                      const effective = getEffectiveAttribute(key, value);
                      const attrMeta: Record<string, { icon: string; short: string }> = {
                        fuerza: { icon: '⚔️', short: 'Fuerza' },
                        destreza: { icon: '🏹', short: 'Destreza' },
                        constitucion: { icon: '🛡️', short: 'Constitución' },
                        inteligencia: { icon: '📜', short: 'Inteligencia' },
                        sabiduria: { icon: '🔮', short: 'Sabiduría' },
                        carisma: { icon: '👑', short: 'Carisma' }
                      };
                      const meta = attrMeta[key] || { icon: '◆', short: key };
                      return (
                        <div 
                          key={key} 
                          className={`talisman-card p-2.5 text-center rounded-xl relative overflow-hidden group ${
                            effective.isPenalized 
                              ? 'border-blood/60 bg-blood/10 shadow-[0_0_12px_rgba(138,28,28,0.3)]' 
                              : ''
                          }`}
                        >
                           <div className="flex items-center justify-center gap-1 text-[10px] text-gold-dim font-display tracking-widest uppercase mb-1">
                              <span className="text-xs">{meta.icon}</span>
                              <span className="truncate">{meta.short}</span>
                           </div>
                           <span className={`block text-2xl font-display font-bold tracking-tight drop-shadow-md ${effective.isPenalized ? 'text-blood-bright animate-pulse' : 'text-bone group-hover:text-gold transition-colors'}`}>
                             {effective.value}
                           </span>
                           {effective.isPenalized && (
                             <span className="text-[9px] uppercase tracking-wider text-blood-bright font-bold">Penalizado</span>
                           )}
                        </div>
                      );
                   })}
                 </div>
              </div>
              <div className="mb-6">
                 <h3 className="text-gold-dim text-xs uppercase tracking-[0.2em] mb-3.5 font-display font-bold border-b border-gold-dim/25 pb-2">Crónica de la Vigilia</h3>
                 <div className="space-y-2.5">
                    <div className="flex justify-between items-center bg-black/40 border border-gold-dim/20 p-3 rounded-xl shadow-inner">
                       <span className="text-[10px] uppercase tracking-[0.2em] text-parchment-dim font-display">Pasajes Vívidos</span>
                       <span className="text-2xl font-display font-bold text-gold drop-shadow-[0_2px_8px_rgba(197,160,89,0.4)]">{gameState.turnCount}</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/40 border border-gold-dim/20 p-3 rounded-xl shadow-inner">
                       <span className="text-[10px] uppercase tracking-[0.2em] text-parchment-dim font-display">Templanza</span>
                       <span className={`text-xs font-display font-bold tracking-widest uppercase px-2.5 py-1 rounded border ${
                         conditionText === 'Vigoroso' 
                           ? 'text-emerald-400 bg-emerald-950/30 border-emerald-700/40' 
                           : conditionText === 'Agónico' || conditionText === 'Demente' 
                           ? 'text-blood-bright bg-blood/20 border-blood/60 animate-pulse' 
                           : 'text-amber-300 bg-amber-950/30 border-amber-700/40'
                       }`}>
                         {conditionText}
                       </span>
                    </div>
                    
                    {/* Token tracking */}
                    {gameState.sessionTokens && (
                      <div className="bg-black/40 border border-gold-dim/15 p-2.5 rounded-xl text-[10px] font-mono text-zinc-400 flex justify-between items-center">
                         <span className="text-zinc-500 uppercase font-display text-[9px] tracking-wider">Caudal Éter:</span>
                         <span className="text-gold-dim font-bold">{gameState.sessionTokens.totalTokens.toLocaleString()} tokens</span>
                      </div>
                    )}
                 </div>
              </div>
           </div>
           <div className="p-4 border-t border-gold-dim/25 bg-black/40 flex justify-center">
              <button 
                onClick={() => { audioSystem.playClick(); setShowDiceLog(true); }} 
                className="w-full py-2.5 px-3 flex items-center justify-center gap-2 text-parchment-dim hover:text-gold transition-all bg-black/50 hover:bg-gold/10 rounded-xl border border-gold-dim/30 hover:border-gold group shadow-md" 
                title="Abrir Registro del Azar y Tiradas"
              >
                 <span className="text-base group-hover:scale-125 transition-transform text-gold">🎲</span>
                 <span className="text-xs uppercase tracking-[0.2em] font-display font-bold text-bone group-hover:text-gold">Registro del Azar</span>
              </button>
           </div>
        </aside>

        {/* CENTER COLUMN: Narrative */}
        <main className={`
            flex-col min-w-0 gothic-panel rounded-2xl overflow-hidden relative transition-all duration-700
            ${mobileTab === 'narrative' ? 'flex w-full' : 'hidden'}
            lg:flex lg:flex-1
            ${
              gameState.tensionLevel === 'combate' || gameState.tensionLevel === 'agonico'
                ? 'border-blood shadow-[0_0_40px_rgba(138,28,28,0.35)]'
                : gameState.tensionLevel === 'peligro'
                ? 'border-amber-600/70 shadow-[0_0_30px_rgba(180,80,10,0.25)]'
                : gameState.tensionLevel === 'tension'
                ? 'border-gold-dim/70 shadow-[0_0_25px_rgba(197,160,89,0.2)]'
                : gameState.tensionLevel === 'sospecha'
                ? 'border-cyan-950/80 shadow-[0_0_25px_rgba(30,50,70,0.25)]'
                : 'border-gold-dim/40 shadow-2xl'
            }
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

                {/* --- CARTOGRAFÍA Y ENTORNO VISIBLE --- */}
                {gameState.currentLocation && (
                  <div className="mb-10 p-5 bg-void/80 border border-gold-dim/40 rounded-xl shadow-lg backdrop-blur-md animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-gold-dim to-transparent opacity-40"></div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold-dim/20 pb-2 mb-3">
                       <div className="flex items-center gap-2">
                          <span className="text-gold text-lg">🏛️</span>
                          <h3 className="text-bone font-display font-bold text-lg tracking-wide">{gameState.currentLocation.name}</h3>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded border border-white/10 bg-panel text-parchment-dim">
                             {gameState.currentLocation.lighting === 'oscuridad_total' ? '🌑 Oscuridad Total' :
                              gameState.currentLocation.lighting === 'penumbra' ? '🕯️ Penumbra' :
                              gameState.currentLocation.lighting === 'antorchas' ? '🔥 Antorchas' : '☀️ Luz Gris'}
                          </span>
                          <span className={`text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded border font-bold ${
                             gameState.currentLocation.dangerLevel === 'letal' ? 'border-blood text-blood-bright bg-blood/10 animate-pulse' :
                             gameState.currentLocation.dangerLevel === 'inquietante' ? 'border-gold-dim text-gold bg-gold/10' :
                             'border-zinc-700 text-zinc-400 bg-zinc-900'
                          }`}>
                             {gameState.currentLocation.dangerLevel === 'letal' ? '☠️ Letal' :
                              gameState.currentLocation.dangerLevel === 'inquietante' ? '⚠️ Inquietante' : '🛡️ Seguro'}
                          </span>
                       </div>
                    </div>
                    <p className="text-sm md:text-base font-serif italic text-parchment-dim leading-relaxed mb-3">
                       {gameState.currentLocation.description}
                    </p>
                    {gameState.currentLocation.exits && gameState.currentLocation.exits.length > 0 && (
                       <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                          <span className="text-[9px] uppercase tracking-widest text-gold-dim font-display font-bold mr-1">Salidas Visibles:</span>
                          {gameState.currentLocation.exits.map((exit, eIdx) => (
                             <button
                                key={eIdx}
                                onClick={() => {
                                   audioSystem.playClick();
                                   onAction(`[DIRIGIRSE A] ${exit}`);
                                }}
                                disabled={isLoading || isDead}
                                className="text-xs font-serif text-parchment hover:text-gold bg-panel hover:bg-gold/10 border border-gold-dim/30 hover:border-gold px-2.5 py-1 rounded transition-all disabled:opacity-50 group flex items-center gap-1 shadow-sm"
                                title="Avanzar por esta salida"
                             >
                                <span className="text-gold-dim group-hover:text-gold">↳</span>
                                <span>{exit}</span>
                             </button>
                          ))}
                       </div>
                    )}
                  </div>
                )}

                {/* 
                   DYNAMIC CONTAINER FOR TEXT EFFECTS 
                   Applying style variable for dynamic aberration amount.
                   Applying conditional class for intermittent glitch, spectral text, and eyelid faint.
                */}
                <div 
                   className={`transition-all duration-300 dynamic-aberration ${isTextGlitching ? 'text-instability' : ''} ${
                     visualEffectsEnabled && gameState.sanity < 25 
                       ? 'madness-spectral-extreme' 
                       : visualEffectsEnabled && gameState.sanity < 40 
                       ? 'madness-spectral-text' 
                       : ''
                   } ${visualEffectsEnabled && isEyelidBlurring ? 'eyelid-faint' : ''} ${
                     visualEffectsEnabled && isTextGlitching && gameState.sanity < 35 ? 'madness-text-jitter' : ''
                   }`}
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
                         diceRolling ? (
                            <div className="animate-fade-in w-full flex flex-col items-center py-4">
                              <div className="w-20 h-20 border border-gold rounded-xl flex items-center justify-center animate-spin-fast shadow-[0_0_20px_rgba(197,160,89,0.8)] bg-gold/10 overflow-hidden relative">
                                 <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-gold/30 to-transparent animate-pulse-fast"></div>
                                 <span className="text-4xl font-display text-white animate-pulse-fast">?</span>
                              </div>
                              <p className="mt-6 text-gold tracking-[0.3em] uppercase text-xs animate-pulse font-display">Los huesos dictan sentencia...</p>
                            </div>
                         ) : (
                            <button onClick={(e) => { e.stopPropagation(); handleRollDice(e); }} disabled={diceRolling} className="bg-gold text-void px-8 py-3 rounded-lg font-display font-bold uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50 w-full">Lanzar D20</button>
                         )
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
                  <div ref={loadingRef} className="py-10 flex flex-col items-center justify-center gap-3.5 opacity-90 animate-fade-in">
                    <div className="flex gap-2.5">
                       <span className="w-2 h-2 bg-gold rounded-full animate-bounce [animation-delay:-0.3s] shadow-[0_0_8px_rgba(197,160,89,0.8)]"></span>
                       <span className="w-2 h-2 bg-gold rounded-full animate-bounce [animation-delay:-0.15s] shadow-[0_0_8px_rgba(197,160,89,0.8)]"></span>
                       <span className="w-2 h-2 bg-gold rounded-full animate-bounce shadow-[0_0_8px_rgba(197,160,89,0.8)]"></span>
                    </div>
                    <span className="text-gold font-display text-xs tracking-[0.25em] uppercase text-center max-w-md px-4 italic animate-pulse">
                       {LOADING_WHISPERS[whisperIdx]}
                    </span>
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
                         {gameState.currentTurn.suggestedActions.map((action, idx) => {
                            const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI'];
                            const roman = romanNumerals[idx] || String(idx + 1);
                            return (
                              <button 
                                key={idx} 
                                onClick={() => { audioSystem.playLowButton(); onAction(action); }} 
                                disabled={isLoading} 
                                className="choice-decree text-left px-4 py-3.5 rounded-xl group flex items-start justify-between gap-3 cursor-pointer"
                              >
                                 <div className="flex items-start gap-3">
                                    <span className="text-gold-dim group-hover:text-gold mt-0.5 text-sm font-serif font-bold transition-colors">❖</span>
                                    <span className="font-serif italic text-base md:text-lg leading-snug text-parchment group-hover:text-bone">{action}</span>
                                 </div>
                                 <span className="text-[10px] font-display font-bold text-gold-dim/80 group-hover:text-gold border border-gold-dim/30 group-hover:border-gold bg-black/60 px-2 py-0.5 rounded shrink-0 transition-colors shadow-sm">
                                    {roman}
                                 </span>
                              </button>
                            );
                         })}
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

        {/* RIGHT COLUMN: Tabbed Panel (Inventory, NPCs, Codex) */}
        <aside className={`
           flex-col gothic-panel z-20 overflow-hidden rounded-2xl
           ${mobileTab === 'inventory' ? 'flex absolute top-0 left-4 right-4 bottom-24 z-40' : 'hidden'}
           lg:flex lg:static lg:w-72 xl:w-80 lg:inset-auto lg:h-auto
        `}>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
              
              {/* TAB SELECTOR HEADER */}
              <div className="flex mb-5 bg-black/60 rounded-xl p-1 gap-1 border border-gold-dim/25 shadow-inner">
                 <button 
                   onClick={() => { audioSystem.playClick(); setRightTab('inventory'); }}
                   className={`flex-1 py-2 px-1.5 rounded-lg text-[10px] uppercase font-display font-bold tracking-wider transition-all ${rightTab === 'inventory' ? 'gothic-tab-active text-gold' : 'text-zinc-500 hover:text-parchment'}`}
                 >
                   Bolsillos ({currentInventoryCount})
                 </button>
                 <button 
                   onClick={() => { audioSystem.playClick(); setRightTab('npcs'); }}
                   className={`flex-1 py-2 px-1.5 rounded-lg text-[10px] uppercase font-display font-bold tracking-wider transition-all relative ${rightTab === 'npcs' ? 'gothic-tab-active text-gold' : 'text-zinc-500 hover:text-parchment'}`}
                 >
                   Personas {gameState.npcs && gameState.npcs.length > 0 && <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded-full bg-gold/20 text-gold font-bold">{gameState.npcs.length}</span>}
                 </button>
                 <button 
                   onClick={() => { audioSystem.playClick(); setRightTab('codex'); }}
                   className={`flex-1 py-2 px-1.5 rounded-lg text-[10px] uppercase font-display font-bold tracking-wider transition-all ${rightTab === 'codex' ? 'gothic-tab-active text-gold' : 'text-zinc-500 hover:text-parchment'}`}
                 >
                   Códice
                 </button>
              </div>

              {/* TAB 1: INVENTORY */}
              {rightTab === 'inventory' && (
                <div className="animate-fade-in space-y-4">
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
                       {gameState.inventory.length === 0 ? <li className="text-zinc-600 italic text-sm py-4 text-center">Bolsillos vacíos.</li> : 
                          gameState.inventory.map((item: InventoryItem, i) => {
                             const isSelected = selectedItem === item.name;
                             const isSource = combineSource === item.name;
                             const isLocked = waitingForDismiss || diceRolling;
                             return (
                                <li key={i} className={`relative ${isLocked ? 'cursor-not-allowed opacity-50 grayscale' : ''}`} onClick={() => handleItemClick(item.name)}>
                                   <div className={`relic-card flex flex-col gap-1.5 p-3 rounded-xl border transition-all group cursor-pointer ${isSource ? 'border-gold bg-gold/15 shadow-[0_0_15px_rgba(197,160,89,0.3)]' : ''} ${isSelected ? 'border-gold bg-white/10 shadow-md ring-1 ring-gold/40' : 'border-gold-dim/20 hover:border-gold-dim/60'} ${combineSource && !isSource ? 'animate-pulse hover:border-gold cursor-copy' : ''}`}>
                                     <div className="flex items-start justify-between gap-2">
                                       <div className="flex items-start gap-2">
                                          <span className="text-gold mt-1 text-[10px] group-hover:scale-125 transition-transform">◆</span>
                                          <span className={`text-base md:text-lg font-serif font-bold leading-tight ${isSelected || isSource ? 'text-bone' : 'text-parchment group-hover:text-bone'}`}>{item.name}</span>
                                       </div>
                                     </div>
                                     {item.tags && item.tags.length > 0 && (
                                       <div className="flex flex-wrap gap-1.5 ml-4 mt-0.5">
                                         {item.tags.map((tag, tIdx) => {
                                            const lower = tag.toLowerCase();
                                            const isWorn = lower.includes('mella') || lower.includes('desgasta') || lower.includes('oxida') || lower.includes('vaci');
                                            const isSharp = lower.includes('afila') || lower.includes('arma') || lower.includes('letal');
                                            const isMystic = lower.includes('mág') || lower.includes('reliquia') || lower.includes('encanta');
                                            return (
                                              <span 
                                                key={tIdx} 
                                                className={`text-[9px] uppercase font-display tracking-widest px-2 py-0.5 rounded border font-bold ${
                                                  isWorn ? 'border-amber-700/60 text-amber-300 bg-amber-950/40' :
                                                  isSharp ? 'border-blood/60 text-blood-bright bg-blood/25' :
                                                  isMystic ? 'border-purple-500/60 text-purple-300 bg-purple-950/40' :
                                                  'border-zinc-700 text-zinc-300 bg-black/60'
                                                }`}
                                              >
                                                {tag}
                                              </span>
                                            );
                                         })}
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
              )}

              {/* TAB 2: DRAMATIS PERSONAE (PNJS) */}
              {rightTab === 'npcs' && (
                <div className="animate-fade-in space-y-4">
                    <div className="flex justify-between items-center border-b border-gold-dim/20 pb-2 mb-4">
                       <h3 className="text-gold-dim text-xs uppercase tracking-[0.2em] font-display font-bold">Dramatis Personae</h3>
                       <span className="text-[10px] font-display font-bold tracking-widest text-parchment-dim">{(gameState.npcs || []).length} Registrados</span>
                    </div>
                    {(!gameState.npcs || gameState.npcs.length === 0) ? (
                       <p className="text-zinc-600 italic text-sm py-8 text-center leading-relaxed">
                          Ningún rostro grabado en tu memoria. Las sombras caminan solas.
                       </p>
                    ) : (
                       <div className="space-y-3">
                          {gameState.npcs.map((npc) => {
                             const relBadge = getRelationshipBadge(npc.relationship);
                             const statusBadge = getStatusBadge(npc.status);
                             const isSelected = selectedNpcId === npc.id;
                             return (
                                <div 
                                  key={npc.id}
                                  onClick={() => handleNpcClick(npc.id)}
                                  className={`p-3 rounded-lg border transition-all cursor-pointer group ${isSelected ? 'border-gold bg-white/5 shadow-md' : 'border-gold-dim/20 bg-void/30 hover:border-gold-dim hover:bg-white/5'}`}
                                >
                                   <div className="flex justify-between items-start gap-2 mb-1">
                                      <h4 className={`font-display font-bold text-sm tracking-wide ${isSelected ? 'text-bone' : 'text-parchment group-hover:text-bone'}`}>
                                         {npc.name}
                                      </h4>
                                      <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${relBadge.bg}`}>
                                         {relBadge.label}
                                      </span>
                                   </div>
                                   <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-2">
                                      <span className="italic font-serif">{npc.role}</span>
                                      <span className={`flex items-center gap-1 ${statusBadge.color}`}>
                                         <span>{statusBadge.icon}</span>
                                         <span>{statusBadge.label}</span>
                                      </span>
                                   </div>
                                   {npc.location && (
                                      <div className="text-[9px] text-zinc-500 font-serif truncate">
                                         📍 {npc.location}
                                      </div>
                                   )}
                                </div>
                             );
                          })}
                       </div>
                    )}
                </div>
              )}

              {/* TAB 3: CODEX & NARRATIVE THREADS */}
              {rightTab === 'codex' && (
                <div className="animate-fade-in space-y-6">
                    {/* ACTIVE THREADS */}
                    {gameState.activeThreads && gameState.activeThreads.length > 0 && (
                      <div>
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

                    {/* WORLD FACTS */}
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
              )}

           </div>
        </aside>

        {/* MOBILE TABS */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4 h-16 bg-panel/95 backdrop-blur-md border border-gold-dim/40 rounded-2xl flex items-center justify-around z-50 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
           <button onClick={() => { audioSystem.playClick(); setMobileTab('character'); }} className={`flex flex-col items-center justify-center w-full h-full rounded-l-2xl transition-all ${mobileTab === 'character' ? 'text-gold bg-white/5 font-bold' : 'text-zinc-500 hover:text-parchment'}`}>
              <span className="text-lg mb-0.5">👤</span>
              <span className="text-[9px] uppercase tracking-widest font-display">Personaje</span>
           </button>
           <div className="w-px h-8 bg-gold-dim/20"></div>
           <button onClick={() => { audioSystem.playClick(); setMobileTab('narrative'); }} className={`flex flex-col items-center justify-center w-full h-full transition-all ${mobileTab === 'narrative' ? 'text-gold bg-white/5 font-bold' : 'text-zinc-500 hover:text-parchment'}`}>
              <span className="text-lg mb-0.5">📜</span>
              <span className="text-[9px] uppercase tracking-widest font-display">Crónica</span>
           </button>
           <div className="w-px h-8 bg-gold-dim/20"></div>
           <button onClick={() => { audioSystem.playClick(); setMobileTab('inventory'); }} className={`flex flex-col items-center justify-center w-full h-full rounded-r-2xl transition-all relative ${mobileTab === 'inventory' ? 'text-gold bg-white/5 font-bold' : 'text-zinc-500 hover:text-parchment'}`}>
              <span className="text-lg mb-0.5">🎒</span>
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase tracking-widest font-display">Códice</span>
                {(currentInventoryCount > 0 || (gameState.npcs && gameState.npcs.length > 0)) && (
                   <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse"></span>
                )}
              </div>
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
            {/* Quick Tactical Treatments if applicable */}
            {gameState.conditions && gameState.conditions.length > 0 && !showItemChat && (
              <div className="mb-3 p-2.5 bg-amber-950/30 border border-amber-700/40 rounded flex flex-col gap-1.5">
                <span className="text-[9px] uppercase tracking-wider text-amber-400 font-display font-bold">Tratar Estados con este Objeto</span>
                {gameState.conditions.map(c => (
                   <button
                     key={c.id}
                     onClick={() => {
                        audioSystem.playLowButton();
                        onAction(`[TRATAR ESTADO] Aplico ${activeItemObj.name} para intentar aliviar o curar mi estado de ${c.name} (${c.type}).`);
                        setSelectedItem(null);
                     }}
                     className="text-left text-xs px-2.5 py-1.5 bg-black/40 hover:bg-gold/20 hover:text-gold border border-white/5 rounded transition-colors text-parchment-dim flex items-center justify-between"
                   >
                     <span>Aliviar {c.name}</span>
                     <span className="text-[10px] text-zinc-500 font-mono">1 Turno</span>
                   </button>
                ))}
              </div>
            )}

            <div className={`grid grid-cols-2 gap-2.5 mb-4 ${showItemChat ? 'hidden' : 'grid'}`}>
               <button onClick={() => handleUseItem(activeItemObj.name)} disabled={isLoading} className="px-3 py-2.5 border border-zinc-700 hover:border-gold hover:text-gold hover:bg-white/5 text-parchment-dim font-display text-xs tracking-[0.15em] font-bold transition-all rounded shadow-sm">USAR</button>
               <button onClick={() => handleEquipItem(activeItemObj.name)} disabled={isLoading} className="px-3 py-2.5 border border-zinc-700 hover:border-gold hover:text-gold hover:bg-white/5 text-parchment-dim font-display text-xs tracking-[0.15em] font-bold transition-all rounded shadow-sm">EQUIPAR</button>
               <button onClick={() => handleInspectItem(activeItemObj.name)} disabled={isLoading} className="px-3 py-2.5 border border-zinc-700 hover:border-gold hover:text-gold hover:bg-white/5 text-parchment-dim font-display text-xs tracking-[0.15em] font-bold transition-all rounded shadow-sm">EXAMINAR</button>
               <button onClick={() => handleCombineStart(activeItemObj.name)} disabled={isLoading} className="px-3 py-2.5 border border-zinc-700 hover:border-gold hover:text-gold hover:bg-white/5 text-parchment-dim font-display text-xs tracking-[0.15em] font-bold transition-all rounded shadow-sm">COMBINAR</button>
               <button onClick={() => handleDiscardItem(activeItemObj.name)} disabled={isLoading} className="px-3 py-2.5 border border-zinc-800 hover:border-blood hover:bg-blood/10 hover:text-blood-bright text-zinc-500 font-display text-xs tracking-[0.15em] font-bold transition-all rounded shadow-sm">DESCARTAR</button>
               <button onClick={() => { audioSystem.playClick(); setShowItemChat(true); }} disabled={isLoading} className="px-3 py-2.5 border border-gold/40 hover:bg-gold/10 hover:border-gold text-gold font-display text-xs tracking-[0.15em] font-bold transition-all rounded shadow-[0_0_10px_rgba(197,160,89,0.1)]">ACCIÓN LIBRE</button>
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

      {/* NEW: NPC DOSSIER MODAL */}
      {activeNpcObj && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedNpcId(null)}></div>
             <div className="relative bg-panel border-2 border-gold-dim rounded-2xl w-full max-w-lg shadow-[0_0_60px_rgba(197,160,89,0.2)] p-6 md:p-8 animate-fade-in flex flex-col">
                 <div className="flex justify-between items-start border-b border-gold-dim/40 pb-4 mb-4">
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                          <span className="text-gold text-xl">👤</span>
                          <h3 className="text-2xl font-display font-bold text-bone">{activeNpcObj.name}</h3>
                       </div>
                       <p className="text-gold-dim font-serif italic text-sm">{activeNpcObj.role}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                       <button onClick={() => setSelectedNpcId(null)} className="text-zinc-500 hover:text-white transition-colors mb-1">✕</button>
                       <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border font-bold ${getRelationshipBadge(activeNpcObj.relationship).bg}`}>
                          {getRelationshipBadge(activeNpcObj.relationship).label}
                       </span>
                       <span className={`text-[10px] flex items-center gap-1 font-serif ${getStatusBadge(activeNpcObj.status).color}`}>
                          <span>{getStatusBadge(activeNpcObj.status).icon}</span>
                          <span>{getStatusBadge(activeNpcObj.status).label}</span>
                       </span>
                    </div>
                 </div>

                 <div className="space-y-4 mb-6 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1">
                    <div>
                       <span className="text-[9px] uppercase tracking-widest text-gold-dim font-display font-bold block mb-1">Aspecto y Comportamiento</span>
                       <p className="text-base text-parchment font-serif italic leading-relaxed bg-void/40 p-3 rounded-lg border border-white/5">
                          "{activeNpcObj.description}"
                       </p>
                    </div>

                    {activeNpcObj.notes && (
                       <div>
                          <span className="text-[9px] uppercase tracking-widest text-blood-bright font-display font-bold block mb-1">Secretos o Notas Clave</span>
                          <p className="text-sm text-parchment-dim font-serif bg-blood/10 border border-blood/20 p-3 rounded-lg leading-relaxed">
                             {activeNpcObj.notes}
                          </p>
                       </div>
                    )}

                    {activeNpcObj.location && (
                       <div className="text-xs text-zinc-500 font-serif flex items-center gap-1.5">
                          <span>📍</span>
                          <span>Ubicación: <strong className="text-parchment-dim">{activeNpcObj.location}</strong></span>
                       </div>
                    )}
                 </div>

                 {/* ACTION BUTTONS ON NPC */}
                 {!showNpcChat ? (
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-gold-dim/20">
                       <button onClick={() => handleTalkToNpc(activeNpcObj.name)} disabled={isLoading || activeNpcObj.status === 'muerto'} className="px-3 py-2.5 border border-zinc-700 hover:border-gold hover:text-gold hover:bg-white/5 text-parchment-dim font-display text-xs tracking-widest font-bold transition-all rounded disabled:opacity-30">HABLAR</button>
                       <button onClick={() => handleInspectNpc(activeNpcObj.name)} disabled={isLoading} className="px-3 py-2.5 border border-zinc-700 hover:border-gold hover:text-gold hover:bg-white/5 text-parchment-dim font-display text-xs tracking-widest font-bold transition-all rounded disabled:opacity-30">EXAMINAR</button>
                       <button onClick={() => handleIntimidateNpc(activeNpcObj.name)} disabled={isLoading || activeNpcObj.status === 'muerto'} className="px-3 py-2.5 border border-amber-900/50 hover:border-amber-600 hover:text-amber-400 text-amber-500/80 font-display text-xs tracking-widest font-bold transition-all rounded disabled:opacity-30">INTIMIDAR</button>
                       <button onClick={() => handleAttackNpc(activeNpcObj.name)} disabled={isLoading || activeNpcObj.status === 'muerto'} className="px-3 py-2.5 border border-blood/40 hover:border-blood hover:bg-blood/20 text-blood-bright font-display text-xs tracking-widest font-bold transition-all rounded disabled:opacity-30">ATACAR</button>
                       <button onClick={() => { audioSystem.playClick(); setShowNpcChat(true); }} disabled={isLoading || activeNpcObj.status === 'muerto'} className="col-span-2 py-2.5 border border-gold/40 hover:bg-gold/10 hover:border-gold text-gold font-display text-xs tracking-widest font-bold transition-all rounded shadow-sm">ACCIÓN PERSONALIZADA</button>
                    </div>
                 ) : (
                    <div className="pt-2 border-t border-gold-dim/20 animate-fade-in">
                       <div className="flex justify-between items-center mb-2 text-[10px] uppercase tracking-widest text-gold font-display">
                          <span>Acción hacia {activeNpcObj.name}</span>
                          <button onClick={() => setShowNpcChat(false)} className="text-zinc-500 hover:text-white underline">Volver</button>
                       </div>
                       <form onSubmit={handleNpcChatSubmit}>
                          <input 
                             ref={npcChatInputRef}
                             type="text" 
                             value={npcChatInput}
                             onChange={(e) => setNpcChatInput(e.target.value)}
                             placeholder={`¿Qué quieres decirle o hacerle a ${activeNpcObj.name}?`}
                             className="w-full bg-void border border-gold-dim/50 p-3 text-parchment text-sm font-serif italic focus:outline-none focus:border-gold rounded mb-2.5"
                          />
                          <button type="submit" disabled={!npcChatInput.trim() || isLoading} className="w-full py-2.5 bg-gold/10 border border-gold/50 text-gold hover:bg-gold hover:text-void font-display uppercase text-xs font-bold tracking-widest transition-colors rounded">
                             EJECUTAR
                          </button>
                       </form>
                    </div>
                 )}
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

      {/* Atlas Modal (Cartografía Mental) */}
      <AtlasModal
        isOpen={showAtlasModal}
        onClose={() => setShowAtlasModal(false)}
        currentLocation={gameState.currentLocation}
        visitedLocations={gameState.visitedLocations || []}
      />

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => {
          setShowSettingsModal(false);
          setVisualEffectsEnabled(getVisualEffectsSetting());
        }} 
      />
    </div>
  );
};

export default GameScreen;