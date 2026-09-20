import React from 'react';
import { 
  BarChart3, LayoutDashboard, Users, CreditCard, Activity, 
  ShieldAlert, Settings, Sparkles, ChevronRight, Zap, Layers, Globe
} from 'lucide-react';

export default function SaaSSidebar({ 
  activeTab, 
  setActiveTab, 
  isOpen, 
  isCollapsed, 
  setIsCollapsed 
}) {
  const menuGroups = [
    {
      title: 'Analytics & Growth',
      items: [
        { id: 'overview', label: 'Executive Hub', icon: LayoutDashboard, badge: 'Live', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
        { id: 'analytics', label: 'Revenue & Funnel', icon: BarChart3 },
        { id: 'telemetry', label: 'Real-Time Telemetry', icon: Activity, badge: '99.9%', badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' }
      ]
    },
    {
      title: 'Platform Operations',
      items: [
        { id: 'customers', label: 'Customers & Subscriptions', icon: Users, badge: '2,480', badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
        { id: 'billing', label: 'Billing & API Quotas', icon: CreditCard },
        { id: 'audit', label: 'Audit & Webhooks', icon: ShieldAlert }
      ]
    },
    {
      title: 'Configuration',
      items: [
        { id: 'settings', label: 'Settings & Integrations', icon: Settings }
      ]
    }
  ];

  return (
    <aside
      className={`fixed lg:sticky top-16 z-30 h-[calc(100vh-4rem)] bg-slate-950/90 border-r border-slate-800/80 backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Scrollable Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {(menuGroups || []).map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1.5">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {group.title}
              </p>
            )}

            <div className="space-y-1">
              {(group.items || []).map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-white border border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                        : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    {/* Active Accent Pill Bar */}
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-indigo-400 to-purple-400 shadow-[0_0_8px_#6366f1]" />
                    )}

                    <Icon className={`h-4.5 w-4.5 shrink-0 transition-all ${
                      isActive ? 'text-indigo-400 scale-110' : 'text-slate-400 group-hover:text-slate-200'
                    }`} />

                    {!isCollapsed && (
                      <span className="flex-1 text-left truncate">{item.label}</span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}

                    {!isCollapsed && isActive && (
                      <ChevronRight className="h-3.5 w-3.5 text-indigo-400 opacity-80" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Banner / Storage Usage Gauge */}
      {!isCollapsed && (
        <div className="p-3 m-3 rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/40 to-purple-950/30 p-3 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300">
              <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400/20" /> Enterprise Tier
            </span>
            <span className="text-[10px] font-mono text-slate-400">84% Used</span>
          </div>

          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 w-[84%] transition-all duration-500" />
          </div>

          <p className="mt-2 text-[10px] text-slate-400 leading-tight">
            1.82M API Calls used of 2.0M monthly limit.
          </p>
        </div>
      )}
    </aside>
  );
}
