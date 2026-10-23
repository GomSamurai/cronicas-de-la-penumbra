import React, { useState } from 'react';
import { LocationInfo, LocationLighting, LocationDanger } from '../types';
import { audioSystem } from '../services/audioService';

interface AtlasModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation?: LocationInfo;
  visitedLocations: string[];
}

const LIGHTING_CONFIG: Record<LocationLighting, { label: string; icon: string; color: string }> = {
  oscuridad_total: { label: 'Oscuridad Total', icon: '🌑', color: 'text-purple-400' },
  penumbra: { label: 'Penumbra Opresiva', icon: '🕯️', color: 'text-gold-dim' },
  antorchas: { label: 'Luz de Antorchas', icon: '🔥', color: 'text-amber-500' },
  luz_de_dia: { label: 'Luz Descolorida', icon: '☀️', color: 'text-zinc-300' }
};

const DANGER_CONFIG: Record<LocationDanger, { label: string; icon: string; badgeClass: string }> = {
  seguro: { label: 'Refugio Relativo', icon: '🛡️', badgeClass: 'border-emerald-700/60 text-emerald-400 bg-emerald-950/20' },
  inquietante: { label: 'Inquietante', icon: '👁️', badgeClass: 'border-gold-dim/60 text-gold bg-gold/10' },
  letal: { label: 'Zona Letal', icon: '☠️', badgeClass: 'border-blood text-blood-bright bg-blood/20 animate-pulse' }
};

