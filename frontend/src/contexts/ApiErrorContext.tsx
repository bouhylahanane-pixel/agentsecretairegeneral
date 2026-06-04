import React, { createContext, useContext, useState } from 'react';

interface ApiErrorContextType {
  isBackendOffline: boolean;
  setBackendOffline: (offline: boolean) => void;
  triggerConnectionError: () => void;
}

const ApiErrorContext = createContext<ApiErrorContextType | undefined>(undefined);

export function ApiErrorProvider({ children }: { children: React.ReactNode }) {
  const [isBackendOffline, setIsBackendOffline] = useState(false);

  const triggerConnectionError = () => {
    setIsBackendOffline(true);
  };

  return (
    <ApiErrorContext.Provider
      value={{
        isBackendOffline,
        setBackendOffline: setIsBackendOffline,
        triggerConnectionError,
      }}
    >
      {children}
    </ApiErrorContext.Provider>
  );
}

export function useApiError() {
  const context = useContext(ApiErrorContext);
  if (!context) {
    throw new Error('useApiError must be used within an ApiErrorProvider');
  }
  return context;
}
