import React, { useState } from 'react';
import { 
  ShieldAlert, Activity, CheckCircle2, AlertTriangle, Terminal, 
  RefreshCw, Filter, Search, Globe, Lock, Cpu
} from 'lucide-react';

export default function SaaSAuditLogView() {
  const [filterType, setFilterType] = useState('ALL');

  const logs = [
    { id: 'evt_101', type: 'SECURITY', event: 'SAML SSO Configuration Updated', actor: 'sarah.j@acmeplatform.io', ip: '192.168.1.104', status: 'SUCCESS', time: '2 mins ago' },
    { id: 'evt_102', type: 'WEBHOOK', event: 'invoice.payment_succeeded payload dispatched', actor: 'Stripe Gateway', ip: '54.210.12.89', status: 'SUCCESS', time: '14 mins ago' },
    { id: 'evt_103', type: 'API_RATE', event: 'Rate limit threshold warning (85% capacity)', actor: 'System Monitor', ip: '10.0.4.12', status: 'WARNING', time: '28 mins ago' },
    { id: 'evt_104', type: 'AUTH', event: 'Failed login attempt (Invalid TOTP token)', actor: 'unknown_client', ip: '185.220.101.4', status: 'FAILED', time: '45 mins ago' },
    { id: 'evt_105', type: 'LICENSE', event: 'Pro tier seats expanded from 20 to 50', actor: 'alex.d@vertexlabs.io', ip: '82.165.197.1', status: 'SUCCESS', time: '1 hour ago' },
    { id: 'evt_106', type: 'DATABASE', event: 'PostgreSQL read-replica failover complete', actor: 'AWS RDS Infra', ip: '172.31.8.45', status: 'SUCCESS', time: '2 hours ago' }
  ];

  const filteredLogs = (logs || []).filter((l) => {
    if (filterType === 'ALL') return true;
    return l.type === filterType;
  });

  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-900/70 p-5 shadow-2xl backdrop-blur-xl">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-white">Live System Audit & Webhook Stream</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable SOC2 audit trail, security events, and external webhook delivery receipts.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
          {['ALL', 'SECURITY', 'WEBHOOK', 'API_RATE', 'AUTH'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                filterType === t
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Style Stream Container */}
      <div className="mt-4 space-y-2">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 text-xs font-mono transition-all hover:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-2 w-2 rounded-full ${
                log.status === 'SUCCESS' ? 'bg-emerald-400' : log.status === 'WARNING' ? 'bg-amber-400' : 'bg-rose-400 animate-ping'
              }`} />

              <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] text-indigo-400 font-bold">
                [{log.type}]
              </span>

              <span className="text-slate-200 font-sans font-medium">{log.event}</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span className="truncate max-w-[150px]">{log.actor}</span>
              <span className="text-slate-400">{log.ip}</span>
              <span className="text-slate-400">{log.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
