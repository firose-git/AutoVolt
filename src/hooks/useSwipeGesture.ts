import { useCallback, useRef } from 'react';

/**
 * Swipe direction
 */
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Swipe event data
 */
export interface SwipeEventData {
  direction: SwipeDirection;
  velocity: number;
  distance: number;
  deltaX: number;
  deltaY: number;
}

/**
 * Swipe gesture options
 */
export interface SwipeGestureOptions {
  /**
   * Minimum distance in pixels to trigger a swipe
   * @default 50
   */
  threshold?: number;

  /**
   * Minimum velocity in pixels/ms to trigger a swipe
   * @default 0.3
   */
  velocityThreshold?: number;

  /**
   * Maximum time in ms for a swipe gesture
   * @default 300
   */
  timeThreshold?: number;

  /**
   * Prevent default behavior
   * @default true
   */
  preventDefault?: boolean;

  /**
   * Only trigger swipe on specific directions
   */
  allowedDirections?: SwipeDirection[];

  /**
   * Callback when swipe starts
   */
  onSwipeStart?: (event: React.TouchEvent | React.MouseEvent) => void;

  /**
   * Callback when swiping (during the gesture)
   */
  onSwiping?: (deltaX: number, deltaY: number) => void;

  /**
   * Callback when swipe ends (successful swipe)
   */
  onSwipe?: (data: SwipeEventData) => void;

  /**
   * Callback when swipe is cancelled
   */
  onSwipeCancel?: () => void;

  /**
   * Direction-specific callbacks
   */
  onSwipeLeft?: (data: SwipeEventData) => void;
  onSwipeRight?: (data: SwipeEventData) => void;
  onSwipeUp?: (data: SwipeEventData) => void;
  onSwipeDown?: (data: SwipeEventData) => void;
}

/**
 * Touch/mouse coordinates
 */
interface Coordinates {
  x: number;
  y: number;
  time: number;
}

/**
 * Hook for handling swipe gestures on touch and mouse events
 * Supports both touch devices and mouse dragging
 */
export function useSwipeGesture(options: SwipeGestureOptions = {}) {
  const {
    threshold = 50,
    velocityThreshold = 0.3,
    timeThreshold = 300,
    preventDefault = true,
    allowedDirections,
    onSwipeStart,
    onSwiping,
    onSwipe,
    onSwipeCancel,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  } = options;

  const startCoords = useRef<Coordinates | null>(null);
  const currentCoords = useRef<Coordinates | null>(null);
  const isSwiping = useRef(false);

  /**
   * Get coordinates from touch or mouse event
   */
  const getCoordinates = useCallback(
    (event: React.TouchEvent | React.MouseEvent): Coordinates => {
      const isTouch = 'touches' in event;
      const clientX = isTouch ? event.touches[0]?.clientX : event.clientX;
      const clientY = isTouch ? event.touches[0]?.clientY : event.clientY;

      return {
        x: clientX,
        y: clientY,
        time: Date.now(),
      };
    },
    []
  );

  /**
   * Calculate swipe direction and data
   */
  const calculateSwipeData = useCallback(
    (start: Coordinates, end: Coordinates): SwipeEventData | null => {
      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;
      const deltaTime = end.time - start.time;

      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / deltaTime;

      // Check if swipe meets thresholds
      if (distance < threshold || deltaTime > timeThreshold) {
        return null;
      }

      if (velocity < velocityThreshold) {
        return null;
      }

      // Determine direction based on larger delta
      let direction: SwipeDirection;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      // Check if direction is allowed
      if (allowedDirections && !allowedDirections.includes(direction)) {
        return null;
      }

      return {
        direction,
        velocity,
        distance,
        deltaX,
        deltaY,
      };
    },
    [threshold, velocityThreshold, timeThreshold, allowedDirections]
  );

  /**
   * Handle swipe start
   */
  const handleStart = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      startCoords.current = getCoordinates(event);
      currentCoords.current = startCoords.current;
      isSwiping.current = true;

      onSwipeStart?.(event);
    },
    [getCoordinates, onSwipeStart]
  );

  /**
   * Handle swipe move
   */
  const handleMove = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      if (!isSwiping.current || !startCoords.current) {
        return;
      }

      currentCoords.current = getCoordinates(event);

      const deltaX = currentCoords.current.x - startCoords.current.x;
      const deltaY = currentCoords.current.y - startCoords.current.y;

      onSwiping?.(deltaX, deltaY);
    },
    [getCoordinates, onSwiping]
  );

  /**
   * Handle swipe end
   */
  const handleEnd = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      if (!isSwiping.current || !startCoords.current || !currentCoords.current) {
        return;
      }

      const swipeData = calculateSwipeData(startCoords.current, currentCoords.current);

      if (swipeData) {
        // Successful swipe
        onSwipe?.(swipeData);

        // Call direction-specific callback
        switch (swipeData.direction) {
          case 'left':
            onSwipeLeft?.(swipeData);
            break;
          case 'right':
            onSwipeRight?.(swipeData);
            break;
          case 'up':
            onSwipeUp?.(swipeData);
            break;
          case 'down':
            onSwipeDown?.(swipeData);
            break;
        }
      } else {
        // Swipe cancelled (didn't meet thresholds)
        onSwipeCancel?.();
      }

      // Reset state
      startCoords.current = null;
      currentCoords.current = null;
      isSwiping.current = false;
    },
    [
      calculateSwipeData,
      onSwipe,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      onSwipeCancel,
    ]
  );

  /**
   * Get event handlers for touch events
   */
  const touchHandlers = {
    onTouchStart: handleStart,
    onTouchMove: handleMove,
    onTouchEnd: handleEnd,
    onTouchCancel: () => {
      isSwiping.current = false;
      startCoords.current = null;
      currentCoords.current = null;
      onSwipeCancel?.();
    },
  };

  /**
   * Get event handlers for mouse events (for desktop testing)
   */
  const mouseHandlers = {
    onMouseDown: handleStart,
    onMouseMove: handleMove,
    onMouseUp: handleEnd,
    onMouseLeave: () => {
      if (isSwiping.current) {
        isSwiping.current = false;
        startCoords.current = null;
        currentCoords.current = null;
        onSwipeCancel?.();
      }
    },
  };

  /**
   * Combined handlers for both touch and mouse
   */
  const handlers = {
    ...touchHandlers,
    ...mouseHandlers,
  };

  return {
    handlers,
    touchHandlers,
    mouseHandlers,
    isSwiping: isSwiping.current,
  };
}

/**
 * Hook for simple swipe navigation (left/right only)
 */
export function useSwipeNavigation(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  options?: Omit<SwipeGestureOptions, 'onSwipeLeft' | 'onSwipeRight' | 'allowedDirections'>
) {
  return useSwipeGesture({
    ...options,
    allowedDirections: ['left', 'right'],
    onSwipeLeft: onSwipeLeft
      ? (data) => {
          onSwipeLeft();
        }
      : undefined,
    onSwipeRight: onSwipeRight
      ? (data) => {
          onSwipeRight();
        }
      : undefined,
  });
}
