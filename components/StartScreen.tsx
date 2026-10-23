import React, { useState, useEffect, useRef } from 'react';
import { Character, CharacterAttributes } from '../types';
import AudioController from './AudioController';
import { audioSystem } from '../services/audioService';

interface StartScreenProps {
  onStart: (character: Character) => void;
  onBack: () => void;
  isLoading: boolean;
}

export interface SavedCharacter extends Character {
  id: string;
  createdAt: string;
}

// Preset Data with Icons, Specializations, and Starting Equipment
interface PresetDataInfo {
  name: string;
  bio: string;
  icon: string;
  specialization: string;
  startingItems: string[];
  stats: CharacterAttributes;
}

const PRESET_DATA: Record<string, PresetDataInfo> = {
  "El Cirujano": {
    name: "Doctor Silas Vane",
    bio: "El temblor en mis manos no es miedo, es la abstinencia. Operé borracho a la hija del alcalde; creí que el alcohol afinaría mi pulso.",
    icon: "🩸",
    specialization: "Medicina forense, bisturí y amputaciones rápidas",
    startingItems: ["Bisturí oxidado", "Frasco de láudano turbio", "Vendas de lino sucio"],
    stats: { fuerza: 8, destreza: 15, constitucion: 8, inteligencia: 16, sabiduria: 14, carisma: 11 }
  },
  "La Institutriz": {
    name: "Señorita Isolde",
    bio: "El niño se ahogó en el estanque de los nenúfares mientras yo me dejaba poseer por el jardinero contra el muro húmedo del invernadero.",
    icon: "🥀",
    specialization: "Etiqueta cortesana, venenos discretos y perspicacia",
    startingItems: ["Horquilla de hueso afilada", "Diario con falso fondo", "Veneno de belladona"],
    stats: { fuerza: 6, destreza: 12, constitucion: 10, inteligencia: 14, sabiduria: 14, carisma: 16 }
  },
  "El Sepulturero": {
    name: "Arthur \"El Topo\" Griggs",
    bio: "Desenterré a mi propia esposa no por amor, sino por el anillo de oro que nos costó la comida de un año.",
    icon: "⚰️",
    specialization: "Fuerza bruta, palanca y familiaridad con los muertos",
    startingItems: ["Pala de hierro forjado", "Candil de aceite de ballena", "Anillo de bodas profanado"],
    stats: { fuerza: 16, destreza: 10, constitucion: 16, inteligencia: 8, sabiduria: 14, carisma: 8 }
  },
  "El Desertor": {
    name: "Cabo Kaelen",
    bio: "No huí del enemigo, huí del barro y la gangrena. Apuñalé a mi sargento por la espalda mientras dormía para robarle las botas secas y las raciones.",
    icon: "🗡️",
    specialization: "Emboscada, instinto de supervivencia y sigilo",
    startingItems: ["Daga militar mellada", "Capa de paño manchada", "Botas de oficial robadas"],
    stats: { fuerza: 14, destreza: 16, constitucion: 14, inteligencia: 10, sabiduria: 10, carisma: 8 }
  },
  "La Cortesana": {
    name: "Madame Lottie",
    bio: "La sífilis me está comiendo el tabique nasal, pero el hambre dolía más que la vergüenza. Dejé a mi recién nacido en el callejón de las curtidurías porque un cliente pagaba doble por no oír llantos.",
    icon: "💋",
    specialization: "Seducción, manipulación y red de secretos de alcoba",
    startingItems: ["Espejo de mano mellado", "Frasco de perfume embriagador", "Bolsa de terciopelo ajado"],
    stats: { fuerza: 8, destreza: 14, constitucion: 6, inteligencia: 12, sabiduria: 14, carisma: 18 }
  },
  "El Carnicero": {
    name: "Brannigan",
    bio: "Sabía que el cerdo estaba enfermo, la carne llena de quistes negros. Lo vendí barato al orfanato local para pagar mis deudas de juego.",
    icon: "🪓",
    specialization: "Despiece brutal, intimidación y resistencia física",
    startingItems: ["Cuchillo de desollar pesado", "Mandil de cuero manchado", "Ganchos de hierro forjado"],
    stats: { fuerza: 18, destreza: 10, constitucion: 16, inteligencia: 10, sabiduria: 6, carisma: 12 }
  },
  "El Erudito": {
    name: "Elias Thorne",
    bio: "Robé la obra maestra de mi mentor moribundo y la publiqué como mía. Cuando empezó a recuperarse y amenazó con hablar, la biblioteca ardió 'accidentalmente' con él dentro.",
    icon: "📜",
    specialization: "Lenguas muertas, ocultismo y descifrado de glifos",
    startingItems: ["Tomo encuadernado en piel", "Lupa de latón agrietada", "Frasco de tinta negra"],
    stats: { fuerza: 6, destreza: 12, constitucion: 8, inteligencia: 19, sabiduria: 12, carisma: 15 }
  },
  "El Aristócrata": {
    name: "Lord Valerius Blackwood",
    bio: "Aposté las escrituras de la mansión ancestral y perdí. Desesperado, entregué a mi hermana pequeña a un prestamista sifilítico y perdí también.",
    icon: "👑",
    specialization: "Persuasión aristocrática, soborno y astucia social",
    startingItems: ["Monedas de plata falsificadas", "Bastón con pomo de cuarzo", "Sello nobiliario desprovisto de feudo"],
    stats: { fuerza: 9, destreza: 12, constitucion: 10, inteligencia: 14, sabiduria: 8, carisma: 19 }
  },
  "El Psiconauta": {
    name: "Kaspar",
    bio: "No son alucinaciones. Pulvericé los huesos de mi abuelo para inhalarlos en la penumbra y abrir las hendiduras del Velo.",
    icon: "👁️",
    specialization: "Trance espectral, percepción del éter y tolerancia a la locura",
    startingItems: ["Mortero de hueso humano", "Bolsita de hongos secos", "Péndulo de plomo"],
    stats: { fuerza: 6, destreza: 10, constitucion: 7, inteligencia: 18, sabiduria: 17, carisma: 8 }
  },
  "La Taxidermista": {
    name: "Beatrice Crow",
    bio: "Cuando murió mi marido vacié su torso y lo rellené con serrín, alcanfor y lavanda. Es mucho mejor oyente ahora que cuando respiraba.",
    icon: "🧵",
    specialization: "Costura de tendones, preservación y anatomía de bestias",
    startingItems: ["Agujas curvas de tendón", "Ojos de vidrio ámbar", "Saco de serrín y alcanfor"],
    stats: { fuerza: 10, destreza: 17, constitucion: 12, inteligencia: 13, sabiduria: 10, carisma: 7 }
  },
  "El Ventrílocuo": {
    name: "Barnaby \"El Sr. Risas\"",
    bio: "El muñeco está tallado con la madera empapada en sangre de la horca del pueblo. Cuando el público duerme, juro que respira.",
    icon: "🎭",
    specialization: "Distracción vocal, ventriloquía e histeria psicológica",
    startingItems: ["Muñeco de madera de horca", "Caja de resonancia", "Guantes de cabritilla negra"],
    stats: { fuerza: 8, destreza: 16, constitucion: 10, inteligencia: 9, sabiduria: 6, carisma: 18 }
  }
};

