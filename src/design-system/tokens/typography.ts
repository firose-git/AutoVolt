/**
 * Design System - Typography Tokens
 * Font families, sizes, weights, and line heights
 */

/**
 * Font families
 */
export const fontFamily = {
  sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
} as const;

/**
 * Font sizes (with rem and px)
 */
export const fontSize = {
  xs: { rem: '0.75rem', px: '12px' },      // Extra small
  sm: { rem: '0.875rem', px: '14px' },     // Small
  base: { rem: '1rem', px: '16px' },       // Base
  lg: { rem: '1.125rem', px: '18px' },     // Large
  xl: { rem: '1.25rem', px: '20px' },      // Extra large
  '2xl': { rem: '1.5rem', px: '24px' },    // 2X large
  '3xl': { rem: '1.875rem', px: '30px' },  // 3X large
  '4xl': { rem: '2.25rem', px: '36px' },   // 4X large
  '5xl': { rem: '3rem', px: '48px' },      // 5X large
  '6xl': { rem: '3.75rem', px: '60px' },   // 6X large
  '7xl': { rem: '4.5rem', px: '72px' },    // 7X large
  '8xl': { rem: '6rem', px: '96px' },      // 8X large
  '9xl': { rem: '8rem', px: '128px' },     // 9X large
} as const;

/**
 * Font weights
 */
export const fontWeight = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

/**
 * Line heights
 */
export const lineHeight = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
  
  // Specific to font sizes
  xs: '1rem',      // 16px
  sm: '1.25rem',   // 20px
  base: '1.5rem',  // 24px
  lg: '1.75rem',   // 28px
  xl: '1.75rem',   // 28px
  '2xl': '2rem',   // 32px
  '3xl': '2.25rem', // 36px
  '4xl': '2.5rem', // 40px
} as const;

/**
 * Letter spacing
 */
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

/**
 * Typography presets for common text styles
 */
export const typography = {
  // Display text (hero sections)
  displayLarge: {
    fontSize: fontSize['6xl'].rem,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  displayMedium: {
    fontSize: fontSize['5xl'].rem,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  displaySmall: {
    fontSize: fontSize['4xl'].rem,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.tight,
  },

  // Headings
  h1: {
    fontSize: fontSize['3xl'].rem,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontSize: fontSize['2xl'].rem,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontSize: fontSize.xl.rem,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.normal,
  },
  h4: {
    fontSize: fontSize.lg.rem,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  h5: {
    fontSize: fontSize.base.rem,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  h6: {
    fontSize: fontSize.sm.rem,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.wide,
  },

  // Body text
  bodyLarge: {
    fontSize: fontSize.lg.rem,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.relaxed,
    letterSpacing: letterSpacing.normal,
  },
  body: {
    fontSize: fontSize.base.rem,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  bodySmall: {
    fontSize: fontSize.sm.rem,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },

  // Labels
  label: {
    fontSize: fontSize.sm.rem,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.wide,
  },
  labelSmall: {
    fontSize: fontSize.xs.rem,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.wider,
  },

  // Code
  code: {
    fontSize: fontSize.sm.rem,
    fontFamily: fontFamily.mono,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  codeBlock: {
    fontSize: fontSize.sm.rem,
    fontFamily: fontFamily.mono,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.relaxed,
  },

  // Overline/Captions
  overline: {
    fontSize: fontSize.xs.rem,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.widest,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontSize: fontSize.xs.rem,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },

  // Buttons
  button: {
    fontSize: fontSize.sm.rem,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.none,
    letterSpacing: letterSpacing.wide,
  },
  buttonLarge: {
    fontSize: fontSize.base.rem,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.none,
    letterSpacing: letterSpacing.wide,
  },
  buttonSmall: {
    fontSize: fontSize.xs.rem,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.none,
    letterSpacing: letterSpacing.wider,
  },

  // Links
  link: {
    fontSize: fontSize.base.rem,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
    textDecoration: 'underline' as const,
  },
} as const;

/**
 * Text decoration
 */
export const textDecoration = {
  none: 'none',
  underline: 'underline',
  lineThrough: 'line-through',
} as const;

/**
 * Text transform
 */
export const textTransform = {
  none: 'none',
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  capitalize: 'capitalize',
} as const;

/**
 * Utility function to get font size in px
 */
export function getFontSizePx(size: keyof typeof fontSize): string {
  return fontSize[size].px;
}

/**
 * Utility function to get font size in rem
 */
export function getFontSizeRem(size: keyof typeof fontSize): string {
  return fontSize[size].rem;
}

/**
 * Create custom typography style
 */
export function createTypographyStyle(config: {
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  fontFamily?: string;
  textTransform?: string;
  textDecoration?: string;
}) {
  return {
    fontSize: config.fontSize || fontSize.base.rem,
    fontWeight: config.fontWeight || fontWeight.normal,
    lineHeight: config.lineHeight || lineHeight.normal,
    letterSpacing: config.letterSpacing || letterSpacing.normal,
    fontFamily: config.fontFamily || fontFamily.sans,
    ...(config.textTransform && { textTransform: config.textTransform }),
    ...(config.textDecoration && { textDecoration: config.textDecoration }),
  };
}

/**
 * Export types
 */
export type FontFamily = keyof typeof fontFamily;
export type FontSize = keyof typeof fontSize;
export type FontWeight = keyof typeof fontWeight;
export type LineHeight = keyof typeof lineHeight;
export type LetterSpacing = keyof typeof letterSpacing;
export type TypographyPreset = keyof typeof typography;
