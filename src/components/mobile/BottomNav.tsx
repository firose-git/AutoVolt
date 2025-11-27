import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

/**
 * Bottom navigation item
 */
export interface BottomNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  onClick?: () => void;
}

/**
 * Bottom navigation props
 */
export interface BottomNavProps {
  /**
   * Navigation items (recommended: 3-5 items)
   */
  items: BottomNavItem[];

  /**
   * Show labels below icons
   * @default true
   */
  showLabels?: boolean;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Callback when item is clicked
   */
  onItemClick?: (item: BottomNavItem) => void;
}

/**
 * Bottom navigation component for mobile devices
 * Fixed to bottom with large touch targets (minimum 56px height)
 * Follows Material Design guidelines for bottom navigation
 */
export function BottomNav({
  items,
  showLabels = true,
  className,
  onItemClick,
}: BottomNavProps) {
  const location = useLocation();

  const handleClick = (item: BottomNavItem, e: React.MouseEvent) => {
    if (item.onClick) {
      e.preventDefault();
      item.onClick();
    }
    onItemClick?.(item);
  };

  return (
    <nav
      className={cn(
        'lg:hidden fixed bottom-0 left-0 right-0 z-50',
        'bg-background border-t',
        'safe-area-inset-bottom', // Support for devices with notches
        className
      )}
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          const content = (
            <div
              className={cn(
                'flex flex-col items-center justify-center gap-1',
                'min-w-[56px] min-h-[56px] px-3 py-2',
                'rounded-lg transition-all duration-200',
                'active:scale-95', // Touch feedback
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {/* Icon with badge */}
              <div className="relative">
                <Icon
                  className={cn(
                    'h-6 w-6 transition-all',
                    isActive && 'scale-110'
                  )}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      'absolute -top-1 -right-1',
                      'flex items-center justify-center',
                      'min-w-[18px] h-[18px] px-1',
                      'rounded-full text-[10px] font-bold',
                      'bg-destructive text-destructive-foreground',
                      'animate-in zoom-in-50'
                    )}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              {showLabels && (
                <span
                  className={cn(
                    'text-xs font-medium transition-all',
                    isActive && 'scale-105'
                  )}
                >
                  {item.label}
                </span>
              )}
            </div>
          );

          return item.onClick ? (
            <button
              key={item.label}
              type="button"
              onClick={(e) => handleClick(item, e)}
              className="flex-1 max-w-[120px]"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {content}
            </button>
          ) : (
            <Link
              key={item.href}
              to={item.href}
              onClick={(e) => handleClick(item, e)}
              className="flex-1 max-w-[120px]"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Bottom navigation with floating action button
 */
export interface BottomNavWithFabProps extends BottomNavProps {
  /**
   * Floating action button content
   */
  fab: {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
  };

  /**
   * FAB position in navigation
   * @default "center"
   */
  fabPosition?: 'left' | 'center' | 'right';
}

/**
 * Bottom navigation with centered FAB (5 items max)
 */
export function BottomNavWithFab({
  items,
  fab,
  fabPosition = 'center',
  showLabels = true,
  className,
  onItemClick,
}: BottomNavWithFabProps) {
  const location = useLocation();

  const handleClick = (item: BottomNavItem, e: React.MouseEvent) => {
    if (item.onClick) {
      e.preventDefault();
      item.onClick();
    }
    onItemClick?.(item);
  };

  // Split items based on FAB position
  const getFabIndex = () => {
    if (fabPosition === 'left') return 0;
    if (fabPosition === 'right') return items.length;
    return Math.floor(items.length / 2);
  };

  const fabIndex = getFabIndex();
  const leftItems = items.slice(0, fabIndex);
  const rightItems = items.slice(fabIndex);

  const FabIcon = fab.icon;

  return (
    <nav
      className={cn(
        'lg:hidden fixed bottom-0 left-0 right-0 z-50',
        'bg-background border-t',
        'safe-area-inset-bottom',
        className
      )}
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around h-16 relative">
        {/* Left items */}
        {leftItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={(e) => handleClick(item, e)}
              className="flex-1 max-w-[100px]"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={cn(
                  'flex flex-col items-center justify-center gap-1',
                  'min-h-[56px] px-2 py-2 rounded-lg transition-all',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('h-6 w-6', isActive && 'scale-110')} />
                {showLabels && (
                  <span className="text-xs font-medium">{item.label}</span>
                )}
              </div>
            </Link>
          );
        })}

        {/* Floating Action Button */}
        <div className="flex-1 max-w-[100px] flex justify-center">
          <button
            type="button"
            onClick={fab.onClick}
            className={cn(
              'absolute -top-6',
              'w-14 h-14 rounded-full',
              'bg-primary text-primary-foreground',
              'shadow-lg hover:shadow-xl',
              'flex items-center justify-center',
              'transition-all duration-200',
              'active:scale-95'
            )}
            aria-label={fab.label}
          >
            <FabIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Right items */}
        {rightItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={(e) => handleClick(item, e)}
              className="flex-1 max-w-[100px]"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={cn(
                  'flex flex-col items-center justify-center gap-1',
                  'min-h-[56px] px-2 py-2 rounded-lg transition-all',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('h-6 w-6', isActive && 'scale-110')} />
                {showLabels && (
                  <span className="text-xs font-medium">{item.label}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
