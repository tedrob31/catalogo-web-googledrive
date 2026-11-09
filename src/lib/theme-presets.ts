/**
 * Paleta de Temas Predefinidos (Presets) para Catálogos Digitales
 * Diseñados según las tendencias modernas de e-commerce, boutiques y moda.
 */

export interface ThemePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  primaryColor: string;      // Acentos, botones, destacados
  secondaryColor: string;    // Fondo principal de la página / superficies
  textColor: string;         // Tipografía y encabezados
  cardBorderColor: string;   // Borde de tarjetas y separadores
  cardBorderWidth: number;   // Grosor del borde en px (1 por defecto)
  isDark: boolean;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'obsidian-neon',
    name: 'Obsidian Neón',
    category: 'Streetwear & Calzado',
    description: 'Fondo negro profundo con acentos verde esmeralda neón de alto impacto.',
    primaryColor: '#10b981',
    secondaryColor: '#090d16',
    textColor: '#f8fafc',
    cardBorderColor: '#1e293b',
    cardBorderWidth: 1,
    isDark: true,
  },
  {
    id: 'chic-pink',
    name: 'Chic Rosado Pastel',
    category: 'Moda Femenina & Boutique',
    description: 'Rosa nude suave con acentos carmesí y tipografía carbón de alto contraste.',
    primaryColor: '#e11d48',
    secondaryColor: '#fff1f2',
    textColor: '#4c0519',
    cardBorderColor: '#fecdd3',
    cardBorderWidth: 1,
    isDark: false,
  },
  {
    id: 'clean-minimal',
    name: 'Claro Minimalista',
    category: 'Storefront Clean',
    description: 'Blanco puro con detalles en gris pizarra y tipografía oscura editorial.',
    primaryColor: '#0f172a',
    secondaryColor: '#ffffff',
    textColor: '#0f172a',
    cardBorderColor: '#e2e8f0',
    cardBorderWidth: 1,
    isDark: false,
  },
  {
    id: 'luxury-gold',
    name: 'Grafito & Oro Lujo',
    category: 'Joyería & Relojes',
    description: 'Superficies grafito mate con acentos dorados cálidos y aspecto premium.',
    primaryColor: '#f59e0b',
    secondaryColor: '#121215',
    textColor: '#f4f4f5',
    cardBorderColor: '#27272a',
    cardBorderWidth: 1,
    isDark: true,
  },
  {
    id: 'lavender-soft',
    name: 'Lavanda & Lila Pastel',
    category: 'Belleza & Cosmética',
    description: 'Lavanda pálido etéreo con acentos violetas y tipografía uva profunda.',
    primaryColor: '#7c3aed',
    secondaryColor: '#f5f3ff',
    textColor: '#2e1065',
    cardBorderColor: '#ddd6fe',
    cardBorderWidth: 1,
    isDark: false,
  },
  {
    id: 'mint-fresh',
    name: 'Menta Fresco',
    category: 'Verano & Infantil',
    description: 'Verde menta pastel fresco con detalles esmeralda y lectura natural.',
    primaryColor: '#059669',
    secondaryColor: '#f0fdf4',
    textColor: '#064e3b',
    cardBorderColor: '#bbf7d0',
    cardBorderWidth: 1,
    isDark: false,
  },
  {
    id: 'warm-sand',
    name: 'Arena & Beige Cálido',
    category: 'Boho & Calzado Cuero',
    description: 'Lino beige artesanal con tonos canela y moca oscuro.',
    primaryColor: '#b45309',
    secondaryColor: '#faf5ef',
    textColor: '#451a03',
    cardBorderColor: '#e7d8c9',
    cardBorderWidth: 1,
    isDark: false,
  },
  {
    id: 'cyber-cyan',
    name: 'Cyberpunk Cian',
    category: 'Deportes & Urbano',
    description: 'Fondo abisal con brillo cian eléctrico para productos llamativos.',
    primaryColor: '#06b6d4',
    secondaryColor: '#050811',
    textColor: '#ecfeff',
    cardBorderColor: '#155e75',
    cardBorderWidth: 1,
    isDark: true,
  },
];

/**
 * Convierte un color HEX (#RRGGBB) a formato RGBA con transparencia
 */
export function hexToRgba(hex: string, alpha: number = 0.85): string {
  if (!hex || typeof hex !== 'string') return `rgba(255, 255, 255, ${alpha})`;
  const cleanHex = hex.replace('#', '').trim();
  
  let r = 255;
  let g = 255;
  let b = 255;

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return `rgba(255, 255, 255, ${alpha})`;
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Determina matemáticamente si un color de fondo es oscuro usando la fórmula ITU-R BT.709
 */
export function isColorDark(hexColor?: string): boolean {
  if (!hexColor || hexColor === '#ffffff' || hexColor.toLowerCase() === '#fff') return false;
  const cleanHex = hexColor.replace('#', '').trim();

  let r = 255;
  let g = 255;
  let b = 255;

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  } else {
    return false;
  }

  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.5;
}

/**
 * Identifica si la configuración actual coincide con alguno de los presets predefinidos
 */
export function findMatchingPresetId(colors: {
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  cardBorderColor?: string;
}): string | null {
  const normalize = (c?: string) => c?.toLowerCase().trim() || '';

  const match = THEME_PRESETS.find((preset) => {
    return (
      normalize(preset.primaryColor) === normalize(colors.primaryColor) &&
      normalize(preset.secondaryColor) === normalize(colors.secondaryColor)
    );
  });

  return match ? match.id : null;
}

