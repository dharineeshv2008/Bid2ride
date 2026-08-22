import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../services/api';
import { DriverBid } from '../types';
import { Radar, Star, Clock, Check, X, Shield, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../utils/format';

export const LiveBiddingPage: React.FC = () => {
  const { rideId } = useParams<{ rideId: string }>();
  const navigate = useNavigate();
  const { socket, joinRoom, leaveRoom } = useSocket();

  const [bids, setBids] = useState<DriverBid[]>([]);
  const [filter, setFilter] = useState<'VALUE' | 'CHEAPEST' | 'FASTEST'>('VALUE');
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!rideId) return;

    // Join Socket room
    joinRoom(`ride:${rideId}`);

    // Initial & recurring polling for bids fallback
    const fetchBids = async () => {
      try {
        const { data } = await api.get<DriverBid[]>(`/passenger/rides/${rideId}/bids`);
        if (Array.isArray(data)) {
          setBids(data);
        }
      } catch (err) {
        console.error('Failed to fetch bids', err);
      }
    };
    fetchBids();
    const pollInterval = setInterval(fetchBids, 3000);

    // Socket Event listeners
    if (socket) {
      const handleNewBid = (bid: DriverBid) => {
        setBids((prev) => {
          const exists = prev.some((b) => b.id === bid.id || (bid.bid_id && b.id === bid.bid_id));
          if (exists) return prev.map((b) => (b.id === bid.id ? bid : b));
          return [...prev, bid];
        });
      };

      socket.on('bid_received', handleNewBid);
      socket.on('new_bid_received', handleNewBid);
      socket.on('bid_updated', handleNewBid);

      return () => {
        clearInterval(pollInterval);
        socket.off('bid_received', handleNewBid);
        socket.off('new_bid_received', handleNewBid);
        socket.off('bid_updated', handleNewBid);
        leaveRoom(`ride:${rideId}`);
      };
    }

    return () => clearInterval(pollInterval);
  }, [rideId, socket]);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAcceptBid = async (bidId: string) => {
    setAcceptingBidId(bidId);
    try {
      const { data } = await api.post(`/passenger/bids/${bidId}/accept`);
      navigate(`/tracking/${data.data?.ride_id || data.data?.id || data.data?.assignment_id || data.id}`);
    } catch (err) {
      alert('Failed to accept driver bid. It may have expired.');
      setAcceptingBidId(null);
    }
  };

  const handleCancelRequest = async () => {
    if (confirm('Are you sure you want to cancel this ride request?')) {
      try {
        await api.post(`/passenger/rides/${rideId}/cancel`);
        navigate('/dashboard');
      } catch (_) {
        navigate('/dashboard');
      }
    }
  };

  // Sorting logic
  const sortedBids = [...bids].sort((a, b) => {
    if (filter === 'CHEAPEST') return a.bid_amount - b.bid_amount;
    if (filter === 'FASTEST') return a.eta_minutes - b.eta_minutes;
    // Default VALUE calculation
    return a.bid_amount - b.bid_amount;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Live Radar Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 shadow-card text-center relative overflow-hidden">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center text-sky-500 radar-pulse">
            <Radar className="w-8 h-8 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 font-display">Searching Nearby Drivers</h2>
        <p className="text-xs text-slate-500 mt-1">Drivers are evaluating your offer. Bids appear in real time.</p>

        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
          <Clock className="w-3.5 h-3.5" />
          <span>Room Closes In: {countdown}s</span>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Incoming Offers ({bids.length})
        </span>

        <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl">
          {(['VALUE', 'CHEAPEST', 'FASTEST'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filter === f ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f === 'VALUE' ? 'Best Value' : f === 'CHEAPEST' ? 'Cheapest' : 'Fastest'}
            </button>
          ))}
        </div>
      </div>

      {/* Bids List */}
      <div className="space-y-3">
        <AnimatePresence>
          {sortedBids.length === 0 ? (
            <div className="glass-panel p-8 rounded-3xl border border-slate-200 text-center text-slate-400 text-sm">
              Waiting for driver responses...
            </div>
          ) : (
            sortedBids.map((bid, idx) => (
              <motion.div
                key={bid.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`glass-panel p-5 rounded-3xl border transition-all flex items-center justify-between shadow-sm ${
                  idx === 0 && filter === 'VALUE'
                    ? 'border-sky-400 bg-gradient-to-r from-sky-50/50 to-white ring-2 ring-sky-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-lg border border-sky-200">
                    {bid.driver_name?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-base">{bid.driver_name || 'Driver Pilot'}</h4>
                      {idx === 0 && filter === 'VALUE' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-500 text-white shadow-glow">
                          <Sparkles className="w-3 h-3" /> Best Value
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {bid.driver_rating || '4.9'}
                      </span>
                      <span>•</span>
                      <span>{bid.vehicle_model || 'Toyota Camry'}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">{bid.eta_minutes} mins ETA</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-slate-900 font-display">
                      {formatCurrency(bid.bid_amount)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleAcceptBid(bid.id)}
                    disabled={acceptingBidId === bid.id}
                    className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm shadow-glow flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {acceptingBidId === bid.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Accept
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Cancel Request Footer */}
      <div className="text-center pt-4">
        <button
          onClick={handleCancelRequest}
          className="text-xs font-semibold text-rose-500 hover:text-rose-600 inline-flex items-center gap-1"
        >
          <X className="w-4 h-4" /> Cancel Ride Request
        </button>
      </div>
    </div>
  );
};
