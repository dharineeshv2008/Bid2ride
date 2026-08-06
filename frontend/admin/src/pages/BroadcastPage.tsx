import React, { useState } from 'react';
import { api } from '../services/api';
import { Megaphone, Send, Check, Loader2 } from 'lucide-react';

export const BroadcastPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetRole, setTargetRole] = useState<'ALL' | 'PASSENGER' | 'DRIVER'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/notifications/broadcast', {
        title,
        body,
        target_role: targetRole === 'ALL' ? undefined : targetRole,
      });
      setIsSuccess(true);
      setTitle('');
      setBody('');
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dispatch broadcast message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-sky-400" />
          Broadcast System Announcements
        </h2>
        <p className="text-xs text-slate-400">Dispatch push, SMS, and in-app alerts to passengers and drivers.</p>
      </div>

      <div className="glass-panel-admin p-6 rounded-3xl border border-slate-800 shadow-2xl">
        {isSuccess && (
          <div className="bg-emerald-500/10 text-emerald-400 text-xs p-3 rounded-xl mb-4 border border-emerald-500/20 flex items-center gap-2 font-bold">
            <Check className="w-4 h-4" /> Broadcast dispatched successfully!
          </div>
        )}

        <form onSubmit={handleSendBroadcast} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Target Audience
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['ALL', 'PASSENGER', 'DRIVER'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTargetRole(r)}
                  className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    targetRole === r
                      ? 'bg-sky-500 text-white border-sky-400 shadow-lg'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {r === 'ALL' ? 'All Users' : r === 'PASSENGER' ? 'Passengers Only' : 'Drivers Only'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Announcement Title
            </label>
            <input
              type="text"
              placeholder="e.g. Platform Maintenance Scheduled"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/30 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Notification Body Text
            </label>
            <textarea
              rows={4}
              placeholder="Write broadcast message payload details..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/30 text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Dispatch Broadcast Alert'}
          </button>
        </form>
      </div>
    </div>
  );
};
