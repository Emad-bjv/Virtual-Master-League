import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Tooltip from '../components/Tooltip';
import { useToast } from '../components/Toast';

const SystemSettings = () => {
  const [settingsId, setSettingsId] = useState(null);
  const [maintenance, setMaintenance] = useState(false);
  const [siteTitle, setSiteTitle] = useState('Virtual Master League');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/global-settings/');
      const data = res.data.results || res.data;
      if (data && data.length > 0) {
        const item = data[0];
        setSettingsId(item.id);
        setMaintenance(item.maintenance_mode || false);
        setSiteTitle(item.site_title || 'Virtual Master League');
      }
    } catch (err) {
      showToast('تنظیمات قبلی یافت نشد. آماده ایجاد تنظیمات جدید.', 'info');
    }
    setLoading(false);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        maintenance_mode: maintenance,
        site_title: siteTitle
      };
      if (settingsId) {
        await api.patch(`/admin/global-settings/${settingsId}/`, payload);
      } else {
        const res = await api.post('/admin/global-settings/', payload);
        setSettingsId(res.data.id);
      }
      showToast('تنظیمات عمومی سیستم با موفقیت ذخیره شد', 'success');
    } catch (err) {
      showToast('خطا در ذخیره تنظیمات سیستم', 'error');
    }
    setSaving(false);
  };

  return (
    <div style={{fontFamily: 'Vazirmatn, Tahoma, sans-serif'}}>
      <form onSubmit={handleSaveSettings}>
        <header className="admin-header">
          <h1>تنظیمات سیستم</h1>
          <button type="submit" className="admin-btn success" disabled={saving}>
            {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
          </button>
        </header>
        
        {loading ? (
          <div className="glass-panel" style={{marginTop: '2rem', padding: '2rem', textAlign: 'center'}}>
            در حال بارگذاری تنظیمات...
          </div>
        ) : (
          <div className="admin-grid" style={{marginTop: '2rem'}}>
            <div className="glass-panel" style={{padding: '1.5rem'}}>
              <h3>کنترل‌های سراسری</h3>
              
              <div style={{marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div>
                  <strong style={{display: 'block', marginBottom: '4px'}}>حالت تعمیرات (Maintenance Mode)</strong>
                  <span style={{color: 'var(--admin-text-muted)', fontSize: '0.85rem'}}>دسترسی تمام کاربران غیر ادمین را مسدود می‌کند.</span>
                </div>
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <input 
                    type="checkbox" 
                    checked={maintenance} 
                    onChange={(e) => setMaintenance(e.target.checked)} 
                    style={{transform: 'scale(1.5)', cursor: 'pointer'}} 
                  />
                  <Tooltip title="حالت تعمیرات" description="هشدار: فعال کردن این گزینه بلافاصله دسترسی کاربران عادی را مسدود می‌سازد." />
                </div>
              </div>
            </div>
            
            <div className="glass-panel" style={{padding: '1.5rem'}}>
              <h3>برندینگ و اطلاعات</h3>
              <div style={{marginTop: '1.5rem'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>
                  عنوان سایت <Tooltip title="عنوان سایت" description="نامی که در سربرگ سامانه نمایش داده می‌شود." />
                </label>
                <input 
                  type="text" 
                  className="admin-input" 
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default SystemSettings;
