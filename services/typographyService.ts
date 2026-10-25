/**
 * typographyService.ts - Sistema de Accesibilidad y Escala Tipográfica
 * Crónicas de la Penumbra
 * 
 * Permite a los jugadores ajustar el tamaño del texto narrativo (crónica)
 * y la escala general de la interfaz para máxima legibilidad sin romper el layout.
 */

export type NarrativeTextSize = 'normal' | 'large' | 'huge';
export type UiScale = 'compact' | 'normal' | 'large';

export interface NarrativeSizeConfig {
  id: NarrativeTextSize;
  label: string;
  badge: string;
  rem: string;
  lineHeight: string;
  sampleFontSize: string;
}

export interface UiScaleConfig {
  id: UiScale;
  label: string;
  badge: string;
  rootPx: string;
}

export const NARRATIVE_SIZES: Record<NarrativeTextSize, NarrativeSizeConfig> = {
  normal: {
    id: 'normal',
    label: 'Estándar',
    badge: '100%',
    rem: '1.25rem',
    lineHeight: '1.75',
    sampleFontSize: '1.15rem'
  },
  large: {
    id: 'large',
    label: 'Cómodo',
    badge: '+16%',
    rem: '1.45rem',
    lineHeight: '1.8',
    sampleFontSize: '1.35rem'
  },
  huge: {
    id: 'huge',
    label: 'Amplio',
    badge: '+36%',
    rem: '1.7rem',
    lineHeight: '1.85',
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

const STORAGE_KEY_NARRATIVE = 'penumbra_narrative_text_size';
const STORAGE_KEY_UI = 'penumbra_ui_scale';

type TypographyListener = (state: { narrativeSize: NarrativeTextSize; uiScale: UiScale }) => void;
const listeners = new Set<TypographyListener>();

export const getNarrativeTextSize = (): NarrativeTextSize => {
  try {
    const val = localStorage.getItem(STORAGE_KEY_NARRATIVE) as NarrativeTextSize;
    if (val === 'normal' || val === 'large' || val === 'huge') {
      return val;
    }
  } catch {}
  return 'normal';
};

export const getUiScale = (): UiScale => {
  try {
    const val = localStorage.getItem(STORAGE_KEY_UI) as UiScale;
    if (val === 'compact' || val === 'normal' || val === 'large') {
      return val;
    }
  } catch {}
  return 'normal';
};

export const applyTypographySettings = (): void => {
  if (typeof document === 'undefined') return;

  const narrativeSize = getNarrativeTextSize();
  const uiScale = getUiScale();

  const narrativeConfig = NARRATIVE_SIZES[narrativeSize];
  const uiConfig = UI_SCALES[uiScale];

  // Variables CSS dinámicas para lectura narrativa fluida
  document.documentElement.style.setProperty('--penumbra-narrative-size', narrativeConfig.rem);
  document.documentElement.style.setProperty('--penumbra-narrative-line-height', narrativeConfig.lineHeight);

  // Escala raíz para toda la interfaz (rem-based)
  document.documentElement.style.fontSize = uiConfig.rootPx;

  // Notificar a todos los componentes suscritos
  listeners.forEach(fn => {
    try {
      fn({ narrativeSize, uiScale });
    } catch (e) {
      console.error("Error en listener de tipografía:", e);
    }
  });
};

export const setNarrativeTextSize = (size: NarrativeTextSize): void => {
  try {
    localStorage.setItem(STORAGE_KEY_NARRATIVE, size);
  } catch {}
  applyTypographySettings();
};

export const setUiScale = (scale: UiScale): void => {
  try {
    localStorage.setItem(STORAGE_KEY_UI, scale);
  } catch {}
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

export const onTypographyChange = (listener: TypographyListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// Inicialización automática inmediata
if (typeof window !== 'undefined') {
  applyTypographySettings();
}
