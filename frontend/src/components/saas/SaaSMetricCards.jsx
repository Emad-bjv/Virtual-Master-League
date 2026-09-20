import React from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, RefreshCw, 
  ArrowUpRight, ShieldCheck, Zap, Layers, HelpCircle
} from 'lucide-react';

export default function SaaSMetricCards() {
  const metrics = [
    {
      id: 'mrr',
      title: 'Monthly Recurring Revenue (MRR)',
      value: '$148,920.00',
      change: '+14.8%',
      isPositive: true,
      subtext: '+$18.4k vs last month',
      icon: DollarSign,
      color: 'from-indigo-500 to-purple-600',
      sparkline: [45, 52, 49, 62, 58, 74, 82, 90, 88, 105, 118, 148]
    },
    {
      id: 'arr',
      title: 'Annual Recurring Revenue (ARR)',
      value: '$1.78M',
      change: '+22.4%',
      isPositive: true,
      subtext: 'Pacing $2.1M run-rate',
      icon: TrendingUp,
      color: 'from-cyan-400 to-blue-600',
      sparkline: [1.1, 1.2, 1.25, 1.35, 1.4, 1.5, 1.62, 1.78]
    },
    {
      id: 'nrr',
      title: 'Net Revenue Retention (NRR)',
      value: '118.4%',
      change: '+3.2%',
      isPositive: true,
      subtext: 'Target benchmark >110%',
      icon: RefreshCw,
      color: 'from-emerald-400 to-teal-600',
      sparkline: [108, 109, 111, 112, 114, 115, 118]
    },
    {
      id: 'churn',
      title: 'Gross User Churn Rate',
      value: '1.14%',
      change: '-0.42%',
      isPositive: true, // Lower churn is positive!
      subtext: 'Lowest in last 6 quarters',
      icon: ShieldCheck,
      color: 'from-emerald-500 to-green-600',
      sparkline: [2.8, 2.4, 2.1, 1.8, 1.6, 1.4, 1.14]
    },
    {
      id: 'arpu',
      title: 'Avg Revenue Per User (ARPU)',
      value: '$285.50',
      change: '+8.1%',
      isPositive: true,
      subtext: 'Expansion revenue up 12%',
      icon: Zap,
      color: 'from-amber-400 to-orange-500',
      sparkline: [220, 230, 245, 260, 272, 285]
    },
    {
      id: 'mau',
      title: 'Active Platform Subscribers',
      value: '24,890',
      change: '+1,420',
      isPositive: true,
      subtext: '8,240 DAU concurrent',
      icon: Users,
      color: 'from-purple-500 to-pink-600',
      sparkline: [18000, 19500, 21000, 22400, 23800, 24890]
    }
  ];

  // Helper function to render a smooth inline SVG sparkline
  const renderSparkline = (points, colorClass) => {
    if (!points || points.length === 0) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 100;
    const height = 36;

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="h-9 w-24 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`sparkGrad-${colorClass}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke="#6366f1"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coords}
        />
      </svg>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {(metrics || []).map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.id}
            className="group relative overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-indigo-500/5 backdrop-blur-xl"
          >
            {/* Top Accent Gradient Border */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${m.color} opacity-80 group-hover:opacity-100 transition-opacity`} />

            {/* Header: Title & Icon */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[80%]" title={m.title}>
                {m.title}
              </span>
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr ${m.color} text-white shadow-md shadow-indigo-500/10`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            {/* Value & Sparkline Row */}
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white font-mono">
                  {m.value}
                </h3>
                {/* Trend Badge */}
                <div className="mt-1 flex items-center gap-1">
                  <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                    m.isPositive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {m.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {m.change}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate">{m.subtext}</span>
                </div>
              </div>

              {/* SVG Sparkline */}
              <div className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                {renderSparkline(m.sparkline, m.id)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
