import { useState, useEffect, useCallback } from 'react';

/**
 * Dashboard layout item
 */
export interface LayoutItem {
  i: string; // unique id
  x: number; // grid column position
  y: number; // grid row position
  w: number; // width in grid units
  h: number; // height in grid units
  minW?: number; // minimum width
  minH?: number; // minimum height
  maxW?: number; // maximum width
  maxH?: number; // maximum height
  static?: boolean; // cannot be dragged/resized
}

/**
 * Dashboard template
 */
export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  layout: LayoutItem[];
  widgets: string[]; // widget IDs
}

/**
 * Hook options
 */
interface UseDashboardLayoutOptions {
  /**
   * Storage key for persisting layout
   */
  storageKey?: string;
  
  /**
   * Default layout
   */
  defaultLayout?: LayoutItem[];
  
  /**
   * Number of columns
   */
  cols?: number;
  
  /**
   * Row height in pixels
   */
  rowHeight?: number;
  
  /**
   * Auto-save interval (ms)
   */
  autoSaveInterval?: number;
}

/**
 * Hook for managing dashboard layouts
 * Handles drag & drop, resize, save/load, templates
 */
export function useDashboardLayout(options: UseDashboardLayoutOptions = {}) {
  const {
    storageKey = 'dashboard-layout',
    defaultLayout = [],
    cols = 12,
    rowHeight = 100,
    autoSaveInterval = 2000,
  } = options;

  // Load initial layout from storage or use default
  const [layout, setLayout] = useState<LayoutItem[]>(() => {
    if (typeof window === 'undefined') return defaultLayout;
    
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : defaultLayout;
    } catch (error) {
      console.error('Failed to load layout:', error);
      return defaultLayout;
    }
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Save layout to localStorage
  const saveLayout = useCallback((newLayout: LayoutItem[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newLayout));
      setIsDirty(false);
      setIsSaving(false);
    } catch (error) {
      console.error('Failed to save layout:', error);
      setIsSaving(false);
    }
  }, [storageKey]);

  // Auto-save when layout changes
  useEffect(() => {
    if (!isDirty) return;

    setIsSaving(true);
    const timeout = setTimeout(() => {
      saveLayout(layout);
    }, autoSaveInterval);

    return () => clearTimeout(timeout);
  }, [layout, isDirty, autoSaveInterval, saveLayout]);

  // Update layout
  const updateLayout = useCallback((newLayout: LayoutItem[]) => {
    setLayout(newLayout);
    setIsDirty(true);
  }, []);

  // Add widget
  const addWidget = useCallback((widget: Omit<LayoutItem, 'i'> & { i?: string }) => {
    const newWidget: LayoutItem = {
      i: widget.i || `widget-${Date.now()}`,
      x: widget.x,
      y: widget.y,
      w: widget.w,
      h: widget.h,
      minW: widget.minW,
      minH: widget.minH,
      maxW: widget.maxW,
      maxH: widget.maxH,
      static: widget.static,
    };

    setLayout((prev) => [...prev, newWidget]);
    setIsDirty(true);
    return newWidget.i;
  }, []);

  // Remove widget
  const removeWidget = useCallback((widgetId: string) => {
    setLayout((prev) => prev.filter((item) => item.i !== widgetId));
    setIsDirty(true);
  }, []);

  // Update widget
  const updateWidget = useCallback((widgetId: string, updates: Partial<LayoutItem>) => {
    setLayout((prev) =>
      prev.map((item) =>
        item.i === widgetId ? { ...item, ...updates } : item
      )
    );
    setIsDirty(true);
  }, []);

  // Reset to default layout
  const resetLayout = useCallback(() => {
    setLayout(defaultLayout);
    setIsDirty(true);
  }, [defaultLayout]);

  // Clear layout
  const clearLayout = useCallback(() => {
    setLayout([]);
    setIsDirty(true);
  }, []);

  // Load template
  const loadTemplate = useCallback((template: DashboardTemplate) => {
    setLayout(template.layout);
    setIsDirty(true);
  }, []);

  // Export layout
  const exportLayout = useCallback(() => {
    return {
      layout,
      cols,
      rowHeight,
      timestamp: Date.now(),
    };
  }, [layout, cols, rowHeight]);

  // Import layout
  const importLayout = useCallback((data: { layout: LayoutItem[]; cols?: number; rowHeight?: number }) => {
    setLayout(data.layout);
    setIsDirty(true);
  }, []);

  // Find best position for new widget
  const findBestPosition = useCallback((w: number, h: number): { x: number; y: number } => {
    // Simple algorithm: find first available spot
    const occupied = new Set<string>();
    
    layout.forEach((item) => {
      for (let x = item.x; x < item.x + item.w; x++) {
        for (let y = item.y; y < item.y + item.h; y++) {
          occupied.add(`${x},${y}`);
        }
      }
    });

    // Try to find spot row by row
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x <= cols - w; x++) {
        let fits = true;
        
        for (let dx = 0; dx < w && fits; dx++) {
          for (let dy = 0; dy < h && fits; dy++) {
            if (occupied.has(`${x + dx},${y + dy}`)) {
              fits = false;
            }
          }
        }
        
        if (fits) {
          return { x, y };
        }
      }
    }

    // Fallback: add to bottom
    const maxY = layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
    return { x: 0, y: maxY };
  }, [layout, cols]);

  // Add widget at best position
  const addWidgetAuto = useCallback((widget: Omit<LayoutItem, 'i' | 'x' | 'y'> & { i?: string }) => {
    const position = findBestPosition(widget.w, widget.h);
    return addWidget({ ...widget, ...position });
  }, [findBestPosition, addWidget]);

  return {
    // State
    layout,
    isDirty,
    isSaving,
    cols,
    rowHeight,

    // Actions
    updateLayout,
    addWidget,
    addWidgetAuto,
    removeWidget,
    updateWidget,
    resetLayout,
    clearLayout,
    saveLayout: () => saveLayout(layout),
    
    // Templates
    loadTemplate,
    exportLayout,
    importLayout,
    
    // Utilities
    findBestPosition,
  };
}

