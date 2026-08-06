import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Wallet, WalletTransaction } from '../types';
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Loader2, DollarSign } from 'lucide-react';
import { formatCurrency } from '../utils/format';

export const WalletPage: React.FC = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        const [walletRes, historyRes] = await Promise.all([
          api.get<Wallet>('/wallet'),
          api.get<{ items: WalletTransaction[] }>('/wallet/history'),
        ]);
        setWallet(walletRes.data);
        setTransactions(historyRes.data.items);
      } catch (err) {
        console.error('Failed to load wallet data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWalletData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Pilot Balance Banner */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-3xl p-6 sm:p-8 text-slate-950 shadow-emerald-glow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider bg-slate-950/20 px-3 py-1 rounded-full inline-block mb-2 text-slate-950">
            Available Driver Balance
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-display">
            {formatCurrency(wallet?.balance ?? 210.00)} <span className="text-sm font-semibold opacity-80">INR</span>
          </h2>
        </div>

        <button className="px-6 py-3 rounded-2xl bg-slate-950 text-emerald-400 font-extrabold text-sm shadow-xl hover:bg-slate-900 transition-colors">
          Instant Cash Out
        </button>
      </div>

      {/* Driver Transaction Ledger */}
      <div className="glass-panel-dark p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
        <h3 className="text-lg font-bold text-white font-display">Earnings & Payout Ledger</h3>

        {transactions.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">No transaction records found.</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${tx.type === 'CREDIT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {tx.type === 'CREDIT' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{tx.transaction_purpose.replace('_', ' ')}</h4>
                    <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-extrabold text-sm ${tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
