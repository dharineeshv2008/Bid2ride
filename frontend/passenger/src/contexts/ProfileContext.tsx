import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { UserProfile, UserProfileUpdatePayload } from '../types';

interface ProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  updateProfile: (updates: UserProfileUpdatePayload) => Promise<UserProfile>;
  uploadPhoto: (photoBase64: string) => Promise<string>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fetchingRef = useRef<boolean>(false);

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated || fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    try {
      const { data } = await api.get<UserProfile>('/settings/profile');
      setProfile(data);
    } catch (err) {
      console.error('[ProfileContext] Failed to fetch profile', err);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [isAuthenticated, refreshProfile]);

  useEffect(() => {
    const handler = () => {
      refreshProfile();
    };
    window.addEventListener('profile_updated', handler);
    return () => window.removeEventListener('profile_updated', handler);
  }, [refreshProfile]);

  const updateProfile = async (updates: UserProfileUpdatePayload): Promise<UserProfile> => {
    const { data } = await api.patch<UserProfile>('/settings/profile', updates);
    setProfile(data);
    window.dispatchEvent(new Event('profile_updated'));
    return data;
  };

  const uploadPhoto = async (photoBase64: string): Promise<string> => {
    const { data } = await api.post<UserProfile>('/settings/profile/photo', { photo_base64: photoBase64 });
    setProfile(data);
    window.dispatchEvent(new Event('profile_updated'));
    return data.avatar_url || photoBase64;
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isLoading,
        updateProfile,
        uploadPhoto,
        refreshProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider');
  return ctx;
};
