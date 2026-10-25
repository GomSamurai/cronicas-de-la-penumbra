/**
 * typographyService.ts - Sistema de Personalización Tipográfica, Lectura y Accesibilidad
 * Crónicas de la Penumbra - Edición Definitiva
 */

export type NarrativeTextSize = 'normal' | 'large' | 'huge';
export type UiScale = 'compact' | 'normal' | 'large';
export type ReadingSpeed = 'normal' | 'fast' | 'instant';
export type NarrativeFont = 'garamond' | 'cinzel' | 'playfair';
export type LineSpacing = 'compact' | 'normal' | 'relaxed';
export type TextAlignment = 'justify' | 'left';

export interface NarrativeSizeConfig {
  id: NarrativeTextSize;
  label: string;
  badge: string;
  rem: string;
  sampleFontSize: string;
}

export interface UiScaleConfig {
  id: UiScale;
  label: string;
  badge: string;
  rootPx: string;
}

export interface FontConfig {
  id: NarrativeFont;
  name: string;
  badge: string;
  fontFamily: string;
  description: string;
}

export interface ReadingPreferences {
  readingSpeed: ReadingSpeed;
  narrativeSize: NarrativeTextSize;
  fontFamily: NarrativeFont;
  lineSpacing: LineSpacing;
  alignment: TextAlignment;
  dropCap: boolean;
  typingAudio: boolean;
  uiScale: UiScale;
}

export const NARRATIVE_SIZES: Record<NarrativeTextSize, NarrativeSizeConfig> = {
  normal: {
    id: 'normal',
    label: 'Estándar',
    badge: '100%',
    rem: '1.25rem',
    sampleFontSize: '1.15rem'
  },
  large: {
    id: 'large',
    label: 'Cómodo',
    badge: '+16%',
    rem: '1.45rem',
    sampleFontSize: '1.35rem'
  },
  huge: {
    id: 'huge',
    label: 'Amplio',
    badge: '+36%',
    rem: '1.7rem',
    sampleFontSize: '1.6rem'
  }
};

export const UI_SCALES: Record<UiScale, UiScaleConfig> = {
  compact: {
    id: 'compact',
    label: 'Compacta',
    badge: '92%',
    rootPx: '14.8px'
  },
  normal: {
    id: 'normal',
    label: 'Estándar',
    badge: '100%',
    rootPx: '16px'
  },
  large: {
    id: 'large',
    label: 'Amplia',
    badge: '112%',
    rootPx: '18px'
  }
};

export const FONTS: Record<NarrativeFont, FontConfig> = {
  garamond: {
    id: 'garamond',
    name: 'Cormorant Garamond',
    badge: 'Códice Clásico',
    fontFamily: "'Cormorant Garamond', serif",
    description: 'Prosa renacentista, elegante y estilizada; perfecta para inmersión litúrgica y gótica.'
  },
  cinzel: {
    id: 'cinzel',
    name: 'Cinzel Epigráfico',
    badge: 'Arcano',
    fontFamily: "'Cinzel', serif",
    description: 'Carácter solemne, heráldico y lapidario; recuerda a inscripciones grabadas en piedra funeraria.'
  },
  playfair: {
    id: 'playfair',
    name: 'Playfair Display',
    badge: 'Victoriano',
    fontFamily: "'Playfair Display', serif",
    description: 'Trazo contrastado y refinado; evoca novelas góticas del siglo XIX y crónicas de misterio.'
  }
};

export const LINE_SPACINGS: Record<LineSpacing, { label: string; badge: string; value: string }> = {
  compact: { label: 'Compacto', badge: '1.55', value: '1.55' },
  normal: { label: 'Equilibrado', badge: '1.75', value: '1.75' },
  relaxed: { label: 'Holgado', badge: '2.05', value: '2.05' }
};

export const SPEED_MAP: Record<ReadingSpeed, { delay: number; label: string; badge: string }> = {
  normal: { delay: 14, label: 'Pausada', badge: '1x' },
  fast: { delay: 5, label: 'Ágil', badge: '2x' },
  instant: { delay: 0, label: 'Instantánea', badge: 'Directo' }
};

const STORAGE_KEYS = {
  SPEED: 'penumbra_reading_speed',
  SIZE: 'penumbra_narrative_text_size',
  FONT: 'penumbra_narrative_font',
  SPACING: 'penumbra_line_spacing',
  ALIGN: 'penumbra_text_align',
  DROPCAP: 'penumbra_drop_cap',
  TYPING_AUDIO: 'penumbra_typing_audio',
  UI: 'penumbra_ui_scale'
};

type TypographyListener = (prefs: ReadingPreferences) => void;
const listeners = new Set<TypographyListener>();

export const getReadingSpeed = (): ReadingSpeed => {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.SPEED) as ReadingSpeed;
    if (val === 'normal' || val === 'fast' || val === 'instant') return val;
  } catch {}
  return 'normal';
};

export const getNarrativeTextSize = (): NarrativeTextSize => {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.SIZE) as NarrativeTextSize;
    if (val === 'normal' || val === 'large' || val === 'huge') return val;
  } catch {}
  return 'normal';
};

