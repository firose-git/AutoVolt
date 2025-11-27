/**
 * Design System - Main Export
 * Central export for all design tokens and utilities
 */

export * from './tokens/colors';
export * from './tokens/spacing';
export * from './tokens/typography';

// Re-export commonly used tokens
import { colors, colorTokens } from './tokens/colors';
import { spacing, spacingTokens, borderRadius, shadows, zIndex } from './tokens/spacing';
import { typography, fontSize, fontWeight, lineHeight } from './tokens/typography';

export const designSystem = {
  colors,
  colorTokens,
  spacing,
  spacingTokens,
  borderRadius,
  shadows,
  zIndex,
  typography,
  fontSize,
  fontWeight,
  lineHeight,
} as const;

export default designSystem;
