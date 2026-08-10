import React from 'react';

const AdminDashboard = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">داشبورد مدیریت سیستم</h1>

      {/* Info Guide Box */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-5 text-gray-200 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">💡</span>
          <h3 className="text-lg font-bold text-blue-300">راهنمای داشبورد ادمین</h3>
        </div>
        <p className="text-sm leading-relaxed text-gray-300">
          این بخش نمای کلی سیستم، تعداد رکوردهای فعال و وضعیت کلی فصل/هفته لیگ را نمایش می‌دهد. از طریق سایدبار کناری می‌توانید مسابقات، بازیکنان، تیم‌ها، بودجه/تسهیلات و دیتابیس را به صورت زنده مدیریت کنید.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-gray-400 font-medium mb-2">تعداد کاربران ثبت‌شده</h3>
          <p className="text-3xl font-bold text-white">فعال</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-gray-400 font-medium mb-2">تعداد تیم‌های لیگ</h3>
          <p className="text-3xl font-bold text-white">۱۶ تیم</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-gray-400 font-medium mb-2">وضعیت جاری لیگ</h3>
          <p className="text-3xl font-bold text-blue-400">فصل ۱ - هفته ۱</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
