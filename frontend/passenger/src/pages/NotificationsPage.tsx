import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { NotificationItem } from '../types';
import { Bell, CheckCheck, Circle, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

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
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#0EA5E9] text-white">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">Real-time alerts, bidding offers & wallet updates</p>
        </div>

        <button
          onClick={handleMarkAllAsRead}
          className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm"
        >
          <CheckCheck className="w-4 h-4 text-[#0EA5E9]" />
          Mark All Read
        </button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-5 rounded-[18px] border border-gray-200 animate-pulse h-20" />
          ))
        ) : notifications.length === 0 ? (
          <div className="bg-white p-12 rounded-[18px] border border-gray-200 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="w-14 h-14 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center mx-auto mb-3">
              <Bell className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">No Notifications Yet</h3>
            <p className="text-xs text-gray-500 mt-1">Ride updates and system alerts will appear here.</p>
          </div>
        ) : (
          notifications.map((n) => {
            const isUnread = n.status === 'UNREAD';
            return (
              <div
                key={n.id}
                className={`p-5 rounded-[18px] border transition-all flex items-start justify-between ${
                  isUnread
                    ? 'bg-[#E0F2FE]/50 border-[#0EA5E9]/30 shadow-md'
                    : 'bg-white border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
                }`}
              >
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isUnread ? 'bg-[#0EA5E9] text-white shadow-sm' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{n.title}</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{n.body}</p>
                    <span className="text-[11px] text-gray-400 mt-2 block font-medium">
                      {new Date(n.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {isUnread && (
                  <span className="flex h-2.5 w-2.5 relative mt-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0EA5E9] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0EA5E9]"></span>
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

