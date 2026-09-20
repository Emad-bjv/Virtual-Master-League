import React, { useState, useEffect } from 'react';
import SaaSHeader from '../components/saas/SaaSHeader';
import SaaSSidebar from '../components/saas/SaaSSidebar';
import SaaSMetricCards from '../components/saas/SaaSMetricCards';
import SaaSRevenueChart from '../components/saas/SaaSRevenueChart';
import SaaSAnalyticsWidgets from '../components/saas/SaaSAnalyticsWidgets';
import SaaSCustomerTable from '../components/saas/SaaSCustomerTable';
import SaaSBillingView from '../components/saas/SaaSBillingView';
import SaaSAuditLogView from '../components/saas/SaaSAuditLogView';
import SaaSUserDetailModal from '../components/saas/SaaSUserDetailModal';
import SaaSSearchModal from '../components/saas/SaaSSearchModal';
import { 
  Sparkles, RefreshCw, Calendar, Download, Zap, Layers, 
  CheckCircle2, ArrowRight
} from 'lucide-react';

export default function SaaSProjectDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState('acme-corp');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);

  // Global Keyboard Shortcut: Cmd/Ctrl + K for Search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 font-sans antialiased flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <SaaSHeader
        onOpenSearch={() => setIsSearchOpen(true)}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeWorkspace={activeWorkspace}
        setActiveWorkspace={setActiveWorkspace}
      />

      {/* Main Body Layout with Sidebar & Content */}
      <div className="flex-1 flex relative">
        {/* Sidebar */}
        <SaaSSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={isSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />

        {/* Main Content Area - Note mandatory padding bottom pb-32 / 120px clearance */}
        <main className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-8 py-6 pb-32 space-y-6">
          {/* Welcome & Live Stream Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 p-5 rounded-3xl border border-slate-800/90 shadow-2xl backdrop-blur-xl">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  SaaS Executive Command Dashboard
                </h1>
                <span className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-md shadow-indigo-500/20">
                  UI/UX PRO MAX
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real-time telemetry, subscription revenue forecasting, and customer health monitoring.
              </p>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center gap-3">
              {/* Real-time Streaming Switch */}
              <button
                onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all ${
                  isLiveStreaming
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isLiveStreaming ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                {isLiveStreaming ? 'Live Stream Active' : 'Stream Paused'}
              </button>

              <button className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all">
                <RefreshCw className="h-3.5 w-3.5 text-indigo-400" /> Refresh Data
              </button>
            </div>
          </div>

          {/* Conditional View Rendering based on Active Sidebar Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Executive KPI Cards */}
              <SaaSMetricCards />

              {/* Revenue Area Chart */}
              <SaaSRevenueChart />

              {/* Secondary Visualizers */}
              <SaaSAnalyticsWidgets />

              {/* Customer Table */}
              <SaaSCustomerTable onSelectCustomer={setSelectedCustomer} />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <SaaSRevenueChart />
              <SaaSAnalyticsWidgets />
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-6">
              <SaaSCustomerTable onSelectCustomer={setSelectedCustomer} />
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <SaaSBillingView />
            </div>
          )}

          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              <SaaSAuditLogView />
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
              <SaaSAuditLogView />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <SaaSBillingView />
            </div>
          )}
        </main>
      </div>

      {/* React Portals for Modals (Mounted to document.body) */}
      <SaaSUserDetailModal
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />

      <SaaSSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(tabId) => setActiveTab(tabId)}
      />
    </div>
  );
}
