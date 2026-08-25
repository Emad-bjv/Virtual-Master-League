import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getTeamLogoUrl } from '../../utils/teamLogos';

const AdminTeams = () => {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      const [teamsRes, usersRes] = await Promise.all([
        axios.get('/api/teams/', { headers }),
        axios.get('/api/users/admin-list/', { headers })
      ]);
      setTeams(teamsRes.data);
      // Only coaches or admins
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
      await axios.put(`/api/teams/${teamId}/assign_coach/`, 
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

  const handleToggleActive = async (teamId) => {
    try {
      setTogglingId(teamId);
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      const res = await axios.post(`/api/teams/${teamId}/toggle_active/`, {}, { headers });
      setTeams(prev => prev.map(t => {
        if (t.id === teamId) {
          return { ...t, is_active: res.data.is_active };
        }
        return t;
      }));
    } catch (error) {
      console.error('Error toggling team active status:', error);
      alert('خطا در تغییر وضعیت فعال بودن تیم');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) return <div className="text-white p-6 font-medium">در حال بارگذاری...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">مدیریت تیم‌ها و اختصاص مربی</h1>
        <span className="text-sm font-semibold px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          تعداد کل تیم‌ها: {teams.length}
        </span>
      </div>

      {/* Info Guide Box */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-5 text-gray-200 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🛡️</span>
          <h3 className="text-lg font-bold text-blue-300">راهنمای مدیریت وضعیت تیم‌ها و مربیان</h3>
        </div>
        <p className="text-sm leading-relaxed text-gray-300">
          در این بخش می‌توانید وضعیت فعال/غیرفعال بودن هر تیم را مشخص کرده و مربیان را به تیم‌ها تخصیص دهید. تیم‌های غیرفعال در لیست ساخت لیگ خودکار شرکت نخواهند داشت.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-right text-gray-300">
          <thead className="bg-gray-800/80 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-6 py-4 font-semibold">شناسه</th>
              <th className="px-6 py-4 font-semibold">لوگو و نام تیم</th>
              <th className="px-6 py-4 font-semibold">تعداد بازیکنان</th>
              <th className="px-6 py-4 font-semibold">بودجه</th>
              <th className="px-6 py-4 font-semibold">وضعیت در لیگ</th>
              <th className="px-6 py-4 font-semibold">مربی (Manager)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {teams.map(team => (
              <tr key={team.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4 text-xs font-mono text-gray-500">#{team.id}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={getTeamLogoUrl(team.name)} 
                      alt={team.name} 
                      className="w-10 h-10 object-contain drop-shadow-md rounded-lg p-1 bg-black/40 border border-white/10" 
                    />
                    <div>
                      <div className="font-bold text-white text-base">{team.name}</div>
                      <div className="text-xs text-amber-400 flex items-center gap-1">
                        ⭐ {team.star_rating || '4.0'} | {team.default_formation || '4-3-3'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-700 text-gray-300">
                    {team.players ? team.players.length : (team.player_count || '-')} بازیکن
                  </span>
                </td>
                <td className="px-6 py-4 font-mono font-bold text-green-400">${Number(team.budget).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleActive(team.id)}
                    disabled={togglingId === team.id}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                      team.is_active !== false
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${team.is_active !== false ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    {team.is_active !== false ? 'فعال (حاضر)' : 'غیرفعال (تعلیق)'}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <select
                    className="bg-gray-800 text-white text-sm rounded-xl block w-full p-2.5 border border-gray-700 focus:border-cyan-500 focus:outline-none"
                    value={team.manager || ''}
                    onChange={(e) => handleAssignCoach(team.id, e.target.value)}
                  >
                    <option value="">بدون مربی</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.username} (شناسه: {user.id})
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
