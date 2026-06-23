import React, { useState, useEffect } from 'react';
import { GameState, Character, GameStatus, TurnData, AIResponseSchema, WorldFact, InventoryItem, DiceRollLogEntry, NarrativeThread, Trauma, Phobia, ServiceResponse } from './types';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import HomeScreen from './components/HomeScreen';
import * as geminiService from './services/geminiService';
import { audioSystem } from './services/audioService';

const INITIAL_HP = 20;
const INITIAL_SANITY = 100;

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.HOME);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manage Audio Modes
  useEffect(() => {
    if (status === GameStatus.HOME || status === GameStatus.CHARACTER_CREATION) {
      audioSystem.setMode('intro');
    } else if (status === GameStatus.PLAYING || status === GameStatus.GAME_OVER) {
      audioSystem.setMode('game');
    }
  }, [status]);

  const handleNewGame = () => {
    setStatus(GameStatus.CHARACTER_CREATION);
  };

  const handleBackToHome = () => {
    setStatus(GameStatus.HOME);
  }

  const startGame = async (character: Character) => {
    setIsLoading(true);
    setErrorMsg(null);
    setStatus(GameStatus.LOADING);

    try {
      const initial: GameState = {
        character,
        history: [],
        narrativeHistory: [],
        currentTurn: null,
        hp: INITIAL_HP,
        maxHp: INITIAL_HP,
        sanity: INITIAL_SANITY,
        inventory: [], 
        worldFacts: [],
        activeThreads: [],
        traumas: [], 
        phobias: [], 
        turnCount: 0,
        pendingChallenge: null,
        diceLog: [],
        sessionTokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        lastTurnTokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
      };

      const serviceResponse: ServiceResponse = await geminiService.startAdventure(character);
      const response = serviceResponse.data;
      const usage = serviceResponse.usage;

      const introTurn: TurnData = {
        narrative: response.narrative,
        suggestedActions: response.suggestedActions
      };

      const initialInventory = response.inventoryAdd || [];
      
      const newFacts: WorldFact[] = (response.newWorldFacts || []).map(text => ({
        text,
        turnIndex: 0
      }));

      const initialThreads: NarrativeThread[] = response.newThreads || [];
      const initialTraumas: Trauma[] = response.newTraumas || [];
      const initialPhobias: Phobia[] = response.newPhobias || [];

      setGameState({
        ...initial,
        inventory: initialInventory,
        narrativeHistory: [introTurn],
        currentTurn: introTurn,
        history: [{ role: 'model', content: response.narrative }],
        worldFacts: newFacts,
        activeThreads: initialThreads,
        traumas: initialTraumas,
        phobias: initialPhobias,
        sessionTokens: usage,
        lastTurnTokens: usage
      });

      setStatus(GameStatus.PLAYING);
    } catch (e) {
      console.error(e);
      setErrorMsg("El narrador ha perdido la conexión con el éter. Inténtalo de nuevo.");
      setStatus(GameStatus.HOME);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterDiceRoll = (entry: DiceRollLogEntry) => {
    setGameState(prevState => {
      if (!prevState) return null;
      return {
        ...prevState,
        diceLog: [entry, ...prevState.diceLog]
      };
    });
  };

  const handleAction = async (actionText: string) => {
    if (!gameState) return;
    setIsLoading(true);

    try {
      const serviceResponse: ServiceResponse = await geminiService.nextTurn(actionText, gameState);
      const response = serviceResponse.data;
      const usage = serviceResponse.usage;

      setGameState(prevState => {
        if (!prevState) return null;

        // 1. Stats
        const maxHpChange = response.maxHpChange || 0;
        const newMaxHp = Math.max(1, prevState.maxHp + maxHpChange);
        const newHp = Math.max(0, Math.min(newMaxHp, prevState.hp + response.hpChange));
        const newSanity = Math.max(0, Math.min(100, prevState.sanity + response.sanityChange));
        
        // --- Inventory Logic ---
        let newInventory = [...prevState.inventory];
        
        // Remove items
        if (response.inventoryRemove && response.inventoryRemove.length > 0) {
          newInventory = newInventory.filter(i => !response.inventoryRemove.includes(i.name));
        }

        // Updates (Wear & Tear) - Process before Add to handle edge cases
        if (response.inventoryUpdates && response.inventoryUpdates.length > 0) {
           response.inventoryUpdates.forEach(update => {
              const idx = newInventory.findIndex(i => i.name === update.name);
              if (idx >= 0) {
                 newInventory[idx] = {
                    ...newInventory[idx],
                    description: update.newDescription || newInventory[idx].description,
                    tags: update.newTags || newInventory[idx].tags
                 };
              }
           });
        }

        // Add or Overwrite items
        if (response.inventoryAdd && response.inventoryAdd.length > 0) {
          response.inventoryAdd.forEach(newItem => {
             const existingIndex = newInventory.findIndex(i => i.name === newItem.name);
             if (existingIndex >= 0) {
               newInventory[existingIndex] = newItem;
             } else {
               newInventory.push(newItem);
             }
          });
        }

        // --- Narrative Threads Logic ---
        let updatedThreads = [...prevState.activeThreads];
        if (response.newThreads) {
          response.newThreads.forEach(thread => {
            const idx = updatedThreads.findIndex(t => t.id === thread.id);
            if (idx >= 0) updatedThreads[idx] = thread;
            else updatedThreads.push(thread);
          });
        }
        if (response.resolvedThreads) {
          updatedThreads = updatedThreads.filter(t => !response.resolvedThreads!.includes(t.id));
        }

        // --- TRAUMAS LOGIC ---
        // Safety: If game is over, do NOT resolve existing traumas. The body keeps the score.
        let updatedTraumas = [...(prevState.traumas || [])];
        if (response.newTraumas) {
           response.newTraumas.forEach(t => {
             if (!updatedTraumas.some(existing => existing.id === t.id)) {
                updatedTraumas.push(t);
             }
           });
        }
        if (response.resolvedTraumas && !response.isGameOver) {
           updatedTraumas = updatedTraumas.filter(t => !response.resolvedTraumas!.includes(t.id));
        }

        // --- PHOBIAS LOGIC ---
        // Safety: If game is over, do NOT resolve existing phobias.
        let updatedPhobias = [...(prevState.phobias || [])];
        if (response.newPhobias) {
           response.newPhobias.forEach(p => {
             if (!updatedPhobias.some(existing => existing.id === p.id)) {
                updatedPhobias.push(p);
             }
           });
        }
        if (response.resolvedPhobias && !response.isGameOver) {
           updatedPhobias = updatedPhobias.filter(p => !response.resolvedPhobias!.includes(p.id));
        }

        const newTurn: TurnData = {
          narrative: response.narrative,
          suggestedActions: response.suggestedActions
        };

        const newNarrativeHistory = [...prevState.narrativeHistory, newTurn];
        const newTurnIndex = newNarrativeHistory.length - 1;

        const newFacts: WorldFact[] = (response.newWorldFacts || []).map(text => ({
          text,
          turnIndex: newTurnIndex
        }));
        
        const newContextHistory = [
          ...prevState.history,
          { role: 'user' as const, content: actionText },
          { role: 'model' as const, content: response.narrative }
        ];

        // --- TOKEN CALCULATION ---
        const newSessionTokens = {
          inputTokens: prevState.sessionTokens.inputTokens + usage.inputTokens,
          outputTokens: prevState.sessionTokens.outputTokens + usage.outputTokens,
          totalTokens: prevState.sessionTokens.totalTokens + usage.totalTokens,
        };

        return {
          ...prevState,
          hp: newHp,
          maxHp: newMaxHp, 
          sanity: newSanity,
          inventory: newInventory,
          worldFacts: [...prevState.worldFacts, ...newFacts],
          activeThreads: updatedThreads,
          traumas: updatedTraumas,
          phobias: updatedPhobias,
          history: newContextHistory,
          narrativeHistory: newNarrativeHistory,
          currentTurn: newTurn,
          turnCount: prevState.turnCount + 1,
          pendingChallenge: response.challenge || null,
          sessionTokens: newSessionTokens,
          lastTurnTokens: usage
        };
      });

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!gameState) return;
    const dataStr = JSON.stringify(gameState);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `save_${gameState.character.name}_turn${gameState.turnCount}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoad = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const loadedState = JSON.parse(json);
        
        if (loadedState.character && loadedState.narrativeHistory) {
          // Migration: string[] inventory to object[]
          if (loadedState.inventory.length > 0 && typeof loadedState.inventory[0] === 'string') {
             loadedState.inventory = loadedState.inventory.map((name: string) => ({
               name,
               description: "Un objeto antiguo...",
               tags: [] 
             }));
          }

          if (!loadedState.diceLog) loadedState.diceLog = [];
          if (!loadedState.activeThreads) loadedState.activeThreads = [];
          if (!loadedState.traumas) loadedState.traumas = []; 
          if (!loadedState.phobias) loadedState.phobias = [];
          
          // Migration: Token Tracking defaults
          if (!loadedState.sessionTokens) loadedState.sessionTokens = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
          if (!loadedState.lastTurnTokens) loadedState.lastTurnTokens = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

          setGameState(loadedState as GameState);
          setStatus(GameStatus.PLAYING);
        } else {
          alert("Archivo de guardado inválido.");
        }
      } catch (err) {
        console.error(err);
        alert("Error al leer el archivo.");
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    setGameState(null);
    setStatus(GameStatus.HOME);
  };

  const renderContent = () => {
    if (isLoading && status === GameStatus.LOADING && !gameState) {
       return <StartScreen onStart={startGame} onBack={handleBackToHome} isLoading={true} />; 
    }

    switch (status) {
      case GameStatus.HOME:
        return <HomeScreen onNewGame={handleNewGame} onLoadGame={handleLoad} />;
      case GameStatus.CHARACTER_CREATION:
        return <StartScreen onStart={startGame} onBack={handleBackToHome} isLoading={isLoading} />;
      case GameStatus.PLAYING:
      case GameStatus.GAME_OVER:
        return gameState ? (
          <GameScreen 
            gameState={gameState} 
            onAction={handleAction} 
            onRegisterDiceRoll={handleRegisterDiceRoll}
            isLoading={isLoading}
            onSave={handleSave}
            onLoad={handleLoad}
            onReset={handleReset}
          />
        ) : null;
      default:
        return <HomeScreen onNewGame={handleNewGame} onLoadGame={handleLoad} />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {renderContent()}
      
      {errorMsg && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-900/90 text-white px-6 py-3 rounded border border-red-500 z-50 animate-bounce">
          {errorMsg}
        </div>
      )}
    </div>
  );
};

export default App;