import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { UserSettings } from '../types';
import { 
  Shield, 
  Phone, 
  KeyRound, 
  Check, 
  Save, 
  Sun, 
  Moon, 
  Globe, 
  Bell,
  Activity
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get<UserSettings>('/auth/settings');
        setSettings(data);
        if (data.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (err) {
        console.error('Failed to load admin settings', err);
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

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <span className="animate-pulse">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-display flex items-center gap-2">
            <Shield className="w-6 h-6 text-sky-400" />
            Administrator Account Profile & Settings
          </h2>
          <p className="text-xs text-slate-400">Manage administrator details, notification updates, and visual theme choices.</p>
        </div>
        {isSaved && (
          <span className="flex items-center gap-1 bg-sky-500/20 text-sky-400 px-3 py-1.5 rounded-full text-xs font-bold border border-sky-500/30 animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            Auto-saved
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        {/* Left Column: Admin details */}
        <div className="md:col-span-5 space-y-6">
          <div className="glass-panel-admin p-6 rounded-3xl border border-slate-800 shadow-2xl">
            <div className="flex items-center gap-4 mb-6 border-b border-slate-800 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-glow">
                A
              </div>
              <div>
                <h4 className="font-bold text-white text-lg">{user?.name || 'Administrator'}</h4>
                <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">{user?.role} ACCESS</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                <div className="flex items-center gap-2 text-white">
                  <Phone className="w-4 h-4 text-sky-400" />
                  <span className="text-sm font-semibold">{user?.phone}</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Authorization Clearance</label>
                <div className="flex items-center gap-2 text-emerald-400">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm font-bold uppercase">ACTIVE SUPERADMIN</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual theme, language options, notifications */}
        <div className="md:col-span-7 space-y-6">
          {/* UI theme options */}
          <div className="glass-panel-admin p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sun className="w-4 h-4 text-sky-400" />
              Theme & Interface Choice
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleUpdateSetting({ theme: 'light' })}
                className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                  settings.theme === 'light'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-400 font-bold shadow-sm'
                    : 'border-slate-800 bg-slate-950 text-slate-500'
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
                    ? 'border-sky-500 bg-sky-500/10 text-sky-400 font-bold shadow-sm'
                    : 'border-slate-800 bg-slate-950 text-slate-500'
                }`}
              >
                <Moon className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-bold">Dark Theme</span>
              </button>
            </div>

            <div className="pt-2">
              <label className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-slate-500" /> Language Preferences
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
          </div>

          {/* Admin Notifications preferences */}
          <div className="glass-panel-admin p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-400" />
              Platform Alert Channels
            </h3>

            <div className="space-y-3">
              {[
                { key: 'notification_email', label: 'Email Security Audits', desc: 'Receive security login alerts in email' },
                { key: 'notification_sms', label: 'SMS Core Diagnostics', desc: 'Receive high priority server failure texts' },
                { key: 'notification_push', label: 'Push Broadcast Notifications', desc: 'Receive push alerts for pending driver verifications' },
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
                    className="w-5 h-5 text-sky-500 focus:ring-sky-500/20 bg-slate-950 border-slate-800 rounded"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
