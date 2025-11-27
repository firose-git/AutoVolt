import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
  TooltipProps,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Bar chart data point
 */
export interface BarChartDataPoint {
  name: string;
  [key: string]: string | number | undefined;
}

/**
 * Bar configuration
 */
export interface BarConfig {
  dataKey: string;
  name?: string;
  color: string;
  stackId?: string;
  radius?: number | [number, number, number, number];
}

/**
 * Bar chart props
 */
interface BarChartProps {
  title?: string;
  description?: string;
  data: BarChartDataPoint[];
  bars: BarConfig[];
  xAxisKey?: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  showLabels?: boolean;
  layout?: 'horizontal' | 'vertical';
  stacked?: boolean;
  height?: number;
  loading?: boolean;
  error?: string;
  onExport?: (format: 'csv' | 'png' | 'svg') => void;
  onBarClick?: (data: BarChartDataPoint, index: number) => void;
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
                className="w-3 h-3 rounded"
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
 * Bar chart component with stacking and labels
 */
export function BarChart({
  title,
  description,
  data,
  bars,
  xAxisKey = 'name',
  yAxisLabel,
  xAxisLabel,
  showGrid = true,
  showLegend = true,
  showLabels = false,
  layout = 'horizontal',
  stacked = false,
  height = 400,
  loading = false,
  error,
  onExport,
  onBarClick,
  className,
}: BarChartProps) {
  // Export to CSV
  const exportToCSV = () => {
    if (onExport) {
      onExport('csv');
      return;
    }

    const headers = [xAxisKey, ...bars.map((bar) => bar.dataKey)];
    const rows = data.map((point) =>
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

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>
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
          <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={data}
                layout={layout}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                {showGrid && (
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    opacity={0.5}
                  />
                )}

                {layout === 'horizontal' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <XAxis
                      type="number"
                      label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      type="category"
                      dataKey={xAxisKey}
                      label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                  </>
                )}

                <Tooltip content={<CustomTooltip />} />

                {showLegend && (
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    iconType="rect"
                  />
                )}

                {bars.map((bar, index) => (
                  <Bar
                    key={bar.dataKey}
                    dataKey={bar.dataKey}
                    name={bar.name || bar.dataKey}
                    fill={bar.color}
                    stackId={stacked ? (bar.stackId || 'stack') : undefined}
                    radius={bar.radius || [4, 4, 0, 0]}
                    onClick={(data, idx) => onBarClick?.(data, idx)}
                    cursor={onBarClick ? 'pointer' : 'default'}
                  >
                    {showLabels && <LabelList dataKey={bar.dataKey} position="top" fontSize={11} />}
                  </Bar>
                ))}
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
