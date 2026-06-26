
export enum GameStatus {
  HOME = 'HOME',
  CHARACTER_CREATION = 'CHARACTER_CREATION',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface CharacterAttributes {
  fuerza: number;      // Atletismo
  destreza: number;    // Acrobacias, Juego de Manos, Sigilo
  constitucion: number; // Resistencia física
  inteligencia: number; // Historia, Investigación, Naturaleza, Religión
  sabiduria: number;   // Trato Animales, Intuición, Medicina, Percepción, Supervivencia
  carisma: number;     // Engaño, Intimidación, Persuasión, Representación
}

export interface Character {
  name: string;
  archetype: string;
  attributes: CharacterAttributes;
  bio: string;
}

export interface TurnData {
  narrative: string;
  suggestedActions: string[];
}

export interface WorldFact {
  text: string;
  turnIndex: number;
}

export interface NarrativeThread {
  id: string;
  title: string;
  description: string; // New: Contextual description of the thread
  status: 'active' | 'resolved';
}

// --- NEW AFFLICTION SYSTEM ---
export interface Trauma {
  id: string;          // e.g., "broken_leg"
  name: string;        // e.g., "Pierna Fracturada"
  description: string; // e.g., "El hueso presiona la carne."
  effect: string;      // Narrative summary "-2 STR"
  modifier?: {         // STRICT MECHANICAL MODIFIER
    attribute: keyof CharacterAttributes;
    value: number;     // e.g., -2
  };
}

export interface Phobia {
  id: string;          // e.g., "nyctophobia"
  name: string;        // e.g., "Nictofobia"
  description: string; // e.g., "Las sombras se mueven cuando no las miras."
  trigger: string;     // Narrative trigger condition
}
// -----------------------------

export interface InventoryItem {
  name: string;
  description: string;
  tags?: string[]; // New: ["Mellada", "Oxidada", "Encantada"]
}

export interface Challenge {
  attribute: keyof CharacterAttributes;
  difficulty: number;
  context: string; 
}

export interface DiceRollLogEntry {
  turnIndex: number;
  attribute: string;
  roll: number;
  modifier: number;
  total: number;
  difficulty: number;
  result: 'success' | 'failure' | 'critical' | 'fumble';
  context: string;
  timestamp: number;
}

// --- TOKEN TRACKING ---
export interface TokenUsage {
  inputTokens: number;  // Coste de contexto enviado
  outputTokens: number; // Coste de respuesta generada
  totalTokens: number;  // Suma
}

export interface GameState {
  character: Character;
  history: Array<{ role: 'user' | 'model'; content: string }>;
  narrativeHistory: Array<TurnData>;
  currentTurn: TurnData | null;
  hp: number;
  maxHp: number;
  sanity: number;
  inventory: InventoryItem[]; 
  worldFacts: WorldFact[];
  activeThreads: NarrativeThread[];
  
  // New State Fields
  traumas: Trauma[];
  phobias: Phobia[];
  environmentContext: string;


  turnCount: number;
  pendingChallenge: Challenge | null;
  diceLog: DiceRollLogEntry[];

  // Token Tracking
  sessionTokens: TokenUsage;   // Acumulado total de la partida
  lastTurnTokens: TokenUsage;  // Consumo del último turno
}

// AI Response Schema Structure
export interface AIResponseSchema {
  narrative: string;
  hpChange: number;
  maxHpChange?: number;
  sanityChange: number;
  inventoryAdd: InventoryItem[];
  inventoryRemove: string[];
  
  // New: Update existing items (wear and tear)
  inventoryUpdates?: { 
    name: string; 
    newDescription?: string; 
    newTags?: string[]; 
  }[];

  newWorldFacts: string[];
  
  newThreads?: NarrativeThread[];
  resolvedThreads?: string[];
  
  // New Schema Fields
  newTraumas?: Trauma[];
  resolvedTraumas?: string[]; // IDs to remove
  newPhobias?: Phobia[];
  resolvedPhobias?: string[]; // IDs to remove
  environmentContext?: string; // New: AI internal spatial/situational memory

  suggestedActions: string[];
  isGameOver: boolean;
  challenge?: Challenge;
}

// Helper interface for Service responses including metadata
export interface ServiceResponse {
  data: AIResponseSchema;
  usage: TokenUsage;
}