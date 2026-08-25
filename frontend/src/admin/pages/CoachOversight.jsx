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
  const [teamForm, setTeamForm] = useState({ name: '', logo: '', budget: '', wage_cap: '10000', gems: '0', manager: '', is_active: true });
  
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

  const handleToggleActive = async (team) => {
    const nextState = !team.is_active;
    // Optimistic update
    setTeams(prev => prev.map(t => t.id === team.id ? { ...t, is_active: nextState } : t));
    try {
      await api.patch(`/admin/teams/${team.id}/`, { is_active: nextState });
      showToast(`تیم «${team.name}» با موفقیت ${nextState ? 'فعال' : 'غیرفعال'} شد`, 'success');
    } catch (err) {
      // Revert on error
      setTeams(prev => prev.map(t => t.id === team.id ? { ...t, is_active: !nextState } : t));
      showToast('خطا در تغییر وضعیت تیم', 'error');
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
      setTeamForm({ name: '', logo: '', budget: '', wage_cap: '10000', gems: '0', manager: '', is_active: true });
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
      manager: team.manager || '',
      is_active: team.is_active !== false
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
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setTeamForm({ ...teamForm, [e.target.name]: value });
  };

  const activeTeamsCount = teams.filter(t => t.is_active !== false).length;
  const inactiveTeamsCount = teams.filter(t => t.is_active === false).length;

  return (
    <div style={{fontFamily: 'Vazirmatn, Tahoma, sans-serif'}}>
      <header className="admin-header">
        <div>
          <h1>مدیریت تیم‌ها و مربیان</h1>
          <p style={{fontSize: '0.8rem', color: 'var(--admin-text-muted)', margin: '4px 0 0'}}>
            کنترل وضعیت فعالیت تیم‌ها در لیگ، تخصیص مربیان و مدیریت مالی باشگاه‌ها
          </p>
        </div>
        <div style={{display: 'flex', gap: '0.5rem'}}>
          <button className="admin-btn success" onClick={() => {
            setTeamForm({ name: '', logo: '', budget: '', wage_cap: '10000', gems: '0', manager: '', is_active: true });
            setIsCreateModalOpen(true);
          }}>+ تیم جدید</button>
          <button className="admin-btn secondary" onClick={fetchTeams}>بروزرسانی لیست</button>
        </div>
      </header>

      {/* Summary KPI Badges */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem'}}>
        <div className="glass-panel" style={{padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div>
            <span style={{fontSize: '0.75rem', color: 'var(--admin-text-muted)', display: 'block', marginBottom: '4px'}}>کل تیم‌های سیستم</span>
            <span style={{fontSize: '1.5rem', fontWeight: 900, color: '#fff'}}>{teams.length}</span>
          </div>
          <span style={{fontSize: '1.75rem'}}>🛡️</span>
        </div>

        <div className="glass-panel" style={{padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRight: '3px solid #10b981'}}>
          <div>
            <span style={{fontSize: '0.75rem', color: '#6ee7b7', display: 'block', marginBottom: '4px'}}>تیم‌های فعال در لیگ</span>
            <span style={{fontSize: '1.5rem', fontWeight: 900, color: '#34d399'}}>{activeTeamsCount}</span>
          </div>
          <span style={{fontSize: '1.75rem'}}>⚡</span>
        </div>

        <div className="glass-panel" style={{padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRight: '3px solid #ef4444'}}>
          <div>
            <span style={{fontSize: '0.75rem', color: '#fca5a5', display: 'block', marginBottom: '4px'}}>تیم‌های غیرفعال / تعلیق</span>
            <span style={{fontSize: '1.5rem', fontWeight: 900, color: '#f87171'}}>{inactiveTeamsCount}</span>
          </div>
          <span style={{fontSize: '1.75rem'}}>⏸️</span>
        </div>
      </div>
      
      <div className="glass-panel" style={{marginTop: '1.5rem', padding: '1.5rem'}}>
        <div style={{marginBottom: '1rem'}}>
          <Tooltip 
            title="مدیریت تیم‌ها و مربیان" 
            description="با غیرفعال کردن سوئیچ هر تیم، آن تیم از جدول مسابقات لیگ، ساخت فصل جدید و بازار نقل‌وانتقالات خارج می‌شود؛ با فعال‌سازی مجدد، بدون از دست رفتن بازیکنان مجدداً در ساخت مسابقات شرکت داده می‌شود." 
          />
        </div>
        
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>شناسه</th>
                <th>نام تیم</th>
                <th>وضعیت در لیگ</th>
                <th>مربی تخصیص یافته</th>
                <th>بودجه ($ / تومان)</th>
                <th>جم باشگاه (💎)</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{textAlign: 'center'}}>در حال بارگذاری تیم‌ها...</td></tr>
              ) : teams.length === 0 ? (
                <tr><td colSpan="7" style={{textAlign: 'center', padding: '2rem', color: 'var(--admin-text-muted)'}}>هیچ تیمی ثبت نشده است.</td></tr>
              ) : (
                teams.map(team => (
                  <tr key={team.id} style={{opacity: team.is_active === false ? 0.75 : 1}}>
                    <td>{team.id}</td>
                    <td style={{fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px'}}>
                      {getTeamLogoUrl(team) ? (
                        <img src={getTeamLogoUrl(team)} alt="logo" style={{width: '28px', height: '28px', objectFit: 'contain'}}/>
                      ) : null}
                      <span>{team.name}</span>
                    </td>
                    <td>
                      <div style={{display: 'inline-flex', alignItems: 'center', gap: '8px'}}>
                        <label 
                          style={{position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer'}}
                          title={team.is_active !== false ? 'کلیک برای غیرفعال‌سازی تیم از لیگ' : 'کلیک برای فعال‌سازی و بازگرداندن تیم به لیگ'}
                        >
                          <input
                            type="checkbox"
                            checked={team.is_active !== false}
                            onChange={() => handleToggleActive(team)}
                            style={{position: 'absolute', opacity: 0, width: 0, height: 0}}
                          />
                          <div
                            style={{
                              width: '38px',
                              height: '20px',
                              backgroundColor: team.is_active !== false ? '#10b981' : '#475569',
                              borderRadius: '9999px',
                              position: 'relative',
                              transition: 'all 0.2s',
                              boxShadow: team.is_active !== false ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none'
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                top: '2px',
                                right: team.is_active !== false ? '20px' : '2px',
                                width: '16px',
                                height: '16px',
                                backgroundColor: '#ffffff',
                                borderRadius: '9999px',
                                transition: 'all 0.2s'
                              }}
                            />
                          </div>
                        </label>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: team.is_active !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: team.is_active !== false ? '#34d399' : '#f87171',
                            border: `1px solid ${team.is_active !== false ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                          }}
                        >
                          {team.is_active !== false ? 'فعال' : 'غیرفعال'}
                        </span>
                      </div>
                    </td>
                    <td dir="ltr" style={{textAlign: 'right'}}>{getManagerUsername(team.manager)}</td>
                    <td style={{fontWeight: 'bold', color: '#10b981'}}>${Number(team.budget || 0).toLocaleString()}</td>
                    <td>
                      <span style={{color: '#38bdf8', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                        💎 {Number(team.gems || 0).toLocaleString()}
                      </span>
                    </td>
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
              <label className="admin-label">بودجه باشگاه ($ / تومان)</label>
              <input type="number" name="budget" className="admin-input" value={teamForm.budget} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="admin-label">جم باشگاه (💎)</label>
              <input type="number" name="gems" min="0" className="admin-input" value={teamForm.gems} onChange={handleInputChange} required />
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
            <div style={{gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem'}}>
              <input 
                type="checkbox" 
                id="edit_is_active" 
                name="is_active" 
                checked={teamForm.is_active} 
                onChange={handleInputChange} 
                style={{width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981'}} 
              />
              <label htmlFor="edit_is_active" style={{fontSize: '0.85rem', color: '#fff', cursor: 'pointer', fontWeight: 'bold'}}>
                تیم فعال در مسابقات لیگ (شرکت در برنامه‌ریزی مسابقات و جدول)
              </label>
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
              <label className="admin-label">بودجه باشگاه ($ / تومان)</label>
              <input type="number" name="budget" className="admin-input" value={teamForm.budget} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="admin-label">جم باشگاه (💎)</label>
              <input type="number" name="gems" min="0" className="admin-input" value={teamForm.gems} onChange={handleInputChange} required />
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
            <div style={{gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem'}}>
              <input 
                type="checkbox" 
                id="create_is_active" 
                name="is_active" 
                checked={teamForm.is_active} 
                onChange={handleInputChange} 
                style={{width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981'}} 
              />
              <label htmlFor="create_is_active" style={{fontSize: '0.85rem', color: '#fff', cursor: 'pointer', fontWeight: 'bold'}}>
                تیم به صورت پیش‌فرض فعال باشد
              </label>
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