/**
 * Predefined dashboard templates
 */
export const dashboardTemplates: DashboardTemplate[] = [
  {
    id: 'default',
    name: 'Default Dashboard',
    description: 'Balanced layout with key metrics',
    layout: [
      { i: 'stats-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'stats-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'stats-3', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'stats-4', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'chart-1', x: 0, y: 2, w: 8, h: 4, minW: 4, minH: 3 },
      { i: 'list-1', x: 8, y: 2, w: 4, h: 4, minW: 3, minH: 3 },
    ],
    widgets: ['stats-1', 'stats-2', 'stats-3', 'stats-4', 'chart-1', 'list-1'],
  },
  {
    id: 'monitoring',
    name: 'Monitoring Dashboard',
    description: 'Focus on real-time data and charts',
    layout: [
      { i: 'stats-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'stats-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'stats-3', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'stats-4', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'chart-1', x: 0, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
      { i: 'chart-2', x: 6, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
      { i: 'activity-1', x: 0, y: 6, w: 12, h: 3, minW: 6, minH: 2 },
    ],
    widgets: ['stats-1', 'stats-2', 'stats-3', 'stats-4', 'chart-1', 'chart-2', 'activity-1'],
  },
  {
    id: 'analytics',
    name: 'Analytics Dashboard',
    description: 'Deep dive into data with multiple charts',
    layout: [
      { i: 'chart-1', x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
      { i: 'chart-2', x: 6, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
      { i: 'chart-3', x: 0, y: 4, w: 4, h: 3, minW: 3, minH: 3 },
      { i: 'chart-4', x: 4, y: 4, w: 4, h: 3, minW: 3, minH: 3 },
      { i: 'chart-5', x: 8, y: 4, w: 4, h: 3, minW: 3, minH: 3 },
    ],
    widgets: ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'],
  },
  {
    id: 'simple',
    name: 'Simple Dashboard',
    description: 'Clean layout with essential widgets',
    layout: [
      { i: 'stats-1', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'stats-2', x: 4, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'stats-3', x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'chart-1', x: 0, y: 2, w: 12, h: 4, minW: 6, minH: 3 },
    ],
    widgets: ['stats-1', 'stats-2', 'stats-3', 'chart-1'],
  },
];
