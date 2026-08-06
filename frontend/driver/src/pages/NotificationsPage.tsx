import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { NotificationItem } from '../types';
import { Bell, CheckCheck, Circle } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get<NotificationItem[]>('/notifications');
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notifications read', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white font-display">Notifications Console</h2>
          <p className="text-xs text-slate-400">Driver operational alerts and broadcast messages.</p>
        </div>

        <button
          onClick={handleMarkAllAsRead}
          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5 border border-slate-800"
        >
          <CheckCheck className="w-4 h-4 text-emerald-400" />
          Mark All Read
        </button>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="glass-panel-dark p-8 rounded-3xl border border-slate-800 text-center text-slate-500 text-sm">
            No notifications available.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between ${
                n.status === 'UNREAD'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{n.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{n.body}</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {n.status === 'UNREAD' && <Circle className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400 mt-1" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
