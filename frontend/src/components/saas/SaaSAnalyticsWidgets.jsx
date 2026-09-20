import React from 'react';
import { 
  PieChart, Globe2, Activity, ArrowRight, Zap, Shield, 
  Layers, CheckCircle2, TrendingUp, AlertTriangle
} from 'lucide-react';

export default function SaaSAnalyticsWidgets() {
  const plans = [
    { name: 'Enterprise Core', share: 42, mrr: '$62,540', color: 'from-indigo-500 to-purple-600', text: 'text-indigo-400' },
    { name: 'Business Pro', share: 34, mrr: '$50,630', color: 'from-cyan-400 to-blue-600', text: 'text-cyan-400' },
    { name: 'Growth Startup', share: 18, mrr: '$26,800', color: 'from-emerald-400 to-teal-600', text: 'text-emerald-400' },
    { name: 'Starter Tier', share: 6, mrr: '$8,950', color: 'from-amber-400 to-orange-500', text: 'text-amber-400' }
  ];

  const funnelSteps = [
    { stage: 'Unique Visitors', count: '142,500', conv: '100%', color: 'bg-indigo-600' },
    { stage: 'Free Trial Signups', count: '18,400', conv: '12.9%', color: 'bg-cyan-500' },
    { stage: 'Activated Workspaces', count: '8,920', conv: '48.4%', color: 'bg-emerald-500' },
    { stage: 'Paid Subscriptions', count: '2,480', conv: '27.8%', color: 'bg-purple-500' }
  ];

  const regions = [
    { country: 'North America (US/CA)', revenue: '$82,400', share: '55%', latency: '24ms' },
    { country: 'Europe (EU-Central)', revenue: '$41,200', share: '28%', latency: '38ms' },
    { country: 'Asia-Pacific (APAC)', revenue: '$18,900', share: '12%', latency: '82ms' },
    { country: 'Latin America (LATAM)', revenue: '$6,420', share: '5%', latency: '110ms' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Widget 1: Subscription Tier Distribution */}
      <div className="rounded-3xl border border-slate-800/90 bg-slate-900/70 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <PieChart className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Tier Share & Revenue</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Total: 4 Plans</span>
        </div>

        {/* Visual Multi-Segment Bar */}
        <div className="mt-4">
          <div className="flex h-4 w-full rounded-xl overflow-hidden p-0.5 bg-slate-950 border border-slate-800">
            {(plans || []).map((p, i) => (
              <div
                key={i}
                style={{ width: `${p.share}%` }}
                className={`h-full bg-gradient-to-r ${p.color} transition-all duration-500 hover:opacity-90 cursor-pointer`}
                title={`${p.name}: ${p.share}% (${p.mrr})`}
              />
            ))}
          </div>
        </div>

        {/* Detailed Breakdown List */}
        <div className="mt-4 space-y-2.5">
          {(plans || []).map((p, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl p-2 bg-slate-950/40 border border-slate-800/60 text-xs">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${p.color}`} />
                <span className="font-semibold text-slate-200">{p.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-mono font-bold ${p.text}`}>{p.mrr}</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                  {p.share}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Widget 2: Conversion Funnel Performance */}
      <div className="rounded-3xl border border-slate-800/90 bg-slate-900/70 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Conversion Funnel</h3>
          </div>
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            +3.8% Overall Conv.
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {(funnelSteps || []).map((step, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">{step.stage}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono">{step.count}</span>
                  <span className="text-indigo-400 font-bold text-[11px]">{step.conv}</span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full ${step.color} transition-all duration-700`}
                  style={{ width: `${100 - idx * 22}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Widget 3: Regional Revenue & System Latency */}
      <div className="rounded-3xl border border-slate-800/90 bg-slate-900/70 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Globe2 className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Global Nodes & Latency</h3>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Global CDN Operational
          </span>
        </div>

        <div className="mt-4 space-y-2.5">
          {(regions || []).map((r, i) => (
            <div key={i} className="flex items-center justify-between rounded-2xl p-2.5 bg-slate-950/60 border border-slate-800/80 text-xs">
              <div>
                <p className="font-semibold text-slate-200">{r.country}</p>
                <span className="text-[10px] text-slate-400">Share: {r.share}</span>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-emerald-400">{r.revenue}</p>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-cyan-400">
                  ⚡ {r.latency}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
