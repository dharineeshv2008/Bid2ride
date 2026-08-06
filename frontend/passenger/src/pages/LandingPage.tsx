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
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const navigateToPortal = (portalPath: string, port: string) => {
    if (window.location.port === '3000' && portalPath === '/passenger') {
      window.location.href = '/login';
    } else if (window.location.port === '3000' || window.location.port === '5173') {
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
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-sky-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[800px] right-10 w-[500px] h-[500px] bg-emerald-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* STICKY HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-glow">
              <Car className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white font-display">
              Bid2<span className="text-sky-400">Ride</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#portal-selector" className="hover:text-sky-400 transition-colors">Portals</a>
            <a href="#about" className="hover:text-sky-400 transition-colors">About</a>
            <a href="#features" className="hover:text-sky-400 transition-colors">Features</a>
            <a href="#safety" className="hover:text-sky-400 transition-colors">Safety</a>
            <a href="#faq" className="hover:text-sky-400 transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-sky-400 transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = '/login'}
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-sky-500 hover:bg-sky-400 text-slate-950 transition-all shadow-glow flex items-center gap-2"
            >
              <Car className="w-4 h-4" />
              Sign In / Book Ride
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1: HERO & PORTAL SELECTOR */}
      <section className="relative pt-16 pb-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-sky-400 shadow-xl"
          >
            <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>Next-Gen Indian Mobility Bidding Engine</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.15] font-display"
          >
            You Set the Fare. <br />
            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Drivers Compete for You.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-base sm:text-lg leading-relaxed"
          >
            Say goodbye to algorithmic surge pricing. Bid2Ride connects passengers directly with verified drivers across Chennai, Bengaluru, Coimbatore, Salem, and Madurai for real-time price negotiation.
          </motion.p>
        </div>

        {/* PORTAL SELECTOR CARDS */}
        <div id="portal-selector" className="scroll-mt-28">
          <div className="text-center mb-8">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-sky-400">Choose Your Application Portal</h2>
            <p className="text-2xl font-bold text-white mt-1">Direct Gateway Access</p>
          </div>

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

      {/* SECTION 2: ABOUT */}
      <section id="about" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/60 scroll-mt-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs font-extrabold uppercase tracking-widest text-sky-400">About Bid2Ride</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display leading-tight">
              Democratizing Ride-Hailing Through Direct Market Negotiation
            </h2>
            <p className="text-slate-400 leading-relaxed text-sm sm:text-base">
              Bid2Ride was engineered to address unfair surge pricing and high driver commissions. Our real-time spatial socket engine broadcasts passenger requests to surrounding drivers, allowing drivers to submit competitive price bids in seconds.
            </p>
          </div>

          <div className="glass-panel-dark p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
              <DollarSign className="w-6 h-6 text-sky-400" />
              <div>
                <h4 className="text-sm font-bold text-white">Passenger Custom Budget</h4>
                <p className="text-xs text-slate-400">Rider proposes ₹220 for T. Nagar to Airport</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4 ml-6">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <div>
                <h4 className="text-sm font-bold text-white">Live Driver Bids Received</h4>
                <p className="text-xs text-slate-400">Driver 1: ₹210 (3 mins away) • Driver 2: ₹220 (2 mins)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: FAQ */}
      <section id="faq" className="py-20 px-6 max-w-4xl mx-auto border-t border-slate-800/60 scroll-mt-20">
        <div className="text-center mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-sky-400">Got Questions?</span>
          <h2 className="text-3xl font-extrabold text-white font-display mt-2">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="glass-panel-dark rounded-2xl border border-slate-800 overflow-hidden">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-5 text-left font-bold text-white text-sm sm:text-base flex justify-between items-center gap-4"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {activeFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-5 pb-5 text-slate-400 text-xs sm:text-sm leading-relaxed border-t border-slate-800/50 pt-3"
                  >
                    {faq.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
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
