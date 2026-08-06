import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { WalletProvider } from './contexts/WalletContext';
import { FavoritePlacesProvider } from './contexts/FavoritePlacesContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { AppRoutes } from './routes/AppRoutes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <WalletProvider>
              <FavoritePlacesProvider>
                <SocketProvider>
                  <AppRoutes />
                </SocketProvider>
              </FavoritePlacesProvider>
            </WalletProvider>
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
