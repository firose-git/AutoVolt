import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"
import { Loader2 } from 'lucide-react';

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value = 0, showLabel = false, size = 'md', variant = 'default', ...props }, ref) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-1';
      case 'lg':
        return 'h-4';
      case 'md':
      default:
        return 'h-2';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-success';
      case 'warning':
        return 'bg-warning';
      case 'danger':
        return 'bg-destructive';
      case 'default':
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className="space-y-1">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-full bg-muted w-full',
          getSizeStyles(),
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            'h-full w-full flex-1 transition-all duration-300 ease-in-out',
            getVariantStyles()
          )}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      </ProgressPrimitive.Root>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(value || 0)}%</span>
        </div>
      )}
    </div>
  );
})
Progress.displayName = ProgressPrimitive.Root.displayName

// Indeterminate Progress
interface IndeterminateProgressProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const IndeterminateProgress: React.FC<IndeterminateProgressProps> = ({
  className,
  size = 'md',
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-1';
      case 'lg':
        return 'h-4';
      case 'md':
      default:
        return 'h-2';
    }
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-full bg-muted w-full',
        getSizeStyles(),
        className
      )}
    >
      <div className="h-full w-1/3 animate-progress bg-primary" />
    </div>
  );
};

// Circular Progress
interface CircularProgressProps {
  value?: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  indeterminate?: boolean;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value = 0,
  size = 40,
  strokeWidth = 4,
  showLabel = false,
  indeterminate = false,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = indeterminate ? 0 : circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className={indeterminate ? 'animate-spin' : ''}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={indeterminate ? circumference * 0.75 : offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-300 ease-in-out"
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
      </svg>
      {showLabel && !indeterminate && (
        <span className="absolute text-xs font-medium">{Math.round(value)}%</span>
      )}
    </div>
  );
};

// Loading Spinner
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className }) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4';
      case 'lg':
        return 'h-8 w-8';
      case 'xl':
        return 'h-12 w-12';
      case 'md':
      default:
        return 'h-6 w-6';
    }
  };

  return <Loader2 className={cn('animate-spin', getSizeStyles(), className)} />;
};

export {
  Progress,
  IndeterminateProgress,
  CircularProgress,
  LoadingSpinner,
}
