import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WidgetProps } from '@/components/DashboardGrid';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Stats widget data
 */
export interface StatsWidgetData {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  comparison?: {
    current: number;
    previous: number;
    label: string;
  };
  icon?: React.ReactNode;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

/**
 * Stats widget component
 */
export function StatsWidget({
  title,
  value,
  description,
  trend,
  comparison,
  icon,
  color = 'default',
}: StatsWidgetData & Pick<WidgetProps, 'isEditing'>) {
  // Calculate trend color
  const trendColor = trend
    ? trend.direction === 'up'
      ? 'text-green-600 dark:text-green-400'
      : trend.direction === 'down'
      ? 'text-red-600 dark:text-red-400'
      : 'text-gray-600 dark:text-gray-400'
    : '';

  // Calculate comparison percentage
  const comparisonPercent = comparison
    ? ((comparison.current - comparison.previous) / comparison.previous) * 100
    : null;

  const comparisonDirection =
    comparisonPercent !== null
      ? comparisonPercent > 0
        ? 'up'
        : comparisonPercent < 0
        ? 'down'
        : 'neutral'
      : null;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}

        {/* Trend */}
        {trend && (
          <div className={cn('flex items-center gap-1 text-xs mt-2', trendColor)}>
            {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
            {trend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
            {trend.direction === 'neutral' && <Minus className="h-3 w-3" />}
            <span className="font-medium">{trend.value}%</span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}

        {/* Comparison */}
        {comparison && (
          <div className="flex items-center gap-2 text-xs mt-2 text-muted-foreground">
            <span>{comparison.previous}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="font-medium">{comparison.current}</span>
            {comparisonPercent !== null && (
              <span
                className={cn(
                  'font-medium',
                  comparisonDirection === 'up' && 'text-green-600 dark:text-green-400',
                  comparisonDirection === 'down' && 'text-red-600 dark:text-red-400'
                )}
              >
                ({comparisonPercent > 0 ? '+' : ''}
                {comparisonPercent.toFixed(2)}%)
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Device stats widget
 */
export function DeviceStatsWidget(props: WidgetProps) {
  // Mock data - replace with real data
  const data: StatsWidgetData = {
    title: 'Active Devices',
    value: '124',
    description: 'Currently online',
    trend: {
      value: 12.5,
      label: 'vs last week',
      direction: 'up',
    },
    comparison: {
      current: 124,
      previous: 110,
      label: 'Weekly change',
    },
  };

  return <StatsWidget {...data} {...props} />;
}

/**
 * Energy stats widget
 */
export function EnergyStatsWidget(props: WidgetProps) {
  const data: StatsWidgetData = {
    title: 'Energy Consumption',
    value: '2,847 kWh',
    description: 'This month',
    trend: {
      value: 8.2,
      label: 'vs last month',
      direction: 'down',
    },
  };

  return <StatsWidget {...data} {...props} />;
}

/**
 * Alerts stats widget
 */
export function AlertsStatsWidget(props: WidgetProps) {
  const data: StatsWidgetData = {
    title: 'Active Alerts',
    value: '7',
    description: '2 critical, 5 warnings',
    trend: {
      value: 0,
      label: 'No change',
      direction: 'neutral',
    },
  };

  return <StatsWidget {...data} {...props} />;
}

/**
 * Temperature stats widget
 */
export function TemperatureStatsWidget(props: WidgetProps) {
  const data: StatsWidgetData = {
    title: 'Avg Temperature',
    value: '23.5°C',
    description: 'Across all devices',
    trend: {
      value: 2.1,
      label: 'vs yesterday',
      direction: 'up',
    },
  };

  return <StatsWidget {...data} {...props} />;
}

/**
 * Uptime stats widget
 */
export function UptimeStatsWidget(props: WidgetProps) {
  const data: StatsWidgetData = {
    title: 'System Uptime',
    value: '99.8%',
    description: 'Last 30 days',
    trend: {
      value: 0.2,
      label: 'vs last month',
      direction: 'up',
    },
  };

  return <StatsWidget {...data} {...props} />;
}

/**
 * Response time stats widget
 */
export function ResponseTimeStatsWidget(props: WidgetProps) {
  const data: StatsWidgetData = {
    title: 'Avg Response Time',
    value: '142ms',
    description: 'Last 24 hours',
    trend: {
      value: 5.3,
      label: 'faster than yesterday',
      direction: 'down',
    },
  };

  return <StatsWidget {...data} {...props} />;
}
