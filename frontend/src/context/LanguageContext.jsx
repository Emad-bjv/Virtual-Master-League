import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const translations = {
  fa: {
    dir: 'rtl',
    lang: 'fa',
    // Header
    menu: 'منو',
    notifications: 'اعلان‌ها',
    profile: 'پروفایل',
    vmlTitle: 'VML',
    vmlSubtitle: 'لیگ برتر مجازی',
    switchLang: 'EN',
    
    // Hero Banner
    heroTagline: 'فراتر از یک بازی',
    heroTitlePart1: 'باشگاه تو',
    heroTitlePart2: 'داستان تو',
    heroSub: 'بسازید • مدیریت کنید • پیروز شوید',
    enterLeague: 'ورود به رقابت لیگ',

    // Quick Actions
    myTeam: 'تیم من',
    myTeamSub: 'ترکیب و بازیکنان',
    fixtures: 'برنامه بازی‌ها',
    fixturesSub: 'مسابقات پیش‌رو',
    league: 'جدول لیگ',
    leagueSub: 'رده‌بندی و امتیازات',
    market: 'نقل‌وانتقالات',
    marketSub: 'بازار و ارزش‌گذاری',
    community: 'جامعه و اخبار',
    communitySub: 'اطلاعیه‌ها و رویدادها',

    // Next Match
    nextMatch: 'مسابقه بعدی',
    viewAll: 'مشاهده همه',
    week: 'هفته',
    vs: 'VS',
    submitLineup: 'تنظیم و ارسال ترکیب',
    lineupReady: 'ترکیب تایید شده است',
    goToMatch: 'ورود به پخش زنده',
    noMatchScheduled: 'مسابقه‌ای برای این هفته تنظیم نشده است',

    // News
    latestNews: 'آخرین اخبار و حواشی',
    tagTransfer: 'نقل‌وانتقالات',
    tagLeague: 'اطلاعیه لیگ',
    tagTactics: 'راهنمای تاکتیکی',
    readMore: 'مطالعه کامل',
    close: 'بستن',

    // Bottom Navigation
    navHome: 'خانه',
    navTeam: 'تیم من',
    navLeague: 'جدول لیگ',
    navMarket: 'بازار',
    navProfile: 'پروفایل',

    // Drawer Menu Items
    drawerTitle: 'منوی ناوبری لیگ',
    liveStream: 'پخش زنده مسابقات',
    store: 'فروشگاه و بسته‌ها',
    battleRoyale: 'نبرد رویال بقا',
    facilities: 'امکانات و توسعه باشگاه',
    newsChannel: 'مطبوعات و چنل اخبار لیگ',
    adminPanel: 'اتاق داوری و مدیریت',
    settings: 'تنظیمات و راهنما',
    logout: 'خروج از حساب',
    languageLabel: 'زبان برنامه',
  },
  en: {
    dir: 'ltr',
    lang: 'en',
    // Header
    menu: 'Menu',
    notifications: 'Notifications',
    profile: 'Profile',
    vmlTitle: 'VML',
    vmlSubtitle: 'VIRTUAL MASTER LEAGUE',
    switchLang: 'فا',

    // Hero Banner
    heroTagline: 'MORE THAN A GAME',
    heroTitlePart1: 'YOUR CLUB',
    heroTitlePart2: 'YOUR STORY',
    heroSub: 'Build • Manage • Win',
    enterLeague: 'Enter the League',

    // Quick Actions
    myTeam: 'My Team',
    myTeamSub: 'Squad & Lineup',
    fixtures: 'Fixtures',
    fixturesSub: 'Upcoming Matches',
    league: 'League',
    leagueSub: 'Standings & Table',
    market: 'Market',
    marketSub: 'Transfers & Value',
    community: 'Community',
    communitySub: 'News & Updates',

    // Next Match
    nextMatch: 'NEXT MATCH',
    viewAll: 'View All',
    week: 'Week',
    vs: 'VS',
    submitLineup: 'Set & Submit Lineup',
    lineupReady: 'Lineup Confirmed',
    goToMatch: 'Go to Live Stream',
    noMatchScheduled: 'No matches scheduled currently',

    // News
    latestNews: 'Latest News',
    tagTransfer: 'Transfer',
    tagLeague: 'League',
    tagTactics: 'Tactics',
    readMore: 'Read Story',
    close: 'Close',

    // Bottom Navigation
    navHome: 'Home',
    navTeam: 'My Team',
    navLeague: 'League',
    navMarket: 'Market',
    navProfile: 'Profile',

    // Drawer Menu Items
    drawerTitle: 'VML Navigation',
    liveStream: 'Live Broadcast',
    store: 'Store & Packs',
    battleRoyale: 'Battle Royale',
    facilities: 'Club Facilities',
    newsChannel: 'Press & League News',
    adminPanel: 'Referee & Admin Room',
    settings: 'Settings & Guide',
    logout: 'Sign Out',
    languageLabel: 'Language',
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('vml_lang') || 'fa';
    } catch {
      return 'fa';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('vml_lang', lang);
    } catch {
      // quiet storage error
    }
    const dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = () => {
    setLang(prev => (prev === 'fa' ? 'en' : 'fa'));
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations.fa[key] || key;
  };

  const isRtl = lang === 'fa';

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, isRtl }}>
      <div dir={isRtl ? 'rtl' : 'ltr'} className={`min-h-screen ${isRtl ? 'font-sans dir-rtl' : 'font-sans dir-ltr'}`}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      lang: 'fa',
      isRtl: true,
      t: (k) => translations.fa[k] || k,
      toggleLang: () => {},
    };
  }
  return context;
}
