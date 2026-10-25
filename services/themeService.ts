/**
 * themeService.ts - Sistema Integral de Temas, Modos Claro/Oscuro y Accesibilidad Visual
 * Crónicas de la Penumbra - Edición Definitiva
 */

export type ThemeId = 'penumbra' | 'crimson' | 'emerald' | 'parchment' | 'high-contrast';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  badge: string;
  category: 'dark' | 'light' | 'accessibility';
  description: string;
  previewColors: {
    bg: string;
    card: string;
    accent: string;
    text: string;
  };
  cssVars: Record<string, string>;
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  penumbra: {
    id: 'penumbra',
    name: 'Penumbra Clásica',
    badge: 'Por Defecto',
    category: 'dark',
    description: 'La atmósfera original: carbón abisal, destellos de oro viejo y pergamino ceniciento.',
    previewColors: {
      bg: '#050505',
      card: '#121212',
      accent: '#c5a059',
      text: '#e5e5e5'
    },
    cssVars: {
      '--color-void': '#050505',
      '--color-panel': '#121212',
      '--color-panel-border': '#2a241b',
      '--color-bone': '#f2ece1',
      '--color-parchment': '#ded0ba',
      '--color-parchment-dim': '#a39886',
      '--color-gold': '#c5a059',
      '--color-gold-dim': '#6b5832',
      '--color-blood': '#8a1c1c',
      '--color-blood-bright': '#ff5555',
      '--color-sanity': '#4b5c85',
      '--panel-surface': 'rgba(18, 18, 18, 0.95)',
      '--input-bg': 'rgba(0, 0, 0, 0.65)',
      '--card-bg': 'rgba(16, 15, 13, 0.85)',
      '--shadow-ambient': 'rgba(0, 0, 0, 0.8)'
    }
  },
  crimson: {
    id: 'crimson',
    name: 'Sangre y Cripta',
    badge: 'Horror',
    category: 'dark',
    description: 'Sombras color granate, óxido arterial, reflejos escarlata y marfil cadavérico.',
    previewColors: {
      bg: '#080304',
      card: '#160809',
      accent: '#e04141',
      text: '#f7e8e8'
    },
    cssVars: {
      '--color-void': '#080304',
      '--color-panel': '#160809',
      '--color-panel-border': '#3b1719',
      '--color-bone': '#fbeeee',
      '--color-parchment': '#e4cece',
      '--color-parchment-dim': '#b89494',
      '--color-gold': '#e04141',
      '--color-gold-dim': '#7a2222',
      '--color-blood': '#a61717',
      '--color-blood-bright': '#ff6363',
      '--color-sanity': '#5f436e',
      '--panel-surface': 'rgba(22, 8, 9, 0.95)',
      '--input-bg': 'rgba(10, 2, 3, 0.75)',
      '--card-bg': 'rgba(24, 10, 11, 0.85)',
      '--shadow-ambient': 'rgba(15, 0, 2, 0.9)'
    }
  },
  emerald: {
    id: 'emerald',
    name: 'Abismo Esmeralda',
    badge: 'Místico',
    category: 'dark',
    description: 'Verdín de catacumbas, fuego fatuo y luminiscencia espectral sobre piedra húmeda.',
    previewColors: {
      bg: '#030807',
      card: '#081613',
      accent: '#34b88d',
      text: '#e5f5ef'
    },
    cssVars: {
      '--color-void': '#030807',
      '--color-panel': '#081613',
      '--color-panel-border': '#153b31',
      '--color-bone': '#edf8f3',
      '--color-parchment': '#cbe4da',
      '--color-parchment-dim': '#87ada1',
      '--color-gold': '#34b88d',
      '--color-gold-dim': '#1c5e48',
      '--color-blood': '#852121',
      '--color-blood-bright': '#ff5a5a',
      '--color-sanity': '#285566',
      '--panel-surface': 'rgba(8, 22, 19, 0.95)',
      '--input-bg': 'rgba(2, 8, 7, 0.75)',
      '--card-bg': 'rgba(9, 25, 21, 0.85)',
      '--shadow-ambient': 'rgba(0, 10, 8, 0.9)'
    }
  },
  parchment: {
    id: 'parchment',
    name: 'Pergamino Iluminado',
    badge: 'Modo Claro',
    category: 'light',
    description: 'Manuscrito monacal a la luz del día: pergamino envejecido y tinta ferrogálica sepia profunda.',
    previewColors: {
      bg: '#ece2d0',
      card: '#dfd2ba',
      accent: '#8f5c18',
      text: '#1e160e'
    },
    cssVars: {
      '--color-void': '#ece2d0',
      '--color-panel': '#dfd2ba',
      '--color-panel-border': '#b09d7b',
      '--color-bone': '#1c150d',
      '--color-parchment': '#2d2215',
      '--color-parchment-dim': '#524332',
      '--color-gold': '#8f5c18',
      '--color-gold-dim': '#ad803c',
      '--color-blood': '#852121',
      '--color-blood-bright': '#9e1c1c',
      '--color-sanity': '#2b3f66',
      '--panel-surface': 'rgba(223, 210, 186, 0.96)',
      '--input-bg': 'rgba(245, 238, 227, 0.85)',
      '--card-bg': 'rgba(230, 220, 201, 0.9)',
      '--shadow-ambient': 'rgba(60, 45, 30, 0.25)'
    }
  },
  'high-contrast': {
    id: 'high-contrast',
    name: 'Alto Contraste',
    badge: 'Accesibilidad',
    category: 'accessibility',
    description: 'Obsidiana pura sin matices, texto blanco nítido y orla áurea para máxima legibilidad visual.',
    previewColors: {
      bg: '#000000',
      card: '#0a0a0a',
      accent: '#ffd700',
      text: '#ffffff'
    },
    cssVars: {
      '--color-void': '#000000',
      '--color-panel': '#0d0d0d',
      '--color-panel-border': '#555555',
      '--color-bone': '#ffffff',
      '--color-parchment': '#f4f4f4',
      '--color-parchment-dim': '#d0d0d0',
      '--color-gold': '#ffd700',
      '--color-gold-dim': '#b39700',
      '--color-blood': '#d11111',
      '--color-blood-bright': '#ff4040',
      '--color-sanity': '#6688dd',
      '--panel-surface': '#0d0d0d',
      '--input-bg': '#000000',
      '--card-bg': '#0f0f0f',
      '--shadow-ambient': 'rgba(0, 0, 0, 1)'
    }
  }
};

