import { Character, GameState, ServiceResponse } from "../types";

export const startAdventure = async (character: Character): Promise<ServiceResponse> => {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'startAdventure', payload: character }),
      });

      if (!response.ok) {
        let errMsg = response.statusText;
        try {
           const errData = await response.json();
           if (errData.error) errMsg = errData.error;
        } catch (e) {}
        
        // If it's a 503 High Demand, and we have retries left, throw an error to catch and retry
        if (response.status === 503 || errMsg.includes('503') || errMsg.includes('High demand') || errMsg.includes('UNAVAILABLE')) {
           throw new Error(`RETRY_503:${errMsg}`);
        }
        
        throw new Error(errMsg);
      }

      const result = await response.json();
      if (result.error) throw new Error(result.error);
      return result;
    } catch (error: any) {
      if (error.message && error.message.startsWith('RETRY_503') && attempt < maxRetries - 1) {
        attempt++;
        const delay = attempt * 2000; // 2s, 4s...
        console.warn(`[Gemini] Servidor saturado (503). Reintentando en ${delay}ms... (Intento ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      // Clean up the prefix if it failed the last time
      throw new Error(error.message?.replace('RETRY_503:', '') || String(error));
    }
  }
  throw new Error("Timeout after multiple retries");
};

export const nextTurn = async (
  action: string,
  currentState: GameState
): Promise<ServiceResponse> => {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'nextTurn', payload: { action, currentState } }),
      });

      if (!response.ok) {
        let errMsg = response.statusText;
        try {
           const errData = await response.json();
           if (errData.error) errMsg = errData.error;
        } catch (e) {}
        
        // If it's a 503 High Demand, and we have retries left, throw an error to catch and retry
        if (response.status === 503 || errMsg.includes('503') || errMsg.includes('High demand') || errMsg.includes('UNAVAILABLE')) {
           throw new Error(`RETRY_503:${errMsg}`);
        }
        
        throw new Error(errMsg);
      }

      const result = await response.json();
      if (result.error) throw new Error(result.error);
      return result;
    } catch (error: any) {
      if (error.message && error.message.startsWith('RETRY_503') && attempt < maxRetries - 1) {
        attempt++;
        const delay = attempt * 2000; // 2s, 4s...
        console.warn(`[Gemini] Servidor saturado (503). Reintentando en ${delay}ms... (Intento ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      // Clean up the prefix if it failed the last time
      throw new Error(error.message?.replace('RETRY_503:', '') || String(error));
    }
  }
  throw new Error("Timeout after multiple retries");
};