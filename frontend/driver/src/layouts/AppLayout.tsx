import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Car, 
  Radio, 
  Navigation, 
  Wallet, 
  Bell, 
  User as UserIcon, 
  LogOut,
  Power,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';

export const AppLayout: React.FC = () => {
  const { user, driverProfile, toggleOnlineStatus, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Navigation },
    { label: 'Requests', path: '/requests', icon: Radio },
    { label: 'Earnings', path: '/earnings', icon: TrendingUp },
    { label: 'Wallet', path: '/wallet', icon: Wallet },
    { label: 'Notifications', path: '/notifications', icon: Bell },
  ];

  const isOnline = driverProfile?.online_status || false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 glass-panel-dark border-b border-slate-800 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-emerald-glow group-hover:scale-105 transition-transform">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-white font-display">
              Bid2<span className="text-emerald-400">Pilot</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Driver Console
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-2xl border border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  isActive
                    ? 'text-emerald-400 bg-slate-800 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Tactile Go-Online Toggle & Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleOnlineStatus(!isOnline)}
            className={`px-4 py-2 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
              isOnline
                ? 'bg-emerald-500 text-slate-950 online-glow hover:bg-emerald-400'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>

          <Link
            to="/profile"
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-800"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
              {user?.name?.charAt(0) || 'D'}
            </div>
            <span className="hidden sm:block text-sm font-semibold text-slate-200">{user?.name || 'Pilot'}</span>
          </Link>

          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Animated View Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 mb-20 md:mb-6">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel-dark border-t border-slate-800 px-3 py-2 flex items-center justify-around shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-medium transition-colors ${
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