export const getNarrativeFont = (): NarrativeFont => {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.FONT) as NarrativeFont;
    if (val === 'garamond' || val === 'cinzel' || val === 'playfair') return val;
  } catch {}
  return 'garamond';
};

export const getLineSpacing = (): LineSpacing => {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.SPACING) as LineSpacing;
    if (val === 'compact' || val === 'normal' || val === 'relaxed') return val;
  } catch {}
  return 'normal';
};

export const getTextAlignment = (): TextAlignment => {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.ALIGN) as TextAlignment;
    if (val === 'justify' || val === 'left') return val;
  } catch {}
  return 'justify';
};

export const getDropCapSetting = (): boolean => {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.DROPCAP);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
};

export const getTypingAudioSetting = (): boolean => {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.TYPING_AUDIO);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
};

export const getUiScale = (): UiScale => {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.UI) as UiScale;
    if (val === 'compact' || val === 'normal' || val === 'large') return val;
  } catch {}
  return 'normal';
};

export const getAllReadingPreferences = (): ReadingPreferences => ({
  readingSpeed: getReadingSpeed(),
  narrativeSize: getNarrativeTextSize(),
  fontFamily: getNarrativeFont(),
  lineSpacing: getLineSpacing(),
  alignment: getTextAlignment(),
  dropCap: getDropCapSetting(),
  typingAudio: getTypingAudioSetting(),
  uiScale: getUiScale()
});

export const applyTypographySettings = (): void => {
  if (typeof document === 'undefined') return;

  const prefs = getAllReadingPreferences();
  const root = document.documentElement;

  // Variables CSS dinámicas
  root.style.setProperty('--penumbra-narrative-size', NARRATIVE_SIZES[prefs.narrativeSize].rem);
  root.style.setProperty('--penumbra-narrative-line-height', LINE_SPACINGS[prefs.lineSpacing].value);
  root.style.setProperty('--penumbra-narrative-font', FONTS[prefs.fontFamily].fontFamily);
  root.style.setProperty('--penumbra-narrative-align', prefs.alignment === 'justify' ? 'justify' : 'left');
  root.style.fontSize = UI_SCALES[prefs.uiScale].rootPx;

  // Notificar suscriptores
  listeners.forEach(fn => {
    try {
      fn(prefs);
    } catch (e) {
      console.error("Error en listener de tipografía:", e);
    }
  });
};

export const setReadingSpeed = (speed: ReadingSpeed): void => {
  try { localStorage.setItem(STORAGE_KEYS.SPEED, speed); } catch {}
  applyTypographySettings();
};

export const cycleReadingSpeed = (): ReadingSpeed => {
  const current = getReadingSpeed();
  const seq: ReadingSpeed[] = ['normal', 'fast', 'instant'];
  const next = seq[(seq.indexOf(current) + 1) % seq.length];
  setReadingSpeed(next);
  return next;
};

export const setNarrativeTextSize = (size: NarrativeTextSize): void => {
  try { localStorage.setItem(STORAGE_KEYS.SIZE, size); } catch {}
  applyTypographySettings();
};

export const cycleNarrativeTextSize = (direction: 'up' | 'down'): NarrativeTextSize => {
  const current = getNarrativeTextSize();
  const sequence: NarrativeTextSize[] = ['normal', 'large', 'huge'];
  const currentIndex = sequence.indexOf(current);

  let nextIndex = currentIndex;
  if (direction === 'up' && currentIndex < sequence.length - 1) {
    nextIndex = currentIndex + 1;
  } else if (direction === 'down' && currentIndex > 0) {
    nextIndex = currentIndex - 1;
  }

  const nextSize = sequence[nextIndex];
  if (nextSize !== current) {
    setNarrativeTextSize(nextSize);
  }
  return nextSize;
};

export const setNarrativeFont = (font: NarrativeFont): void => {
  try { localStorage.setItem(STORAGE_KEYS.FONT, font); } catch {}
  applyTypographySettings();
};

export const setLineSpacing = (spacing: LineSpacing): void => {
  try { localStorage.setItem(STORAGE_KEYS.SPACING, spacing); } catch {}
  applyTypographySettings();
};

export const setTextAlignment = (align: TextAlignment): void => {
  try { localStorage.setItem(STORAGE_KEYS.ALIGN, align); } catch {}
  applyTypographySettings();
};

export const setDropCapSetting = (enable: boolean): void => {
  try { localStorage.setItem(STORAGE_KEYS.DROPCAP, String(enable)); } catch {}
  applyTypographySettings();
};

export const setTypingAudioSetting = (enable: boolean): void => {
  try { localStorage.setItem(STORAGE_KEYS.TYPING_AUDIO, String(enable)); } catch {}
  applyTypographySettings();
};

export const setUiScale = (scale: UiScale): void => {
  try { localStorage.setItem(STORAGE_KEYS.UI, scale); } catch {}
  applyTypographySettings();
};

export const onTypographyChange = (listener: TypographyListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// Inicialización automática
if (typeof window !== 'undefined') {
  applyTypographySettings();
}
