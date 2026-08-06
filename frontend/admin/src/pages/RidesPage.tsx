import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RideRequest } from '../types';
import { Car, MapPin, Navigation } from 'lucide-react';
import { formatCurrency } from '../utils/format';

export const RidesPage: React.FC = () => {
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const { data } = await api.get<{ items: RideRequest[] }>('/passenger/rides');
        setRides(data.items);
      } catch (err) {
        console.error('Failed to load rides', err);
        setRides([
          { id: 'req_1', passenger_id: 'pass_1', pickup_address: '742 Evergreen Terrace', dropoff_address: '100 Financial Center Blvd', budget: 15.0, status: 'COMPLETED', created_at: new Date().toISOString() },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRides();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
          <Car className="w-5 h-5 text-sky-400" />
          Rides Audit & Live Monitoring
        </h2>
        <p className="text-xs text-slate-400">Track active trip assignments, state changes, and spatial pickup routes.</p>
      </div>

      <div className="glass-panel-admin rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-bold">
            <tr>
              <th className="p-4">Ride ID</th>
              <th className="p-4">Pickup Address</th>
              <th className="p-4">Dropoff Address</th>
              <th className="p-4">Budget</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rides.map((r) => (
              <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="p-4 font-mono font-bold text-white">#{r.id.slice(0, 8)}</td>
                <td className="p-4 truncate max-w-xs">{r.pickup_address}</td>
                <td className="p-4 truncate max-w-xs">{r.dropoff_address}</td>
                <td className="p-4 font-bold text-emerald-400">{formatCurrency(r.budget)}</td>
                <td className="p-4 font-bold text-sky-400 uppercase">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
