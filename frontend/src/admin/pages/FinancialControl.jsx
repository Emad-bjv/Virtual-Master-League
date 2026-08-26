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

  const [cardSettings, setCardSettings] = useState({
    card_number: '',
    card_holder_name: '',
    bank_name: '',
    is_active: true
  });
  const [savingCard, setSavingCard] = useState(false);

  useEffect(() => {
    fetchTransactions();
    fetchSettings();
    fetchCardSettings();
  }, []);

  const fetchCardSettings = async () => {
    try {
      const res = await api.get('/economy/card-info/');
      if (res.data && res.data.card_number) {
        setCardSettings({
          card_number: res.data.card_number || '',
          card_holder_name: res.data.card_holder_name || '',
          bank_name: res.data.bank_name || '',
          is_active: res.data.is_active !== false
        });
      }
    } catch (err) {
      console.log('No card settings found yet');
    }
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();
    setSavingCard(true);
    try {
      await api.post('/economy/card-info/', cardSettings);
      showToast('اطلاعات شماره کارت بانکی با موفقیت بروزرسانی شد', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'خطا در ذخیره‌سازی اطلاعات کارت', 'error');
    }
    setSavingCard(false);
  };

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
        <h1>کنترل مالی و تنظیمات پرداخت</h1>
        <button className="admin-btn secondary" onClick={() => { fetchTransactions(); fetchCardSettings(); }}>بروزرسانی اطلاعات</button>
      </header>

      {/* Bank Card Settings Management Card */}
      <div className="glass-panel" style={{marginTop: '1.5rem', marginBottom: '1.5rem', padding: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.4)'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
          <h3 style={{margin: 0, color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span>💳</span>
            <span>تنظیمات شماره کارت بانکی (واریز کارت به کارت مربیان)</span>
          </h3>
          <Tooltip title="شماره کارت مقصد" description="این شماره کارت در بخش خرید بسته‌های جم و بودجه در فروشگاه به مربیان نمایش داده می‌شود تا مبلغ را واریز و تصویر فیش را آپلود کنند." />
        </div>

        <form onSubmit={handleSaveCard} style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end'}}>
          <div>
            <label style={{display: 'block', fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '4px'}}>
              شماره کارت بانکی (۱۶ رقمی):
            </label>
            <input
              type="text"
              className="admin-input"
              dir="ltr"
              style={{letterSpacing: '2px', fontWeight: 'bold', fontSize: '1rem'}}
              placeholder="6037-9971-XXXX-XXXX"
              value={cardSettings.card_number}
              onChange={(e) => setCardSettings({ ...cardSettings, card_number: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{display: 'block', fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '4px'}}>
              نام صاحب حساب:
            </label>
            <input
              type="text"
              className="admin-input"
              placeholder="مثال: علی محمدی"
              value={cardSettings.card_holder_name}
              onChange={(e) => setCardSettings({ ...cardSettings, card_holder_name: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{display: 'block', fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '4px'}}>
              نام بانک (اختیاری):
            </label>
            <input
              type="text"
              className="admin-input"
              placeholder="مثال: بانک ملی / سامان"
              value={cardSettings.bank_name}
              onChange={(e) => setCardSettings({ ...cardSettings, bank_name: e.target.value })}
            />
          </div>

          <div>
            <button
              type="submit"
              className="admin-btn success"
              disabled={savingCard}
              style={{width: '100%', padding: '0.65rem 1rem', fontSize: '0.9rem', fontWeight: 'bold'}}
            >
              {savingCard ? 'در حال ذخیره...' : '✓ ذخیره شماره کارت جدید'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="admin-grid" style={{marginTop: '1.5rem', marginBottom: '2rem'}}>
        <div className="glass-panel stat-card">
          <h3>وضعیت واریز کارت به کارت</h3>
          <div className="value" style={{color: cardSettings.card_number ? 'var(--admin-success)' : 'var(--admin-danger)'}}>
            {cardSettings.card_number ? 'فعال و متصل' : 'تعریف نشده'}
          </div>
        </div>
        <div className="glass-panel stat-card">
          <h3>کل گردش مالی ثبت شده</h3>
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
