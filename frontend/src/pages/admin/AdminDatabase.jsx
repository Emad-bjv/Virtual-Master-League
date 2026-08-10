import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDatabase = () => {
  const [summary, setSummary] = useState([]);
  const [selectedModel, setSelectedModel] = useState({ app_label: 'users', model_name: 'User', verbose_name: 'کاربران' });
  const [tableData, setTableData] = useState({ fields: [], rows: [], total_count: 0 });
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeJsonRow, setActiveJsonRow] = useState(null);
  const [editingRow, setEditingRow] = useState(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (selectedModel) {
      fetchTable(selectedModel.app_label, selectedModel.model_name, searchQuery);
    }
  }, [selectedModel, searchQuery]);

  const fetchSummary = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      const res = await axios.get('http://127.0.0.1:8000/api/core/admin/db-explorer/summary/', { headers });
      setSummary(res.data);
      if (res.data.length > 0) {
        setSelectedModel(res.data[0]);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTable = async (app_label, model_name, search) => {
    setTableLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      const url = `http://127.0.0.1:8000/api/core/admin/db-explorer/table/?app_label=${app_label}&model_name=${model_name}&search=${encodeURIComponent(search)}`;
      const res = await axios.get(url, { headers });
      setTableData(res.data);
    } catch (error) {
      console.error('Error fetching table data:', error);
    } finally {
      setTableLoading(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm(`آیا از حذف رکورد با شناسه ${id} اطمینان دارید؟`)) return;

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      const url = `http://127.0.0.1:8000/api/core/admin/db-explorer/table/?app_label=${selectedModel.app_label}&model_name=${selectedModel.model_name}&id=${id}`;
      await axios.delete(url, { headers });
      alert('رکورد با موفقیت حذف شد.');
      fetchTable(selectedModel.app_label, selectedModel.model_name, searchQuery);
      fetchSummary();
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('خطا در حذف رکورد.');
    }
  };

  const handleUpdateRecord = async () => {
    if (!editingRow) return;

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      await axios.put('http://127.0.0.1:8000/api/core/admin/db-explorer/table/', {
        app_label: selectedModel.app_label,
        model_name: selectedModel.model_name,
        id: editingRow.id,
        data: editingRow
      }, { headers });

      setEditingRow(null);
      fetchTable(selectedModel.app_label, selectedModel.model_name, searchQuery);
      alert('رکورد با موفقیت بروزرسانی شد.');
    } catch (error) {
      console.error('Error updating record:', error);
      alert('خطا در بروزرسانی رکورد.');
    }
  };

  if (loading) return <div className="text-white">در حال بارگذاری کاوشگر دیتابیس...</div>;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <h1 className="text-3xl font-bold text-white">کاوشگر دیتابیس (Django Admin پیشرفته)</h1>

      {/* Info Guide Box */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-5 text-gray-200 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🗄️</span>
          <h3 className="text-lg font-bold text-blue-300">راهنمای کاوشگر دیتابیس</h3>
        </div>
        <p className="text-sm leading-relaxed text-gray-300">
          این بخش به عنوان یک جایگزین مستقیم و پیشرفته‌تر برای Django Admin عمل می‌کند. شما می‌توانید جداول دیتابیس اصلی سیستم (کاربران، تیم‌ها، بازیکنان، مسابقات، نقل‌وانتقالات، سیزن‌پس و غیره) را به صورت مستقیم مشاهده، جستجو، ویرایش و حذف کنید.
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-blue-400 font-semibold bg-blue-950/60 px-3 py-1.5 rounded-lg border border-blue-800/50 w-fit">
          <span>💡 اثر در لیگ:</span> هرگونه تغییر مستقیماً روی دیتابیس اصلی ذخیره شده و لحظه‌ای در سیستم مربیان اعمال می‌شود.
        </div>
      </div>

      {/* Models Summary Cards Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {summary.map(item => (
          <button
            key={`${item.app_label}.${item.model_name}`}
            onClick={() => setSelectedModel(item)}
            className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between h-24 ${
              selectedModel?.app_label === item.app_label && selectedModel?.model_name === item.model_name
                ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
            }`}
          >
            <span className="text-xs font-semibold truncate">{item.verbose_name}</span>
            <div className="flex justify-between items-baseline mt-2">
              <span className="text-2xl font-extrabold text-white">{item.count}</span>
              <span className="text-[10px] text-gray-500 font-mono">{item.model_name}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Model Detail Toolbar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">جدول: {selectedModel?.verbose_name}</h2>
          <span className="text-xs bg-gray-800 text-blue-400 px-3 py-1 rounded-full font-mono">
            {selectedModel?.app_label}.{selectedModel?.model_name} ({tableData.total_count} رکورد)
          </span>
        </div>

        <input
          type="text"
          placeholder="جستجو در این جدول..."
          className="bg-gray-800 text-white text-sm rounded-lg px-4 py-2 border border-gray-700 w-full md:w-64 focus:ring-2 focus:ring-blue-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table Data Inspector */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        {tableLoading ? (
          <div className="p-8 text-center text-gray-400">در حال بارگذاری داده‌های جدول...</div>
        ) : tableData.rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">رکوردی در این جدول یافت نشد.</div>
        ) : (
          <table className="w-full text-right text-xs text-gray-300">
            <thead className="bg-gray-800 text-gray-400">
              <tr>
                {tableData.fields.slice(0, 7).map(f => (
                  <th key={f.name} className="px-4 py-3 font-semibold border-b border-gray-700 whitespace-nowrap">
                    {f.verbose_name} ({f.name})
                  </th>
                ))}
                <th className="px-4 py-3 font-semibold border-b border-gray-700 whitespace-nowrap">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {tableData.rows.map(row => (
                <tr key={row.id || JSON.stringify(row)} className="hover:bg-gray-800/40 transition-colors">
                  {tableData.fields.slice(0, 7).map(f => (
                    <td key={f.name} className="px-4 py-3 max-w-xs truncate font-mono">
                      {String(row[f.name] ?? '-')}
                    </td>
                  ))}
                  <td className="px-4 py-3 flex items-center gap-2 whitespace-nowrap">
                    <button
                      onClick={() => setActiveJsonRow(row)}
                      className="bg-gray-800 hover:bg-gray-700 text-blue-400 px-2.5 py-1 rounded text-[11px]"
                    >
                      JSON
                    </button>
                    <button
                      onClick={() => setEditingRow({ ...row })}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-[11px]"
                    >
                      ویرایش
                    </button>
                    {row.id && (
                      <button
                        onClick={() => handleDeleteRecord(row.id)}
                        className="bg-red-500/20 hover:bg-red-500/40 text-red-400 px-2.5 py-1 rounded text-[11px]"
                      >
                        حذف
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* JSON Viewer Modal */}
      {activeJsonRow && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <h2 className="text-lg font-bold text-white mb-4">جزئیات کامل داده‌ها (JSON)</h2>
            <div className="flex-1 bg-black rounded-xl p-4 overflow-y-auto font-mono text-xs text-green-400 dir-ltr text-left">
              <pre>{JSON.stringify(activeJsonRow, null, 2)}</pre>
            </div>
            <button
              onClick={() => setActiveJsonRow(null)}
              className="mt-4 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg font-bold"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {editingRow && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] flex flex-col">
            <h2 className="text-lg font-bold text-white mb-4">ویرایش مستقیم رکورد ID: {editingRow.id}</h2>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {tableData.fields.map(f => (
                <div key={f.name}>
                  <label className="block text-gray-400 text-xs mb-1 font-mono">{f.verbose_name} ({f.name})</label>
                  <input
                    type="text"
                    disabled={f.name === 'id'}
                    className={`w-full text-xs rounded-lg p-2.5 border font-mono ${
                      f.name === 'id' ? 'bg-gray-950 border-gray-800 text-gray-500' : 'bg-gray-800 border-gray-700 text-white'
                    }`}
                    value={editingRow[f.name] ?? ''}
                    onChange={(e) => setEditingRow({ ...editingRow, [f.name]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-800 mt-4">
              <button onClick={handleUpdateRecord} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg text-sm">ذخیره تغییرات</button>
              <button onClick={() => setEditingRow(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDatabase;
