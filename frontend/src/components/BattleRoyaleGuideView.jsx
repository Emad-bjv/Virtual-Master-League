import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Flame, Trophy, Clock, ArrowLeftRight, 
  Sparkles, RefreshCw, Zap, UserCheck
} from 'lucide-react';

export default function BattleRoyaleGuideView() {
  return (
    <div className="space-y-6 font-sans text-right dir-rtl">
      {/* 1. Hero Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-[#0e1424] to-[#181126] border border-amber-500/30 shadow-2xl"
      >
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-amber-500/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-purple-500/10 rounded-full filter blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black">
            <Sparkles size={14} className="animate-spin-slow" />
            <span>راهنمای جامع فرمت نبرد رویال (Double Elimination)</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-black text-white leading-tight">
            نبرد رویال چیست و چگونه قهرمان مشخص می‌شود؟
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            فرمت <strong className="text-amber-400">حذفی دوطرفه (Double Elimination)</strong> عادلانه‌ترین ساختار تورنمنت‌های حرفه‌ای در جهان است. 
            بر خلاف جام حذفی ساده، در نبرد رویال <strong className="text-emerald-400">هیچ تیمی با یک بار باخت حذف نمی‌شود</strong>؛ 
            بلکه هر تیم دارای <strong className="text-cyan-300">«۲ جان یا شانس بقا»</strong> است و تنها تیمی حذف قطعی می‌شود که ۲ بار طعم شکست را بچشد.
          </p>
        </div>
      </motion.div>

      {/* 2. Visual Flow Diagram (رسم شکل و مسیرهای تورنمنت) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="p-5 sm:p-7 rounded-3xl bg-slate-900/80 border border-slate-700/60 shadow-xl space-y-6"
      >
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Zap size={22} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">دیاگرام جریان مسابقات (Tournament Flow Diagram)</h3>
            <p className="text-xs text-slate-400">مسیر حرکت تیم‌ها پس از برد یا باخت در هر دور</p>
          </div>
        </div>

        {/* Diagram Interactive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Winners Bracket */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/30 border-2 border-emerald-500/40 space-y-3 relative group hover:border-emerald-400 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <Shield size={16} />
                <span>جدول برندگان (Winners)</span>
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">۰ باخت</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              تمام تیم‌ها بازی را از اینجا آغاز می‌کنند. با هر پیروزی، یک مرحله به فینال نزدیک‌تر می‌شوید.
            </p>
            <div className="pt-2 border-t border-emerald-500/20 text-[11px] text-emerald-200/90 font-medium">
              <span className="text-emerald-400 font-black">پیروزی:</span> صعود به دور بعد برندگان<br />
              <span className="text-amber-400 font-black">شکست اول:</span> سقوط به جدول بازندگان (ادامه شانس قهرمانی!)
            </div>
          </div>

          {/* Card 2: Losers Bracket */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/30 border-2 border-amber-500/40 space-y-3 relative group hover:border-amber-400 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <Flame size={16} />
                <span>جدول بازندگان (Losers)</span>
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">۱ باخت</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              تیم‌های شکست‌خورده جدول برندگان به اینجا می‌آیند. اینجا خطای دوم جایی ندارد و هر بازی حکم بقا دارد.
            </p>
            <div className="pt-2 border-t border-amber-500/20 text-[11px] text-amber-200/90 font-medium">
              <span className="text-emerald-400 font-black">پیروزی:</span> بقا و صعود تا فینال بزرگ<br />
              <span className="text-rose-400 font-black">شکست دوم:</span> حذف قطعی از کل مسابقات
            </div>
          </div>

          {/* Card 3: Grand Final & Reset */}
          <div className="p-4 sm:p-5 rounded-2xl bg-purple-950/30 border-2 border-purple-500/40 space-y-3 relative group hover:border-purple-400 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                <Trophy size={16} />
                <span>فینال بزرگ (Grand Final)</span>
              </span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">تعیین قهرمان</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              رویارویی قهرمان جدول برندگان (بدون باخت) در برابر قهرمان بازندگان (۱ باخت).
            </p>
            <div className="pt-2 border-t border-purple-500/20 text-[11px] text-purple-200/90 font-medium">
              <span className="text-cyan-300 font-black">برد برندگان:</span> قهرمانی فوری<br />
              <span className="text-yellow-300 font-black">برد بازندگان:</span> <strong className="text-amber-300">ریست براکت (بازی دوم)</strong>
            </div>
          </div>
        </div>

        {/* Visual Connector Banner */}
        <div className="p-4 rounded-2xl bg-[#090e1a] border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
          <div className="flex items-center gap-2">
            <RefreshCw size={18} className="text-amber-400 shrink-0 animate-spin-slow" />
            <span>
              <strong>ریست براکت (Bracket Reset) چیست؟</strong> از آنجا که قهرمان برندگان تا فینال هیچ باختی نداشته، اگر در فینال اول ببازد، مانند همه تیم‌های دیگر حق ۱ باخت دارد؛ بنابراین بازی دوم فینال فوراً برای تعیین قهرمان واقعی برگزار می‌شود!
            </span>
          </div>
        </div>
      </motion.div>

      {/* 3. Real Example Scenario (مثال واقعی و مرحله‌به‌مرحله) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="p-5 sm:p-7 rounded-3xl bg-slate-900/80 border border-slate-700/60 shadow-xl space-y-6"
      >
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <UserCheck size={22} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">مثال واقعی: سناریوی پرسپولیس و استقلال در تورنمنت</h3>
            <p className="text-xs text-slate-400">مشاهده گام‌به‌گام نحوه بازگشت تیم شکست‌خورده تا قهرمانی</p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3 font-sans text-xs">
          {/* Step 1 */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
              ۱
            </span>
            <div className="space-y-1 flex-1">
              <div className="font-bold text-white flex items-center justify-between">
                <span>دور اول جدول برندگان: دربی تهران</span>
                <span className="text-[10px] text-slate-400">استقلال ۱ - ۰ پرسپولیس</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                استقلال برنده می‌شود و در جدول برندگان بالا می‌رود. پرسپولیس حذف <strong>نمی‌شود</strong>، بلکه به جدول بازندگان سقوط می‌کند.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
              ۲
            </span>
            <div className="space-y-1 flex-1">
              <div className="font-bold text-white flex items-center justify-between">
                <span>جنگ بقا در جدول بازندگان</span>
                <span className="text-[10px] text-amber-300">بازگشت آتشین</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                پرسپولیس در جدول بازندگان با تیم‌های سپاهان و تراکتور بازی می‌کند، همه را شکست می‌دهد و قهرمان جدول بازندگان می‌شود تا راهی فینال بزرگ شود.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
              ۳
            </span>
            <div className="space-y-1 flex-1">
              <div className="font-bold text-white flex items-center justify-between">
                <span>صعود مقتدرانه استقلال در جدول برندگان</span>
                <span className="text-[10px] text-emerald-300">بدون شکست (۰ باخت)</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                استقلال تمام بازی‌های جدول برندگان را با موفقیت می‌برد و بدون هیچ باختی به عنوان فینالیست اصلی به فینال بزرگ می‌رسد.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 to-slate-950/80 border border-purple-500/40 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
              ۴
            </span>
            <div className="space-y-1 flex-1">
              <div className="font-bold text-purple-200 flex items-center justify-between">
                <span>فینال بزرگ (بازی اول): انتقام پرسپولیس</span>
                <span className="text-[10px] text-purple-300 font-sport">پرسپولیس ۲ - ۱ استقلال</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                پرسپولیس بازی اول فینال را می‌برد! اما استقلال بلافاصله جام را از دست نمی‌دهد؛ چون این اولین باخت استقلال بود و شرایط دو تیم برابر (هر کدام ۱ باخت) شد.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/50 to-slate-950/80 border border-amber-500/50 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
              ۵
            </span>
            <div className="space-y-1 flex-1">
              <div className="font-bold text-amber-300 flex items-center justify-between">
                <span>مسابقه نهایی ریست براکت (Reset Match)</span>
                <span className="text-[10px] text-amber-400 font-black">جنگ مرگ و زندگی</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                مسابقه دوم و تعیین‌کننده فینال برگزار می‌شود؛ برنده این بازی دوم قهرمان قطعی جام نبرد رویال شناخته شده و مدال طلا را از آن خود می‌کند!
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4. Two Other Crucial Pillars: Rules & Market Window */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Extra Time Rules */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-3xl bg-slate-900/80 border border-slate-700/60 space-y-3"
        >
          <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-sm">
            <Clock size={20} />
            <span>قانون زمان اضافه و ضربات پنالتی</span>
          </div>
          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-white font-bold block mb-1">دورهای ابتدایی و میانی:</span>
              <span>در صورت تساوی در ۹۰ دقیقه، مسابقه مستقیماً به <strong>ضربات پنالتی</strong> می‌رود تا در مصرف استقامت بازیکنان صرفه‌جویی شود.</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-white font-bold block mb-1">دورهای حساس (نیمه‌نهایی برندگان و دور ۳ بازندگان به بعد):</span>
              <span>در صورت تساوی، بازی دارای <strong>دو وقت اضافه ۱۵ دقیقه‌ای</strong> خواهد بود و در صورت تداوم تساوی، برنده با ضربات پنالتی معین می‌شود.</span>
            </div>
          </div>
        </motion.div>

        {/* Transfer Market Window Rules */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="p-5 rounded-3xl bg-slate-900/80 border border-slate-700/60 space-y-3"
        >
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
            <ArrowLeftRight size={20} />
            <span>پنجره نقل و انتقالات و روزهای استراحت</span>
          </div>
          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-white font-bold block mb-1">روزهای برگزاری مسابقات:</span>
              <span>در روزهای بازی (یکشنبه، سه‌شنبه، چهارشنبه، پنج‌شنبه، جمعه) بازار نقل و انتقالات به صورت کامل بسته است تا تمرکز روی مسابقات حفظ شود.</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-white font-bold block mb-1">روزهای استراحت (شنبه‌ها و دوشنبه‌ها):</span>
              <span>بازار از ساعت <strong>۰۰:۰۰ بامداد تا ۱۸:۰۰ عصر</strong> باز است و تایمر شمارش معکوس زنده در بالای صفحه بازار فعال می‌باشد.</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
