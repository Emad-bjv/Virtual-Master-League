import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    current_season: 1,
    current_week: 1,
    is_transfer_window_open: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/core/settings/');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      await axios.put('/api/core/settings/', settings, { headers });
      alert('تنظیمات با موفقیت ذخیره شد.');
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('خطا در ذخیره تنظیمات.');
    }
  };

  if (loading) return <div className="text-white">در حال بارگذاری...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">تنظیمات سراسری سیستم</h1>

      {/* Info Guide Box */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-5 text-gray-200 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">⚙️</span>
          <h3 className="text-lg font-bold text-blue-300">راهنمای تنظیمات سراسری لیگ</h3>
        </div>
        <p className="text-sm leading-relaxed text-gray-300">
          تغییر فصل و هفته جاری باعث بروزرسانی تقویم بازی‌ها در سراسر اپلیکیشن می‌شود. فعال‌سازی گزینه «پنجره نقل و انتقالات» به مربیان اجازه می‌دهد بازیکنان خود را در بازار خرید و فروش قرار دهند یا پیشنهاد خرید ثبت کنند.
        </p>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-2xl">
        
        <div className="mb-6">
          <label className="block text-gray-400 mb-2 font-medium">فصل جاری</label>
          <input
            type="number"
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
            value={settings.current_season}
            onChange={(e) => setSettings({ ...settings, current_season: parseInt(e.target.value) })}
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-400 mb-2 font-medium">هفته جاری</label>
          <input
            type="number"
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
            value={settings.current_week}
            onChange={(e) => setSettings({ ...settings, current_week: parseInt(e.target.value) })}
          />
        </div>

        <div className="mb-8 flex items-center gap-3">
          <input
            type="checkbox"
            id="transferToggle"
            className="w-5 h-5 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
            checked={settings.is_transfer_window_open}
            onChange={(e) => setSettings({ ...settings, is_transfer_window_open: e.target.checked })}
          />
          <label htmlFor="transferToggle" className="text-white font-medium cursor-pointer">
            پنجره نقل و انتقالات باز است
          </label>
        </div>

        <button
          onClick={handleUpdate}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-blue-900/20"
        >
          ذخیره تغییرات
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;
