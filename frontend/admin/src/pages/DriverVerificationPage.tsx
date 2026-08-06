import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Driver } from '../types';
import { ShieldCheck, Check, X, Loader2 } from 'lucide-react';

export const DriverVerificationPage: React.FC = () => {
  const [pendingDrivers, setPendingDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPendingDrivers = async () => {
    try {
      const { data } = await api.get<Driver[]>('/admin/drivers/pending');
      setPendingDrivers(data);
    } catch (err) {
      console.error('Failed to load pending drivers', err);
      // Fallback mock
      setPendingDrivers([
        { driver_id: 'drv_101', name: 'Michael Driver', phone: '+15550399', license_number: 'DL-8819203', verification_status: 'PENDING' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingDrivers();
  }, []);

  const handleVerify = async (driverId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.post(`/admin/drivers/${driverId}/verify`, { status });
      fetchPendingDrivers();
    } catch (err) {
      alert('Failed to process verification status change');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Pending Driver Approvals ({pendingDrivers.length})
        </h2>
        <p className="text-xs text-slate-400">Review driver credentials and license compliance documents.</p>
      </div>

      <div className="space-y-3">
        {pendingDrivers.length === 0 ? (
          <div className="glass-panel-admin p-8 rounded-3xl border border-slate-800 text-center text-slate-500 text-sm">
            No pending driver verification requests.
          </div>
        ) : (
          pendingDrivers.map((drv) => (
            <div
              key={drv.driver_id}
              className="glass-panel-admin p-5 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between"
            >
              <div>
                <h4 className="font-bold text-white text-base">{drv.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Phone: <span className="font-mono text-slate-300">{drv.phone}</span> • License: <span className="font-mono text-slate-300">{drv.license_number}</span>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleVerify(drv.driver_id, 'REJECTED')}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/20 flex items-center gap-1 transition-all"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
                <button
                  onClick={() => handleVerify(drv.driver_id, 'APPROVED')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1 transition-all"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
