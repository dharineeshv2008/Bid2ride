import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useFavoritePlaces } from '../contexts/FavoritePlacesContext';
import { FavoritePlaceModal } from '../components/FavoritePlaceModal';
import { api } from '../services/api';
import { SavedPlace, FavoritePlace, PlaceType } from '../types';

import { 
  MapPin, 
  Wallet as WalletIcon, 
  Clock, 
  Plus, 
  ChevronRight, 
  Navigation, 
  Home, 
  Briefcase, 
  Plane,
  CloudRain,
  Thermometer,
  Zap,
  Map,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Gift,
  ShieldCheck,
  Star,
  Bell,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/format';

interface RideHistoryItem {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  budget: number;
  category: string;
  status: string;
  created_at: string;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { balance, currency, isLoading: walletLoading, refreshWallet } = useWallet();
  const { favoritePlaces, isLoading: placesLoading, addFavoritePlace } = useFavoritePlaces();

  const [recentRides, setRecentRides] = useState<RideHistoryItem[]>([]);
  const [ridesLoading, setRidesLoading] = useState(true);
  const [ridesFailed, setRidesFailed] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addPlaceType, setAddPlaceType] = useState<PlaceType>('OTHER');


  // Weather state
  const weather = {
    temp: 24,
    condition: 'Passing Showers',
    location: 'Bengaluru, IN',
    icon: CloudRain
  };

  const [stats, setStats] = useState({
    totalRides: 0,
    completedRides: 0,
    activeRides: 0,
    totalSpent: 0
  });

  const fetchRecentRides = useCallback(async () => {
    setRidesLoading(true);
    setRidesFailed(false);
    try {
      const { data } = await api.get<{ items: RideHistoryItem[]; total_count: number }>(
        '/passenger/rides?skip=0&limit=20'
      );
      const items = data.items ?? [];
      setRecentRides(items.slice(0, 4));

      const total = data.total_count ?? items.length;
      const completed = items.filter((r) => r.status === 'COMPLETED').length;
      const active = items.filter((r) => ['PENDING_BIDS', 'MATCHED', 'IN_PROGRESS'].includes(r.status)).length;
      const spent = items.reduce((acc, r) => acc + (r.status === 'COMPLETED' ? (r.budget || 0) : 0), 0);

      setStats({
        totalRides: total,
        completedRides: completed,
        activeRides: active,
        totalSpent: spent
      });
    } catch (err) {
      console.error('[Dashboard] Failed to fetch recent rides', err);
      setRidesFailed(true);
      setRecentRides([]);
    } finally {
      setRidesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentRides();
  }, [fetchRecentRides]);


  useEffect(() => {
    const handler = () => {
      refreshWallet();
      fetchRecentRides();
    };
    window.addEventListener('wallet_updated', handler);
    return () => window.removeEventListener('wallet_updated', handler);
  }, [refreshWallet, fetchRecentRides]);

  const fallbackPlaces = [
    { label: 'Home', address: '742 Evergreen Terrace', icon: Home },
    { label: 'Work', address: '100 Financial Center Blvd', icon: Briefcase },
    { label: 'Airport', address: 'SFO International Airport', icon: Plane },
  ];

  const quickSuggestions = [
    { title: 'Office Route', desc: 'Direct ride to Work', destination: '100 Financial Center Blvd' },
    { title: 'Home Sweet Home', desc: 'Quick ride back Home', destination: '742 Evergreen Terrace' },
    { title: 'Airport Express', desc: 'Terminal drop-off', destination: 'SFO International Airport' },
  ];

  const promotions = [
    { code: 'BID2RIDE50', desc: 'Get 50% OFF on your next 3 rides', discount: '50% OFF', color: 'from-[#0EA5E9] to-[#0284C7]' },
    { code: 'AIRPORT20', desc: 'Flat ₹150 cashback on airport trips', discount: '₹150 OFF', color: 'from-emerald-500 to-teal-600' }
  ];

  const handleQuickBook = (destination: string) => {
    navigate('/book', { state: { destination } });
  };

  const getRideStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'IN_PROGRESS': return 'bg-sky-50 text-[#0284C7] border-sky-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const WeatherIconComponent = weather.icon;

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[#0EA5E9] via-[#0284C7] to-sky-700 rounded-[18px] p-6 sm:p-8 text-white shadow-[0_10px_30px_rgba(14,165,233,0.3)] relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Live Bidding Platform
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Welcome back, {user?.name || 'Traveler'} 👋
            </h1>
            <p className="text-sky-100 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
              Set your custom fare, broadcast to nearby drivers, and select the best offer in seconds.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/book"
                className="px-6 py-3.5 rounded-xl bg-white text-[#0284C7] font-bold text-sm shadow-md hover:bg-sky-50 hover:shadow-lg transition-all flex items-center gap-2 group"
              >
                <Navigation className="w-4 h-4 text-[#0EA5E9] group-hover:rotate-12 transition-transform" />
                Book Ride Now
              </Link>
            </div>
          </div>

          {/* Weather Widget */}
          <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/25 flex items-center gap-4 text-white shrink-0">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <WeatherIconComponent className="w-6 h-6 animate-pulse text-sky-100" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-sky-200" />
                <span className="text-base font-extrabold">{weather.temp}°C</span>
                <span className="text-xs opacity-80">• {weather.condition}</span>
              </div>
              <p className="text-xs text-sky-100 font-medium mt-0.5">{weather.location}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Ride Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-[18px] p-5 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-3.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)] transition-all">
          <div className="w-12 h-12 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-extrabold shrink-0">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Total Rides</span>
            <span className="text-xl font-extrabold text-gray-900">
              {ridesLoading ? <span className="inline-block w-8 h-5 bg-gray-100 rounded animate-pulse" /> : stats.totalRides}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-[18px] p-5 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-3.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)] transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-extrabold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Completed</span>
            <span className="text-xl font-extrabold text-gray-900">
              {ridesLoading ? <span className="inline-block w-8 h-5 bg-gray-100 rounded animate-pulse" /> : stats.completedRides}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-[18px] p-5 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-3.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)] transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-extrabold shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Active Rides</span>
            <span className="text-xl font-extrabold text-gray-900">
              {ridesLoading ? <span className="inline-block w-8 h-5 bg-gray-100 rounded animate-pulse" /> : stats.activeRides}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-[18px] p-5 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-3.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)] transition-all">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold shrink-0">
            <WalletIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Total Spent</span>
            <span className="text-lg font-extrabold text-gray-900">
              {ridesLoading ? <span className="inline-block w-12 h-5 bg-gray-100 rounded animate-pulse" /> : formatCurrency(stats.totalSpent)}
            </span>
          </div>
        </div>
      </div>

      {/* Wallet Summary & Favourite Places */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Wallet Balance Card */}
        <div className="lg:col-span-4 bg-white rounded-[18px] p-6 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
                  <WalletIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Wallet Balance</span>
                  {walletLoading ? (
                    <div className="h-8 w-28 bg-gray-100 rounded animate-pulse mt-1" />
                  ) : (
                    <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">
                      {formatCurrency(balance ?? 0.00)}
                    </h3>
                  )}
                </div>
              </div>
              <button
                onClick={refreshWallet}
                className="p-2 rounded-xl text-gray-400 hover:text-[#0EA5E9] hover:bg-sky-50 transition-colors"
                title="Refresh balance"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <Link
            to="/wallet"
            className="w-full mt-4 py-3 rounded-xl bg-[#E0F2FE] hover:bg-[#0EA5E9] text-[#0284C7] hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Top Up Wallet
          </Link>
        </div>

        {/* Favourite Places */}
        <div className="lg:col-span-8 bg-white rounded-[18px] p-6 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#0EA5E9]" />
                Favourite Places
              </h3>
              <Link to="/profile" className="text-xs font-bold text-[#0EA5E9] hover:underline flex items-center gap-0.5">
                Manage Places →
              </Link>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {placesLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-xl bg-gray-100 animate-pulse h-20" />
                ))
              ) : (
                [
                  { type: 'HOME' as PlaceType, label: 'Home', icon: Home, place: favoritePlaces.find((p) => p.place_type === 'HOME') },
                  { type: 'WORK' as PlaceType, label: 'Work', icon: Briefcase, place: favoritePlaces.find((p) => p.place_type === 'WORK') },
                  { type: 'AIRPORT' as PlaceType, label: 'Airport', icon: Plane, place: favoritePlaces.find((p) => p.place_type === 'AIRPORT') },
                ].map((preset) => {
                  const Icon = preset.icon;
                  if (preset.place) {
                    return (
                      <button
                        key={preset.type}
                        onClick={() => navigate('/book', { state: { destination: preset.place?.full_address, dropoffLat: preset.place?.latitude, dropoffLng: preset.place?.longitude } })}
                        className="p-4 rounded-xl bg-[#E0F2FE]/40 border border-[#0EA5E9]/30 hover:border-[#0EA5E9] hover:bg-[#E0F2FE]/80 hover:shadow-md text-left transition-all group relative"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white text-[#0EA5E9] flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm truncate">{preset.place.place_name}</h4>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{preset.place.full_address}</p>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={preset.type}
                      onClick={() => { setAddPlaceType(preset.type); setIsAddModalOpen(true); }}
                      className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-300 hover:border-[#0EA5E9] hover:bg-sky-50/50 text-left transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-400 group-hover:text-[#0EA5E9] group-hover:border-[#0EA5E9] flex items-center justify-center mb-2 shadow-sm transition-colors">
                          <Plus className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-gray-800 text-xs group-hover:text-[#0EA5E9]">Add {preset.label}</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">Quick book shortcut</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <FavoritePlaceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={async (payload) => {
          await addFavoritePlace(payload as any);
        }}
        defaultPlaceType={addPlaceType}
      />


      {/* Quick Actions & Promotions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-[18px] p-6 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Quick Book Shortcuts
          </h3>
          <div className="space-y-3">
            {quickSuggestions.map((sug) => (
              <button
                key={sug.title}
                onClick={() => handleQuickBook(sug.destination)}
                className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#0EA5E9] hover:bg-white hover:shadow-md flex items-center justify-between text-left transition-all group"
              >
                <div>
                  <h4 className="font-bold text-gray-900 text-sm group-hover:text-[#0EA5E9] transition-colors">{sug.title}</h4>
                  <p className="text-xs text-gray-500 truncate max-w-xs mt-0.5">{sug.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#0EA5E9] group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>

        {/* Exclusive Promotions */}
        <div className="bg-white rounded-[18px] p-6 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Gift className="w-4 h-4 text-rose-500" />
            Exclusive Promotions & Offers
          </h3>
          <div className="space-y-3">
            {promotions.map((promo) => (
              <div
                key={promo.code}
                className={`p-4 rounded-xl bg-gradient-to-r ${promo.color} text-white shadow-md relative overflow-hidden flex items-center justify-between`}
              >
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full inline-block mb-1">
                    {promo.code}
                  </span>
                  <p className="text-xs font-semibold text-white/90">{promo.desc}</p>
                </div>
                <span className="text-lg font-extrabold bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg">
                  {promo.discount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Trips Section */}
      <div className="bg-white rounded-[18px] p-6 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0EA5E9]" />
            Recent Trips
          </h3>
          <Link to="/history" className="text-xs font-bold text-[#0EA5E9] hover:underline flex items-center gap-0.5">
            View Full History
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {ridesLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-xl bg-gray-100 animate-pulse h-16" />
            ))
          ) : ridesFailed ? (
            <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-xl">
              <XCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              Failed to load recent rides. 
              <button onClick={fetchRecentRides} className="ml-1 text-[#0EA5E9] underline font-bold">Retry</button>
            </div>
          ) : recentRides.length > 0 ? (
            recentRides.map((ride) => (
              <div key={ride.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-300 flex items-center justify-between transition-all">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white text-[#0EA5E9] border border-gray-200 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    {ride.category?.slice(0, 3) || 'RDE'}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate max-w-[200px] sm:max-w-md">
                      {ride.pickup_address?.split(',')[0] || 'Pickup'} → {ride.dropoff_address?.split(',')[0] || 'Drop'}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {new Date(ride.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-extrabold text-gray-900 text-sm">{formatCurrency(ride.budget)}</span>
                  <span className={`block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${getRideStatusColor(ride.status)}`}>
                    {ride.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-white text-gray-300 flex items-center justify-center mx-auto mb-3 border">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-xs text-gray-500 font-medium">No rides requested yet.</p>
              <Link to="/book" className="text-xs text-[#0EA5E9] font-bold mt-1 inline-block hover:underline">
                Book your first ride now →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

