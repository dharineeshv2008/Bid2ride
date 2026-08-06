import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useProfile } from '../contexts/ProfileContext';

import { 
  Car, 
  MapPin, 
  Clock, 
  Wallet, 
  Bell, 
  LogOut,
  Compass,
  User
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/format';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { balance } = useWallet();
  const { profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();


  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Compass },
    { label: 'Book Ride', path: '/book', icon: MapPin },
    { label: 'History', path: '/history', icon: Clock },
    { label: 'Wallet', path: '/wallet', icon: Wallet },
    { label: 'Notifications', path: '/notifications', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Top Header Navbar - Floating Glassmorphism Header */}
      <header className="sticky top-0 z-40 px-4 md:px-8 py-3 bg-white/80 backdrop-blur-md border-b border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0EA5E9] to-[#0284C7] flex items-center justify-center text-white shadow-[0_4px_14px_rgba(14,165,233,0.35)] group-hover:scale-105 transition-all">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">Bid2<span className="text-[#0EA5E9]">Ride</span></span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0284C7] uppercase tracking-wider">Passenger</span>
            </div>
          </Link>

          {/* Desktop Nav Links with Blue Active Indicator */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                    isActive
                      ? 'text-[#0EA5E9] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#0EA5E9]' : 'text-slate-500'}`} />
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#0EA5E9] rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {/* Live Wallet Balance Pill */}
            {balance !== null && (
              <Link
                to="/wallet"
                className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#E0F2FE] border border-[#0EA5E9]/20 text-[#0284C7] text-xs font-bold hover:bg-[#0EA5E9] hover:text-white transition-all shadow-sm"
                title="Wallet Balance — click to top up"
              >
                <Wallet className="w-3.5 h-3.5" />
                {formatCurrency(balance)}
              </Link>
            )}

            <Link
              to="/profile"
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-white hover:bg-slate-50 border border-gray-200 shadow-sm transition-all hover:shadow-md"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-8 h-8 rounded-xl object-cover border border-[#0EA5E9]/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-[#0EA5E9]/10 text-[#0EA5E9] flex items-center justify-center font-bold text-xs border border-[#0EA5E9]/20">
                  {user?.name?.charAt(0) || <User className="w-4 h-4" />}
                </div>
              )}
              <span className="hidden sm:block text-sm font-semibold text-slate-800">{user?.name || 'Passenger'}</span>
            </Link>


            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Animated View Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 mb-20 md:mb-6">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-gray-200 px-3 py-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-colors ${
                isActive ? 'text-[#0EA5E9] font-bold' : 'text-slate-500 hover:text-slate-900'
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

