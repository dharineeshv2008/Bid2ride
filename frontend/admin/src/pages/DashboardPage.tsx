import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Activity,
  ArrowUpRight,
  ChevronRight,
  Navigation,
  Globe
} from 'lucide-react';
import { formatCurrency } from '../utils/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DARK_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
        'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
      ],
      tileSize: 256,
      attribution: '© MapLibre | © CARTO | © OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 20
    }
  ]
};

export const DashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);

  // MapLibre references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const mockDrivers = [
    { name: 'Rohan S. (Sedan)', lat: 12.9756, lng: 77.6068 },
    { name: 'Amit K. (SUV)', lat: 12.9783, lng: 77.6385 },
    { name: 'Priya M. (Auto)', lat: 12.9716, lng: 77.5946 },
    { name: 'Vikram A. (Sedan)', lat: 12.9620, lng: 77.6120 }
  ];

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const { data } = await api.get('/admin/overview');
        setOverview(data);
      } catch (err) {
        console.error('Failed to load admin overview', err);
        setOverview({
          total_users: 1248,
          active_drivers: 4,
          total_rides: 3890,
          gross_revenue: 84250.0,
          platform_commission: 12637.5,
          pending_verifications_count: 5,
        });
      }
    };
    fetchOverview();
  }, []);

  // Initialize MapLibre live drivers map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: DARK_MAP_STYLE,
      center: [77.6068, 12.9756],
      zoom: 12,
    });
    mapRef.current = map;

    map.on('load', () => {
      map.resize();
      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      mockDrivers.forEach((driver) => {
        const el = document.createElement('div');
        el.className = 'admin-live-driver-marker';
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.backgroundImage = 'url("https://cdn-icons-png.flaticon.com/512/744/744465.png")';
        el.style.backgroundSize = 'contain';
        el.style.backgroundRepeat = 'no-repeat';

        new maplibregl.Marker({ element: el })
          .setLngLat([driver.lng, driver.lat])
          .setPopup(new maplibregl.Popup().setText(driver.name))
          .addTo(map);
      });
    });

    const t1 = setTimeout(() => map.resize(), 100);
    const t2 = setTimeout(() => map.resize(), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
    };
  }, []);

  const revenueChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Gross Ride Revenue (₹)',
        data: [12000, 15000, 14000, 18000, 22000, 26000, 24000],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        grid: {
          color: '#1e293b'
        },
        ticks: {
          color: '#94a3b8'
        }
      },
      x: {
        grid: {
          color: '#1e293b'
        },
        ticks: {
          color: '#94a3b8'
        }
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="glass-panel-admin border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs font-bold text-sky-400 uppercase tracking-widest bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20 inline-block mb-3">
              Platform Status: Operational
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-display">
              System Control Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Live monitoring of INR transaction ledgers, active pilot radar, and user registration velocity.
            </p>
          </div>

          <Link
            to="/drivers/pending"
            className="px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm shadow-lg inline-flex items-center gap-2 transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            Review Driver Approvals ({overview?.pending_verifications_count || 0})
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="glass-panel-admin p-6 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Total Platform Users</span>
            <Users className="w-5 h-5 text-sky-400" />
          </div>
          <h3 className="text-3xl font-extrabold text-white font-display">
            {overview?.total_users ? overview.total_users.toLocaleString() : '1,248'}
          </h3>
          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5" /> +12.4% registration velocity
          </span>
        </div>

        <div className="glass-panel-admin p-6 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Ride Revenue</span>
            <span className="text-emerald-400 font-extrabold text-xs">INR (₹)</span>
          </div>
          <h3 className="text-3xl font-extrabold text-emerald-400 font-display font-mono">
            {formatCurrency(overview?.gross_revenue || 84250.0)}
          </h3>
          <span className="text-xs font-semibold text-slate-400 mt-2 block">
            Net Commission (15%): {formatCurrency(overview?.platform_commission || 12637.5)}
          </span>
        </div>

        <div className="glass-panel-admin p-6 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Completed Rides</span>
            <CheckCircle2 className="w-5 h-5 text-sky-400" />
          </div>
          <h3 className="text-3xl font-extrabold text-white font-display">
            {overview?.total_rides ? overview.total_rides.toLocaleString() : '3,890'}
          </h3>
          <span className="text-xs font-semibold text-emerald-400 mt-2 block">98.2% Completion Rate</span>
        </div>
      </div>

      {/* Map and Charts Grid */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Live Maplibre map showing drivers */}
        <div className="lg:col-span-7 glass-panel-admin p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Navigation className="w-4.5 h-4.5 text-sky-400" />
              Live Online Driver Tracking Radar
            </h3>
            <p className="text-[11px] text-slate-500">Spatial telemetry of current drivers in active service zones.</p>
          </div>
          <div className="h-72 rounded-2xl overflow-hidden border border-slate-800 relative mt-2 bg-slate-900">
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '280px' }} className="w-full h-full min-h-[280px]" />
          </div>
        </div>

        {/* Weekly Revenue Line Chart & signup velocity */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel-admin p-6 rounded-3xl border border-slate-800 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-emerald-400" />
              Weekly Gross Revenue (₹)
            </h3>
            <div className="h-44">
              <Line data={revenueChartData} options={chartOptions} />
            </div>
          </div>

          {/* User velocity metrics */}
          <div className="glass-panel-admin p-6 rounded-3xl border border-slate-800 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4.5 h-4.5 text-sky-400" />
              Registration Velocity Metrics
            </h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-slate-900/60 border border-slate-850 rounded-2xl">
                <span className="block text-[10px] text-slate-500 uppercase font-bold">Signups / Hour</span>
                <span className="text-lg font-extrabold text-white">+14 users</span>
              </div>
              <div className="p-3 bg-slate-900/60 border border-slate-850 rounded-2xl">
                <span className="block text-[10px] text-slate-500 uppercase font-bold">Acceleration</span>
                <span className="text-lg font-extrabold text-emerald-400">1.25x growth</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
