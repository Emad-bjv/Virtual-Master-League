/**
 * Virtual Master League - Admin RBAC (Role-Based Access Control)
 * Central Definitions for Permission Keys, Categories, and Role Presets.
 */

export const PANEL_DASHBOARD_PERMISSIONS = [
  { id: 'panel_dashboard_overview', label: 'داشبورد ارشد', desc: 'مشاهده آمار کلان، نمودارها و وضعیت زنده لیگ' },
  { id: 'panel_dashboard_live_referee', label: 'اتاق داوری و کنترل مسابقات', desc: 'مدیریت زنده مسابقات، ثبت وقایع و تغییرات تاکتیکی' },
  { id: 'panel_dashboard_rapid_stats', label: 'ثبت سریع آمار PES و نمرات', desc: 'ثبت آمار ۱۰ گانه تیمی و نمرات بازیکنان' },
  { id: 'panel_dashboard_tournaments', label: 'مدیریت لیگ و جام حذفی', desc: 'مشاهده جدول، تقویم و ساختار تورنمنت‌ها' },
  { id: 'panel_dashboard_transactions', label: 'مدیریت واریزی‌ها و تراکنش‌ها', desc: 'مشاهده فیش‌های واریزی و لیست تراکنش‌های کاربران' },
  { id: 'panel_dashboard_store_packages', label: 'مدیریت بسته‌های فروشگاه', desc: 'تعریف و ویرایش پکیج‌های فروشگاهی و قیمت‌ها' },
  { id: 'panel_dashboard_airdrop', label: 'پاداش و ایردراپ همگانی', desc: 'مشاهده تاریخچه ایردراپ‌ها و فرم اعطای جم/بودجه' },
  { id: 'panel_dashboard_packs', label: 'مدیریت پک‌ها و سیزن پس', desc: 'تنظیمات پک‌های شانس و جوایز سطوح سیزن پس' },
  { id: 'panel_dashboard_coach_registration', label: 'مدیریت و ثبت مربیان', desc: 'ثبت باشگاه و مربی جدید در سیستم' },
  { id: 'panel_dashboard_audit_logs', label: 'گزارش تغییرات سیستم', desc: 'مشاهده لاگ‌های ممیزی عملیات درون‌برنامه‌ای' },
  { id: 'panel_dashboard_admin_management', label: 'مدیریت ادمین‌ها و دسترسی‌ها', desc: 'دسترسی به تب تنظیم دسترسی ادمین‌ها در پنل سریع' },
];

export const PANEL_ADMIN_PERMISSIONS = [
  { id: 'panel_admin_overview', label: 'داشبورد اصلی پورتال', desc: 'نمای کلی پورتال ارشد مدیریت سامانه' },
  { id: 'panel_admin_squad_transfers', label: 'نقل‌وانتقال و ترکیب تیم‌ها', desc: 'مدیریت اسکواد، نقل‌وانتقال بازیکنان بین تیم‌ها' },
  { id: 'panel_admin_packs', label: 'مدیریت پک‌ها و کارت‌ها', desc: 'استودیو ساخت پک و کارت‌های بازیکنان' },
  { id: 'panel_admin_pes_skills', label: 'تقویت مهارت‌های PES', desc: 'مدیریت اسکیل‌ها و توانایی‌های اختصاصی PES' },
  { id: 'panel_admin_newsroom', label: 'اتاق خبر و نقل‌وانتقالات', desc: 'انتشار اخبار رسمی نقل‌وانتقالات و مصاحبه‌ها' },
  { id: 'panel_admin_live_control', label: 'مدیریت پخش زنده و بازی‌ها', desc: 'استریم زنده و کنترل ویدیویی مسابقات' },
  { id: 'panel_admin_users', label: 'مدیریت کاربران', desc: 'مشاهده و مدیریت کلیه حساب‌های کاربری سیستم' },
  { id: 'panel_admin_coaches', label: 'نظارت بر تیم‌ها و مربیان', desc: 'مشاهده جزئیات، وضعیت و اسکواد باشگاه‌ها' },
  { id: 'panel_admin_financial', label: 'کنترل مالی و تسهیلات', desc: 'نظارت بر اقتصاد کلان، درآمدها و گردش مالی' },
  { id: 'panel_admin_settings', label: 'تنظیمات سیستم', desc: 'پیکربندی پارامترهای اصلی و فنی پلتفرم' },
  { id: 'panel_admin_audit', label: 'لاگ‌های حسابرسی', desc: 'بررسی رویدادها و لاگ‌های امنیتی سرور' },
  { id: 'panel_admin_database_crud', label: 'پایگاه داده مستقیم (CRUD)', desc: 'دسترسی به جداول خام پایگاه داده' },
  { id: 'panel_admin_admins', label: 'مدیریت ادمین‌ها در پورتال', desc: 'دسترسی به صفحه مدیریت ادمین‌ها در پورتال ارشد' },
];

