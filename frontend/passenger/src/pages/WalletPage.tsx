import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useWallet } from '../contexts/WalletContext';
import { WalletTransaction } from '../types';
import { 
  Wallet as WalletIcon, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader2, 
  CreditCard,
  QrCode,
  Smartphone,
  Building,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Zap,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '../utils/format';

export const WalletPage: React.FC = () => {
  const { balance, currency, isLoading: balanceLoading, refreshWallet } = useWallet();

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [amount, setAmount] = useState('500');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState(false);
  const [topupError, setTopupError] = useState('');

  // Payment Options
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('SBI');

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const { data } = await api.get<{ items: WalletTransaction[]; total_count: number }>('/wallet/history');
      setTransactions(data.items ?? []);
    } catch (err) {
      console.error('Failed to load wallet transactions', err);
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 5) {
      setTopupError('Minimum top-up amount is ₹5.00');
      return;
    }
    setTopupError('');
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await api.post('/wallet/topup', { amount: amountNum });

      await refreshWallet();
      await fetchTransactions();
      window.dispatchEvent(new Event('wallet_updated'));

      setTopupSuccess(true);
      setTimeout(() => {
        setTopupSuccess(false);
        setShowTopupModal(false);
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Top-up failed. Please try again.';
      setTopupError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = () => {
    setTopupError('');
    setTopupSuccess(false);
    setAmount('500');
    setShowTopupModal(true);
  };

  const quickAmounts = [100, 250, 500, 1000, 2000];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Premium Balance Card */}
      <div className="bg-gradient-to-r from-[#0EA5E9] via-[#0284C7] to-sky-700 rounded-[18px] p-6 sm:p-8 text-white shadow-[0_10px_30px_rgba(14,165,233,0.3)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Secure Digital Wallet
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            {balanceLoading ? (
              <span className="inline-block w-40 h-10 bg-white/20 rounded-xl animate-pulse" />
            ) : (
              <>{formatCurrency(balance ?? 0.00)}</>
            )}
          </h2>
          <p className="text-sky-100 text-xs sm:text-sm mt-1.5 font-medium">Available balance for instant ride bookings</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 relative z-10 w-full sm:w-auto">
          <button
            onClick={openModal}
            className="px-6 py-3.5 rounded-xl bg-white text-[#0284C7] font-extrabold text-sm shadow-md hover:bg-sky-50 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 text-[#0EA5E9]" />
            Add Funds
          </button>
          <button
            onClick={() => { refreshWallet(); fetchTransactions(); }}
            className="px-4 py-3.5 rounded-xl bg-white/15 text-white text-xs font-bold hover:bg-white/25 transition-all flex items-center justify-center gap-1.5 backdrop-blur-md border border-white/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Payment Options & UPI info */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-[18px] p-5 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-bold shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">UPI AutoPay</h4>
            <p className="text-xs text-gray-500">Google Pay, PhonePe, Paytm</p>
          </div>
        </div>

        <div className="bg-white rounded-[18px] p-5 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">Cards & Banking</h4>
            <p className="text-xs text-gray-500">Visa, Mastercard, RuPay</p>
          </div>
        </div>

        <div className="bg-white rounded-[18px] p-5 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">Razorpay Checkout</h4>
            <p className="text-xs text-gray-500">100% Encrypted Gateway</p>
          </div>
        </div>
      </div>

      {/* Transactions History Ledger */}
      <div className="bg-white rounded-[18px] p-6 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Transaction History</h3>
          {txLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>

        {txLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-xl bg-gray-100 animate-pulse h-16" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center bg-gray-50 border border-gray-200 rounded-xl">
            <div className="w-14 h-14 rounded-xl bg-white border text-gray-300 flex items-center justify-center mx-auto mb-3">
              <WalletIcon className="w-7 h-7" />
            </div>
            <p className="text-gray-500 text-sm font-medium">No transactions recorded yet.</p>
            <p className="text-gray-400 text-xs mt-1">Add funds to start booking rides.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-300 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                      tx.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}
                  >
                    {tx.type === 'CREDIT' ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm capitalize">
                      {tx.transaction_purpose.toLowerCase().replace(/_/g, ' ')}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`font-extrabold text-sm ${
                      tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                  <span className={`block text-[10px] font-bold uppercase mt-0.5 ${
                    tx.type === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {tx.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top-up Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-[18px] border border-gray-200 shadow-2xl relative overflow-hidden space-y-4">

            {topupSuccess && (
              <div className="absolute inset-0 bg-white/95 z-10 flex flex-col items-center justify-center rounded-[18px] gap-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <p className="font-extrabold text-gray-900 text-lg">Top-up Successful!</p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(parseFloat(amount))} added to your balance.
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Add Wallet Funds</h3>
              <span className="text-[11px] font-bold text-[#0284C7] bg-[#E0F2FE] px-2.5 py-0.5 rounded-full border border-[#0EA5E9]/20">
                Razorpay Checkout
              </span>
            </div>

            {topupError && (
              <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-xl border border-rose-200">
                {topupError}
              </div>
            )}

            <form onSubmit={handleTopUp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Select Quick Amount
                </label>
                <div className="flex gap-2 flex-wrap">
                  {quickAmounts.map((qa) => (
                    <button
                      key={qa}
                      type="button"
                      onClick={() => setAmount(String(qa))}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        amount === String(qa)
                          ? 'border-[#0EA5E9] bg-[#E0F2FE] text-[#0284C7]'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      ₹{qa}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Amount (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-gray-700 text-sm">₹</span>
                  <input
                    type="number"
                    min="5"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]"
                    required
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Minimum top-up ₹5.00</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'UPI' as const, label: 'UPI Apps', icon: Smartphone },
                    { id: 'CARD' as const, label: 'Cards', icon: CreditCard },
                    { id: 'NETBANKING' as const, label: 'NetBanking', icon: Building },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPaymentMethod(id)}
                      className={`py-2 px-1 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                        paymentMethod === id
                          ? 'border-[#0EA5E9] bg-[#E0F2FE] text-[#0284C7] font-bold'
                          : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-[#0EA5E9]" />
                      <span className="text-[11px]">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'UPI' && (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      UPI VPA / ID
                    </label>
                    <input
                      type="text"
                      placeholder="username@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-white border border-gray-200 p-2 rounded-xl">
                    <QrCode className="w-5 h-5 text-[#0EA5E9]" />
                    <span>Dynamic QR code generated on payment.</span>
                  </div>
                </div>
              )}

              {paymentMethod === 'CARD' && (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Card Number</label>
                    <input
                      type="text"
                      placeholder="4321 0987 6543 2109"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Expiry</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">CVV</label>
                      <input
                        type="password"
                        placeholder="•••"
                        maxLength={3}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'NETBANKING' && (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select Bank</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full p-2 rounded-xl border border-gray-200 text-xs font-bold bg-white focus:outline-none"
                  >
                    <option value="SBI">State Bank of India (SBI)</option>
                    <option value="HDFC">HDFC Bank</option>
                    <option value="ICICI">ICICI Bank</option>
                    <option value="AXIS">Axis Bank</option>
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTopupModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white font-extrabold text-xs shadow-md hover:from-[#0284C7] hover:to-sky-800 flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay ${formatCurrency(parseFloat(amount) || 0)}`
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

