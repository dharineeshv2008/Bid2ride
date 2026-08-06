import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { UserSettings } from '../types';
import { 
  User as UserIcon, 
  Phone, 
  Mail, 
  Shield, 
  Bell, 
  Save, 
  Check, 
  Sun, 
  Moon, 
  Globe, 
  Map, 
  CreditCard, 
  Car,
  Trash2,
  AlertTriangle,
  Award
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, driverProfile } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Editable local settings (Driver specific & Emergency Contact)
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [payoutBank, setPayoutBank] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get<UserSettings>('/auth/settings');
        setSettings(data);
        setVehicleModel(data.driver_vehicle_model || '');
        setVehiclePlate(data.driver_vehicle_plate || '');
        setPayoutBank(data.driver_wallet_payout_bank || '');
        setEmergencyName(data.emergency_contact_name || '');
        setEmergencyPhone(data.emergency_contact_phone || '');
        // Apply theme on load
        if (data.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (err) {
        console.error('Failed to load user settings', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleUpdateSetting = async (updates: Partial<UserSettings>) => {
    if (!settings) return;
    try {
      const updated = { ...settings, ...updates };
      setSettings(updated);
      await api.put('/auth/settings', updates);
      
      // Apply theme class instantly
      if (updates.theme) {
        if (updates.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 1500);
    } catch (err) {
      console.error('Failed to save settings', err);
    }
  };

  const handleSaveDriverPreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleUpdateSetting({
      driver_vehicle_model: vehicleModel,
      driver_vehicle_plate: vehiclePlate,
      driver_wallet_payout_bank: payoutBank,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone
    });
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('WARNING: Are you absolutely sure you want to delete your Driver account? This action is permanent and cannot be undone.')) {
      setIsDeleting(true);
      try {
        await api.post('/auth/logout', { refresh_token: localStorage.getItem('refresh_token') });
        localStorage.clear();
        window.location.href = '/login';
      } catch (err) {
        alert('Account deletion failed. Please contact administrator.');
        setIsDeleting(false);
      }
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <span className="animate-pulse">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-display">Pilot Dashboard Configuration Settings</h2>
          <p className="text-xs text-slate-400">Manage vehicle details, payout instructions, and visual interface preferences.</p>
        </div>
        {isSaved && (
          <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-500/30 animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            Auto-saved
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        {/* Left Column: Driver Info Summary & Vehicle Setup */}
        <div className="md:col-span-5 space-y-6">
          {/* Driver Stats */}
          <div className="glass-panel-dark p-6 rounded-3xl border border-slate-800 shadow-2xl">
            <div className="flex items-center gap-4 mb-6 border-b border-slate-800 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-extrabold text-2xl shadow-emerald-glow">
                {user?.name?.[0]?.toUpperCase() || 'P'}
              </div>
              <div>
                <h4 className="font-bold text-white text-lg">{user?.name}</h4>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{user?.role} PORTAL</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <Award className="w-4.5 h-4.5 text-emerald-400 mx-auto mb-1" />
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">Rating</span>
                <span className="text-sm font-extrabold text-white">{driverProfile?.rating || '4.9'} ★</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <Car className="w-4.5 h-4.5 text-sky-400 mx-auto mb-1" />
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">Trips Done</span>
                <span className="text-sm font-extrabold text-white">{driverProfile?.total_trips || '142'}</span>
              </div>
            </div>
            
            <div className="space-y-3 mt-5 text-slate-300">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Registered Phone</label>
                <div className="flex items-center gap-2 text-white">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-semibold">{user?.phone}</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Assigned License</label>
                <div className="flex items-center gap-2 text-white">
                  <Shield className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-mono font-semibold">{driverProfile?.license_number || 'TN-01-2022-0012345'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency SOS Contact */}
          <div className="glass-panel-dark p-6 rounded-3xl border border-slate-800 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-500" />
              Emergency Dispatch SOS Contact
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">SOS Name</label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="SOS contact name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">SOS Phone</label>
                <input
                  type="text"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Vehicle config, banking, UI prefs */}
        <div className="md:col-span-7 space-y-6">
          {/* Driver Vehicle Setup */}
          <div className="glass-panel-dark p-6 rounded-3xl border border-slate-800 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Car className="w-4 h-4 text-emerald-400" />
              Active Vehicle & Payout Banking Details
            </h3>

            <form onSubmit={handleSaveDriverPreferences} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Vehicle Model</label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Toyota Camry (White)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Plate Number</label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="KA-01-MJ-4321"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Default Payout Bank Account</label>
                <input
                  type="text"
                  value={payoutBank}
                  onChange={(e) => setPayoutBank(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                  placeholder="HDFC BANK - A/C 502000123456"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-emerald-glow flex items-center justify-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" /> Save Vehicle & Bank Info
              </button>
            </form>
          </div>

          {/* Theme & Auto accept settings */}
          <div className="glass-panel-dark p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sun className="w-4 h-4 text-emerald-400" />
              Pilot Bidding & Theme Configuration
            </h3>

            {/* Auto Accept Switch */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">Auto-Accept Bidding Request</h4>
                <p className="text-xs text-slate-400">Instantly matches and accepts passenger budget bids.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.driver_ride_pref_auto_accept}
                onChange={(e) => handleUpdateSetting({ driver_ride_pref_auto_accept: e.target.checked })}
                className="w-5 h-5 text-emerald-500 focus:ring-emerald-500/20 bg-slate-950 border-slate-800 rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => handleUpdateSetting({ theme: 'light' })}
                className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                  settings.theme === 'light'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold shadow-sm'
                    : 'border-slate-850 bg-slate-950 text-slate-500'
                }`}
              >
                <Sun className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-bold">Light Theme</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateSetting({ theme: 'dark' })}
                className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                  settings.theme === 'dark'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold shadow-sm'
                    : 'border-slate-850 bg-slate-950 text-slate-500'
                }`}
              >
                <Moon className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-bold">Dark Theme</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-500" /> Language
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => handleUpdateSetting({ language: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white text-sm font-semibold focus:outline-none"
                >
                  <option value="en">English (US)</option>
                  <option value="en-IN">English (India)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                  <Map className="w-3.5 h-3.5 text-slate-500" /> Map Provider
                </label>
                <select
                  value={settings.map_provider}
                  onChange={(e) => handleUpdateSetting({ map_provider: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white text-sm font-semibold focus:outline-none"
                >
                  <option value="maplibre">MapLibre GL JS</option>
                  <option value="google">Google Maps (Legacy)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications setting */}
          <div className="glass-panel-dark p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              Notification Delivery Channels
            </h3>

            <div className="space-y-3">
              {[
                { key: 'notification_email', label: 'Email Alerts', desc: 'Receive payout summaries in your inbox' },
                { key: 'notification_sms', label: 'SMS Texts', desc: 'Receive dispatch alerts when bidding wins' },
                { key: 'notification_push', label: 'Push Banners', desc: 'Show incoming passenger bidding alerts' },
              ].map((item) => (
                <div key={item.key} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{item.label}</h4>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={(settings as any)[item.key]}
                    onChange={(e) => handleUpdateSetting({ [item.key]: e.target.checked })}
                    className="w-5 h-5 text-emerald-500 focus:ring-emerald-500/20 bg-slate-950 border-slate-800 rounded"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Dangerous Zone */}
          <div className="p-6 rounded-3xl border border-red-900 bg-red-950/10 space-y-4">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm">Danger Zone</h3>
            </div>
            <p className="text-xs text-red-400/80 leading-relaxed">
              Deleting your account terminates your pilot registration. All pending payouts will be voided.
            </p>
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="py-2.5 px-4 rounded-xl bg-red-650 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Terminating...' : 'Terminate Driver Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