const ARCHETYPES = Object.keys(PRESET_DATA);

// Configuration constants
const MAX_STARTING_POOL = 12;
const CUSTOM_BASE_ATTRIBUTE = 10;
const MIN_ATTRIBUTE = 5;
const MAX_ATTRIBUTE_CUSTOM = 19;

// Generators for Tabula Rasa
const RANDOM_NAMES = [
  "Silas Vane", "Isolde Blackwood", "Arthur Griggs", "Kaelen Graves", 
  "Madame Lottie", "Brannigan", "Elias Thorne", "Lord Valerius", 
  "Kaspar", "Beatrice Crow", "Barnaby", "Merrick Faust", 
  "Cassian Drake", "Morvath", "Rowena Croft", "Elowen Vance", 
  "Thaddeus Grimm", "Vespera Cross", "Bramwell Oakes", "Lucian Bell"
];

const ARCHETYPE_SUGGESTIONS = [
  "Inquisidor Renegado", "Boticario Venenoso", "Caballero Deshonrado", 
  "Ladrón de Tumbas", "Navegante Ciego", "Monje Apóstata", 
  "Cazador de Bestias", "Alquimista Cautivo", "Verdugo Jubilado"
];

const TRAGIC_SINS = [
  "Envenené las hostias de la abadía cuando el prior amenazó con delatar a mi hermana.",
  "Desenterré a la prometida del barón la noche de su boda para arrancarle el broche de esmeraldas de su cadáver frío.",
  "Hui de la trinchera dejando atrás a mi batallón entero; sus gritos en el barro aún me despiertan cada noche.",
  "Vendí ungüentos contaminados de viruela asegurando a los campesinos que curaban la peste de sus hijos.",
  "Firmé un pacto de sangre en una encrucijada para saldar mis deudas de dados; hoy las sombras reclaman mi cordura.",
  "Prendí fuego al hospicio con los huérfanos dentro para cobrar la recompensa de la hermandad.",
  "Delaté a mi mentor ante el Santo Oficio por un puñado de monedas de plata y un ascenso que nunca llegó.",
  "Asfixié a mi propio gemelo en la cuna porque la partera susurró que solo uno heredaría el don de la sangre."
];

const STAT_DESCRIPTIONS: Record<keyof CharacterAttributes, { icon: string; name: string; desc: string }> = {
  fuerza: { icon: "⚔️", name: "Fuerza", desc: "Golpe cuerpo a cuerpo, derribo de puertas y proezas físicas." },
  destreza: { icon: "🏹", name: "Destreza", desc: "Sigilo, evasión, ganzúas, acrobacias y reflejos felinos." },
  constitucion: { icon: "🛡️", name: "Constitución", desc: "Resistencia física, vitalidad máxima y tolerancia a venenos." },
  inteligencia: { icon: "📜", name: "Inteligencia", desc: "Historia, investigación analítica y descifrado de ocultismo." },
  sabiduria: { icon: "🔮", name: "Sabiduría", desc: "Percepción, medicina, supervivencia e intuición frente al engaño." },
  carisma: { icon: "👑", name: "Carisma", desc: "Engaño, intimidación, persuasión y presencia social." }
};

