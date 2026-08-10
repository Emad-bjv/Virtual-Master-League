import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminPlayers = () => {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      const [playersRes, teamsRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/teams/players/', { headers }),
        axios.get('http://127.0.0.1:8000/api/teams/teams/', { headers })
      ]);
      setPlayers(playersRes.data);
      setTeams(teamsRes.data);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlayer = async () => {
    if (!editingPlayer) return;

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      await axios.post('http://127.0.0.1:8000/api/teams/teams/admin_update_player/', {
        player_id: editingPlayer.id,
        overall: editingPlayer.overall,
        virtual_stamina: editingPlayer.virtual_stamina,
        heal_injury: editingPlayer.heal_injury
      }, { headers });

      setEditingPlayer(null);
      fetchData();
      alert('مشخصات بازیکن بروزرسانی شد.');
    } catch (error) {
      console.error('Error updating player:', error);
      alert('خطا در تغییر مشخصات بازیکن.');
    }
  };

  const filteredPlayers = players.filter(p => {
    const matchesTeam = !selectedTeam || p.team === parseInt(selectedTeam);
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTeam && matchesSearch;
  });

  if (loading) return <div className="text-white">در حال بارگذاری بازیکنان...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">مدیریت بازیکنان</h1>

      {/* Info Guide Box */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-5 text-gray-200 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🏃</span>
          <h3 className="text-lg font-bold text-blue-300">راهنمای مدیریت بازیکنان</h3>
        </div>
        <p className="text-sm leading-relaxed text-gray-300">
          در این بخش می‌توانید قدرت کلی (OVR)، میزان استقامت و وضعیت مصدومیت بازیکنان تمام تیم‌ها را ویرایش و بازیابی کنید.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="bg-blue-950/80 text-blue-400 px-3 py-1 rounded-lg border border-blue-800/50">
            📊 اورال (OVR): نمره اصلی عملکرد و کیفیت بازیکن در ترکیب تیم.
          </span>
          <span className="bg-yellow-950/80 text-yellow-400 px-3 py-1 rounded-lg border border-yellow-800/50">
            ⚡ استقامت زیر ۳۰٪: بازیکن خسته شده و در صورت عدم استراحت در ترکیب مربی قفل می‌شود.
          </span>
          <span className="bg-red-950/80 text-red-400 px-3 py-1 rounded-lg border border-red-800/50">
            🩹 درمان مصدومیت: بازیکن مصدوم امکان حضور در زمین را ندارد تا زمانی که درمان شود.
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="جستجوی نام بازیکن..."
          className="bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-2.5 flex-1 focus:ring-2 focus:ring-blue-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select
          className="bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-2.5 md:w-64"
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
        >
          <option value="">همه تیم‌ها</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-right text-gray-300">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="px-6 py-4 font-medium">شناسه</th>
              <th className="px-6 py-4 font-medium">نام بازیکن</th>
              <th className="px-6 py-4 font-medium">پست</th>
              <th className="px-6 py-4 font-medium">اورال (OVR)</th>
              <th className="px-6 py-4 font-medium">استقامت (%)</th>
              <th className="px-6 py-4 font-medium">مصدومیت</th>
              <th className="px-6 py-4 font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredPlayers.slice(0, 50).map(player => (
              <tr key={player.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4">{player.id}</td>
                <td className="px-6 py-4 font-bold text-white">{player.name}</td>
                <td className="px-6 py-4"><span className="bg-gray-800 px-2 py-1 rounded text-xs text-blue-400">{player.position}</span></td>
                <td className="px-6 py-4 text-green-400 font-bold">{player.overall}</td>
                <td className="px-6 py-4">{player.virtual_stamina}%</td>
                <td className="px-6 py-4">
                  {player.is_injured ? (
                    <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-full">مصدوم</span>
                  ) : (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">سالم</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setEditingPlayer({ ...player, heal_injury: false })}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs transition-colors"
                  >
                    ویرایش
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Player Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">ویرایش بازیکن: {editingPlayer.name}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">اورال (OVR)</label>
                <input
                  type="number"
                  className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
                  value={editingPlayer.overall}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, overall: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">استقامت مجازی (0-100)</label>
                <input
                  type="number"
                  className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
                  value={editingPlayer.virtual_stamina}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, virtual_stamina: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="healInjuryToggle"
                  className="w-4 h-4 rounded bg-gray-800"
                  checked={editingPlayer.heal_injury}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, heal_injury: e.target.checked })}
                />
                <label htmlFor="healInjuryToggle" className="text-white text-sm cursor-pointer">
                  درمان فوری مصدومیت بازیکن
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={handleUpdatePlayer} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg">ذخیره تغییرات</button>
                <button onClick={() => setEditingPlayer(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg">انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPlayers;
