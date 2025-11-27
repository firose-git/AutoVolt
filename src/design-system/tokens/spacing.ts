/**
 * Design System - Spacing Tokens
 * Consistent spacing scale for layout and components
 */

/**
 * Base spacing unit (4px)
 * All spacing values are multiples of this base
 */
export const BASE_SPACING = 4;

/**
 * Spacing scale (in pixels)
 * Based on 4px base unit
 */
export const spacingTokens = {
  0: '0px',
  1: '4px',    // 0.25rem
  2: '8px',    // 0.5rem
  3: '12px',   // 0.75rem
  4: '16px',   // 1rem
  5: '20px',   // 1.25rem
  6: '24px',   // 1.5rem
  7: '28px',   // 1.75rem
  8: '32px',   // 2rem
  9: '36px',   // 2.25rem
  10: '40px',  // 2.5rem
  11: '44px',  // 2.75rem
  12: '48px',  // 3rem
  14: '56px',  // 3.5rem
  16: '64px',  // 4rem
  20: '80px',  // 5rem
  24: '96px',  // 6rem
  28: '112px', // 7rem
  32: '128px', // 8rem
  36: '144px', // 9rem
  40: '160px', // 10rem
  44: '176px', // 11rem
  48: '192px', // 12rem
  52: '208px', // 13rem
  56: '224px', // 14rem
  60: '240px', // 15rem
  64: '256px', // 16rem
  72: '288px', // 18rem
  80: '320px', // 20rem
  96: '384px', // 24rem
} as const;

/**
 * Semantic spacing aliases
 */
export const spacing = {
  // Extra small
  xs: spacingTokens[1],    // 4px
  sm: spacingTokens[2],    // 8px
  md: spacingTokens[4],    // 16px
  lg: spacingTokens[6],    // 24px
  xl: spacingTokens[8],    // 32px
  '2xl': spacingTokens[12], // 48px
  '3xl': spacingTokens[16], // 64px
  '4xl': spacingTokens[24], // 96px
  '5xl': spacingTokens[32], // 128px

  // Component-specific
  buttonPaddingX: spacingTokens[4],  // 16px
  buttonPaddingY: spacingTokens[2],  // 8px
  cardPadding: spacingTokens[6],     // 24px
  sectionPadding: spacingTokens[8],  // 32px
  pagePadding: spacingTokens[6],     // 24px

  // Layout
  gapXs: spacingTokens[2],   // 8px
  gapSm: spacingTokens[3],   // 12px
  gapMd: spacingTokens[4],   // 16px
  gapLg: spacingTokens[6],   // 24px
  gapXl: spacingTokens[8],   // 32px

  // Touch targets (mobile)
  touchTargetMin: spacingTokens[11], // 44px (iOS minimum)
  touchTargetComfortable: spacingTokens[12], // 48px (Material Design)
  touchTargetLarge: spacingTokens[14], // 56px

  // Container widths
  containerSm: '640px',
  containerMd: '768px',
  containerLg: '1024px',
  containerXl: '1280px',
  container2xl: '1536px',
} as const;

/**
 * Border radius scale
 */
export const borderRadius = {
  none: '0px',
  sm: '2px',
  base: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
} as const;

/**
 * Border width scale
 */
export const borderWidth = {
  0: '0px',
  1: '1px',
  2: '2px',
  4: '4px',
  8: '8px',
} as const;

/**
 * Shadow scale
 */
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const;

/**
 * Z-index scale
 */
export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
  max: 9999,
} as const;

/**
 * Transition durations (ms)
 */
export const duration = {
  instant: '0ms',
  fast: '150ms',
  base: '300ms',
  slow: '500ms',
  slower: '700ms',
  slowest: '1000ms',
} as const;

/**
 * Transition timing functions
 */
export const easing = {
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
} as const;

/**
 * Calculate spacing value
 */
export function getSpacing(multiplier: number): string {
  return `${BASE_SPACING * multiplier}px`;
}

/**
 * Get spacing with rem units
 */
export function getSpacingRem(multiplier: number): string {
  return `${(BASE_SPACING * multiplier) / 16}rem`;
}

/**
 * Create custom spacing
 */
export function createSpacing(value: number, unit: 'px' | 'rem' = 'px'): string {
  return unit === 'rem' ? `${value / 16}rem` : `${value}px`;
}

/**
 * Export types
 */
export type SpacingToken = keyof typeof spacingTokens;
export type SpacingAlias = keyof typeof spacing;
export type BorderRadius = keyof typeof borderRadius;
export type Shadow = keyof typeof shadows;
export type ZIndex = keyof typeof zIndex;
export type Duration = keyof typeof duration;
export type Easing = keyof typeof easing;
