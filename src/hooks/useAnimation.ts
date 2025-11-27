import { useEffect, useRef, useState } from 'react';
import { useAnimation as useFramerAnimation } from 'framer-motion';

/**
 * Animation hook options
 */
export interface UseAnimationOptions {
  /**
   * Auto-play animation on mount
   * @default false
   */
  autoPlay?: boolean;

  /**
   * Loop animation
   * @default false
   */
  loop?: boolean;

  /**
   * Delay before animation starts (ms)
   * @default 0
   */
  delay?: number;

  /**
   * Animation duration (seconds)
   * @default 0.3
   */
  duration?: number;

  /**
   * Callback when animation completes
   */
  onComplete?: () => void;
}

/**
 * Enhanced animation hook with controls and utilities
 */
export function useAnimation(options: UseAnimationOptions = {}) {
  const { autoPlay = false, loop = false, delay = 0, duration = 0.3, onComplete } = options;

  const controls = useFramerAnimation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  /**
   * Play animation
   */
  const play = async (animationVariant: string = 'animate') => {
    setIsAnimating(true);

    try {
      await controls.start(animationVariant);
      setHasPlayed(true);
      onComplete?.();
    } catch (error) {
      console.error('Animation error:', error);
    } finally {
      setIsAnimating(false);

      if (loop) {
        setTimeout(() => play(animationVariant), 0);
      }
    }
  };

  /**
   * Stop animation
   */
  const stop = () => {
    controls.stop();
    setIsAnimating(false);
  };

  /**
   * Reset animation
   */
  const reset = async () => {
    await controls.start('initial');
    setHasPlayed(false);
  };

  /**
   * Auto-play on mount
   */
  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(() => {
        play();
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [autoPlay, delay]);

  return {
    controls,
    play,
    stop,
    reset,
    isAnimating,
    hasPlayed,
  };
}

/**
 * Hook for scroll-triggered animations
 */
export function useScrollAnimation(threshold = 0.1) {
  const ref = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (!hasAnimated) {
            setHasAnimated(true);
          }
        } else {
          setIsInView(false);
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, hasAnimated]);

  return {
    ref,
    isInView,
    hasAnimated,
  };
}

/**
 * Hook for hover animations
 */
export function useHoverAnimation() {
  const [isHovered, setIsHovered] = useState(false);

  const hoverProps = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };

  return {
    isHovered,
    hoverProps,
  };
}

/**
 * Hook for reduced motion preference
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook for sequence animations
 */
export function useSequence() {
  const controls = useFramerAnimation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  /**
   * Play animation sequence
   */
  const playSequence = async (steps: string[]) => {
    setIsPlaying(true);

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      await controls.start(steps[i]);
    }

    setIsPlaying(false);
    setCurrentStep(0);
  };

  return {
    controls,
    playSequence,
    currentStep,
    isPlaying,
  };
}

/**
 * Hook for gesture animations
 */
export function useGestureAnimation() {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const dragProps = {
    drag: true,
    onDragStart: () => setIsDragging(true),
    onDragEnd: () => setIsDragging(false),
    onDrag: (_: any, info: { offset: { x: number; y: number } }) => {
      setDragOffset(info.offset);
    },
  };

  return {
    isDragging,
    dragOffset,
    dragProps,
  };
}

/**
 * Hook for spring animations with physics
 */
export function useSpringAnimation(
  initialValue = 0,
  config = { stiffness: 100, damping: 10 }
) {
  const [value, setValue] = useState(initialValue);
  const controls = useFramerAnimation();

  const animate = async (to: number) => {
    await controls.start({
      x: to,
      transition: {
        type: 'spring',
        ...config,
      },
    });
    setValue(to);
  };

  return {
    value,
    animate,
    controls,
  };
}

/**
 * Hook for stagger animations
 */
export function useStagger(count: number, staggerDelay = 0.1) {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  const showItems = () => {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        setVisibleItems((prev) => [...prev, i]);
      }, i * staggerDelay * 1000);
    }
  };

  const hideItems = () => {
    setVisibleItems([]);
  };

  return {
    visibleItems,
    showItems,
    hideItems,
  };
}

/**
 * Hook for timed animations
 */
export function useTimedAnimation(duration: number, autoStart = false) {
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const start = () => {
    setIsRunning(true);
    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min(elapsed / duration, 1);

      setProgress(newProgress);

      if (newProgress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setIsRunning(false);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  };

  const stop = () => {
    setIsRunning(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  };

  const reset = () => {
    stop();
    setProgress(0);
  };

  useEffect(() => {
    if (autoStart) {
      start();
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [autoStart]);

  return {
    progress,
    isRunning,
    start,
    stop,
    reset,
  };
}

/**
 * Hook for parallax scroll effects
 */
export function useParallax(speed = 0.5) {
  const [offset, setOffset] = useState(0);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const scrolled = window.scrollY;
        setOffset(scrolled * speed);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [speed]);

  return {
    ref,
    offset,
    style: {
      transform: `translateY(${offset}px)`,
    },
  };
}
