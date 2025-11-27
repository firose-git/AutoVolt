/**
 * Design System - Color Tokens
 * Semantic color definitions for consistent theming
 */

export const colorTokens = {
  /**
   * Primary colors - Brand identity
   */
  primary: {
    50: 'hsl(217, 91%, 95%)',
    100: 'hsl(217, 91%, 90%)',
    200: 'hsl(217, 91%, 80%)',
    300: 'hsl(217, 91%, 70%)',
    400: 'hsl(217, 91%, 60%)', // Default primary
    500: 'hsl(217, 91%, 50%)',
    600: 'hsl(217, 91%, 40%)',
    700: 'hsl(217, 91%, 30%)',
    800: 'hsl(217, 91%, 20%)',
    900: 'hsl(217, 91%, 10%)',
  },

  /**
   * Secondary colors - Supporting elements
   */
  secondary: {
    50: 'hsl(210, 40%, 98%)',
    100: 'hsl(210, 40%, 96%)',
    200: 'hsl(210, 40%, 90%)',
    300: 'hsl(210, 40%, 80%)',
    400: 'hsl(210, 40%, 70%)',
    500: 'hsl(210, 40%, 60%)',
    600: 'hsl(210, 40%, 50%)',
    700: 'hsl(210, 40%, 40%)',
    800: 'hsl(210, 40%, 30%)',
    900: 'hsl(210, 40%, 20%)',
  },

  /**
   * Semantic colors - Status and feedback
   */
  success: {
    50: 'hsl(142, 76%, 95%)',
    100: 'hsl(142, 76%, 90%)',
    200: 'hsl(142, 76%, 80%)',
    300: 'hsl(142, 76%, 70%)',
    400: 'hsl(142, 76%, 60%)',
    500: 'hsl(142, 76%, 50%)',
    600: 'hsl(142, 71%, 45%)', // Default success
    700: 'hsl(142, 71%, 35%)',
    800: 'hsl(142, 71%, 25%)',
    900: 'hsl(142, 71%, 15%)',
  },

  warning: {
    50: 'hsl(38, 92%, 95%)',
    100: 'hsl(38, 92%, 90%)',
    200: 'hsl(38, 92%, 80%)',
    300: 'hsl(38, 92%, 70%)',
    400: 'hsl(38, 92%, 60%)',
    500: 'hsl(38, 92%, 50%)', // Default warning
    600: 'hsl(38, 92%, 40%)',
    700: 'hsl(38, 92%, 30%)',
    800: 'hsl(38, 92%, 20%)',
    900: 'hsl(38, 92%, 10%)',
  },

  danger: {
    50: 'hsl(0, 84%, 95%)',
    100: 'hsl(0, 84%, 90%)',
    200: 'hsl(0, 84%, 80%)',
    300: 'hsl(0, 84%, 70%)',
    400: 'hsl(0, 84%, 65%)',
    500: 'hsl(0, 84%, 60%)', // Default danger
    600: 'hsl(0, 84%, 50%)',
    700: 'hsl(0, 84%, 40%)',
    800: 'hsl(0, 84%, 30%)',
    900: 'hsl(0, 84%, 20%)',
  },

  info: {
    50: 'hsl(199, 89%, 95%)',
    100: 'hsl(199, 89%, 90%)',
    200: 'hsl(199, 89%, 80%)',
    300: 'hsl(199, 89%, 70%)',
    400: 'hsl(199, 89%, 60%)',
    500: 'hsl(199, 89%, 48%)', // Default info
    600: 'hsl(199, 89%, 40%)',
    700: 'hsl(199, 89%, 30%)',
    800: 'hsl(199, 89%, 20%)',
    900: 'hsl(199, 89%, 10%)',
  },

  /**
   * Neutral colors - Text, backgrounds, borders
   */
  neutral: {
    50: 'hsl(210, 20%, 98%)',
    100: 'hsl(210, 20%, 95%)',
    200: 'hsl(210, 20%, 90%)',
    300: 'hsl(210, 20%, 80%)',
    400: 'hsl(210, 20%, 70%)',
    500: 'hsl(210, 20%, 60%)',
    600: 'hsl(210, 20%, 50%)',
    700: 'hsl(210, 20%, 40%)',
    800: 'hsl(210, 20%, 30%)',
    900: 'hsl(210, 20%, 20%)',
    950: 'hsl(210, 20%, 10%)',
  },

  /**
   * Dark theme colors
   */
  dark: {
    50: 'hsl(0, 0%, 95%)',
    100: 'hsl(0, 0%, 90%)',
    200: 'hsl(0, 0%, 80%)',
    300: 'hsl(0, 0%, 70%)',
    400: 'hsl(0, 0%, 60%)',
    500: 'hsl(0, 0%, 50%)',
    600: 'hsl(0, 0%, 40%)',
    700: 'hsl(0, 0%, 30%)',
    800: 'hsl(0, 0%, 20%)',
    900: 'hsl(0, 0%, 10%)',
    950: 'hsl(0, 0%, 7%)', // Dark background
  },
} as const;

/**
 * Color aliases for easy access
 */
export const colors = {
  // Brand
  brand: colorTokens.primary[400],
  brandDark: colorTokens.primary[600],
  brandLight: colorTokens.primary[200],

  // Status
  success: colorTokens.success[600],
  successLight: colorTokens.success[100],
  successDark: colorTokens.success[700],

  warning: colorTokens.warning[500],
  warningLight: colorTokens.warning[100],
  warningDark: colorTokens.warning[700],

  danger: colorTokens.danger[500],
  dangerLight: colorTokens.danger[100],
  dangerDark: colorTokens.danger[700],

  info: colorTokens.info[500],
  infoLight: colorTokens.info[100],
  infoDark: colorTokens.info[700],

  // Neutral
  text: colorTokens.neutral[900],
  textMuted: colorTokens.neutral[600],
  textLight: colorTokens.neutral[400],

  background: colorTokens.neutral[50],
  backgroundMuted: colorTokens.neutral[100],
  backgroundDark: colorTokens.dark[950],

  border: colorTokens.neutral[200],
  borderMuted: colorTokens.neutral[100],
  borderDark: colorTokens.neutral[700],
} as const;

/**
 * Get color with opacity
 */
export function getColorWithOpacity(color: string, opacity: number): string {
  // Extract HSL values
  const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!hslMatch) return color;

  const [, h, s, l] = hslMatch;
  return `hsla(${h}, ${s}%, ${l}%, ${opacity})`;
}

/**
 * Get contrasting text color (black or white) for background
 */
export function getContrastColor(backgroundColor: string): string {
  // Extract lightness from HSL
  const lightnessMatch = backgroundColor.match(/hsl\(\d+,\s*\d+%,\s*(\d+)%\)/);
  if (!lightnessMatch) return colorTokens.neutral[900];

  const lightness = parseInt(lightnessMatch[1]);
  return lightness > 50 ? colorTokens.neutral[900] : colorTokens.neutral[50];
}

/**
 * Export type for color tokens
 */
export type ColorToken = keyof typeof colorTokens;
export type ColorShade = keyof typeof colorTokens.primary;
export type ColorAlias = keyof typeof colors;
