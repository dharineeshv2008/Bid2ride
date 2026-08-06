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

  useEffect(() => {
    // Initial fetch of active spatial requests
    const fetchRequests = async () => {
      try {
        const { data } = await api.get<RideRequest[]>('/driver/requests/nearby');
        setRequests(data);
      } catch (err) {
        // Mock fallback requests if backend endpoint is initializing
        setRequests([
          {
            id: 'mock_req_1',
            passenger_id: 'pass_1',
            pickup_address: 'T. Nagar Bus Terminus, Chennai',
            pickup_lat: 13.0418,
            pickup_lng: 80.2341,
            dropoff_address: 'Guindy Kathipara Junction, Chennai',
            dropoff_lat: 13.0067,
            dropoff_lng: 80.2020,
            vehicle_category: 'SEDAN',
            target_budget: 240.0,
            created_at: new Date().toISOString(),
            passenger_name: 'Suresh Kumar',
            passenger_rating: 4.9,
          },
          {
            id: 'mock_req_2',
            passenger_id: 'pass_2',
            pickup_address: 'Indiranagar 100ft Road, Bengaluru',
            pickup_lat: 12.9784,
            pickup_lng: 77.6408,
            dropoff_address: 'Kempegowda International Airport, Bengaluru',
            dropoff_lat: 13.1986,
            dropoff_lng: 77.7066,
            vehicle_category: 'LUXURY',
            target_budget: 850.0,
            created_at: new Date().toISOString(),
            passenger_name: 'Anitha Vasudevan',
            passenger_rating: 4.95,
          },
          {
            id: 'mock_req_3',
            passenger_id: 'pass_3',
            pickup_address: 'RS Puram West, Coimbatore',
            pickup_lat: 11.0084,
            pickup_lng: 76.9497,
            dropoff_address: 'Gandhipuram Bus Stand, Coimbatore',
            dropoff_lat: 11.0183,
            dropoff_lng: 76.9664,
            vehicle_category: 'AUTO',
            target_budget: 110.0,
            created_at: new Date().toISOString(),
            passenger_name: 'Ramesh Kannan',
            passenger_rating: 4.8,
          },
        ]);
      }
    };
    fetchRequests();

    if (socket) {
      const handleNewRequest = (req: RideRequest) => {
        setRequests((prev) => [req, ...prev]);
      };
      socket.on('new_ride_request_broadcast', handleNewRequest);

      return () => {
        socket.off('new_ride_request_broadcast', handleNewRequest);
      };
    }
  }, [socket]);

  const handlePlaceBid = async (requestId: string, amount: number) => {
    setBiddingId(requestId);
    setSubmitting(true);
    try {
      await api.post('/driver/bids', {
        request_id: requestId,
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
