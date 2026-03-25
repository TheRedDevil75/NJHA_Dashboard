import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CollectionPeriod } from '../types';
import { adminDataApi } from '../api/client';
import { useAuth } from './AuthContext';

interface PeriodContextValue {
  period: CollectionPeriod | null;
  isLoading: boolean;
  reload: () => Promise<void>;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [period, setPeriod] = useState<CollectionPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setPeriod(null);
      setIsLoading(false);
      return;
    }
    try {
      const data = await adminDataApi.current();
      setPeriod(data.period);
    } catch {
      // Non-admin users can't call /admin/data/current, use submissions/my instead
      setPeriod(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    reload();
    // Poll every 60 seconds to detect period transitions
    const interval = setInterval(reload, 60_000);
    return () => clearInterval(interval);
  }, [reload]);

  return (
    <PeriodContext.Provider value={{ period, isLoading, reload }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error('usePeriod must be used inside PeriodProvider');
  return ctx;
}
