import React, { useState, useEffect } from 'react';
import GamePlanPitch from '../components/GamePlanPitch';
import { Settings, Save, Users, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { teamApi } from '../services/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const teamId = user?.team_id; 

  useEffect(() => {
    if (!teamId) {
      setTeam(null);
      setPlayers([]);
      setLoading(false);
      return;
    }
    teamApi.getTeam(teamId)
      .then(res => {
        setTeam(res.data);
        setPlayers(res.data?.players || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load team data:", err);
        setTeam(null);
        setPlayers([]);
        setLoading(false);
      });
  }, [teamId]);

  const handlePlayerMove = (playerId, deltaX, deltaY) => {
    // Convert pixel delta to percentage delta
    const pitchWidth = document.querySelector('.absolute.inset-0').offsetWidth;
    const pitchHeight = document.querySelector('.absolute.inset-0').offsetHeight;
    
    const percentX = (deltaX / pitchWidth) * 100;
    const percentY = (deltaY / pitchHeight) * 100;

    setPlayers(currentPlayers => 
      currentPlayers.map(p => {
        if (p.id.toString() === playerId) {
          return {
            ...p,
            x_coord: Math.max(0, Math.min(100, p.x_coord + percentX)),
            y_coord: Math.max(0, Math.min(100, p.y_coord + percentY))
          };
        }
        return p;
      })
    );
  };

  const saveGamePlan = async () => {
    if (!teamId) return;
    try {
      await teamApi.updateGameplan(teamId, players);
      alert('ترکیب با موفقیت ذخیره شد.');
    } catch (error) {
      alert('خطا در ذخیره ترکیب تیمی.');
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-white">در حال بارگذاری...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8">
      <header className="flex justify-between items-center mb-8 bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-accent">{team?.name || 'تیم من'}</h1>
          <p className="text-sm text-slate-400 mt-1">بودجه: {team?.budget || 0} دلار مجازی</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors">
            <Trophy size={18} /> جدول رده‌بندی
          </button>
          <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors">
            <Users size={18} /> نقل و انتقالات
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Tactics Menu */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Settings className="text-accent" /> تاکتیک‌های تیمی
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">سبک حمله (Attacking Style)</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-accent">
                  <option>Possession Game</option>
                  <option>Counter Attack</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">بازیسازی (Build Up)</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-accent">
                  <option>Short Pass</option>
                  <option>Long Pass</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">منطقه حمله (Attacking Area)</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-accent">
                  <option>Center</option>
                  <option>Wide</option>
                </select>
              </div>
            </div>

            <button 
              onClick={saveGamePlan}
              className="w-full mt-8 flex justify-center items-center gap-2 bg-accent hover:bg-accent/80 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              <Save size={20} /> ذخیره تغییرات
            </button>
          </div>
        </div>

        {/* Right Column: Game Plan Pitch */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-full flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-center">ترکیب تیم (Game Plan)</h2>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-2xl">
                 <GamePlanPitch players={players} onPlayerMove={handlePlayerMove} />
              </div>
            </div>
            <p className="text-center text-sm text-slate-400 mt-4">
              بازیکنان را بگیرید و در زمین جابجا کنید. مختصات به صورت زنده آپدیت می‌شود.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