const AtlasModal: React.FC<AtlasModalProps> = ({ isOpen, onClose, currentLocation, visitedLocations }) => {
  const [selectedLocName, setSelectedLocName] = useState<string>(currentLocation?.name || visitedLocations[visitedLocations.length - 1] || '');

  if (!isOpen) return null;

  // Build a unique list of locations
  const allLocations = Array.from(new Set([
    ...(currentLocation ? [currentLocation.name] : []),
    ...visitedLocations
  ]));

  const isCurrent = (name: string) => currentLocation?.name === name;

  const handleSelect = (name: string) => {
    audioSystem.playClick();
    setSelectedLocName(name);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 md:p-6 animate-fade-in">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md" 
        onClick={onClose} 
      />

      <div className="relative bg-panel border border-gold-dim w-full max-w-5xl h-[88vh] max-h-[850px] shadow-[0_15px_60px_rgba(0,0,0,0.9)] flex flex-col rounded-2xl overflow-hidden text-parchment font-serif">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gold-dim/30 bg-void/50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl text-gold-dim">🗺️</span>
            <div>
              <h2 className="text-xl md:text-2xl font-display font-bold text-bone tracking-widest uppercase">
                Atlas Mental de la Penumbra
              </h2>
              <p className="text-[11px] text-parchment-dim tracking-wider font-display uppercase">
                Cartografía descubierta • {allLocations.length} enclave{allLocations.length === 1 ? '' : 's'} explorado{allLocations.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-gold transition-colors text-xl font-bold px-2 py-1"
            title="Cerrar Atlas"
          >
            ✕
          </button>
        </div>

        {/* Main Content: Split into Network Visualizer & Inspector */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT: Interactive Map Canvas (SVG Nodes & Connections) */}
          <div className="flex-1 relative bg-void/80 overflow-hidden flex flex-col justify-between p-4 border-b md:border-b-0 md:border-r border-gold-dim/20">
            
            {/* Atmospheric Compass Rose Watermark */}
            <div className="absolute top-4 right-4 text-gold-dim/15 text-7xl select-none pointer-events-none font-display">
              🧭
            </div>

            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-display mb-2">
              Red de Nodos y Senderos
            </div>

            {/* SVG Visual Graph */}
            <div className="flex-1 relative border border-gold-dim/10 rounded-xl bg-black/40 overflow-auto custom-scrollbar flex items-center justify-center p-6">
              <div className="flex flex-wrap items-center justify-center gap-6 max-w-xl py-6">
                {allLocations.map((locName, index) => {
                  const isCur = isCurrent(locName);
                  const isSel = selectedLocName === locName;

                  return (
                    <React.Fragment key={locName}>
                      {index > 0 && (
                        <div className="hidden sm:flex items-center text-gold-dim/30 select-none">
                          <span className="text-xs font-mono">── ✣ ──</span>
                        </div>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => handleSelect(locName)}
                        className={`group relative p-4 rounded-xl border transition-all text-left max-w-[200px] flex flex-col justify-between ${
                          isCur 
                            ? 'bg-gold/15 border-gold shadow-[0_0_25px_rgba(197,160,89,0.25)] ring-1 ring-gold' 
                            : isSel 
                            ? 'bg-zinc-800/80 border-gold-dim text-bone shadow-md' 
                            : 'bg-black/60 border-gold-dim/20 hover:border-gold-dim/60 text-parchment-dim hover:text-parchment'
                        }`}
                      >
                        {isCur && (
                          <div className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-gold text-void font-display text-[9px] font-bold uppercase tracking-wider animate-pulse">
                            Ubicación Actual
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">{isCur ? '📍' : '🏛️'}</span>
                          <span className="font-display text-xs font-bold truncate text-bone group-hover:text-gold transition-colors">
                            {locName}
                          </span>
                        </div>

                        <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                          <span>Nodo #{index + 1}</span>
                          <span className="text-gold-dim">Ver ↗</span>
                        </div>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Bottom Legend */}
            <div className="flex items-center gap-4 text-[10px] uppercase font-display text-zinc-500 pt-3 border-t border-gold-dim/10">
              <span className="flex items-center gap-1"><span className="text-gold">📍</span> Ubicación Presente</span>
              <span className="flex items-center gap-1"><span>🏛️</span> Enclave Visitado</span>
              <span className="flex items-center gap-1"><span className="text-zinc-600">✣</span> Senderos de la Penumbra</span>
            </div>

          </div>

          {/* RIGHT: Enclave Inspector */}
          <div className="w-full md:w-80 lg:w-96 bg-panel p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar shrink-0">
            <div className="space-y-6">
              
              <div className="border-b border-gold-dim/20 pb-3">
                <span className="text-[10px] uppercase font-display tracking-widest text-gold-dim font-bold block mb-1">
                  Inspección de Enclave
                </span>
                <h3 className="text-2xl font-display font-bold text-bone">
                  {selectedLocName || 'Selecciona un enclave'}
                </h3>
                {isCurrent(selectedLocName) && (
                  <span className="inline-block mt-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
                    Estás aquí ahora mismo
                  </span>
                )}
              </div>

              {/* Location details (if current) */}
              {isCurrent(selectedLocName) && currentLocation ? (
                <div className="space-y-4 animate-fade-in text-sm">
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {/* Lighting */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/40 border border-gold-dim/20 text-xs">
                      <span>{LIGHTING_CONFIG[currentLocation.lighting]?.icon || '🕯️'}</span>
                      <span className={LIGHTING_CONFIG[currentLocation.lighting]?.color || 'text-parchment'}>
                        {LIGHTING_CONFIG[currentLocation.lighting]?.label || currentLocation.lighting}
                      </span>
                    </div>

                    {/* Danger */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-bold ${DANGER_CONFIG[currentLocation.dangerLevel]?.badgeClass || ''}`}>
                      <span>{DANGER_CONFIG[currentLocation.dangerLevel]?.icon || '⚠️'}</span>
                      <span>{DANGER_CONFIG[currentLocation.dangerLevel]?.label || currentLocation.dangerLevel}</span>
                    </div>
                  </div>

                  {/* Atmosphere Description */}
                  <div className="bg-void/60 border border-gold-dim/15 rounded-lg p-3 text-xs leading-relaxed text-parchment-dim italic">
                    "{currentLocation.description}"
                  </div>

                  {/* Exits */}
                  <div>
                    <span className="text-[10px] uppercase font-display tracking-widest text-gold-dim block mb-2 font-bold">
                      Salidas & Sendas Conocidas:
                    </span>
                    <ul className="space-y-1.5">
                      {currentLocation.exits.map((exit, i) => (
                        <li key={i} className="text-xs text-parchment flex items-start gap-2 bg-black/30 p-2 rounded border border-white/5">
                          <span className="text-gold-dim">↳</span>
                          <span>{exit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Connected Locations */}
                  {currentLocation.connectedLocations && currentLocation.connectedLocations.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase font-display tracking-widest text-zinc-400 block mb-2 font-bold">
                        Vínculos Cartográficos:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {currentLocation.connectedLocations.map((conn, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 font-mono">
                            {conn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="space-y-4 text-xs text-parchment-dim">
                  <p className="leading-relaxed">
                    Este enclave fue transitado en el pasado de tu vigilia. Los recuerdos físicos de la niebla persisten en tu memoria.
                  </p>
                  <div className="p-3 bg-void/40 border border-gold-dim/10 rounded-lg text-zinc-500 font-mono text-[11px]">
                    El detalle cartográfico en tiempo real se actualiza cuando tu personaje vuelve a pisar este suelo.
                  </div>
                </div>
              )}

            </div>

            {/* Quick List of Visited Enclaves */}
            <div className="pt-4 border-t border-gold-dim/20 mt-6">
              <span className="text-[10px] uppercase font-display tracking-widest text-zinc-500 block mb-2">
                Registro de Tránsito
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                {allLocations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => handleSelect(loc)}
                    className={`text-[10px] px-2 py-1 rounded transition-colors ${
                      selectedLocName === loc 
                        ? 'bg-gold text-void font-bold' 
                        : 'bg-black/50 text-parchment-dim hover:text-white border border-white/5'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default AtlasModal;
