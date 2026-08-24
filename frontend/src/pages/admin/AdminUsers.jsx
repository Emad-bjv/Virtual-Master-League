import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users/admin-list/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-white">در حال بارگذاری...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">مدیریت کاربران (مربیان)</h1>

      {/* Info Guide Box */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-5 text-gray-200 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">👥</span>
          <h3 className="text-lg font-bold text-blue-300">راهنمای کاربران و سطح دسترسی‌ها</h3>
        </div>
        <p className="text-sm leading-relaxed text-gray-300">
          در این جدول تمام کاربران با نام‌های کاربری و نقش‌های coach (مربی) یا admin (مدیر) نمایش داده شده‌اند.
        </p>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-right text-gray-300">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="px-6 py-4 font-medium">شناسه</th>
              <th className="px-6 py-4 font-medium">نام کاربری (Username)</th>
              <th className="px-6 py-4 font-medium">نقش</th>
              <th className="px-6 py-4 font-medium">تاریخ عضویت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4">{user.id}</td>
                <td className="px-6 py-4 font-bold text-white dir-ltr text-right">{user.username}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(user.date_joined).toLocaleDateString('fa-IR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
