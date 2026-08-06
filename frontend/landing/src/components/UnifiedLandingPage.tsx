import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car,
  ShieldCheck,
  DollarSign,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  Smartphone,
  Wallet,
  CheckCircle2,
  Users,
  Award,
  Zap,
  HelpCircle,
  Mail,
  Phone,
  MessageSquare,
  ChevronDown,
  Navigation,
  Lock,
  Star,
  Activity,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export const UnifiedLandingPage: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Helper function to navigate to existing portal URLs cleanly
  const navigateToPortal = (portalPath: string, port: string) => {
    // If running on local standalone dev server port 5173, map to portal ports
    if (window.location.port === '5173') {
      window.location.href = `http://localhost:${port}`;
    } else {
      // In production or reverse proxy environment, route via relative path
      window.location.href = portalPath;
    }
  };

  const portalCards = [
    {
      id: 'passenger',
      title: 'PASSENGER PORTAL',
      subtitle: 'For Travelers & Daily Commuters',
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
      <div className="absolute top-[1800px] left-10 w-[550px] h-[550px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

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
            <a href="#bidding" className="hover:text-sky-400 transition-colors">Smart Bidding</a>
            <a href="#safety" className="hover:text-sky-400 transition-colors">Safety</a>
            <a href="#faq" className="hover:text-sky-400 transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-sky-400 transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateToPortal('/passenger', '3000')}
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-sky-500 hover:bg-sky-400 text-slate-950 transition-all shadow-glow flex items-center gap-2"
            >
              <Car className="w-4 h-4" />
              Book Ride Now
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

      {/* SECTION 2: ABOUT BID2RIDE */}
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
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="block text-2xl font-extrabold text-sky-400 font-display">0%</span>
                <span className="text-xs text-slate-400 font-medium">Algorithmic Surge Gouging</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="block text-2xl font-extrabold text-emerald-400 font-display">100%</span>
                <span className="text-xs text-slate-400 font-medium">Fair Fare Transparency</span>
              </div>
            </div>
          </div>

          <div className="glass-panel-dark p-8 rounded-3xl border border-slate-800 shadow-2xl relative">
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Passenger Custom Budget</h4>
                  <p className="text-xs text-slate-400">Rider proposes ₹220 for T. Nagar to Airport</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4 ml-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Live Driver Bids Received</h4>
                  <p className="text-xs text-slate-400">Driver 1: ₹210 (3 mins away) • Driver 2: ₹220 (2 mins)</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-400">Match Confirmed & Locked</h4>
                  <p className="text-xs text-slate-300">OTP Code issued. Zero hidden fees.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: FEATURES */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/60 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-sky-400">Core Capabilities</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display mt-2">Built for Speed, Trust, and Scalability</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Zap,
              title: 'Low-Latency Socket Bidding',
              desc: 'High-frequency WebSocket channels connect passengers and drivers for real-time bid updates under 200ms.'
            },
            {
              icon: Navigation,
              title: 'MapLibre + OSRM Telemetry',
              desc: 'High-precision turn-by-turn route navigation with dynamic ETA calculations and live car position markers.'
            },
            {
              icon: Wallet,
              title: 'INR Wallet & Instant Payouts',
              desc: 'Integrated with Indian digital wallets, UPI, and instant payout rails directly to Indian bank accounts.'
            },
            {
              icon: ShieldCheck,
              title: 'OTP Trip Authentication',
              desc: 'Mandatory 4-digit verification PIN guarantees rider safety and prevents unauthorized ride starts.'
            },
            {
              icon: Users,
              title: 'Multi-Vehicle Fleet Support',
              desc: 'Choose from Auto Rickshaws, Hatchbacks, Sedans, SUVs, and Luxury rides tailored to your budget.'
            },
            {
              icon: Award,
              title: 'Dual-Sided Trust Rating',
              desc: 'Community rating system keeps driver standards high and protects drivers against bad actors.'
            }
          ].map((feat, i) => {
            const FIcon = feat.icon;
            return (
              <div key={i} className="glass-card p-6 rounded-3xl space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <FIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white font-display">{feat.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: WHY CHOOSE US */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="glass-panel-dark rounded-3xl p-8 sm:p-12 border border-slate-800 relative overflow-hidden">
          <div className="max-w-3xl space-y-6">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Why Choose Us</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display">
              A Win-Win Marketplace for Both Riders and Drivers
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              Traditional apps take up to 30% commission and inflate rider prices during peak hours. Bid2Ride provides full price control to riders and lets drivers keep significantly more of every hard-earned Rupee.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-white text-sm">For Riders</h4>
                  <p className="text-xs text-slate-400">Pay what you want, select driver based on rating and vehicle type.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-white text-sm">For Drivers</h4>
                  <p className="text-xs text-slate-400">Freedom to bid your price, low commission, instant wallet settlement.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: PASSENGER BENEFITS */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs font-extrabold uppercase tracking-widest text-sky-400">Passenger Experience</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display">
              Total Freedom over Your Travel Budget
            </h2>
            <ul className="space-y-4 text-slate-300 text-sm">
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">✓</div>
                <span>Propose custom fares based on your current budget.</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">✓</div>
                <span>Compare multiple driver counter-bids side by side.</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">✓</div>
                <span>Choose Auto Rickshaw, Sedan, SUV, or Premium Luxury.</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">✓</div>
                <span>Share trip status with family via live tracking links.</span>
              </li>
            </ul>
            <button
              onClick={() => navigateToPortal('/passenger', '3000')}
              className="px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition-all shadow-glow"
            >
              Open Passenger Portal →
            </button>
          </div>

          <div className="glass-panel-dark p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-500 font-bold">SAMPLE REQUEST</span>
                <h4 className="font-bold text-white">Indiranagar to Kempegowda Airport</h4>
                <p className="text-xs text-sky-400 font-semibold">Target Budget: ₹750</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-bold">Active Bids (3)</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
                <div className="text-xs">
                  <span className="font-bold text-white">Ramesh K. ★ 4.9</span>
                  <span className="block text-slate-400">Maruti Dzire • 3 mins away</span>
                </div>
                <span className="font-bold text-emerald-400 text-sm">₹720</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
                <div className="text-xs">
                  <span className="font-bold text-white">Suresh M. ★ 4.8</span>
                  <span className="block text-slate-400">Hyundai Xcent • 2 mins away</span>
                </div>
                <span className="font-bold text-emerald-400 text-sm">₹750</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: DRIVER BENEFITS */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="glass-panel-dark p-6 rounded-3xl border border-slate-800 space-y-4 order-2 md:order-1">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 font-bold">PILOT EARNINGS DASHBOARD</span>
                <span className="text-xs text-emerald-400 font-bold">Today</span>
              </div>
              <h3 className="text-3xl font-extrabold text-emerald-400 font-display">₹3,450.00</h3>
              <p className="text-xs text-slate-500 mt-1">12 Completed Rides • 100% Payout Ready</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-400">Instant Bank Payout</span>
              <button className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Cash Out</button>
            </div>
          </div>

          <div className="space-y-6 order-1 md:order-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Driver Pilot Experience</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display">
              Be Your Own Boss with Fair Pricing Controls
            </h2>
            <ul className="space-y-4 text-slate-300 text-sm">
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">✓</div>
                <span>Inspect trip destination before placing your bid.</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">✓</div>
                <span>Submit custom counter-offers based on traffic and distance.</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">✓</div>
                <span>Withdraw wallet earnings instantly to any Indian UPI or Bank account.</span>
              </li>
            </ul>
            <button
              onClick={() => navigateToPortal('/driver', '3001')}
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-emerald-glow"
            >
              Open Driver Console →
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 7: SAFETY */}
      <section id="safety" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/60 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-rose-400">Safety First</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display mt-2">Uncompromised Security Infrastructure</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="glass-card p-6 rounded-3xl space-y-3">
            <Lock className="w-8 h-8 text-rose-400" />
            <h3 className="text-lg font-bold text-white font-display">OTP Trip Verification</h3>
            <p className="text-slate-400 text-xs leading-relaxed">Unique 4-digit code must be entered by driver before trip commencement.</p>
          </div>

          <div className="glass-card p-6 rounded-3xl space-y-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <h3 className="text-lg font-bold text-white font-display">Verified Driver Credentials</h3>
            <p className="text-slate-400 text-xs leading-relaxed">Driving License, RC, and Government ID documents verified by Admin platform.</p>
          </div>

          <div className="glass-card p-6 rounded-3xl space-y-3">
            <Phone className="w-8 h-8 text-sky-400" />
            <h3 className="text-lg font-bold text-white font-display">24/7 Emergency Dispatch SOS</h3>
            <p className="text-slate-400 text-xs leading-relaxed">One-tap emergency button instantly alerts support team and designated contacts.</p>
          </div>
        </div>
      </section>

      {/* SECTION 8: SMART DRIVER BIDDING */}
      <section id="bidding" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/60 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-sky-400">Smart Bidding</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display mt-2">How the Bidding Engine Works</h2>
        </div>

        <div className="grid md:grid-cols-4 gap-6 text-center">
          {[
            { step: '01', title: 'Rider Requests', text: 'Rider inputs pickup, drop-off, and target budget in ₹ INR.' },
            { step: '02', title: 'Spatial Broadcast', text: 'Engine broadcasts request to drivers within 5km radius.' },
            { step: '03', title: 'Drivers Bid', text: 'Drivers submit competitive counter-bids with ETA.' },
            { step: '04', title: 'Rider Accepts', text: 'Rider picks the best bid and trip starts with OTP code.' }
          ].map((s, i) => (
            <div key={i} className="glass-panel-dark p-6 rounded-3xl border border-slate-800 space-y-2">
              <span className="text-3xl font-extrabold text-sky-400 font-display">{s.step}</span>
              <h3 className="font-bold text-white text-base">{s.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 9: WALLET & INDIAN PAYMENTS */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="glass-panel-dark rounded-3xl p-8 sm:p-12 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Wallet Infrastructure</span>
            <h2 className="text-3xl font-extrabold text-white font-display">Seamless Digital Payments & Cashouts</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Integrated INR Wallet system supporting Razorpay, UPI, PhonePe, Paytm, Google Pay, and Net Banking with instant ledger transaction history.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <Wallet className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <span className="text-xs font-bold text-white block">UPI / Razorpay</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <CheckCircle2 className="w-8 h-8 text-sky-400 mx-auto mb-2" />
              <span className="text-xs font-bold text-white block">Instant Settlement</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10: LIVE TRACKING */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-widest text-sky-400">MapLibre + OSRM</span>
            <h2 className="text-3xl font-extrabold text-white font-display">High Precision Live Telemetry</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Open-source geospatial mapping engine guarantees accurate turn-by-turn route line rendering and real-time socket vehicle position updates without heavy third-party API costs.
            </p>
          </div>
          <div className="h-64 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-850 opacity-90" />
            <div className="relative z-10 text-center space-y-2">
              <Navigation className="w-10 h-10 text-sky-400 mx-auto animate-pulse" />
              <span className="text-sm font-bold text-white block">Live OSRM GPS Simulation Running</span>
              <span className="text-xs text-emerald-400 font-mono">12.9716° N, 77.5946° E</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 11: TESTIMONIALS */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-sky-400">Community Feedback</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display mt-2">Loved by Riders & Drivers Across Tamil Nadu & Karnataka</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              name: 'Anitha Vasudevan',
              role: 'Passenger • Chennai',
              text: 'I travel from T. Nagar to Guindy every day. Bid2Ride saves me at least ₹60 per trip because drivers bid competitively!'
            },
            {
              name: 'Karthik Raja',
              role: 'Driver Partner • Bengaluru',
              text: 'The wallet cashout is instantaneous to my HDFC account. Best part is I can choose trips based on destination!'
            },
            {
              name: 'Suresh Kumar',
              role: 'Passenger • Coimbatore',
              text: 'Awesome app! Being able to choose an Auto or Sedan based on price makes travel super affordable.'
            }
          ].map((t, i) => (
            <div key={i} className="glass-card p-6 rounded-3xl space-y-4">
              <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, idx) => <Star key={idx} className="w-4 h-4 fill-amber-400" />)}
              </div>
              <p className="text-slate-300 text-xs italic leading-relaxed">"{t.text}"</p>
              <div>
                <h4 className="font-bold text-white text-sm">{t.name}</h4>
                <p className="text-[11px] text-slate-400">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 12: FAQ */}
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

      {/* SECTION 13: CONTACT */}
      <section id="contact" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/60 scroll-mt-20">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <span className="text-xs font-extrabold uppercase tracking-widest text-sky-400">Get in Touch</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display">Contact Platform Support</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Have inquiries regarding driver fleet onboarding, enterprise partnerships, or technical support? Send us a message and our support team will respond within 24 hours.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 text-slate-300 text-sm">
                <MapPin className="w-5 h-5 text-sky-400" />
                <span>Tech Park, Guindy, Chennai & Indiranagar, Bengaluru</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300 text-sm">
                <Phone className="w-5 h-5 text-emerald-400" />
                <span>+91 98765 43210 / +91 80 1234 5678</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300 text-sm">
                <Mail className="w-5 h-5 text-indigo-400" />
                <span>support@bid2ride.in</span>
              </div>
            </div>
          </div>

          <div className="glass-panel-dark p-8 rounded-3xl border border-slate-800">
            {contactSubmitted ? (
              <div className="text-center py-12 space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-xl font-bold text-white">Message Sent Successfully!</h3>
                <p className="text-xs text-slate-400">Thank you for reaching out. Our team will contact you shortly.</p>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setContactSubmitted(true); }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Message</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Write your inquiry..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition-all shadow-glow"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 14: FOOTER */}
      <footer className="py-12 px-6 border-t border-slate-800/80 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center text-slate-950 font-bold">B</div>
            <span className="font-extrabold text-xl text-white font-display">Bid2<span className="text-sky-400">Ride</span></span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-400 font-semibold">
            <button onClick={() => navigateToPortal('/passenger', '3000')} className="hover:text-white transition-colors">Passenger App</button>
            <button onClick={() => navigateToPortal('/driver', '3001')} className="hover:text-white transition-colors">Driver Console</button>
            <button onClick={() => navigateToPortal('/admin', '3002')} className="hover:text-white transition-colors">Admin Platform</button>
            <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-white transition-colors">Terms of Service</a>
          </div>

          <p className="text-xs text-slate-500">© 2026 Bid2Ride Technologies India Pvt Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

// Internal icon wrapper for clean compilation
const RadioIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
    <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
    <circle cx="12" cy="12" r="2" />
    <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
    <path d="M19.1 4.9c3.9 3.9 3.9 10.3 0 14.2" />
  </svg>
);
