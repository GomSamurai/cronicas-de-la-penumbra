import React, { useState, useRef, useEffect } from 'react';
import { audioSystem } from '../services/audioService';
import AudioController from './AudioController';

interface HomeScreenProps {
  onNewGame: () => void;
  onLoadGame: (file: File) => void;
  onResumeLocal?: () => void;
}

type ModalType = 'none' | 'manual' | 'about';

const HomeScreen: React.FC<HomeScreenProps> = ({ onNewGame, onLoadGame, onResumeLocal }) => {
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [hasLocalSave, setHasLocalSave] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    audioSystem.setMode('intro');
    if (localStorage.getItem('penumbra_save')) {
       setHasLocalSave(true);
    }
  }, []);

  const initAudio = () => {
     // Handled by global controller usually, but clicking triggers it if not started
     audioSystem.init();
  };

  const handleNewGameWrapper = () => {
    initAudio();
    onNewGame();
  };

  const handleResumeWrapper = () => {
    initAudio();
    if (onResumeLocal) onResumeLocal();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      initAudio();
      onLoadGame(file);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden text-parchment" onClick={initAudio}>
      
      {/* Audio Controls - Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <AudioController variant="header" />
      </div>
      
      {/* --- ATMOSPHERIC LAYERS --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-void"></div>
        
        {/* Base Noise Texture */}
        <div className="absolute inset-0 bg-texture opacity-30"></div>
        
        {/* Breathing Vignette */}
        <div className="absolute inset-0 bg-vignette animate-pulse-slow"></div>

        {/* Mist Layers */}
        <div className="bg-mist animate-mist-1"></div>
        <div className="bg-mist animate-mist-2"></div>

        {/* Floating Ash/Embers */}
        <div className="absolute inset-0 overflow-hidden">
            {[...Array(40)].map((_, i) => (
                <div 
                   key={i} 
                   className="ash-particle"
                   style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      width: `${Math.random() * 2 + 1}px`,
                      height: `${Math.random() * 2 + 1}px`,
                      '--duration': `${Math.random() * 10 + 5}s`,
                      '--delay': `-${Math.random() * 15}s`,
                   } as React.CSSProperties}
                ></div>
            ))}
        </div>
      </div>
      
      {/* Main Menu Content */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-12 max-w-2xl px-6 animate-fade-in">
        
        {/* Title */}
        <div className="space-y-4">
          <div className="text-gold text-xs tracking-[0.5em] uppercase font-display">Novela Interactiva Procedural</div>
          <h1 className="text-6xl md:text-8xl font-display font-bold text-bone tracking-tighter chromatic-aberration">
            Crónicas de<br/>la Penumbra
          </h1>
          <div className="h-px w-32 bg-gold mx-auto"></div>
        </div>

        {/* Menu Buttons */}
        <div className="flex flex-col gap-6 w-full max-w-xs">
          {hasLocalSave && (
            <button 
              onClick={handleResumeWrapper}
              className="px-8 py-4 bg-gold/10 border border-gold text-gold hover:bg-gold hover:text-void font-display tracking-[0.2em] uppercase font-bold transition-all duration-300 shadow-[0_0_20px_rgba(197,160,89,0.2)] hover:shadow-[0_0_30px_rgba(197,160,89,0.5)] rounded-xl relative overflow-hidden group"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></span>
              Continuar Vigilia
            </button>
          )}

          <button 
            onClick={handleNewGameWrapper}
            className={`px-8 py-4 border font-display tracking-[0.2em] uppercase transition-all duration-300 rounded-xl ${hasLocalSave ? 'border-zinc-700 text-parchment-dim hover:border-parchment hover:text-parchment' : 'border-gold text-gold hover:bg-gold hover:text-void shadow-[0_0_20px_rgba(197,160,89,0.1)] hover:shadow-[0_0_30px_rgba(197,160,89,0.4)]'}`}
          >
            Nueva Vigilia
          </button>

          <button 
            onClick={() => { initAudio(); fileInputRef.current?.click(); }}
            className="px-8 py-4 border border-zinc-700 text-parchment-dim hover:border-parchment hover:text-parchment font-display tracking-[0.2em] uppercase transition-all duration-300 rounded-xl"
          >
            Cargar Destino
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

          <div className="flex gap-4 justify-center mt-4">
             <button onClick={(e) => { e.stopPropagation(); setActiveModal('manual'); }} className="text-xs uppercase tracking-widest text-zinc-600 hover:text-gold transition-colors">Manual</button>
             <span className="text-zinc-800">•</span>
             <button onClick={(e) => { e.stopPropagation(); setActiveModal('about'); }} className="text-xs uppercase tracking-widest text-zinc-600 hover:text-gold transition-colors">Proyecto</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-zinc-600 text-[10px] tracking-widest uppercase font-display">
        Memento Mori • Ver. 0.5
      </div>

      {/* Modals */}
      {activeModal !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setActiveModal('none')}></div>
          
          <div className="relative bg-panel border border-gold-dim w-full max-w-3xl p-8 md:p-12 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl">
            <button 
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              ✕
            </button>

            {activeModal === 'manual' && (
              <div className="space-y-8">
                <h2 className="text-4xl font-display text-bone border-b border-gold-dim/30 pb-4">Manual de la Vigilia</h2>
                
                {/* 
                   IMPORTANT: Container text-lg sets the baseline for everything inside.
                   Sub-sections now inherit this size instead of being text-sm.
                */}
                <div className="space-y-8 text-lg font-serif leading-relaxed text-parchment-dim text-justify">
                  <p>
                    <strong className="text-gold">La Premisa:</strong> No eres un héroe elegido. Eres un superviviente en un mundo en decadencia. Tus acciones tienen peso, y el entorno reacciona de forma orgánica a ellas. No hay rutas predefinidas; la historia se escribe mientras la vives.
                  </p>

                  {/* Sección Atributos */}
                  <div>
                    <h3 className="text-gold font-display text-sm uppercase tracking-widest mb-4 border-b border-gold-dim/10 pb-1">Tus Facultades</h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                        <li><span className="text-bone font-bold">Fuerza:</span> Capacidad de carga y potencia física.</li>
                        <li><span className="text-bone font-bold">Destreza:</span> Sigilo, manipulación fina y esquiva.</li>
                        <li><span className="text-bone font-bold">Constitución:</span> Resistencia al dolor y enfermedades.</li>
                        <li><span className="text-bone font-bold">Inteligencia:</span> Conocimiento arcano, historia y lógica.</li>
                        <li><span className="text-bone font-bold">Sabiduría:</span> Percepción, medicina e intuición.</li>
                        <li><span className="text-bone font-bold">Carisma:</span> Persuasión, engaño y voluntad.</li>
                    </ul>
                  </div>

                  {/* Sección Azar */}
                  <div>
                    <h3 className="text-gold font-display text-sm uppercase tracking-widest mb-4 border-b border-gold-dim/10 pb-1">El Ritual de Azar</h3>
                    <p className="mb-4">
                       Cuando intentas una acción cuyo éxito es incierto, el destino exige un tributo. El sistema utiliza un dado de 20 caras (D20).
                    </p>
                    <div className="bg-void/40 p-4 rounded border border-gold-dim/20 text-center font-mono text-base md:text-lg mb-4">
                       Resultado = D20 + Atributo Base vs Dificultad (DC)
                    </div>
                    <p className="text-parchment-dim italic">
                       Un <span className="text-gold">20 natural</span> es un Éxito Crítico. Un <span className="text-blood-bright">1 natural</span> es una Pifia (Fallo Catastrófico).
                    </p>
                  </div>

                  {/* Sección Inventario y Entropía */}
                  <div>
                    <h3 className="text-gold font-display text-sm uppercase tracking-widest mb-4 border-b border-gold-dim/10 pb-1">Inventario y Entropía</h3>
                    <p className="mb-4">
                       Tus bolsillos no son infinitos. Tu capacidad de carga es <span className="text-bone">6 huecos + (Fuerza / 2)</span>. Si te sobrecargas, el agotamiento será inminente.
                    </p>
                    <p className="mb-4">
                       <strong className="text-parchment">Combinación:</strong> Puedes combinar objetos desde el inspector. Selecciona "Combinar" en un objeto y luego pulsa sobre otro compatible (ej: Tela + Alcohol = Venda o Molotov, según tu intención).
                    </p>
                    <p className="italic">
                       <strong className="text-gold-dim">Entropía:</strong> Los objetos se desgastan. Una espada se mella, una antorcha se apaga. Presta atención a las etiquetas (tags) de tus objetos.
                    </p>
                  </div>

                  {/* Sección Consecuencias (Traumas y Fobias) */}
                  <div>
                    <h3 className="text-blood-bright font-display text-sm uppercase tracking-widest mb-4 border-b border-blood/20 pb-1">Cuerpo y Mente</h3>
                    <div className="space-y-4">
                       <div>
                          <span className="text-blood-bright font-bold uppercase text-sm tracking-wider block mb-1">Vitalidad (HP)</span>
                          <p>Si llega a 0, mueres. Si baja del 30%, puedes sufrir <span className="text-blood-bright">Traumas</span> (heridas persistentes que penalizan tus atributos).</p>
                       </div>
                       <div>
                          <span className="text-sanity font-bold uppercase text-sm tracking-wider block mb-1">Cordura</span>
                          <p>Si desciende demasiado, empezarás a alucinar (el texto se distorsionará). Por debajo del 50%, puedes desarrollar <span className="text-sanity">Fobias</span> o psicosis que reaccionarán a ciertos estímulos de la narración.</p>
                       </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {activeModal === 'about' && (
              <div className="space-y-6">
                 <h2 className="text-3xl font-display text-bone border-b border-gold-dim/30 pb-4">El Proyecto</h2>
                 <p className="text-lg font-serif leading-relaxed text-parchment-dim">
                   Crónicas de la Penumbra es un experimento narrativo impulsado por inteligencia artificial generativa de última generación.
                 </p>
                 <p className="text-lg font-serif leading-relaxed text-parchment-dim">
                   A diferencia de los librojuegos tradicionales con ramas predefinidas, aquí cada frase se escribe en tiempo real basándose en tus acciones y en la coherencia de un mundo oscuro y decadente. Ninguna partida es igual a otra.
                 </p>
                 <div className="bg-void/50 p-4 rounded border border-gold-dim/30 mt-4">
                    <p className="text-xs uppercase tracking-widest text-gold mb-2">Tecnología</p>
                    <ul className="text-sm text-zinc-500 space-y-1">
                       <li>Motor Narrativo: Gemini 2.5 Flash</li>
                       <li>Audio Procedural: Web Audio API</li>
                       <li>Interfaz: React + Tailwind</li>
                    </ul>
                 </div>
                 <p className="text-sm italic text-zinc-600 mt-8">
                   "Aquel que mira largo tiempo al abismo, ve cómo el abismo mira dentro de él."
                 </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;