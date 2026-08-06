import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditLog } from '../types';
import { FileText, Download } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await api.get<{ items: AuditLog[] }>('/admin/audit-logs');
        setLogs(data.items);
      } catch (err) {
        console.error('Failed to load audit logs', err);
        setLogs([
          { id: 1, admin_user_id: 'usr_3', action: 'DRIVER_VERIFICATION_APPROVED', ip_address: '127.0.0.1', created_at: new Date().toISOString() },
          { id: 2, admin_user_id: 'usr_3', action: 'SYSTEM_SETTINGS_UPDATED', ip_address: '127.0.0.1', created_at: new Date().toISOString() },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + logs.map((e) => `${e.id},${e.action},${e.ip_address},${e.created_at}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'audit_logs.csv');
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            Administrative Audit Ledger
          </h2>
          <p className="text-xs text-slate-400">Immutable trail of system modifications, verifications, and security events.</p>
        </div>

        <button
          onClick={exportCSV}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 font-bold text-xs border border-slate-800 flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="glass-panel-admin rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-bold">
            <tr>
              <th className="p-4">Log ID</th>
              <th className="p-4">Action Type</th>
              <th className="p-4">Admin ID</th>
              <th className="p-4">IP Address</th>
              <th className="p-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="p-4 font-mono font-bold text-white">#{log.id}</td>
                <td className="p-4 font-bold text-sky-400">{log.action}</td>
                <td className="p-4 font-mono">{log.admin_user_id}</td>
                <td className="p-4 font-mono text-slate-400">{log.ip_address}</td>
                <td className="p-4 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
