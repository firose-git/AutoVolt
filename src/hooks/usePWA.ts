/**
 * usePWA Hook
 * Manages PWA installation, service worker, and offline detection
 */

import { useEffect, useState, useCallback } from 'react';
import {
  registerServiceWorker,
  setupPWAInstall,
  showInstallPrompt,
  isPWA,
  canInstallPWA,
  isOnline as checkOnline,
  setupOnlineListeners,
} from '@/lib/pwa';
import { useToast } from '@/hooks/use-toast';

export interface PWAState {
  isInstalled: boolean;
  canInstall: boolean;
  isOnline: boolean;
  isServiceWorkerRegistered: boolean;
}

export function usePWA() {
  const { toast } = useToast();
  const [state, setState] = useState<PWAState>({
    isInstalled: isPWA(),
    canInstall: false,
    isOnline: checkOnline(),
    isServiceWorkerRegistered: false,
  });

  // Install PWA
  const install = useCallback(async () => {
    const installed = await showInstallPrompt();
    
    if (installed) {
      toast({
        title: 'App Installed',
        description: 'AutoVolt has been installed on your device',
      });
      
      setState((prev) => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
      }));
    }
  }, [toast]);

  useEffect(() => {
    // Register service worker
    registerServiceWorker().then((registration) => {
      if (registration) {
        setState((prev) => ({
          ...prev,
          isServiceWorkerRegistered: true,
        }));
        
        console.log('[PWA] Service worker registered successfully');
      }
    });

    // Setup PWA install prompt
    setupPWAInstall(
      // On install available
      () => {
        setState((prev) => ({
          ...prev,
          canInstall: true,
        }));
        
        console.log('[PWA] Install prompt available');
      },
      // On install complete
      () => {
        toast({
          title: 'Installation Complete',
          description: 'You can now use AutoVolt offline',
        });
        
        setState((prev) => ({
          ...prev,
          isInstalled: true,
          canInstall: false,
        }));
      }
    );

    // Setup online/offline listeners
    const cleanup = setupOnlineListeners(
      // On online
      () => {
        setState((prev) => ({ ...prev, isOnline: true }));
        
        toast({
          title: 'Back Online',
          description: 'Connection restored',
        });
      },
      // On offline
      () => {
        setState((prev) => ({ ...prev, isOnline: false }));
        
        toast({
          title: 'You are Offline',
          description: 'Some features may be limited',
          variant: 'destructive',
        });
      }
    );

    return cleanup;
  }, [toast]);

  return {
    ...state,
    install,
  };
}