type CreationMode = 'preset' | 'custom' | 'saved';

const StartScreen: React.FC<StartScreenProps> = ({ onStart, onBack, isLoading }) => {
  const [mode, setMode] = useState<CreationMode>('preset');
  
  // Selection / Form State
  const [name, setName] = useState('');
  const [archetype, setArchetype] = useState<string>(ARCHETYPES[0]);
  const [customArchetype, setCustomArchetype] = useState('');
  const [bio, setBio] = useState('');
  
  // Attributes State
  const [attributes, setAttributes] = useState<CharacterAttributes>(PRESET_DATA[ARCHETYPES[0]].stats);
  const [pointsUsed, setPointsUsed] = useState(0);

  // Saved Characters Library
  const [savedCharacters, setSavedCharacters] = useState<SavedCharacter[]>([]);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved characters on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('penumbra_saved_characters');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedCharacters(parsed);
        }
      }
    } catch (e) {
      console.error("Error al cargar personajes guardados:", e);
    }
  }, []);

  // Update attributes, Name AND Bio when archetype changes (only in preset mode)
  useEffect(() => {
    if (mode === 'preset' && PRESET_DATA[archetype]) {
      const data = PRESET_DATA[archetype];
      setAttributes(data.stats);
      setName(data.name);
      setBio(data.bio);
    }
  }, [archetype, mode]);

  // Mode change handler
  const handleModeChange = (newMode: CreationMode) => {
    audioSystem.playClick();
    setMode(newMode);
    setSaveBanner(null);

    if (newMode === 'custom') {
      if (!customArchetype && !name) {
        setName('');
        setBio('');
        const initialStats = {
          fuerza: 10, destreza: 10, constitucion: 10, inteligencia: 10, sabiduria: 10, carisma: 10
        };
        setAttributes(initialStats);
        recalculatePoints(initialStats);
      }
    } else if (newMode === 'preset') {
      const data = PRESET_DATA[archetype];
      setAttributes(data.stats);
      setName(data.name);
      setBio(data.bio);
    }
  };

  const recalculatePoints = (attrs: CharacterAttributes) => {
    let used = 0;
    Object.values(attrs).forEach(val => {
      used += (val - CUSTOM_BASE_ATTRIBUTE);
    });
    setPointsUsed(used);
  };

  const handleAttributeChange = (attr: keyof CharacterAttributes, delta: number) => {
    const currentVal = attributes[attr];
    const newVal = currentVal + delta;
    
    // Bounds check
    const maxLimit = mode === 'custom' ? MAX_ATTRIBUTE_CUSTOM : 19;
    if (newVal < MIN_ATTRIBUTE || newVal > maxLimit) return;

    // Check pool constraint if increasing (only for custom mode)
    if (mode === 'custom' && delta > 0 && pointsUsed >= MAX_STARTING_POOL) return;

    audioSystem.playLowButton();
    const newAttributes = { ...attributes, [attr]: newVal };
    setAttributes(newAttributes);
    if (mode === 'custom') {
       recalculatePoints(newAttributes);
    }
  };

  // Quick Randomizers for Tabula Rasa
  const handleRandomName = () => {
    audioSystem.playClick();
    const rName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    setName(rName);
  };

  const handleRandomSin = () => {
    audioSystem.playClick();
    const rSin = TRAGIC_SINS[Math.floor(Math.random() * TRAGIC_SINS.length)];
    setBio(rSin);
  };

  const handleApplySuggestion = (sug: string) => {
    audioSystem.playClick();
    setCustomArchetype(sug);
  };

  const handleRandomDistribution = () => {
    audioSystem.playDiceRoll();
    // Start from 10 on all
    const newAttrs: CharacterAttributes = {
      fuerza: 10, destreza: 10, constitucion: 10, inteligencia: 10, sabiduria: 10, carisma: 10
    };
    const keys = Object.keys(newAttrs) as (keyof CharacterAttributes)[];
    
    // Distribute 12 points randomly
    let pointsToDistribute = MAX_STARTING_POOL;
    while (pointsToDistribute > 0) {
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      if (newAttrs[randomKey] < 17) {
        newAttrs[randomKey] += 1;
        pointsToDistribute -= 1;
      }
    }

    setAttributes(newAttrs);
    recalculatePoints(newAttrs);
  };

  const handleResetAttributes = () => {
    audioSystem.playClick();
    const flat: CharacterAttributes = {
      fuerza: 10, destreza: 10, constitucion: 10, inteligencia: 10, sabiduria: 10, carisma: 10
    };
    setAttributes(flat);
    recalculatePoints(flat);
  };

  // Save Character to Grimorio
  const handleSaveToGrimoire = () => {
    if (!name.trim() || !customArchetype.trim()) {
      alert("Introduce al menos un Nombre y un Origen antes de guardar en el Grimorio.");
      return;
    }

    audioSystem.playSuccess();
    const newSavedChar: SavedCharacter = {
      id: 'char_' + Date.now(),
      name: name.trim(),
      archetype: customArchetype.trim(),
      bio: bio.trim() || "Un alma sin confesar que vaga por la niebla.",
      attributes: { ...attributes },
      createdAt: new Date().toISOString()
    };

    const updated = [newSavedChar, ...savedCharacters];
    setSavedCharacters(updated);
    try {
      localStorage.setItem('penumbra_saved_characters', JSON.stringify(updated));
    } catch (e) {
      console.error("Error al guardar personaje:", e);
    }

    setSaveBanner(`¡${newSavedChar.name} ha sido grabado en el Grimorio de Almas!`);
    setTimeout(() => setSaveBanner(null), 4000);
  };

  // Delete Character from Grimorio
  const handleDeleteSavedChar = (id: string, charName: string) => {
    if (confirm(`¿Desterrar a ${charName} del Grimorio para siempre?`)) {
      audioSystem.playLowButton();
      const updated = savedCharacters.filter(c => c.id !== id);
      setSavedCharacters(updated);
      try {
        localStorage.setItem('penumbra_saved_characters', JSON.stringify(updated));
      } catch (e) {}
    }
  };

  // Load Saved Character into Editor
  const handleLoadSavedChar = (char: SavedCharacter) => {
    audioSystem.playClick();
    setName(char.name);
    setCustomArchetype(char.archetype);
    setBio(char.bio);
    setAttributes({ ...char.attributes });
    recalculatePoints(char.attributes);
    setMode('custom');
  };

  // Start with Saved Character directly
  const handleStartSavedChar = (char: SavedCharacter) => {
    audioSystem.playSuccess();
    onStart({
      name: char.name,
      archetype: char.archetype,
      bio: char.bio,
      attributes: char.attributes
    });
  };

  // Export / Import Grimoire
  const handleExportGrimoire = () => {
    audioSystem.playClick();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedCharacters, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `grimorio_vastagos_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportGrimoire = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          const merged = [...parsed, ...savedCharacters];
          // Remove duplicates by id or name
          const unique = merged.filter((item, index, self) =>
            index === self.findIndex((t) => t.name === item.name)
          );
          setSavedCharacters(unique);
          localStorage.setItem('penumbra_saved_characters', JSON.stringify(unique));
          audioSystem.playSuccess();
          alert(`¡${unique.length - savedCharacters.length} vástagos importados con éxito!`);
        }
      } catch (err) {
        alert("Archivo de Grimorio inválido.");
      }
    };
    reader.readAsText(file);
  };

  const handleStart = () => {
    if (!name.trim()) return;
    
    // In custom mode, validate points
    if (mode === 'custom') {
      if (pointsUsed > MAX_STARTING_POOL) return;
      if (!customArchetype.trim()) return;
    }

    const finalArchetype = mode === 'preset' ? archetype : customArchetype;

    audioSystem.playSuccess();
    onStart({
      name,
      archetype: finalArchetype,
      bio: bio || "Una vida trágica marcada por el destino de la penumbra.",
      attributes
    });
  };

  const pointsRemaining = MAX_STARTING_POOL - pointsUsed;
  const isCustomValid = mode === 'preset' || (mode === 'custom' && customArchetype.trim().length > 0 && pointsRemaining >= 0);
  const activePresetInfo = PRESET_DATA[archetype];

  // Helper to format stat modifier
  const getModifier = (val: number) => {
    const mod = Math.floor((val - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-void text-parchment relative overflow-y-auto selection:bg-blood selection:text-white">
      
      {/* --- ATMOSPHERE --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-texture opacity-30"></div>
        <div className="absolute inset-0 bg-vignette opacity-80 animate-pulse-slow"></div>
        <div className="bg-mist animate-mist-1"></div>
        <div className="bg-mist animate-mist-2"></div>

        {/* Ash Particles */}
        <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
                <div 
                   key={i} 
                   className="ash-particle"
                   style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      width: `${Math.random() * 2 + 1}px`,
                      height: `${Math.random() * 2 + 1}px`,
                      '--duration': `${Math.random() * 10 + 10}s`,
                      '--delay': `-${Math.random() * 20}s`,
                   } as React.CSSProperties}
                ></div>
            ))}
        </div>
      </div>

      <div className="max-w-6xl w-full grid lg:grid-cols-12 gap-6 md:gap-8 relative z-10 py-6">
        
        {/* Header / Navigation */}
        <div className="lg:col-span-12 flex justify-between items-center mb-2 border-b border-gold-dim/30 pb-4">
          <button 
            onClick={() => { audioSystem.playClick(); onBack(); }}
            className="flex items-center gap-2 text-gold-dim hover:text-gold transition-colors uppercase text-xs tracking-[0.25em] font-display font-bold group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span>Regresar a la Penumbra</span>
          </button>
          
          <div className="flex items-center gap-4">
             <AudioController variant="header" />
             <div className="h-4 w-px bg-gold-dim/30 hidden md:block"></div>
             <div className="flex items-center gap-2">
                <span className="text-gold text-lg">⚖️</span>
                <h1 className="text-2xl md:text-3xl font-display text-bone tracking-widest uppercase font-bold drop-shadow-md">
                  La Vigilia
                </h1>
             </div>
          </div>
        </div>

        {/* MODE SELECTOR TABS (3 TABS) */}
        <div className="lg:col-span-12">
          <div className="flex flex-wrap bg-black/60 border border-gold-dim/30 rounded-xl p-1.5 gap-1.5 shadow-xl">
            <button 
              onClick={() => handleModeChange('preset')}
              className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-lg text-xs uppercase font-display font-bold tracking-[0.18em] transition-all flex items-center justify-center gap-2 ${
                mode === 'preset' 
                  ? 'gothic-tab-active text-gold border border-gold-dim/60 shadow-md' 
                  : 'text-zinc-500 hover:text-parchment hover:bg-white/5'
              }`}
            >
              <span>📜</span>
              <span>Destinos Escritos</span>
            </button>

            <button 
              onClick={() => handleModeChange('custom')}
              className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-lg text-xs uppercase font-display font-bold tracking-[0.18em] transition-all flex items-center justify-center gap-2 ${
                mode === 'custom' 
                  ? 'gothic-tab-active text-gold border border-gold-dim/60 shadow-md' 
                  : 'text-zinc-500 hover:text-parchment hover:bg-white/5'
              }`}
            >
              <span>⚡</span>
              <span>Tabula Rasa (Forja)</span>
            </button>

            <button 
              onClick={() => handleModeChange('saved')}
              className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-lg text-xs uppercase font-display font-bold tracking-[0.18em] transition-all flex items-center justify-center gap-2 ${
                mode === 'saved' 
                  ? 'gothic-tab-active text-gold border border-gold-dim/60 shadow-md' 
                  : 'text-zinc-500 hover:text-parchment hover:bg-white/5'
              }`}
            >
              <span>🕯️</span>
              <span>Grimorio de Almas ({savedCharacters.length})</span>
            </button>
          </div>
        </div>

        {/* NOTIFICATION BANNER */}
        {saveBanner && (
          <div className="lg:col-span-12 p-3 bg-gold/15 border border-gold text-gold font-display text-xs uppercase tracking-widest text-center rounded-xl animate-fade-in shadow-[0_0_20px_rgba(197,160,89,0.3)]">
            {saveBanner}
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 1: DESTINOS ESCRITOS (PRESETS SHOWCASE)                   */}
        {/* ============================================================== */}
        {mode === 'preset' && (
          <>
            {/* Left Column: Archetype Showcase (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="gothic-panel rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-dim to-transparent opacity-60"></div>
                
                <div className="flex items-center justify-between mb-4 border-b border-gold-dim/20 pb-3">
                  <span className="text-[10px] uppercase font-display tracking-[0.25em] text-gold-dim font-bold">
                    Elige tu Condena Heredada
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    11 Arquetipos
                  </span>
                </div>

                {/* CUSTOM GOTHIC ARCHETYPE SELECTOR (NO BROWSER BLUE SELECT) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6 max-h-52 overflow-y-auto custom-scrollbar p-1">
                  {ARCHETYPES.map((archName) => {
                    const info = PRESET_DATA[archName];
                    const isSelected = archetype === archName;
                    return (
                      <button
                        key={archName}
                        type="button"
                        onClick={() => {
                          audioSystem.playClick();
                          setArchetype(archName);
                        }}
                        className={`text-left p-2.5 rounded-xl border transition-all flex items-center gap-2 group cursor-pointer ${
                          isSelected
                            ? 'bg-gold/20 border-gold shadow-[0_0_15px_rgba(197,160,89,0.25)] text-bone'
                            : 'bg-black/50 border-gold-dim/20 hover:border-gold-dim/60 hover:bg-white/5 text-parchment-dim'
                        }`}
                      >
                        <span className="text-lg group-hover:scale-125 transition-transform">{info.icon}</span>
                        <div className="truncate">
                          <span className={`block text-xs font-display font-bold truncate ${isSelected ? 'text-gold' : 'text-parchment'}`}>
                            {archName}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Active Preset Dossier */}
                {activePresetInfo && (
                  <div className="bg-black/50 border border-gold-dim/30 rounded-xl p-5 relative overflow-hidden animate-fade-in shadow-inner">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{activePresetInfo.icon}</span>
                          <h3 className="text-xl md:text-2xl font-display font-bold text-bone tracking-wide">
                            {activePresetInfo.name}
                          </h3>
                        </div>
                        <span className="text-xs uppercase tracking-widest text-gold-dim font-serif italic">
                          {archetype}
                        </span>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider px-2 py-1 rounded bg-black/80 border border-gold-dim/40 text-gold font-mono">
                        Predestinado
                      </span>
                    </div>

                    {/* Confession Quote */}
                    <div className="my-4 pl-3.5 border-l-2 border-gold-dim/60 italic text-base md:text-lg font-serif text-parchment-dim leading-relaxed bg-void/30 p-3 rounded-r-lg">
                      "{activePresetInfo.bio}"
                    </div>

                    {/* Specialization & Starting Items */}
                    <div className="space-y-3 pt-3 border-t border-white/5 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="text-gold-dim font-bold uppercase tracking-wider text-[10px] w-24 shrink-0 font-display">Especialidad:</span>
                        <span className="text-parchment italic font-serif">{activePresetInfo.specialization}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-gold-dim font-bold uppercase tracking-wider text-[10px] w-24 shrink-0 font-display">Ajuar Inicial:</span>
                        {activePresetInfo.startingItems.map((item, itIdx) => (
                          <span key={itIdx} className="relic-card px-2 py-0.5 rounded text-[10px] font-serif text-bone border border-gold-dim/30">
                            ✦ {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Predefined Attributes (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="gothic-panel rounded-2xl p-6 md:p-8 shadow-2xl relative flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-6 pb-3 border-b border-gold-dim/20">
                    <h2 className="text-lg font-display text-bone uppercase tracking-widest font-bold">Atributos del Destino</h2>
                    <span className="text-[10px] uppercase tracking-widest text-parchment-dim font-mono">Ficha Cerrada</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {(Object.entries(attributes) as [keyof CharacterAttributes, number][]).map(([attr, val]) => {
                      const meta = STAT_DESCRIPTIONS[attr];
                      const mod = getModifier(val);
                      return (
                        <div key={attr} className="talisman-card p-3 rounded-xl text-center group relative">
                          <div className="flex items-center justify-center gap-1 text-[10px] text-gold-dim uppercase font-display tracking-widest mb-1">
                            <span>{meta.icon}</span>
                            <span>{meta.name}</span>
                          </div>
                          <div className="flex items-baseline justify-center gap-1.5">
                            <span className="text-2xl font-display font-bold text-bone group-hover:text-gold transition-colors">{val}</span>
                            <span className="text-xs text-gold-dim font-mono">({mod})</span>
                          </div>
                          <span className="text-[9px] text-zinc-500 block truncate mt-1 italic font-serif" title={meta.desc}>{meta.desc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-parchment-dim italic leading-relaxed text-center mb-5 pb-4 border-b border-white/5">
                    "Tus habilidades han sido forjadas por tu pecado. No puedes cambiarlas ahora, solo sobrevivir con ellas."
                  </p>

                  <button 
                    onClick={handleStart}
                    disabled={isLoading}
                    className="w-full py-4 px-6 rounded-xl text-base uppercase tracking-[0.2em] font-display font-bold transition-all duration-300 relative overflow-hidden group bg-gold text-void shadow-[0_0_20px_rgba(197,160,89,0.3)] hover:shadow-[0_0_35px_rgba(197,160,89,0.6)] hover:scale-[1.01] cursor-pointer"
                  >
                    <span className="relative z-10">{isLoading ? 'Grabando destino...' : 'Firmar Contrato e Iniciar Vigilia'}</span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* MODE 2: TABULA RASA (CREACIÓN Y FORJA LIBRE)                   */}
        {/* ============================================================== */}
        {mode === 'custom' && (
          <>
            {/* Left Column: Custom Identity Form (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="gothic-panel rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-60"></div>
                
                <div className="flex items-center justify-between mb-6 border-b border-gold-dim/20 pb-3">
                  <span className="text-[10px] uppercase font-display tracking-[0.25em] text-gold font-bold">
                    Forja de Identidad desde la Ceniza
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Tabula Rasa
                  </span>
                </div>

                <div className="space-y-6">
                  {/* Archetype / Role Input */}
                  <div>
                    <label className="block text-parchment-dim text-[10px] uppercase tracking-widest font-display mb-2">
                      Origen y Condena (Rol del Personaje)
                    </label>
                    <input 
                      type="text"
                      value={customArchetype}
                      onChange={(e) => setCustomArchetype(e.target.value)}
                      maxLength={45}
                      className="w-full bg-black/60 border border-gold-dim/40 rounded-xl p-3.5 text-base md:text-lg text-parchment font-serif focus:border-gold focus:outline-none placeholder-zinc-700 transition-all shadow-inner"
                      placeholder="Ej: Inquisidor Renegado, Boticario, Mendigo Ciego..."
                    />
                    {/* Quick suggestion pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-display mr-1 self-center">Ideas:</span>
                      {ARCHETYPE_SUGGESTIONS.slice(0, 5).map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleApplySuggestion(sug)}
                          className="text-[10px] px-2 py-0.5 rounded border border-zinc-700 hover:border-gold-dim bg-black/40 text-zinc-400 hover:text-gold transition-colors font-serif"
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name Input with Randomizer */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-parchment-dim text-[10px] uppercase tracking-widest font-display">
                        Nombre del Desdichado
                      </label>
                      <button
                        type="button"
                        onClick={handleRandomName}
                        className="text-[10px] text-gold-dim hover:text-gold uppercase tracking-wider font-display font-bold flex items-center gap-1 transition-colors"
                        title="Generar nombre aleatorio"
                      >
                        <span>🎲</span>
                        <span>Susurrar Nombre</span>
                      </button>
                    </div>
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={35}
                      className="w-full bg-black/60 border border-gold-dim/40 rounded-xl p-3.5 text-base md:text-lg text-bone font-display font-bold focus:border-gold focus:outline-none placeholder-zinc-700 transition-all shadow-inner tracking-wide"
                      placeholder="Ej: Morvath Graves, Silas, Rowena..."
                    />
                  </div>

                  {/* Past Sin / Tragedy Textarea with Randomizer */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-parchment-dim text-[10px] uppercase tracking-widest font-display">
                        La Sombra del Pasado (Pecado o Tragedia Inicial)
                      </label>
                      <button
                        type="button"
                        onClick={handleRandomSin}
                        className="text-[10px] text-gold-dim hover:text-gold uppercase tracking-wider font-display font-bold flex items-center gap-1 transition-colors"
                        title="Generar pecado trágico aleatorio"
                      >
                        <span>🎲</span>
                        <span>Inspiración Siniestra</span>
                      </button>
                    </div>
                    <textarea 
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      maxLength={240}
                      className="w-full bg-black/60 border border-gold-dim/40 rounded-xl p-3.5 text-sm md:text-base text-parchment font-serif italic focus:border-gold focus:outline-none placeholder-zinc-700 transition-all shadow-inner leading-relaxed resize-none"
                      placeholder="Escribe brevemente qué pecado, cobardía o desgracia te ha llevado a la vigilia..."
                    />
                  </div>

                  {/* Save to Grimoire Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveToGrimoire}
                      className="px-4 py-2 bg-black/60 border border-gold-dim/40 hover:border-gold hover:text-gold rounded-xl text-xs uppercase font-display font-bold tracking-widest text-parchment-dim transition-all flex items-center gap-2 shadow-sm"
                    >
                      <span>💾</span>
                      <span>Guardar en el Grimorio</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Custom Attribute Allocation (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="gothic-panel rounded-2xl p-6 md:p-8 shadow-2xl relative flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-6 pb-3 border-b border-gold-dim/20">
                    <div>
                      <h2 className="text-lg font-display text-bone uppercase tracking-widest font-bold">Reparto Rúnico</h2>
                      <span className="text-[10px] text-zinc-500 font-mono">Base: 10 en cada atributo</span>
                    </div>

                    <div className="text-right">
                      <span className={`text-2xl font-display font-bold block ${pointsRemaining < 0 ? 'text-blood-bright animate-pulse' : pointsRemaining === 0 ? 'text-emerald-400' : 'text-gold'}`}>
                        {pointsRemaining}
                      </span>
                      <span className="text-[9px] uppercase tracking-widest text-parchment-dim font-display">Puntos Restantes</span>
                    </div>
                  </div>

                  {/* Quick Allocation Helpers */}
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={handleRandomDistribution}
                      className="flex-1 py-1.5 px-2 bg-black/40 border border-gold-dim/30 hover:border-gold text-[10px] uppercase font-display tracking-widest text-gold-dim hover:text-gold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>🎲</span>
                      <span>Repartir al Azar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAttributes}
                      className="py-1.5 px-3 bg-black/40 border border-zinc-800 hover:border-zinc-600 text-[10px] uppercase font-display tracking-widest text-zinc-400 hover:text-parchment rounded-lg transition-colors"
                      title="Reiniciar a 10"
                    >
                      ↺
                    </button>
                  </div>

                  {/* Attribute Steppers */}
                  <div className="space-y-3 mb-6">
                    {(Object.entries(attributes) as [keyof CharacterAttributes, number][]).map(([attr, val]) => {
                      const meta = STAT_DESCRIPTIONS[attr];
                      const mod = getModifier(val);
                      return (
                        <div key={attr} className="bg-black/40 border border-gold-dim/20 p-2.5 rounded-xl flex items-center justify-between group hover:border-gold-dim/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-base select-none">{meta.icon}</span>
                            <div>
                              <span className="text-xs uppercase font-display font-bold text-parchment block tracking-wide">{meta.name}</span>
                              <span className="text-[9px] text-zinc-500 italic block font-serif line-clamp-1">{meta.desc}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <button 
                              type="button"
                              onClick={() => handleAttributeChange(attr, -1)}
                              disabled={val <= MIN_ATTRIBUTE}
                              className="w-7 h-7 flex items-center justify-center border border-zinc-700 bg-black/50 rounded-lg text-zinc-400 hover:text-white hover:border-gold disabled:opacity-20 disabled:cursor-not-allowed font-bold"
                            >
                              -
                            </button>
                            
                            <div className="w-12 text-center">
                              <span className="text-lg font-display text-bone font-bold block leading-none">{val}</span>
                              <span className="text-[9px] text-gold-dim font-mono">{mod}</span>
                            </div>

                            <button 
                              type="button"
                              onClick={() => handleAttributeChange(attr, 1)}
                              disabled={val >= MAX_ATTRIBUTE_CUSTOM || pointsRemaining <= 0}
                              className="w-7 h-7 flex items-center justify-center border border-zinc-700 bg-black/50 rounded-lg text-zinc-400 hover:text-gold hover:border-gold disabled:opacity-20 disabled:cursor-not-allowed font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <button 
                    onClick={handleStart}
                    disabled={isLoading || !name.trim() || !isCustomValid}
                    className={`w-full py-4 px-6 rounded-xl text-base uppercase tracking-[0.2em] font-display font-bold transition-all duration-300 relative overflow-hidden group
                      ${isLoading || !name.trim() || !isCustomValid
                        ? 'bg-panel border border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50' 
                        : 'bg-gold text-void shadow-[0_0_20px_rgba(197,160,89,0.3)] hover:shadow-[0_0_35px_rgba(197,160,89,0.6)] hover:scale-[1.01] cursor-pointer'}
                    `}
                  >
                    <span className="relative z-10">{isLoading ? 'Grabando destino...' : 'Firmar Contrato e Iniciar Vigilia'}</span>
                    {!isLoading && isCustomValid && name.trim() && (
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* MODE 3: VÁSTAGOS GUARDADOS (GRIMORIO DE ALMAS)                  */}
        {/* ============================================================== */}
        {mode === 'saved' && (
          <div className="lg:col-span-12">
            <div className="gothic-panel rounded-2xl p-6 md:p-10 shadow-2xl relative">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-gold-dim/25 pb-4">
                <div>
                  <h2 className="text-2xl font-display font-bold text-bone tracking-wide uppercase">Grimorio de Almas</h2>
                  <p className="text-xs text-parchment-dim italic mt-0.5">Vástagos personalizados preservados para la vigilia</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportGrimoire}
                    disabled={savedCharacters.length === 0}
                    className="px-3 py-1.5 bg-black/60 border border-gold-dim/40 hover:border-gold text-[10px] uppercase font-display font-bold tracking-widest text-gold-dim hover:text-gold rounded-lg transition-colors disabled:opacity-30"
                  >
                    Exportar JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-black/60 border border-gold-dim/40 hover:border-gold text-[10px] uppercase font-display font-bold tracking-widest text-gold-dim hover:text-gold rounded-lg transition-colors"
                  >
                    Importar JSON
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImportGrimoire} 
                    accept=".json" 
                    className="hidden" 
                  />
                </div>
              </div>

              {savedCharacters.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-5xl mb-4 text-zinc-700">📜</div>
                  <h3 className="text-xl font-display text-parchment mb-2">El Grimorio está vacío</h3>
                  <p className="text-sm font-serif italic text-zinc-500 max-w-md mx-auto mb-6">
                    Aún no has sellado a ningún vástago personalizado. Ve a la pestaña de Tabula Rasa para forjar un personaje y guardarlo aquí.
                  </p>
                  <button
                    onClick={() => handleModeChange('custom')}
                    className="px-6 py-2.5 bg-gold/15 border border-gold text-gold font-display text-xs uppercase tracking-widest rounded-xl hover:bg-gold hover:text-void transition-colors"
                  >
                    Ir a Tabula Rasa
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                  {savedCharacters.map((saved) => (
                    <div 
                      key={saved.id}
                      className="bg-black/60 border border-gold-dim/30 hover:border-gold/60 p-5 rounded-xl transition-all shadow-md flex flex-col justify-between gap-4 group"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-xl font-display font-bold text-bone group-hover:text-gold transition-colors">
                              {saved.name}
                            </h3>
                            <span className="text-xs uppercase font-serif italic text-gold-dim block">
                              {saved.archetype}
                            </span>
                          </div>
                          <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">
                            {new Date(saved.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="text-sm italic font-serif text-parchment-dim bg-void/40 p-2.5 rounded border border-white/5 mb-3 line-clamp-2">
                          "{saved.bio}"
                        </p>

                        {/* Mini Stats Chips */}
                        <div className="grid grid-cols-6 gap-1 text-center font-mono text-[10px]">
                          <div className="bg-void/60 p-1 rounded border border-white/5"><span className="text-zinc-500 block text-[8px]">FUE</span><span className="font-bold text-bone">{saved.attributes.fuerza}</span></div>
                          <div className="bg-void/60 p-1 rounded border border-white/5"><span className="text-zinc-500 block text-[8px]">DES</span><span className="font-bold text-bone">{saved.attributes.destreza}</span></div>
                          <div className="bg-void/60 p-1 rounded border border-white/5"><span className="text-zinc-500 block text-[8px]">CON</span><span className="font-bold text-bone">{saved.attributes.constitucion}</span></div>
                          <div className="bg-void/60 p-1 rounded border border-white/5"><span className="text-zinc-500 block text-[8px]">INT</span><span className="font-bold text-bone">{saved.attributes.inteligencia}</span></div>
                          <div className="bg-void/60 p-1 rounded border border-white/5"><span className="text-zinc-500 block text-[8px]">SAB</span><span className="font-bold text-bone">{saved.attributes.sabiduria}</span></div>
                          <div className="bg-void/60 p-1 rounded border border-white/5"><span className="text-zinc-500 block text-[8px]">CAR</span><span className="font-bold text-bone">{saved.attributes.carisma}</span></div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => handleStartSavedChar(saved)}
                          disabled={isLoading}
                          className="flex-1 py-2 bg-gold/15 hover:bg-gold hover:text-void border border-gold/50 text-gold text-xs font-display uppercase tracking-widest font-bold rounded-lg transition-colors shadow-sm"
                        >
                          ✦ Jugar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadSavedChar(saved)}
                          className="px-3 py-2 bg-black/50 hover:bg-white/5 border border-zinc-700 text-parchment-dim hover:text-parchment text-xs font-display uppercase tracking-wider rounded-lg transition-colors"
                          title="Cargar y editar en Tabula Rasa"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedChar(saved.id, saved.name)}
                          className="px-2.5 py-2 bg-black/50 hover:bg-blood/20 border border-zinc-800 hover:border-blood text-zinc-500 hover:text-blood-bright text-xs rounded-lg transition-colors"
                          title="Eliminar del Grimorio"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StartScreen;