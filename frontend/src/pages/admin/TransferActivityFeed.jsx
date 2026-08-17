import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { transferApi } from '../../services/api';

export default function TransferActivityFeed() {
  const [logs, setLogs] = useState([]);
  
  const fetchLogs = () => {
    transferApi.getLogs()
      .then(res => setLogs(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-amber-400" />
          <h2 className="font-bold text-white">لاگ زنده نقل و انتقالات (مدیریت)</h2>
        </div>
        <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded">
          آپدیت خودکار
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
        {logs.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">لاگی وجود ندارد.</div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs flex gap-3 items-start">
              <div className="mt-1">
                <span className={`w-2 h-2 rounded-full inline-block ${
                  log.event_type === 'OFFER_MADE' ? 'bg-blue-500' :
                  log.event_type === 'COUNTER_OFFER' ? 'bg-amber-500' :
                  log.event_type === 'OFFER_REJECTED' ? 'bg-rose-500' :
                  log.event_type === 'TRANSFER_FINALIZED' ? 'bg-green-500' :
                  'bg-purple-500'
                }`}></span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-200">{log.event_type_display}</span>
                  <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString('fa-IR')}</span>
                </div>
                <p className="text-slate-400 mt-1">{log.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
