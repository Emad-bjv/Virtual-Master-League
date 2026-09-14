/**
 * VML Disciplinary Tribunal Smart Legal Engine
 * Generates rich, authentic, and non-repetitive Persian judicial court rulings and official news statements.
 */

// Helper to format currency and numbers
export const formatUSD = (val) => {
  const num = Number(val || 0);
  return `$${num.toLocaleString('en-US')}`;
};

export const formatPersianDate = (isoDate) => {
  if (!isoDate) return '—';
  try {
    const d = new Date(isoDate);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return String(isoDate);
  }
};

/**
 * Multiple authentic judicial templates per violation category
 */
export const VERDICT_VARIANTS = {
  REFEREE_ADMIN_INSULT: [
    {
      title: 'هتک حرمت و توهین مستقیم به داور مسابقه',
      preamble: (team, tour) =>
        `در خصوص گزارش واصله از سوی دپارتمان داوری و ناظر رسمی ${tour ? `مسابقات ${tour}` : 'سازمان لیگ'} پیرامون وقایع انضباطی رخ‌داده توسط عوامل و منتسبین باشگاه «${team}»، جلسه فوق‌العاده شعبه اول کمیته انضباطی تشکیل گردید.`,
      findings: (reason) =>
        `با عنایت به بازبینی مستندات دیداری، شنیداری و گزارش مکتوب کوبل داوری، احراز گردید که فرد یا افراد خاطی اقدام به استعمال الفاظ موهن، تهدید و بی‌احترامی نسبت به تیم داوری نموده‌اند که مصداق بارز نقض حریم اخلاق حرفه‌ای است. شرح واقعه: ${reason}`,
      legalRef: 'مستنداً به مواد ۳۴، ۴۱ و بند «ب» آیین‌نامه انضباطی و انطباق آن با دستورالعمل مصونیت داوران',
      appealTerms: 'رأی صادره پس از ابلاغ لازم‌الاجرا بوده و ظرف مدت ۴۸ ساعت قابل تجدیدنظرخواهی در کمیته استیناف سازمان لیگ می‌باشد.',
    },
    {
      title: 'بی‌احترامی و رفتار موهن در قبال کادر اجرایی و مدیریت لیگ',
      preamble: (team, tour) =>
        `پرونده کلاسه مطروحه علیه باشگاه «${team}» در پی رفتارهای ساختارشکنانه و اظهارات خارج از شئون ورزشی علیه مسئولین برگزاری ${tour ? `رقابت‌های ${tour}` : 'لیگ'} در دستور کار رسیدگی فوری رکن قضایی قرار گرفت.`,
      findings: (reason) =>
        `پس از استماع دفاعیات و انطباق لاگ‌های ثبت‌شده، ارتکاب تخلف از حیث تخریب وجهه مسابقات و نقض اصول احترام متقابل به ارکان حاکمیتی محرز تشخیص داده شد. مستندات دلالت بر این دارد که: ${reason}`,
      legalRef: 'به استناد ماده ۴۸ آیین‌نامه اخلاق حرفه‌ای و مصوبات کارگروه صیانت از سلامت رقابت‌ها',
      appealTerms: 'این دادنامه قطعی بوده و صرفاً در صورت کشف ادله جدید مستند، تقاضای اعاده دادرسی مسموع خواهد بود.',
    },
    {
      title: 'اخلال در روند برگزاری و اهانت به ارکان قضاوت مسابقه',
      preamble: (team, tour) =>
        `رکن قضایی لیگ مجازی مستر لیگ، بر اساس وظایف ذاتی و صیانت از کرامت عوامل قضاوت در ${tour ? `تورنمنت ${tour}` : 'جام مسابقات'}، پرونده انضباطی باشگاه «${team}» را مورد رسیدگی دقیق قرار داد.`,
      findings: (reason) =>
        `بررسی ادله و محتوای اعتراضی واصله نشان می‌دهد رفتار غیرمتعارف رخ‌داده فراتر از اعتراضات معمول ورزشی بوده و شائبه تشنج‌آفرینی و تشویش اذهان جامعه ورزشکاران را پدید آورده است. شرح پرونده: ${reason}`,
      legalRef: 'با توجه به ماده ۲۲ آیین‌نامه انضباطی فدراسیون مستر لیگ ناظر بر حفظ امنیت روانی کادر برگزاری',
      appealTerms: 'مهلت اعتراض کتبی و ارسال لایحه اعتراضیه حداکثر ۷۲ ساعت پس از تاریخ نشر الکترونیکی دادنامه است.',
    },
  ],

  INELIGIBLE_PLAYER: [
    {
      title: 'استفاده غیرقانونی از بازیکن دارای محرومیت انضباطی',
      preamble: (team, tour) =>
        `در پی استعلام دپارتمان مسابقات و اعتراض رسمی ثبت‌شده در خصوص حضور بازیکن غیرمجاز در ترکیب تیم «${team}» در ${tour ? `چارچوب ${tour}` : 'مسابقات جاری'}، پرونده جهت صدور حکم مقتضی به این کمیته ارجاع شد.`,
      findings: (reason) =>
        `بررسی سامانه‌های سیستمی، کارتابل انضباطی و کارت‌های قبلی نشان داد که بازیکن یادشده دارای محرومیت قطعی بوده و حضور وی در زمین مصداق بارز استفاده از بازیکن غیرمجاز است. گردش‌کار: ${reason}`,
      legalRef: 'به استناد بند ۳ ماده ۲۷ آیین‌نامه انضباطی پیرامون صیانت از صلاحیت بازیکنان و نتایج مسابقات',
      appealTerms: 'رأی صادره از حیث جنبه انضباطی قطعی و از حیث کسر امتیاز تا ۲ روز کاری قابل تجدیدنظرخواهی است.',
    },
    {
      title: 'تخلف در بهره‌گیری از بازیکن مصدوم و نقض پروتکل سلامت',
      preamble: (team, tour) =>
        `جلسه رسیدگی به تخلف اداری-فنی باشگاه «${team}» مبنی بر دور زدن سیستم پزشکی و لیست سلامت بازیکنان در مسابقه رسمی ${tour || 'لیگ'} تشکیل گردید.`,
      findings: (reason) =>
        `با التفات به گزارش مکتوب ناظر پزشکی و سیستم اتوماسیون بازیکنان، بازی دادن بازیکن با وجود منع صریح مقرراتی محرز بوده و مسوولیت تمام تبعات فنی و حقوقی آن متوجه کادر مدیریتی تیم می‌باشد. شرح گزارش: ${reason}`,
      legalRef: 'با تکیه بر ماده ۳۹ آیین‌نامه پزشکی و سلامت ورزشی و اصول حاکم بر صلاحیت‌های پزشکی ورزشکاران',
      appealTerms: 'این حکم بلافاصله پس از ثبت در سیستم لازم‌الاجرا بوده و حق اعتراض محفوظ است.',
    },
    {
      title: 'حضور بازیکن ثبت‌نشده و دور زدن فهرست رسمی مسابقه',
      preamble: (team, tour) =>
        `کمیته انضباطی سازمان لیگ در راستای شفاف‌سازی و عدالت رقابتی، مستندات مربوط به ارنج غیرقانونی تیم «${team}» در ${tour || 'مسابقات'} را مورد بررسی قرار داد.`,
      findings: (reason) =>
        `احراز گردید که اسلات‌های قانونی تیم دستکاری گردیده و نام بازیکن بدون مجوز فدراسیون در سیاهه مسابقه گنجانده شده است. شرح تخلف: ${reason}`,
      legalRef: 'مستند به ماده ۱۸ آیین‌نامه برگزاری مسابقات فوتبال لیگ مجازی',
      appealTerms: 'اعتراض به این رأی مانع از اجرای فوری تنبیهات و محرومیت‌های انضباطی نخواهد بود.',
    },
  ],

  UNSPORTSMANLIKE: [
    {
      title: 'رفتار ناشایست و نقض موازین اخلاق ورزشی',
      preamble: (team, tour) =>
        `به دنبال حواشی ایجاد شده در جریان ${tour ? `دیدار تیم‌های مسابقات ${tour}` : 'مسابقه اخیر'} و بروز رفتارهای مغایر با روح جوانمردانه از سوی باشگاه «${team}»، جلسه انضباطی برگزار گردید.`,
      findings: (reason) =>
        `بررسی تصاویر و مستندات ارائه شده بیانگر نقض صریح موازین ورزشی و ایجاد تنش و درگیری در فضای رسمی مسابقه است. شرح دلایل: ${reason}`,
      legalRef: 'با استناد به ماده ۵۱ آیین‌نامه انضباطی در خصوص رفتارهای مغایر با اخلاق ورزشی (Unsporting Conduct)',
      appealTerms: 'رأی صادره بدوی بوده و طبق تشریفات مندرج در آیین‌نامه دادرسی قابل اعتراض در استیناف می‌باشد.',
    },
    {
      title: 'نقض اصول بازی جوانمردانه و حاشیه‌سازی رسانه‌ای',
      preamble: (team, tour) =>
        `رکن قضایی سازمان لیگ در پی وصول شکایت باشگاه رقیب و گزارش‌های ثبت‌شده پیرامون بیانیه‌ها و اقدامات تنش‌زای باشگاه «${team}» تشکیل جلسه داد.`,
      findings: (reason) =>
        `ارزیابی ادله نشان داد که اقدامات صورت‌گرفته به تشدید تنش‌ها و خدشه‌دار شدن محیط سالم مسابقات انجامیده است. محتوای پرونده: ${reason}`,
      legalRef: 'به استناد ماده ۴۴ دستورالعمل رسانه‌ای و بند «الف» از فصل هشتم آیین‌نامه صیانت از حقوق باشگاه‌ها',
      appealTerms: 'مهلت واخواهی ظرف مدت ۴۸ ساعت از زمان ابلاغ پیامکی و سیستمی به سرمربی باشگاه خواهد بود.',
    },
  ],

  MATCH_DELAY: [
    {
      title: 'تاخیر غیرموجه در حضور برای مسابقه رسمی',
      preamble: (team, tour) =>
        `پرونده تاخیر در برگزاری مسابقه ${tour ? `در چارچوب رقابت‌های ${tour}` : 'رسمی لیگ'} منتسب به باشگاه «${team}» در کمیته انضباطی مفتوح و بررسی شد.`,
      findings: (reason) =>
        `با استناد به گزارش ناظر بازی، هماهنگی‌های لازم به عمل آمده لکن تیم مزبور با تاخیر مفرط و بدون عذر موجه موجب اختلال در جدول زمان‌بندی گردیده است. شرح گزارش: ${reason}`,
      legalRef: 'بر اساس بند ۲ ماده ۱۶ آیین‌نامه اجرایی مسابقات مبنی بر ضرورت رعایت دقیق زمان‌بندی',
      appealTerms: 'جریمه نقدی قطعی بوده و اخطار صادره در پرونده انضباطی باشگاه درج می‌گردد.',
    },
    {
      title: 'اخلال در کنداکتور رسمی و عدم رعایت وقت مقرر',
      preamble: (team, tour) =>
        `با توجه به سیاست‌های مصوب سازمان لیگ مبنی بر نظم آهنین و پخش زنده دقیق دیدارها، تاخیر حادث‌شده از سوی تیم «${team}» بررسی گردید.`,
      findings: (reason) =>
        `تیم علی‌رغم دریافت هشدارهای قبلی در ساعت مقرر در سرور حاضر نگردیده و زمان پخش و کنداکتور سایر تیم‌ها را با اخلال مواجه ساخته است. ادله: ${reason}`,
      legalRef: 'مستنداً به تبصره ماده ۲۱ نظام‌نامه مسابقات و جدول جرایم مصوب فصل جاری',
      appealTerms: 'این حکم به منزله اخطار قطعی بوده و در صورت تکرار، محرومیت‌های مضاعف اعمال خواهد شد.',
    },
  ],

  NO_GAMEPLAN: [
    {
      title: 'تخلف عدم تایید و ارسال ارنج پیش از بازی',
      preamble: (team, tour) =>
        `گزارش واحد فناوری و برگزاری مسابقات پیرامون عدم ثبت تاکتیک و ارنج نهایی تیم «${team}» در سامانه، در دستور کار کمیته انضباطی قرار گرفت.`,
      findings: (reason) =>
        `سیستم اتوماسیون تایید می‌نماید که تا پایان مهلت رسمی ضرب‌الاجل (Deadline)، اقدامی جهت نهایی‌سازی ترکیب صورت نگرفته و سیستم ناچار به اعمال ترکیب پیش‌فرض شده است. شرح: ${reason}`,
      legalRef: 'به استناد آیین‌نامه ثبت ترکیب و تدارک الکترونیک مسابقات لیگ',
      appealTerms: 'جریمه نقدی بلافاصله از بودجه تیم کسر شده و قطعی تلقی می‌گردد.',
    },
  ],

  FORFEIT_RAGE_QUIT: [
    {
      title: 'ترک یکطرفه مسابقه رسمی و نقض تعهدات رقابتی',
      preamble: (team, tour) =>
        `در خصوص مسابقه ${tour ? `از تورنمنت ${tour}` : 'رسمی'} که با اقدام به خروج پیش از موعد (Rage Quit) از سوی باشگاه «${team}» نیمه‌کاره ماند، کمیته انضباطی تشکیل جلسه داد.`,
      findings: (reason) =>
        `بررسی لاگ‌های سرور و گزارش فنی مسابقه اثبات نمود که قطع ارتباط عمدی و از روی انصراف یکطرفه بوده و موجب تضییع حقوق حریف و تماشاگران شده است. شرح مستندات: ${reason}`,
      legalRef: 'به استناد ماده ۶۲ آیین‌نامه انضباطی ناظر بر اعلام باخت فنی ۳-۰ و اعمال تنبیهات تکمیلی',
      appealTerms: 'رأی صادره بدوی بوده و امکان درخواست تجدیدنظر صرفاً با ارائه ادله موجه فنی (اثبات قطعی سراسری اینترنت) میسر است.',
    },
    {
      title: 'عدم حضور غیرموجه در میدان مسابقه و استنکاف از بازی',
      preamble: (team, tour) =>
        `پرونده استنکاف تیم «${team}» از انجام بازی رسمی برابر حریف، با حضور اعضای رکن قضایی فدراسیون مورد بررسی حقوقی قرار گرفت.`,
      findings: (reason) =>
        `تیم یادشده بدون ارائه گواهی موجه یا اعلام قبلی، از حضور در سرور مسابقه خودداری نموده که مستوجب تنبیهات سنگین انضباطی است. دلایل: ${reason}`,
      legalRef: 'بر مبنای ماده ۶۳ آیین‌نامه انضباطی راجع به ترک و غیبت در مسابقات رسمی',
      appealTerms: 'این رأی در خصوص کسر امتیاز ظرف مدت ۴۸ ساعت قابل فرجام‌خواهی در شورای عالی استیناف است.',
    },
  ],

  TRANSFER_VIOLATION: [
    {
      title: 'تخلف در بازار نقل‌وانتقالات و توافقات غیرقانونی',
      preamble: (team, tour) =>
        `در پی پایش هوشمند سامانه حسابرسی معاملات (Transfer Audit System) و کشف معامله مشکوک منسوب به باشگاه «${team}»، پرونده جهت رسیدگی قضایی ارجاع گردید.`,
      findings: (reason) =>
        `بررسی‌های کارشناسی نشان داد که تراکنش مالی صورت‌گرفته با ارقام غیرواقعی، دور زدن سقف بودجه یا تبانی با باشگاه طرف معامله انجام پذیرفته است. شرح گزارش حسابرسی: ${reason}`,
      legalRef: 'مستند به قانون فیرپلی مالی (FFP) و ماده ۷۳ آیین‌نامه نقل‌وانتقالات لیگ مجازی',
      appealTerms: 'محرومیت از نقل‌وانتقالات از لحظه ابلاغ فعال بوده و ابطال احتمالی قرارداد در کارتابل تیم اعمال می‌گردد.',
    },
  ],

  MATCH_FIXING_CHEATING: [
    {
      title: 'فساد ورزشی، تبانی مستقیم و دستکاری تعمدی نتایج',
      preamble: (team, tour) =>
        `جلسه اضطراری و فوق‌العاده رکن قضایی لیگ با حضور تمامی اعضا جهت رسیدگی به اتهام سنگین تبانی و فساد رقابتی منتسب به باشگاه «${team}» تشکیل شد.`,
      findings: (reason) =>
        `با بازبینی دقیق فایل ویدئویی مسابقه، آمار تحلیلی بازیکنان، تبادل گل‌های غیرمتعارف و اعترافات واصله، ارتکاب تبانی و دستکاری نتیجه به طور قطع و یقین محرز گردید. شرح واقعه: ${reason}`,
      legalRef: 'به استناد ماده ۱۰۰ آیین‌نامه انضباطی و اشد مجازات‌های پیش‌بینی‌شده برای صیانت از هویت و سلامت لیگ',
      appealTerms: 'با توجه به ماهیت بحرانی تخلف، اجرای کلیه تنبیهات فوری و تعلیق‌ناپذیر بوده و پرونده به کمیته اخلاق ارجاع می‌شود.',
    },
  ],

  CUSTOM: [
    {
      title: 'تصمیم ویژه کمیته انضباطی پیرامون تخلفات خاص',
      preamble: (team, tour) =>
        `کمیته انضباطی فدراسیون مستر لیگ در خصوص پرونده انضباطی شماره خاص باشگاه «${team}» تشکیل جلسه داد.`,
      findings: (reason) =>
        `با مداقه در جمیع اوراق پرونده و گزارش‌های تکمیلی واصله، تخلف صورت‌گرفته مشمول تنبیهات مقتضی تشخیص داده شد. شرح موضوع: ${reason}`,
      legalRef: 'مستند به اختیارات تام تفویضی هیات‌رئیسه و آیین‌نامه انضباطی سازمان لیگ',
      appealTerms: 'احکام صادره بر اساس ضوابط مندرج در آیین‌نامه دادرسی منشا اثر خواهد بود.',
    },
  ],
};

