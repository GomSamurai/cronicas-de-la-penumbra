import { Character, GameState, ServiceResponse } from "../types";

export const startAdventure = async (character: Character): Promise<ServiceResponse> => {
  try {
    const response = await fetch('/api/game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'startAdventure', payload: character }),
    });

    if (!response.ok) {
      let errMsg = response.statusText;
      try {
         const errData = await response.json();
         if (errData.error) errMsg = errData.error;
      } catch (e) {}
      throw new Error(errMsg);
    }

    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result;
  } catch (error) {
    console.error("Error starting adventure:", error);
    throw error;
  }
};

export const nextTurn = async (
  action: string,
  currentState: GameState
): Promise<ServiceResponse> => {
  try {
    const response = await fetch('/api/game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'nextTurn', payload: { action, currentState } }),
    });

    if (!response.ok) {
      let errMsg = response.statusText;
      try {
         const errData = await response.json();
         if (errData.error) errMsg = errData.error;
      } catch (e) {}
      throw new Error(errMsg);
    }

    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result;
  } catch (error) {
    console.error("Error in next turn:", error);
    throw error;
  }
};