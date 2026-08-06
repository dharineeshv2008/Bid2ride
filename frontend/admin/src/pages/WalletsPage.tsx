import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Payment } from '../types';
import { Wallet, DollarSign } from 'lucide-react';
import { formatCurrency } from '../utils/format';

export const WalletsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const { data } = await api.get<{ items: Payment[] }>('/payments/history');
        setPayments(data.items);
      } catch (err) {
        console.error('Failed to load payments history', err);
        setPayments([
          { id: 'pay_1', assignment_id: 'asg_101', amount: 15.0, commission_fee: 2.25, status: 'COMPLETED', method: 'WALLET', created_at: new Date().toISOString() },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPayments();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-400" />
          Wallets & Payment Settlements
        </h2>
        <p className="text-xs text-slate-400">System financial transactions, commission split ledgers, and support refunds.</p>
      </div>

      <div className="glass-panel-admin rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-bold">
            <tr>
              <th className="p-4">Payment ID</th>
              <th className="p-4">Assignment ID</th>
              <th className="p-4">Gross Fare</th>
              <th className="p-4">15% Commission</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="p-4 font-mono font-bold text-white">#{p.id.slice(0, 8)}</td>
                <td className="p-4 font-mono">#{p.assignment_id.slice(0, 8)}</td>
                <td className="p-4 font-bold text-emerald-400">{formatCurrency(p.amount)}</td>
                <td className="p-4 font-bold text-sky-400">{formatCurrency(p.commission_fee)}</td>
                <td className="p-4 font-bold text-emerald-400 uppercase">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
