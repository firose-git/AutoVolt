import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export interface EnhancedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  loading?: boolean;
  icon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outlined';
}

const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ className, label, error, success, hint, loading, icon, variant = 'default', type, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue);
    
    const isPassword = type === 'password';
    const actualType = isPassword && showPassword ? 'text' : type;
    
    // Determine if label should be floating
    const isFloating = focused || hasValue || props.placeholder;
    
    // Get status
    const hasError = !!error;
    const hasSuccess = !!success && !hasError;
    const isLoading = !!loading;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      props.onChange?.(e);
    };

    return (
      <div className="space-y-1.5">
        <div className="relative">
          {/* Input field */}
          <div className="relative">
            {/* Icon */}
            {icon && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10">
                {icon}
              </div>
            )}
            
            <input
              type={actualType}
              className={cn(
                // Base styles
                "flex h-12 w-full rounded-lg px-3 py-2 text-sm",
                "transition-all duration-200 ease-in-out",
                "disabled:cursor-not-allowed disabled:opacity-50",
                
                // Variant styles
                variant === 'filled' && "bg-muted/50 border-transparent hover:bg-muted focus:bg-background",
                variant === 'outlined' && "bg-transparent border-2",
                variant === 'default' && "bg-background border",
                
                // Focus styles
                focused && !hasError && "ring-2 ring-primary/20 border-primary",
                
                // Padding adjustments
                label && "pt-6 pb-2",
                icon && "pl-10",
                (isPassword || isLoading) && "pr-10",
                
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
              {...props}
            />
            
            {/* Floating Label */}
            {label && (
              <label
                className={cn(
                  "absolute left-3 pointer-events-none transition-all duration-200 ease-out",
                  "text-muted-foreground",
                  icon && "left-10",
                  isFloating
                    ? "top-2 text-xs font-medium"
                    : "top-1/2 -translate-y-1/2 text-sm",
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
            
            {/* Right icon (loading, error, success, password toggle) */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!isLoading && hasError && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              {!isLoading && hasSuccess && (
                <Check className="h-4 w-4 text-success" />
              )}
              {isPassword && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>
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

EnhancedInput.displayName = 'EnhancedInput';

export { EnhancedInput };
