import React, { useState, useEffect } from 'react';
import axios from 'axios';

const APP_CATEGORIES = [
  { id: 'all', label: 'همه جداول' },
  { id: 'users', label: 'کاربران' },
  { id: 'teams', label: 'تیم‌ها و بازیکنان' },
  { id: 'matches', label: 'مسابقات' },
  { id: 'transfers', label: 'نقل و انتقالات' },
  { id: 'economy', label: 'اقتصاد و مالی' },
  { id: 'gacha', label: 'پک‌ها و شانس' },
  { id: 'season_pass', label: 'سیزن پس' },
  { id: 'notifications', label: 'اعلان‌ها' },
  { id: 'audit', label: 'حسابرسی' },
  { id: 'core', label: 'تنظیمات لیگ' },
];

const AdminDatabase = () => {
  const [summary, setSummary] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedModel, setSelectedModel] = useState(null);
  const [tableData, setTableData] = useState({ fields: [], rows: [], total_count: 0, page: 1, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [activeJsonRow, setActiveJsonRow] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [creatingRow, setCreatingRow] = useState(false);
  const [newRowData, setNewRowData] = useState({});
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (selectedModel) {
      fetchTable(selectedModel.app_label, selectedModel.model_name, searchQuery, currentPage);
    }
  }, [selectedModel, searchQuery, currentPage]);

  const showToast = (msg, type = 'success') => {
    setStatusMessage({ msg, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = token && token !== 'null' && token !== 'undefined' ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get('http://127.0.0.1:8000/api/core/db-explorer/summary/', { headers });
      setSummary(res.data);
      if (res.data.length > 0 && !selectedModel) {
        setSelectedModel(res.data[0]);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
      showToast('خطا در دریافت لیست جداول دیتابیس', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTable = async (app_label, model_name, search, page) => {
    setTableLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = token && token !== 'null' && token !== 'undefined' ? { Authorization: `Bearer ${token}` } : {};
      const url = `http://127.0.0.1:8000/api/core/db-explorer/table/?app_label=${app_label}&model_name=${model_name}&search=${encodeURIComponent(search)}&page=${page}`;
      const res = await axios.get(url, { headers });
      setTableData(res.data);
    } catch (error) {
      console.error('Error fetching table data:', error);
      showToast('خطا در بارگذاری داده‌های جدول', 'error');
    } finally {
      setTableLoading(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm(`آیا از حذف رکورد با شناسه ${id} اطمینان دارید؟ این عمل غیرقابل بازگشت است.`)) return;

    try {
      const token = localStorage.getItem('access_token');
      const headers = token && token !== 'null' && token !== 'undefined' ? { Authorization: `Bearer ${token}` } : {};
      const url = `http://127.0.0.1:8000/api/core/db-explorer/table/?app_label=${selectedModel.app_label}&model_name=${selectedModel.model_name}&id=${id}`;
      await axios.delete(url, { headers });
      showToast(`رکورد ${id} با موفقیت حذف شد.`);
      fetchTable(selectedModel.app_label, selectedModel.model_name, searchQuery, currentPage);
      fetchSummary();
    } catch (error) {
      console.error('Error deleting record:', error);
      showToast('خطا در حذف رکورد.', 'error');
    }
  };

  const handleUpdateRecord = async () => {
    if (!editingRow) return;

    try {
      const token = localStorage.getItem('access_token');
      const headers = token && token !== 'null' && token !== 'undefined' ? { Authorization: `Bearer ${token}` } : {};
      await axios.put('http://127.0.0.1:8000/api/core/db-explorer/table/', {
        app_label: selectedModel.app_label,
        model_name: selectedModel.model_name,
        id: editingRow.id,
        data: editingRow
      }, { headers });

      setEditingRow(null);
      showToast('رکورد با موفقیت بروزرسانی شد.');
      fetchTable(selectedModel.app_label, selectedModel.model_name, searchQuery, currentPage);
    } catch (error) {
      console.error('Error updating record:', error);
      showToast('خطا در بروزرسانی رکورد. لطفاً مقادیر را بررسی کنید.', 'error');
    }
  };

  const handleCreateRecord = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = token && token !== 'null' && token !== 'undefined' ? { Authorization: `Bearer ${token}` } : {};
      await axios.post('http://127.0.0.1:8000/api/core/db-explorer/table/', {
        app_label: selectedModel.app_label,
        model_name: selectedModel.model_name,
        data: newRowData
      }, { headers });

      setCreatingRow(false);
      setNewRowData({});
      showToast('رکورد جدید با موفقیت ایجاد شد.');
      fetchTable(selectedModel.app_label, selectedModel.model_name, searchQuery, 1);
      setCurrentPage(1);
      fetchSummary();
    } catch (error) {
      console.error('Error creating record:', error);
      showToast('خطا در ایجاد رکورد جدید. لطفاً ورودی‌ها را چک کنید.', 'error');
    }
  };

  const renderFieldInput = (f, value, onChange, isReadOnly) => {
    if (isReadOnly) {
      return (
        <input
          type="text"
          disabled
          value={value ?? ''}
          className="w-full text-xs rounded-lg p-2.5 border font-mono bg-gray-900/50 border-gray-800 text-gray-500 cursor-not-allowed"
        />
      );
    }

    if (f.choices && f.choices.length > 0) {
      return (
        <select
          className="w-full text-xs bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">انتخاب کنید...</option>
          {f.choices.map(c => (
            <option key={c.value} value={c.value}>{c.label} ({c.value})</option>
          ))}
        </select>
      );
    }

    switch (f.type) {
      case 'BooleanField':
        return (
          <select
            className="w-full text-xs bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={value === true ? 'true' : value === false ? 'false' : ''}
            onChange={(e) => onChange(e.target.value === 'true' ? true : e.target.value === 'false' ? false : null)}
          >
            <option value="">انتخاب کنید...</option>
            <option value="true">بله (True)</option>
            <option value="false">خیر (False)</option>
          </select>
        );
      case 'DateTimeField':
        // Format YYYY-MM-DDThh:mm string for datetime-local
        let dtValue = value || '';
        if (dtValue.endsWith('Z')) dtValue = dtValue.slice(0, -1);
        return (
          <input
            type="datetime-local"
            className="w-full text-xs bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={dtValue}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'DateField':
        return (
          <input
            type="date"
            className="w-full text-xs bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'TextField':
      case 'JSONField':
        let strValue = value ?? '';
        if (f.type === 'JSONField' && typeof strValue === 'object') {
          strValue = JSON.stringify(strValue, null, 2);
        }
        return (
          <textarea
            className="w-full text-xs bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 font-mono min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={strValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`مقدار ${f.verbose_name || f.name}...`}
          />
        );
      case 'IntegerField':
      case 'PositiveIntegerField':
      case 'FloatField':
      case 'DecimalField':
        return (
          <input
            type="number"
            step="any"
            className="w-full text-xs bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`مثال: 123`}
          />
        );
      default:
        return (
          <input
            type="text"
            placeholder={f.is_relation ? 'شناسه (ID) رکورد مرتبط' : `مقدار ${f.verbose_name || f.name}...`}
            className="w-full text-xs bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  const filteredSummary = activeCategory === 'all'
    ? summary
    : summary.filter(s => s.app_label === activeCategory);

  if (loading) return (
    <div className="flex items-center justify-center p-12 text-white dir-rtl">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span>در حال بارگذاری اطلاعات دیتابیس...</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 dir-rtl">
      {/* Toast Notification */}
      {statusMessage && (
        <div className={`p-4 rounded-xl font-semibold flex items-center justify-between shadow-lg transition-all ${
          statusMessage.type === 'error' ? 'bg-red-900/80 border border-red-500 text-red-200' : 'bg-emerald-900/80 border border-emerald-500 text-emerald-200'
        }`}>
          <span>{statusMessage.msg}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs opacity-75 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-800 scrollbar-none">
        {APP_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-gray-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Models Selector Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredSummary.map(item => {
          const isSelected = selectedModel?.app_label === item.app_label && selectedModel?.model_name === item.model_name;
          return (
            <button
              key={`${item.app_label}.${item.model_name}`}
              onClick={() => {
                setSelectedModel(item);
                setCurrentPage(1);
              }}
              className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between h-20 ${
                isSelected
                  ? 'bg-blue-900/40 border-blue-500 text-white shadow-lg ring-1 ring-blue-500/30'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
              }`}
            >
              <span className="text-xs font-bold truncate">{item.verbose_name}</span>
              <div className="flex justify-between items-baseline mt-2">
                <span className={`text-xl font-black ${isSelected ? 'text-blue-300' : 'text-white'}`}>
                  {item.count}
                </span>
                <span className="text-[9px] text-gray-500 font-mono dir-ltr">{item.model_name}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Model Data View */}
      {selectedModel && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white">مدیریت جدول: {selectedModel.verbose_name}</h2>
              <button
                onClick={() => {
                  setNewRowData({});
                  setCreatingRow(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-colors flex items-center gap-2"
              >
                <span>➕</span> رکورد جدید
              </button>
            </div>

            <div className="w-full md:w-80 relative">
              <input
                type="text"
                placeholder="جستجو در این جدول..."
                className="bg-gray-950 text-white text-xs rounded-xl px-4 py-2.5 border border-gray-700 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            {tableLoading ? (
              <div className="p-8 text-center text-gray-400">
                در حال بارگذاری داده‌ها...
              </div>
            ) : tableData.rows.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                هیچ رکوردی یافت نشد.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-gray-300 border-collapse">
                  <thead className="bg-gray-800/80 text-gray-300 font-bold border-b border-gray-700">
                    <tr>
                      {tableData.fields.slice(0, 6).map(f => (
                        <th key={f.name} className="px-4 py-3 whitespace-nowrap border-l border-gray-800">
                          {f.verbose_name || f.name}
                        </th>
                      ))}
                      <th className="px-4 py-3 whitespace-nowrap text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {tableData.rows.map(row => (
                      <tr key={row.id || JSON.stringify(row)} className="hover:bg-gray-800/40">
                        {tableData.fields.slice(0, 6).map(f => (
                          <td key={f.name} className="px-4 py-3 max-w-[120px] truncate font-mono border-l border-gray-800/40">
                            {row[f.name] === null ? (
                              <span className="text-gray-600 italic">null</span>
                            ) : typeof row[f.name] === 'boolean' ? (
                              row[f.name] ? 'بله' : 'خیر'
                            ) : (
                              String(row[f.name])
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setActiveJsonRow(row)}
                              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded-md text-[10px] transition-colors"
                            >
                              JSON
                            </button>
                            <button
                              onClick={() => setEditingRow({ ...row })}
                              className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded-md text-[10px] transition-colors"
                            >
                              ویرایش
                            </button>
                            {row.id && (
                              <button
                                onClick={() => handleDeleteRecord(row.id)}
                                className="bg-red-900/50 hover:bg-red-500/50 text-red-300 px-2 py-1 rounded-md text-[10px] transition-colors"
                              >
                                حذف
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tableData.total_pages > 1 && (
              <div className="p-3 bg-gray-850 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
                <span>صفحه {currentPage} از {tableData.total_pages}</span>
                <div className="flex gap-2">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 bg-gray-800 rounded disabled:opacity-30">قبلی</button>
                  <button disabled={currentPage >= tableData.total_pages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 bg-gray-800 rounded disabled:opacity-30">بعدی</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Form Modal (Create / Edit) */}
      {(creatingRow || editingRow) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-800 bg-gray-900">
              <h2 className="text-xl font-bold text-white flex justify-between items-center">
                <span>{creatingRow ? `ثبت رکورد جدید: ${selectedModel.verbose_name}` : `ویرایش رکورد: ${selectedModel.verbose_name} (ID: ${editingRow.id})`}</span>
                <button onClick={() => creatingRow ? setCreatingRow(false) : setEditingRow(null)} className="text-gray-400 hover:text-white">✕</button>
              </h2>
            </div>
            
            <div className="p-6 overflow-y-auto bg-gray-950 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Editable Fields */}
                {tableData.fields.filter(f => f.editable && f.name !== 'id').map(f => (
                  <div key={f.name} className="flex flex-col gap-1">
                    <label className="text-gray-200 text-sm font-semibold flex justify-between">
                      <span>{f.verbose_name || f.name}</span>
                      <span className="text-[10px] text-gray-600 font-mono dir-ltr">{f.name}</span>
                    </label>
                    {renderFieldInput(f, creatingRow ? newRowData[f.name] : editingRow[f.name], (val) => {
                      if (creatingRow) setNewRowData({ ...newRowData, [f.name]: val });
                      else setEditingRow({ ...editingRow, [f.name]: val });
                    }, false)}
                    
                    {/* Guidance / Help Text */}
                    <div className="text-[10px] text-gray-500 min-h-[16px] leading-tight">
                      {f.help_text ? f.help_text : f.is_relation ? 'شناسه عددی رکورد مرتبط را وارد کنید.' : ''}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-800">
                <h3 className="text-gray-400 text-xs font-bold mb-4">فیلدهای سیستمی (غیرقابل تغییر)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 opacity-60">
                  {tableData.fields.filter(f => !f.editable || f.name === 'id').map(f => (
                    <div key={f.name} className="flex flex-col gap-1">
                      <label className="text-gray-400 text-xs font-semibold">{f.verbose_name || f.name} <span className="font-mono dir-ltr">({f.name})</span></label>
                      {renderFieldInput(f, creatingRow ? newRowData[f.name] : editingRow[f.name], () => {}, true)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-800 bg-gray-900 flex gap-3">
              <button
                onClick={creatingRow ? handleCreateRecord : handleUpdateRecord}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {creatingRow ? 'ثبت و ذخیره رکورد' : 'اعمال تغییرات'}
              </button>
              <button
                onClick={() => creatingRow ? setCreatingRow(false) : setEditingRow(null)}
                className="px-6 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3 rounded-xl transition-colors"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Viewer Modal */}
      {activeJsonRow && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 p-6 rounded-2xl max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold">داده‌های خام (JSON)</h3>
              <button onClick={() => setActiveJsonRow(null)} className="text-gray-400">✕</button>
            </div>
            <pre className="bg-gray-950 p-4 rounded-xl text-emerald-400 text-xs font-mono overflow-auto max-h-[60vh] dir-ltr">
              {JSON.stringify(activeJsonRow, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDatabase;
