import { useState, useEffect, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { useDebounce } from 'use-debounce';

/**
 * Search operator types
 */
export type SearchOperator = 'AND' | 'OR' | 'NOT';

/**
 * Filter condition
 */
export interface FilterCondition<T = any> {
  field: keyof T | string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between';
  value: any;
  logic?: SearchOperator;
}

/**
 * Saved search
 */
export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: FilterCondition[];
  timestamp: number;
}

/**
 * Search options
 */
interface UseSearchOptions<T> {
  /**
   * Data to search
   */
  data: T[];
  
  /**
   * Fields to search in (for fuzzy search)
   */
  searchKeys?: string[];
  
  /**
   * Fuzzy search threshold (0.0 = exact, 1.0 = match anything)
   */
  threshold?: number;
  
  /**
   * Debounce delay in ms
   */
  debounceDelay?: number;
  
  /**
   * Enable fuzzy search
   */
  enableFuzzy?: boolean;
  
  /**
   * Storage key for saved searches
   */
  storageKey?: string;
  
  /**
   * Max saved searches
   */
  maxSavedSearches?: number;
  
  /**
   * Max search history
   */
  maxHistory?: number;
}

/**
 * Advanced search hook with fuzzy search, filters, and saved searches
 */
export function useSearch<T extends Record<string, any>>(options: UseSearchOptions<T>) {
  const {
    data,
    searchKeys = [],
    threshold = 0.3,
    debounceDelay = 300,
    enableFuzzy = true,
    storageKey = 'search-state',
    maxSavedSearches = 10,
    maxHistory = 20,
  } = options;

  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, debounceDelay);
  const [filters, setFilters] = useState<FilterCondition<T>[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Initialize Fuse.js
  const fuse = useMemo(() => {
    if (!enableFuzzy || searchKeys.length === 0) return null;

    return new Fuse(data, {
      keys: searchKeys,
      threshold,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    });
  }, [data, searchKeys, threshold, enableFuzzy]);

  // Load saved state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const state = JSON.parse(saved);
        setSavedSearches(state.savedSearches || []);
        setSearchHistory(state.searchHistory || []);
      }
    } catch (error) {
      console.error('Failed to load search state:', error);
    }
  }, [storageKey]);

  // Save state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          savedSearches,
          searchHistory,
        })
      );
    } catch (error) {
      console.error('Failed to save search state:', error);
    }
  }, [savedSearches, searchHistory, storageKey]);

  // Apply filters to data
  const applyFilters = useCallback((items: T[]): T[] => {
    if (filters.length === 0) return items;

    return items.filter((item) => {
      let result = true;

      filters.forEach((filter, index) => {
        const value = item[filter.field as keyof T];
        let conditionMet = false;

        switch (filter.operator) {
          case 'equals':
            conditionMet = value === filter.value;
            break;
          case 'contains':
            conditionMet = String(value).toLowerCase().includes(String(filter.value).toLowerCase());
            break;
          case 'startsWith':
            conditionMet = String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
            break;
          case 'endsWith':
            conditionMet = String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
            break;
          case 'gt':
            conditionMet = value > filter.value;
            break;
          case 'lt':
            conditionMet = value < filter.value;
            break;
          case 'gte':
            conditionMet = value >= filter.value;
            break;
          case 'lte':
            conditionMet = value <= filter.value;
            break;
          case 'in':
            conditionMet = Array.isArray(filter.value) && filter.value.includes(value);
            break;
          case 'between':
            conditionMet =
              Array.isArray(filter.value) &&
              filter.value.length === 2 &&
              value >= filter.value[0] &&
              value <= filter.value[1];
            break;
        }

        // Apply logic operator
        if (index === 0) {
          result = conditionMet;
        } else {
          const logic = filters[index - 1].logic || 'AND';
          if (logic === 'AND') {
            result = result && conditionMet;
          } else if (logic === 'OR') {
            result = result || conditionMet;
          } else if (logic === 'NOT') {
            result = result && !conditionMet;
          }
        }
      });

      return result;
    });
  }, [filters]);

  // Perform search
  const results = useMemo(() => {
    setIsSearching(true);

    let filtered = data;

    // Apply filters first
    filtered = applyFilters(filtered);

    // Apply search query
    if (debouncedQuery.trim()) {
      if (enableFuzzy && fuse) {
        // Fuzzy search
        const fuseResults = fuse.search(debouncedQuery);
        filtered = fuseResults.map((result) => result.item);
      } else {
        // Simple search
        filtered = filtered.filter((item) =>
          searchKeys.some((key) =>
            String(item[key]).toLowerCase().includes(debouncedQuery.toLowerCase())
          )
        );
      }
    }

    setIsSearching(false);
    return filtered;
  }, [data, debouncedQuery, filters, enableFuzzy, fuse, searchKeys, applyFilters]);

  // Add filter
  const addFilter = useCallback((filter: FilterCondition<T>) => {
    setFilters((prev) => [...prev, filter]);
  }, []);

  // Remove filter
  const removeFilter = useCallback((index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Update filter
  const updateFilter = useCallback((index: number, updates: Partial<FilterCondition<T>>) => {
    setFilters((prev) =>
      prev.map((filter, i) => (i === index ? { ...filter, ...updates } : filter))
    );
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  // Save current search
  const saveSearch = useCallback(
    (name: string) => {
      const search: SavedSearch = {
        id: `search-${Date.now()}`,
        name,
        query,
        filters: filters.map((f) => ({ ...f })),
        timestamp: Date.now(),
      };

      setSavedSearches((prev) => {
        const updated = [search, ...prev].slice(0, maxSavedSearches);
        return updated;
      });
    },
    [query, filters, maxSavedSearches]
  );

  // Load saved search
  const loadSearch = useCallback((search: SavedSearch) => {
    setQuery(search.query);
    setFilters(search.filters as FilterCondition<T>[]);
  }, []);

  // Delete saved search
  const deleteSearch = useCallback((id: string) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Add to history
  useEffect(() => {
    if (debouncedQuery.trim() && !searchHistory.includes(debouncedQuery)) {
      setSearchHistory((prev) => [debouncedQuery, ...prev].slice(0, maxHistory));
    }
  }, [debouncedQuery, searchHistory, maxHistory]);

  // Clear history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);

  // Reset all
  const reset = useCallback(() => {
    setQuery('');
    setFilters([]);
  }, []);

  return {
    // State
    query,
    filters,
    results,
    isSearching: isSearching || query !== debouncedQuery,
    savedSearches,
    searchHistory,

    // Query actions
    setQuery,
    
    // Filter actions
    addFilter,
    removeFilter,
    updateFilter,
    clearFilters,
    
    // Saved search actions
    saveSearch,
    loadSearch,
    deleteSearch,
    
    // History actions
    clearHistory,
    
    // Utilities
    reset,
    hasActiveFilters: filters.length > 0,
    hasResults: results.length > 0,
    resultCount: results.length,
    totalCount: data.length,
  };
}
