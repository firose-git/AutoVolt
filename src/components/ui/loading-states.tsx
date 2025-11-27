import React from 'react';
import { LoadingSpinner } from './progress';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
  backdrop?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Loading...',
  fullScreen = false,
  className,
  backdrop = true,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        fullScreen ? 'fixed inset-0 z-50' : 'absolute inset-0',
        backdrop && 'bg-background/80 backdrop-blur-sm',
        className
      )}
    >
      <LoadingSpinner size="lg" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
};

interface LoadingStateProps {
  message?: string;
  submessage?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading',
  submessage,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      <LoadingSpinner size="lg" className="mb-4" />
      <h3 className="text-lg font-medium">{message}</h3>
      {submessage && <p className="text-sm text-muted-foreground mt-2">{submessage}</p>}
    </div>
  );
};

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText = 'Loading...',
  children,
  disabled,
  className,
  ...props
}) => {
  return (
    <button
      className={cn('inline-flex items-center justify-center gap-2', className)}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <>
          <LoadingSpinner size="sm" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
};

interface InlineLoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({
  text = 'Loading...',
  size = 'sm',
  className,
}) => {
  return (
    <div className={cn('inline-flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <LoadingSpinner size={size} />
      <span>{text}</span>
    </div>
  );
};

interface PageLoaderProps {
  message?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ message = 'Loading page...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="xl" className="mb-4" />
        <h2 className="text-xl font-semibold mb-2">AutoVolt</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};
