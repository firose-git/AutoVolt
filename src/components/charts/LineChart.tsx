import React, { useState, useRef } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceArea,
  ReferenceLine,
  TooltipProps,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Line chart data point
 */
export interface LineChartDataPoint {
  name: string;
  [key: string]: string | number | undefined;
}

/**
 * Line configuration
 */
export interface LineConfig {
  dataKey: string;
  name?: string;
  color: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  dot?: boolean;
  activeDot?: boolean | object;
}

/**
 * Line chart props
 */
interface LineChartProps {
  title?: string;
  description?: string;
  data: LineChartDataPoint[];
  lines: LineConfig[];
  xAxisKey?: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  showBrush?: boolean;
  showZoom?: boolean;
  curved?: boolean;
  height?: number;
  loading?: boolean;
  error?: string;
  onExport?: (format: 'csv' | 'png' | 'svg') => void;
  className?: string;
}

/**
 * Custom tooltip
 */
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;

  return (
    <Card className="p-3 shadow-lg border-2">
      <p className="text-sm font-semibold mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}:</span>
            </span>
            <span className="font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Advanced line chart component with zoom and export
 */
export function LineChart({
  title,
  description,
  data,
  lines,
  xAxisKey = 'name',
  yAxisLabel,
  xAxisLabel,
  showGrid = true,
  showLegend = true,
  showBrush = false,
  showZoom = true,
  curved = true,
  height = 400,
  loading = false,
  error,
  onExport,
  className,
}: LineChartProps) {
  const [zoomArea, setZoomArea] = useState<{ left: string; right: string } | null>(null);
  const [refAreaLeft, setRefAreaLeft] = useState<string>('');
  const [refAreaRight, setRefAreaRight] = useState<string>('');
  const [zoomedData, setZoomedData] = useState(data);
  const chartRef = useRef<HTMLDivElement>(null);

  // Handle zoom
  const handleZoom = () => {
    if (refAreaLeft === refAreaRight || !refAreaRight) {
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    // Find indices
    const leftIndex = data.findIndex((item) => item[xAxisKey] === refAreaLeft);
    const rightIndex = data.findIndex((item) => item[xAxisKey] === refAreaRight);

    if (leftIndex === -1 || rightIndex === -1) return;

    const [startIndex, endIndex] = leftIndex < rightIndex 
      ? [leftIndex, rightIndex] 
      : [rightIndex, leftIndex];

    setZoomedData(data.slice(startIndex, endIndex + 1));
    setZoomArea({ left: refAreaLeft, right: refAreaRight });
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  // Reset zoom
  const handleZoomReset = () => {
    setZoomedData(data);
    setZoomArea(null);
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  // Export to CSV
  const exportToCSV = () => {
    if (onExport) {
      onExport('csv');
      return;
    }

    const headers = [xAxisKey, ...lines.map((line) => line.dataKey)];
    const rows = zoomedData.map((point) =>
      headers.map((key) => point[key] || '').join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title?.toLowerCase().replace(/\s+/g, '-') || 'chart'}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to SVG
  const exportToSVG = () => {
    if (onExport) {
      onExport('svg');
      return;
    }

    const svg = chartRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title?.toLowerCase().replace(/\s+/g, '-') || 'chart'}-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to PNG
  const exportToPNG = () => {
    if (onExport) {
      onExport('png');
      return;
    }

    const svg = chartRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${title?.toLowerCase().replace(/\s+/g, '-') || 'chart'}-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-1">
            {showZoom && zoomArea && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomReset}
                title="Reset zoom"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={exportToCSV}
              title="Export to CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading chart...</div>
          </div>
        )}

        {error && (
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        )}

        {!loading && !error && (
          <div ref={chartRef} className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart
                data={zoomedData}
                onMouseDown={(e) => showZoom && e && setRefAreaLeft(e.activeLabel || '')}
                onMouseMove={(e) => showZoom && refAreaLeft && e && setRefAreaRight(e.activeLabel || '')}
                onMouseUp={handleZoom}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                {showGrid && (
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    opacity={0.5}
                  />
                )}
                
                <XAxis
                  dataKey={xAxisKey}
                  label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                
                <YAxis
                  label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                {showLegend && (
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    iconType="line"
                  />
                )}

                {showBrush && (
                  <Brush
                    dataKey={xAxisKey}
                    height={30}
                    stroke="hsl(var(--primary))"
                  />
                )}

                {lines.map((line) => (
                  <Line
                    key={line.dataKey}
                    type={curved ? 'monotone' : 'linear'}
                    dataKey={line.dataKey}
                    name={line.name || line.dataKey}
                    stroke={line.color}
                    strokeWidth={line.strokeWidth || 2}
                    strokeDasharray={line.strokeDasharray}
                    dot={line.dot !== undefined ? line.dot : { r: 3 }}
                    activeDot={line.activeDot !== undefined ? line.activeDot : { r: 5 }}
                  />
                ))}

                {refAreaLeft && refAreaRight && (
                  <ReferenceArea
                    x1={refAreaLeft}
                    x2={refAreaRight}
                    strokeOpacity={0.3}
                    fill="hsl(var(--primary))"
                    fillOpacity={0.1}
                  />
                )}
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        )}

        {showZoom && zoomArea && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            Zoomed: {zoomArea.left} to {zoomArea.right}
          </div>
        )}

        {showZoom && !zoomArea && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            Drag to zoom • Click reset to restore
          </div>
        )}
      </CardContent>
    </Card>
  );
}
