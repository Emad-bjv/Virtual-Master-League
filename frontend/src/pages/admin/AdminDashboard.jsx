import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminDatabase from './AdminDatabase';

const AdminDashboard = () => {
  return (
    <div className="space-y-4 dir-rtl">
      {/* Embedded Full Database Explorer & Manager */}
      <AdminDatabase />
    </div>
  );
};

export default AdminDashboard;
