import React from 'react';
import { Outlet } from 'react-router-dom';
import { Car } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Dynamic Sky Blue background gradient bubbles */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-sky-200/50 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-sky-300/30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-sky-500 to-sky-400 flex items-center justify-center text-white shadow-glow mb-3">
            <Car className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            Bid2<span className="text-sky-500">Ride</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Fair Fares. Real-Time Driver Bidding.</p>
        </div>

        <div className="glass-panel border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-card">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
