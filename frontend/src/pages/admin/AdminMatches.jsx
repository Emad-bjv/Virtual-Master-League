import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminMatches = () => {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newMatch, setNewMatch] = useState({
    home_team_id: '',
    away_team_id: '',
    round_name: 'هفته ۱',
    date: ''
  });

  const [editingMatch, setEditingMatch] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      const url = filter ? `http://127.0.0.1:8000/api/matches/admin-list/?status=${filter}` : 'http://127.0.0.1:8000/api/matches/admin-list/';
      const [matchesRes, teamsRes] = await Promise.all([
        axios.get(url, { headers }),
        axios.get('http://127.0.0.1:8000/api/teams/', { headers })
      ]);
      setMatches(matchesRes.data);
      setTeams(teamsRes.data);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (!newMatch.home_team_id || !newMatch.away_team_id) {
      alert('لطفاً هر دو تیم را انتخاب کنید.');
      return;
    }
    if (newMatch.home_team_id === newMatch.away_team_id) {
      alert('تیم میزبان و میهمان نمی‌توانند یکسان باشند.');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      await axios.post('http://127.0.0.1:8000/api/matches/admin-create/', newMatch, { headers });
      setShowCreateModal(false);
      setNewMatch({ home_team_id: '', away_team_id: '', round_name: 'هفته ۱', date: '' });
      fetchData();
      alert('مسابقه جدید با موفقیت برنامه‌ریزی شد.');
    } catch (error) {
      console.error('Error creating match:', error);
      alert('خطا در ایجاد مسابقه.');
    }
  };

  const handleUpdateMatch = async (matchId) => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      await axios.put(`http://127.0.0.1:8000/api/matches/${matchId}/admin-update/`, editingMatch, { headers });
      setEditingMatch(null);
      fetchData();
      alert('اطلاعات مسابقه ویرایش شد.');
    } catch (error) {
      console.error('Error updating match:', error);
      alert('خطا در بروزرسانی مسابقه.');
    }
  };

  if (loading) return <div className="text-white">در حال بارگذاری مسابقات...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">مدیریت مسابقات و نتایج</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl transition-colors"
        >
          + ایجاد مسابقه جدید
        </button>
      </div>

      {/* Info Guide Box */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-5 text-gray-200 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">⚽</span>
          <h3 className="text-lg font-bold text-blue-300">راهنمای مدیریت مسابقات و نتایج</h3>
        </div>
        <p className="text-sm leading-relaxed text-gray-300">
          در این بخش می‌توانید مسابقات جدید برنامه‌ریزی کنید، نتیجه گل‌های میزبان/میهمان را ویرایش نمایید و وضعیت بازی را تغییر دهید.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="bg-blue-950/80 text-blue-400 px-3 py-1 rounded-lg border border-blue-800/50">
            📌 برنامه‌ریزی شده (SCHEDULED): مسابقه در تقویم هفته مربیان نمایش داده می‌شود.
          </span>
          <span className="bg-red-950/80 text-red-400 px-3 py-1 rounded-lg border border-red-800/50">
            🔥 در حال برگزاری (LIVE): علامت LIVE روی مسابقه در داشبورد مربیان فعال می‌شود.
          </span>
          <span className="bg-green-950/80 text-green-400 px-3 py-1 rounded-lg border border-green-800/50">
            ✅ پایان یافته (FINISHED): نتیجه نهایی ثبت شده و در جدول لیگ محاسبه می‌شود.
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-800 pb-3">
        {[
          { label: 'همه بازی‌ها', value: '' },
          { label: 'برنامه‌ریزی شده', value: 'SCHEDULED' },
          { label: 'در حال برگزاری (LIVE)', value: 'LIVE' },
          { label: 'پایان یافته', value: 'FINISHED' }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === tab.value ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {matches.map(match => (
          <div key={match.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* Match info */}
            <div className="flex items-center gap-4 flex-1">
              <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-full">{match.round_name}</span>
              
              <div className="flex items-center gap-3 font-bold text-lg">
                <span className="text-white">{match.home_team_name || match.home_team?.name || 'میزبان'}</span>
                <span className="text-blue-400 bg-gray-950 px-3 py-1 rounded-lg border border-gray-800">
                  {match.home_score} - {match.away_score}
                </span>
                <span className="text-white">{match.away_team_name || match.away_team?.name || 'میهمان'}</span>
              </div>
            </div>

            {/* Status badge & Actions */}
            <div className="flex items-center gap-3">
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                match.status === 'LIVE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                match.status === 'FINISHED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {match.status === 'LIVE' ? 'در حال برگزاری' : match.status === 'FINISHED' ? 'پایان یافته' : 'برنامه‌ریزی شده'}
              </span>

              <button
                onClick={() => setEditingMatch(match)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                ویرایش نتیجه
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">تعریف مسابقه جدید</h2>
            
            <form onSubmit={handleCreateMatch} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">تیم میزبان</label>
                <select
                  className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
                  value={newMatch.home_team_id}
                  onChange={(e) => setNewMatch({ ...newMatch, home_team_id: e.target.value })}
                >
                  <option value="">انتخاب تیم</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">تیم میهمان</label>
                <select
                  className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
                  value={newMatch.away_team_id}
                  onChange={(e) => setNewMatch({ ...newMatch, away_team_id: e.target.value })}
                >
                  <option value="">انتخاب تیم</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">مرحله / هفته</label>
                <input
                  type="text"
                  className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
                  value={newMatch.round_name}
                  onChange={(e) => setNewMatch({ ...newMatch, round_name: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg">ثبت مسابقه</button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Match Modal */}
      {editingMatch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">ویرایش مسابقه</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">گل‌های میزبان</label>
                  <input
                    type="number"
                    className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
                    value={editingMatch.home_score}
                    onChange={(e) => setEditingMatch({ ...editingMatch, home_score: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">گل‌های میهمان</label>
                  <input
                    type="number"
                    className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
                    value={editingMatch.away_score}
                    onChange={(e) => setEditingMatch({ ...editingMatch, away_score: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">وضعیت مسابقه</label>
                <select
                  className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
                  value={editingMatch.status}
                  onChange={(e) => setEditingMatch({ ...editingMatch, status: e.target.value })}
                >
                  <option value="SCHEDULED">برنامه‌ریزی شده (SCHEDULED)</option>
                  <option value="LIVE">در حال برگزاری (LIVE)</option>
                  <option value="FINISHED">پایان یافته (FINISHED)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => handleUpdateMatch(editingMatch.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg">ذخیره تغییرات</button>
                <button onClick={() => setEditingMatch(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg">انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMatches;
