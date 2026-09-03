import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from './Modal';
import { useToast } from './Toast';

const POSITIONS = [
  'GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF'
];

const INITIAL_FORM = {
  name: '',
  position: 'CF',
  age: 24,
  overall: 80,
  potential_ovr: 90,
  level: 1,
  base_stamina: 80,
  virtual_stamina: 100,
  wage: 100,
  market_value: 1000000,
  shirt_number: '',
  is_starting: false,
  is_injured: false,
  injury_matches: 0,
  suspension_matches: 0,
  yellow_card_accumulator: 0
};

const PlayerManagementModal = ({ isOpen, onClose, team }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && team) {
      setIsAddMode(false);
      setEditingPlayer(null);
      setSearchQuery('');
      fetchPlayers();
    }
  }, [isOpen, team]);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/players/?team=${team.id}`);
      let allPlayers = res.data.results || res.data;
      if (!Array.isArray(allPlayers)) allPlayers = [];
      // Secondary client-side fallback filter
      const teamPlayers = allPlayers.filter(p => p.team === team.id || !p.team);
      setPlayers(teamPlayers);
    } catch (err) {
      showToast('خطا در دریافت لیست بازیکنان', 'error');
    }
    setLoading(false);
  };

  const handleOpenAdd = () => {
    setEditingPlayer(null);
    setFormData(INITIAL_FORM);
    setIsAddMode(true);
  };

  const handleOpenEdit = (player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name || '',
      position: player.position || 'CF',
      age: player.age || 24,
      overall: player.overall || 80,
      potential_ovr: player.potential_ovr || 90,
      level: player.level || 1,
      base_stamina: player.base_stamina || 80,
      virtual_stamina: player.virtual_stamina || 100,
      wage: player.wage || 100,
      market_value: player.market_value || 1000000,
      shirt_number: player.shirt_number || '',
      is_starting: Boolean(player.is_starting),
      is_injured: Boolean(player.is_injured),
      injury_matches: player.injury_matches || (player.is_injured ? 2 : 0),
      suspension_matches: player.suspension_matches || 0,
      yellow_card_accumulator: player.yellow_card_accumulator || 0
    });
    setIsAddMode(true);
  };

  const handleCancelForm = () => {
    setIsAddMode(false);
    setEditingPlayer(null);
    setFormData(INITIAL_FORM);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        age: parseInt(formData.age) || 20,
        overall: parseInt(formData.overall) || 75,
        potential_ovr: parseInt(formData.potential_ovr) || 85,
        level: parseInt(formData.level) || 1,
        base_stamina: parseInt(formData.base_stamina) || 75,
        virtual_stamina: 100.0,
        injury_matches: parseInt(formData.injury_matches) || (formData.is_injured ? 2 : 0),
        is_injured: Boolean(formData.is_injured || (parseInt(formData.injury_matches) > 0)),
        wage: parseFloat(formData.wage) || 100.0,
        market_value: parseFloat(formData.market_value) || 1000000.0,
        shirt_number: formData.shirt_number ? parseInt(formData.shirt_number) : null,
        suspension_matches: parseInt(formData.suspension_matches) || 0,
        yellow_card_accumulator: parseInt(formData.yellow_card_accumulator) || 0,
        team: team.id
      };

      if (editingPlayer) {
        await api.patch(`/admin/players/${editingPlayer.id}/`, payload);
        showToast(`اطلاعات بازیکن «${formData.name}» با موفقیت ویرایش شد.`, 'success');
      } else {
        await api.post('/admin/players/', payload);
        showToast(`بازیکن جدید «${formData.name}» به تیم اضافه شد.`, 'success');
      }

      handleCancelForm();
      fetchPlayers();
    } catch (err) {
      showToast(editingPlayer ? 'خطا در ویرایش اطلاعات بازیکن' : 'خطا در افزودن بازیکن', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`آیا از حذف بازیکن «${name}» مطمئن هستید؟`)) return;
    try {
      await api.delete(`/admin/players/${id}/`);
      showToast(`بازیکن «${name}» با موفقیت حذف شد.`, 'success');
      fetchPlayers();
    } catch (err) {
      showToast('خطا در حذف بازیکن', 'error');
    }
  };

  if (!team) return null;

  const filteredPlayers = (players || []).filter(p =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.position || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPositionBadgeClass = (pos) => {
    if (['CF', 'ST', 'SS', 'LWF', 'RWF'].includes(pos)) return 'bg-rose-950 text-rose-300 border-rose-600/40';
    if (['AMF', 'CMF', 'DMF', 'LMF', 'RMF'].includes(pos)) return 'bg-emerald-950 text-emerald-300 border-emerald-600/40';
    if (['CB', 'LB', 'RB'].includes(pos)) return 'bg-blue-950 text-blue-300 border-blue-600/40';
    if (pos === 'GK') return 'bg-amber-950 text-amber-300 border-amber-600/40';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`مدیریت بازیکنان: ${team.name} (${players.length} بازیکن)`}>
      {isAddMode ? (
        <form onSubmit={handleSubmit} className="space-y-4" style={{ minWidth: '550px' }}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="font-bold text-white text-sm">
              {editingPlayer ? `ویرایش اطلاعات بازیکن: ${editingPlayer.name}` : 'افزودن بازیکن جدید به تیم'}
            </h4>
            <span className="text-xs text-amber-400 font-bold">تیم: {team.name}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="admin-label">نام بازیکن:</label>
              <input
                type="text"
                name="name"
                className="admin-input"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="مثال: Kylian Mbappé"
              />
            </div>

            <div>
              <label className="admin-label">پست اصلی:</label>
              <select
                name="position"
                className="admin-input font-bold"
                value={formData.position}
                onChange={handleInputChange}
              >
                {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
              </select>
            </div>

            <div>
              <label className="admin-label">اورال (OVR):</label>
              <input
                type="number"
                name="overall"
                min="40"
                max="99"
                className="admin-input font-bold text-amber-300"
                value={formData.overall}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label className="admin-label">سقف پتانسیل (POT):</label>
              <input
                type="number"
                name="potential_ovr"
                min="50"
                max="99"
                className="admin-input text-yellow-300"
                value={formData.potential_ovr}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label className="admin-label">لول بازیکن (۱ تا ۲۰):</label>
              <input
                type="number"
                name="level"
                min="1"
                max="20"
                className="admin-input"
                value={formData.level}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label className="admin-label">سن:</label>
              <input
                type="number"
                name="age"
                min="15"
                max="45"
                className="admin-input"
                value={formData.age}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label className="admin-label">استقامت پایه (PES 0-99):</label>
              <input
                type="number"
                name="base_stamina"
                min="1"
                max="99"
                className="admin-input text-emerald-300"
                value={formData.base_stamina}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label className="admin-label">بازی‌های غیبت مصدومیت:</label>
              <input
                type="number"
                name="injury_matches"
                min="0"
                max="10"
                className="admin-input text-rose-300"
                value={formData.injury_matches || 0}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="admin-label">شماره پیراهن:</label>
              <input
                type="number"
                name="shirt_number"
                min="1"
                max="99"
                className="admin-input"
                value={formData.shirt_number}
                onChange={handleInputChange}
                placeholder="اختیاری"
              />
            </div>

            <div>
              <label className="admin-label">دستمزد ($):</label>
              <input
                type="number"
                name="wage"
                min="0"
                className="admin-input"
                value={formData.wage}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="admin-label">ارزش بازار ($):</label>
              <input
                type="number"
                name="market_value"
                min="0"
                className="admin-input"
                value={formData.market_value}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="admin-label">جلسات محرومیت:</label>
              <input
                type="number"
                name="suspension_matches"
                min="0"
                className="admin-input text-rose-300"
                value={formData.suspension_matches}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="admin-label">کارت‌های زرد تجمیعی:</label>
              <input
                type="number"
                name="yellow_card_accumulator"
                min="0"
                className="admin-input text-amber-300"
                value={formData.yellow_card_accumulator}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', padding: '0.5rem 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                name="is_starting"
                checked={formData.is_starting}
                onChange={handleInputChange}
              />
              <span className="text-white font-bold">فیکس در ترکیب اصلی (Starting XI)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                name="is_injured"
                checked={formData.is_injured}
                onChange={handleInputChange}
              />
              <span className="text-rose-400 font-bold">مصدوم است</span>
            </label>
          </div>

          <div className="modal-footer" style={{ paddingBottom: 0, marginTop: '1rem' }}>
            <button type="button" className="admin-btn secondary" onClick={handleCancelForm}>انصراف</button>
            <button type="submit" className="admin-btn success">
              {editingPlayer ? 'ذخیره تغییرات بازیکن' : 'ایجاد و ذخیره بازیکن'}
            </button>
          </div>
        </form>
      ) : (
        <div style={{ minWidth: '650px' }}>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <input
              type="text"
              className="admin-input"
              style={{ maxWidth: '240px', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              placeholder="جستجوی بازیکن یا پست..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="admin-btn success" onClick={handleOpenAdd}>+ افزودن بازیکن جدید</button>
          </div>

          <div className="admin-table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table className="admin-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>شماره</th>
                  <th>نام بازیکن</th>
                  <th>پست</th>
                  <th>سن</th>
                  <th>OVR</th>
                  <th>لول</th>
                  <th>غیبت مصدومیت</th>
                  <th>وضعیت</th>
                  <th style={{ textAlign: 'center' }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '1.5rem' }}>در حال بارگذاری لیست بازیکنان...</td></tr>
                ) : filteredPlayers.length === 0 ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--admin-text-muted)' }}>
                    {searchQuery ? 'بازیکنی با این جستجو یافت نشد.' : 'هیچ بازیکنی برای این تیم ثبت نشده است.'}
                  </td></tr>
                ) : (
                  filteredPlayers.map(p => (
                    <tr key={p.id}>
                      <td style={{ textAlign: 'center', color: '#94a3b8' }}>#{p.shirt_number || '-'}</td>
                      <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getPositionBadgeClass(p.position)}`}>
                          {p.position}
                        </span>
                      </td>
                      <td>{p.age}</td>
                      <td style={{ fontWeight: 'bold', color: '#f59e0b' }}>{p.overall}</td>
                      <td style={{ color: '#38bdf8' }}>L{p.level || 1}</td>
                      <td>
                        <span style={{
                          fontWeight: 'bold',
                          color: (p.injury_matches > 0 || p.is_injured) ? '#f43f5e' : '#10b981'
                        }}>
                          {p.injury_matches > 0 ? `${p.injury_matches} بازی` : p.is_injured ? '۲ بازی' : 'آماده'}
                        </span>
                      </td>
                      <td>
                        {p.is_injured ? (
                          <span style={{ color: '#f43f5e', fontSize: '0.75rem', fontWeight: 'bold' }}>مصدوم</span>
                        ) : p.suspension_matches > 0 ? (
                          <span style={{ color: '#fb7185', fontSize: '0.75rem', fontWeight: 'bold' }}>محروم ({p.suspension_matches})</span>
                        ) : p.is_starting ? (
                          <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold' }}>فیکس</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>ذخیره</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          <button
                            className="admin-btn"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#eab308', color: '#0f172a', fontWeight: 'bold' }}
                            onClick={() => handleOpenEdit(p)}
                          >
                            ویرایش
                          </button>
                          <button
                            className="admin-btn danger"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => handleDelete(p.id, p.name)}
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="modal-footer" style={{ paddingBottom: 0, marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              مجموع بازیکنان: <strong style={{ color: '#fff' }}>{players.length}</strong> نفر
            </span>
            <button className="admin-btn secondary" onClick={onClose}>بستن</button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PlayerManagementModal;
