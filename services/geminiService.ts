import { Character, GameState, ServiceResponse } from "../types";

export const getCustomApiKey = (): string => {
  try {
    return (localStorage.getItem('penumbra_custom_api_key') || '').trim();
  } catch {
    return '';
  }
};

export const getSelectedModel = (): string => {
  try {
    return localStorage.getItem('penumbra_selected_model') || 'gemini-2.5-flash';
  } catch {
    return 'gemini-2.5-flash';
  }
};

export const testConnection = async (
  customApiKey?: string, 
  model?: string
): Promise<{ success: boolean; message: string; model?: string }> => {
  try {
    const key = customApiKey !== undefined ? customApiKey.trim() : getCustomApiKey();
    const mdl = model || getSelectedModel();

    const response = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        type: 'testConnection', 
        customApiKey: key, 
        model: mdl 
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.error || 'Fallo de conexión con el éter' };
    }
    return { success: true, message: 'Conexión con el éter verificada con éxito.', model: data.model };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Error de red al intentar contactar con el éter.' };
  }
};

export const getGraveyardEchoes = () => {
  try {
    const raw = localStorage.getItem('penumbra_graveyard');
    if (!raw) return [];
    const souls = JSON.parse(raw);
    return (Array.isArray(souls) ? souls : []).slice(0, 4).map((s: any) => ({
      name: s.name,
      archetype: s.archetype,
      deathLocation: s.deathLocation || 'tierras de la penumbra',
      legacyItem: s.legacyItem || 'un amuleto mellado'
    }));
  } catch {
    return [];
  }
};

export const startAdventure = async (character: Character): Promise<ServiceResponse> => {
  const maxRetries = 3;
  let attempt = 0;
  const customApiKey = getCustomApiKey();
  const model = getSelectedModel();
  const ecos = getGraveyardEchoes();

  while (attempt < maxRetries) {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'startAdventure', 
          payload: { ...character, ecosDelPanteon: ecos },
          customApiKey: customApiKey || undefined,
          model
        }),
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
  throw new Error("Tiempo de espera agotado tras varios reintentos con el éter");
};

export const nextTurn = async (
  action: string,
  currentState: GameState
): Promise<ServiceResponse> => {
  const maxRetries = 3;
  let attempt = 0;
  const customApiKey = getCustomApiKey();
  const model = getSelectedModel();
  const ecos = getGraveyardEchoes();

  while (attempt < maxRetries) {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'nextTurn', 
          payload: { action, currentState, ecosDelPanteon: ecos },
          customApiKey: customApiKey || undefined,
          model
        }),
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
  throw new Error("Tiempo de espera agotado tras varios reintentos con el éter");
};

export interface CharacterAiResponse {
  name?: string;
  archetype?: string;
  bio?: string;
  icon?: string;
  attributes?: {
    fuerza: number;
    destreza: number;
    constitucion: number;
    inteligencia: number;
    sabiduria: number;
    carisma: number;
  };
}

export const generateCharacterAi = async (payload: {
  mode: 'full' | 'name' | 'archetype' | 'sin';
  currentName?: string;
  currentArchetype?: string;
  currentBio?: string;
}): Promise<CharacterAiResponse> => {
  const customApiKey = getCustomApiKey();
  const model = getSelectedModel();

  const response = await fetch('/api/game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'generateCharacterAi',
      payload,
      customApiKey: customApiKey || undefined,
      model
    }),
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
  return result.data;
};