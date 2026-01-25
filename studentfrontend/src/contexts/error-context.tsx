import React, { createContext, useContext, useState } from 'react';

interface ErrorContextType {
  error: Error | null;
  setError: (error: Error | null) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function useErrorContext() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useErrorContext must be used within an ErrorProvider');
  }
  return context;
}

interface ErrorProviderProps {
  children: React.ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [error, setError] = useState<Error | null>(null);

  const value = {
    error,
    setError,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
} 