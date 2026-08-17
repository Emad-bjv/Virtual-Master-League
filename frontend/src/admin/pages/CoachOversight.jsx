import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Tooltip from '../components/Tooltip';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import PlayerManagementModal from '../components/PlayerManagementModal';
import { getTeamLogoUrl } from '../../utils/teamLogos';

const CoachOversight = () => {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  
  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);

  // Form states
  const [teamForm, setTeamForm] = useState({ name: '', logo: '', budget: '', wage_cap: '10000', gems: '0', manager: '' });
  
  const { showToast } = useToast();

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, []);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/teams/');
      setTeams(res.data.results || res.data);
    } catch (err) {
      showToast('خطا در دریافت لیست تیم‌ها', 'error');
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users/');
      const allUsers = res.data.results || res.data;
      // We could filter only role === 'COACH', but let's allow all for flexibility or filter if needed.
      setUsers(allUsers);
    } catch (err) {
      showToast('خطا در دریافت لیست کاربران', 'error');
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...teamForm };
      if (!payload.manager) delete payload.manager;
      await api.post('/admin/teams/', payload);
      showToast('تیم با موفقیت ایجاد شد', 'success');
      setIsCreateModalOpen(false);
      setTeamForm({ name: '', logo: '', budget: '', wage_cap: '10000', gems: '0', manager: '' });
      fetchTeams();
    } catch (err) {
      showToast('خطا در ایجاد تیم', 'error');
    }
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    if (!selectedTeam) return;
    try {
      const payload = { ...teamForm };
      if (!payload.manager) delete payload.manager;
      else payload.manager = parseInt(payload.manager);

      await api.patch(`/admin/teams/${selectedTeam.id}/`, payload);
      showToast(`تیم ${selectedTeam.name} با موفقیت بروزرسانی شد`, 'success');
      setIsEditModalOpen(false);
      fetchTeams();
    } catch (err) {
      showToast('خطا در بروزرسانی تیم', 'error');
    }
  };

  const handleDeleteTeam = async (id, name) => {
    if (!window.confirm(`آیا از حذف تیم ${name} مطمئن هستید؟ تمام داده‌های آن حذف خواهد شد.`)) return;
    try {
      await api.delete(`/admin/teams/${id}/`);
      showToast(`تیم ${name} حذف شد`, 'success');
      fetchTeams();
    } catch (err) {
      showToast('خطا در حذف تیم', 'error');
    }
  };

  const openEditModal = (team) => {
    setSelectedTeam(team);
    setTeamForm({
      name: team.name || '',
      logo: team.logo || '',
      budget: team.budget || '0',
      wage_cap: team.wage_cap || '10000',
      gems: team.gems || '0',
      manager: team.manager || ''
    });
    setIsEditModalOpen(true);
  };

  const openPlayerModal = (team) => {
    setSelectedTeam(team);
    setIsPlayerModalOpen(true);
  };

  const getManagerUsername = (managerId) => {
    if (!managerId) return 'تخصیص نیافته';
    const user = users.find(u => u.id === managerId);
    return user ? (user.username || user.first_name || `کاربر #${managerId}`) : managerId;
  };

  const handleInputChange = (e) => {
    setTeamForm({ ...teamForm, [e.target.name]: e.target.value });
  };

  return (
    <div style={{fontFamily: 'Vazirmatn, Tahoma, sans-serif'}}>
      <header className="admin-header">
        <h1>مدیریت تیم‌ها و مربیان</h1>
        <div style={{display: 'flex', gap: '0.5rem'}}>
          <button className="admin-btn success" onClick={() => {
            setTeamForm({ name: '', logo: '', budget: '', wage_cap: '10000', gems: '0', manager: '' });
            setIsCreateModalOpen(true);
          }}>+ تیم جدید</button>
          <button className="admin-btn secondary" onClick={fetchTeams}>بروزرسانی لیست</button>
        </div>
      </header>
      
      <div className="glass-panel" style={{marginTop: '2rem', padding: '1.5rem'}}>
        <div style={{marginBottom: '1rem'}}>
          <Tooltip title="مدیریت تیم‌ها و مربیان" description="ساخت تیم، تخصیص مربی به تیم، ویرایش بودجه و مدیریت مستقیم بازیکنان هر تیم." />
        </div>
        
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>شناسه</th>
                <th>نام تیم</th>
                <th>مربی تخصیص یافته</th>
                <th>بودجه (تومان)</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{textAlign: 'center'}}>در حال بارگذاری تیم‌ها...</td></tr>
              ) : teams.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem', color: 'var(--admin-text-muted)'}}>هیچ تیمی ثبت نشده است.</td></tr>
              ) : (
                teams.map(team => (
                  <tr key={team.id}>
                    <td>{team.id}</td>
                    <td style={{fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px'}}>
                      {getTeamLogoUrl(team) ? (
                        <img src={getTeamLogoUrl(team)} alt="logo" style={{width: '28px', height: '28px', objectFit: 'contain'}}/>
                      ) : null}
                      {team.name}
                    </td>
                    <td dir="ltr" style={{textAlign: 'right'}}>{getManagerUsername(team.manager)}</td>
                    <td>{Number(team.budget || 0).toLocaleString()} تومان</td>
                    <td>
                      <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'center'}}>
                        <button className="admin-btn" style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem'}} onClick={() => openEditModal(team)}>ویرایش / تخصیص</button>
                        <button className="admin-btn secondary" style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#3b82f6', color: '#fff'}} onClick={() => openPlayerModal(team)}>مدیریت بازیکنان</button>
                        <button className="admin-btn danger" style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem'}} onClick={() => handleDeleteTeam(team.id, team.name)}>حذف</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit/Assign */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`ویرایش تیم: ${selectedTeam?.name}`}>
        <form onSubmit={handleUpdateTeam}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
            <div>
              <label className="admin-label">نام تیم</label>
              <input type="text" name="name" className="admin-input" value={teamForm.name} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="admin-label">لینک لوگو</label>
              <input type="text" name="logo" className="admin-input" value={teamForm.logo} onChange={handleInputChange} dir="ltr" />
            </div>
            <div>
              <label className="admin-label">بودجه</label>
              <input type="number" name="budget" className="admin-input" value={teamForm.budget} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="admin-label">سقف دستمزد (Wage Cap)</label>
              <input type="number" name="wage_cap" className="admin-input" value={teamForm.wage_cap} onChange={handleInputChange} required />
            </div>
            <div style={{gridColumn: '1 / -1'}}>
              <label className="admin-label">مربی (تخصیص حساب کاربری)</label>
              <select name="manager" className="admin-input" value={teamForm.manager || ''} onChange={handleInputChange}>
                <option value="">-- بدون مربی --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer" style={{paddingBottom: 0}}>
            <button type="button" className="admin-btn secondary" onClick={() => setIsEditModalOpen(false)}>انصراف</button>
            <button type="submit" className="admin-btn success">ذخیره تغییرات</button>
          </div>
        </form>
      </Modal>

      {/* Modal Create */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="ایجاد تیم جدید">
        <form onSubmit={handleCreateTeam}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
            <div>
              <label className="admin-label">نام تیم</label>
              <input type="text" name="name" className="admin-input" value={teamForm.name} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="admin-label">لینک لوگو</label>
              <input type="text" name="logo" className="admin-input" value={teamForm.logo} onChange={handleInputChange} dir="ltr" />
            </div>
            <div>
              <label className="admin-label">بودجه</label>
              <input type="number" name="budget" className="admin-input" value={teamForm.budget} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="admin-label">سقف دستمزد (Wage Cap)</label>
              <input type="number" name="wage_cap" className="admin-input" value={teamForm.wage_cap} onChange={handleInputChange} required />
            </div>
            <div style={{gridColumn: '1 / -1'}}>
              <label className="admin-label">مربی (تخصیص حساب کاربری)</label>
              <select name="manager" className="admin-input" value={teamForm.manager || ''} onChange={handleInputChange}>
                <option value="">-- بدون مربی --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer" style={{paddingBottom: 0}}>
            <button type="button" className="admin-btn secondary" onClick={() => setIsCreateModalOpen(false)}>انصراف</button>
            <button type="submit" className="admin-btn success">ایجاد تیم</button>
          </div>
        </form>
      </Modal>

      {/* Roster Management Modal */}
      <PlayerManagementModal 
        isOpen={isPlayerModalOpen} 
        onClose={() => setIsPlayerModalOpen(false)} 
        team={selectedTeam} 
      />
    </div>
  );
};

export default CoachOversight;
