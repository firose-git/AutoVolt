import React from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  TooltipProps,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Area chart data point
 */
export interface AreaChartDataPoint {
  name: string;
  [key: string]: string | number | undefined;
}

/**
 * Area configuration
 */
export interface AreaConfig {
  dataKey: string;
  name?: string;
  color: string;
  fillOpacity?: number;
  strokeWidth?: number;
  stackId?: string;
  type?: 'monotone' | 'linear' | 'step' | 'stepBefore' | 'stepAfter';
}

/**
 * Area chart props
 */
interface AreaChartProps {
  title?: string;
  description?: string;
  data: AreaChartDataPoint[];
  areas: AreaConfig[];
  xAxisKey?: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  showBrush?: boolean;
  stacked?: boolean;
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
 * Area chart component with stacking and gradient fills
 */
export function AreaChart({
  title,
  description,
  data,
  areas,
  xAxisKey = 'name',
  yAxisLabel,
  xAxisLabel,
  showGrid = true,
  showLegend = true,
  showBrush = false,
  stacked = false,
  height = 400,
  loading = false,
  error,
  onExport,
  className,
}: AreaChartProps) {
  // Export to CSV
  const exportToCSV = () => {
    if (onExport) {
      onExport('csv');
      return;
    }

    const headers = [xAxisKey, ...areas.map((area) => area.dataKey)];
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
              <RechartsAreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  {areas.map((area, index) => (
                    <linearGradient
                      key={`gradient-${index}`}
                      id={`gradient-${area.dataKey}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={area.color}
                        stopOpacity={area.fillOpacity || 0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor={area.color}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  ))}
                </defs>

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
                    iconType="rect"
                  />
                )}

                {showBrush && (
                  <Brush
                    dataKey={xAxisKey}
                    height={30}
                    stroke="hsl(var(--primary))"
                  />
                )}

                {areas.map((area) => (
                  <Area
                    key={area.dataKey}
                    type={area.type || 'monotone'}
                    dataKey={area.dataKey}
                    name={area.name || area.dataKey}
                    stroke={area.color}
                    strokeWidth={area.strokeWidth || 2}
                    fill={`url(#gradient-${area.dataKey})`}
                    fillOpacity={1}
                    stackId={stacked ? (area.stackId || 'stack') : undefined}
                  />
                ))}
              </RechartsAreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
