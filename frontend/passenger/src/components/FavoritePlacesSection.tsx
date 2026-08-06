import React, { useState } from 'react';
import { 
  MapPin, 
  Home, 
  Briefcase, 
  Plane, 
  Map, 
  Plus, 
  Edit3, 
  Trash2, 
  Star, 
  Check, 
  Loader2, 
  Navigation 
} from 'lucide-react';
import { useFavoritePlaces } from '../contexts/FavoritePlacesContext';
import { FavoritePlace, FavoritePlaceCreatePayload, FavoritePlaceUpdatePayload, PlaceType } from '../types';
import { FavoritePlaceModal } from './FavoritePlaceModal';

interface FavoritePlacesSectionProps {
  onSelectPlace?: (place: FavoritePlace) => void;
  compact?: boolean;
}

export const FavoritePlacesSection: React.FC<FavoritePlacesSectionProps> = ({
  onSelectPlace,
  compact = false,
}) => {
  const { 
    favoritePlaces, 
    isLoading, 
    addFavoritePlace, 
    updateFavoritePlace, 
    deleteFavoritePlace, 
    setDefaultPlace 
  } = useFavoritePlaces();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<FavoritePlace | null>(null);
  const [selectedTypeForAdd, setSelectedTypeForAdd] = useState<PlaceType>('OTHER');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [defaultingId, setDefaultingId] = useState<string | null>(null);

  const homePlace = favoritePlaces.find((p) => p.place_type === 'HOME');
  const workPlace = favoritePlaces.find((p) => p.place_type === 'WORK');
  const airportPlace = favoritePlaces.find((p) => p.place_type === 'AIRPORT');
  const otherPlaces = favoritePlaces.filter((p) => p.place_type === 'OTHER');

  const handleOpenAddModal = (type: PlaceType = 'OTHER') => {
    setEditingPlace(null);
    setSelectedTypeForAdd(type);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (place: FavoritePlace) => {
    setEditingPlace(place);
    setSelectedTypeForAdd(place.place_type);
    setIsModalOpen(true);
  };

  const handleSavePlace = async (payload: FavoritePlaceCreatePayload | FavoritePlaceUpdatePayload) => {
    if (editingPlace) {
      await updateFavoritePlace(editingPlace.id, payload as FavoritePlaceUpdatePayload);
    } else {
      await addFavoritePlace(payload as FavoritePlaceCreatePayload);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to remove this favorite place?')) {
      setDeletingId(id);
      try {
        await deleteFavoritePlace(id);
      } catch (err) {
        console.error('Failed to delete place', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleSetDefault = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDefaultingId(id);
    try {
      await setDefaultPlace(id);
    } catch (err) {
      console.error('Failed to set default place', err);
    } finally {
      setDefaultingId(null);
    }
  };

  const renderPresetCard = (
    type: PlaceType, 
    label: string, 
    icon: React.ComponentType<{ className?: string }>, 
    place?: FavoritePlace
  ) => {
    const Icon = icon;
    if (place) {
      return (
        <div
          onClick={() => onSelectPlace ? onSelectPlace(place) : handleOpenEditModal(place)}
          className={`p-4 rounded-xl border transition-all cursor-pointer group relative flex flex-col justify-between ${
            place.is_default 
              ? 'bg-sky-50/70 border-[#0EA5E9] shadow-sm' 
              : 'bg-white border-gray-200 hover:border-[#0EA5E9] hover:shadow-md'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shadow-inner">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-bold text-gray-900 text-sm">{place.place_name}</span>
              </div>

              {place.is_default ? (
                <span className="text-[10px] font-extrabold uppercase bg-[#0EA5E9] text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <Star className="w-3 h-3 fill-current" /> Default
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => handleSetDefault(e, place.id)}
                  disabled={defaultingId === place.id}
                  className="text-gray-300 hover:text-amber-500 p-1 rounded transition-colors"
                  title="Set as Default"
                >
                  {defaultingId === place.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            <p className="text-xs text-gray-600 line-clamp-2 leading-snug">{place.full_address}</p>
            {place.landmark && (
              <span className="text-[11px] text-gray-400 mt-1 block truncate">📍 Near: {place.landmark}</span>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-gray-100/80 flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleOpenEditModal(place); }}
              className="text-xs font-bold text-[#0EA5E9] hover:underline flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              type="button"
              onClick={(e) => handleDelete(e, place.id)}
              disabled={deletingId === place.id}
              className="text-xs text-rose-500 hover:text-rose-700 hover:underline flex items-center gap-1"
            >
              {deletingId === place.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleOpenAddModal(type)}
        className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 hover:bg-sky-50/50 hover:border-[#0EA5E9] transition-all text-left group flex flex-col items-center justify-center text-center space-y-2 min-h-[120px]"
      >
        <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-400 group-hover:text-[#0EA5E9] group-hover:border-[#0EA5E9] flex items-center justify-center transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-gray-800 text-xs block group-hover:text-[#0EA5E9] transition-colors">
            Add {label}
          </span>
          <span className="text-[10px] text-gray-400">Save {label.toLowerCase()} location</span>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#0EA5E9]" />
            Favorite Places
          </h3>
          {!compact && (
            <p className="text-xs text-gray-500 font-medium">Quick-access saved locations for effortless ride booking</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleOpenAddModal('OTHER')}
          className="px-3.5 py-1.5 rounded-xl bg-[#E0F2FE] hover:bg-[#0EA5E9] text-[#0284C7] hover:text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Add Place
        </button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preset Cards: Home, Work, Airport */}
          <div className="grid sm:grid-cols-3 gap-3">
            {renderPresetCard('HOME', 'Home', Home, homePlace)}
            {renderPresetCard('WORK', 'Work', Briefcase, workPlace)}
            {renderPresetCard('AIRPORT', 'Airport', Plane, airportPlace)}
          </div>

          {/* Custom Other Places */}
          {otherPlaces.length > 0 && (
            <div>
              <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Other Saved Locations</h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {otherPlaces.map((place) => (
                  <div
                    key={place.id}
                    onClick={() => onSelectPlace ? onSelectPlace(place) : handleOpenEditModal(place)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer group relative flex flex-col justify-between ${
                      place.is_default 
                        ? 'bg-sky-50/70 border-[#0EA5E9] shadow-sm' 
                        : 'bg-white border-gray-200 hover:border-[#0EA5E9] hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 group-hover:bg-[#E0F2FE] group-hover:text-[#0284C7] flex items-center justify-center transition-colors">
                            <Map className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-gray-900 text-sm">{place.place_name}</span>
                        </div>

                        {place.is_default ? (
                          <span className="text-[10px] font-extrabold uppercase bg-[#0EA5E9] text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <Star className="w-3 h-3 fill-current" /> Default
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleSetDefault(e, place.id)}
                            disabled={defaultingId === place.id}
                            className="text-gray-300 hover:text-amber-500 p-1 rounded transition-colors"
                            title="Set as Default"
                          >
                            {defaultingId === place.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 line-clamp-2 leading-snug">{place.full_address}</p>
                      {place.landmark && (
                        <span className="text-[11px] text-gray-400 mt-1 block truncate">📍 Near: {place.landmark}</span>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100/80 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenEditModal(place); }}
                        className="text-xs font-bold text-[#0EA5E9] hover:underline flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, place.id)}
                        disabled={deletingId === place.id}
                        className="text-xs text-rose-500 hover:text-rose-700 hover:underline flex items-center gap-1"
                      >
                        {deletingId === place.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Integration */}
      <FavoritePlaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePlace}
        initialData={editingPlace}
        defaultPlaceType={selectedTypeForAdd}
      />
    </div>
  );
};
