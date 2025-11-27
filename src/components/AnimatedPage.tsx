import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { pageTransition, smoothTransition } from '@/utils/animations';

/**
 * Animated page props
 */
export interface AnimatedPageProps {
  /**
   * Page content
   */
  children: React.ReactNode;

  /**
   * Custom animation variants
   */
  variants?: Variants;

  /**
   * Animation key (defaults to pathname)
   */
  animationKey?: string;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Disable animations
   * @default false
   */
  disableAnimations?: boolean;
}

/**
 * Animated page wrapper with smooth transitions
 */
export function AnimatedPage({
  children,
  variants = pageTransition,
  animationKey,
  className,
  disableAnimations = false,
}: AnimatedPageProps) {
  const location = useLocation();
  const key = animationKey || location.pathname;

  if (disableAnimations) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        transition={smoothTransition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Animated section with scroll trigger
 */
export interface AnimatedSectionProps {
  children: React.ReactNode;
  variants?: Variants;
  className?: string;
  /**
   * Threshold for intersection observer (0-1)
   * @default 0.1
   */
  threshold?: number;
  /**
   * Only animate once
   * @default true
   */
  once?: boolean;
}

/**
 * Animated section that triggers on scroll
 */
export function AnimatedSection({
  children,
  variants = pageTransition,
  className,
  threshold = 0.1,
  once = true,
}: AnimatedSectionProps) {
  const [isInView, setIsInView] = React.useState(false);
  const [hasAnimated, setHasAnimated] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (!hasAnimated) {
            setHasAnimated(true);
          }
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, once, hasAnimated]);

  const shouldAnimate = once ? hasAnimated : isInView;

  return (
    <motion.div
      ref={ref}
      initial="initial"
      animate={shouldAnimate ? 'animate' : 'initial'}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated list container with stagger
 */
export interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Stagger delay between items (seconds)
   * @default 0.1
   */
  staggerDelay?: number;
  /**
   * Initial delay before first item (seconds)
   * @default 0
   */
  delayChildren?: number;
}

/**
 * Animated list with staggered children
 */
export function AnimatedList({
  children,
  className,
  staggerDelay = 0.1,
  delayChildren = 0,
}: AnimatedListProps) {
  const containerVariants: Variants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={containerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated list item
 */
export interface AnimatedListItemProps {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
}

/**
 * Individual list item with animation
 */
export function AnimatedListItem({
  children,
  className,
  variants,
}: AnimatedListItemProps) {
  const itemVariants: Variants = variants || {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Animated card with hover effects
 */
export interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Enable hover animation
   * @default true
   */
  enableHover?: boolean;
  /**
   * Enable tap animation
   * @default true
   */
  enableTap?: boolean;
  /**
   * onClick handler
   */
  onClick?: () => void;
}

/**
 * Card with hover and tap animations
 */
export function AnimatedCard({
  children,
  className,
  enableHover = true,
  enableTap = true,
  onClick,
}: AnimatedCardProps) {
  return (
    <motion.div
      whileHover={
        enableHover
          ? {
              y: -4,
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
              transition: { duration: 0.2 },
            }
          : undefined
      }
      whileTap={
        enableTap
          ? {
              scale: 0.98,
              transition: { duration: 0.1 },
            }
          : undefined
      }
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated button with micro-interactions
 */
export interface AnimatedButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  /**
   * Animation type
   * @default 'scale'
   */
  animationType?: 'scale' | 'bounce' | 'wiggle';
}

/**
 * Button with micro-interaction animations
 */
export function AnimatedButton({
  children,
  className,
  onClick,
  disabled = false,
  animationType = 'scale',
}: AnimatedButtonProps) {
  const getAnimations = () => {
    switch (animationType) {
      case 'bounce':
        return {
          whileHover: { scale: 1.05 },
          whileTap: { scale: 0.95 },
        };
      case 'wiggle':
        return {
          whileHover: { rotate: [0, -2, 2, -2, 0] },
          whileTap: { scale: 0.95 },
        };
      default:
        return {
          whileHover: { scale: 1.05 },
          whileTap: { scale: 0.95 },
        };
    }
  };

  return (
    <motion.button
      {...getAnimations()}
      onClick={onClick}
      disabled={disabled}
      className={className}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.button>
  );
}

/**
 * Animated modal/dialog
 */
export interface AnimatedModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  className?: string;
}

/**
 * Modal with entry/exit animations
 */
export function AnimatedModal({
  children,
  isOpen,
  onClose,
  className,
}: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={smoothTransition}
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 ${className}`}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Animated presence wrapper for conditional rendering
 */
export interface AnimatedPresenceWrapperProps {
  children: React.ReactNode;
  show: boolean;
  variants?: Variants;
  className?: string;
}

/**
 * Wrapper for AnimatePresence with conditional rendering
 */
export function AnimatedPresenceWrapper({
  children,
  show,
  variants = pageTransition,
  className,
}: AnimatedPresenceWrapperProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
