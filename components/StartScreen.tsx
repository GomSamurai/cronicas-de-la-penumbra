import React, { useState, useEffect } from 'react';
import { Character, CharacterAttributes } from '../types';
import AudioController from './AudioController';

interface StartScreenProps {
  onStart: (character: Character) => void;
  onBack: () => void;
  isLoading: boolean;
}

const ARCHETYPES = [
  "El Cirujano",
  "La Institutriz",
  "El Sepulturero",
  "El Desertor",
  "La Cortesana",
  "El Carnicero",
  "El Erudito",
  "El Aristócrata",
  "El Psiconauta",
  "La Taxidermista",
  "El Ventrílocuo"
];

// Configuration constants
const MAX_STARTING_POOL = 12; 
const CUSTOM_BASE_ATTRIBUTE = 10; 
const MIN_ATTRIBUTE = 5;      
const MAX_ATTRIBUTE_CUSTOM = 19; 

// Lore & Stats Data
const PRESET_DATA: Record<string, { name: string, bio: string, stats: CharacterAttributes }> = {
  "El Cirujano": {
    name: "Doctor Silas Vane",
    bio: "El temblor en mis manos no es miedo, es la abstinencia. Operé borracho a la hija del alcalde; creí que el alcohol afinaría mi pulso.",
    stats: { fuerza: 8, destreza: 15, constitucion: 8, inteligencia: 16, sabiduria: 14, carisma: 11 }
  },
  "La Institutriz": {
    name: "Señorita Isolde",
    bio: "El niño se ahogó en el estanque de los nenúfares mientras yo me dejaba follar por el jardinero contra el muro del invernadero.",
    stats: { fuerza: 6, destreza: 12, constitucion: 10, inteligencia: 14, sabiduria: 14, carisma: 16 }
  },
  "El Sepulturero": {
    name: "Arthur \"El Topo\" Griggs",
    bio: "Desenterré a mi propia esposa no por amor, sino por el anillo de oro que nos costó la comida de un año.",
    stats: { fuerza: 16, destreza: 10, constitucion: 16, inteligencia: 8, sabiduria: 14, carisma: 8 }
  },
  "El Desertor": {
    name: "Cabo Kaelen",
    bio: "No huí del enemigo, huí del barro y la gangrena. Apuñalé a mi sargento por la espalda mientras dormía para robarle las botas secas y las raciones.",
    stats: { fuerza: 14, destreza: 16, constitucion: 14, inteligencia: 10, sabiduria: 10, carisma: 8 }
  },
  "La Cortesana": {
    name: "Madame Lottie",
    bio: "La sífilis me está comiendo el tabique nasal, pero el hambre dolía más que la vergüenza. Dejé a mi recién nacido en el callejón de las curtidurías porque un cliente pagaba doble por no oír llantos.",
    stats: { fuerza: 8, destreza: 14, constitucion: 6, inteligencia: 12, sabiduria: 14, carisma: 18 }
  },
  "El Carnicero": {
    name: "Brannigan",
    bio: "Sabía que el cerdo estaba enfermo, la carne llena de quistes negros. Lo vendí barato al orfanato local para pagar mis deudas de juego.",
    stats: { fuerza: 18, destreza: 10, constitucion: 16, inteligencia: 10, sabiduria: 6, carisma: 12 }
  },
  "El Erudito": {
    name: "Elias Thorne",
    bio: "Robé la obra maestra de mi mentor moribundo y la publiqué como mía. Cuando empezó a recuperarse y amenazó con hablar, la biblioteca ardió 'accidentalmente' con él dentro.",
    stats: { fuerza: 6, destreza: 12, constitucion: 8, inteligencia: 19, sabiduria: 12, carisma: 15 }
  },
  "El Aristócrata": {
    name: "Lord Valerius Blackwood",
    bio: "Aposté las escrituras de la mansión ancestral y perdí. Desesperado, aposté la virginidad de mi hermana pequeña a un prestamista sifilítico y perdí también.",
    stats: { fuerza: 9, destreza: 12, constitucion: 10, inteligencia: 14, sabiduria: 8, carisma: 19 }
  },
  "El Psiconauta": {
    name: "Kaspar",
    bio: "No son alucinaciones. Pulvericé los huesos de mi abuelo para inhalarlos y abrir el Velo.",
    stats: { fuerza: 6, destreza: 10, constitucion: 7, inteligencia: 18, sabiduria: 17, carisma: 8 }
  },
  "La Taxidermista": {
    name: "Beatrice Crow",
    bio: "Cuando murió mi marido vacié su torso y lo rellené de serrín y lavanda.",
    stats: { fuerza: 10, destreza: 17, constitucion: 12, inteligencia: 13, sabiduria: 10, carisma: 7 }
  },
  "El Ventrílocuo": {
    name: "Barnaby \"El Sr. Risas\"",
    bio: "El muñeco está tallado con la madera de la horca del pueblo.",
    stats: { fuerza: 8, destreza: 16, constitucion: 10, inteligencia: 9, sabiduria: 6, carisma: 18 }
  }
};

