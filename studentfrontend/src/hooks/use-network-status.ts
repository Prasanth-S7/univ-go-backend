import { useState, useEffect } from 'react';

/**
 * Hook to monitor and provide the network connection status
 * @returns Object with isOnline status and lastUpdated timestamp
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastUpdated(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastUpdated(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check status immediately 
    setIsOnline(navigator.onLine);
    setLastUpdated(new Date());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, lastUpdated };
} 