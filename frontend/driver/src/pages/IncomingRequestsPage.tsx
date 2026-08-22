import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../services/api';
import { RideRequest } from '../types';
import { Radio, MapPin, Navigation, DollarSign, Clock, Send, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../utils/format';

export const IncomingRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [biddingId, setBiddingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      const { data } = await api.get<RideRequest[]>('/driver/requests/nearby');
      setRequests((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(data)) {
          return prev;
        }
        return data;
      });
    } catch (err) {
      console.error('Failed to load active nearby ride requests', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    const intervalId = setInterval(fetchRequests, 5000);

    if (socket) {
      const handleReload = () => {
        fetchRequests();
      };
      socket.on('new_ride_request_broadcast', handleReload);
      socket.on('ride_available', handleReload);
      socket.on('new_ride_request', handleReload);
      socket.on('connect', handleReload);
      socket.on('reconnect', handleReload);

      return () => {
        clearInterval(intervalId);
        socket.off('new_ride_request_broadcast', handleReload);
        socket.off('ride_available', handleReload);
        socket.off('new_ride_request', handleReload);
        socket.off('connect', handleReload);
        socket.off('reconnect', handleReload);
      };
    }

    return () => clearInterval(intervalId);
  }, [socket]);

  const handlePlaceBid = async (requestId: string, amount: number) => {
    setBiddingId(requestId);
    setSubmitting(true);
    try {
      await api.post('/driver/bids', {
        request_id: requestId,
        amount: amount,
        bid_amount: amount,
        eta_minutes: 4,
      });
      alert(`Bid of ${formatCurrency(amount)} submitted successfully!`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit bid');
    } finally {
      setSubmitting(false);
      setBiddingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            Live Bidding Console
          </h2>
          <p className="text-xs text-slate-400">Nearby passenger ride requests awaiting bids.</p>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {requests.length === 0 ? (
            <div className="glass-panel-dark p-12 rounded-3xl border border-slate-800 text-center text-slate-500 text-sm">
              Listening for nearby ride broadcasts...
            </div>
          ) : (
            requests.map((req) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-panel-dark p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4"
              >
                {/* Header Info */}
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      {req.vehicle_category} REQUEST
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      {req.passenger_name || 'Passenger Traveler'} ★ {req.passenger_rating || 4.9}
                    </h3>
                  </div>

                  {/* Oversized Target Budget Anchor */}
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      Target Budget
                    </span>
                    <span className="text-3xl font-extrabold text-emerald-400 font-display">
                      {formatCurrency(req.target_budget)}
                    </span>
                  </div>
                </div>

                {/* Pickup & Dropoff Details */}
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">{req.pickup_address}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Navigation className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="truncate">{req.dropoff_address}</span>
                  </div>
                </div>

                {/* Distance & Time Info */}
                <div className="flex flex-wrap gap-4 text-xs text-slate-400 border-t border-slate-800/50 pt-2.5">
                  {req.distance_km !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{req.distance_km} km away</span>
                    </div>
                  )}
                  {req.created_at && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Requested: {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>

                {/* One-Tap Quick Bid Console Buttons */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    One-Tap Bidding Actions
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handlePlaceBid(req.id, req.target_budget)}
                      disabled={submitting && biddingId === req.id}
                      className="py-3 px-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-emerald-glow flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                    >
                      Match ({formatCurrency(req.target_budget)})
                    </button>

                    <button
                      onClick={() => handlePlaceBid(req.id, req.target_budget + 20)}
                      disabled={submitting && biddingId === req.id}
                      className="py-3 px-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-extrabold text-xs flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                    >
                      + ₹20 ({formatCurrency(req.target_budget + 20)})
                    </button>

                    <button
                      onClick={() => handlePlaceBid(req.id, req.target_budget + 50)}
                      disabled={submitting && biddingId === req.id}
                      className="py-3 px-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 font-extrabold text-xs flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                    >
                      + ₹50 ({formatCurrency(req.target_budget + 50)})
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
