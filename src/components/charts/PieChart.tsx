import React, { useState } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Sector,
  TooltipProps,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pie chart data point
 */
export interface PieChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

/**
 * Pie chart props
 */
interface PieChartProps {
  title?: string;
  description?: string;
  data: PieChartDataPoint[];
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  showPercentage?: boolean;
  variant?: 'pie' | 'donut';
  height?: number;
  loading?: boolean;
  error?: string;
  onExport?: (format: 'csv' | 'png' | 'svg') => void;
  onSliceClick?: (data: PieChartDataPoint, index: number) => void;
  className?: string;
}

/**
 * Default colors
 */
const DEFAULT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

/**
 * Custom tooltip
 */
function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const total = payload[0].payload.percent ? 100 : data.value;
  const percentage = payload[0].payload.percent || ((data.value as number / total) * 100);

  return (
    <Card className="p-3 shadow-lg border-2">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.payload.fill }}
          />
          <span className="text-sm font-semibold">{data.name}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Value: <span className="font-medium text-foreground">{data.value}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Percentage: <span className="font-medium text-foreground">{percentage.toFixed(2)}%</span>
        </div>
      </div>
    </Card>
  );
}

/**
 * Active shape for pie
 */
const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props;

  return (
    <g>
      <text x={cx} y={cy} dy={-10} textAnchor="middle" fill={fill} className="text-sm font-semibold">
        {payload.name}
      </text>
      <text x={cx} y={cy} dy={15} textAnchor="middle" fill="hsl(var(--muted-foreground))" className="text-xs">
        {value}
      </text>
      <text x={cx} y={cy} dy={35} textAnchor="middle" fill="hsl(var(--muted-foreground))" className="text-xs">
        {`${(percent * 100).toFixed(2)}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

/**
 * Custom label for pie slices
 */
const renderLabel = (entry: any) => {
  return `${entry.name} (${entry.value})`;
};

const renderPercentageLabel = (entry: any) => {
  return `${(entry.percent * 100).toFixed(2)}%`;
};

/**
 * Pie/Donut chart component with interactive slices
 */
export function PieChart({
  title,
  description,
  data,
  colors = DEFAULT_COLORS,
  innerRadius = 0,
  outerRadius = 80,
  showLegend = true,
  showLabels = false,
  showPercentage = false,
  variant = 'pie',
  height = 400,
  loading = false,
  error,
  onExport,
  onSliceClick,
  className,
}: PieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Calculate inner radius based on variant
  const calculatedInnerRadius = variant === 'donut' ? outerRadius * 0.6 : innerRadius;

  // Export to CSV
  const exportToCSV = () => {
    if (onExport) {
      onExport('csv');
      return;
    }

    const headers = ['name', 'value'];
    const rows = data.map((point) => `${point.name},${point.value}`);
    const csv = [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title?.toLowerCase().replace(/\s+/g, '-') || 'chart'}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate total for percentage
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

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
              <RechartsPieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={calculatedInnerRadius}
                  outerRadius={outerRadius}
                  dataKey="value"
                  nameKey="name"
                  label={showLabels ? (showPercentage ? renderPercentageLabel : renderLabel) : false}
                  labelLine={showLabels}
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                  onClick={(data, index) => onSliceClick?.(data, index)}
                  cursor={onSliceClick ? 'pointer' : 'default'}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || colors[index % colors.length]}
                    />
                  ))}
                </Pie>

                <Tooltip content={<CustomTooltip />} />

                {showLegend && (
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: 12 }}
                    iconType="circle"
                  />
                )}
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        )}

        {variant === 'donut' && !loading && !error && (
          <div className="text-center mt-2">
            <div className="text-2xl font-bold">{total.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
