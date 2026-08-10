import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminTeams = () => {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      const [teamsRes, usersRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/teams/teams/', { headers }),
        axios.get('http://127.0.0.1:8000/api/users/admin-list/', { headers })
      ]);
      setTeams(teamsRes.data);
      // Only coaches
      setUsers(usersRes.data.filter(u => u.role === 'coach' || u.role === 'admin'));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCoach = async (teamId, managerId) => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      await axios.put(`http://127.0.0.1:8000/api/teams/teams/${teamId}/assign_coach/`, 
        { manager_id: managerId === '' ? null : managerId }, 
        { headers }
      );
      // Optimistic update
      setTeams(prev => prev.map(t => {
        if (t.id === teamId) {
          return { ...t, manager: managerId === '' ? null : managerId };
        }
        return t;
      }));
      alert('مربی با موفقیت تخصیص یافت');
    } catch (error) {
      console.error('Error assigning coach:', error);
      alert(error.response?.data?.error || 'خطا در تخصیص مربی');
    }
  };

  if (loading) return <div className="text-white">در حال بارگذاری...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">مدیریت تیم‌ها و اختصاص مربی</h1>

      {/* Info Guide Box */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-5 text-gray-200 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🛡️</span>
          <h3 className="text-lg font-bold text-blue-300">راهنمای تخصیص مربی به تیم</h3>
        </div>
        <p className="text-sm leading-relaxed text-gray-300">
          در این بخش می‌توانید هر کاربر ثبت‌نام‌شده در سیستم را به عنوان «مربی» یک تیم انتخاب و متصل کنید. پس از انتخاب، آن تیم به داشبورد و پروفایل کاربر متصل می‌شود و امکان چیدن ترکیب را برای او فراهم می‌سازد.
        </p>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-right text-gray-300">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="px-6 py-4 font-medium">شناسه</th>
              <th className="px-6 py-4 font-medium">نام تیم</th>
              <th className="px-6 py-4 font-medium">بودجه</th>
              <th className="px-6 py-4 font-medium">مربی (Manager)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {teams.map(team => (
              <tr key={team.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4">{team.id}</td>
                <td className="px-6 py-4 font-bold text-white">{team.name}</td>
                <td className="px-6 py-4 text-green-400">${Number(team.budget).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <select
                    className="bg-gray-800 text-white text-sm rounded-lg block w-full p-2.5 border border-gray-700"
                    value={team.manager || ''}
                    onChange={(e) => handleAssignCoach(team.id, e.target.value)}
                  >
                    <option value="">بدون مربی</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.phone_number} (ID: {user.id})
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTeams;
