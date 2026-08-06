import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface WalletContextType {
  balance: number | null;
  currency: string;
  isLoading: boolean;
  refreshWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState('INR');
  const [isLoading, setIsLoading] = useState(false);
  // Guard to prevent concurrent fetches
  const fetchingRef = useRef(false);

  const refreshWallet = useCallback(async () => {
    if (!isAuthenticated || fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    try {
      const { data } = await api.get<{ balance: number; currency: string }>('/wallet/balance');
      setBalance(data.balance);
      setCurrency(data.currency);
    } catch (err) {
      // Silently fail — individual pages handle their own error states
      console.error('[WalletContext] Failed to fetch wallet balance', err);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [isAuthenticated]);

  // Fetch on mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      refreshWallet();
    } else {
      setBalance(null);
    }
  }, [isAuthenticated, refreshWallet]);

  // Listen for wallet_updated events dispatched by any component after a mutation
  useEffect(() => {
    const handler = () => refreshWallet();
    window.addEventListener('wallet_updated', handler);
    return () => window.removeEventListener('wallet_updated', handler);
  }, [refreshWallet]);

  return (
    <WalletContext.Provider value={{ balance, currency, isLoading, refreshWallet }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
};
