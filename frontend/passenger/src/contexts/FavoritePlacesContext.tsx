import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { FavoritePlace, FavoritePlaceCreatePayload, FavoritePlaceUpdatePayload, PlaceType } from '../types';

interface FavoritePlacesContextType {
  favoritePlaces: FavoritePlace[];
  isLoading: boolean;
  addFavoritePlace: (payload: FavoritePlaceCreatePayload) => Promise<FavoritePlace>;
  updateFavoritePlace: (id: string, payload: FavoritePlaceUpdatePayload) => Promise<FavoritePlace>;
  deleteFavoritePlace: (id: string) => Promise<void>;
  setDefaultPlace: (id: string) => Promise<FavoritePlace>;
  refreshFavoritePlaces: () => Promise<void>;
  getPlaceByType: (type: PlaceType) => FavoritePlace | undefined;
  defaultPlace: FavoritePlace | undefined;
}

const FavoritePlacesContext = createContext<FavoritePlacesContextType | undefined>(undefined);

export const FavoritePlacesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [favoritePlaces, setFavoritePlaces] = useState<FavoritePlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fetchingRef = useRef(false);

  const refreshFavoritePlaces = useCallback(async () => {
    if (!isAuthenticated || fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    try {
      const { data } = await api.get<FavoritePlace[]>('/settings/favorite-places');
      setFavoritePlaces(data ?? []);
    } catch (err) {
      console.error('[FavoritePlacesContext] Failed to fetch favorite places', err);
      setFavoritePlaces([]);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshFavoritePlaces();
    } else {
      setFavoritePlaces([]);
    }
  }, [isAuthenticated, refreshFavoritePlaces]);

  useEffect(() => {
    const handler = () => refreshFavoritePlaces();
    window.addEventListener('favorite_places_updated', handler);
    return () => window.removeEventListener('favorite_places_updated', handler);
  }, [refreshFavoritePlaces]);

  const addFavoritePlace = async (payload: FavoritePlaceCreatePayload): Promise<FavoritePlace> => {
    const { data } = await api.post<FavoritePlace>('/settings/favorite-places', payload);
    await refreshFavoritePlaces();
    window.dispatchEvent(new Event('favorite_places_updated'));
    return data;
  };

  const updateFavoritePlace = async (id: string, payload: FavoritePlaceUpdatePayload): Promise<FavoritePlace> => {
    const { data } = await api.put<FavoritePlace>(`/settings/favorite-places/${id}`, payload);
    await refreshFavoritePlaces();
    window.dispatchEvent(new Event('favorite_places_updated'));
    return data;
  };

  const deleteFavoritePlace = async (id: string): Promise<void> => {
    await api.delete(`/settings/favorite-places/${id}`);
    await refreshFavoritePlaces();
    window.dispatchEvent(new Event('favorite_places_updated'));
  };

  const setDefaultPlace = async (id: string): Promise<FavoritePlace> => {
    const { data } = await api.patch<FavoritePlace>('/settings/favorite-places/default', { place_id: id });
    await refreshFavoritePlaces();
    window.dispatchEvent(new Event('favorite_places_updated'));
    return data;
  };

  const getPlaceByType = (type: PlaceType): FavoritePlace | undefined => {
    return favoritePlaces.find((p) => p.place_type === type);
  };

  const defaultPlace = favoritePlaces.find((p) => p.is_default);

  return (
    <FavoritePlacesContext.Provider
      value={{
        favoritePlaces,
        isLoading,
        addFavoritePlace,
        updateFavoritePlace,
        deleteFavoritePlace,
        setDefaultPlace,
        refreshFavoritePlaces,
        getPlaceByType,
        defaultPlace,
      }}
    >
      {children}
    </FavoritePlacesContext.Provider>
  );
};

export const useFavoritePlaces = () => {
  const ctx = useContext(FavoritePlacesContext);
  if (!ctx) throw new Error('useFavoritePlaces must be used within a FavoritePlacesProvider');
  return ctx;
};
