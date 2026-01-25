import { useState, useEffect } from 'react';
import { api } from '@/services/api';

interface ApiHealthState {
  isApiAvailable: boolean;
  lastChecked: Date | null;
  retryCount: number;
}

/**
 * Hook to check and monitor the health/availability of the API
 * @returns Object with API availability status
 */
export function useApiHealth() {
  const [state, setState] = useState<ApiHealthState>({
    isApiAvailable: true, // Assume available until proven otherwise
    lastChecked: null,
    retryCount: 0,
  });
  
  // Check API health on mount and periodically
  useEffect(() => {
    let isMounted = true;
    
    const checkApiHealth = async () => {
      try {
        // Try to make a simple request to check API availability
        await api.get('/api/health-check/');
        
        if (isMounted) {
          setState({
            isApiAvailable: true,
            lastChecked: new Date(),
            retryCount: 0,
          });
        }
      } catch (error) {
        if (isMounted) {
          setState(prev => ({
            isApiAvailable: false,
            lastChecked: new Date(),
            retryCount: prev.retryCount + 1,
          }));
        }
      }
    };
    
    // Initial check
    checkApiHealth();
    
    // Set up periodic checks - more frequent if API is down
    const interval = setInterval(
      checkApiHealth, 
      state.isApiAvailable ? 60000 : 15000 // 1 minute if available, 15 seconds if not
    );
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [state.isApiAvailable]);
  
  return {
    isApiAvailable: state.isApiAvailable,
    lastChecked: state.lastChecked,
    retryCount: state.retryCount,
  };
} 