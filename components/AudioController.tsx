import React, { useState, useEffect } from 'react';
import { audioSystem } from '../services/audioService';

interface AudioControllerProps {
  variant?: 'floating' | 'header';
}

const AudioController: React.FC<AudioControllerProps> = ({ variant = 'floating' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [masterVol, setMasterVol] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [mutedLayers, setMutedLayers] = useState({
    drone: false,
    orchestra: false,
    piano: false,
    texture: false,
    chimes: false,
    choir: false,
    subbass: false
  });

  // Initialize checks
  useEffect(() => {
    // Check initial states
    setMasterVol(audioSystem.getMasterVolume());
    setIsMuted(audioSystem.isMuted());
    setMutedLayers({
      drone: audioSystem.isLayerMuted('drone'),
      orchestra: audioSystem.isLayerMuted('orchestra'),
      piano: audioSystem.isLayerMuted('piano'),
      texture: audioSystem.isLayerMuted('texture'),
      chimes: audioSystem.isLayerMuted('chimes'),
      choir: audioSystem.isLayerMuted('choir'),
      subbass: audioSystem.isLayerMuted('subbass')
    });
  }, [isOpen]);

  const initAudio = async () => {
    await audioSystem.init();
    setIsInitialized(true);
    // Only open settings on init if not in header mode
    if (variant === 'floating') {
      setIsOpen(true);
    }
  };

  const handleSettingsToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isInitialized) {
      initAudio();
      setIsOpen(true);
    } else {
      setIsOpen(!isOpen);
      audioSystem.playClick();
    }
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isInitialized) {
      initAudio();
    }
    const newMuteState = audioSystem.toggleMute();
    setIsMuted(newMuteState);
    if (!newMuteState) {
       // If unmuting, update slider visual to restored volume
       setMasterVol(audioSystem.getMasterVolume());
    } else {
       setMasterVol(0);
    }
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMasterVol(val);
    audioSystem.setMasterVolume(val);
    // If user manually drags slider, unmute if muted
    if (isMuted && val > 0) {
       audioSystem.toggleMute(); // This logic might need refinement in service, but essentially acts as unmute
       setIsMuted(false);
    }
  };

  const toggleLayer = (layer: 'drone' | 'orchestra' | 'piano' | 'texture' | 'chimes' | 'choir' | 'subbass') => {
    const muted = audioSystem.toggleLayer(layer);
    setMutedLayers(prev => ({ ...prev, [layer]: muted }));
    audioSystem.playClick();
  };

  const handleRandom = () => {
    audioSystem.randomize();
    audioSystem.playLowButton();
  };

  const modalClass = variant === 'floating'
    ? "fixed top-16 right-4 origin-top-right"
    : "absolute top-12 right-0 origin-top-right";

  // --- RENDER FOR HEADER VARIANT ---
  if (variant === 'header') {
     return (
        <div className="relative flex items-center gap-2">
           {/* Mute Button */}
           <button 
              onClick={handleMuteToggle}
              className={`p-2 rounded-lg transition-colors uppercase text-xs tracking-[0.2em] font-bold flex items-center justify-center border border-transparent ${isMuted ? 'text-zinc-600 hover:text-zinc-400' : 'text-parchment-dim hover:text-gold hover:border-gold-dim/30 hover:bg-white/5'}`}
              title={isMuted ? "Activar Sonido" : "Silenciar"}
           >
              {isMuted ? (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                 </svg>
              ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                 </svg>
              )}
           </button>
           
           {/* Settings Trigger */}
           <button 
              onClick={handleSettingsToggle}
              className={`p-2 rounded-lg transition-colors flex items-center justify-center border border-transparent ${isOpen ? 'text-gold bg-white/10 border-gold-dim' : 'text-parchment-dim hover:text-gold hover:border-gold-dim/30 hover:bg-white/5'}`}
              title="Mezcla de Audio"
           >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
           </button>

           {/* Dropdown Modal (Shared logic) */}
           {isOpen && <SettingsModal 
              modalClass={modalClass} 
              masterVol={masterVol} 
              changeVolume={changeVolume} 
              handleRandom={handleRandom} 
              toggleLayer={toggleLayer} 
              mutedLayers={mutedLayers} 
              setIsOpen={setIsOpen} 
           />}
        </div>
     );
  }

  // --- RENDER FOR FLOATING VARIANT (Original) ---
  const buttonClass = `fixed top-4 right-4 z-[100] w-10 h-10 rounded-full border shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-sm ${isOpen ? 'bg-gold text-void border-gold' : 'bg-black/50 text-gold border-gold-dim hover:border-gold hover:scale-110'}`;

  return (
    <div>
      <button 
        onClick={handleSettingsToggle}
        className={`${buttonClass} flex items-center justify-center transition-all duration-300`}
        title="Controles de Sonido"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
        </svg>
      </button>

      {isOpen && <SettingsModal 
          modalClass={modalClass} 
          masterVol={masterVol} 
          changeVolume={changeVolume} 
          handleRandom={handleRandom} 
          toggleLayer={toggleLayer} 
          mutedLayers={mutedLayers} 
          setIsOpen={setIsOpen} 
       />}
    </div>
  );
};

// Extracted Modal for reuse
const SettingsModal = ({ modalClass, masterVol, changeVolume, handleRandom, toggleLayer, mutedLayers, setIsOpen }: any) => (
  <>
    <div className="fixed inset-0 z-[98]" onClick={() => setIsOpen(false)}></div>
    <div className={`${modalClass} z-[99] w-64 bg-panel border border-gold-dim rounded-xl shadow-2xl p-5 animate-fade-in`}>
       <div className="flex justify-between items-center mb-4 border-b border-gold-dim/30 pb-2">
          <span className="text-xs font-display font-bold uppercase tracking-widest text-gold">Atmósfera</span>
          <button onClick={handleRandom} className="text-parchment hover:text-white hover:scale-110 transition-transform" title="Aleatorizar">
            🎲
          </button>
       </div>
       <div className="mb-6">
          <label className="flex justify-between text-[10px] uppercase tracking-wider text-parchment-dim mb-2">
             <span>Volumen Maestro</span>
             <span>{Math.round(masterVol * 100)}%</span>
          </label>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={masterVol}
            onChange={changeVolume}
            className="w-full h-1 bg-void rounded-lg appearance-none cursor-pointer accent-gold"
          />
       </div>
       <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {[
            { id: 'drone', label: 'Vacío (Drone)' },
            { id: 'orchestra', label: 'Orquesta' },
            { id: 'piano', label: 'Ecos (Piano)' },
            { id: 'texture', label: 'Materia' },
            { id: 'chimes', label: 'Cristal (Chimes)' },
            { id: 'choir', label: 'Lamentos (Choir)' },
            { id: 'subbass', label: 'Graves (Subbass)' },
          ].map((layer) => (
             <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id as any)}
                className={`w-full flex justify-between items-center px-3 py-2 rounded border text-[10px] uppercase tracking-widest transition-all
                   ${!mutedLayers[layer.id] 
                      ? 'bg-gold/10 border-gold text-bone shadow-[0_0_10px_rgba(197,160,89,0.1)]' 
                      : 'bg-void border-zinc-800 text-zinc-600 hover:border-zinc-600'}
                `}
             >
                <span>{layer.label}</span>
                <span className={!mutedLayers[layer.id] ? 'text-gold' : 'text-zinc-700'}>
                   ●
                </span>
             </button>
          ))}
       </div>
       <div className="mt-4 text-[8px] text-center text-zinc-600 uppercase tracking-widest">
          Sonido Procedural
       </div>
    </div>
  </>
);

export default AudioController;