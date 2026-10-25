import React, { useState, useRef, useEffect } from 'react';
import { audioSystem } from '../services/audioService';
import AudioController from './AudioController';
import SettingsModal from './SettingsModal';
import { GraveyardSoul } from '../types';

interface HomeScreenProps {
  onNewGame: () => void;
  onLoadGame: (file: File) => void;
  onResumeLocal?: () => void;
}

type ModalType = 'none' | 'manual' | 'about' | 'graveyard' | 'settings';

const HomeScreen: React.FC<HomeScreenProps> = ({ onNewGame, onLoadGame, onResumeLocal }) => {
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [hasLocalSave, setHasLocalSave] = useState(false);
  const [graveyardData, setGraveyardData] = useState<GraveyardSoul[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    audioSystem.setMode('intro');
    if (localStorage.getItem('penumbra_save')) {
       setHasLocalSave(true);
    }
    try {
      const grav = localStorage.getItem('penumbra_graveyard');
      if (grav) setGraveyardData(JSON.parse(grav));
    } catch(e) {}
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
      
      {/* Gothic Filigree Corner Brackets */}
      <div className="pointer-events-none absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-gold-dim/40 rounded-tl-lg z-20"></div>
      <div className="pointer-events-none absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-gold-dim/40 rounded-tr-lg z-20"></div>
      <div className="pointer-events-none absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-gold-dim/40 rounded-bl-lg z-20"></div>
      <div className="pointer-events-none absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-gold-dim/40 rounded-br-lg z-20"></div>

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
        <div className="space-y-4 relative">
          <div className="absolute -inset-8 bg-radial from-gold-dim/15 to-transparent blur-2xl pointer-events-none animate-pulse-slow"></div>
          <div className="text-gold text-xs tracking-[0.5em] uppercase font-display font-bold drop-shadow-sm">Novela Interactiva Procedural</div>
          <h1 className="text-6xl md:text-8xl font-display font-bold text-bone tracking-tighter chromatic-aberration drop-shadow-2xl">
            Crónicas de<br/>la Penumbra
          </h1>
          <div className="h-px w-36 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto"></div>
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

          <div className="flex flex-wrap gap-3 justify-center items-center mt-5">
             <button onClick={(e) => { e.stopPropagation(); setActiveModal('manual'); }} className="text-xs uppercase tracking-widest text-parchment-dim hover:text-gold transition-colors font-display font-medium">Manual</button>
             <span className="text-gold-dim/40">•</span>
             <button onClick={(e) => { e.stopPropagation(); setActiveModal('about'); }} className="text-xs uppercase tracking-widest text-parchment-dim hover:text-gold transition-colors font-display font-medium">Proyecto</button>
             <span className="text-gold-dim/40">•</span>
             <button onClick={(e) => { e.stopPropagation(); setActiveModal('settings'); }} className="text-xs uppercase tracking-widest text-gold hover:text-amber-200 transition-colors flex items-center gap-1 font-display font-bold">
               <span>⚙️</span>
               <span>Ajustes</span>
             </button>
             {graveyardData.length > 0 && (
                <>
                  <span className="text-gold-dim/40">•</span>
                  <button onClick={(e) => { e.stopPropagation(); setActiveModal('graveyard'); }} className="text-xs uppercase tracking-widest text-blood-bright hover:text-red-400 transition-colors font-display font-medium">Panteón</button>
                </>
             )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-parchment-dim/75 text-xs tracking-widest uppercase font-display flex items-center gap-2">
        <span>Crónicas de la Penumbra</span>
        <span className="text-gold-dim/50">•</span>
        <span>Forja de Almas</span>
        <span className="text-gold-dim/50">•</span>
        <span className="text-gold font-semibold">Ver. 4.0</span>
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
                <div className="border-b border-gold-dim/30 pb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-3xl md:text-4xl font-display text-bone">Manual de la Vigilia</h2>
                  <span className="text-xs uppercase tracking-widest text-gold font-mono px-2 py-0.5 rounded bg-black/60 border border-gold-dim/40">
                    Reglamento • Ver. 4.0
                  </span>
                </div>
                
                <div className="space-y-8 text-base md:text-lg font-serif leading-relaxed text-parchment-dim text-justify">
                  {/* I. La Premisa */}
                  <div className="bg-black/30 p-4 rounded-xl border border-gold-dim/20">
                    <h3 className="text-gold font-display text-sm uppercase tracking-widest mb-2 flex items-center gap-2">
                      <span>✦</span>
                      <span>I. La Premisa y el Mundo</span>
                    </h3>
                    <p>
                      No eres un héroe predestinado ni posees favores divinos. Eres un superviviente arrojado a un mundo en decadencia, donde la magia es peligrosa, la entropía no perdona y la muerte es permanente. Cada frase se forja en tiempo real en respuesta a tus elecciones; no existen rutas pregrabadas ni finales de cartón piedra.
                    </p>
                  </div>

                  {/* II. Forja de Identidad */}
                  <div>
                    <h3 className="text-gold font-display text-sm uppercase tracking-widest mb-3 border-b border-gold-dim/20 pb-1 flex items-center gap-2">
                      <span>✦</span>
                      <span>II. Forja de Identidad: Destinos y Tabula Rasa</span>
                    </h3>
                    <div className="space-y-3 text-sm md:text-base">
                      <p>
                        <strong className="text-bone">Destinos Escritos:</strong> Arquetipos clásicos de la penumbra (Inquisidor Renegado, Médica de Plaga, Saqueador...) listos para jugar, con estadísticas ajustadas y trasfondos preestablecidos.
                      </p>
                      <p>
                        <strong className="text-bone">Tabula Rasa (Forja Libre):</strong> Diseña tu propia alma desde la ceniza. Dispones de <span className="text-gold font-mono">12 puntos rúnicos</span> para repartir libremente sobre una base de 10 en cada atributo (máximo inicial 17).
                      </p>
                      <p>
                        <strong className="text-gold-dim">Generación Dual (Azar e IA):</strong> Cada campo (Nombre, Rol y Pecado) cuenta con un botón <span className="text-bone">🎲 Azar</span> (motor combinatorio procedimental con más de 50.000 combinaciones victorianas) y un botón <span className="text-amber-300">✨ IA</span> para canalizar al Oráculo de Gemini. El botón maestro <span className="text-gold">✨ Forjar Todo con IA</span> genera la identidad, el sigilo, la confesión y los atributos de una sola vez.
                      </p>
                      <p>
                        <strong className="text-bone">Grimorio de Almas:</strong> Puedes almacenar tus personajes preferidos en el Grimorio local, exportarlos en archivos <span className="font-mono text-zinc-300">.json</span> o importarlos en cualquier momento.
                      </p>
                    </div>
                  </div>

                  {/* III. Facultades y Azar D20 */}
                  <div>
                    <h3 className="text-gold font-display text-sm uppercase tracking-widest mb-3 border-b border-gold-dim/20 pb-1 flex items-center gap-2">
                      <span>✦</span>
                      <span>III. Tus Facultades y el Ritual del D20</span>
                    </h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 mb-4 text-sm md:text-base">
                      <li><span className="text-bone font-bold">Fuerza:</span> Potencia muscular, derribo de puertas y capacidad de carga.</li>
                      <li><span className="text-bone font-bold">Destreza:</span> Sigilo, evasión, ganzúas finas y reflejos rápidos.</li>
                      <li><span className="text-bone font-bold">Constitución:</span> Resistencia física, vitalidad y tolerancia a venenos.</li>
                      <li><span className="text-bone font-bold">Inteligencia:</span> Ocultismo, historia, investigación analítica y deducción.</li>
                      <li><span className="text-bone font-bold">Sabiduría:</span> Percepción sensorial, medicina, supervivencia e intuición.</li>
                      <li><span className="text-bone font-bold">Carisma:</span> Presencia, engaño cortesano, intimidación y persuasión.</li>
                    </ul>

                    <p className="mb-3 text-sm md:text-base">
                      Cuando el desenlace de un acto no es seguro, el destino exige una tirada de D20:
                    </p>
                    <div className="bg-void/50 p-3.5 rounded-xl border border-gold-dim/30 text-center font-mono text-sm md:text-base mb-3 shadow-inner">
                      Tirada = <span className="text-gold font-bold">D20</span> + <span className="text-bone">Modificador de Atributo</span> vs <span className="text-amber-200">Dificultad (DC)</span>
                    </div>
                    <p className="text-xs md:text-sm text-parchment-dim italic text-center">
                      Un <span className="text-gold font-bold">20 natural</span> desata un Éxito Crítico. Un <span className="text-blood-bright font-bold">1 natural</span> precipita una Pifia Catastrófica.
                    </p>
                  </div>

                  {/* IV. Flujo de la Crónica y Controles */}
                  <div>
                    <h3 className="text-gold font-display text-sm uppercase tracking-widest mb-3 border-b border-gold-dim/20 pb-1 flex items-center gap-2">
                      <span>✦</span>
                      <span>IV. Crónica, Decisiones y Acción Libre</span>
                    </h3>
                    <div className="space-y-3 text-sm md:text-base">
                      <p>
                        <strong className="text-bone">Opciones Rápidas:</strong> En cada encrucijada se sugieren 4 caminos tácticos. Puedes seleccionarlos con el ratón o con las teclas numéricas <span className="font-mono text-gold px-1.5 py-0.5 rounded bg-black/60 border border-gold-dim/30">[1]</span>, <span className="font-mono text-gold px-1.5 py-0.5 rounded bg-black/60 border border-gold-dim/30">[2]</span>, <span className="font-mono text-gold px-1.5 py-0.5 rounded bg-black/60 border border-gold-dim/30">[3]</span> y <span className="font-mono text-gold px-1.5 py-0.5 rounded bg-black/60 border border-gold-dim/30">[4]</span>.
                      </p>
                      <p>
                        <strong className="text-bone">Acción Libre:</strong> No estás limitado a las 4 sugerencias. Utiliza el campo de texto para escribir cualquier ocurrencia, táctica inusual o diálogo personalizado; el Game Master evaluará su lógica y consecuencias.
                      </p>
                      <p>
                        <strong className="text-bone">Velocidad de Lectura:</strong> Puedes alternar entre <span className="text-gold-dim font-semibold">1x</span>, <span className="text-gold-dim font-semibold">2x</span> y <span className="text-gold-dim font-semibold">Directo</span>. Pulsar <span className="font-mono text-stone-300 px-1.5 py-0.5 rounded bg-black/60 border border-zinc-700">Espacio</span> o <span className="font-mono text-stone-300 px-1.5 py-0.5 rounded bg-black/60 border border-zinc-700">Enter</span> revela el pasaje de forma inmediata.
                      </p>
                    </div>
                  </div>

                  {/* V. Tensión, Cartografía y PNJs */}
                  <div>
                    <h3 className="text-gold font-display text-sm uppercase tracking-widest mb-3 border-b border-gold-dim/20 pb-1 flex items-center gap-2">
                      <span>✦</span>
                      <span>V. Tensión Adaptativa, Entorno y Alianzas</span>
                    </h3>
                    <div className="space-y-3 text-sm md:text-base">
                      <p>
                        <strong className="text-bone">Escala de Tensión:</strong> El sistema evalúa el peligro en seis grados (<span className="text-emerald-400">Calma</span>, <span className="text-blue-300">Sospecha</span>, <span className="text-amber-400">Tensión</span>, <span className="text-orange-500">Peligro</span>, <span className="text-red-500">Combate</span>, <span className="text-purple-400">Agónico</span>), modulando las viñetas visuales y activando sintetizadores, tambores de guerra o silencios angustiosos.
                      </p>
                      <p>
                        <strong className="text-bone">Dramatis Personae:</strong> En la pestaña de personajes podrás consultar a los supervivientes y criaturas conocidas, su estado vital, su afinidad contigo e interactuar directamente mediante acciones contextuales.
                      </p>
                      <p>
                        <strong className="text-bone">Cartografía y Rutas:</strong> Observa la luminosidad y nivel de amenaza de tu posición actual. Las salidas detectadas son interactivas: basta con pulsar sobre ellas para intentar el desplazamiento.
                      </p>
                    </div>
                  </div>

                  {/* VI. Inventario y Entropía */}
                  <div>
                    <h3 className="text-gold font-display text-sm uppercase tracking-widest mb-3 border-b border-gold-dim/20 pb-1 flex items-center gap-2">
                      <span>✦</span>
                      <span>VI. Inventario, Artesanía y Entropía</span>
                    </h3>
                    <div className="space-y-2.5 text-sm md:text-base">
                      <p>
                        Tu capacidad de carga está limitada a <span className="text-bone font-bold">6 huecos + (Fuerza / 2)</span>. Cargar en exceso acarreará penalizaciones severas de agotamiento.
                      </p>
                      <p>
                        <strong className="text-bone">Combinación:</strong> En el inspector de objetos puedes pulsar "Combinar" sobre un elemento y seleccionar otro compatible para improvisar soluciones (antorchas, emplastos, ganzúas rústicas o cócteles inflamables).
                      </p>
                      <p className="italic text-parchment-dim">
                        <strong className="text-gold-dim">Entropía:</strong> Los recursos son efímeros. Las armas sufren muescas, el fuego consume las teas y los venenos pierden potencia. Vigila las propiedades y etiquetas de tu equipo.
                      </p>
                    </div>
                  </div>

                  {/* VII. Vitalidad, Traumas y Sanidad */}
                  <div>
                    <h3 className="text-blood-bright font-display text-sm uppercase tracking-widest mb-3 border-b border-blood/20 pb-1 flex items-center gap-2">
                      <span>✦</span>
                      <span>VII. Cuerpo y Mente (Traumas y Fobias)</span>
                    </h3>
                    <div className="space-y-3 text-sm md:text-base">
                      <div>
                        <span className="text-blood-bright font-bold uppercase text-sm tracking-wider block mb-0.5">Vitalidad (HP)</span>
                        <p>Si tus puntos de golpe caen a 0, tu vigilia concluye de forma definitiva. Al descender del 30%, te expones a <span className="text-blood-bright font-semibold">Traumas físicos</span> permanentes que reducen tus facultades.</p>
                      </div>
                      <div>
                        <span className="text-sanity font-bold uppercase text-sm tracking-wider block mb-0.5">Cordura</span>
                        <p>Los horrores quebrantan el juicio. Una cordura mermada distorsiona la tipografía y los relatos del narrador. Por debajo del 50%, tu personaje puede contraer <span className="text-sanity font-semibold">Fobias</span> reactivas que disparan pánico ante ciertos estímulos.</p>
                      </div>
                    </div>
                  </div>

                  {/* VIII. Persistencia y Panteón */}
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <h3 className="text-gold font-display text-sm uppercase tracking-widest mb-2 flex items-center gap-2">
                      <span>✦</span>
                      <span>VIII. Persistencia, Respaldo y el Panteón</span>
                    </h3>
                    <p className="text-sm md:text-base mb-2">
                      La crónica se guarda automáticamente en cada turno en el almacenamiento local. Puedes utilizar el botón <strong className="text-bone">Descargar Crónica</strong> para obtener un archivo <span className="font-mono text-gold-dim">.json</span> y continuar tu periplo en cualquier equipo mediante <strong className="text-bone">Cargar Destino</strong>.
                    </p>
                    <p className="text-sm md:text-base text-stone-300 italic">
                      Aquellos que perecen no desaparecen: sus nombres, oficios, turnos sobrevividos y últimas palabras quedan tallados en el <strong className="text-blood-bright">Panteón</strong> de la pantalla inicial.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'about' && (
              <div className="space-y-6">
                <div className="border-b border-gold-dim/30 pb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-3xl font-display text-bone">El Proyecto</h2>
                  <span className="text-xs uppercase tracking-widest text-gold font-mono px-2 py-0.5 rounded bg-black/60 border border-gold-dim/40">
                    Crónicas de la Penumbra • Ver. 4.0
                  </span>
                </div>

                <div className="space-y-4 text-base md:text-lg font-serif leading-relaxed text-parchment-dim text-justify">
                  <p>
                    <strong className="text-gold font-display tracking-wide uppercase text-sm block mb-1">Manifiesto y Filosofía</strong>
                    <strong className="text-bone">Crónicas de la Penumbra</strong> es un experimento vanguardista de ficción interactiva gótica y rol de supervivencia. Fusiona la densidad literaria del horror oscuro (*Grimdark* y *Baja Fantasía*) con la capacidad generativa de modelos de Inteligencia Artificial de última hornada.
                  </p>
                  <p>
                    A diferencia de los librojuegos convencionales gobernados por árboles de decisión rígidos, aquí no hay caminos predefinidos: un Game Master neuronal analiza tu ajuar, tus heridas, tu cordura y el entorno para tejer una narración reactiva, visceral y literaria en riguroso tiempo real.
                  </p>
                </div>

                <div className="bg-void/60 p-5 rounded-2xl border border-gold-dim/30 space-y-4 shadow-inner">
                  <p className="text-xs uppercase tracking-widest text-gold font-display font-bold flex items-center gap-2">
                    <span>✦</span>
                    <span>Arquitectura y Stack Tecnológico (v4.0)</span>
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs md:text-sm">
                    <div className="bg-black/50 p-3 rounded-xl border border-gold-dim/15">
                      <span className="text-bone font-bold block mb-1 font-display uppercase tracking-wider">Motor Narrativo</span>
                      <span className="text-stone-300">Google Gemini 2.5 Flash / 3.8 Flash con ventana de contexto multiturno continua, control de tensión dramática y balanceo d20.</span>
                    </div>

                    <div className="bg-black/50 p-3 rounded-xl border border-gold-dim/15">
                      <span className="text-bone font-bold block mb-1 font-display uppercase tracking-wider">Audio Procedural</span>
                      <span className="text-stone-300">Sintetizador Web Audio API puro en tiempo real: drones abisales, piano, coros, percusión de combate y filtro de choque agónico.</span>
                    </div>

                    <div className="bg-black/50 p-3 rounded-xl border border-gold-dim/15">
                      <span className="text-bone font-bold block mb-1 font-display uppercase tracking-wider">Forja de Almas</span>
                      <span className="text-stone-300">Generador procedimental combinatorio infinito (+50.000 variantes) asistido por IA para nombres, trasfondos y atributos.</span>
                    </div>

                    <div className="bg-black/50 p-3 rounded-xl border border-gold-dim/15">
                      <span className="text-bone font-bold block mb-1 font-display uppercase tracking-wider">Interfaz y Accesibilidad</span>
                      <span className="text-stone-300">React 19 + TypeScript sobre Vite, escalador tipográfico dinámico independiente (UI y Crónica) y atajos de teclado completos.</span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-xs text-zinc-400 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="uppercase tracking-widest text-zinc-500 font-display">Desarrollo y Co-creación:</span>
                    <span className="text-stone-300 font-serif italic">GomSamurai & Antigravity (Google DeepMind)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="uppercase tracking-widest text-zinc-500 font-display">Almacenamiento y Privacidad:</span>
                    <span className="text-stone-300 font-serif italic">100% Local (LocalStorage + BYOK opcional)</span>
                  </div>
                </div>

                <p className="text-sm italic text-parchment text-center pt-2">
                  "Aquel que mira largo tiempo al abismo, ve cómo el abismo mira dentro de él."
                  <span className="block text-xs text-gold-dim mt-1 uppercase tracking-widest font-display font-semibold">— Friedrich Nietzsche</span>
                </p>
              </div>
            )}

            {activeModal === 'graveyard' && (
             <div className="text-left font-serif">
                <div className="flex justify-between items-center border-b border-blood-bright/30 pb-4 mb-6">
                   <div>
                      <h2 className="text-3xl font-display text-blood-bright tracking-widest uppercase">El Panteón</h2>
                      <p className="text-xs text-parchment-dim italic mt-1">Epitafios de almas devoradas por la penumbra</p>
                   </div>
                   {graveyardData.length > 0 && (
                      <button
                         onClick={() => {
                            if (confirm("¿Consagrar y purificar este panteón? Se borrarán los recuerdos de las almas caídas.")) {
                               localStorage.removeItem('penumbra_graveyard');
                               setGraveyardData([]);
                            }
                         }}
                         className="text-[10px] uppercase tracking-widest px-2.5 py-1 text-zinc-500 hover:text-blood-bright border border-zinc-800 hover:border-blood/40 rounded transition-colors"
                      >
                         Purificar Tierra
                      </button>
                   )}
                </div>

                {graveyardData.length === 0 ? (
                   <div className="py-12 text-center">
                      <div className="text-4xl text-gold-dim mb-3">⚰️</div>
                      <p className="text-parchment-dim italic">El panteón yace en silencio. Ninguna lápida ha sido alzada aún.</p>
                      <p className="text-xs text-parchment-dim/80 mt-2">Los ecos de futuros fracasos resonarán aquí.</p>
                   </div>
                ) : (
                   <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                      {graveyardData.map((soul) => (
                         <div key={soul.id} className="bg-stone-950/80 border border-blood/30 hover:border-blood/60 p-4 rounded-lg flex flex-col gap-2.5 relative transition-all shadow-lg group">
                            <div className="flex justify-between items-start">
                               <div>
                                  <h3 className="text-xl font-display text-bone tracking-wide group-hover:text-blood-bright transition-colors">{soul.name}</h3>
                                  <span className="text-xs uppercase tracking-widest text-gold-dim">{soul.archetype}</span>
                               </div>
                               <div className="text-right">
                                  <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase block">{new Date(soul.date).toLocaleDateString()}</span>
                                  <span className="text-[10px] text-parchment-dim font-display tracking-widest uppercase">{soul.turns} pasajes</span>
                               </div>
                            </div>

                            {(soul.deathLocation || soul.deathCause) && (
                               <div className="bg-black/40 border border-white/5 rounded p-2 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-400">
                                  {soul.deathLocation && (
                                     <div className="flex items-center gap-1.5 truncate">
                                        <span className="text-zinc-500">📍</span>
                                        <span className="truncate italic">{soul.deathLocation}</span>
                                     </div>
                                  )}
                                  {soul.deathCause && (
                                     <div className="flex items-center gap-1.5 truncate">
                                        <span className="text-blood-bright/70">💀</span>
                                        <span className="truncate italic text-zinc-300">{soul.deathCause}</span>
                                     </div>
                                  )}
                               </div>
                            )}

                            {soul.legacyItem && (
                               <div className="text-xs text-gold-dim flex items-center gap-1.5 bg-gold/5 border border-gold-dim/20 rounded px-2.5 py-1">
                                  <span>🕯️</span>
                                  <span className="italic">Reliquia perdida: <strong>{soul.legacyItem}</strong></span>
                               </div>
                            )}

                            <p className="text-sm italic text-parchment-dim border-t border-blood/10 pt-2.5 mt-1 opacity-90 leading-relaxed font-serif">
                               "{soul.lastWords}"
                            </p>
                         </div>
                      ))}
                   </div>
                )}
             </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={activeModal === 'settings'} 
        onClose={() => setActiveModal('none')} 
      />
    </div>
  );
};

export default HomeScreen;