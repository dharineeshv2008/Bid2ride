import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TrendingUp, Car, BarChart3, Calendar, DollarSign, Award, Zap, Clock, Target, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/format';

export const EarningsPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('week');
  const [stats, setStats] = useState({
    totalEarnings: 0.00,
    completedTrips: 0,
    onlineHours: 0.0,
    averagePerTrip: 0.00,
    acceptanceRate: 100,
    rating: 5.00,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEarnings = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/driver/earnings?timeframe=${timeframe}`);
        if (response.data) {
          setStats(response.data);
        }
      } catch (err) {
        console.warn('Failed to fetch earnings stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEarnings();
  }, [timeframe]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings & Analytics</h1>
          <p className="text-sm text-gray-500">Track your daily income, trip statistics, and payout history</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
          {(['today', 'week', 'month'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                timeframe === t
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-[#121212] grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-emerald-100 uppercase tracking-wider">Total Earnings</p>
              <h3 className="text-3xl font-extrabold mt-1">{formatCurrency(stats.totalEarnings)}</h3>
            </div>
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-emerald-100">
            <TrendingUp className="w-4 h-4 mr-1 text-emerald-200" />
            <span>+14.2% from previous {timeframe}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Completed Trips</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.completedTrips}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Car className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-500">
            <BarChart3 className="w-4 h-4 mr-1 text-blue-500" />
            <span>Avg. {formatCurrency(stats.averagePerTrip)} per trip</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Online Driving Time</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.onlineHours} hrs</h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-500">
            <Zap className="w-4 h-4 mr-1 text-amber-500" />
            <span>{formatCurrency(stats.totalEarnings / (stats.onlineHours || 1))}/hr average</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance & Rating</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.acceptanceRate}%</h3>
            </div>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-500">
            <Activity className="w-4 h-4 mr-1 text-purple-500" />
            <span>★ {stats.rating} Driver Rating</span>
          </div>
        </motion.div>
      </div>

      {/* Breakdown Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Earnings Breakdown</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
            <span className="text-gray-600">Base Trip Fares</span>
            <span className="font-semibold text-gray-900">{formatCurrency(stats.totalEarnings * 0.85)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
            <span className="text-gray-600">Passenger Tips</span>
            <span className="font-semibold text-emerald-600">+{formatCurrency(stats.totalEarnings * 0.10)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
            <span className="text-gray-600">Bidding Competitiveness Bonus</span>
            <span className="font-semibold text-purple-600">+{formatCurrency(stats.totalEarnings * 0.05)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
