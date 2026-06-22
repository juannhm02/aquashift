import React, { createContext, useContext } from 'react';
import { SwapRequest } from './swaps';

type TabSessionContextValue = {
  user: string;
  swaps: SwapRequest[];
  setSwaps: React.Dispatch<React.SetStateAction<SwapRequest[]>>;
};

const TabSessionContext = createContext<TabSessionContextValue | null>(null);

export function TabSessionProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: TabSessionContextValue;
}) {
  return <TabSessionContext.Provider value={value}>{children}</TabSessionContext.Provider>;
}

export function useTabSession() {
  const context = useContext(TabSessionContext);

  if (!context) {
    throw new Error('useTabSession must be used within TabSessionProvider');
  }

  return context;
}
