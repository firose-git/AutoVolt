import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EnhancedSelectProps {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outlined';
  required?: boolean;
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const EnhancedSelect = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  EnhancedSelectProps
>(({ 
  label, 
  error, 
  success, 
  hint, 
  icon, 
  variant = 'default', 
  required,
  children,
  value,
  onValueChange,
  placeholder,
  disabled
}, ref) => {
  const [focused, setFocused] = React.useState(false);
  const [hasValue, setHasValue] = React.useState(!!value);
  
  React.useEffect(() => {
    setHasValue(!!value);
  }, [value]);
  
  // Determine if label should be floating
  const isFloating = focused || hasValue || placeholder;
  
  // Get status
  const hasError = !!error;
  const hasSuccess = !!success && !hasError;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectPrimitive.Trigger
            ref={ref}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
              // Base styles
              "flex h-12 w-full items-center justify-between rounded-lg px-3 py-2 text-sm",
              "transition-all duration-200 ease-in-out",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "[&>span]:line-clamp-1",
              
              // Variant styles
              variant === 'filled' && "bg-muted/50 border-transparent hover:bg-muted focus:bg-background",
              variant === 'outlined' && "bg-transparent border-2",
              variant === 'default' && "bg-background border",
              
              // Focus styles
              focused && !hasError && "ring-2 ring-primary/20 border-primary",
              
              // Padding adjustments
              label && "pt-6 pb-2",
              icon && "pl-10",
              
              // Border colors
              !focused && !hasError && !hasSuccess && "border-input",
              hasError && "border-destructive focus:ring-destructive/20",
              hasSuccess && "border-success focus:ring-success/20"
            )}
          >
            {/* Icon */}
            {icon && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                {icon}
              </div>
            )}
            
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
                  disabled && "opacity-50"
                )}
              >
                {label}
                {required && <span className="text-destructive ml-0.5">*</span>}
              </label>
            )}
            
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon asChild>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className={cn(
                "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg",
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
              )}
              position="popper"
            >
              <SelectPrimitive.Viewport className="p-1">
                {children}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
        
        {/* Status icon */}
        {(hasError || hasSuccess) && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            {hasError && <AlertCircle className="h-4 w-4 text-destructive" />}
            {hasSuccess && <Check className="h-4 w-4 text-success" />}
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
});

EnhancedSelect.displayName = 'EnhancedSelect';

// SelectItem component
const EnhancedSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-md py-2 pl-8 pr-2 text-sm outline-none",
      "focus:bg-accent focus:text-accent-foreground",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      "transition-colors duration-150",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));

EnhancedSelectItem.displayName = 'EnhancedSelectItem';

export { EnhancedSelect, EnhancedSelectItem };
