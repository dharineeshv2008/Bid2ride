import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, connectSocket, disconnectSocket } from '../services/socket';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      connectSocket();
      const s = getSocket();
      setSocket(s);

      const onConnect = () => {
        setIsConnected(true);
        s.emit('join_room', { room: `driver:${user.id}` });
      };

      const onDisconnect = () => {
        setIsConnected(false);
      };

      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);

      if (s.connected) {
        onConnect();
      }

      return () => {
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
        disconnectSocket();
      };
    } else {
      disconnectSocket();
      setIsConnected(false);
      setSocket(null);
    }
  }, [isAuthenticated, user]);

  const joinRoom = (room: string) => {
    if (socket && isConnected) {
      socket.emit('join_room', { room });
    }
  };

  const leaveRoom = (room: string) => {
    if (socket && isConnected) {
      socket.emit('leave_room', { room });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinRoom, leaveRoom }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
