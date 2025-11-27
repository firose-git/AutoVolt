import React from 'react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'icon-only' | 'text-only';
  className?: string;
  animated?: boolean;
}

const sizeClasses = {
  xs: {
    icon: 'h-4 w-4',
    text: 'text-sm',
    container: 'gap-1',
  },
  sm: {
    icon: 'h-5 w-5',
    text: 'text-base',
    container: 'gap-1.5',
  },
  md: {
    icon: 'h-6 w-6',
    text: 'text-lg',
    container: 'gap-2',
  },
  lg: {
    icon: 'h-8 w-8',
    text: 'text-xl',
    container: 'gap-2.5',
  },
  xl: {
    icon: 'h-10 w-10',
    text: 'text-2xl',
    container: 'gap-3',
  },
};

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'default',
  className,
  animated = false,
}) => {
  const sizes = sizeClasses[size];

  if (variant === 'icon-only') {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-lg bg-primary p-2',
          animated && 'transition-transform hover:scale-110',
          className
        )}
      >
        <Zap className={cn(sizes.icon, 'text-primary-foreground')} />
      </div>
    );
  }

  if (variant === 'text-only') {
    return (
      <span
        className={cn(
          'font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent',
          sizes.text,
          className
        )}
      >
        AutoVolt
      </span>
    );
  }

  return (
    <div className={cn('inline-flex items-center', sizes.container, className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-primary p-2',
          animated && 'transition-transform hover:scale-110'
        )}
      >
        <Zap className={cn(sizes.icon, 'text-primary-foreground')} />
      </div>
      <div className="flex flex-col">
        <span
          className={cn(
            'font-bold leading-none bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent',
            sizes.text
          )}
        >
          AutoVolt
        </span>
        {size !== 'xs' && size !== 'sm' && (
          <span className="text-xs text-muted-foreground leading-none mt-0.5">
            Smart Power Management
          </span>
        )}
      </div>
    </div>
  );
};

// Loading animation variant
export const LogoLoader: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 'h-8 w-8' : size === 'md' ? 'h-12 w-12' : 'h-16 w-16';

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className={cn('rounded-lg bg-primary p-3', iconSize)}>
          <Zap className="h-full w-full text-primary-foreground animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-lg bg-primary animate-ping opacity-75"></div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          AutoVolt
        </span>
        <div className="flex gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};
