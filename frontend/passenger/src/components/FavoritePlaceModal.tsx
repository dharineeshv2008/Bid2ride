import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  X, 
  MapPin, 
  Search, 
  Crosshair, 
  Plus, 
  Minus, 
  Loader2, 
  Home, 
  Briefcase, 
  Plane, 
  Map, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { FavoritePlace, FavoritePlaceCreatePayload, FavoritePlaceUpdatePayload, PlaceType } from '../types';

const LIGHT_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-tiles': {
      type: 'raster',
      tiles: [
        'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      ],
      tileSize: 256,
      attribution: '© MapLibre | © CARTO | © OpenStreetMap'
    }
  },
  layers: [
    {
      id: 'carto-tiles-layer',
      type: 'raster',
      source: 'carto-tiles',
      minzoom: 0,
      maxzoom: 20
    }
  ]
};

interface FavoritePlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: FavoritePlaceCreatePayload | FavoritePlaceUpdatePayload) => Promise<void>;
  initialData?: FavoritePlace | null;
  defaultPlaceType?: PlaceType;
}

export const FavoritePlaceModal: React.FC<FavoritePlaceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultPlaceType = 'OTHER',
}) => {
  const [placeType, setPlaceType] = useState<PlaceType>(defaultPlaceType);
  const [placeName, setPlaceName] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [lat, setLat] = useState<number>(12.9716);
  const [lng, setLng] = useState<number>(77.5946);
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Initialize or populate form
  useEffect(() => {
    if (initialData) {
      setPlaceType(initialData.place_type);
      setPlaceName(initialData.place_name);
      setFullAddress(initialData.full_address);
      setLat(initialData.latitude);
      setLng(initialData.longitude);
      setLandmark(initialData.landmark || '');
      setCity(initialData.city || '');
      setState(initialData.state || '');
      setCountry(initialData.country || '');
      setPostalCode(initialData.postal_code || '');
      setIsDefault(initialData.is_default);
      setSearchQuery('');
    } else {
      setPlaceType(defaultPlaceType);
      setPlaceName(
        defaultPlaceType === 'HOME' ? 'Home' :
        defaultPlaceType === 'WORK' ? 'Work' :
        defaultPlaceType === 'AIRPORT' ? 'Airport' : ''
      );
      setFullAddress('');
      setLat(12.9716);
      setLng(77.5946);
      setLandmark('');
      setCity('');
      setState('');
      setCountry('');
      setPostalCode('');
      setIsDefault(false);
      setSearchQuery('');
    }
    setErrorMessage('');
  }, [initialData, defaultPlaceType, isOpen]);

  // Handle map rendering when modal is visible
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const initialLat = initialData ? initialData.latitude : lat;
    const initialLng = initialData ? initialData.longitude : lng;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: LIGHT_MAP_STYLE,
      center: [initialLng, initialLat],
      zoom: 14,
    });

    mapRef.current = map;

    const marker = new maplibregl.Marker({ color: '#0EA5E9', draggable: true })
      .setLngLat([initialLng, initialLat])
      .addTo(map);

    markerRef.current = marker;

    marker.on('dragend', () => {
      const coords = marker.getLngLat();
      setLat(coords.lat);
      setLng(coords.lng);
      handleReverseGeocode(coords.lat, coords.lng);
    });

    map.on('click', (e) => {
      const { lat: clickLat, lng: clickLng } = e.lngLat;
      marker.setLngLat([clickLng, clickLat]);
      setLat(clickLat);
      setLng(clickLng);
      handleReverseGeocode(clickLat, clickLng);
    });

    const timer = setTimeout(() => {
      map.resize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
    };
  }, [isOpen]);

  const handleReverseGeocode = async (rLat: number, rLng: number) => {
    try {
      const { data } = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat: rLat,
          lon: rLng,
          format: 'json',
          addressdetails: 1
        }
      });
      if (data) {
        setFullAddress(data.display_name || '');
        const addr = data.address || {};
        setLandmark(addr.neighbourhood || addr.suburb || addr.road || '');
        setCity(addr.city || addr.town || addr.village || addr.county || '');
        setState(addr.state || '');
        setCountry(addr.country || '');
        setPostalCode(addr.postcode || '');
      }
    } catch (err) {
      console.error('Reverse geocode failed', err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          limit: 5,
          addressdetails: 1
        }
      });
      setSuggestions(data || []);
    } catch (err) {
      console.error('Location search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSuggestion = (item: any) => {
    const itemLat = parseFloat(item.lat);
    const itemLng = parseFloat(item.lon);
    setLat(itemLat);
    setLng(itemLng);
    setFullAddress(item.display_name || '');

    const addr = item.address || {};
    setLandmark(addr.neighbourhood || addr.suburb || addr.road || '');
    setCity(addr.city || addr.town || addr.village || addr.county || '');
    setState(addr.state || '');
    setCountry(addr.country || '');
    setPostalCode(addr.postcode || '');

    setSuggestions([]);
    setSearchQuery('');

    if (mapRef.current && markerRef.current) {
      mapRef.current.flyTo({ center: [itemLng, itemLat], zoom: 15 });
      markerRef.current.setLngLat([itemLng, itemLat]);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const curLat = pos.coords.latitude;
        const curLng = pos.coords.longitude;
        setLat(curLat);
        setLng(curLng);
        if (mapRef.current && markerRef.current) {
          mapRef.current.flyTo({ center: [curLng, curLat], zoom: 15 });
          markerRef.current.setLngLat([curLng, curLat]);
        }
        handleReverseGeocode(curLat, curLng);
        setIsGeolocating(false);
      },
      (err) => {
        console.error('Geolocation error', err);
        setErrorMessage('Unable to retrieve current location.');
        setIsGeolocating(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!placeName.trim()) {
      setErrorMessage('Please enter a place name.');
      return;
    }
    if (!fullAddress.trim()) {
      setErrorMessage('Please provide or select a location on the map.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: FavoritePlaceCreatePayload = {
        place_type: placeType,
        place_name: placeName.trim(),
        full_address: fullAddress.trim(),
        latitude: lat,
        longitude: lng,
        landmark: landmark.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        country: country.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        is_default: isDefault,
      };
      await onSave(payload);
      onClose();
    } catch (err: any) {
      console.error('Failed to save place', err);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setErrorMessage(detail);
      } else if (Array.isArray(detail)) {
        setErrorMessage(detail.map((d: any) => d.msg || d.message).join('; '));
      } else {
        setErrorMessage('Failed to save favorite place. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-[22px] shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-lg">
                {initialData ? 'Edit Saved Place' : 'Add New Favorite Place'}
              </h3>
              <p className="text-xs text-gray-500 font-medium">Select location pin on map and configure details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid md:grid-cols-12 gap-0 overflow-y-auto flex-1">
          {/* Form Controls (Left Column) */}
          <form onSubmit={handleSubmit} className="md:col-span-6 p-6 space-y-4 overflow-y-auto">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Place Type Selector */}
            <div>
              <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">
                Category Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { type: 'HOME' as PlaceType, label: 'Home', icon: Home },
                  { type: 'WORK' as PlaceType, label: 'Work', icon: Briefcase },
                  { type: 'AIRPORT' as PlaceType, label: 'Airport', icon: Plane },
                  { type: 'OTHER' as PlaceType, label: 'Other', icon: Map },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = placeType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        setPlaceType(item.type);
                        if (!initialData && (item.type === 'HOME' || item.type === 'WORK' || item.type === 'AIRPORT')) {
                          setPlaceName(item.label);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        isSelected
                          ? 'border-[#0EA5E9] bg-[#E0F2FE] text-[#0284C7] font-extrabold shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px] font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Place Name */}
            <div>
              <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                Place Name / Label *
              </label>
              <input
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="e.g. My Apartment, Downtown Office, Gym"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]"
                required
              />
            </div>

            {/* Address Search Bar */}
            <div className="relative">
              <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                Search Address
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Type to search location address..."
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]"
                />
                {isSearching && <Loader2 className="w-3.5 h-3.5 text-[#0EA5E9] animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}
              </div>

              {suggestions.length > 0 && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto divide-y divide-gray-100">
                  {suggestions.map((item) => (
                    <button
                      key={item.place_id}
                      type="button"
                      onClick={() => selectSuggestion(item)}
                      className="w-full text-left p-2.5 text-xs text-gray-700 hover:bg-sky-50 transition-colors font-medium truncate block"
                    >
                      {item.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Full Address */}
            <div>
              <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                Full Address *
              </label>
              <textarea
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                rows={2}
                placeholder="Address will auto-fill when selecting location on map"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] resize-none"
                required
              />
            </div>

            {/* Coordinates / Landmark row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                  Landmark
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near metro gate..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]"
                />
              </div>
            </div>

            {/* Default place toggle */}
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900 text-xs block">Set as Default Place</span>
                <span className="text-[10px] text-gray-500">Auto-suggest this location for ride bookings</span>
              </div>
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-[#0EA5E9] rounded accent-[#0EA5E9]"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] hover:from-[#0284C7] hover:to-sky-800 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {initialData ? 'Update Place' : 'Save Favorite Place'}
              </button>
            </div>
          </form>

          {/* Map Integration (Right Column) */}
          <div className="md:col-span-6 bg-gray-100 relative min-h-[300px] md:min-h-[450px]">
            <div ref={mapContainerRef} className="w-full h-full min-h-[300px] md:min-h-[450px]" />

            {/* Floating Map Action Buttons */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isGeolocating}
                className="p-2.5 rounded-xl bg-white/90 backdrop-blur-md border border-gray-200 text-[#0EA5E9] shadow-md hover:bg-white transition-all flex items-center justify-center"
                title="Locate Current Position"
              >
                {isGeolocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => mapRef.current?.zoomIn()}
                className="p-2.5 rounded-xl bg-white/90 backdrop-blur-md border border-gray-200 text-gray-700 shadow-md hover:bg-white transition-all"
                title="Zoom In"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => mapRef.current?.zoomOut()}
                className="p-2.5 rounded-xl bg-white/90 backdrop-blur-md border border-gray-200 text-gray-700 shadow-md hover:bg-white transition-all"
                title="Zoom Out"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            {/* Floating Helper Tip */}
            <div className="absolute bottom-3 left-3 right-3 z-10 bg-white/90 backdrop-blur-md border border-gray-200/80 rounded-xl p-2.5 shadow-lg text-[11px] text-gray-600 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#0EA5E9] shrink-0" />
              <span>Drag the blue map pin or click anywhere on the map to place location.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
