import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '../services/api';
import { useFavoritePlaces } from '../contexts/FavoritePlacesContext';
import { FavoritePlace } from '../types';
import { 
  MapPin, 
  Navigation, 
  Car, 
  Loader2, 
  Info, 
  Plus, 
  Minus, 
  Crosshair, 
  Compass as CompassIcon,
  Sparkles,
  ShieldCheck,
  Check,
  Home,
  Briefcase,
  Plane,
  Map as MapIcon
} from 'lucide-react';
import { formatCurrency } from '../utils/format';


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
      attribution: '© MapLibre | © CARTO | © OpenStreetMap contributors'
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

export const RideBookingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { favoritePlaces } = useFavoritePlaces();

  const [pickup, setPickup] = useState('MG Road Metro Station, Bengaluru');
  const [pickupLat, setPickupLat] = useState(12.9756);
  const [pickupLng, setPickupLng] = useState(77.6068);

  const [destination, setDestination] = useState(location.state?.destination || 'Indiranagar Metro Station, Bengaluru');
  const [dropoffLat, setDropoffLat] = useState(location.state?.dropoffLat || 12.9783);
  const [dropoffLng, setDropoffLng] = useState(location.state?.dropoffLng || 77.6385);

  const selectFavoritePlace = (place: FavoritePlace) => {
    setDestination(place.full_address);
    setDropoffLat(place.latitude);
    setDropoffLng(place.longitude);
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [place.longitude, place.latitude], zoom: 14 });
    }
  };


  const [vehicleCategory, setVehicleCategory] = useState<'SEDAN' | 'SUV' | 'LUXURY' | 'AUTO'>('SEDAN');
  const [budget, setBudget] = useState(250.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeRide, setActiveRide] = useState<any | null>(null);

  useEffect(() => {
    const checkActiveRide = async () => {
      try {
        const { data } = await api.get('/passenger/active-ride');
        if (data && data.id) {
          setActiveRide(data);
        }
      } catch (err) {
        console.error('Failed to check active ride status', err);
      }
    };
    checkActiveRide();
  }, []);

  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [activeSearch, setActiveSearch] = useState<'pickup' | 'dest' | null>(null);

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationSecs, setDurationSecs] = useState<number | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pickupMarkerRef = useRef<maplibregl.Marker | null>(null);
  const dropoffMarkerRef = useRef<maplibregl.Marker | null>(null);

  const vehicles = [
    { id: 'SEDAN', label: 'Sedan', capacity: '4 Seats', multiplier: 1.0, desc: 'Comfortable everyday ride' },
    { id: 'SUV', label: 'SUV XL', capacity: '6 Seats', multiplier: 1.4, desc: 'Extra space for groups' },
    { id: 'LUXURY', label: 'Luxury', capacity: '4 Seats', multiplier: 2.0, desc: 'Premium executive cars' },
    { id: 'AUTO', label: 'Auto', capacity: '3 Seats', multiplier: 0.7, desc: 'Quick local rides' }
  ];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: LIGHT_MAP_STYLE,
      center: [77.6068, 12.9756],
      zoom: 12,
    });

    mapRef.current = map;

    map.on('load', () => {
      map.resize();

      const pMarker = new maplibregl.Marker({ color: '#0ea5e9', draggable: true })
        .setLngLat([pickupLng, pickupLat])
        .addTo(map);

      const dMarker = new maplibregl.Marker({ color: '#ef4444', draggable: true })
        .setLngLat([dropoffLng, dropoffLat])
        .addTo(map);

      pickupMarkerRef.current = pMarker;
      dropoffMarkerRef.current = dMarker;

      pMarker.on('dragend', () => {
        const coords = pMarker.getLngLat();
        handleReverseGeocode(coords.lat, coords.lng, 'pickup');
      });

      dMarker.on('dragend', () => {
        const coords = dMarker.getLngLat();
        handleReverseGeocode(coords.lat, coords.lng, 'dest');
      });

      fetchRoute(pickupLat, pickupLng, dropoffLat, dropoffLng);
    });

    map.on('click', (e: any) => {
      const coords = e.lngLat;
      handleReverseGeocode(coords.lat, coords.lng, 'dest');
    });

    const t1 = setTimeout(() => map.resize(), 100);
    const t2 = setTimeout(() => map.resize(), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLngLat([pickupLng, pickupLat]);
    }
  }, [pickupLat, pickupLng]);

  useEffect(() => {
    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.setLngLat([dropoffLng, dropoffLat]);
    }
  }, [dropoffLat, dropoffLng]);

  useEffect(() => {
    fetchRoute(pickupLat, pickupLng, dropoffLat, dropoffLng);
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng]);

  const handleReverseGeocode = async (lat: number, lng: number, type: 'pickup' | 'dest') => {
    try {
      const { data } = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
        params: {
          lat,
          lon: lng,
          format: 'json',
          addressdetails: 1
        }
      });
      const addr = data.address;
      const landmark = addr.neighbourhood || addr.suburb || addr.road || '';
      const district = addr.city || addr.district || addr.county || '';
      const state = addr.state || '';
      const pincode = addr.postcode || '';

      const addressText = data.display_name || `${landmark}, ${district}, ${state} - ${pincode}`;

      if (type === 'pickup') {
        setPickup(addressText);
        setPickupLat(lat);
        setPickupLng(lng);
      } else {
        setDestination(addressText);
        setDropoffLat(lat);
        setDropoffLng(lng);
      }
    } catch (err) {
      console.error('Nominatim reverse geocode failed', err);
    }
  };

  const fetchSuggestions = async (val: string, type: 'pickup' | 'dest') => {
    if (type === 'pickup') setPickup(val);
    else setDestination(val);

    if (val.length < 3) {
      if (type === 'pickup') setPickupSuggestions([]);
      else setDestSuggestions([]);
      return;
    }

    try {
      const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: val,
          format: 'json',
          limit: 5,
          addressdetails: 1
        }
      });
      if (type === 'pickup') setPickupSuggestions(data);
      else setDestSuggestions(data);
    } catch (err) {
      console.error('Nominatim search failed', err);
    }
  };

  const selectSuggestion = (item: any, type: 'pickup' | 'dest') => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    
    if (type === 'pickup') {
      setPickup(item.display_name);
      setPickupLat(lat);
      setPickupLng(lng);
      setPickupSuggestions([]);
    } else {
      setDestination(item.display_name);
      setDropoffLat(lat);
      setDropoffLng(lng);
      setDestSuggestions([]);
    }
    
    setActiveSearch(null);

    if (mapRef.current) {
      mapRef.current.panTo([lng, lat]);
    }
  };

  const fetchRoute = async (pLat: number, pLng: number, dLat: number, dLng: number) => {
    if (!mapRef.current) return;
    try {
      const { data } = await axios.get(`https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}`, {
        params: {
          overview: 'full',
          geometries: 'geojson',
          alternatives: 'true'
        }
      });
      const routes = data.routes;
      if (routes && routes.length > 0) {
        const primary = routes[0];
        setDistanceKm(primary.distance / 1000);
        setDurationSecs(primary.duration);

        const distance = primary.distance / 1000;
        const multiplier = vehicles.find(v => v.id === vehicleCategory)?.multiplier || 1.0;
        const baseFare = 50 + distance * 12 * multiplier;
        setBudget(Math.round(baseFare));

        drawRoutes(routes);
      }
    } catch (err) {
      console.error('OSRM routing request failed', err);
    }
  };

  const drawRoutes = (routes: any[]) => {
    const map = mapRef.current;
    if (!map) return;

    for (let i = 0; i < 5; i++) {
      if (map.getLayer(`route-layer-${i}`)) map.removeLayer(`route-layer-${i}`);
      if (map.getSource(`route-source-${i}`)) map.removeSource(`route-source-${i}`);
    }

    routes.forEach((route, i) => {
      const isPrimary = i === 0;
      map.addSource(`route-source-${i}`, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.geometry
        }
      });

      map.addLayer({
        id: `route-layer-${i}`,
        type: 'line',
        source: `route-source-${i}`,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': isPrimary ? '#0EA5E9' : '#94A3B8',
          'line-width': isPrimary ? 6 : 4,
          'line-opacity': isPrimary ? 0.95 : 0.6
        }
      });
    });

    const coordinates = routes[0].geometry.coordinates;
    const bounds = coordinates.reduce((acc: maplibregl.LngLatBounds, coord: [number, number]) => {
      return acc.extend(coord);
    }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

    map.fitBounds(bounds, { padding: 60 });
  };

  // Custom Floating Map Controls
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [pickupLng, pickupLat], zoom: 14 });
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pickup.trim().length < 3) {
      setError('Please enter a valid pickup address.');
      return;
    }
    if (destination.trim().length < 3) {
      setError('Please enter a valid destination address.');
      return;
    }
    if (budget < 1) {
      setError('Budget must be at least ₹1.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        pickup_address: pickup,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        dropoff_address: destination,
        dropoff_lat: dropoffLat,
        dropoff_lng: dropoffLng,
        category: vehicleCategory,
        vehicle_category: vehicleCategory,
        budget: budget,
        target_budget: budget,
      };

      const { data } = await api.post('/passenger/rides', payload);
      window.dispatchEvent(new Event('wallet_updated'));
      navigate(`/live-bids/${data.id}`, { state: { ride: data } });
    } catch (err: any) {
      const errData = err.response?.data;
      let msg = 'Failed to request ride bidding. Please try again.';
      if (typeof errData?.detail === 'string') {
        msg = errData.detail;
      } else if (Array.isArray(errData?.detail)) {
        msg = errData.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join('; ');
      } else if (errData?.message) {
        msg = errData.message;
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start pb-12">
      {/* Booking Form (Left Column) */}
      <div className="lg:col-span-5 bg-white rounded-[18px] p-6 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-5">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Book Your Ride</h2>
          <p className="text-xs text-gray-500 font-medium mt-1">Set pickup, destination & custom fare budget</p>
        </div>

        {activeRide && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl flex items-center justify-between gap-3 text-xs shadow-sm">
            <div>
              <span className="font-extrabold block text-sm">Active Ride In Progress ({activeRide.status})</span>
              <span className="text-[11px] text-amber-700">You have an ongoing ride request.</span>
            </div>
            <button
              type="button"
              onClick={() => navigate(activeRide.status === 'PENDING_BIDS' ? `/live-bids/${activeRide.id}` : `/tracking/${activeRide.id}`)}
              className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 transition-all shadow-sm"
            >
              View Active Ride →
            </button>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 text-rose-700 text-xs p-3.5 rounded-xl border border-rose-200 space-y-2">
            <div>{error}</div>
            {error.includes('active ride') && activeRide && (
              <button
                type="button"
                onClick={() => navigate(activeRide.status === 'PENDING_BIDS' ? `/live-bids/${activeRide.id}` : `/tracking/${activeRide.id}`)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 transition-colors inline-block"
              >
                Go to Active Ride →
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleConfirmBooking} className="space-y-4">
          {/* Pickup Input Search */}
          <div className="relative">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Pickup Point
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-[#0EA5E9] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pickup}
                onChange={(e) => fetchSuggestions(e.target.value, 'pickup')}
                onFocus={() => setActiveSearch('pickup')}
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] truncate"
                required
              />
            </div>
            {activeSearch === 'pickup' && pickupSuggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                {pickupSuggestions.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => selectSuggestion(item, 'pickup')}
                    className="w-full text-left p-3 text-xs text-gray-700 hover:bg-sky-50 truncate block font-medium"
                  >
                    {item.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination Input Search */}
          <div className="relative">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Drop-off Destination
            </label>
            <div className="relative">
              <Navigation className="w-4 h-4 text-rose-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={destination}
                onChange={(e) => fetchSuggestions(e.target.value, 'dest')}
                onFocus={() => setActiveSearch('dest')}
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] truncate"
                required
              />
            </div>
            {activeSearch === 'dest' && destSuggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                {destSuggestions.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => selectSuggestion(item, 'dest')}
                    className="w-full text-left p-3 text-xs text-gray-700 hover:bg-sky-50 truncate block font-medium"
                  >
                    {item.display_name}
                  </button>
                ))}
              </div>
            )}

            {/* Quick Favorite Place Shortcuts */}
            {favoritePlaces.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-0.5 no-scrollbar">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider shrink-0 mr-0.5">Favorites:</span>
                {favoritePlaces.map((place) => {
                  const Icon = 
                    place.place_type === 'HOME' ? Home :
                    place.place_type === 'WORK' ? Briefcase :
                    place.place_type === 'AIRPORT' ? Plane : MapIcon;
                  return (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => selectFavoritePlace(place)}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-[#E0F2FE] border border-[#0EA5E9]/30 text-[#0284C7] text-xs font-extrabold shrink-0 flex items-center gap-1.5 transition-all shadow-2xs group"
                    >
                      <Icon className="w-3 h-3 group-hover:scale-110 transition-transform" />
                      <span className="truncate max-w-[100px]">{place.place_name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>


          {/* Vehicle Category Selection */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              Vehicle Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {vehicles.map((v) => {
                const isSelected = vehicleCategory === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehicleCategory(v.id as any)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-[#0EA5E9] bg-[#E0F2FE] text-[#0284C7] font-bold shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Car className="w-5 h-5 mx-auto mb-1 text-[#0EA5E9]" />
                    <div className="text-xs font-bold truncate">{v.label}</div>
                    <div className="text-[10px] text-gray-500">{v.capacity}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Route Distance & Time Metrics */}
          {distanceKm !== null && durationSecs !== null && (
            <div className="grid grid-cols-2 gap-3 text-xs font-semibold bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-gray-700">
              <div>Est. Distance: <span className="text-gray-900 font-extrabold">{distanceKm.toFixed(1)} km</span></div>
              <div>Est. Travel Time: <span className="text-gray-900 font-extrabold">{Math.ceil(durationSecs / 60)} mins</span></div>
            </div>
          )}

          {/* Dynamic Budget Slider */}
          <div className="pt-2 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Target Budget Offer
              </label>
              <span className="text-2xl font-extrabold text-[#0EA5E9]">
                {formatCurrency(budget)}
              </span>
            </div>
            <input
              type="range"
              min={Math.round((distanceKm || 5) * 8)}
              max={Math.round((distanceKm || 5) * 35)}
              step="10"
              value={budget}
              onChange={(e) => setBudget(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0EA5E9]"
            />
            <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Recommended Range: {formatCurrency(budget * 0.9)} - {formatCurrency(budget * 1.1)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] hover:from-[#0284C7] hover:to-sky-800 text-white font-extrabold shadow-[0_4px_14px_rgba(14,165,233,0.35)] flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-4 text-sm"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Broadcast Fare Bids'}
          </button>
        </form>
      </div>

      {/* Map Container & Floating Map Controls (Right Column) */}
      <div className="lg:col-span-7 h-[480px] lg:h-[580px] rounded-[18px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-200 relative bg-gray-100">
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} className="w-full h-full" />
        
        {/* Floating Custom Map Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur-md border border-gray-200 text-gray-700 flex items-center justify-center shadow-md hover:bg-white transition-all"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur-md border border-gray-200 text-gray-700 flex items-center justify-center shadow-md hover:bg-white transition-all"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={handleRecenter}
            className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur-md border border-gray-200 text-[#0EA5E9] flex items-center justify-center shadow-md hover:bg-white transition-all"
            title="Locate Pickup"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

