import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminLiveStream = () => {
  const [config, setConfig] = useState({
    embed_url: '',
    channel_name: '',
    title: '',
    is_live: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreamConfig();
  }, []);

  const fetchStreamConfig = async () => {
    try {
      const response = await axios.get('/api/teams/live_stream/');
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching stream config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/teams/live_stream/', config);
      alert('تنظیمات پخش زنده ذخیره شد.');
      setConfig(response.data.config || config);
    } catch (error) {
      console.error('Error saving stream config:', error);
      alert('خطا در ذخیره تنظیمات پخش زنده.');
    }
  };

  if (loading) return <div className="text-white">در حال بارگذاری...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">تنظیمات پخش زنده آپارات</h1>

      {/* Info Guide Box */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-5 text-gray-200 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">📺</span>
          <h3 className="text-lg font-bold text-blue-300">راهنمای پخش زنده لیگ</h3>
        </div>
        <p className="text-sm leading-relaxed text-gray-300">
          لینک iframe آی‌فریم آپارات قرار داده شده در این بخش مستقیماً در بالای صفحه اصلی داشبورد مربیان و بینندگان بارگذاری می‌شود تا مسابقات حساس لیگ به صورت زنده نمایش داده شوند.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-gray-400 text-sm mb-1 font-medium">لینک Embed آپارات</label>
            <input
              type="text"
              required
              placeholder="https://www.aparat.com/embed/live/VML.Emad"
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 font-mono text-sm"
              value={config.embed_url}
              onChange={(e) => setConfig({ ...config, embed_url: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1 font-medium">عنوان پخش زنده</label>
            <input
              type="text"
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700"
              value={config.title || ''}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1 font-medium">نام کانال</label>
            <input
              type="text"
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700"
              value={config.channel_name || ''}
              onChange={(e) => setConfig({ ...config, channel_name: e.target.value })}
            />
          </div>

          {/* Preview */}
          {config.embed_url && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">پیش‌نمایش پخش زنده:</p>
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-gray-800">
                <iframe
                  src={config.embed_url}
                  className="w-full h-full"
                  allowFullScreen
                  title="Aparat Live Stream Preview"
                ></iframe>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-red-900/20"
          >
            ذخیره تنظیمات پخش زنده
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLiveStream;
