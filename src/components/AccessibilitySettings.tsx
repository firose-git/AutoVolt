import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { Eye, Moon, Sun, Zap, Type, Contrast } from 'lucide-react';

/**
 * Accessibility Settings Component
 * Provides user controls for accessibility preferences
 */

interface AccessibilityPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  fontSize: number;
  keyboardShortcuts: boolean;
  screenReaderOptimizations: boolean;
}

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  fontSize: 16,
  keyboardShortcuts: true,
  screenReaderOptimizations: false,
};

export function AccessibilitySettings() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => {
    const saved = localStorage.getItem('accessibility-preferences');
    return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
  });

  // Apply preferences to document
  useEffect(() => {
    const root = document.documentElement;

    // Reduced motion
    if (preferences.reducedMotion) {
      root.style.setProperty('--transition-duration', '0ms');
      root.classList.add('reduce-motion');
    } else {
      root.style.removeProperty('--transition-duration');
      root.classList.remove('reduce-motion');
    }

    // High contrast
    if (preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Large text
    if (preferences.largeText) {
      root.style.fontSize = '18px';
      root.classList.add('large-text');
    } else {
      root.style.fontSize = `${preferences.fontSize}px`;
      root.classList.remove('large-text');
    }

    // Font size
    root.style.setProperty('--base-font-size', `${preferences.fontSize}px`);

    // Screen reader optimizations
    if (preferences.screenReaderOptimizations) {
      root.classList.add('screen-reader-optimized');
    } else {
      root.classList.remove('screen-reader-optimized');
    }

    // Save to localStorage
    localStorage.setItem('accessibility-preferences', JSON.stringify(preferences));
  }, [preferences]);

  const updatePreference = <K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visual Accessibility
          </CardTitle>
          <CardDescription>
            Adjust visual settings for better readability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* High Contrast Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="high-contrast" className="flex items-center gap-2">
                <Contrast className="h-4 w-4" />
                High Contrast Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Increase contrast for better visibility
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={preferences.highContrast}
              onCheckedChange={(checked) => updatePreference('highContrast', checked)}
              aria-label="Toggle high contrast mode"
            />
          </div>

          {/* Large Text */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="large-text" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Large Text
              </Label>
              <p className="text-sm text-muted-foreground">
                Increase text size for easier reading
              </p>
            </div>
            <Switch
              id="large-text"
              checked={preferences.largeText}
              onCheckedChange={(checked) => updatePreference('largeText', checked)}
              aria-label="Toggle large text mode"
            />
          </div>

          {/* Font Size Slider */}
          {!preferences.largeText && (
            <div className="space-y-2">
              <Label htmlFor="font-size">
                Font Size: {preferences.fontSize}px
              </Label>
              <Slider
                id="font-size"
                min={12}
                max={24}
                step={1}
                value={[preferences.fontSize]}
                onValueChange={([value]) => updatePreference('fontSize', value)}
                aria-label="Adjust font size"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Motion & Animations
          </CardTitle>
          <CardDescription>
            Control motion and animation effects
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reduced Motion */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reduced-motion">Reduced Motion</Label>
              <p className="text-sm text-muted-foreground">
                Minimize animations and transitions
              </p>
            </div>
            <Switch
              id="reduced-motion"
              checked={preferences.reducedMotion}
              onCheckedChange={(checked) => updatePreference('reducedMotion', checked)}
              aria-label="Toggle reduced motion"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Interaction Preferences
          </CardTitle>
          <CardDescription>
            Customize how you interact with the app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Keyboard Shortcuts */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="keyboard-shortcuts">Keyboard Shortcuts</Label>
              <p className="text-sm text-muted-foreground">
                Enable keyboard shortcuts for quick actions
              </p>
            </div>
            <Switch
              id="keyboard-shortcuts"
              checked={preferences.keyboardShortcuts}
              onCheckedChange={(checked) => updatePreference('keyboardShortcuts', checked)}
              aria-label="Toggle keyboard shortcuts"
            />
          </div>

          {/* Screen Reader Optimizations */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="screen-reader">Screen Reader Optimizations</Label>
              <p className="text-sm text-muted-foreground">
                Enhanced support for screen readers
              </p>
            </div>
            <Switch
              id="screen-reader"
              checked={preferences.screenReaderOptimizations}
              onCheckedChange={(checked) =>
                updatePreference('screenReaderOptimizations', checked)
              }
              aria-label="Toggle screen reader optimizations"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={resetToDefaults}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
