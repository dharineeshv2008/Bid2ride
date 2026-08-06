import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { TrendingUp, DollarSign, Users, Car } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export const AnalyticsPage: React.FC = () => {
  const lineData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Revenue (₹)',
        data: [12000, 15000, 14000, 18000, 22000, 26000, 24000],
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.2)',
        tension: 0.4,
      },
    ],
  };

  const barData = {
    labels: ['Sedan', 'SUV', 'Luxury', 'Auto'],
    datasets: [
      {
        label: 'Completed Rides',
        data: [1420, 890, 420, 160],
        backgroundColor: ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'],
        borderRadius: 8,
      },
    ],
  };

  const doughnutData = {
    labels: ['Passengers', 'Drivers', 'Admins'],
    datasets: [
      {
        data: [1100, 140, 8],
        backgroundColor: ['#0ea5e9', '#10b981', '#f43f5e'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white font-display">Analytics & Performance Reports</h2>
        <p className="text-xs text-slate-400">Platform revenue metrics, ride volume breakdown, and user growth trajectory.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Revenue Line Chart */}
        <div className="lg:col-span-8 glass-panel-admin p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-sky-400" />
            Weekly Gross Revenue Trajectory
          </h3>
          <div className="h-64">
            <Line data={lineData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* User Distribution Doughnut */}
        <div className="lg:col-span-4 glass-panel-admin p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            User Distribution
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Category Bar Chart */}
        <div className="lg:col-span-12 glass-panel-admin p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Car className="w-4 h-4 text-amber-400" />
            Rides Volume by Vehicle Category
          </h3>
          <div className="h-64">
            <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  );
};
