import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Navigation,
  Car,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { formatCurrency } from '../utils/format';

interface RideHistoryItem {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  budget: number;
  category: string;
  status: 'PENDING_BIDS' | 'MATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.FC<any> }> = {
  COMPLETED:    { label: 'Completed',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
  CANCELLED:    { label: 'Cancelled',    color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',    icon: XCircle },
  IN_PROGRESS:  { label: 'In Progress',  color: 'text-[#0284C7]',   bg: 'bg-[#E0F2FE]',   border: 'border-sky-200',     icon: Navigation },
  MATCHED:      { label: 'Matched',      color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  icon: MapPin },
  PENDING_BIDS: { label: 'Awaiting Bids', color: 'text-amber-700', bg: 'bg-amber-50',   border: 'border-amber-200',   icon: Clock },
};

export const HistoryPage: React.FC = () => {
  const [rides, setRides] = useState<RideHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFailed, setHasFailed] = useState(false);
  const [skip, setSkip] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 10;

  const fetchRides = useCallback(async (offset = 0) => {
    setIsLoading(true);
    setHasFailed(false);
    try {
      const { data } = await api.get<{ items: RideHistoryItem[]; total_count: number }>(
        `/passenger/rides?skip=${offset}&limit=${LIMIT}`
      );
      setRides(data.items ?? []);
      setTotalCount(data.total_count ?? 0);
      setSkip(offset);
    } catch (err: any) {
      console.error('[HistoryPage] Failed to load ride history', err);
      setHasFailed(true);
      setRides([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRides(0);
  }, [fetchRides]);

  const totalPages = Math.ceil(totalCount / LIMIT);
  const currentPage = Math.floor(skip / LIMIT) + 1;

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

  const filteredRides = rides.filter((r) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return ['PENDING_BIDS', 'MATCHED', 'IN_PROGRESS'].includes(r.status);
    if (statusFilter === 'COMPLETED') return r.status === 'COMPLETED';
    if (statusFilter === 'CANCELLED') return r.status === 'CANCELLED';
    return true;
  });

  const handleCancelRide = async (rideId: string) => {
    if (confirm('Are you sure you want to cancel this ride request?')) {
      try {
        await api.post(`/passenger/rides/${rideId}/cancel`);
        fetchRides(skip);
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to cancel ride');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Ride History</h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Complete record of your past ride requests ({totalCount} trips)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter Tabs */}
          <div className="flex bg-gray-100 p-1.5 rounded-xl text-xs font-bold border border-gray-200">
            {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg transition-all capitalize ${
                  statusFilter === tab
                    ? 'bg-white text-[#0EA5E9] shadow-sm font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.toLowerCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchRides(0)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#0EA5E9]' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white p-5 rounded-[18px] border border-gray-200 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
                <div className="h-6 w-16 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && hasFailed && (
        <div className="bg-white p-12 rounded-[18px] border border-rose-200 text-center shadow-sm">
          <XCircle className="w-12 h-12 mx-auto mb-3 text-rose-400" />
          <h3 className="font-bold text-gray-900 mb-1">Failed to Load Ride History</h3>
          <p className="text-xs text-gray-500 mb-4">Could not connect to backend services.</p>
          <button
            onClick={() => fetchRides(0)}
            className="px-5 py-2.5 rounded-xl bg-[#0EA5E9] text-white text-xs font-bold hover:bg-[#0284C7] transition-all shadow-md"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !hasFailed && filteredRides.length === 0 && (
        <div className="bg-white p-12 rounded-[18px] border border-gray-200 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="w-16 h-16 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">No Rides Found</h3>
          <p className="text-xs text-gray-500 mb-4">
            {statusFilter !== 'ALL' ? `No ${statusFilter.toLowerCase()} rides match your filter.` : 'Your trip history will appear here once you book a ride.'}
          </p>
          <Link
            to="/book"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white text-xs font-extrabold hover:from-[#0284C7] hover:to-sky-800 transition-all shadow-[0_4px_14px_rgba(14,165,233,0.35)]"
          >
            <Navigation className="w-4 h-4" />
            Book a Ride Now
          </Link>
        </div>
      )}

      {/* Rides list */}
      {!isLoading && !hasFailed && filteredRides.length > 0 && (
        <div className="space-y-3">
          {filteredRides.map((ride) => {
            const statusCfg = STATUS_CONFIG[ride.status] || STATUS_CONFIG['PENDING_BIDS'];
            const StatusIcon = statusCfg.icon;
            return (
              <div
                key={ride.id}
                className="bg-white p-5 rounded-[18px] border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)] flex items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-11 h-11 rounded-xl ${statusCfg.bg} ${statusCfg.color} border ${statusCfg.border} flex items-center justify-center shrink-0`}>
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm truncate">
                      {ride.pickup_address?.split(',')[0] || 'Pickup'}
                      <span className="text-gray-400 font-normal mx-1.5">→</span>
                      {ride.dropoff_address?.split(',')[0] || 'Drop-off'}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 font-medium">
                        {new Date(ride.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className="text-[10px] font-bold text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded-full border border-[#0EA5E9]/20">
                        {ride.category}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right shrink-0">
                  {['PENDING_BIDS', 'MATCHED'].includes(ride.status) && (
                    <button
                      onClick={() => handleCancelRide(ride.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-[10px] border border-rose-200 uppercase transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <div>
                    <span className="text-lg font-extrabold text-gray-900">
                      {formatCurrency(ride.budget)}
                    </span>
                    <span className={`block text-[10px] font-bold uppercase mt-0.5 px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !hasFailed && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => fetchRides(Math.max(0, skip - LIMIT))}
            disabled={currentPage === 1}
            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-500 font-bold">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => fetchRides(skip + LIMIT)}
            disabled={currentPage >= totalPages}
            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

