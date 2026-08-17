import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Tooltip from '../components/Tooltip';
import { useToast } from '../components/Toast';

const FinancialControl = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState('10');
  const [savingSettings, setSavingSettings] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchTransactions();
    fetchSettings();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/transactions/');
      setTransactions(res.data.results || res.data);
    } catch (err) {
      showToast('خطا در دریافت لیست تراکنش‌ها', 'error');
    }
    setLoading(false);
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/global-settings/');
      const settingsList = res.data.results || res.data;
      if (settingsList && settingsList.length > 0) {
        setCommissionRate(settingsList[0].commission_rate || '10');
      }
    } catch (err) {
      console.log("No custom settings yet");
    }
  };

  const handleSaveCommission = async () => {
    setSavingSettings(true);
    try {
      const res = await api.get('/admin/global-settings/');
      const settingsList = res.data.results || res.data;
      if (settingsList && settingsList.length > 0) {
        await api.patch(`/admin/global-settings/${settingsList[0].id}/`, { commission_rate: commissionRate });
      } else {
        await api.post('/admin/global-settings/', { commission_rate: commissionRate });
      }
      showToast('نرخ کمیسیون با موفقیت در سیستم ذخیره شد', 'success');
    } catch (err) {
      showToast('خطا در ذخیره‌سازی نرخ کمیسیون', 'error');
    }
    setSavingSettings(false);
  };

  const totalVolume = transactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  return (
    <div style={{fontFamily: 'Vazirmatn, Tahoma, sans-serif'}}>
      <header className="admin-header">
        <h1>کنترل مالی و اشتراک‌ها</h1>
        <button className="admin-btn secondary" onClick={fetchTransactions}>بروزرسانی تراکنش‌ها</button>
      </header>
      
      <div className="admin-grid" style={{marginTop: '2rem', marginBottom: '2rem'}}>
        <div className="glass-panel stat-card">
          <h3>وضعیت درگاه پرداخت</h3>
          <div className="value" style={{color: 'var(--admin-success)'}}>زرین‌پال فعال</div>
        </div>
        <div className="glass-panel stat-card">
          <h3>کل گردش مالی سیستم</h3>
          <div className="value">{totalVolume.toLocaleString()} تومان</div>
        </div>
        <div className="glass-panel stat-card">
          <h3>نرخ کمیسیون سیستم <Tooltip title="نرخ کمیسیون" description="درصد سهم سیستم از هر تراکنش خرید یا بسته" /></h3>
          <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
            <input 
              type="number" 
              className="admin-input" 
              style={{width: '90px', fontSize: '1.2rem', textAlign: 'center'}}
              value={commissionRate} 
              onChange={(e) => setCommissionRate(e.target.value)} 
            />
            <button className="admin-btn success" onClick={handleSaveCommission} disabled={savingSettings}>
              {savingSettings ? '...' : 'ثبت درصد'}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{padding: '1.5rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
          <h3 style={{margin: 0}}>تراکنش‌های اخیر سیستم</h3>
          <Tooltip title="لاگ تراکنش‌ها" description="گزارش حسابرسی تمام پرداخت‌های ثبت شده." />
        </div>
        
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>شناسه (ID)</th>
                <th>مبلغ (تومان)</th>
                <th>کاربر (User ID)</th>
                <th>بسته / توضیحات</th>
                <th>وضعیت</th>
                <th>تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{textAlign: 'center'}}>در حال بارگذاری تراکنش‌ها...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem', color: 'var(--admin-text-muted)'}}>هیچ تراکنشی ثبت نشده است.</td></tr>
              ) : (
                transactions.map(t => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td style={{fontWeight: 'bold'}}>{Number(t.amount || 0).toLocaleString()} تومان</td>
                    <td>{t.user}</td>
                    <td>{t.description || t.package || 'خرید آنلاین'}</td>
                    <td>
                      <span className={`badge ${t.status === 'completed' || t.status === 'success' ? 'badge-success' : 'badge-warning'}`}>
                        {t.status || 'تکمیل شده'}
                      </span>
                    </td>
                    <td dir="ltr" style={{textAlign: 'right'}}>{new Date(t.created_at || Date.now()).toLocaleDateString('fa-IR')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialControl;