const THEME_STORAGE_KEY = 'penumbra_active_theme';

type ThemeListener = (theme: ThemeId) => void;
const themeListeners = new Set<ThemeListener>();

export const getStoredTheme = (): ThemeId => {
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId;
    if (val && THEMES[val]) {
      return val;
    }
  } catch {}
  return 'penumbra';
};

export const applyTheme = (themeId: ThemeId) => {
  const def = THEMES[themeId] || THEMES.penumbra;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, def.id);
  } catch {}

  const root = document.documentElement;
  const body = document.body;

  // Set data-theme attribute
  root.setAttribute('data-theme', def.id);
  body.setAttribute('data-theme', def.id);

  // Remove existing theme-* classes and add new one
  Object.keys(THEMES).forEach(id => {
    root.classList.remove(`theme-${id}`);
    body.classList.remove(`theme-${id}`);
  });
  root.classList.add(`theme-${def.id}`);
  body.classList.add(`theme-${def.id}`);

  // Apply CSS custom properties directly to :root
  Object.entries(def.cssVars).forEach(([prop, val]) => {
    root.style.setProperty(prop, val);
  });

  // Notify active listeners
  themeListeners.forEach(listener => listener(def.id));
};

export const onThemeChange = (callback: ThemeListener): (() => void) => {
  themeListeners.add(callback);
  return () => {
    themeListeners.delete(callback);
  };
};

// Initialize theme immediately on import
if (typeof window !== 'undefined') {
  applyTheme(getStoredTheme());
}
