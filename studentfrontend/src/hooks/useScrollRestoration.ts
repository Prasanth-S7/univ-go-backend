import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router';

// Extend Window interface to include our timer property
declare global {
    interface Window {
        saveScrollTimer?: NodeJS.Timeout;
    }
}

/**
 * Hook to restore scroll position when navigating between pages
 * @param id Optional unique identifier for the page (defaults to pathname)
 */
export function useScrollRestoration(id?: string) {
    const { pathname } = useLocation();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Generate a unique key for this route
    const storageKey = `scroll_pos_${id || pathname}`;

    // Save the current scroll position
    const saveScrollPosition = useCallback(() => {
        const scrollY = window.scrollY;
        if (scrollY > 0) {
            sessionStorage.setItem(storageKey, scrollY.toString());
        }
    }, [storageKey]);

    // Restore the scroll position
    const restoreScrollPosition = useCallback(() => {
        try {
            const scrollYStr = sessionStorage.getItem(storageKey);
            if (scrollYStr) {
                const scrollY = parseInt(scrollYStr, 10);
                // Use multiple techniques to ensure scrolling works
                setTimeout(() => {
                    window.scrollTo(0, scrollY);

                    // Try again after a longer delay in case initial attempt fails
                    setTimeout(() => {
                        window.scrollTo(0, scrollY);
                    }, 200);
                }, 10);
            }
        } catch (error) {
            // console.error('Failed to restore scroll position:', error);
        }
    }, [storageKey]);

    useEffect(() => {
        // Restore scroll position when the component mounts
        restoreScrollPosition();

        // Setup event handlers
        const handleBeforeUnload = () => saveScrollPosition();
        const handleScroll = () => {
            // Throttled scroll position saving
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(() => {
                saveScrollPosition();
                timerRef.current = null;
            }, 300);
        };

        // Add event listeners
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Cleanup
        return () => {
            saveScrollPosition();
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('scroll', handleScroll);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [saveScrollPosition, restoreScrollPosition]);
} 