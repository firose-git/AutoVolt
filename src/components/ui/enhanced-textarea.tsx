import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check, AlertCircle } from 'lucide-react';

export interface EnhancedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  showCount?: boolean;
  variant?: 'default' | 'filled' | 'outlined';
}

const EnhancedTextarea = React.forwardRef<HTMLTextAreaElement, EnhancedTextareaProps>(
  ({ className, label, error, success, hint, showCount, variant = 'default', maxLength, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue);
    const [charCount, setCharCount] = React.useState(
      (props.value as string)?.length || (props.defaultValue as string)?.length || 0
    );
    
    // Determine if label should be floating
    const isFloating = focused || hasValue || props.placeholder;
    
    // Get status
    const hasError = !!error;
    const hasSuccess = !!success && !hasError;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setHasValue(!!e.target.value);
      setCharCount(e.target.value.length);
      props.onChange?.(e);
    };

    return (
      <div className="space-y-1.5">
        <div className="relative">
          {/* Textarea field */}
          <textarea
            className={cn(
              // Base styles
              "flex min-h-[120px] w-full rounded-lg px-3 py-3 text-sm",
              "transition-all duration-200 ease-in-out",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "resize-y",
              
              // Variant styles
              variant === 'filled' && "bg-muted/50 border-transparent hover:bg-muted focus:bg-background",
              variant === 'outlined' && "bg-transparent border-2",
              variant === 'default' && "bg-background border",
              
              // Focus styles
              focused && !hasError && "ring-2 ring-primary/20 border-primary",
              
              // Padding adjustments
              label && "pt-7 pb-2",
              showCount && "pb-8",
              
              // Border colors
              !focused && !hasError && !hasSuccess && "border-input",
              hasError && "border-destructive focus:ring-destructive/20",
              hasSuccess && "border-success focus:ring-success/20",
              
              className
            )}
            ref={ref}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={handleChange}
            maxLength={maxLength}
            {...props}
          />
          
          {/* Floating Label */}
          {label && (
            <label
              className={cn(
                "absolute left-3 pointer-events-none transition-all duration-200 ease-out",
                "text-muted-foreground",
                isFloating
                  ? "top-2 text-xs font-medium"
                  : "top-4 text-sm",
                focused && "text-primary",
                hasError && "text-destructive",
                hasSuccess && "text-success",
                props.disabled && "opacity-50"
              )}
            >
              {label}
              {props.required && <span className="text-destructive ml-0.5">*</span>}
            </label>
          )}
          
          {/* Character count */}
          {showCount && (
            <div className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
              {charCount}
              {maxLength && `/${maxLength}`}
            </div>
          )}
        </div>
        
        {/* Helper text */}
        {(hint || error || success) && (
          <div className="px-1">
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
            {!error && success && (
              <p className="text-xs text-success flex items-center gap-1">
                <Check className="h-3 w-3" />
                {success}
              </p>
            )}
            {!error && !success && hint && (
              <p className="text-xs text-muted-foreground">{hint}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

EnhancedTextarea.displayName = 'EnhancedTextarea';

export { EnhancedTextarea };
