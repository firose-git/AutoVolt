import React, { useState, useRef, KeyboardEvent, ClipboardEvent, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * MAC Address Input Component
 * Automatically formats MAC addresses as user types
 * Format: AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF
 */

export interface MacAddressInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onValidChange?: (value: string, isValid: boolean) => void;
  separator?: ':' | '-';
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  name?: string;
  id?: string;
}

/**
 * Format MAC address with proper separators
 */
const formatMacAddress = (value: string, separator: ':' | '-' = ':'): string => {
  // Remove all non-hex characters
  const cleaned = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  
  // Limit to 12 characters (6 pairs)
  const limited = cleaned.slice(0, 12);
  
  // Split into pairs and join with separator
  const pairs: string[] = [];
  for (let i = 0; i < limited.length; i += 2) {
    pairs.push(limited.slice(i, i + 2));
  }
  
  return pairs.join(separator);
};

/**
 * Validate MAC address format
 */
const isValidMacAddress = (value: string): boolean => {
  // Check if it matches MAC address pattern (6 pairs of hex digits)
  const macPattern = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;
  return macPattern.test(value);
};

/**
 * Get clean MAC address (remove separators)
 */
const getCleanMacAddress = (value: string): string => {
  return value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
};

export const MacAddressInput = React.forwardRef<HTMLInputElement, MacAddressInputProps>(({
  value = '',
  onChange,
  onValidChange,
  separator = ':',
  placeholder = 'AA:BB:CC:DD:EE:FF',
  className,
  disabled = false,
  required = false,
  autoFocus = false,
  name,
  id,
}, ref) => {
  const [internalValue, setInternalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isValid, setIsValid] = useState(false);

  // Sync internal value and validity when external `value` or separator changes
  useEffect(() => {
    const formatted = formatMacAddress(value || '', separator);
    setInternalValue(formatted);
    const valid = isValidMacAddress(formatted);
    setIsValid(valid);
    if (onValidChange) onValidChange(formatted, valid);
  }, [value, separator]);

  // Handle external ref
  React.useImperativeHandle(ref, () => inputRef.current!, []);

  /**
   * Handle input change
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    // Format the value
    const formatted = formatMacAddress(inputValue, separator);
    
    // Update state
    setInternalValue(formatted);
    onChange?.(formatted);
    
    // Validate
    const valid = isValidMacAddress(formatted);
    setIsValid(valid);
    onValidChange?.(formatted, valid);
    
    // Restore cursor position (adjust for added separators)
    setTimeout(() => {
      if (inputRef.current) {
        const cleanBefore = getCleanMacAddress(inputValue.slice(0, cursorPosition));
        const formattedBefore = formatMacAddress(cleanBefore, separator);
        let newPosition = formattedBefore.length;
        
        // If cursor was after a separator, move it forward
        if (formatted[newPosition] === separator) {
          newPosition++;
        }
        
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  /**
   * Handle paste event
   */
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const formatted = formatMacAddress(pastedText, separator);
    
    setInternalValue(formatted);
    onChange?.(formatted);
    
    const valid = isValidMacAddress(formatted);
    setIsValid(valid);
    onValidChange?.(formatted, valid);
  };

  /**
   * Handle keydown for special keys
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].includes(e.keyCode)) {
      return;
    }
    
    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) {
      return;
    }
    
    // Allow: home, end, left, right
    if (e.keyCode >= 35 && e.keyCode <= 39) {
      return;
    }
    
    // Ensure it's a hex digit (0-9, A-F)
    const char = e.key;
    if (!/^[0-9A-Fa-f]$/.test(char)) {
      e.preventDefault();
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={internalValue}
        onChange={handleChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'font-mono',
          isValid && internalValue && 'border-green-500 focus-visible:ring-green-500',
          !isValid && internalValue && internalValue.length > 0 && 'border-red-500 focus-visible:ring-red-500',
          className
        )}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        name={name}
        id={id}
        maxLength={17} // 12 chars + 5 separators
        autoComplete="off"
      />
      
      {/* Validation indicator */}
      {internalValue && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isValid ? (
            <svg
              className="h-4 w-4 text-green-500"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg
              className="h-4 w-4 text-red-500"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
});

export default MacAddressInput;
