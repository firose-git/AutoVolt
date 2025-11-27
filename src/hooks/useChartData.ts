import { useState, useEffect, useCallback } from 'react';

/**
 * Chart data point (generic)
 */
export interface ChartDataPoint {
  [key: string]: string | number | undefined;
}

/**
 * Chart data options
 */
interface UseChartDataOptions<T extends ChartDataPoint> {
  /**
   * Initial data
   */
  initialData?: T[];
  
  /**
   * Auto-refresh interval (ms)
   */
  refreshInterval?: number;
  
  /**
   * Data fetcher function
   */
  fetcher?: () => Promise<T[]>;
  
  /**
   * Transform function for data
   */
  transform?: (data: T[]) => T[];
  
  /**
   * Filter function for data
   */
  filter?: (data: T[]) => T[];
  
  /**
   * Sort function for data
   */
  sort?: (a: T, b: T) => number;
}

/**
 * Hook for managing chart data with auto-refresh
 */
export function useChartData<T extends ChartDataPoint = ChartDataPoint>(
  options: UseChartDataOptions<T> = {}
) {
  const {
    initialData = [],
    refreshInterval,
    fetcher,
    transform,
    filter,
    sort,
  } = options;

  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!fetcher) return;

    setLoading(true);
    setError(null);

    try {
      let result = await fetcher();

      // Apply transformations
      if (transform) result = transform(result);
      if (filter) result = filter(result);
      if (sort) result = result.sort(sort);

      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [fetcher, transform, filter, sort]);

  // Initial fetch
  useEffect(() => {
    if (fetcher) {
      fetchData();
    }
  }, [fetchData, fetcher]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval || !fetcher) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetcher, fetchData]);

  // Manual refresh
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Update data manually
  const updateData = useCallback((newData: T[] | ((prev: T[]) => T[])) => {
    setData(newData);
    setLastUpdated(new Date());
  }, []);

  // Add data point
  const addDataPoint = useCallback((point: T) => {
    setData((prev) => [...prev, point]);
    setLastUpdated(new Date());
  }, []);

  // Remove data point
  const removeDataPoint = useCallback((predicate: (point: T) => boolean) => {
    setData((prev) => prev.filter((point) => !predicate(point)));
    setLastUpdated(new Date());
  }, []);

  // Update data point
  const updateDataPoint = useCallback(
    (predicate: (point: T) => boolean, updates: Partial<T>) => {
      setData((prev) =>
        prev.map((point) => (predicate(point) ? { ...point, ...updates } : point))
      );
      setLastUpdated(new Date());
    },
    []
  );

  // Get data slice
  const getSlice = useCallback(
    (start: number, end: number) => {
      return data.slice(start, end);
    },
    [data]
  );

  // Get latest N points
  const getLatest = useCallback(
    (count: number) => {
      return data.slice(-count);
    },
    [data]
  );

  // Calculate statistics
  const getStats = useCallback(
    (key: keyof T) => {
      const rawValues = data.map((point) => point[key]);
      const values = rawValues.filter((val) => typeof val === 'number') as number[];

      if (values.length === 0) {
        return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
      }

      const sum = values.reduce((acc, val) => acc + val, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      return { min, max, avg, sum, count: values.length };
    },
    [data]
  );

  return {
    // State
    data,
    loading,
    error,
    lastUpdated,

    // Actions
    refresh,
    updateData,
    addDataPoint,
    removeDataPoint,
    updateDataPoint,

    // Utilities
    getSlice,
    getLatest,
    getStats,
  };
}

/**
 * Generate mock time-series data
 */
export function generateTimeSeriesData(
  count: number,
  baseValue: number,
  variance: number,
  timeUnit: 'hour' | 'day' | 'week' | 'month' = 'day'
): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now);
    
    switch (timeUnit) {
      case 'hour':
        date.setHours(date.getHours() - i);
        break;
      case 'day':
        date.setDate(date.getDate() - i);
        break;
      case 'week':
        date.setDate(date.getDate() - i * 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - i);
        break;
    }

    const value = baseValue + (Math.random() - 0.5) * variance;

    data.push({
      name: formatDate(date, timeUnit),
      value: Math.round(value * 100) / 100,
      timestamp: date.getTime(),
    });
  }

  return data;
}

/**
 * Format date for display
 */
function formatDate(date: Date, unit: 'hour' | 'day' | 'week' | 'month'): string {
  switch (unit) {
    case 'hour':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    case 'day':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'week':
      return `Week ${getWeekNumber(date)}`;
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
}

/**
 * Get week number
 */
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Aggregate data by time period
 */
export function aggregateData<T extends ChartDataPoint>(
  data: T[],
  groupBy: 'hour' | 'day' | 'week' | 'month',
  aggregateKeys: string[],
  aggregateFunction: 'sum' | 'avg' | 'min' | 'max' = 'sum'
): T[] {
  const groups = new Map<string, T[]>();

  // Group data
  data.forEach((point) => {
    const timestamp = point.timestamp as number;
    if (!timestamp) return;

    const date = new Date(timestamp);
    const key = formatDate(date, groupBy);

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(point);
  });

  // Aggregate groups
  const result: T[] = [];
  groups.forEach((group, name) => {
    const aggregated: any = { name };

    aggregateKeys.forEach((key) => {
      const values = group
        .map((point) => point[key])
        .filter((val): val is number => typeof val === 'number');

      if (values.length === 0) {
        aggregated[key] = 0;
        return;
      }

      switch (aggregateFunction) {
        case 'sum':
          aggregated[key] = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'avg':
          aggregated[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'min':
          aggregated[key] = Math.min(...values);
          break;
        case 'max':
          aggregated[key] = Math.max(...values);
          break;
      }
    });

    result.push(aggregated as T);
  });

  return result;
}
