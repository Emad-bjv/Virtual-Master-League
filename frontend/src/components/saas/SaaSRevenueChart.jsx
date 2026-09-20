import React, { useState } from 'react';
import { 
  BarChart3, Calendar, Download, Filter, RefreshCw, Sparkles, 
  TrendingUp, Eye, Layers, HelpCircle
} from 'lucide-react';

export default function SaaSRevenueChart() {
  const [timeframe, setTimeframe] = useState('30D'); // '7D' | '30D' | '90D' | '1Y'
  const [activeMetric, setActiveMetric] = useState('mrr'); // 'mrr' | 'net' | 'subscribers'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // High quality sample data per timeframe
  const dataSets = {
    '7D': [
      { label: 'Mon 14', mrr: 142000, net: 128000, subscribers: 24100, projected: 140000 },
      { label: 'Tue 15', mrr: 143500, net: 129200, subscribers: 24220, projected: 141500 },
      { label: 'Wed 16', mrr: 144800, net: 130500, subscribers: 24350, projected: 143000 },
      { label: 'Thu 17', mrr: 146100, net: 132100, subscribers: 24490, projected: 144500 },
      { label: 'Fri 18', mrr: 147500, net: 133400, subscribers: 24650, projected: 146000 },
      { label: 'Sat 19', mrr: 148200, net: 134200, subscribers: 24780, projected: 147200 },
      { label: 'Sun 20', mrr: 148920, net: 135800, subscribers: 24890, projected: 148000 }
    ],
    '30D': [
      { label: 'Aug 22', mrr: 128000, net: 114000, subscribers: 21500, projected: 126000 },
      { label: 'Aug 26', mrr: 131200, net: 117500, subscribers: 22100, projected: 129000 },
      { label: 'Aug 30', mrr: 134500, net: 120800, subscribers: 22650, projected: 132000 },
      { label: 'Sep 03', mrr: 138000, net: 124200, subscribers: 23100, projected: 135500 },
      { label: 'Sep 07', mrr: 141200, net: 127800, subscribers: 23600, projected: 139000 },
      { label: 'Sep 11', mrr: 144000, net: 130500, subscribers: 24150, projected: 142000 },
      { label: 'Sep 15', mrr: 146800, net: 133200, subscribers: 24500, projected: 145000 },
      { label: 'Sep 20', mrr: 148920, net: 135800, subscribers: 24890, projected: 148000 }
    ],
    '90D': [
      { label: 'Jun W1', mrr: 105000, net: 92000, subscribers: 18200, projected: 104000 },
      { label: 'Jun W3', mrr: 112000, net: 98500, subscribers: 19100, projected: 110000 },
      { label: 'Jul W1', mrr: 120000, net: 106000, subscribers: 20400, projected: 118000 },
      { label: 'Jul W3', mrr: 128000, net: 114500, subscribers: 21800, projected: 125000 },
      { label: 'Aug W1', mrr: 136000, net: 122000, subscribers: 23000, projected: 133000 },
      { label: 'Aug W3', mrr: 142000, net: 128500, subscribers: 24000, projected: 140000 },
      { label: 'Sep W3', mrr: 148920, net: 135800, subscribers: 24890, projected: 147500 }
    ],
    '1Y': [
      { label: 'Oct 25', mrr: 82000, net: 71000, subscribers: 14200, projected: 80000 },
      { label: 'Dec 25', mrr: 94000, net: 82000, subscribers: 16100, projected: 92000 },
      { label: 'Feb 26', mrr: 108000, net: 95000, subscribers: 18400, projected: 105000 },
      { label: 'Apr 26', mrr: 122000, net: 108000, subscribers: 20900, projected: 119000 },
      { label: 'Jun 26', mrr: 135000, net: 121000, subscribers: 23100, projected: 132000 },
      { label: 'Aug 26', mrr: 144000, net: 130000, subscribers: 24200, projected: 141000 },
      { label: 'Sep 26', mrr: 148920, net: 135800, subscribers: 24890, projected: 147000 }
    ]
  };

  const currentData = dataSets[timeframe] || dataSets['30D'];

  // Scaling calculations
  const values = currentData.map(d => d[activeMetric]);
  const minVal = Math.min(...values) * 0.95;
  const maxVal = Math.max(...values) * 1.05;
  const svgWidth = 800;
  const svgHeight = 280;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;

  const getX = (index) => paddingLeft + (index / (currentData.length - 1)) * chartW;
  const getY = (val) => paddingTop + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;

  // Build SVG Path
  const points = currentData.map((d, i) => `${getX(i)},${getY(d[activeMetric])}`).join(' ');
  const areaPoints = `${getX(0)},${paddingTop + chartH} ${points} ${getX(currentData.length - 1)},${paddingTop + chartH}`;

  const formatCurrency = (val) => {
    if (activeMetric === 'subscribers') return val.toLocaleString();
    return `$${(val / 1000).toFixed(1)}k`;
  };

  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-900/70 p-5 shadow-2xl backdrop-blur-xl">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-wide">
              Revenue Trajectory & Forecast Analytics
            </h2>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
              +14.8% MoM Growth
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time subscription billing telemetry and predictive MRR runway.
          </p>
        </div>

        {/* Filters & Timeframe Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector Pills */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            {[
              { id: 'mrr', label: 'MRR Growth' },
              { id: 'net', label: 'Net Revenue' },
              { id: 'subscribers', label: 'Subscribers' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setActiveMetric(m.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeMetric === m.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Timeframe Selector */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            {['7D', '30D', '90D', '1Y'].map(t => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  timeframe === t
                    ? 'bg-slate-800 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Export Action */}
          <button className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
            <Download className="h-3.5 w-3.5 text-indigo-400" /> Export
          </button>
        </div>
      </div>

      {/* Main SVG Area Chart */}
      <div className="relative mt-4 w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Smooth Area Gradient */}
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </linearGradient>

            {/* Grid Line Pattern */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Horizontal Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingTop + chartH * (1 - pct);
            const val = minVal + (maxVal - minVal) * pct;
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#334155"
                  strokeOpacity="0.3"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {formatCurrency(val)}
                </text>
              </g>
            );
          })}

          {/* Gradient Fill under path */}
          <polygon
            points={areaPoints}
            fill="url(#revenueGradient)"
          />

          {/* Smooth Line Path */}
          <polyline
            fill="none"
            stroke="#6366f1"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            points={points}
          />

          {/* X Axis Labels & Interactive Points */}
          {(currentData || []).map((d, idx) => {
            const cx = getX(idx);
            const cy = getY(d[activeMetric]);
            const isHovered = hoveredPoint === idx;

            return (
              <g key={idx}>
                {/* X Axis Label */}
                <text
                  x={cx}
                  y={svgHeight - 10}
                  fill={isHovered ? '#f8fafc' : '#94a3b8'}
                  fontSize="11"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {d.label}
                </text>

                {/* Vertical Hover Guide Line */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={paddingTop}
                    x2={cx}
                    y2={paddingTop + chartH}
                    stroke="#818cf8"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Interactive Data Point Node */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7 : 4.5}
                  fill={isHovered ? '#38bdf8' : '#6366f1'}
                  stroke="#0f172a"
                  strokeWidth="2.5"
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredPoint(idx)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint !== null && (
          <div
            className="pointer-events-none absolute z-20 rounded-2xl border border-indigo-500/40 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-2xl transition-all"
            style={{
              left: `${(getX(hoveredPoint) / svgWidth) * 100}%`,
              top: `${(getY(currentData[hoveredPoint][activeMetric]) / svgHeight) * 100}%`,
              transform: 'translate(-50%, -125%)'
            }}
          >
            <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-200 border-b border-slate-800 pb-1">
              <span>{currentData[hoveredPoint].label}</span>
              <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-indigo-400">Verified</span>
            </div>
            <div className="mt-1.5 space-y-1 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">MRR:</span>
                <span className="font-mono font-bold text-emerald-400">${currentData[hoveredPoint].mrr.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Net Rev:</span>
                <span className="font-mono font-bold text-cyan-400">${currentData[hoveredPoint].net.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Subscribers:</span>
                <span className="font-mono font-bold text-purple-400">{currentData[hoveredPoint].subscribers.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Summary Bar */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-slate-800/60 bg-slate-950/60 p-3 text-xs">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Average Daily Velocity</p>
          <p className="text-sm font-bold text-slate-100 font-mono mt-0.5">$4,964 / day</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Quarter End Projection</p>
          <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">$184,200 MRR</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">LTV:CAC Ratio</p>
          <p className="text-sm font-bold text-indigo-400 font-mono mt-0.5">4.8x (Healthy)</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Payback Period</p>
          <p className="text-sm font-bold text-cyan-400 font-mono mt-0.5">7.2 Months</p>
        </div>
      </div>
    </div>
  );
}
