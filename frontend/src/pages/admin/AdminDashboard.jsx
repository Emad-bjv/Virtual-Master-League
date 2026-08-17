import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminDatabase from './AdminDatabase';
import TransferActivityFeed from './TransferActivityFeed';

const AdminDashboard = () => {
  return (
    <div className="space-y-4 dir-rtl">
      <TransferActivityFeed />
      {/* Embedded Full Database Explorer & Manager */}
      <AdminDatabase />
    </div>
  );
};

export default AdminDashboard;
