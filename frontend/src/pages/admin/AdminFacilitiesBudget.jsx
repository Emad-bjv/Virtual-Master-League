import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminFacilitiesBudget = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms state
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [budgetDelta, setBudgetDelta] = useState(0);

  const [facilityTeamId, setFacilityTeamId] = useState('');
  const [facilityName, setFacilityName] = useState('training_camp');
  const [facilityLevel, setFacilityLevel] = useState(1);

  const [newCoachForm, setNewCoachForm] = useState({
    club_name: '',
    username: '',
    budget: 850000000,
    wage_cap: 10000
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      const res = await axios.get('http://127.0.0.1:8000/api/teams/', { headers });
      setTeams(res.data);
      if (res.data.length > 0) {
        setSelectedTeamId(res.data[0].id);
        setFacilityTeamId(res.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustBudget = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      await axios.post('http://127.0.0.1:8000/api/teams/admin_adjust_budget/', {
        team_id: selectedTeamId,
        amount: budgetDelta
      }, { headers });
      alert('بودجه تیم با موفقیت تغییر کرد.');
      fetchTeams();
    } catch (error) {
      console.error('Error adjusting budget:', error);
      alert('خطا در تغییر بودجه.');
    }
  };

  const handleOverrideFacility = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      await axios.post('http://127.0.0.1:8000/api/teams/admin_override_facility/', {
        team_id: facilityTeamId,
        facility: facilityName,
        level: facilityLevel
      }, { headers });
      alert('سطح تسهیلات با موفقیت به‌روزرسانی شد.');
    } catch (error) {
      console.error('Error overriding facility:', error);
      alert('خطا در اورراید تسهیلات.');
    }
  };

  const handleRegisterCoach = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      await axios.post('http://127.0.0.1:8000/api/teams/admin_register_coach/', newCoachForm, { headers });
      alert('تیم و مربی جدید ثبت شد.');
      setNewCoachForm({ club_name: '', username: '', budget: 850000000, wage_cap: 10000 });
      fetchTeams();
    } catch (error) {
      console.error('Error registering coach:', error);
      alert(error.response?.data?.error || 'خطا در ثبت مربی.');
    }
  };

  if (loading) return <div className="text-white">در حال بارگذاری...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">مدیریت بودجه، تسهیلات و ساخت باشگاه</h1>

      {/* Info Guide Box */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-5 text-gray-200 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🏛️</span>
          <h3 className="text-lg font-bold text-blue-300">راهنمای بودجه و تسهیلات باشگاه‌ها</h3>
        </div>
        <p className="text-sm leading-relaxed text-gray-300">
          تسهیلات باشگاه شامل کمپ تمرینی، بدنسازی، مرکز پزشکی، استادیوم، آکادمی جوانان و استخر بازیابی می‌باشد. هر سطح از ۱ تا ۲۰ به صورت منحنی غیرخطی (Curve) روی ریکاوری خستگی بازیکنان، درآمد بلیت‌فروشی استادیوم و خروجی بازیکنان آکادمی تأثیر می‌گذارد.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Adjust Budget Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">تغییر بودجه تیم</h2>
          <form onSubmit={handleAdjustBudget} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">انتخاب تیم</label>
              <select
                className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
              >
                {teams.map(t => <option key={t.id} value={t.id}>{t.name} (بودجه فعلی: ${Number(t.budget).toLocaleString()})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">مقدار تغییر (دلار مثبت یا منفی)</label>
              <input
                type="number"
                className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
                value={budgetDelta}
                onChange={(e) => setBudgetDelta(e.target.value)}
              />
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors">
              اعمال تغییر بودجه
            </button>
          </form>
        </div>

        {/* Override Facilities Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">تنظیم دستی سطح تسهیلات</h2>
          <form onSubmit={handleOverrideFacility} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">انتخاب تیم</label>
              <select
                className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
                value={facilityTeamId}
                onChange={(e) => setFacilityTeamId(e.target.value)}
              >
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">نوع تسهیلات</label>
              <select
                className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
              >
                <option value="training_camp">کمپ تمرینی (training_camp)</option>
                <option value="gym">سالن بدنسازی (gym)</option>
                <option value="medical">مرکز پزشکی (medical)</option>
                <option value="stadium">استادیوم (stadium)</option>
                <option value="academy">آکادمی (academy)</option>
                <option value="pool">استخر (pool)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">سطح جدید (۱ تا ۲۰)</label>
              <input
                type="number"
                min="1"
                max="20"
                className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
                value={facilityLevel}
                onChange={(e) => setFacilityLevel(e.target.value)}
              />
            </div>

            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-lg transition-colors">
              اعمال سطح تسهیلات
            </button>
          </form>
        </div>

      </div>

      {/* Register Coach Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">ثبت تیم و مربی جدید</h2>
        <form onSubmit={handleRegisterCoach} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">نام باشگاه</label>
            <input
              type="text"
              required
              className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
              value={newCoachForm.club_name}
              onChange={(e) => setNewCoachForm({ ...newCoachForm, club_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">نام کاربری مربی (اختیاری)</label>
            <input
              type="text"
              placeholder="coach_arsenal"
              className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
              value={newCoachForm.username}
              onChange={(e) => setNewCoachForm({ ...newCoachForm, username: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">بودجه اولیه</label>
            <input
              type="number"
              className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
              value={newCoachForm.budget}
              onChange={(e) => setNewCoachForm({ ...newCoachForm, budget: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">سقف دستمزد</label>
            <input
              type="number"
              className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700"
              value={newCoachForm.wage_cap}
              onChange={(e) => setNewCoachForm({ ...newCoachForm, wage_cap: e.target.value })}
            />
          </div>

          <div className="md:col-span-2 pt-2">
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg transition-colors">
              ثبت باشگاه و مربی جدید
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminFacilitiesBudget;
