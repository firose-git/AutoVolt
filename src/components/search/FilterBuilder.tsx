import React, { useState } from 'react';
import { FilterCondition, SearchOperator } from '@/hooks/useSearch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Field definition for filter builder
 */
export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: { label: string; value: any }[];
}

/**
 * Filter builder props
 */
interface FilterBuilderProps<T = any> {
  /**
   * Available fields
   */
  fields: FilterField[];
  
  /**
   * Current filters
   */
  filters: FilterCondition<T>[];
  
  /**
   * On filter add
   */
  onAdd: (filter: FilterCondition<T>) => void;
  
  /**
   * On filter remove
   */
  onRemove: (index: number) => void;
  
  /**
   * On filter update
   */
  onUpdate: (index: number, updates: Partial<FilterCondition<T>>) => void;
  
  /**
   * On clear all
   */
  onClear: () => void;
  
  /**
   * ClassName
   */
  className?: string;
}

/**
 * Operator options
 */
const OPERATORS: Array<{
  value: string;
  label: string;
  types: Array<'text' | 'number' | 'date' | 'select' | 'boolean'>;
}> = [
  { value: 'equals', label: 'Equals', types: ['text', 'number', 'date', 'select', 'boolean'] },
  { value: 'contains', label: 'Contains', types: ['text'] },
  { value: 'startsWith', label: 'Starts with', types: ['text'] },
  { value: 'endsWith', label: 'Ends with', types: ['text'] },
  { value: 'gt', label: 'Greater than', types: ['number', 'date'] },
  { value: 'lt', label: 'Less than', types: ['number', 'date'] },
  { value: 'gte', label: 'Greater than or equal', types: ['number', 'date'] },
  { value: 'lte', label: 'Less than or equal', types: ['number', 'date'] },
  { value: 'in', label: 'In list', types: ['text', 'number', 'select'] },
  { value: 'between', label: 'Between', types: ['number', 'date'] },
];

/**
 * Logic operators
 */
const LOGIC_OPERATORS: { value: SearchOperator; label: string }[] = [
  { value: 'AND', label: 'AND' },
  { value: 'OR', label: 'OR' },
  { value: 'NOT', label: 'NOT' },
];

/**
 * Filter builder component for advanced filtering
 */
export function FilterBuilder<T = any>({
  fields,
  filters,
  onAdd,
  onRemove,
  onUpdate,
  onClear,
  className,
}: FilterBuilderProps<T>) {
  const [newFilter, setNewFilter] = useState<Partial<FilterCondition<T>>>({
    field: fields[0]?.key,
    operator: 'equals',
    value: '',
    logic: 'AND',
  });

  // Get field by key
  const getField = (key: string) => fields.find((f) => f.key === key);

  // Get available operators for field
  const getOperators = (fieldKey: string) => {
    const field = getField(fieldKey);
    if (!field) return [];
    return OPERATORS.filter((op) => op.types.includes(field.type));
  };

  // Handle add filter
  const handleAdd = () => {
    if (newFilter.field && newFilter.operator && newFilter.value !== '') {
      onAdd(newFilter as FilterCondition<T>);
      setNewFilter({
        field: fields[0]?.key,
        operator: 'equals',
        value: '',
        logic: 'AND',
      });
    }
  };

  // Render value input based on field type
  const renderValueInput = (field: FilterField, value: any, onChange: (value: any) => void) => {
    switch (field.type) {
      case 'select':
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'boolean':
        return (
          <Select value={String(value)} onValueChange={(v) => onChange(v === 'true')}>
            <SelectTrigger>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder="Enter value"
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Select date"
          />
        );

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter value"
          />
        );
    }
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Filters
            </CardTitle>
            <CardDescription>Build complex filter queries</CardDescription>
          </div>
          {filters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active filters */}
        {filters.length > 0 && (
          <div className="space-y-2">
            {filters.map((filter, index) => {
              const field = getField(filter.field as string);
              if (!field) return null;

              return (
                <div key={index} className="flex items-center gap-2">
                  {/* Logic operator (for filters after first) */}
                  {index > 0 && (
                    <Select
                      value={filters[index - 1].logic || 'AND'}
                      onValueChange={(value) =>
                        onUpdate(index - 1, { logic: value as SearchOperator })
                      }
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOGIC_OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Filter badge */}
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-2">
                    <span className="font-semibold">{field.label}</span>
                    <span className="text-muted-foreground">
                      {OPERATORS.find((op) => op.value === filter.operator)?.label}
                    </span>
                    <span className="font-medium">{String(filter.value)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1"
                      onClick={() => onRemove(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* Add new filter */}
        <div className="grid gap-3 p-4 border rounded-lg bg-muted/50">
          <div className="grid gap-2">
            <Label htmlFor="field">Field</Label>
            <Select
              value={newFilter.field as string}
              onValueChange={(value) =>
                setNewFilter({ ...newFilter, field: value, operator: 'equals' })
              }
            >
              <SelectTrigger id="field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fields.map((field) => (
                  <SelectItem key={field.key} value={field.key}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="operator">Operator</Label>
            <Select
              value={newFilter.operator}
              onValueChange={(value) => setNewFilter({ ...newFilter, operator: value as any })}
            >
              <SelectTrigger id="operator">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getOperators(newFilter.field as string).map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="value">Value</Label>
            {newFilter.field &&
              renderValueInput(
                getField(newFilter.field as string)!,
                newFilter.value,
                (value) => setNewFilter({ ...newFilter, value })
              )}
          </div>

          <Button onClick={handleAdd} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Filter
          </Button>
        </div>

        {/* Filter summary */}
        {filters.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {filters.length} {filters.length === 1 ? 'filter' : 'filters'} active
          </div>
        )}
      </CardContent>
    </Card>
  );
}
