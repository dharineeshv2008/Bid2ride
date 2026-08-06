import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  MapPin,
  Wallet,
  CheckCircle2,
  Users,
  Award,
  Zap,
  Phone,
  Mail,
  ChevronDown,
  Navigation,
  Lock,
  Star,
  Activity,
  Sparkles
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const navigateToPortal = (portalPath: string, port: string) => {
    if (window.location.port === '3001' && portalPath === '/driver') {
      window.location.href = '/login';
    } else if (window.location.port === '3001' || window.location.port === '5173') {
      window.location.href = `http://localhost:${port}`;
    } else {
      window.location.href = portalPath;
    }
  };

  const portalCards = [
    {
      id: 'passenger',
      title: 'PASSENGER PORTAL',
      subtitle: 'For Travelers & Commuters',
      icon: Car,
      color: 'from-sky-500 to-blue-600',
      badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      description: 'Set your ride budget, receive live driver counter-bids, pick your driver, and track turn-by-turn routes in real time.',
      buttonText: 'Launch Passenger App →',
      path: '/passenger',
      port: '3000',
    },
    {
      id: 'driver',
      title: 'DRIVER PILOT PORTAL',
      subtitle: 'For Drivers & Fleet Partners',
      icon: RadioIcon,
      color: 'from-emerald-500 to-teal-600',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      description: 'Scan nearby spatial ride broadcasts, submit custom price offers, maximize trip margins, and instant cash out to Indian banks.',
      buttonText: 'Launch Driver Console →',
      path: '/driver',
      port: '3001',
    },
    {
      id: 'admin',
      title: 'ADMIN CONTROL PANEL',
      subtitle: 'For Platform Operations & Safety',
      icon: Activity,
      color: 'from-indigo-500 to-purple-600',
      badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      description: 'Monitor real-time ride telemetry, verify driver licenses, inspect wallet ledgers, and manage system broadcast notifications.',
      buttonText: 'Launch Admin Platform →',
      path: '/admin',
      port: '3002',
    },
  ];

  const faqs = [
    {
      q: 'How does real-time ride bidding work on Bid2Ride?',
      a: 'As a passenger, you enter your pickup, drop-off, and your preferred target fare in ₹ INR. Nearby online drivers receive your request broadcast and can accept your fare or submit competitive counter-bids with their ETA. You choose the best offer!'
    },
    {
      q: 'Are there surge pricing algorithms?',
      a: 'No! Bid2Ride completely eliminates secret algorithm surge pricing multipliers. Fares are dynamic and determined through direct transparent negotiation between rider and driver.'
    },
    {
      q: 'How are payments and wallet cashouts processed in India?',
      a: 'Bid2Ride supports Indian payment methods including Razorpay, UPI (Google Pay, PhonePe, Paytm), Net Banking, and Wallet credits. Drivers can request instant wallet payouts to their Indian bank accounts 24/7.'
    },
    {
      q: 'What safety measures are implemented for trips?',
      a: 'Every ride features a 4-digit OTP trip verification before starting, verified driver background checks (DL & RC inspection), 24/7 SOS dispatch emergency alerts, and live MapLibre GPS telemetry tracking.'
    },
    {
      q: 'Which cities are supported in India?',
      a: 'Currently operational in major metro and growth hubs across South India including Chennai, Bengaluru, Coimbatore, Salem, Namakkal, Madurai, and Trichy.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* STICKY HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-extrabold shadow-emerald-glow">
              <RadioIcon className="w-5 h-5 text-slate-950" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white font-display">
              Bid2<span className="text-emerald-400">Ride</span> Pilot
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = '/login'}
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-emerald-glow flex items-center gap-2"
            >
              Sign In to Console
            </button>
          </div>
        </div>
      </header>

      {/* HERO & PORTAL SELECTOR */}
      <section className="relative pt-16 pb-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-emerald-400 shadow-xl"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Driver Pilot Console Gateway</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.15] font-display"
          >
            Bid Your Price. <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 bg-clip-text text-transparent">
              Earn Maximum Per Trip.
            </span>
          </motion.h1>
        </div>

        {/* PORTAL SELECTOR CARDS */}
        <div id="portal-selector" className="scroll-mt-28">
          <div className="grid md:grid-cols-3 gap-8">
            {portalCards.map((portal, idx) => {
              const Icon = portal.icon;
              return (
                <motion.div
                  key={portal.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  className="glass-panel-dark rounded-3xl p-8 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all shadow-2xl relative group"
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${portal.color} flex items-center justify-center text-white shadow-xl group-hover:scale-105 transition-transform`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${portal.badgeBg}`}>
                        LIVE PORTAL
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-extrabold text-white font-display">{portal.title}</h3>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">{portal.subtitle}</p>
                    </div>

                    <p className="text-slate-300 text-sm leading-relaxed">
                      {portal.description}
                    </p>
                  </div>

                  <div className="pt-8">
                    <button
                      onClick={() => navigateToPortal(portal.path, portal.port)}
                      className={`w-full py-4 rounded-2xl font-extrabold text-sm text-slate-950 bg-gradient-to-r ${portal.color} hover:opacity-95 transition-all shadow-lg flex items-center justify-center gap-2 group-hover:gap-3`}
                    >
                      <span>{portal.buttonText}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-slate-800/80 bg-slate-950 text-center">
        <p className="text-xs text-slate-500">© 2026 Bid2Ride Technologies India Pvt Ltd. All rights reserved.</p>
      </footer>
    </div>
  );
};

const RadioIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
    <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
    <circle cx="12" cy="12" r="2" />
    <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
    <path d="M19.1 4.9c3.9 3.9 3.9 10.3 0 14.2" />
  </svg>
);