const StartScreen: React.FC<StartScreenProps> = ({ onStart, onBack, isLoading }) => {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  
  const [name, setName] = useState('');
  const [archetype, setArchetype] = useState(ARCHETYPES[0]);
  const [customArchetype, setCustomArchetype] = useState('');
  const [bio, setBio] = useState('');
  
  // Initialize with first preset stats
  const [attributes, setAttributes] = useState<CharacterAttributes>(PRESET_DATA[ARCHETYPES[0]].stats);
  
  // Custom Mode State
  const [pointsUsed, setPointsUsed] = useState(0);

  // Update attributes, Name AND Bio when archetype changes (only in preset mode)
  useEffect(() => {
    if (mode === 'preset' && PRESET_DATA[archetype]) {
      const data = PRESET_DATA[archetype];
      setAttributes(data.stats);
      setName(data.name);
      setBio(data.bio);
    }
  }, [archetype, mode]);

  // Reset to flat stats when switching to custom
  useEffect(() => {
    if (mode === 'custom') {
      // Reset text fields if coming from preset so user can type their own
      setName('');
      setBio('');
      
      const initialStats = {
        fuerza: 10, destreza: 10, constitucion: 10, inteligencia: 10, sabiduria: 10, carisma: 10
      };
      setAttributes(initialStats);
      recalculatePoints(initialStats);
    } else {
      // Re-apply current preset if switching back to preset
      const data = PRESET_DATA[archetype];
      setAttributes(data.stats);
      setName(data.name);
      setBio(data.bio);
    }
  }, [mode]);

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

    const newAttributes = { ...attributes, [attr]: newVal };
    setAttributes(newAttributes);
    if (mode === 'custom') {
       recalculatePoints(newAttributes);
    }
  };

  const handleStart = () => {
    if (!name.trim()) return;
    
    // In custom mode, validate points
    if (mode === 'custom') {
      if (pointsUsed > MAX_STARTING_POOL) return; // Should be blocked by UI but just in case
      if (!customArchetype.trim()) return;
    }

    const finalArchetype = mode === 'preset' ? archetype : customArchetype;

    onStart({
      name,
      archetype: finalArchetype,
      bio: bio || "Una vida tranquila, hasta ahora...",
      attributes
    });
  };

  const pointsRemaining = MAX_STARTING_POOL - pointsUsed;
  const isCustomValid = mode === 'preset' || (mode === 'custom' && customArchetype.trim().length > 0 && pointsRemaining >= 0);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-void text-parchment relative overflow-y-auto">
      
      {/* --- ATMOSPHERE --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Base Texture */}
        <div className="absolute inset-0 bg-texture opacity-30"></div>
        {/* Vignette */}
        <div className="absolute inset-0 bg-vignette opacity-80 animate-pulse-slow"></div>
        
        {/* Mist Layers */}
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

      <div className="max-w-6xl w-full grid lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Header / Navigation */}
        <div className="lg:col-span-12 flex justify-between items-center mb-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gold-dim hover:text-gold transition-colors uppercase text-xs tracking-[0.2em] font-bold"
          >
            ← Regresar
          </button>
          
          <div className="flex items-center gap-4">
             <AudioController variant="header" />
             <div className="h-4 w-px bg-gold-dim/30 hidden md:block"></div>
             <h1 className="text-3xl font-display text-bone tracking-tighter">La Vigilia</h1>
          </div>
        </div>

        {/* Left Column: Identity (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-panel border border-panel-border rounded-2xl p-8 md:p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-dim to-transparent opacity-50"></div>
            
            {/* Mode Switcher */}
            <div className="flex gap-4 mb-8 border-b border-gold-dim/20 pb-1">
              <button 
                onClick={() => setMode('preset')}
                className={`pb-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors ${mode === 'preset' ? 'text-gold border-b-2 border-gold' : 'text-zinc-600 hover:text-parchment'}`}
              >
                Destinos Escritos
              </button>
              <button 
                onClick={() => setMode('custom')}
                className={`pb-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors ${mode === 'custom' ? 'text-gold border-b-2 border-gold' : 'text-zinc-600 hover:text-parchment'}`}
              >
                Tabula Rasa
              </button>
            </div>

            <div className="space-y-10">
              {/* Archetype Select or Input (Reordered to top for flow) */}
              <div className="group/select">
                <label className="block text-parchment-dim text-[10px] uppercase tracking-widest font-display mb-2">Origen y Condena</label>
                
                {mode === 'preset' ? (
                  <div className="relative">
                    <select 
                      value={archetype}
                      onChange={(e) => setArchetype(e.target.value)}
                      className="w-full bg-void/30 border border-gold-dim/30 rounded-xl p-4 pr-10 text-lg text-parchment font-serif focus:border-gold focus:outline-none appearance-none cursor-pointer hover:bg-void/50 transition-all shadow-inner"
                    >
                      {ARCHETYPES.map(a => <option key={a} value={a} className="bg-panel text-parchment">{a}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gold text-xs">▼</div>
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="text"
                      value={customArchetype}
                      onChange={(e) => setCustomArchetype(e.target.value)}
                      maxLength={40}
                      className="w-full bg-void/30 border border-gold-dim/30 rounded-xl p-4 text-lg text-parchment font-serif focus:border-gold focus:outline-none placeholder-zinc-700 transition-all shadow-inner"
                      placeholder="Ej: Mercenario, Inquisidor, Mendigo, Noble Caído..."
                    />
                    <p className="mt-2 text-[10px] text-zinc-500 italic">
                      * Elige un rol coherente con un mundo de fantasía oscura. Evita anacronismos.
                    </p>
                  </div>
                )}
              </div>

              {/* Name Input */}
              <div className="group/input">
                <label className="block text-parchment-dim text-[10px] uppercase tracking-widest font-display mb-2">Nombre del Desdichado</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  className="w-full bg-transparent border-b border-gold-dim/30 py-2 text-3xl font-display text-bone focus:border-gold focus:outline-none transition-colors placeholder-white/10"
                  placeholder="..."
                  // Allow editing even in preset mode if user wants to tweak the name
                />
              </div>

              {/* Bio Textarea */}
              <div className="group/bio">
                <label className="block text-parchment-dim text-[10px] uppercase tracking-widest font-display mb-2">La Sombra del Pasado</label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-void/30 border border-gold-dim/30 rounded-xl p-4 text-lg text-parchment font-serif h-48 focus:border-gold focus:outline-none resize-none placeholder-parchment-dim/50 italic shadow-inner hover:bg-void/50 transition-all"
                  placeholder="Escribe brevemente qué pecado o tragedia te ha traído hasta aquí..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Attributes (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Attributes Card */}
          <div className="bg-panel border border-panel-border rounded-2xl p-8 shadow-2xl relative flex-1">
             <div className="flex justify-between items-center mb-8 pb-4 border-b border-gold-dim/20">
              <h2 className="text-xl font-display text-bone">Atributos</h2>
              <div className="text-right">
                {mode === 'custom' ? (
                   <div>
                     <span className={`text-xl font-display font-bold ${pointsRemaining < 0 ? 'text-blood-bright' : 'text-gold'}`}>
                        {pointsRemaining}
                     </span>
                     <span className="text-[9px] uppercase tracking-widest text-parchment-dim block">Puntos Restantes</span>
                   </div>
                ) : (
                  <span className="text-[9px] uppercase tracking-widest text-parchment-dim block">Predefinidos por Destino</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-y-4">
              {(Object.entries(attributes) as [keyof CharacterAttributes, number][]).map(([attr, val]) => (
                <div key={attr} className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-parchment font-display text-sm capitalize tracking-wide w-32">{attr}</span>
                  
                  {mode === 'custom' ? (
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleAttributeChange(attr, -1)}
                        disabled={val <= MIN_ATTRIBUTE}
                        className="w-8 h-8 flex items-center justify-center border border-zinc-700 rounded text-zinc-500 hover:text-white hover:border-gold disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        -
                      </button>
                      <span className="text-xl font-display text-bone font-bold w-6 text-center">{val}</span>
                      <button 
                         onClick={() => handleAttributeChange(attr, 1)}
                         disabled={val >= MAX_ATTRIBUTE_CUSTOM || pointsRemaining <= 0}
                         className="w-8 h-8 flex items-center justify-center border border-zinc-700 rounded text-zinc-500 hover:text-gold hover:border-gold disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className="text-xl font-display text-bone font-bold">{val}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gold-dim/20 text-center">
               <p className="text-xs text-parchment-dim italic leading-relaxed">
                 {mode === 'custom' 
                    ? "Distribuye tus puntos con sabiduría. Un héroe equilibrado sobrevive; uno especializado destaca, pero sufre."
                    : "Tus habilidades han sido forjadas por tu pasado. No puedes cambiarlas ahora, solo sobrevivir con ellas."
                 }
               </p>
            </div>
          </div>

          {/* Action Button */}
          <button 
            onClick={handleStart}
            disabled={isLoading || !name.trim() || !isCustomValid}
            className={`w-full py-5 px-6 rounded-xl text-lg uppercase tracking-[0.2em] font-display font-bold transition-all duration-300 relative overflow-hidden group
              ${isLoading || !name.trim() || !isCustomValid
                ? 'bg-panel border border-panel-border text-parchment-dim cursor-not-allowed opacity-50' 
                : 'bg-gold text-void shadow-[0_0_20px_rgba(197,160,89,0.3)] hover:shadow-[0_0_40px_rgba(197,160,89,0.6)] hover:scale-[1.02]'}
            `}
          >
            <span className="relative z-10">{isLoading ? 'Grabando destino...' : 'Firmar Contrato'}</span>
            {!isLoading && isCustomValid && name.trim() && (
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
            )}
          </button>

        </div>

      </div>
    </div>
  );
};

export default StartScreen;