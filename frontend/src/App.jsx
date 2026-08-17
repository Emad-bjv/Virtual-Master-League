import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainDashboard from './pages/MainDashboard';
import CoachLogin from './pages/CoachLogin';
import AdminLayout from './admin/AdminLayout';
import DashboardOverview from './admin/pages/DashboardOverview';
import UserManagement from './admin/pages/UserManagement';
import CoachOversight from './admin/pages/CoachOversight';
import FinancialControl from './admin/pages/FinancialControl';
import SystemSettings from './admin/pages/SystemSettings';
import AuditLogs from './admin/pages/AuditLogs';
import LiveBroadcastControl from './admin/pages/LiveBroadcastControl';
import DynamicCrud from './admin/pages/DynamicCrud';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CoachLogin />} />
        <Route path="/dashboard" element={<MainDashboard />} />
        <Route path="/coach-login" element={<CoachLogin />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardOverview />} />
          <Route path="live-control" element={<LiveBroadcastControl />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="coaches" element={<CoachOversight />} />
          <Route path="financial" element={<FinancialControl />} />
          <Route path="settings" element={<SystemSettings />} />
          <Route path="audit" element={<AuditLogs />} />
          <Route path="crud/:model" element={<DynamicCrud />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
