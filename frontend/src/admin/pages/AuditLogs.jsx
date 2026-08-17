import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Tooltip from '../components/Tooltip';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/audit-logs/');
      setLogs(res.data.results || res.data);
    } catch (err) {
      showToast('خطا در دریافت لاگ‌های حسابرسی', 'error');
    }
    setLoading(false);
  };

  const handlePurgeLogs = async () => {
    try {
      // Delete logs one by one or clear endpoint if available
      for (const log of logs) {
        await api.delete(`/admin/audit-logs/${log.id}/`);
      }
      showToast('تمامی لاگ‌های حسابرسی با موفقیت پاکسازی شدند', 'success');
      setIsPurgeModalOpen(false);
      fetchLogs();
    } catch (err) {
      showToast('خطا در پاکسازی لاگ‌ها', 'error');
    }
  };

  const filteredLogs = logs.filter(l => 
    (l.action && l.action.toLowerCase().includes(search.toLowerCase())) ||
    (l.admin_user && String(l.admin_user).includes(search)) ||
    (l.details && JSON.stringify(l.details).toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{fontFamily: 'Vazirmatn, Tahoma, sans-serif'}}>
      <header className="admin-header">
        <h1>لاگ‌های حسابرسی و فعالیت‌ها</h1>
        <button className="admin-btn danger" onClick={() => setIsPurgeModalOpen(true)} disabled={logs.length === 0}>
          پاکسازی لاگ‌های قدیمی
        </button>
      </header>
      
      <div className="glass-panel" style={{marginTop: '2rem', padding: '1.5rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
          <input 
            type="text" 
            className="admin-input" 
            placeholder="فیلتر بر اساس عملیات یا کاربر ادمین..." 
            style={{maxWidth: '400px'}} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Tooltip title="لاگ‌های در لحظه" description="تمامی عملیات حساس مدیریتی (مانند تغییرات دیتابیس، تغییر نقش، بروزرسانی تنظیمات) را جهت بازرسی ثبت می‌کند." />
        </div>
        
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>شناسه (ID)</th>
                <th>کاربر ادمین</th>
                <th>نوع عملیات</th>
                <th>جزئیات</th>
                <th>آی‌پی (IP)</th>
                <th>زمان</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{textAlign: 'center'}}>در حال بارگذاری لاگ‌ها...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem', color: 'var(--admin-text-muted)'}}>هیچ لاگ حسابرسی ثبت نشده است.</td></tr>
              ) : (
                filteredLogs.map(l => (
                  <tr key={l.id}>
                    <td>{l.id}</td>
                    <td>{l.admin_user || 'سیستم'}</td>
                    <td>
                      <span className="badge badge-info">{l.action || 'اقدام مدیریتی'}</span>
                    </td>
                    <td dir="ltr" style={{textAlign: 'right', fontSize: '0.85rem'}}>{typeof l.details === 'object' ? JSON.stringify(l.details) : l.details || '-'}</td>
                    <td dir="ltr" style={{textAlign: 'right'}}>{l.ip_address || '127.0.0.1'}</td>
                    <td dir="ltr" style={{textAlign: 'right'}}>{new Date(l.timestamp || Date.now()).toLocaleDateString('fa-IR')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isPurgeModalOpen} onClose={() => setIsPurgeModalOpen(false)} title="تایید پاکسازی لاگ‌ها">
        <p>آیا از پاکسازی تمامی لاگ‌های حسابرسی سیستم اطمینان دارید؟ این عملیات غیرقابل بازگشت است.</p>
        <div className="modal-footer">
          <button type="button" className="admin-btn secondary" onClick={() => setIsPurgeModalOpen(false)}>انصراف</button>
          <button type="button" className="admin-btn danger" onClick={handlePurgeLogs}>پاکسازی کامل</button>
        </div>
      </Modal>
    </div>
  );
};

export default AuditLogs;