/**
 * Returns available variant count for a violation type
 */
export const getViolationVariantsCount = (violationType) => {
  const variants = VERDICT_VARIANTS[violationType] || VERDICT_VARIANTS.CUSTOM;
  return variants.length;
};

/**
 * Generates an official, non-repetitive disciplinary verdict statement
 */
export const generateDisciplinaryVerdict = ({
  violationType = 'CUSTOM',
  teamName = 'باشگاه',
  tournamentName = null,
  title = '',
  reason = '',
  fineBudgetUsd = 0,
  fineGems = 0,
  pointsDeduction = 0,
  transferBanDays = 0,
  transferBanUntil = null,
  isWarning = false,
  variantIndex = 0,
  caseNumber = '',
}) => {
  const variants = VERDICT_VARIANTS[violationType] || VERDICT_VARIANTS.CUSTOM;
  const safeIndex = Math.abs(Number(variantIndex || 0)) % variants.length;
  const template = variants[safeIndex] || variants[0];

  const effectiveTitle = title && title.trim() ? title.trim() : template.title;
  const effectiveReason = reason && reason.trim() ? reason.trim() : 'عدم رعایت موازین و مقررات رسمی مسابقات لیگ.';
  const now = new Date();
  const generatedCaseNumber = caseNumber || `VML-JD-${now.getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

  // Preamble & Findings
  const preambleText = template.preamble(teamName, tournamentName);
  const findingsText = template.findings(effectiveReason);
  const legalRefText = template.legalRef;
  const appealText = template.appealTerms;

  // Sanctions list
  const sanctions = [];
  if (Number(fineBudgetUsd || 0) > 0) {
    sanctions.push(`محکومیت به پرداخت جریمه نقدی به مبلغ ${formatUSD(fineBudgetUsd)} دلاری به حساب فدراسیون`);
  }
  if (Number(fineGems || 0) > 0) {
    sanctions.push(`کسر تعداد ${fineGems} جم (Gem) از حساب باشگاه متخلف`);
  }
  if (Number(pointsDeduction || 0) > 0) {
    sanctions.push(`کسر قطعی ${pointsDeduction} امتیاز از جدول رده‌بندی مسابقات ${tournamentName ? `تورنمنت ${tournamentName}` : ''}`);
  }
  if (transferBanUntil) {
    sanctions.push(`محرومیت کامل از هرگونه فعالیت، خرید، فروش و ثبت بازیکن در بازار نقل‌وانتقالات تا تاریخ ${formatPersianDate(transferBanUntil)}`);
  } else if (Number(transferBanDays || 0) > 0) {
    sanctions.push(`محرومیت کامل از بازار نقل‌وانتقالات به مدت ${transferBanDays} روز تقویمی`);
  }
  if (isWarning) {
    sanctions.push('درج اخطار رسمی کتبی با توبیخ در سوابق انضباطی باشگاه');
  }

  const sanctionsText = sanctions.length > 0
    ? sanctions.map((s, idx) => `  ${idx + 1}. ${s}`).join('\n')
    : '  ۱. تذکر رسمی کتبی و الزام به رعایت موازین اخلاقی مسابقات';

  // Full composite verdict text
  const fullVerdictText = `بسمه تعالی
⚖️ دادنامه رسمی رکن قضایی و کمیته انضباطی سازمان لیگ مستر لیگ (VML)
شماره دادنامه: ${generatedCaseNumber} | تاریخ صدور: ${formatPersianDate(now)}

موضوع پرونده: ${effectiveTitle}
طرف متخلف: باشگاه فرهنگی ورزشی «${teamName}»
${tournamentName ? `تورنمنت مربوطه: ${tournamentName}\n` : ''}
گردش‌کار و شرح واقعه:
${preambleText}

مستندات و بررسی تخلف:
${findingsText}

انشای رأی دادگاه:
${legalRefText}، رکن قضایی کمیته انضباطی تخلف باشگاه «${teamName}» را محرز و مسلم تشخیص داده و بدین‌وسیله مبادرت به صدور تنبیهات ذیل می‌نماید:

${sanctionsText}

مهلت تجدیدنظرخواهی:
${appealText}

دبیرخانه کمیته انضباطی فدراسیون لیگ مجازی (VML)`;

  return {
    caseNumber: generatedCaseNumber,
    headline: `⚖️ دادنامه انضباطی: محکومیت باشگاه «${teamName}» (${effectiveTitle})`,
    title: effectiveTitle,
    preamble: preambleText,
    findings: findingsText,
    legalRef: legalRefText,
    sanctionsList: sanctions,
    appealNotice: appealText,
    fullVerdictText,
  };
};

/**
 * Formats verdict for single-click Telegram / Discord copy
 */
export const formatVerdictForTelegram = ({
  caseNumber,
  teamName,
  title,
  reason,
  fineBudgetUsd,
  fineGems,
  pointsDeduction,
  transferBanUntil,
  transferBanDays,
  isWarning,
  tournamentName,
  officialVerdictText,
}) => {
  const sanctions = [];
  if (Number(fineBudgetUsd || 0) > 0) sanctions.push(`💰 جریمه نقدی: ${formatUSD(fineBudgetUsd)} دلار`);
  if (Number(fineGems || 0) > 0) sanctions.push(`💎 جریمه جم: ${fineGems} جم`);
  if (Number(pointsDeduction || 0) > 0) sanctions.push(`📉 کسر امتیاز: ${pointsDeduction} امتیاز جدول`);
  if (transferBanUntil) sanctions.push(`🚫 محرومیت نقل‌وانتقالات: تا ${formatPersianDate(transferBanUntil)}`);
  else if (Number(transferBanDays || 0) > 0) sanctions.push(`🚫 محرومیت نقل‌وانتقالات: ${transferBanDays} روز`);
  if (isWarning) sanctions.push('⚠️ اخطار کتبی: درج در پرونده');

  const sanctionsBlock = sanctions.length > 0
    ? sanctions.map(s => `▫️ ${s}`).join('\n')
    : '▫️ اخطار کتبی و تذکر انضباطی';

  return `⚖️ *رأی رسمی کمیته انضباطی سازمان لیگ (VML)*
📋 *شماره دادنامه:* \`${caseNumber || 'VML-JD-OFFICIAL'}\`
📅 *تاریخ ابلاغ:* ${formatPersianDate(new Date())}

🔻 *باشگاه متخلف:* «${teamName || 'نامشخص'}»
${tournamentName ? `🏆 *تورنمنت:* ${tournamentName}\n` : ''}📌 *عنوان تخلف:* ${title || 'تخلف انضباطی'}

📝 *شرح و ادله رأی:*
${reason || 'بر اساس گزارش رسمی ناظر مسابقات و مستندات سیستمی.'}

⛔ *تنبیهات قطعی و مجازات‌های مقرر:*
${sanctionsBlock}

${officialVerdictText ? `\n📜 *متن کامل گردش‌کار دادگاه:*\n${officialVerdictText}\n` : ''}
⚠️ *مهلت اعتراض:* این دادنامه بدوی بوده و ظرف مدت ۴۸ ساعت پس از ابلاغ قابل تجدیدنظرخواهی در کمیته استیناف است.

🏛️ *دبیرخانه رکن قضایی فدراسیون لیگ مجازی مستر لیگ*
🌐 @VirtualMasterLeague`;
};
