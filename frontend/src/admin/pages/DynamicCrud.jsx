import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Tooltip from '../components/Tooltip';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useParams } from 'react-router-dom';

const DynamicCrud = () => {
  const { model } = useParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  
  // Form State
  const [formFields, setFormFields] = useState({});
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, [model]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/${model}/`);
      setData(res.data.results || res.data);
    } catch (err) {
      showToast(`خطا در دریافت لیست ${model}`, 'error');
      setData([]);
    }
    setLoading(false);
  };

  const columns = data.length > 0 ? Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object') : [];

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/admin/${model}/`, formFields);
      showToast(`رکورد جدید در ${model} ایجاد شد`, 'success');
      setIsAddModalOpen(false);
      setFormFields({});
      fetchData();
    } catch (err) {
      showToast('خطا در ایجاد رکورد جدید', 'error');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedRow) return;
    try {
      await api.patch(`/admin/${model}/${selectedRow.id}/`, formFields);
      showToast('رکورد با موفقیت بروزرسانی شد', 'success');
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      showToast('خطا در بروزرسانی رکورد', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedRow) return;
    try {
      await api.delete(`/admin/${model}/${selectedRow.id}/`);
      showToast('رکورد با موفقیت حذف شد', 'success');
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (err) {
      showToast('خطا در حذف رکورد', 'error');
    }
  };

  const openAddModal = () => {
    const initialForm = {};
    columns.forEach(col => { if (col !== 'id') initialForm[col] = ''; });
    setFormFields(initialForm);
    setIsAddModalOpen(true);
  };

  const openEditModal = (row) => {
    setSelectedRow(row);
    const initialForm = {};
    columns.forEach(col => { if (col !== 'id') initialForm[col] = row[col] ?? ''; });
    setFormFields(initialForm);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (row) => {
    setSelectedRow(row);
    setIsDeleteModalOpen(true);
  };

  const filteredData = data.filter(row =>
    Object.values(row).some(val => String(val).toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{fontFamily: 'Vazirmatn, Tahoma, sans-serif'}}>
      <header className="admin-header">
        <h1 dir="ltr" style={{textTransform: 'capitalize', textAlign: 'right'}}>
          {model.replace('-', ' ')} <span dir="rtl">دیتابیس</span>
        </h1>
        <button className="admin-btn success" onClick={openAddModal}>+ ایجاد رکورد جدید</button>
      </header>
      
      <div className="glass-panel" style={{marginTop: '2rem', padding: '1.5rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
          <input 
            type="text" 
            className="admin-input" 
            placeholder="جستجو در تمام ستون‌ها..." 
            style={{maxWidth: '400px'}}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Tooltip title="مدیریت داده پویا (CRUD)" description="این رابط کاربری به‌طور خودکار با ساختار مدل درخواستی از بک‌اند سازگار می‌شود." />
        </div>
        
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                {columns.map(col => <th key={col} dir="ltr" style={{textAlign: 'right'}}>{col}</th>)}
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length + 1} style={{textAlign: 'center'}}>در حال بارگذاری داده‌ها...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={columns.length + 1} style={{textAlign: 'center', padding: '2rem', color: 'var(--admin-text-muted)'}}>هیچ رکوردی یافت نشد.</td></tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr key={row.id || idx}>
                    {columns.map(col => (
                      <td key={col} dir="ltr" style={{textAlign: 'right', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                        {String(row[col])}
                      </td>
                    ))}
                    <td>
                      <button 
                        className="admin-btn secondary" 
                        style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem', marginLeft: '0.5rem'}}
                        onClick={() => openEditModal(row)}
                      >
                        ویرایش
                      </button>
                      <button 
                        className="admin-btn danger" 
                        style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem'}}
                        onClick={() => openDeleteModal(row)}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={`ایجاد رکورد جدید در ${model}`}>
        <form onSubmit={handleCreate}>
          {columns.filter(col => col !== 'id').map(col => (
            <div key={col} style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', textTransform: 'capitalize'}}>{col}</label>
              <input 
                type="text" 
                className="admin-input" 
                value={formFields[col] || ''} 
                onChange={(e) => setFormFields({...formFields, [col]: e.target.value})} 
                dir="ltr" 
              />
            </div>
          ))}
          <div className="modal-footer" style={{paddingBottom: 0}}>
            <button type="button" className="admin-btn secondary" onClick={() => setIsAddModalOpen(false)}>انصراف</button>
            <button type="submit" className="admin-btn success">ایجاد</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`ویرایش رکورد #${selectedRow?.id} در ${model}`}>
        <form onSubmit={handleUpdate}>
          {columns.filter(col => col !== 'id').map(col => (
            <div key={col} style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', textTransform: 'capitalize'}}>{col}</label>
              <input 
                type="text" 
                className="admin-input" 
                value={formFields[col] || ''} 
                onChange={(e) => setFormFields({...formFields, [col]: e.target.value})} 
                dir="ltr" 
              />
            </div>
          ))}
          <div className="modal-footer" style={{paddingBottom: 0}}>
            <button type="button" className="admin-btn secondary" onClick={() => setIsEditModalOpen(false)}>انصراف</button>
            <button type="submit" className="admin-btn success">ذخیره تغییرات</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="تایید حذف رکورد">
        <p>آیا از حذف رکورد شناسه <strong>#{selectedRow?.id}</strong> از دیتابیس <strong>{model}</strong> اطمینان دارید؟</p>
        <div className="modal-footer">
          <button type="button" className="admin-btn secondary" onClick={() => setIsDeleteModalOpen(false)}>انصراف</button>
          <button type="button" className="admin-btn danger" onClick={handleDelete}>حذف قطعی</button>
        </div>
      </Modal>
    </div>
  );
};

export default DynamicCrud;
