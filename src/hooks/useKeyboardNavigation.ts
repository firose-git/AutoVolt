import { useEffect, useCallback, useRef } from 'react';

/**
 * Keyboard navigation hook
 * Provides utilities for implementing accessible keyboard navigation
 */

export interface KeyboardNavigationOptions {
  /**
   * Enable arrow key navigation (up, down, left, right)
   */
  enableArrowKeys?: boolean;
  
  /**
   * Enable home/end keys to jump to first/last item
   */
  enableHomeEnd?: boolean;
  
  /**
   * Enable type-ahead search (search by typing characters)
   */
  enableTypeAhead?: boolean;
  
  /**
   * Callback when an item is selected
   */
  onSelect?: (index: number) => void;
  
  /**
   * Callback when navigation changes
   */
  onChange?: (index: number) => void;
  
  /**
   * Loop navigation (wrap around at start/end)
   */
  loop?: boolean;
  
  /**
   * Orientation of navigation (horizontal or vertical)
   */
  orientation?: 'horizontal' | 'vertical' | 'both';
}

export function useKeyboardNavigation(
  itemCount: number,
  options: KeyboardNavigationOptions = {}
) {
  const {
    enableArrowKeys = true,
    enableHomeEnd = true,
    enableTypeAhead = false,
    onSelect,
    onChange,
    loop = true,
    orientation = 'vertical',
  } = options;

  const activeIndexRef = useRef(0);
  const typeAheadBufferRef = useRef('');
  const typeAheadTimeoutRef = useRef<NodeJS.Timeout>();

  const setActiveIndex = useCallback(
    (index: number) => {
      let newIndex = index;

      // Handle looping
      if (loop) {
        if (newIndex < 0) newIndex = itemCount - 1;
        if (newIndex >= itemCount) newIndex = 0;
      } else {
        newIndex = Math.max(0, Math.min(itemCount - 1, newIndex));
      }

      activeIndexRef.current = newIndex;
      onChange?.(newIndex);
    },
    [itemCount, loop, onChange]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key } = event;

      // Arrow key navigation
      if (enableArrowKeys) {
        let shouldPreventDefault = false;

        if (orientation === 'vertical' || orientation === 'both') {
          if (key === 'ArrowDown') {
            setActiveIndex(activeIndexRef.current + 1);
            shouldPreventDefault = true;
          } else if (key === 'ArrowUp') {
            setActiveIndex(activeIndexRef.current - 1);
            shouldPreventDefault = true;
          }
        }

        if (orientation === 'horizontal' || orientation === 'both') {
          if (key === 'ArrowRight') {
            setActiveIndex(activeIndexRef.current + 1);
            shouldPreventDefault = true;
          } else if (key === 'ArrowLeft') {
            setActiveIndex(activeIndexRef.current - 1);
            shouldPreventDefault = true;
          }
        }

        if (shouldPreventDefault) {
          event.preventDefault();
        }
      }

      // Home/End keys
      if (enableHomeEnd) {
        if (key === 'Home') {
          setActiveIndex(0);
          event.preventDefault();
        } else if (key === 'End') {
          setActiveIndex(itemCount - 1);
          event.preventDefault();
        }
      }

      // Enter/Space to select
      if (key === 'Enter' || key === ' ') {
        onSelect?.(activeIndexRef.current);
        event.preventDefault();
      }

      // Type-ahead search
      if (enableTypeAhead && key.length === 1) {
        clearTimeout(typeAheadTimeoutRef.current);
        typeAheadBufferRef.current += key.toLowerCase();

        // Clear buffer after 500ms of inactivity
        typeAheadTimeoutRef.current = setTimeout(() => {
          typeAheadBufferRef.current = '';
        }, 500);
      }
    },
    [
      enableArrowKeys,
      enableHomeEnd,
      enableTypeAhead,
      itemCount,
      onSelect,
      orientation,
      setActiveIndex,
    ]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(typeAheadTimeoutRef.current);
    };
  }, [handleKeyDown]);

  return {
    activeIndex: activeIndexRef.current,
    setActiveIndex,
    typeAheadBuffer: typeAheadBufferRef.current,
  };
}

/**
 * Focus trap hook for modals and dialogs
 * Traps focus within a container element
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on mount
    firstElement?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      // Shift + Tab (backward)
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          event.preventDefault();
        }
      }
      // Tab (forward)
      else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          event.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Skip to content hook
 * Provides a skip link for keyboard navigation
 */
export function useSkipToContent() {
  const skipToContent = useCallback((targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return { skipToContent };
}

/**
 * Roving tabindex hook
 * Implements roving tabindex pattern for composite widgets
 */
export function useRovingTabIndex(itemCount: number) {
  const activeIndexRef = useRef(0);

  const getTabIndex = useCallback(
    (index: number) => {
      return index === activeIndexRef.current ? 0 : -1;
    },
    []
  );

  const setActiveIndex = useCallback((index: number) => {
    activeIndexRef.current = index;
  }, []);

  return {
    getTabIndex,
    setActiveIndex,
    activeIndex: activeIndexRef.current,
  };
}
