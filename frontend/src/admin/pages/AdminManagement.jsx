import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, ShieldAlert, UserCheck, UserPlus, Users, Search, 
  Lock, CheckCircle2, XCircle, Edit3, Trash2, Key, Sparkles, 
  AlertTriangle, RefreshCw, Layers, Shield, Award, Check, X, 
  Sliders, ArrowUpRight, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../../services/api';
import { 
  PANEL_DASHBOARD_PERMISSIONS, 
  PANEL_ADMIN_PERMISSIONS, 
  SENSITIVE_PERMISSIONS, 
  ROLE_PRESETS,
  hasAdminPermission 
} from '../../utils/adminPermissions';

export default function AdminManagement({ currentUser: propUser, isEmbedded = false }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [currentUser, setCurrentUser] = useState(propUser || null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('CREATE'); // 'CREATE' | 'EDIT'
  const [creationType, setCreationType] = useState('NEW'); // 'NEW' | 'PROMOTE'
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  // Form State
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formTitle, setFormTitle] = useState('ادمین سامانه');
  const [formRole, setFormRole] = useState('custom');
  const [formPermissions, setFormPermissions] = useState([]);
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Candidate Search State
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Section toggle states in modal
  const [openSections, setOpenSections] = useState({
    dashboard: true,
    admin: true,
    sensitive: true,
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // Fetch Current User if not provided
  useEffect(() => {
    if (!currentUser) {
      api.get('/users/me/')
        .then((res) => setCurrentUser(res.data))
        .catch(() => {});
    }
  }, [currentUser]);

  // Fetch Admins List
  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/admins/');
      setAdmins(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'خطا در دریافت لیست ادمین‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Search Candidates for promotion
  useEffect(() => {
    if (modalOpen && creationType === 'PROMOTE' && candidateQuery.trim().length >= 2) {
      const timer = setTimeout(async () => {
        setLoadingCandidates(true);
        try {
          const res = await api.get(`/users/admins/candidates/?q=${encodeURIComponent(candidateQuery)}`);
          setCandidates(res.data || []);
        } catch {
          setCandidates([]);
        } finally {
          setLoadingCandidates(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [modalOpen, creationType, candidateQuery]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('CREATE');
    setCreationType('NEW');
    setSelectedAdmin(null);
    setSelectedCandidate(null);
    setCandidateQuery('');
    setCandidates([]);
    setFormUsername('');
    setFormPassword('');
    setFormFullName('');
    setFormTitle('ادمین سامانه');
    setFormRole('custom');
    setFormPermissions([]);
    setFormIsActive(true);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (admin) => {
    setModalMode('EDIT');
    setSelectedAdmin(admin);
    setFormUsername(admin.username || '');
    setFormPassword('');
    setFormFullName(admin.full_name || '');
    const profile = admin.admin_profile || {};
    setFormRole(profile.admin_role || (admin.is_superuser ? 'superadmin' : 'custom'));
    setFormTitle(profile.title || 'ادمین سامانه');
    setFormPermissions(profile.permissions || (admin.is_superuser ? ['*'] : []));
    setFormIsActive(admin.is_active !== false);
    setModalOpen(true);
  };

  // Preset Role Selection
  const handleSelectRolePreset = (presetId) => {
    setFormRole(presetId);
    const preset = ROLE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setFormPermissions([...preset.permissions]);
    }
  };

  // Toggle Individual Permission
  const togglePermission = (permId) => {
    setFormPermissions((prev) => {
      if (prev.includes('*')) {
        // If it was superadmin with '*', convert to all individual perms minus this one
        const allKeys = [
          ...PANEL_DASHBOARD_PERMISSIONS.map((p) => p.id),
          ...PANEL_ADMIN_PERMISSIONS.map((p) => p.id),
          ...SENSITIVE_PERMISSIONS.map((p) => p.id),
        ];
        return allKeys.filter((k) => k !== permId);
      }
      if (prev.includes(permId)) {
        return prev.filter((k) => k !== permId);
      } else {
        return [...prev, permId];
      }
    });
    setFormRole('custom');
  };

  // Quick batch toggle for a category
  const toggleAllInCategory = (categoryList) => {
    const ids = categoryList.map((p) => p.id);
    const allChecked = ids.every((id) => formPermissions.includes('*') || formPermissions.includes(id));
    
    setFormPermissions((prev) => {
      let next = prev.includes('*')
        ? [
            ...PANEL_DASHBOARD_PERMISSIONS.map((p) => p.id),
            ...PANEL_ADMIN_PERMISSIONS.map((p) => p.id),
            ...SENSITIVE_PERMISSIONS.map((p) => p.id),
          ]
        : [...prev];

      if (allChecked) {
        next = next.filter((k) => !ids.includes(k));
      } else {
        ids.forEach((id) => {
          if (!next.includes(id)) next.push(id);
        });
      }
      return next;
    });
    setFormRole('custom');
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (modalMode === 'CREATE') {
        if (creationType === 'PROMOTE') {
          if (!selectedCandidate) {
            showToast('لطفاً یک کاربر یا مربی را جهت ارتقا انتخاب کنید.', 'error');
            setIsSubmitting(false);
            return;
          }
          await api.post('/users/admins/', {
            user_id: selectedCandidate.id,
            admin_role: formRole,
            title: formTitle,
            permissions: formPermissions,
          });
          showToast(`کاربر ${selectedCandidate.username} با موفقیت به سطح ادمین ارتقا یافت.`, 'success');
        } else {
          if (!formUsername || !formPassword) {
            showToast('نام کاربری و کلمه عبور الزامی هستند.', 'error');
            setIsSubmitting(false);
            return;
          }
          await api.post('/users/admins/', {
            username: formUsername,
            password: formPassword,
            full_name: formFullName,
            admin_role: formRole,
            title: formTitle,
            permissions: formPermissions,
          });
          showToast(`ادمین جدید ${formUsername} با موفقیت ایجاد شد.`, 'success');
        }
      } else {
        // Edit Mode
        const payload = {
          full_name: formFullName,
          title: formTitle,
          admin_role: formRole,
          permissions: formPermissions,
          is_active: formIsActive,
        };
        if (formPassword) payload.password = formPassword;
        await api.patch(`/users/admins/${selectedAdmin.id}/`, payload);
        showToast(`اطلاعات و دسترسی‌های ادمین ${selectedAdmin.username} بروزرسانی شد.`, 'success');
      }
      setModalOpen(false);
      fetchAdmins();
    } catch (err) {
      showToast(err.response?.data?.error || 'خطا در ذخیره اطلاعات ادمین', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demote Admin Handler
  const handleDemote = async (admin) => {
    if (admin.is_superuser) {
      showToast('حساب‌های سوپرادمین مصون بوده و قابل عزل نیستند.', 'error');
      return;
    }
    if (admin.id === currentUser?.id) {
      showToast('شما نمی‌توانید حساب کاربری خودتان را عزل کنید.', 'error');
      return;
    }
    if (!window.confirm(`آیا از عزل نقش ادمین برای کاربر «${admin.username}» اطمینان دارید؟ این کاربر به سطح مربی بازخواهد گشت.`)) {
      return;
    }
    try {
      await api.delete(`/users/admins/${admin.id}/`);
      showToast(`نقش ادمین از کاربر ${admin.username} سلب شد.`, 'success');
      fetchAdmins();
    } catch (err) {
      showToast(err.response?.data?.error || 'خطا در عزل ادمین', 'error');
    }
  };

  // Filtered Admins
  const filteredAdmins = useMemo(() => {
    return (admins || []).filter((a) => {
      const profile = a.admin_profile || {};
      const assignedRole = profile.admin_role || (a.is_superuser ? 'superadmin' : 'custom');
      
      const matchesRole = roleFilter === 'ALL' || assignedRole === roleFilter;
      const q = search.trim().toLowerCase();
      const matchesQuery = !q || 
        String(a.username || '').toLowerCase().includes(q) ||
        String(a.full_name || '').toLowerCase().includes(q) ||
        String(profile.title || '').toLowerCase().includes(q) ||
        String(a.team_name || '').toLowerCase().includes(q);

      return matchesRole && matchesQuery;
    });
  }, [admins, roleFilter, search]);

  // Statistics
  const stats = useMemo(() => {
    const list = admins || [];
    return {
      total: list.length,
      superadmins: list.filter((a) => a.is_superuser || a.admin_profile?.admin_role === 'superadmin').length,
      referees: list.filter((a) => a.admin_profile?.admin_role === 'referee').length,
      financial: list.filter((a) => a.admin_profile?.admin_role === 'financial_manager').length,
      transfers: list.filter((a) => a.admin_profile?.admin_role === 'transfer_manager').length,
      active: list.filter((a) => a.is_active !== false).length,
    };
  }, [admins]);

  const canManageAdmins = currentUser?.is_superuser || hasAdminPermission(currentUser, 'sensitive_admin_rbac_manage');

  return (
    <div className={`space-y-6 dir-rtl font-sans ${isEmbedded ? '' : 'p-4 lg:p-8 max-w-7xl mx-auto'}`}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100000] px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 text-sm font-bold ${
              toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/50'
                : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 p-6 lg:p-8 border border-slate-800/80 shadow-2xl">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold mb-3">
              <ShieldCheck size={14} />
              <span>سیستم کنترل دسترسی نقش‌محور (RBAC)</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              مدیریت ادمین‌ها و تفکیک سطوح دسترسی
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              تخصیص نقش‌های سازمانی، تعریف ریزدسترسی‌ها برای هر دو پنل ادمین، و کنترل دقیق اختیارات حساس مالی، ایردراپ و داوری مسابقات.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchAdmins}
              className="p-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all cursor-pointer shadow-md active:scale-95"
              title="بروزرسانی داده‌ها"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin text-cyan-400' : ''} />
            </button>

            {canManageAdmins && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all cursor-pointer active:scale-95"
              >
                <UserPlus size={18} />
                <span>تعریف / ارتقای ادمین</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
            <span className="text-xs text-slate-400 font-bold">کل ادمین‌ها</span>
            <span className="text-xl font-black text-white mt-1">{stats.total}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/20 flex flex-col">
            <span className="text-xs text-rose-300 font-bold">سوپرادمین‌ها</span>
            <span className="text-xl font-black text-rose-400 mt-1">{stats.superadmins}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/20 flex flex-col">
            <span className="text-xs text-amber-300 font-bold">داوران مسابقات</span>
            <span className="text-xl font-black text-amber-400 mt-1">{stats.referees}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex flex-col">
            <span className="text-xs text-emerald-300 font-bold">مدیران مالی</span>
            <span className="text-xl font-black text-emerald-400 mt-1">{stats.financial}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex flex-col">
            <span className="text-xs text-cyan-300 font-bold">مدیران ترنسفر</span>
            <span className="text-xl font-black text-cyan-400 mt-1">{stats.transfers}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
            <span className="text-xs text-slate-400 font-bold">وضعیت فعال</span>
            <span className="text-xl font-black text-emerald-400 mt-1">{stats.active}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 backdrop-blur-xl">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در نام، نام کاربری یا مسئولیت..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'همه نقش‌ها' },
            { id: 'superadmin', label: 'سوپرادمین' },
            { id: 'referee', label: 'داور' },
            { id: 'financial_manager', label: 'مالی' },
            { id: 'transfer_manager', label: 'ترنسفر' },
            { id: 'custom', label: 'سفارشی' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                roleFilter === tab.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Admins Table / Cards */}
      <div className="rounded-3xl bg-slate-950/80 border border-slate-800/80 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="font-bold">در حال بارگذاری اطلاعات ادمین‌ها...</p>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <ShieldAlert size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold text-base">هیچ ادمینی با معیارهای جستجو یافت نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/50 text-slate-400 text-xs font-bold">
                  <th className="p-4 pr-6">ادمین</th>
                  <th className="p-4">نقش سازمانی</th>
                  <th className="p-4">عنوان شغلی / مسئولیت</th>
                  <th className="p-4">پوشش دسترسی‌ها</th>
                  <th className="p-4">وضعیت</th>
                  <th className="p-4 text-center pl-6">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredAdmins.map((admin) => {
                  const profile = admin.admin_profile || {};
                  const isSuper = admin.is_superuser || profile.admin_role === 'superadmin';
                  const preset = ROLE_PRESETS.find((p) => p.id === profile.admin_role) || {
                    title: isSuper ? 'سوپرادمین' : 'سفارشی',
                    badgeColor: isSuper ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                  };
                  const perms = isSuper ? ['*'] : (profile.permissions || []);
                  const isSelf = admin.id === currentUser?.id;

                  return (
                    <tr key={admin.id} className="hover:bg-slate-900/40 transition-colors">
                      {/* Name & Username */}
                      <td className="p-4 pr-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border shadow-inner ${
                            isSuper 
                              ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                              : 'bg-slate-900 border-slate-700 text-cyan-400'
                          }`}>
                            {String(admin.username || 'AD').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-white">{admin.full_name || admin.username}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold">
                                  حساب شما
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>@{admin.username}</span>
                              {admin.team_name && (
                                <span className="text-slate-500">| باشگاه: {admin.team_name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Role */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${preset.badgeColor}`}>
                          {isSuper ? <Sparkles size={13} /> : <Shield size={13} />}
                          <span>{preset.title}</span>
                        </span>
                      </td>

                      {/* Custom Title */}
                      <td className="p-4">
                        <span className="text-slate-300 font-bold">{profile.title || 'ادمین سامانه'}</span>
                      </td>

                      {/* Permissions Coverage */}
                      <td className="p-4">
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-500/30">
                            <Lock size={12} />
                            <span>دسترسی کامل (نامحدود)</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                              {perms.length} مجوز فعال
                            </span>
                            {perms.some((p) => SENSITIVE_PERMISSIONS.some((sp) => sp.id === p)) && (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-500/30" title="دارای اختیارات حساس">
                                حساس ⚠️
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        {admin.is_active !== false ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>فعال</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-rose-400 font-bold">
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            <span>غیرفعال</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 pl-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(admin)}
                            disabled={!canManageAdmins || (isSuper && !currentUser?.is_superuser)}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 hover:text-white hover:border-cyan-400 hover:bg-cyan-950/40 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                            title="تنظیم و ویرایش دسترسی‌ها"
                          >
                            <Sliders size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDemote(admin)}
                            disabled={!canManageAdmins || isSuper || isSelf}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-rose-400 hover:text-white hover:border-rose-500 hover:bg-rose-950/40 transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed shadow-sm"
                            title={isSuper ? 'سوپرادمین قابل عزل نیست' : isSelf ? 'نمی‌توانید خودتان را عزل کنید' : 'عزل ادمین'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT ADMIN MODAL (MANDATORY REACT PORTAL) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {modalOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
              <div className="fixed inset-0" onClick={() => !isSubmitting && setModalOpen(false)} />
              
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative z-10 bg-slate-950 rounded-3xl w-full max-w-4xl my-auto p-6 md:p-8 border border-slate-800 shadow-2xl space-y-6 text-right max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      <ShieldCheck className="text-cyan-400" size={22} />
                      <span>{modalMode === 'CREATE' ? 'تعریف یا ارتقای ادمین جدید' : `ویرایش دسترسی‌های @${formUsername}`}</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      نقش و تیک‌های بخش‌های مختلف را متناسب با مسئولیت فرد در دو پنل مشخص نمایید.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Mode Selector for Create (New vs Promote) */}
                  {modalMode === 'CREATE' && (
                    <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setCreationType('NEW')}
                        className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          creationType === 'NEW'
                            ? 'bg-cyan-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ➕ ساخت ادمین جدید با نام کاربری و رمز
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreationType('PROMOTE')}
                        className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          creationType === 'PROMOTE'
                            ? 'bg-cyan-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🎖️ ارتقای مربی یا کاربر موجود در سیستم
                      </button>
                    </div>
                  )}

                  {/* Account Identification Inputs */}
                  {modalMode === 'CREATE' && creationType === 'PROMOTE' ? (
                    <div className="space-y-3 p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
                      <label className="block text-xs font-bold text-slate-300">
                        جستجو و انتخاب مربی یا کاربر:
                      </label>
                      <div className="relative">
                        <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={candidateQuery}
                          onChange={(e) => setCandidateQuery(e.target.value)}
                          placeholder="نام کاربری یا نام تیم را تایپ کنید..."
                          className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {loadingCandidates && (
                        <p className="text-xs text-cyan-400 animate-pulse">در حال جستجو...</p>
                      )}

                      {candidates.length > 0 && (
                        <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                          {candidates.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedCandidate(c);
                                setCandidateQuery(c.username);
                                setFormFullName(c.full_name || '');
                              }}
                              className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-all ${
                                selectedCandidate?.id === c.id
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : 'hover:bg-slate-900 text-slate-300'
                              }`}
                            >
                              <span className="font-bold">@{c.username} ({c.full_name || 'بدون نام'})</span>
                              <span className="text-slate-400">{c.team_name ? `تیم: ${c.team_name}` : 'کاربر'}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedCandidate && (
                        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 size={16} />
                          <span>کاربر انتخاب شد: <strong>@{selectedCandidate.username}</strong></span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          نام کاربری <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          disabled={modalMode === 'EDIT'}
                          value={formUsername}
                          onChange={(e) => setFormUsername(e.target.value)}
                          placeholder="مثال: referee_reza"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          {modalMode === 'CREATE' ? 'کلمه عبور' : 'کلمه عبور جدید (اختیاری)'}
                        </label>
                        <input
                          type="password"
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          placeholder={modalMode === 'EDIT' ? 'تنها در صورت نیاز به تغییر وارد کنید' : 'حداقل ۴ کاراکتر'}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                          required={modalMode === 'CREATE' && creationType === 'NEW'}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          نام و نام خانوادگی
                        </label>
                        <input
                          type="text"
                          value={formFullName}
                          onChange={(e) => setFormFullName(e.target.value)}
                          placeholder="مثال: علیرضا فغانی"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Title & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        عنوان شغلی / مسئولیت
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="مثال: سرپرست داوران، مدیر نقل‌وانتقالات، حسابدار کل"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {modalMode === 'EDIT' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          وضعیت حساب کاربری
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormIsActive(!formIsActive)}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            formIsActive
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {formIsActive ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                          <span>{formIsActive ? 'حساب فعال است' : 'حساب مسدود / غیرفعال است'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Role Template Presets */}
                  <div className="space-y-3 pt-4 border-t border-slate-800">
                    <label className="block text-xs font-bold text-slate-300">
                      الگوی نقش آماده (با انتخاب هر نقش، تیک‌های مربوطه فعال می‌شوند):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                      {ROLE_PRESETS.map((preset) => {
                        const isSelected = formRole === preset.id;
                        const isSuperPreset = preset.id === 'superadmin';
                        const disabled = isSuperPreset && !currentUser?.is_superuser;

                        return (
                          <button
                            key={preset.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => handleSelectRolePreset(preset.id)}
                            className={`p-3 rounded-2xl border text-right transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                              isSelected
                                ? 'bg-cyan-500/20 border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.02]'
                                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400'
                            }`}
                          >
                            <div className="font-black text-xs text-white">{preset.title}</div>
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {preset.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 3: Granular Permission Checkboxes Matrix */}
                  <div className="space-y-4 pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-white flex items-center gap-2">
                        <Layers size={16} className="text-cyan-400" />
                        <span>ماتریس تفکیک ریزدسترسی‌ها و اختیارات حساس</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const all = [
                              ...PANEL_DASHBOARD_PERMISSIONS.map((p) => p.id),
                              ...PANEL_ADMIN_PERMISSIONS.map((p) => p.id),
                              ...SENSITIVE_PERMISSIONS.map((p) => p.id),
                            ];
                            setFormPermissions(all);
                            setFormRole('custom');
                          }}
                          className="text-[11px] font-bold text-cyan-400 hover:underline cursor-pointer"
                        >
                          انتخاب همه تیک‌ها
                        </button>
                        <span className="text-slate-600">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormPermissions([]);
                            setFormRole('custom');
                          }}
                          className="text-[11px] font-bold text-slate-400 hover:text-white hover:underline cursor-pointer"
                        >
                          لغو همه
                        </button>
                      </div>
                    </div>

                    {/* Section 1: Dashboard Panel */}
                    <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenSections((prev) => ({ ...prev, dashboard: !prev.dashboard }))}
                        className="w-full p-3.5 bg-slate-900 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-850 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          <span>۱. بخش‌های پنل سریع برنامه اصلی (/dashboard)</span>
                          <span className="text-[10px] text-slate-400">({PANEL_DASHBOARD_PERMISSIONS.length} بخش)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAllInCategory(PANEL_DASHBOARD_PERMISSIONS);
                            }}
                            className="text-[10px] text-cyan-400 hover:underline font-bold"
                          >
                            تغییر دسته‌جمعی
                          </button>
                          {openSections.dashboard ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      {openSections.dashboard && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {PANEL_DASHBOARD_PERMISSIONS.map((item) => {
                            const isChecked = formPermissions.includes('*') || formPermissions.includes(item.id);
                            return (
                              <label
                                key={item.id}
                                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                  isChecked
                                    ? 'bg-cyan-950/30 border-cyan-500/40 text-white'
                                    : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:border-slate-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(item.id)}
                                  className="mt-1 rounded accent-cyan-500 cursor-pointer"
                                />
                                <div>
                                  <div className="font-bold text-xs">{item.label}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Section 2: Admin Portal */}
                    <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenSections((prev) => ({ ...prev, admin: !prev.admin }))}
                        className="w-full p-3.5 bg-slate-900 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-850 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          <span>۲. صفحات پورتال ارشد ادمین (/admin)</span>
                          <span className="text-[10px] text-slate-400">({PANEL_ADMIN_PERMISSIONS.length} صفحه)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAllInCategory(PANEL_ADMIN_PERMISSIONS);
                            }}
                            className="text-[10px] text-cyan-400 hover:underline font-bold"
                          >
                            تغییر دسته‌جمعی
                          </button>
                          {openSections.admin ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      {openSections.admin && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {PANEL_ADMIN_PERMISSIONS.map((item) => {
                            const isChecked = formPermissions.includes('*') || formPermissions.includes(item.id);
                            return (
                              <label
                                key={item.id}
                                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                  isChecked
                                    ? 'bg-blue-950/30 border-blue-500/40 text-white'
                                    : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:border-slate-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(item.id)}
                                  className="mt-1 rounded accent-blue-500 cursor-pointer"
                                />
                                <div>
                                  <div className="font-bold text-xs">{item.label}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Section 3: SENSITIVE ACTIONS (Red/Amber Warning styling) */}
                    <div className="rounded-2xl bg-rose-950/20 border border-rose-500/30 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenSections((prev) => ({ ...prev, sensitive: !prev.sensitive }))}
                        className="w-full p-3.5 bg-rose-950/40 flex items-center justify-between text-xs font-bold text-rose-200 hover:bg-rose-950/60 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                          <span className="font-black text-rose-300">۳. اختیارات و دسترسی‌های حساس عملیاتی (تزریق جم، بودجه، داوری و ریست)</span>
                          <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                            نیازمند احتیاط بالا
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAllInCategory(SENSITIVE_PERMISSIONS);
                            }}
                            className="text-[10px] text-rose-300 hover:underline font-bold"
                          >
                            تغییر دسته‌جمعی
                          </button>
                          {openSections.sensitive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      {openSections.sensitive && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {SENSITIVE_PERMISSIONS.map((item) => {
                            const isChecked = formPermissions.includes('*') || formPermissions.includes(item.id);
                            return (
                              <label
                                key={item.id}
                                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                  isChecked
                                    ? 'bg-rose-950/50 border-rose-500/60 text-white shadow-lg shadow-rose-950/40'
                                    : 'bg-slate-950/60 border-rose-900/30 text-slate-400 hover:border-rose-700/50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(item.id)}
                                  className="mt-1 rounded accent-rose-500 cursor-pointer"
                                />
                                <div>
                                  <div className="font-bold text-xs flex items-center gap-2">
                                    <span>{item.label}</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                      {item.badge}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit / Cancel Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      انصراف
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? 'در حال ذخیره‌سازی...' : modalMode === 'CREATE' ? 'ثبت و اعمال دسترسی‌ها' : 'بروزرسانی دسترسی‌ها'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
