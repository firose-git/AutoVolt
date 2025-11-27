import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  LayoutDashboard,
  Zap,
  Bell,
  Settings,
  Menu,
  X,
  LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Mobile navigation item
 */
export interface MobileNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

/**
 * Mobile navigation props
 */
export interface MobileNavProps {
  /**
   * Navigation items
   */
  items?: MobileNavItem[];

  /**
   * Application logo or brand
   */
  logo?: React.ReactNode;

  /**
   * Additional actions in header
   */
  actions?: React.ReactNode;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Callback when navigation item is clicked
   */
  onItemClick?: (item: MobileNavItem) => void;
}

/**
 * Default navigation items
 */
const defaultItems: MobileNavItem[] = [
  {
    label: 'Home',
    href: '/',
    icon: Home,
  },
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Devices',
    href: '/devices',
    icon: Zap,
  },
  {
    label: 'Notifications',
    href: '/notifications',
    icon: Bell,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

/**
 * Mobile navigation component with slide-in menu
 * Optimized for touch devices with large tap targets
 */
export function MobileNav({
  items = defaultItems,
  logo,
  actions,
  className,
  onItemClick,
}: MobileNavProps) {
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleItemClick = (item: MobileNavItem) => {
    setIsOpen(false);
    onItemClick?.(item);
  };

  return (
    <div
      className={cn(
        'lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b',
        className
      )}
    >
      <div className="flex items-center justify-between h-16 px-4">
        {/* Menu button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="p-6 pb-4 border-b">
              <SheetTitle className="flex items-center gap-3">
                {logo || (
                  <>
                    <Zap className="h-6 w-6 text-primary" />
                    <span className="text-xl font-bold">AutoVolt</span>
                  </>
                )}
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="h-[calc(100vh-80px)]">
              <nav className="p-4 space-y-2">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => handleItemClick(item)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                        'min-h-[48px]', // Minimum touch target size
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted active:bg-muted/80'
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="font-medium">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={cn(
                            'ml-auto px-2 py-0.5 rounded-full text-xs font-semibold',
                            isActive
                              ? 'bg-primary-foreground text-primary'
                              : 'bg-primary text-primary-foreground'
                          )}
                        >
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Logo/Brand (center) */}
        {logo && <div className="flex-1 flex justify-center">{logo}</div>}

        {/* Actions (right) */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/**
 * Mobile navigation with custom render
 */
export interface MobileNavCustomProps {
  /**
   * Render function for menu content
   */
  children: (closeMenu: () => void) => React.ReactNode;

  /**
   * Trigger button content
   */
  trigger?: React.ReactNode;

  /**
   * Logo or brand
   */
  logo?: React.ReactNode;

  /**
   * Additional actions
   */
  actions?: React.ReactNode;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Sheet side
   * @default "left"
   */
  side?: 'left' | 'right';
}

/**
 * Mobile navigation with custom content
 */
export function MobileNavCustom({
  children,
  trigger,
  logo,
  actions,
  className,
  side = 'left',
}: MobileNavCustomProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <div
      className={cn(
        'lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b',
        className
      )}
    >
      <div className="flex items-center justify-between h-16 px-4">
        {/* Menu button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            {trigger || (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            )}
          </SheetTrigger>
          <SheetContent side={side} className="w-[280px] p-0">
            {children(closeMenu)}
          </SheetContent>
        </Sheet>

        {/* Logo/Brand (center) */}
        {logo && <div className="flex-1 flex justify-center">{logo}</div>}

        {/* Actions (right) */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
