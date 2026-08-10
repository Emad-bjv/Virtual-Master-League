import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainDashboard from './pages/MainDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTeams from './pages/admin/AdminTeams';
import AdminSettings from './pages/admin/AdminSettings';
import AdminMatches from './pages/admin/AdminMatches';
import AdminPlayers from './pages/admin/AdminPlayers';
import AdminFacilitiesBudget from './pages/admin/AdminFacilitiesBudget';
import AdminLiveStream from './pages/admin/AdminLiveStream';
import AdminDatabase from './pages/admin/AdminDatabase';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainDashboard />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="matches" element={<AdminMatches />} />
          <Route path="players" element={<AdminPlayers />} />
          <Route path="teams" element={<AdminTeams />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="facilities-budget" element={<AdminFacilitiesBudget />} />
          <Route path="livestream" element={<AdminLiveStream />} />
          <Route path="database" element={<AdminDatabase />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
