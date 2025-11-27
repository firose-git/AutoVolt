import React, { useState } from 'react';
import GridLayout, { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { LayoutItem, useDashboardLayout, dashboardTemplates } from '@/hooks/useDashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  LayoutGrid,
  Plus,
  Save,
  RotateCcw,
  Download,
  Upload,
  Settings,
  X,
  GripVertical,
} from 'lucide-react';

// Make grid responsive
const ResponsiveGridLayout = WidthProvider(Responsive);

/**
 * Widget component props
 */
export interface WidgetProps {
  id: string;
  onRemove?: (id: string) => void;
  onSettings?: (id: string) => void;
  isEditing?: boolean;
}

/**
 * Dashboard widget configuration
 */
export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  component: React.ComponentType<WidgetProps>;
  defaultSize?: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
}

/**
 * Dashboard grid props
 */
interface DashboardGridProps {
  /**
   * Available widgets
   */
  widgets: WidgetConfig[];
  
  /**
   * Active widget instances
   */
  activeWidgets?: string[];
  
  /**
   * Edit mode
   */
  isEditing?: boolean;
  
  /**
   * On edit mode change
   */
  onEditingChange?: (editing: boolean) => void;
  
  /**
   * Storage key
   */
  storageKey?: string;
  
  /**
   * Grid configuration
   */
  cols?: number;
  rowHeight?: number;
  
  /**
   * Custom toolbar
   */
  toolbar?: React.ReactNode;
}

/**
 * Dashboard grid component with drag & drop widgets
 */
export function DashboardGrid({
  widgets,
  activeWidgets = [],
  isEditing = false,
  onEditingChange,
  storageKey = 'dashboard-layout',
  cols = 12,
  rowHeight = 100,
  toolbar,
}: DashboardGridProps) {
  const {
    layout,
    updateLayout,
    addWidgetAuto,
    removeWidget,
    resetLayout,
    loadTemplate,
    exportLayout,
    importLayout,
    isDirty,
    isSaving,
  } = useDashboardLayout({
    storageKey,
    cols,
    rowHeight,
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('default');

  // Handle layout change
  const handleLayoutChange = (newLayout: Layout[]) => {
    const converted: LayoutItem[] = newLayout.map((item) => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW,
      minH: item.minH,
      maxW: item.maxW,
      maxH: item.maxH,
      static: item.static,
    }));
    updateLayout(converted);
  };

  // Add widget
  const handleAddWidget = (widgetConfig: WidgetConfig) => {
    const defaultSize = widgetConfig.defaultSize || { w: 4, h: 3 };
    const minSize = widgetConfig.minSize || { w: 2, h: 2 };
    const maxSize = widgetConfig.maxSize;

    addWidgetAuto({
      i: `${widgetConfig.type}-${Date.now()}`,
      w: defaultSize.w,
      h: defaultSize.h,
      minW: minSize.w,
      minH: minSize.h,
      maxW: maxSize?.w,
      maxH: maxSize?.h,
    });
  };

  // Remove widget
  const handleRemoveWidget = (widgetId: string) => {
    if (confirm('Remove this widget?')) {
      removeWidget(widgetId);
    }
  };

  // Load template
  const handleLoadTemplate = (templateId: string) => {
    const template = dashboardTemplates.find((t) => t.id === templateId);
    if (template) {
      loadTemplate(template);
      setSelectedTemplate(templateId);
    }
  };

  // Export layout
  const handleExportLayout = () => {
    const data = exportLayout();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-layout-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import layout
  const handleImportLayout = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            importLayout(data);
          } catch (error) {
            alert('Failed to import layout. Invalid file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Get widget config by ID
  const getWidgetConfig = (widgetId: string): WidgetConfig | undefined => {
    const type = widgetId.split('-')[0];
    return widgets.find((w) => w.type === type);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {toolbar}
          
          {/* Edit Mode Toggle */}
          <Button
            variant={isEditing ? 'default' : 'outline'}
            size="sm"
            onClick={() => onEditingChange?.(!isEditing)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {isEditing ? 'Done Editing' : 'Edit Dashboard'}
          </Button>

          {/* Add Widget */}
          {isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Widget
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {widgets.map((widget) => (
                  <DropdownMenuItem
                    key={widget.type}
                    onClick={() => handleAddWidget(widget)}
                  >
                    {widget.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Status */}
          {isDirty && (
            <span className="text-xs text-muted-foreground">
              {isSaving ? 'Saving...' : 'Unsaved changes'}
            </span>
          )}

          {/* Templates */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Templates
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {dashboardTemplates.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  onClick={() => handleLoadTemplate(template.id)}
                  className={selectedTemplate === template.id ? 'bg-accent' : ''}
                >
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {template.description}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportLayout}>
                <Download className="h-4 w-4 mr-2" />
                Export Layout
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImportLayout}>
                <Upload className="h-4 w-4 mr-2" />
                Import Layout
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={resetLayout}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Layout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Grid */}
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: cols, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={rowHeight}
        onLayoutChange={handleLayoutChange}
        isDraggable={isEditing}
        isResizable={isEditing}
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms={true}
        draggableHandle=".drag-handle"
      >
        {layout.map((item) => {
          const widgetConfig = getWidgetConfig(item.i);
          if (!widgetConfig) return null;

          const WidgetComponent = widgetConfig.component;

          return (
            <div key={item.i} data-grid={item}>
              <Card className="h-full flex flex-col overflow-hidden">
                {/* Widget Header */}
                {isEditing && (
                  <div className="flex items-center justify-between gap-2 p-2 border-b bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="drag-handle cursor-move">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">{widgetConfig.title}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveWidget(item.i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Widget Content */}
                <div className="flex-1 overflow-auto">
                  <WidgetComponent
                    id={item.i}
                    onRemove={handleRemoveWidget}
                    isEditing={isEditing}
                  />
                </div>
              </Card>
            </div>
          );
        })}
      </ResponsiveGridLayout>

      {/* Empty State */}
      {layout.length === 0 && (
        <Card className="p-12 text-center">
          <LayoutGrid className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Widgets</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add widgets to customize your dashboard
          </p>
          {isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Widget
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {widgets.map((widget) => (
                  <DropdownMenuItem
                    key={widget.type}
                    onClick={() => handleAddWidget(widget)}
                  >
                    {widget.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </Card>
      )}

      {/* Grid Styles */}
      <style>{`
        .react-grid-layout {
          position: relative;
        }
        
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }
        
        .react-grid-item.cssTransforms {
          transition-property: transform, width, height;
        }
        
        .react-grid-item.resizing {
          transition: none;
          z-index: 100;
        }
        
        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 100;
        }
        
        .react-grid-item.dropping {
          visibility: hidden;
        }
        
        .react-grid-item.react-grid-placeholder {
          background: hsl(var(--primary) / 0.2);
          opacity: 0.2;
          transition-duration: 100ms;
          z-index: 2;
          border-radius: 0.5rem;
        }
        
        .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
        }
        
        .react-resizable-handle-se {
          bottom: 0;
          right: 0;
          cursor: se-resize;
        }
        
        .react-resizable-handle-se::after {
          content: '';
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 5px;
          height: 5px;
          border-right: 2px solid hsl(var(--border));
          border-bottom: 2px solid hsl(var(--border));
        }
      `}</style>
    </div>
  );
}
