/**
 * Accessibility Utilities
 * Helper functions for improving accessibility
 */

/**
 * Announce message to screen readers
 * Uses aria-live region to announce dynamic content
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check if element is visible to screen readers
 */
export function isVisibleToScreenReader(element: HTMLElement): boolean {
  // Check for aria-hidden
  if (element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  // Check for visibility
  const style = window.getComputedStyle(element);
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0'
  ) {
    return false;
  }

  return true;
}

/**
 * Get accessible name for element
 * Computes the accessible name following ARIA specification
 */
export function getAccessibleName(element: HTMLElement): string {
  // Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // Check aria-labelledby
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelElement = document.getElementById(ariaLabelledBy);
    if (labelElement) return labelElement.textContent || '';
  }

  // Check associated label
  if (element instanceof HTMLInputElement) {
    const labels = element.labels;
    if (labels && labels.length > 0) {
      return labels[0].textContent || '';
    }
  }

  // Check title attribute
  const title = element.getAttribute('title');
  if (title) return title;

  // Check alt attribute (for images)
  const alt = element.getAttribute('alt');
  if (alt) return alt;

  // Fallback to text content
  return element.textContent || '';
}

/**
 * Validate ARIA attributes
 * Checks if ARIA attributes are used correctly
 */
export function validateAriaAttributes(element: HTMLElement): string[] {
  const errors: string[] = [];

  // Check required ARIA attributes
  const role = element.getAttribute('role');
  if (role) {
    // Check for required attributes based on role
    const requiredAttrs = getRequiredAriaAttributes(role);
    requiredAttrs.forEach((attr) => {
      if (!element.hasAttribute(attr)) {
        errors.push(`Missing required attribute "${attr}" for role "${role}"`);
      }
    });
  }

  // Check for invalid ARIA attribute values
  const ariaExpanded = element.getAttribute('aria-expanded');
  if (ariaExpanded && !['true', 'false'].includes(ariaExpanded)) {
    errors.push('aria-expanded must be "true" or "false"');
  }

  const ariaPressed = element.getAttribute('aria-pressed');
  if (ariaPressed && !['true', 'false', 'mixed'].includes(ariaPressed)) {
    errors.push('aria-pressed must be "true", "false", or "mixed"');
  }

  return errors;
}

/**
 * Get required ARIA attributes for a role
 */
function getRequiredAriaAttributes(role: string): string[] {
  const requirements: Record<string, string[]> = {
    checkbox: ['aria-checked'],
    radio: ['aria-checked'],
    slider: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
    spinbutton: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
    progressbar: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
    combobox: ['aria-expanded', 'aria-controls'],
    tab: ['aria-selected'],
    switch: ['aria-checked'],
  };

  return requirements[role] || [];
}

/**
 * Create a focus trap within a container
 */
export function createFocusTrap(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement?.focus();
        event.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        firstElement?.focus();
        event.preventDefault();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus first element
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Check color contrast ratio
 * Returns contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color
 */
function getRelativeLuminance(color: string): number {
  // Convert hex to RGB
  const rgb = hexToRgb(color);
  if (!rgb) return 0;

  // Convert to relative luminance
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    const normalized = val / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Check if contrast meets WCAG standards
 */
export function meetsWCAGContrast(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);

  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }

  // AA level
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Add accessible label to element
 */
export function addAccessibleLabel(
  element: HTMLElement,
  label: string,
  method: 'aria-label' | 'aria-labelledby' | 'title' = 'aria-label'
): void {
  switch (method) {
    case 'aria-label':
      element.setAttribute('aria-label', label);
      break;
    case 'aria-labelledby':
      const id = `label-${Math.random().toString(36).substring(7)}`;
      const labelElement = document.createElement('span');
      labelElement.id = id;
      labelElement.textContent = label;
      labelElement.className = 'sr-only';
      element.parentElement?.insertBefore(labelElement, element);
      element.setAttribute('aria-labelledby', id);
      break;
    case 'title':
      element.setAttribute('title', label);
      break;
  }
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  return (
    window.matchMedia('(prefers-contrast: high)').matches ||
    window.matchMedia('(prefers-contrast: more)').matches
  );
}

/**
 * Get keyboard shortcuts help text
 */
export function getKeyboardShortcuts(): Record<string, string> {
  return {
    'Tab': 'Move to next focusable element',
    'Shift + Tab': 'Move to previous focusable element',
    'Enter': 'Activate button or link',
    'Space': 'Activate button or toggle checkbox',
    'Escape': 'Close dialog or cancel action',
    'Arrow Keys': 'Navigate within components',
    'Home': 'Jump to first item',
    'End': 'Jump to last item',
    '/ or Ctrl+K': 'Open search',
    'Ctrl + S': 'Save',
    'Ctrl + Z': 'Undo',
    'Ctrl + Shift + Z': 'Redo',
  };
}
