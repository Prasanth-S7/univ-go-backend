import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useErrorContext } from '@/contexts/error-context';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function QueryErrorBoundary() {
  const queryClient = useQueryClient();
  const { error, setError } = useErrorContext();

  // Reset error when component unmounts
  useEffect(() => {
    return () => {
      setError(null);
    };
  }, [setError]);

  if (!error) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full">
      <Alert variant="destructive" className="relative">
        <button
          onClick={() => setError(null)}
          className="absolute right-2 top-2 rounded-full p-1 hover:bg-destructive-foreground/10"
        >
          <X className="h-4 w-4" />
        </button>
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          <div className="mt-2 mb-4">
            {error.message || 'An unexpected error occurred'}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries();
                setError(null);
              }}
            >
              Retry
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload Page
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
} 