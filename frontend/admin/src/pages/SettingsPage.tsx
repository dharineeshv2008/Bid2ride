import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemSetting } from '../types';
import { Settings, Save, Check, Loader2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get<SystemSetting[]>('/admin/settings');
        setSettings(data);
      } catch (err) {
        console.error('Failed to load settings', err);
        setSettings([
          { id: 1, key: 'platform_commission_percent', value: '15.0', description: 'System platform commission fee percentage', updated_at: new Date().toISOString() },
          { id: 2, key: 'bidding_window_seconds', value: '60', description: 'Driver bid room discovery timer window', updated_at: new Date().toISOString() },
        ]);
      }
    };
    fetchSettings();
  }, []);

  const handleUpdate = async (key: string, value: string) => {
    try {
      await api.put(`/admin/settings/${key}`, { value });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      alert('Failed to update setting');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
          <Settings className="w-5 h-5 text-sky-400" />
          Global Platform Configuration Settings
        </h2>
        <p className="text-xs text-slate-400">Modify platform commission parameters, rate limits, and bidding timeouts.</p>
      </div>

      <div className="glass-panel-admin p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
        {settings.map((s) => (
          <div key={s.key} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-white uppercase tracking-wider">{s.key.replace(/_/g, ' ')}</label>
              <button
                onClick={() => handleUpdate(s.key, s.value)}
                className="px-3 py-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </div>
            <p className="text-[11px] text-slate-400">{s.description}</p>
            <input
              type="text"
              value={s.value}
              onChange={(e) => {
                const val = e.target.value;
                setSettings(settings.map((item) => (item.key === s.key ? { ...item, value: val } : item)));
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
