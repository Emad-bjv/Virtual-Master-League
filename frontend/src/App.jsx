import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';

// Core routes - lazy loaded for instant initial bundle delivery
const MainDashboard = lazy(() => import('./pages/MainDashboard'));
const CoachLogin = lazy(() => import('./pages/CoachLogin'));

// Admin layout & sub-pages - code-split independently
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const DashboardOverview = lazy(() => import('./admin/pages/DashboardOverview'));
const UserManagement = lazy(() => import('./admin/pages/UserManagement'));
const CoachOversight = lazy(() => import('./admin/pages/CoachOversight'));
const FinancialControl = lazy(() => import('./admin/pages/FinancialControl'));
const SystemSettings = lazy(() => import('./admin/pages/SystemSettings'));
const AuditLogs = lazy(() => import('./admin/pages/AuditLogs'));
const LiveBroadcastControl = lazy(() => import('./admin/pages/LiveBroadcastControl'));
const TransferNewsroom = lazy(() => import('./admin/pages/TransferNewsroom'));
const DynamicCrud = lazy(() => import('./admin/pages/DynamicCrud'));
const AdminPacks = lazy(() => import('./admin/pages/AdminPacks'));
const AdminSquadTransfers = lazy(() => import('./admin/pages/AdminSquadTransfers'));

// Sleek Neon Suspense Loading Fallback
const PageLoadingFallback = () => (
  <div className="fixed inset-0 bg-[#05080e] flex flex-col items-center justify-center z-[99999] select-none">
    <div className="relative flex items-center justify-center">
      <div className="w-16 h-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
      <div className="absolute w-10 h-10 rounded-full border-2 border-purple-500/20 border-b-purple-400 animate-spin animate-reverse" />
      <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#00f3ff] animate-pulse" />
    </div>
    <div className="mt-4 flex items-center gap-2">
      <span className="text-xs font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-sport uppercase">
        VML 2026
      </span>
      <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] animate-ping" />
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/" element={<CoachLogin />} />
          <Route path="/dashboard" element={<MainDashboard />} />
          <Route path="/coach-login" element={<CoachLogin />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="squad-transfers" element={<AdminSquadTransfers />} />
            <Route path="packs" element={<AdminPacks />} />
            <Route path="transfer-reports" element={<TransferNewsroom />} />
            <Route path="live-control" element={<LiveBroadcastControl />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="coaches" element={<CoachOversight />} />
            <Route path="financial" element={<FinancialControl />} />
            <Route path="settings" element={<SystemSettings />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="crud/:model" element={<DynamicCrud />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
