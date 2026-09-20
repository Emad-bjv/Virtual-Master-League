import React from 'react';
import { 
  CreditCard, Zap, ShieldCheck, Check, ArrowUpRight, Cpu, 
  HardDrive, Users, AlertTriangle, RefreshCw
} from 'lucide-react';

export default function SaaSBillingView() {
  const usageLimits = [
    { title: 'Monthly API Requests', current: 1824000, max: 2000000, pct: 91, unit: 'reqs', color: 'from-amber-400 to-orange-500' },
    { title: 'Bandwidth Data Transfer', current: 480, max: 1000, pct: 48, unit: 'GB', color: 'from-cyan-400 to-blue-500' },
    { title: 'Active Team Licenses', current: 42, max: 50, pct: 84, unit: 'seats', color: 'from-indigo-500 to-purple-500' },
    { title: 'Database Storage Space', current: 18.4, max: 50, pct: 36, unit: 'GB', color: 'from-emerald-400 to-teal-500' }
  ];

  const tiers = [
    {
      name: 'Starter Startup',
      price: '$149',
      period: 'per month',
      desc: 'Ideal for early stage apps and indie developers.',
      features: ['Up to 10 Seats', '100k API Requests', 'Standard Email Support', '99.9% SLA'],
      current: false,
      buttonText: 'Downgrade Plan'
    },
    {
      name: 'Business Pro',
      price: '$499',
      period: 'per month',
      desc: 'Designed for scaling fast-growth SaaS teams.',
      features: ['Up to 50 Seats', '1M API Requests', 'Priority 24/7 Support', 'Custom Domain SSL', 'Advanced Audit Logs'],
      current: false,
      buttonText: 'Switch to Pro'
    },
    {
      name: 'Enterprise Core',
      price: '$1,299',
      period: 'per month',
      desc: 'Complete high-performance platform with dedicated support.',
      features: ['Unlimited Seats', '2M+ API Requests', 'Dedicated TAM Manager', 'SOC2 Type II Compliance', 'Custom SAML SSO & SCIM'],
      current: true,
      buttonText: 'Current Active Tier'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: Usage Meters */}
      <div className="rounded-3xl border border-slate-800/90 bg-slate-900/70 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Zap className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-white">Platform Usage & Resource Quotas</h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">Billing Cycle Ends Oct 01</span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(usageLimits || []).map((u, i) => (
            <div key={i} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">{u.title}</span>
                <span className="font-mono font-bold text-indigo-400">{u.pct}%</span>
              </div>

              {/* Progress Gauge Bar */}
              <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${u.color} transition-all duration-700`}
                  style={{ width: `${u.pct}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{u.current.toLocaleString()} {u.unit}</span>
                <span>Limit: {u.max.toLocaleString()} {u.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription Tier Upgrade Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(tiers || []).map((t, idx) => (
          <div
            key={idx}
            className={`relative rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between ${
              t.current
                ? 'border-indigo-500 bg-slate-900/90 shadow-2xl shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                : 'border-slate-800/90 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            {t.current && (
              <span className="absolute -top-3 right-6 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
                Active Subscription
              </span>
            )}

            <div>
              <h4 className="text-lg font-bold text-white">{t.name}</h4>
              <p className="mt-1 text-xs text-slate-400 min-h-[36px]">{t.desc}</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white font-mono">{t.price}</span>
                <span className="text-xs text-slate-400">{t.period}</span>
              </div>

              <div className="mt-6 space-y-2.5 border-t border-slate-800/80 pt-4 text-xs">
                {(t.features || []).map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-2 text-slate-300">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              disabled={t.current}
              className={`mt-6 w-full rounded-xl py-2.5 text-xs font-bold transition-all ${
                t.current
                  ? 'bg-slate-800 text-slate-400 cursor-default border border-slate-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30'
              }`}
            >
              {t.buttonText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
