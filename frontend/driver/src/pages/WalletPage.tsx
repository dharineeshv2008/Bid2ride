import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Wallet, WalletTransaction } from '../types';
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Loader2, DollarSign } from 'lucide-react';
import { formatCurrency } from '../utils/format';

export const WalletPage: React.FC = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cash Out State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('100');
  const [upiId, setUpiId] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum < 10) {
      setWithdrawError('Minimum withdrawal amount is ₹10.00');
      return;
    }
    if (!upiId) {
      setWithdrawError('UPI ID / Account Details required');
      return;
    }
    setWithdrawError('');
    setIsSubmitting(true);
    try {
      await api.post('/wallet/withdraw', {
        amount: amountNum,
        account_details: upiId
      });

      await fetchWalletData();

      setWithdrawSuccess(true);
      setTimeout(() => {
        setWithdrawSuccess(false);
        setShowWithdrawModal(false);
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Withdrawal failed. Please try again.';
      setWithdrawError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openWithdrawModal = () => {
    setWithdrawError('');
    setWithdrawSuccess(false);
    setWithdrawAmount('100');
    setUpiId('');
    setShowWithdrawModal(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Pilot Balance Banner */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-3xl p-6 sm:p-8 text-slate-950 shadow-emerald-glow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider bg-slate-950/20 px-3 py-1 rounded-full inline-block mb-2 text-slate-950">
            Available Driver Balance
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-display">
            {formatCurrency(wallet?.balance ?? 0.00)} <span className="text-sm font-semibold opacity-80">INR</span>
          </h2>
        </div>

        <button 
          onClick={openWithdrawModal}
          className="px-6 py-3 rounded-2xl bg-slate-950 text-emerald-400 font-extrabold text-sm shadow-xl hover:bg-slate-900 transition-colors"
        >
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

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-dark max-w-sm w-full p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden space-y-4">
            
            {withdrawSuccess && (
              <div className="absolute inset-0 bg-slate-950 z-10 flex flex-col items-center justify-center rounded-3xl gap-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <span className="text-xl font-bold">✓</span>
                </div>
                <p className="font-extrabold text-white text-lg">Withdrawal Initiated!</p>
                <p className="text-sm text-slate-400">
                  {formatCurrency(parseFloat(withdrawAmount))} sent to {upiId}.
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white font-display">Instant Cash Out</h3>
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                IMPS / UPI
              </span>
            </div>

            {withdrawError && (
              <div className="bg-rose-500/10 text-rose-400 text-xs p-3 rounded-xl border border-rose-500/20">
                {withdrawError}
              </div>
            )}

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Amount (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="10"
                    step="1"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Minimum withdrawal is ₹10.00</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  UPI VPA ID or Bank Account Details
                </label>
                <input
                  type="text"
                  placeholder="username@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-slate-350 font-bold text-xs hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-emerald-glow hover:bg-emerald-450 transition-colors flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin animate-spin-fast" />
                      Cashing Out...
                    </>
                  ) : (
                    `Cash Out ${formatCurrency(parseFloat(withdrawAmount) || 0)}`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
