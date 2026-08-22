import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from './Modal';
import { useToast } from './Toast';

const PlayerManagementModal = ({ isOpen, onClose, team }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    age: 25,
    position: 'CMF',
    overall: 80,
    base_stamina: 85,
    virtual_stamina: 100,
    wage: 100,
  });

  const POSITIONS = [
    'GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF'
  ];

  useEffect(() => {
    if (isOpen && team) {
      fetchPlayers();
    }
  }, [isOpen, team]);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/players/`);
      // Since backend doesn't seem to natively support ?team=x filtering, filter here:
      let allPlayers = res.data.results || res.data;
      if (!Array.isArray(allPlayers)) allPlayers = [];
      const teamPlayers = allPlayers.filter(p => p.team === team.id);
      setPlayers(teamPlayers);
    } catch (err) {
      showToast('خطا در دریافت لیست بازیکنان', 'error');
    }
    setLoading(false);
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
      const payload = { ...formData, team: team.id };
      await api.post('/admin/players/', payload);
      showToast('بازیکن با موفقیت اضافه شد.', 'success');
      setIsAddMode(false);
      setFormData({
        name: '', age: 25, position: 'CMF', overall: 80, base_stamina: 85, virtual_stamina: 100, wage: 100
      });
      fetchPlayers();
    } catch (err) {
      showToast('خطا در افزودن بازیکن', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این بازیکن مطمئن هستید؟')) return;
    try {
      await api.delete(`/admin/players/${id}/`);
      showToast('بازیکن حذف شد.', 'success');
      fetchPlayers();
    } catch (err) {
      showToast('خطا در حذف بازیکن', 'error');
    }
  };

  if (!team) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`مدیریت بازیکنان: ${team.name}`}>
      {isAddMode ? (
        <form onSubmit={handleSubmit} style={{ minWidth: '400px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="admin-label">نام بازیکن</label>
              <input type="text" name="name" className="admin-input" value={formData.name} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="admin-label">پست</label>
              <select name="position" className="admin-input" value={formData.position} onChange={handleInputChange}>
                {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
              </select>
            </div>
            <div>
              <label className="admin-label">سن</label>
              <input type="number" name="age" className="admin-input" value={formData.age} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="admin-label">اورال (OVR)</label>
              <input type="number" name="overall" className="admin-input" value={formData.overall} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="admin-label">استقامت پایه (PES)</label>
              <input type="number" name="base_stamina" className="admin-input" value={formData.base_stamina} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="admin-label">استقامت مجازی (فعلی)</label>
              <input type="number" name="virtual_stamina" className="admin-input" value={formData.virtual_stamina} onChange={handleInputChange} required />
            </div>
          </div>
          <div className="modal-footer" style={{ paddingBottom: 0 }}>
            <button type="button" className="admin-btn secondary" onClick={() => setIsAddMode(false)}>انصراف</button>
            <button type="submit" className="admin-btn success">ذخیره بازیکن</button>
          </div>
        </form>
      ) : (
        <div style={{ minWidth: '500px' }}>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="admin-btn success" onClick={() => setIsAddMode(true)}>+ افزودن بازیکن جدید</button>
          </div>
          <div className="admin-table-container" style={{maxHeight: '300px', overflowY: 'auto'}}>
            <table className="admin-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>نام</th>
                  <th>پست</th>
                  <th>سن</th>
                  <th>OVR</th>
                  <th>استقامت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center' }}>در حال دریافت...</td></tr>
                ) : players.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '1rem' }}>هیچ بازیکنی برای این تیم ثبت نشده است.</td></tr>
                ) : (
                  players.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                      <td>{p.position}</td>
                      <td>{p.age}</td>
                      <td>{p.overall}</td>
                      <td>{p.virtual_stamina}%</td>
                      <td>
                        <button className="admin-btn danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDelete(p.id)}>حذف</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="modal-footer" style={{ paddingBottom: 0, marginTop: '1rem' }}>
            <button className="admin-btn secondary" onClick={onClose}>بستن</button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PlayerManagementModal;
