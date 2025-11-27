import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, Clock, Save, Trash2, Loader2 } from 'lucide-react';
import { SavedSearch } from '@/hooks/useSearch';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

/**
 * Advanced search props
 */
interface AdvancedSearchProps {
  /**
   * Current query
   */
  query: string;
  
  /**
   * On query change
   */
  onQueryChange: (query: string) => void;
  
  /**
   * Search history
   */
  history?: string[];
  
  /**
   * Saved searches
   */
  savedSearches?: SavedSearch[];
  
  /**
   * On load saved search
   */
  onLoadSearch?: (search: SavedSearch) => void;
  
  /**
   * On save current search
   */
  onSaveSearch?: (name: string) => void;
  
  /**
   * On delete saved search
   */
  onDeleteSearch?: (id: string) => void;
  
  /**
   * Is searching
   */
  isSearching?: boolean;
  
  /**
   * Placeholder
   */
  placeholder?: string;
  
  /**
   * Show suggestions
   */
  showSuggestions?: boolean;
  
  /**
   * Suggestions (autocomplete)
   */
  suggestions?: string[];
  
  /**
   * className
   */
  className?: string;
}

/**
 * Advanced search component with autocomplete and saved searches
 */
export function AdvancedSearch({
  query,
  onQueryChange,
  history = [],
  savedSearches = [],
  onLoadSearch,
  onSaveSearch,
  onDeleteSearch,
  isSearching = false,
  placeholder = 'Search...',
  showSuggestions = true,
  suggestions = [],
  className,
}: AdvancedSearchProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowHistory(false);
        setShowSaved(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle clear
  const handleClear = () => {
    onQueryChange('');
    inputRef.current?.focus();
  };

  // Handle save
  const handleSave = () => {
    if (searchName.trim() && onSaveSearch) {
      onSaveSearch(searchName.trim());
      setSearchName('');
      setSaveDialogOpen(false);
    }
  };

  // Combine suggestions and history
  const allSuggestions = [
    ...suggestions.slice(0, 5),
    ...history.filter((h) => !suggestions.includes(h)).slice(0, 5),
  ];

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setShowHistory(true)}
          placeholder={placeholder}
          className="pl-10 pr-24"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {query && !isSearching && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleClear}
              title="Clear"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          {query && onSaveSearch && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSaveDialogOpen(true)}
              title="Save search"
            >
              <Save className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && showHistory && (allSuggestions.length > 0 || savedSearches.length > 0) && (
        <Card className="absolute z-50 w-full mt-2 p-2 shadow-lg">
          <ScrollArea className="max-h-[300px]">
            {/* Suggestions */}
            {allSuggestions.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  Suggestions
                </div>
                {allSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full px-2 py-1.5 text-left text-sm rounded hover:bg-accent flex items-center gap-2"
                    onClick={() => {
                      onQueryChange(suggestion);
                      setShowHistory(false);
                    }}
                  >
                    {history.includes(suggestion) ? (
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Search className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Saved searches */}
            {savedSearches.length > 0 && (
              <div className="space-y-1 mt-2 pt-2 border-t">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Saved Searches</span>
                  <Badge variant="secondary" className="text-xs">
                    {savedSearches.length}
                  </Badge>
                </div>
                {savedSearches.slice(0, 5).map((search) => (
                  <div
                    key={search.id}
                    className="w-full px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center justify-between group"
                  >
                    <button
                      className="flex-1 text-left flex flex-col"
                      onClick={() => {
                        onLoadSearch?.(search);
                        setShowHistory(false);
                      }}
                    >
                      <span className="font-medium">{search.name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {search.query}
                        {search.filters.length > 0 && ` • ${search.filters.length} filters`}
                      </span>
                    </button>
                    {onDeleteSearch && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSearch(search.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      )}

      {/* Save dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Give your search a name to save it for later
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="e.g., Active Devices"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave();
                  }
                }}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <div>Current query: <span className="font-medium">{query}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!searchName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
