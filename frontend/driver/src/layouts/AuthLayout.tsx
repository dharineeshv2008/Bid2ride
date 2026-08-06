import React from 'react';
import { Outlet } from 'react-router-dom';
import { Car } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-emerald-500 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-emerald-glow mb-3">
            <Car className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-white font-display tracking-tight">
            Bid2<span className="text-emerald-400">Pilot</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Driver Operations & Bidding Console</p>
        </div>

        <div className="glass-panel-dark border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
