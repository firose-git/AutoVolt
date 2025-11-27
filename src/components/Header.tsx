import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Wifi, WifiOff, Settings, LogOut, Home, Menu } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useDevices } from '@/hooks/useDevices';
import { navItems } from '@/nav-items';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Logo } from '@/components/Logo';
import { NotificationDropdown } from '@/components/NotificationDropdown';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { devices } = useDevices();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const currentPage = navItems.find(item => item.to === location.pathname) || navItems[0];
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  const userRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const sidebarRef = useRef(null);
  
  // Global click handler ref
  const isDropdownOpen = showUserMenu || showMobileMenu || showSidebar;

  const connectedDevices = devices.filter(device => device.status === 'online').length;
  const isConnected = connectedDevices > 0;

  const handleUserClick = () => {
    setShowUserMenu(!showUserMenu);
  };
  
  const closeAll = () => {
    setShowUserMenu(false);
    setShowSidebar(false);
  };

  const handleRefresh = () => {
    toast({
      title: "Refreshing connection status",
      description: "Checking device connectivity..."
    });
    window.location.reload();
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only process if at least one dropdown is open
      if (isDropdownOpen) {
        // Check if click is within user ref
        const inUserRef = userRef.current?.contains(event.target);
        
        // If clicking inside user ref, don't close
        if (inUserRef) {
          return;
        }
        
        // Check if click is outside all dropdown areas
        const isOutsideAll = (
          (!userRef.current || !userRef.current.contains(event.target)) &&
          (!mobileMenuRef.current || !mobileMenuRef.current.contains(event.target))
        );
        
        // If click is outside all dropdowns, close them all
        if (isOutsideAll) {
          closeAll();
          setShowMobileMenu(false);
        }
      }
    };
    
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeAll();
        setShowMobileMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDropdownOpen]);

  return (
    <header className="border-b px-4 py-3 relative z-50 flex items-center justify-between">
      {/* Left side */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isMobile && (
          <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-1 flex-shrink-0" onClick={() => setShowSidebar(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0" ref={sidebarRef}>
              <Sidebar onNavigateClose={() => {
                setShowSidebar(false);
              }} />
            </SheetContent>
          </Sheet>
        )}
        <div className={cn(isMobile && "max-w-[150px]", "overflow-hidden flex-1")}>
          <div className="flex items-center gap-2 mb-1">
            <Logo size="sm" variant="icon-only" animated />
            <h1 className="text-lg font-bold truncate">{currentPage.title}</h1>
          </div>
        </div>
      </div>

      {/* Right side - Scrollable on mobile */}
      <div className={cn(
        "flex items-center gap-1 sm:gap-2 flex-shrink-0",
        isMobile ? "overflow-x-auto" : "overflow-visible"
      )}>
        {/* Theme Toggle - Now visible on all devices */}
        <div className="flex-shrink-0">
          <ThemeToggle />
        </div>

        {/* Connection status */}
        <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={handleRefresh}>
          {isConnected ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
        </Button>

        {/* Notifications */}
        <div className="flex-shrink-0">
          <NotificationDropdown />
        </div>

        {/* Time Limit Alerts */}
        <div className="hidden md:block flex-shrink-0">
          {/* DeviceNotificationAlert removed - now using new notification system */}
        </div>

        {/* User menu */}
        <div className="relative flex-shrink-0" ref={userRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUserClick}
          >
            <User className="h-5 w-5" />
          </Button>

          {showUserMenu && (
            <Card className={cn(
              "shadow-lg z-[200]",
              isMobile 
                ? "fixed top-14 left-4 right-4 w-[calc(100vw-2rem)]" 
                : "absolute right-0 top-full mt-2 w-80"
            )}>
              <CardHeader className="py-3 px-4">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || 'user@example.com'}</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => { closeAll(); navigate('/dashboard'); }}
                >
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => { closeAll(); navigate('/dashboard/settings'); }}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => {
                    closeAll();
                    localStorage.clear();
                    navigate('/login');
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-[100]" 
          onClick={closeAll}
        />
      )}
    </header>
  );
}
