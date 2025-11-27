import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Pull-to-refresh options
 */
export interface PullToRefreshOptions {
  /**
   * Distance in pixels to pull before triggering refresh
   * @default 80
   */
  pullThreshold?: number;

  /**
   * Maximum pull distance in pixels
   * @default 150
   */
  maxPullDistance?: number;

  /**
   * Resistance factor (higher = more resistance)
   * @default 2.5
   */
  resistance?: number;

  /**
   * Enable haptic feedback (mobile only)
   * @default true
   */
  enableHapticFeedback?: boolean;

  /**
   * Callback when refresh is triggered
   */
  onRefresh: () => Promise<void> | void;

  /**
   * Callback when pull state changes
   */
  onPullStateChange?: (state: PullState) => void;

  /**
   * Enable pull-to-refresh
   * @default true
   */
  enabled?: boolean;
}

/**
 * Pull state
 */
export type PullState = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'complete';

/**
 * Hook for implementing pull-to-refresh functionality
 * Works on both mobile (touch) and desktop (mouse)
 */
export function usePullToRefresh(options: PullToRefreshOptions) {
  const {
    pullThreshold = 80,
    maxPullDistance = 150,
    resistance = 2.5,
    enableHapticFeedback = true,
    onRefresh,
    onPullStateChange,
    enabled = true,
  } = options;

  const [pullState, setPullState] = useState<PullState>('idle');
  const [pullDistance, setPullDistance] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isPulling = useRef(false);
  const wasReadyRef = useRef(false);

  /**
   * Check if element is at top
   */
  const isAtTop = useCallback(() => {
    if (!containerRef.current) return false;
    return containerRef.current.scrollTop === 0;
  }, []);

  /**
   * Trigger haptic feedback (mobile only)
   */
  const triggerHaptic = useCallback(() => {
    if (!enableHapticFeedback) return;

    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [enableHapticFeedback]);

  /**
   * Update pull state
   */
  const updatePullState = useCallback(
    (newState: PullState) => {
      setPullState(newState);
      onPullStateChange?.(newState);

      // Trigger haptic when transitioning to ready
      if (newState === 'ready' && !wasReadyRef.current) {
        triggerHaptic();
        wasReadyRef.current = true;
      }
    },
    [onPullStateChange, triggerHaptic]
  );

  /**
   * Calculate pull distance with resistance
   */
  const calculatePullDistance = useCallback(
    (deltaY: number): number => {
      // Apply resistance curve
      const distance = deltaY / resistance;

      // Clamp to max distance
      return Math.min(distance, maxPullDistance);
    },
    [resistance, maxPullDistance]
  );

  /**
   * Handle touch/mouse start
   */
  const handleStart = useCallback(
    (clientY: number) => {
      if (!enabled || !isAtTop()) return;

      startY.current = clientY;
      currentY.current = clientY;
      isPulling.current = true;
      wasReadyRef.current = false;
    },
    [enabled, isAtTop]
  );

  /**
   * Handle touch/mouse move
   */
  const handleMove = useCallback(
    (clientY: number) => {
      if (!isPulling.current || !enabled) return;

      currentY.current = clientY;
      const deltaY = currentY.current - startY.current;

      // Only pull down
      if (deltaY < 0) {
        isPulling.current = false;
        setPullDistance(0);
        updatePullState('idle');
        return;
      }

      const distance = calculatePullDistance(deltaY);
      setPullDistance(distance);

      if (distance >= pullThreshold) {
        updatePullState('ready');
      } else if (distance > 0) {
        updatePullState('pulling');
      }
    },
    [enabled, calculatePullDistance, pullThreshold, updatePullState]
  );

  /**
   * Handle touch/mouse end
   */
  const handleEnd = useCallback(async () => {
    if (!isPulling.current) return;

    isPulling.current = false;

    if (pullState === 'ready') {
      // Trigger refresh
      updatePullState('refreshing');

      try {
        await onRefresh();
        updatePullState('complete');

        // Reset after short delay
        setTimeout(() => {
          setPullDistance(0);
          updatePullState('idle');
          wasReadyRef.current = false;
        }, 500);
      } catch (error) {
        console.error('Refresh failed:', error);
        setPullDistance(0);
        updatePullState('idle');
        wasReadyRef.current = false;
      }
    } else {
      // Cancel pull
      setPullDistance(0);
      updatePullState('idle');
      wasReadyRef.current = false;
    }
  }, [pullState, onRefresh, updatePullState]);

  /**
   * Touch event handlers
   */
  const touchHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      handleStart(e.touches[0].clientY);
    },
    onTouchMove: (e: React.TouchEvent) => {
      handleMove(e.touches[0].clientY);
    },
    onTouchEnd: () => {
      handleEnd();
    },
    onTouchCancel: () => {
      isPulling.current = false;
      setPullDistance(0);
      updatePullState('idle');
      wasReadyRef.current = false;
    },
  };

  /**
   * Mouse event handlers (for desktop testing)
   */
  const mouseHandlers = {
    onMouseDown: (e: React.MouseEvent) => {
      handleStart(e.clientY);
    },
    onMouseMove: (e: React.MouseEvent) => {
      if (isPulling.current) {
        handleMove(e.clientY);
      }
    },
    onMouseUp: () => {
      handleEnd();
    },
    onMouseLeave: () => {
      if (isPulling.current) {
        isPulling.current = false;
        setPullDistance(0);
        updatePullState('idle');
        wasReadyRef.current = false;
      }
    },
  };

  /**
   * Combined handlers
   */
  const handlers = {
    ...touchHandlers,
    ...mouseHandlers,
  };

  /**
   * Calculate progress percentage
   */
  const progress = Math.min((pullDistance / pullThreshold) * 100, 100);

  /**
   * Check if refreshing
   */
  const isRefreshing = pullState === 'refreshing';

  /**
   * Check if pull is ready
   */
  const isReady = pullState === 'ready';

  return {
    containerRef,
    handlers,
    touchHandlers,
    mouseHandlers,
    pullState,
    pullDistance,
    progress,
    isRefreshing,
    isReady,
    isPulling: isPulling.current,
  };
}