export const SENSITIVE_PERMISSIONS = [
  { id: 'sensitive_grant_rewards', label: '🎁 اعطای پاداش و ایردراپ همگانی', desc: 'تزریق جم (💎) و بودجه دلاری (💵) رایگان به باشگاه‌ها', badge: 'بسیار حساس' },
  { id: 'sensitive_club_finances_manage', label: '💰 ویرایش مستقیم بودجه و جم باشگاه‌ها', desc: 'تغییر دستی بودجه نقدی، جم و سقف دستمزد هر باشگاه', badge: 'بسیار حساس' },
  { id: 'sensitive_financial_approve', label: '💳 تایید یا رد واریزی‌ها و تراکنش‌ها', desc: 'تایید فیش‌های پرداختی و شارژ مستقیم کیف پول مربیان', badge: 'بسیار حساس' },
  { id: 'sensitive_system_settings_reset', label: '⚠️ ریست‌های زیرساختی سیستم', desc: 'ریست کلی بودجه باشگاه‌ها، ریست بازار، و ریست لیگ', badge: 'خطرناک' },
  { id: 'sensitive_match_tampering', label: '⚽ تغییر دستی اسکوربورد و پایان اجباری مسابقه', desc: 'تغییر نتیجه بازی‌ها، اتمام فوری، و ریست رویدادهای زنده', badge: 'حساس' },
  { id: 'sensitive_tournament_manage', label: '🏆 مدیریت و ریست تورنمنت‌ها', desc: 'ایجاد لیگ، قرعه‌کشی حذفی، و تغییر جدول مسابقات', badge: 'حساس' },
  { id: 'sensitive_user_ban_delete', label: '🚫 مسدودسازی و عزل حساب مربیان', desc: 'مسدود کردن، تغییر رمز عبور و اخراج مربیان/کاربران', badge: 'حساس' },
  { id: 'sensitive_admin_rbac_manage', label: '👑 مدیریت سطوح دسترسی سایر ادمین‌ها', desc: 'تعریف ادمین جدید، ارتقا کاربر، و ویرایش مجوزها', badge: 'فوق امنیتی' },
];

export const ROLE_PRESETS = [
  {
    id: 'superadmin',
    title: 'سوپرادمین (مدیر ارشد سامانه)',
    description: 'دسترسی کامل و نامحدود به تمامی بخش‌ها و اختیارات حساس در هر دو پنل',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    permissions: ['*'],
  },
  {
    id: 'referee',
    title: 'داور و کنترل مسابقات',
    description: 'اتاق داوری زنده، ثبت آمار ۱۰ گانه PES، نمرات بازیکنان، پخش زنده و اسکیل‌ها',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    permissions: [
      'panel_dashboard_overview',
      'panel_dashboard_live_referee',
      'panel_dashboard_rapid_stats',
      'panel_dashboard_tournaments',
      'panel_admin_overview',
      'panel_admin_live_control',
      'panel_admin_pes_skills',
      'sensitive_match_tampering',
    ],
  },
  {
    id: 'financial_manager',
    title: 'مدیر مالی و فروشگاه',
    description: 'مدیریت واریزی‌ها، تراکنش‌ها، بسته‌های فروشگاه، پاداش‌ها و ویرایش بودجه/جم باشگاه‌ها',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    permissions: [
      'panel_dashboard_overview',
      'panel_dashboard_transactions',
      'panel_dashboard_store_packages',
      'panel_dashboard_airdrop',
      'panel_admin_overview',
      'panel_admin_financial',
      'panel_admin_coaches',
      'sensitive_financial_approve',
      'sensitive_grant_rewards',
      'sensitive_club_finances_manage',
    ],
  },
  {
    id: 'transfer_manager',
    title: 'مدیر نقل‌وانتقالات و تیم‌ها',
    description: 'ترکیب و نقل‌وانتقالات، پک‌ها، مهارت‌های PES، اتاق خبر، نظارت بر مربیان و ثبت باشگاه',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    permissions: [
      'panel_dashboard_overview',
      'panel_dashboard_coach_registration',
      'panel_dashboard_packs',
      'panel_admin_overview',
      'panel_admin_squad_transfers',
      'panel_admin_packs',
      'panel_admin_pes_skills',
      'panel_admin_newsroom',
      'panel_admin_coaches',
    ],
  },
  {
    id: 'custom',
    title: 'سفارشی (تخصیص اختصاصی)',
    description: 'انتخاب دلخواه و دستی تک‌تک بخش‌ها و دسترسی‌های حساس متناسب با مسئولیت فرد',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    permissions: [],
  },
];

/**
 * Checks if a user has a specific admin permission.
 * Superadmins and users with '*' always have all permissions.
 */
export const hasAdminPermission = (user, permissionKey) => {
  if (!user) return false;
  if (user.is_superuser || user.role === 'superadmin') return true;
  const adminRole = user.admin_role || (user.admin_profile && user.admin_profile.admin_role);
  if (adminRole === 'superadmin') return true;
  const perms = user.admin_permissions || (user.admin_profile && user.admin_profile.permissions) || [];
  if (perms.includes('*')) return true;
  return perms.includes(permissionKey);
};
