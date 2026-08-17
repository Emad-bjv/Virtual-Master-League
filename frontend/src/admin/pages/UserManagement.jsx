import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Tooltip from '../components/Tooltip';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    role: 'coach',
    is_active: true,
    password: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users/');
      setUsers(res.data.results || res.data);
    } catch (err) {
      showToast('خطا در دریافت لیست کاربران', 'error');
    }
    setLoading(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users/', formData);
      showToast('کاربر با موفقیت ایجاد شد', 'success');
      setIsAddModalOpen(false);
      setFormData({ username: '', role: 'coach', is_active: true, password: '' });
      fetchUsers();
    } catch (err) {
      showToast('خطا در ایجاد کاربر. اطلاعات را بررسی کنید.', 'error');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password; // Don't override unless typed
      await api.patch(`/admin/users/${selectedUser.id}/`, payload);
      showToast('اطلاعات کاربر بروزرسانی شد', 'success');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      showToast('خطا در بروزرسانی کاربر', 'error');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const updatedStatus = !user.is_active;
      await api.patch(`/admin/users/${user.id}/`, { is_active: updatedStatus });
      showToast(`وضعیت کاربر به ${updatedStatus ? 'فعال' : 'غیرفعال'} تغییر یافت`, 'info');
      fetchUsers();
    } catch (err) {
      showToast('خطا در تغییر وضعیت کاربر', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await api.delete(`/admin/users/${selectedUser.id}/`);
      showToast('کاربر با موفقیت حذف شد', 'success');
      setIsDeleteModalOpen(false);
      fetchUsers();
    } catch (err) {
      showToast('خطا در حذف کاربر', 'error');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username || '',
      role: user.role || 'coach',
      is_active: user.is_active ?? true,
      password: ''
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const filteredUsers = users.filter(u => 
    (u.username && u.username.toLowerCase().includes(search.toLowerCase())) ||
    (u.role && u.role.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{fontFamily: 'Vazirmatn, Tahoma, sans-serif'}}>
      <header className="admin-header">
        <h1>مدیریت کاربران</h1>
        <button className="admin-btn" onClick={() => {
          setFormData({ username: '', role: 'coach', is_active: true, password: '' });
          setIsAddModalOpen(true);
        }}>
          + افزودن کاربر جدید
        </button>
      </header>
      
      <div className="glass-panel" style={{marginTop: '2rem', padding: '1.5rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
          <input 
            type="text" 
            className="admin-input" 
            placeholder="جستجوی کاربران با نام کاربری یا نقش..." 
            style={{maxWidth: '400px'}}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Tooltip title="جستجوی کاربر" description="برای فیلتر آنلاین لیست کاربران تایپ کنید." />
        </div>
        
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>شناسه (ID)</th>
                <th>نام کاربری (Username)</th>
                <th>نقش <Tooltip title="نقش کاربر" description="سطح دسترسی (مدیر، مربی، کاربر عادی)" /></th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{textAlign: 'center'}}>در حال بارگذاری...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem', color: 'var(--admin-text-muted)'}}>هیچ کاربری با این مشخصات یافت نشد.</td></tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td dir="ltr" style={{textAlign: 'right', fontWeight: 'bold'}}>{u.username}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-danger' : 'badge-info'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <button 
                        className={`badge ${u.is_active ? 'badge-success' : 'badge-warning'}`}
                        style={{border: 'none', cursor: 'pointer'}}
                        onClick={() => handleToggleStatus(u)}
                      >
                        {u.is_active ? 'فعال' : 'غیرفعال'}
                      </button>
                    </td>
                    <td>
                      <button className="admin-btn secondary" style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem', marginLeft: '0.5rem'}} onClick={() => openEditModal(u)}>ویرایش</button>
                      <button className="admin-btn danger" style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem'}} onClick={() => openDeleteModal(u)}>حذف</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add User */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="افزودن کاربر جدید">
        <form onSubmit={handleCreateUser}>
          <div style={{marginBottom: '1rem'}}>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>نام کاربری (Username)</label>
            <input type="text" required className="admin-input" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} dir="ltr" placeholder="coach_chelsea" />
          </div>
          <div style={{marginBottom: '1rem'}}>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>نقش کاربر</label>
            <select className="admin-select" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
              <option value="coach">مربی (Coach)</option>
              <option value="admin">ادمین (Admin)</option>
              <option value="user">کاربر عادی (User)</option>
            </select>
          </div>
          <div style={{marginBottom: '1rem'}}>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>رمز عبور</label>
            <input type="password" required className="admin-input" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} dir="ltr" />
          </div>
          <div className="modal-footer" style={{paddingBottom: 0}}>
            <button type="button" className="admin-btn secondary" onClick={() => setIsAddModalOpen(false)}>انصراف</button>
            <button type="submit" className="admin-btn success">ایجاد کاربر</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit User */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="ویرایش کاربر">
        <form onSubmit={handleUpdateUser}>
          <div style={{marginBottom: '1rem'}}>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>نام کاربری (Username)</label>
            <input type="text" required className="admin-input" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} dir="ltr" />
          </div>
          <div style={{marginBottom: '1rem'}}>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>نقش کاربر</label>
            <select className="admin-select" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
              <option value="coach">مربی (Coach)</option>
              <option value="admin">ادمین (Admin)</option>
              <option value="user">کاربر عادی (User)</option>
            </select>
          </div>
          <div style={{marginBottom: '1rem'}}>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>تغییر رمز عبور (اختیاری)</label>
            <input type="password" className="admin-input" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} dir="ltr" placeholder="برای عدم تغییر خالی بگذارید" />
          </div>
          <div className="modal-footer" style={{paddingBottom: 0}}>
            <button type="button" className="admin-btn secondary" onClick={() => setIsEditModalOpen(false)}>انصراف</button>
            <button type="submit" className="admin-btn success">ذخیره تغییرات</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Confirmation */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="تایید حذف کاربر">
        <p>آیا از حذف کاربر <strong>{selectedUser?.username}</strong> اطمینان دارید؟ این عملیات غیرقابل بازگشت است.</p>
        <div className="modal-footer">
          <button type="button" className="admin-btn secondary" onClick={() => setIsDeleteModalOpen(false)}>انصراف</button>
          <button type="button" className="admin-btn danger" onClick={handleDeleteUser}>حذف قطعی</button>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
