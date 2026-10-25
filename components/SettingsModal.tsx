import React, { useState, useEffect } from 'react';
import { getCustomApiKey, getSelectedModel, testConnection } from '../services/geminiService';
import { audioSystem } from '../services/audioService';
import { 
  getNarrativeTextSize, 
  setNarrativeTextSize, 
  getUiScale, 
  setUiScale, 
  NARRATIVE_SIZES, 
  UI_SCALES, 
  NarrativeTextSize, 
  UiScale 
} from '../services/typographyService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const getVisualEffectsSetting = (): boolean => {
  try {
    const val = localStorage.getItem('penumbra_visual_effects');
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [visualEffects, setVisualEffects] = useState(true);
  const [narrativeSize, setNarrativeSize] = useState<NarrativeTextSize>('normal');
  const [uiScale, setLocalUiScale] = useState<UiScale>('normal');
  
  // Audio state
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isReactive, setIsReactive] = useState(true);

  // Testing connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getCustomApiKey());
      setSelectedModel(getSelectedModel());
      setVisualEffects(getVisualEffectsSetting());
      setNarrativeSize(getNarrativeTextSize());
      setLocalUiScale(getUiScale());
      setVolume(audioSystem.getMasterVolume());
      setIsMuted(audioSystem.isMuted());
      setIsReactive(audioSystem.isReactive());
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    audioSystem.playClick();
    try {
      if (apiKey.trim()) {
        localStorage.setItem('penumbra_custom_api_key', apiKey.trim());
      } else {
        localStorage.removeItem('penumbra_custom_api_key');
      }
      localStorage.setItem('penumbra_selected_model', selectedModel);
      localStorage.setItem('penumbra_visual_effects', String(visualEffects));
      setNarrativeTextSize(narrativeSize);
      setUiScale(uiScale);
    } catch (e) {
      console.error("Error al guardar ajustes:", e);
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleSelectNarrativeSize = (size: NarrativeTextSize) => {
    audioSystem.playClick();
    setNarrativeSize(size);
    setNarrativeTextSize(size);
  };

  const handleSelectUiScale = (scale: UiScale) => {
    audioSystem.playClick();
    setLocalUiScale(scale);
    setUiScale(scale);
  };

  const handleTestKey = async () => {
    audioSystem.playClick();
    setIsTesting(true);
    setTestResult(null);
    const res = await testConnection(apiKey, selectedModel);
    setIsTesting(false);
    setTestResult(res);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    audioSystem.setMasterVolume(val);
    if (isMuted && val > 0) {
      audioSystem.toggleMute();
      setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    const muted = audioSystem.toggleMute();
    setIsMuted(muted);
    audioSystem.playClick();
  };

  const handleToggleReactive = () => {
    const reactive = audioSystem.toggleReactiveAudio();
    setIsReactive(reactive);
    audioSystem.playClick();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      <div className="relative bg-panel border border-gold-dim w-full max-w-2xl p-6 md:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-scale-up max-h-[90vh] overflow-y-auto custom-scrollbar rounded-xl text-parchment font-serif">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gold-dim/30 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl text-gold-dim">⚙️</span>
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-bone tracking-wide">
                Ajustes de la Vigilia
              </h2>
              <p className="text-xs text-parchment-dim tracking-wider uppercase font-display">
                Configuración del Éter, Rendimiento y Sensaciones
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-gold transition-colors text-xl font-bold px-2 py-1"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">

          {/* SECCIÓN 1: API KEY PERSONALIZADA (BYOK) */}
          <div className="bg-void/60 border border-gold-dim/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase font-display tracking-widest text-gold font-bold">
                Clave de API Gemini (BYOK)
              </label>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-[11px] text-gold-bright hover:underline font-mono flex items-center gap-1"
              >
                <span>Obtener clave gratis ↗</span>
              </a>
            </div>

            <p className="text-xs text-parchment-dim leading-relaxed">
              Introduce tu clave personal de <strong className="text-bone">Google AI Studio</strong> para jugar sin agotar la cuota comunitaria del servidor. Se almacena <strong className="text-gold-dim">únicamente en tu navegador</strong> y nunca en ninguna base de datos.
            </p>

            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-black/70 border border-gold-dim/40 rounded px-3 py-2 text-sm text-bone font-mono focus:border-gold focus:outline-none pr-24"
              />
              <div className="absolute right-2 flex items-center gap-1">
                {apiKey && (
                  <button
                    type="button"
                    onClick={() => setApiKey('')}
                    className="text-[10px] uppercase text-zinc-400 hover:text-red-400 px-1.5 py-1"
                    title="Borrar clave (usar servidor)"
                  >
                    Borrar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-xs text-zinc-400 hover:text-gold px-2 py-1"
                  title={showKey ? 'Ocultar' : 'Mostrar'}
                >
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Test Connection Button & Result */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={isTesting}
                className="px-3 py-1.5 bg-panel border border-gold-dim/40 hover:border-gold hover:text-gold text-xs font-display uppercase tracking-widest transition-all rounded disabled:opacity-50 flex items-center gap-2"
              >
                {isTesting ? (
                  <>
                    <span className="animate-spin text-gold">⏳</span>
                    <span>Sondeando el Éter...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Probar Conexión</span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-zinc-500 font-mono italic">
                {apiKey.trim() ? "Clave personalizada activa" : "Usando clave del servidor"}
              </span>
            </div>

            {testResult && (
              <div className={`p-3 rounded text-xs border font-mono transition-all animate-fade-in ${
                testResult.success 
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' 
                  : 'bg-red-950/40 border-red-500/50 text-red-300'
              }`}>
                <div className="flex items-start gap-2">
                  <span>{testResult.success ? '✓' : '⚠️'}</span>
                  <div>
                    <div className="font-bold">{testResult.message}</div>
                    {testResult.model && (
                      <div className="text-[10px] opacity-80 mt-0.5">Modelo verificado: {testResult.model}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: MODELO DE INTELIGENCIA NARRATIVA */}
          <div className="bg-void/60 border border-gold-dim/20 rounded-lg p-4 space-y-3">
            <label className="text-xs uppercase font-display tracking-widest text-gold font-bold block">
              Motor Narrativo (Modelo de Gemini)
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {[
                { 
                  id: 'gemini-2.5-flash', 
                  title: '2.5 Flash', 
                  badge: 'Recomendado', 
                  desc: 'Equilibrio perfecto entre velocidad (~1.5s) y coherencia grimdark.' 
                },
                { 
                  id: 'gemini-3.8-flash', 
                  title: '3.8 Flash', 
                  badge: 'Vanguardia', 
                  desc: 'Motor experimental con vocabulario más punzante y oscuro.' 
                },
                { 
                  id: 'gemini-2.5-pro', 
                  title: '2.5 Pro', 
                  badge: 'Barroco', 
                  desc: 'Densidad literaria máxima y razonamiento profundo (más pausado).' 
                }
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedModel(item.id);
                    audioSystem.playClick();
                  }}
                  className={`text-left p-3 rounded border transition-all flex flex-col justify-between ${
                    selectedModel === item.id 
                      ? 'bg-gold/15 border-gold shadow-[0_0_15px_rgba(197,160,89,0.15)] text-bone' 
                      : 'bg-black/40 border-gold-dim/20 hover:border-gold-dim/50 text-parchment-dim'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display font-bold text-xs text-bone">{item.title}</span>
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-black/60 border border-gold-dim/30 text-gold-dim font-mono">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug opacity-90">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* SECCIÓN 3: EFECTOS VISCERALES Y ACCESIBILIDAD */}
          <div className="bg-void/60 border border-gold-dim/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs uppercase font-display tracking-widest text-gold font-bold block">
                  Efectos Visuales Viscerales
                </label>
                <p className="text-xs text-parchment-dim mt-0.5">
                  Aberración cromática por locura, temblores en el texto, desaturación en agonía y pulso arterial.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setVisualEffects(!visualEffects);
                  audioSystem.playClick();
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors border ${
                  visualEffects 
                    ? 'bg-gold/30 border-gold' 
                    : 'bg-zinc-900 border-zinc-700'
                }`}
                title={visualEffects ? 'Activados' : 'Desactivados'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-gold transition-transform ${
                    visualEffects ? 'translate-x-6' : 'translate-x-1 bg-zinc-500'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* SECCIÓN 4: AUDIO Y PAISAJE SONORO */}
          <div className="bg-void/60 border border-gold-dim/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase font-display tracking-widest text-gold font-bold">
                Paisaje Sonoro Procedural
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`text-xs px-2.5 py-1 rounded border transition-all ${
                    isMuted 
                      ? 'border-red-500 text-red-400 bg-red-950/20 font-bold' 
                      : 'border-gold-dim/40 text-parchment hover:border-gold'
                  }`}
                >
                  {isMuted ? 'Silenciado 🔇' : 'Sonido Activo 🔊'}
                </button>
                <button
                  type="button"
                  onClick={handleToggleReactive}
                  className={`text-xs px-2.5 py-1 rounded border transition-all ${
                    isReactive 
                      ? 'border-gold text-gold bg-gold/10' 
                      : 'border-zinc-700 text-zinc-500'
                  }`}
                  title="Cambia la tensión musical según el combate, la locura y las heridas"
                >
                  Reactivo: {isReactive ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-400">Vol:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full accent-[#c5a059] h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer"
              />
              <span className="text-xs font-mono text-gold-dim w-8 text-right">
                {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>
          </div>

          {/* SECCIÓN 5: ACCESIBILIDAD Y TIPOGRAFÍA */}
          <div className="bg-void/60 border border-gold-dim/20 rounded-lg p-4 space-y-4">
            <div>
              <label className="text-xs uppercase font-display tracking-widest text-gold font-bold block">
                Accesibilidad y Tipografía
              </label>
              <p className="text-xs text-parchment-dim mt-0.5">
                Calibra el tamaño de los textos y la proporción de la interfaz para una lectura descansada y nítida.
              </p>
            </div>

            {/* Subsección 1: Tamaño de Lectura de la Crónica */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display uppercase tracking-wider text-bone font-bold flex items-center gap-1.5">
                  <span>📖</span>
                  <span>Texto Narrativo (Crónica y Pasajes)</span>
                </span>
                <span className="text-[10px] uppercase font-mono text-gold font-bold px-2 py-0.5 rounded bg-black/60 border border-gold-dim/40">
                  {NARRATIVE_SIZES[narrativeSize].label} ({NARRATIVE_SIZES[narrativeSize].badge})
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(NARRATIVE_SIZES) as NarrativeTextSize[]).map((key) => {
                  const item = NARRATIVE_SIZES[key];
                  const isSelected = narrativeSize === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectNarrativeSize(key)}
                      className={`text-center py-2 px-2.5 rounded border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-gold/25 border-gold shadow-[0_0_12px_rgba(197,160,89,0.3)] text-bone font-bold' 
                          : 'bg-black/40 border-gold-dim/20 hover:border-gold-dim/50 text-parchment-dim hover:text-parchment'
                      }`}
                    >
                      <div className="text-xs font-display font-bold">{item.label}</div>
                      <div className="text-[10px] font-mono text-gold-dim mt-0.5">{item.badge}</div>
                    </button>
                  );
                })}
              </div>

              {/* Vista Previa en Vivo */}
              <div className="bg-black/50 border border-gold-dim/30 rounded-lg p-3 text-parchment font-serif italic transition-all duration-300">
                <span className="text-[9px] uppercase tracking-widest font-display text-gold-dim block mb-1 font-bold not-italic">
                  Muestra en tiempo real:
                </span>
                <p style={{ fontSize: NARRATIVE_SIZES[narrativeSize].sampleFontSize, lineHeight: '1.6' }} className="text-stone-200">
                  "El eco de tus pasos despierta a las sombras dormidas en las criptas. Un susurro helado recorre el aire..."
                </p>
              </div>
            </div>

            {/* Subsección 2: Escala General de la Interfaz */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display uppercase tracking-wider text-bone font-bold flex items-center gap-1.5">
                  <span>🖥️</span>
                  <span>Escala Global de Interfaz (Zoom UI)</span>
                </span>
                <span className="text-[10px] uppercase font-mono text-gold font-bold px-2 py-0.5 rounded bg-black/60 border border-gold-dim/40">
                  {UI_SCALES[uiScale].label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(UI_SCALES) as UiScale[]).map((key) => {
                  const item = UI_SCALES[key];
                  const isSelected = uiScale === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectUiScale(key)}
                      className={`text-center py-2 px-2.5 rounded border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-gold/25 border-gold shadow-[0_0_12px_rgba(197,160,89,0.3)] text-bone font-bold' 
                          : 'bg-black/40 border-gold-dim/20 hover:border-gold-dim/50 text-parchment-dim hover:text-parchment'
                      }`}
                    >
                      <div className="text-xs font-display font-bold">{item.label}</div>
                      <div className="text-[10px] font-mono text-gold-dim mt-0.5">{item.badge}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-zinc-500 font-serif italic">
                Ajusta proporcionalmente los botones, fichas, paneles y textos secundarios en toda la aplicación.
              </p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-4 border-t border-gold-dim/30 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">
            Las preferencias se recuerdan en este dispositivo.
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-700 hover:border-zinc-500 text-xs font-display uppercase tracking-widest text-parchment-dim transition-all rounded"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 bg-gradient-to-r from-gold-dim via-gold to-gold-dim text-void font-display font-bold text-xs uppercase tracking-widest transition-all rounded hover:brightness-110 shadow-[0_0_20px_rgba(197,160,89,0.3)] flex items-center gap-2"
            >
              {saveSuccess ? (
                <>
                  <span>✓</span>
                  <span>Guardado</span>
                </>
              ) : (
                <span>Guardar Ajustes</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
