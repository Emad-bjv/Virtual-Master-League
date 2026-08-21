# Original User Request

## 2026-08-06T12:16:37Z

Connect all Virtual Master League frontend components and pages to the Django backend REST APIs, and create/implement any missing backend endpoints, models, or logic required for full end-to-end functionality.

Working directory: e:\Codes\Virtual Master League
Integrity mode: development

## Requirements

### R1. Frontend Integration Audit & REST API Binding
- Audit all frontend pages and components (auth, dashboard, teams, squad management, match simulator/schedule, transfer market, economy, gacha packs, notifications).
- Replace all placeholder/mock data in the frontend with active REST API integrations using standard HTTP services.

### R2. Backend Endpoint Completion & Business Logic
- Audit existing Django apps (users, teams, matches, transfers, economy, gacha, notifications).
- Implement any missing REST endpoints, Django models, serializers, views, and routing required to serve the frontend operations completely.

### R3. Verification & End-to-End Functionality
- Ensure seamless data flow between frontend and backend.
- Verify that request payloads and response structures match between frontend components and backend serializers without errors.

## Acceptance Criteria

### API Integration & Coverage
- [ ] Every user-facing feature in the frontend triggers actual API requests to backend endpoints.
- [ ] No missing backend API routes exist for any action performable in the UI.
- [ ] Backend data persists correctly (e.g. user auth, team management, match results, transfer transactions, gacha rewards, notifications).

### System Quality & End-to-End Flow
- [ ] Frontend compiles/runs cleanly without console errors related to missing backend endpoints or bad data schemas.
- [ ] Backend Django server runs cleanly and handles all frontend requests successfully.

## 2026-08-21T11:10:32Z

# بازبینی، تصحیح و توسعه جامع پنل ادمین و پنل مربی (Virtual Master League)

بازبینی عمیق و پیادهسازی اصلاحات ساختاری، منطقی و بصری در پنلهای ادمین (اتاق داوری) و مربی برای بازیهای لیگ مجازی، شامل هوشمندسازی نوتیفیکیشنها، تفکیک دقیق هفتههای مسابقات، پخش زنده رویدادها با وبسوکت و فالبک، پنل اختصاصی «تغییرات سرمربی» برای اعمال تاکتیکها، ثبت و نمایش زیبای آمار اختصاصی بازی و مدیریت خودکار تایمرها و وضعیت پخش زنده.

Working directory: E:\Codes\Virtual Master League
Integrity mode: development

---

## Requirements

### R1. سیستم نوتیفیکیشن هوشمند و تفکیکشده بر اساس نقش (Smart Role-Aware Notifications)
- وضعیت خوانده شدن (`is_read`) نوتیفیکیشنها باید در دیتابیس پایدار بماند و با ورود/خروج کاربر یا رفرش صفحه ریست نشود.
- نوتیفیکیشنهای ادمین و مربی باید کاملاً تفکیک شوند:
  - برای ادمین: اعلانهای مرتبط با شروع مسابقه، تغییرات تاکتیکی مربیان و رویدادهای مهم همراه با دکمه/لینک هدایت مستقیم به «اتاق داوری و هدایت بازی».
  - برای مربی: اعلانهای نتایج، رویدادهای حین بازی تیم خود و نقلوانتقالات با هدایت به تب مربوطه (پخش زنده / باشگاه / نقلوانتقالات).

### R2. اصلاح فیلترینگ و ایزولهسازی دقیق بازیهای هفته در اتاق داوری (Gameweek Isolation)
- لیست بازیهای هر هفته در اتاق داوری و پنل ادمین باید صرفاً بازیهای متعلق به همان هفته (`round_name` یا شماره هفته) را نمایش دهد.
- رفع باگ همپوشانی و ادغام بازیهای تمام هفتهها در هفته ۱؛ انتخاب هر هفته از دراپداون باید لیست بازیهای مرتبط با همان هفته را فیلتر و بارگذاری کند.

### R3. انتشار و همگامسازی لحظهای رویدادهای بازی بدون رفرش (Real-Time Zero-Refresh Match Events)
- ثبت هر رویداد توسط ادمین (گل، پاس گل، کارت زرد/قرمز، تعویض، پنالتی، بازبینی VAR) روی زمین مسابقه باید بلافاصله و در کسری از ثانیه در پنل مربی و بخش فید زنده (Live Events) نمایش داده شود.
- پیادهسازی معماری ترکیبی: وبسوکت دوطرفه بر بستر Django Channels با لایه فالبک پولینگ خودکار (Polling Fallback) جهت تضمین صددرصدی پایداری اتصال.
- طراحی مدرن، واکنشگرا و انیمیشنی برای کارتهای رویدادهای زنده در پنل مربی.

