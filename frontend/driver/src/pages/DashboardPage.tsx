import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { 
  Power, 
  TrendingUp, 
  Car, 
  Star, 
  Radio, 
  Wallet, 
  ChevronRight,
  Zap,
  Award,
  BarChart3,
  Flame,
  PieChart
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/format';

export const DashboardPage: React.FC = () => {
  const { user, driverProfile, toggleOnlineStatus } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await api.get('/driver/dashboard');
        setDashboardData(data);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const isOnline = driverProfile?.online_status || dashboardData?.online_status || false;
  const rating = driverProfile?.rating ?? dashboardData?.rating ?? 4.9;
  const acceptanceRate = (driverProfile as any)?.acceptance_rate ?? dashboardData?.acceptance_rate ?? 92.0;
  const walletBalance = dashboardData?.wallet_balance ?? 0.00;

  const weeklyEarnings = dashboardData?.weekly_performance?.length
    ? dashboardData.weekly_performance
    : [
        { day: 'Mon', amount: 0 },
        { day: 'Tue', amount: 0 },
        { day: 'Wed', amount: 0 },
        { day: 'Thu', amount: 0 },
        { day: 'Fri', amount: 0 },
        { day: 'Sat', amount: 0 },
        { day: 'Sun', amount: 0 },
      ];

  const totalWeeklyEarnings = weeklyEarnings.reduce((acc: number, curr: any) => acc + curr.amount, 0);
  const maxAmount = Math.max(...weeklyEarnings.map((e: any) => e.amount), 1);

  return (
    <div className="space-y-6 pb-12">
      {/* Pilot Header Banner */}
      <div className="glass-panel-dark border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-650'}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isOnline ? 'Available for Bidding' : 'Offline'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-display">
              Welcome Back, {user?.name || 'Pilot'} ⚡
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Rating: {rating} ★ • Acceptance Rate: {acceptanceRate}%
            </p>
          </div>

          <button
            onClick={() => toggleOnlineStatus(!isOnline)}
            className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-3 transition-all ${
              isOnline
                ? 'bg-emerald-500 text-slate-950 online-glow hover:bg-emerald-400'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Power className="w-5 h-5" />
            <span>{isOnline ? 'GO OFFLINE' : 'GO ONLINE'}</span>
          </button>
        </div>
      </div>

      {/* Active Trip Banner */}
      {dashboardData?.active_assignment && (
        <div className="glass-panel-dark border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-emerald-glow">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-500/20 px-3 py-1 rounded-full inline-block mb-1.5">
              Active Trip In Progress ({dashboardData.active_assignment.status.replace('_', ' ')})
            </span>
            <h3 className="text-lg font-bold text-white">
              {dashboardData.active_assignment.pickup_address} → {dashboardData.active_assignment.dropoff_address}
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Price: {formatCurrency(dashboardData.active_assignment.price)} • OTP Verification Code: <span className="font-mono text-emerald-300 font-extrabold">{dashboardData.active_assignment.otp}</span>
            </p>
          </div>
          <Link
            to={`/active/${dashboardData.active_assignment.assignment_id}`}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-emerald-glow text-center transition-colors"
          >
            Resume Trip →
          </Link>
        </div>
      )}

      {/* Earnings & Key Metrics Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="glass-panel-dark p-5 rounded-3xl border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Today's Earnings</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-3xl font-extrabold text-emerald-400 font-display">
            {formatCurrency(dashboardData?.today_earnings ?? 0.0)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Directly credited to wallet</p>
        </div>

        <div className="glass-panel-dark p-5 rounded-3xl border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Completed Trips</span>
            <Car className="w-4 h-4 text-sky-400" />
          </div>
          <h3 className="text-3xl font-extrabold text-white font-display">
            {dashboardData?.completed_trips ?? 0}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Target: {dashboardData?.completed_trips ? dashboardData.completed_trips + 3 : 5} trips</p>
        </div>

        <div className="glass-panel-dark p-5 rounded-3xl border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Bids Win Rate</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-3xl font-extrabold text-white font-display">
            {Math.round((dashboardData?.win_rate ?? 1.0) * 100)}%
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">High competitive edge</p>
        </div>

        <div className="glass-panel-dark p-5 rounded-3xl border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Wallet Balance</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-3xl font-extrabold text-white font-display">
            {isLoading ? '...' : formatCurrency(walletBalance)}
          </h3>
          <Link to="/wallet" className="text-[11px] font-bold text-emerald-400 hover:underline block mt-1">
            Cash Out Now →
          </Link>
        </div>
      </div>

      {/* Analytics Graph & Heatmap Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Earnings Analytics Chart */}
        <div className="glass-panel-dark p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-emerald-400" />
              Weekly Performance Analytics
            </h3>
            <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Total: {formatCurrency(totalWeeklyEarnings)}
            </span>
          </div>

          {/* Pure SVG Custom Bar Chart */}
          <div className="pt-4 h-48 flex items-end justify-between gap-2 px-2 relative">
            {/* Grid Y-axis guides */}
            <div className="absolute inset-x-0 bottom-0 h-[25%] border-b border-slate-800/50 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-[50%] border-b border-slate-800/50 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-[75%] border-b border-slate-800/50 pointer-events-none" />

            {weeklyEarnings.map((item: any, idx: number) => {
              const pct = (item.amount / maxAmount) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group z-10">
                  <div className="relative w-full flex justify-center">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1.5 hidden group-hover:block bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] font-bold text-white shadow-xl pointer-events-none whitespace-nowrap">
                      {formatCurrency(item.amount)}
                    </div>
                    {/* Bar */}
                    <div 
                      style={{ height: `${pct}%` }} 
                      className="w-8 sm:w-10 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg group-hover:from-emerald-500 group-hover:to-emerald-300 transition-all duration-300 shadow-lg min-h-[10px]"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 group-hover:text-white transition-colors">{item.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Demand Heatmap Placeholder Widget */}
        <div className="glass-panel-dark p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4.5 h-4.5 text-rose-500" />
                Live Rider Demand Radar
              </h3>
              <span className="text-xs text-rose-400 font-bold bg-rose-500/10 px-2.5 py-0.5 rounded-full animate-pulse">
                High Activity
              </span>
            </div>
            
            {/* Visual Heatmap grid representation */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-850 flex flex-col gap-2">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { zone: 'Zone A (Anna Salai / T. Nagar)', level: 'CRITICAL', color: 'bg-rose-500/35 border-rose-500/60' },
                  { zone: 'Zone B (Airport Transit Hub)', level: 'HIGH', color: 'bg-orange-500/35 border-orange-500/60' },
                  { zone: 'Zone C (OMR Tech Corridor)', level: 'MODERATE', color: 'bg-amber-500/20 border-amber-500/40' },
                  { zone: 'Zone D (Salem / Namakkal Highway)', level: 'LOW', color: 'bg-slate-900 border-slate-800' },
                ].map((zone) => (
                  <div key={zone.zone} className={`p-2.5 rounded-xl border ${zone.color} text-center flex flex-col justify-between h-20`}>
                    <span className="text-[9px] font-bold text-slate-400 truncate">{zone.zone}</span>
                    <span className="text-[10px] font-extrabold text-white block mt-1">{zone.level}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed text-center mt-1">
                Recommendation: Relocate closer to Zone A or Zone B for maximum bid match opportunities.
              </p>
            </div>
          </div>

          <div className="pt-4 flex gap-3 text-xs text-slate-400">
            <div className="flex-1 p-3 bg-slate-900 border border-slate-850 rounded-2xl flex items-center gap-2">
              <Radio className="w-4.5 h-4.5 text-emerald-400 animate-pulse" />
              <div>
                <span className="block font-bold text-white text-[10px]">RADAR ACTIVE</span>
                <span className="text-[9px] opacity-75">Scanning 3 mile radius</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Request Bar */}
      <div className="glass-panel-dark p-6 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-white text-base">Incoming Ride Requests Console</h4>
            <p className="text-xs text-slate-400">View spatial passenger offers and place custom bids.</p>
          </div>
        </div>

        <Link
          to="/requests"
          className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-emerald-glow flex items-center gap-2 transition-all"
        >
          View Live Radar
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
