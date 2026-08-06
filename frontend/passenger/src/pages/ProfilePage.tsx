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
  Camera,
  Lock,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { FavoritePlacesSection } from '../components/FavoritePlacesSection';
import { PersonalProfileSection } from '../components/PersonalProfileSection';



export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get<UserSettings>('/auth/settings');
        setSettings(data);
        setEmergencyName(data.emergency_contact_name || '');
        setEmergencyPhone(data.emergency_contact_phone || '');
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

  const handleSaveEmergencyContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleUpdateSetting({
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone
    });
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('WARNING: Are you absolutely sure you want to delete your Bid2Ride account? This action is permanent and cannot be undone.')) {
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
      <div className="flex items-center justify-center p-12 text-gray-400">
        <span className="animate-pulse font-medium">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Account & Preferences</h2>
          <p className="text-xs text-gray-500 font-medium mt-1">Manage personal details, safety contacts, and preferences</p>
        </div>
        {isSaved && (
          <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3.5 py-1.5 rounded-full text-xs font-bold border border-emerald-200 shadow-sm">
            <Check className="w-4 h-4 text-emerald-600" />
            Auto-saved
          </span>
        )}
      </div>

      {/* Personal Profile Section */}
      <PersonalProfileSection />

      <div className="grid md:grid-cols-12 gap-6">


        {/* Left Column: User Profile Card & Safety Emergency Contacts */}
        <div className="md:col-span-5 space-y-6">
          {/* User Details Card */}
          <div className="bg-white rounded-[18px] p-6 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0EA5E9] to-[#0284C7] text-white flex items-center justify-center font-extrabold text-2xl shadow-[0_4px_14px_rgba(14,165,233,0.35)] relative group cursor-pointer">
                {user?.name?.[0]?.toUpperCase() || 'U'}
                <div className="absolute inset-0 bg-black/30 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-lg">{user?.name || 'Passenger'}</h4>
                <span className="text-[11px] font-bold text-[#0284C7] bg-[#E0F2FE] px-2.5 py-0.5 rounded-full border border-[#0EA5E9]/20 uppercase tracking-wider">
                  {user?.role || 'PASSENGER'} ACCOUNT
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone Number</label>
                <div className="flex items-center gap-2.5 text-gray-800 bg-gray-50 p-3 rounded-xl border border-gray-200 font-semibold text-xs">
                  <Phone className="w-4 h-4 text-[#0EA5E9]" />
                  <span>{user?.phone}</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                <div className="flex items-center gap-2.5 text-gray-800 bg-gray-50 p-3 rounded-xl border border-gray-200 font-semibold text-xs">
                  <Mail className="w-4 h-4 text-[#0EA5E9]" />
                  <span>{user?.email || 'No email attached'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency SOS Contact details */}
          <div className="bg-white rounded-[18px] p-6 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-500" />
              Emergency Safety Contacts
            </h3>
            <form onSubmit={handleSaveEmergencyContacts} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]"
                  placeholder="e.g. Spouse, Parent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]"
                  placeholder="+919876543210"
                />
              </div>
              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Save className="w-4 h-4 text-[#0EA5E9]" /> Save Safety Contact
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Preferences, Map, Notifications, and Settings */}
        <div className="md:col-span-7 space-y-6">
          {/* Favorite Places Management Section */}
          <div className="bg-white rounded-[18px] p-6 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <FavoritePlacesSection />
          </div>

          {/* Visual Preferences */}
          <div className="bg-white rounded-[18px] p-6 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">

            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              Theme & UI Preferences
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleUpdateSetting({ theme: 'light' })}
                className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                  settings.theme === 'light'
                    ? 'border-[#0EA5E9] bg-[#E0F2FE] text-[#0284C7] font-bold shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <Sun className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-bold">Light Mode</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateSetting({ theme: 'dark' })}
                className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                  settings.theme === 'dark'
                    ? 'border-[#0EA5E9] bg-[#E0F2FE] text-[#0284C7] font-bold shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <Moon className="w-5 h-5 text-indigo-500" />
                <span className="text-xs font-bold">Dark Mode</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-[#0EA5E9]" /> Language
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => handleUpdateSetting({ language: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                >
                  <option value="en">English (US)</option>
                  <option value="en-IN">English (India)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <Map className="w-3.5 h-3.5 text-[#0EA5E9]" /> Map Engine
                </label>
                <select
                  value={settings.map_provider}
                  onChange={(e) => handleUpdateSetting({ map_provider: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                >
                  <option value="maplibre">MapLibre GL JS</option>
                  <option value="google">Google Maps Vector</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ride & Payment Preferences */}
          <div className="bg-white rounded-[18px] p-6 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Car className="w-4 h-4 text-[#0EA5E9]" />
              Default Ride & Payment Options
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-[#0EA5E9]" /> Payment Method
                </label>
                <select
                  value={settings.default_payment_method}
                  onChange={(e) => handleUpdateSetting({ default_payment_method: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                >
                  <option value="CASH">Cash Payment</option>
                  <option value="CARD">Credit/Debit Card</option>
                  <option value="UPI">UPI AutoPay</option>
                  <option value="WALLET">Bid2Ride Wallet</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-[#0EA5E9]" /> Preferred Vehicle
                </label>
                <select
                  value={settings.preferred_ride_type}
                  onChange={(e) => handleUpdateSetting({ preferred_ride_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                >
                  <option value="ECONOMY">Standard Sedan</option>
                  <option value="COMFORT">Comfort SUV</option>
                  <option value="XL">Luxury XL</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 text-xs sm:text-sm">Location Telemetry Sharing</h4>
                <p className="text-xs text-gray-500 mt-0.5">Allow driver app to track pickup coordinates.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.privacy_share_location}
                onChange={(e) => handleUpdateSetting({ privacy_share_location: e.target.checked })}
                className="w-5 h-5 text-[#0EA5E9] focus:ring-[#0EA5E9]/20 rounded accent-[#0EA5E9]"
              />
            </div>
          </div>

          {/* Notifications Delivery */}
          <div className="bg-white rounded-[18px] p-6 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0EA5E9]" />
              Notification Channels
            </h3>

            <div className="space-y-3">
              {[
                { key: 'notification_email', label: 'Email Alerts', desc: 'Receive digital invoice receipts & ride updates' },
                { key: 'notification_sms', label: 'SMS Alerts', desc: 'Receive driver arrival OTP messages' },
                { key: 'notification_push', label: 'Push Banners', desc: 'Real-time fare bidding updates' },
              ].map((item) => (
                <div key={item.key} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm">{item.label}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={(settings as any)[item.key]}
                    onChange={(e) => handleUpdateSetting({ [item.key]: e.target.checked })}
                    className="w-5 h-5 text-[#0EA5E9] focus:ring-[#0EA5E9]/20 rounded accent-[#0EA5E9]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-6 rounded-[18px] border border-rose-200 bg-rose-50/60 space-y-3">
            <div className="flex items-center gap-2 text-rose-700 font-bold">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <h3 className="text-sm">Account Deletion</h3>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              Deleting your account is permanent and will remove all saved places, trip histories, and wallet credits.
            </p>
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Deleting Account...' : 'Delete My Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

