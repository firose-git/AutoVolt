import * as React from 'react';
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'rectangular', width, height, animate = true, ...props }, ref) => {
    const getVariantStyles = () => {
      switch (variant) {
        case 'text':
          return 'h-4 rounded';
        case 'circular':
          return 'rounded-full';
        case 'rounded':
          return 'rounded-lg';
        case 'rectangular':
        default:
          return 'rounded-md';
      }
    };

    const style = {
      width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
      height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-muted',
          animate && 'animate-pulse',
          getVariantStyles(),
          className
        )}
        style={style}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Shimmer effect variant
interface ShimmerSkeletonProps extends SkeletonProps {
  shimmer?: boolean;
}

const ShimmerSkeleton = React.forwardRef<HTMLDivElement, ShimmerSkeletonProps>(
  ({ className, shimmer = true, ...props }, ref) => {
    return (
      <div className="relative overflow-hidden">
        <Skeleton
          ref={ref}
          className={cn(shimmer && 'relative', className)}
          animate={false}
          {...props}
        />
        {shimmer && (
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        )}
      </div>
    );
  }
);

ShimmerSkeleton.displayName = 'ShimmerSkeleton';

export { Skeleton, ShimmerSkeleton }
