import { Variants, Transition, TargetAndTransition } from 'framer-motion';

/**
 * Common animation variants
 */

/**
 * Fade in animation
 */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Fade in with slide up
 */
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

/**
 * Fade in with slide down
 */
export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

/**
 * Fade in with slide left
 */
export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

/**
 * Fade in with slide right
 */
export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

/**
 * Scale in animation
 */
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

/**
 * Scale in with spring
 */
export const scaleInSpring: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
    },
  },
  exit: { opacity: 0, scale: 0.8 },
};

/**
 * Slide in from left
 */
export const slideInLeft: Variants = {
  initial: { x: '-100%' },
  animate: { x: 0 },
  exit: { x: '-100%' },
};

/**
 * Slide in from right
 */
export const slideInRight: Variants = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
};

/**
 * Slide in from top
 */
export const slideInTop: Variants = {
  initial: { y: '-100%' },
  animate: { y: 0 },
  exit: { y: '-100%' },
};

/**
 * Slide in from bottom
 */
export const slideInBottom: Variants = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
};

/**
 * Rotate in animation
 */
export const rotateIn: Variants = {
  initial: { opacity: 0, rotate: -180 },
  animate: { opacity: 1, rotate: 0 },
  exit: { opacity: 0, rotate: 180 },
};

/**
 * Flip in animation
 */
export const flipIn: Variants = {
  initial: { opacity: 0, rotateY: -90 },
  animate: { opacity: 1, rotateY: 0 },
  exit: { opacity: 0, rotateY: 90 },
};

/**
 * Bounce in animation
 */
export const bounceIn: Variants = {
  initial: { opacity: 0, scale: 0.3 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10,
    },
  },
  exit: { opacity: 0, scale: 0.3 },
};

/**
 * Staggered children animation
 */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
  exit: {},
};

/**
 * Staggered child item
 */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

/**
 * Common transition presets
 */

/**
 * Default smooth transition
 */
export const smoothTransition: Transition = {
  duration: 0.3,
  ease: 'easeInOut',
};

/**
 * Fast transition
 */
export const fastTransition: Transition = {
  duration: 0.15,
  ease: 'easeInOut',
};

/**
 * Slow transition
 */
export const slowTransition: Transition = {
  duration: 0.5,
  ease: 'easeInOut',
};

/**
 * Spring transition
 */
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
};

/**
 * Bouncy spring
 */
export const bouncySpring: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 10,
};

/**
 * Gentle spring
 */
export const gentleSpring: Transition = {
  type: 'spring',
  stiffness: 100,
  damping: 15,
};

/**
 * Micro-interaction animations
 */

/**
 * Button hover animation
 */
export const buttonHover: TargetAndTransition = {
  scale: 1.05,
  transition: { duration: 0.2 },
};

/**
 * Button tap animation
 */
export const buttonTap: TargetAndTransition = {
  scale: 0.95,
  transition: { duration: 0.1 },
};

/**
 * Card hover animation
 */
export const cardHover: TargetAndTransition = {
  y: -4,
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
  transition: { duration: 0.2 },
};

/**
 * Icon hover animation
 */
export const iconHover: TargetAndTransition = {
  rotate: [0, -10, 10, -10, 0],
  transition: { duration: 0.5 },
};

/**
 * Scale hover animation
 */
export const scaleHover: TargetAndTransition = {
  scale: 1.1,
  transition: { duration: 0.2 },
};

/**
 * Pulse animation
 */
export const pulse: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Wiggle animation
 */
export const wiggle: Variants = {
  initial: { rotate: 0 },
  animate: {
    rotate: [0, -5, 5, -5, 5, 0],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
};

/**
 * Shake animation
 */
export const shake: Variants = {
  initial: { x: 0 },
  animate: {
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
};

/**
 * Loading spinner animation
 */
export const spinnerRotate: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Gradient animation
 */
export const gradientShift: Variants = {
  animate: {
    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Page transition variants
 */
export const pageTransition: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

/**
 * Modal transition variants
 */
export const modalTransition: Variants = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, y: 20 },
};

/**
 * Backdrop transition
 */
export const backdropTransition: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Toast notification animation
 */
export const toastTransition: Variants = {
  initial: { opacity: 0, y: -50, scale: 0.3 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.5, transition: { duration: 0.2 } },
};

/**
 * List item animation
 */
export const listItemTransition: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

/**
 * Utility functions
 */

/**
 * Create a stagger animation with custom delay
 */
export function createStagger(
  staggerDelay = 0.1,
  delayChildren = 0
): Variants {
  return {
    initial: {},
    animate: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
    exit: {},
  };
}

/**
 * Create a custom fade animation with direction
 */
export function createFade(
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  distance = 20
): Variants {
  const axis = direction === 'up' || direction === 'down' ? 'y' : 'x';
  const value =
    direction === 'up' || direction === 'left' ? distance : -distance;

  return {
    initial: { opacity: 0, [axis]: value },
    animate: { opacity: 1, [axis]: 0 },
    exit: { opacity: 0, [axis]: value },
  };
}

/**
 * Create a custom scale animation
 */
export function createScale(
  initialScale = 0.9,
  finalScale = 1,
  springConfig?: Transition
): Variants {
  return {
    initial: { opacity: 0, scale: initialScale },
    animate: {
      opacity: 1,
      scale: finalScale,
      transition: springConfig || smoothTransition,
    },
    exit: { opacity: 0, scale: initialScale },
  };
}

/**
 * Combine multiple variants
 */
export function combineVariants(...variants: Variants[]): Variants {
  return variants.reduce(
    (acc, variant) => {
      return {
        initial: { ...acc.initial, ...variant.initial },
        animate: { ...acc.animate, ...variant.animate },
        exit: { ...acc.exit, ...variant.exit },
      };
    },
    { initial: {}, animate: {}, exit: {} }
  );
}