### R4. ادغام دکمه ارسال ترکیب/تاکتیک مربی و بخش اختصاصی «تغییرات سرمربی» در پنل داوری
- در پنل مربی: تمامی تغییرات ترکیب و تنظیمات تاکتیکی (حملهای، دفاعی، پیشرفته) در قالب یک دکمه واحد («ارسال تغییرات به داور / ثبت نهایی») به پنل ادمین ارسال شود.
- در اتاق داوری ادمین: طراحی و پیادهسازی یک بخش اختصاصی و سازمانیافته به نام **«تغییرات سرمربی»**:
  - تفکیک شفاف بین تغییرات مربی میزبان و مربی میهمان با بج شمارنده (Counter Badge).
  - نمایش دستهبندیشده تعویضها و دستورات تاکتیکی بدون شلوغی بصری.
  - چکباکس/تیک تایید برای هر آیتم («اعمال شد») تا ادمین به صورت مرحلهای تغییرات را در بازی ثبت کند و هیچ تغییری فراموش نشود.
  - به محض تایید و اعمال هر تغییر توسط ادمین، وضعیت تاییدشده به صورت لحظهای در پنل مربی بازتاب یابد.

### R5. ثبت و نمایش آمار اختصاصی هر بازی برای تیمها و بازیکنان (Match-Specific Stats)
- در اتاق داوری: تعبیه فرمها و کنترلهای تعاملی برای ثبت آمار اختصاصی مسابقه:
  - آمار تیمی: درصد مالکیت توپ، تعداد شوت، شوت در چارچوب، کرنرها، خطاها، آفسایدها و سیوهای دروازهبان.
  - آمار بازیکنان: نمره عملکرد (Rating بین ۰ تا ۱۰)، دقایق بازی، به همراه بررسی صحت گلها، پاسگلها و کارتهای متصل به رویدادها.
- پس از اتمام مسابقه (وضعیت FINISHED): طراحی و نمایش زیبا، استاندارد و تفکیکشده این آمار در قالب نمودارهای مقایسهای و جدول نمرات در هر دو پنل مربی و ادمین.

### R6. مدیریت هوشمند تایمرها و چرخه وضعیت پخش زنده در پنل مربی (Live Broadcast State Machine)
- وضعیت قبل از بازی (SCHEDULED): نمایش تایمر شمارش معکوس دقیق تا زمان شروع مسابقه.
- وضعیت در حال برگزاری (LIVE): حذف خودکار تایمر و نمایش مستقیم پلیر پخش زنده + ابزارهای مدیریت آنلاین تیم و فید رویدادها.
- وضعیت بلافاصله پس از بازی (تا ۱۰ دقیقه): نمایش کارت خلاصه بازی، آمار نهایی و نتیجه قطعی همراه با شمارشگر ۱۰ دقیقهای.
- وضعیت بعد از ۱۰ دقیقه: انتقال خودکار به تایمر شمارش معکوس بازی بعدی تیم.

---

## Acceptance Criteria

### ۱. نوتیفیکیشنها و ناوبری
- [ ] نوتیفیکیشنهای خواندهشده پس از خروج و ورود مجدد همچنان خواندهشده باقی میمانند.
- [ ] کلیک روی نوتیفیکیشن بازی در پنل ادمین مستقیماً کاربر را به اتاق داوری بازی مربوطه منتقل میکند.

### ۲. نمایش برنامه هفتگی
- [ ] انتخاب هفته X از منو تنها بازیهای هفته X را نمایش میدهد و هیچ دادهای از سایر هفتهها در آن تداخل ندارد.

### ۳. سینک زنده رویدادها
- [ ] ثبت گل یا کارت توسط ادمین بدون نیاز به رفرش صفحه ظرف کمتر از ۱ ثانیه در پنل مربی نمایش داده میشود.
- [ ] در صورت قطعی وبسوکت، سیستم پولینگ فالبک دادهها را بدون وقفه بهروزرسانی میکند.

### ۴. فرایند ارسال و تایید تغییرات مربی
- [ ] دکمه واحد ارسال ترکیب و تاکتیک در پنل مربی دادههای کامل چیدمان و تاکتیک را همزمان ارسال میکند.
- [ ] بخش «تغییرات سرمربی» در پنل ادمین درخواستهای میزبان و میهمان را تفکیک کرده و امکان تیک زدن تکتک تغییرات اعمالشده را فراهم میکند.
- [ ] تایید هر تغییر توسط ادمین در پنل مربی وضعیت «اعمال شد» را نمایش میدهد.

### ۵. آمار بازی
- [ ] مقادیر آمار تیمی و نمرات بازیکنان به ازای هر بازی ذخیره شده و مستقل از سایر بازیها باقی میماند.
- [ ] کامپوننت نمایش آمار پس از بازی، مقایسه گرافیکی دو تیم و برترین بازیکنان را به زیبایی ترسیم میکند.

### ۶. تایمر و انتقال وضعیت استریم
- [ ] صفحه لایو مربی بر اساس وضعیت بازی بین «شمارش معکوس شروع»، «پخش زنده»، «خلاصه ۱۰ دقیقهای پس از بازی» و «شمارش معکوس بازی بعدی» به صورت خودکار تغییر فاز میدهد.

