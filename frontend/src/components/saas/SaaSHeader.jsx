import React, { useState } from 'react';
import { 
  Search, Bell, Sparkles, Command, ChevronDown, CheckCircle2, 
  Moon, Sun, ShieldCheck, Zap, User, Settings, LogOut, ExternalLink,
  Menu, X
} from 'lucide-react';

export default function SaaSHeader({ 
  onOpenSearch, 
  isSidebarOpen, 
  setIsSidebarOpen, 
  activeWorkspace, 
  setActiveWorkspace 
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const workspaces = [
    { id: 'acme-corp', name: 'Acme Global Inc.', plan: 'Enterprise Platform', icon: '⚡', color: 'from-cyan-500 to-blue-600' },
    { id: 'starlight-labs', name: 'Starlight AI Labs', plan: 'Pro Business', icon: '✨', color: 'from-purple-500 to-pink-600' },
    { id: 'nexus-tech', name: 'Nexus Cloud Services', plan: 'Growth Startup', icon: '🚀', color: 'from-emerald-400 to-teal-600' }
  ];

  const currentWorkspace = workspaces.find(w => w.id === activeWorkspace) || workspaces[0];

  const notifications = [
    { id: 1, title: 'New Enterprise Lead', desc: 'Apex Corp requested 250 seat licenses.', time: '4m ago', unread: true, type: 'sales' },
    { id: 2, title: 'API Quota Spike', desc: 'EU-Central cluster reached 88% bandwidth.', time: '22m ago', unread: true, type: 'warning' },
    { id: 3, title: 'Invoice Paid', desc: '$12,400 received from CyberDyne Tech.', time: '1h ago', unread: false, type: 'success' },
    { id: 4, title: 'Security Audit Passed', desc: 'SOC2 Type II compliance check completed.', time: '3h ago', unread: false, type: 'info' }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl transition-all">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left Side: Sidebar Toggle & Brand Workspace */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Toggle sidebar menu"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo & Workspace Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className="flex items-center gap-2.5 rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-1.5 hover:border-slate-700 hover:bg-slate-900 transition-all text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr ${currentWorkspace.color} text-sm font-bold text-white shadow-md shadow-indigo-500/20`}>
                {currentWorkspace.icon}
              </div>
              <div className="hidden md:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-100 tracking-wide">{currentWorkspace.name}</span>
                  <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">PRO</span>
                </div>
                <p className="text-[10px] font-medium text-slate-400">{currentWorkspace.plan}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* Workspace Menu Popover */}
            {showWorkspaceMenu && (
              <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl backdrop-blur-2xl z-50">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Select Workspace
                </div>
                <div className="space-y-1">
                  {(workspaces || []).map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setActiveWorkspace(ws.id);
                        setShowWorkspaceMenu(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition-all ${
                        ws.id === currentWorkspace.id
                          ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{ws.icon}</span>
                        <div className="text-left">
                          <p className="font-medium text-slate-200">{ws.name}</p>
                          <p className="text-[10px] text-slate-400">{ws.plan}</p>
                        </div>
                      </div>
                      {ws.id === currentWorkspace.id && (
                        <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* System Status Pill */}
          <div className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>All Systems 99.99% Uptime</span>
          </div>
        </div>

        {/* Center / Right: Global Search & Quick Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Search Button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 rounded-xl border border-slate-800/90 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-slate-200 transition-all shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Search className="h-4 w-4 text-indigo-400" />
            <span className="hidden sm:inline-block font-medium">Search metrics, customers, APIs...</span>
            <span className="sm:hidden font-medium">Search...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-slate-700/60 bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400">
              <Command className="h-2.5 w-2.5" /> K
            </kbd>
          </button>

          {/* Notification Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="View notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-slate-950" />
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-2xl backdrop-blur-2xl z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Notifications</h4>
                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400">2 New</span>
                  </div>
                  <button className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300">Mark all read</button>
                </div>
                <div className="mt-2 space-y-1.5 max-h-72 overflow-y-auto">
                  {(notifications || []).map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 rounded-xl p-2.5 transition-all ${
                        n.unread ? 'bg-indigo-950/30 border border-indigo-500/20' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-indigo-400">
                        {n.type === 'sales' && <Sparkles className="h-4 w-4 text-emerald-400" />}
                        {n.type === 'warning' && <Zap className="h-4 w-4 text-amber-400" />}
                        {n.type === 'success' && <ShieldCheck className="h-4 w-4 text-cyan-400" />}
                        {n.type === 'info' && <Bell className="h-4 w-4 text-indigo-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-100 truncate">{n.title}</p>
                          <span className="text-[10px] text-slate-400">{n.time}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400 leading-snug">{n.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 p-1 pr-2 hover:border-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Sarah Jenkins"
                className="h-7 w-7 rounded-lg object-cover ring-1 ring-indigo-500/50"
              />
              <span className="hidden md:inline-block text-xs font-semibold text-slate-200">Sarah Jenkins</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl backdrop-blur-2xl z-50">
                <div className="px-3 py-2 border-b border-slate-800 mb-1">
                  <p className="text-xs font-bold text-slate-100">Sarah Jenkins</p>
                  <p className="text-[10px] text-slate-400 truncate">sarah.j@acmeplatform.io</p>
                  <span className="mt-1 inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
                    Chief Technology Officer
                  </span>
                </div>
                <div className="space-y-0.5">
                  <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
                    <User className="h-4 w-4 text-indigo-400" /> Account Settings
                  </button>
                  <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
                    <Settings className="h-4 w-4 text-purple-400" /> API Keys & Access
                  </button>
                  <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
                    <ExternalLink className="h-4 w-4 text-cyan-400" /> Developer Portal
                  </button>
                </div>
                <div className="pt-1 mt-1 border-t border-slate-800">
                  <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
