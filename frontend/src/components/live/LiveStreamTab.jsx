import React, { useState, useEffect } from 'react';
import { Tv, Radio, Activity, CheckCircle2, Sliders, X, Shield, Clock, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EFootballGamePlan from '../team/EFootballGamePlan';

const DEFAULT_MATCH_EVENTS = [
  { id: 1, type: 'GOAL', text: 'گل دوم برای باشگاه البرز توسط محمد صلاح! ⚽', team: 'البرز', icon: '⚽', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40' },
  { id: 2, type: 'YELLOW_CARD', text: 'کارت زرد برای بازیکن سپاهان (محمد کریمی) 🟨', team: 'سپاهان', icon: '🟨', color: 'text-amber-400 border-amber-500/40 bg-amber-950/40' },
  { id: 3, type: 'SUB', text: 'تعویض زنده: ورود رضاییان به جای مغانلو 🔄', team: 'سپاهان', icon: '🔄', color: 'text-purple-400 border-purple-500/40 bg-purple-950/40' },
  { id: 4, type: 'YELLOW_CARD', text: 'کارت زرد برای ویرجیل فن دایک 🟨', team: 'البرز', icon: '🟨', color: 'text-amber-400 border-amber-500/40 bg-amber-950/40' },
  { id: 5, type: 'GOAL', text: 'گل اول مسابقه برای سپاهان توسط شهریار مغانلو ⚽', team: 'سپاهان', icon: '⚽', color: 'text-rose-400 border-rose-500/40 bg-rose-950/40' },
];

export default function LiveStreamTab({ liveStreamUrl, liveEvents = [], onAddEvent, currentMatchStatus, onMatchStatusChange }) {
  const [events, setEvents] = useState(liveEvents.length > 0 ? liveEvents : DEFAULT_MATCH_EVENTS);
  const [gamePlanModalOpen, setGamePlanModalOpen] = useState(false);
  const [matchState, setMatchState] = useState(currentMatchStatus || 'FIRST_HALF'); // 'FIRST_HALF' | 'HALF_TIME' | 'SECOND_HALF' | 'FINISHED'
  const [halfTimeSeconds, setHalfTimeSeconds] = useState(30);
  const [subsCount, setSubsCount] = useState(1); // 1 sub already done in demo, max 5 allowed
  const [saveToast, setSaveToast] = useState('');

  // Sync external status change from Admin if provided
  useEffect(() => {
    if (currentMatchStatus && currentMatchStatus !== matchState) {
      setMatchState(currentMatchStatus);
    }
  }, [currentMatchStatus]);

  // 30-Second Half Time Countdown Timer Logic
  useEffect(() => {
    let interval = null;
    if (matchState === 'HALF_TIME') {
      setHalfTimeSeconds(30);
      interval = setInterval(() => {
        setHalfTimeSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setMatchState('SECOND_HALF');
            if (onMatchStatusChange) onMatchStatusChange('SECOND_HALF');
            
            const autoEv = {
              id: Date.now(),
              type: 'GAME_STATUS',
              text: 'زمان استراحت ۳۰ ثانیه‌ای بین دو نیمه به پایان رسید! نیمه دوم آغاز شد ⚽ (تاکتیک‌ها مجدداً قفل شدند)',
              team: 'سیستم داوری',
              icon: '⚽',
              color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
            };
            setEvents((prevEvs) => [autoEv, ...prevEvs]);
            if (onAddEvent) onAddEvent(autoEv);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [matchState]);

  const aparatEmbedSrc = liveStreamUrl || "https://www.aparat.com/embed/live/VML.Emad";

  const handleSaveGamePlan = (updatedPlan) => {
    // Check if a sub was performed
    const newSubsCount = Math.min(5, subsCount + 1);
    setSubsCount(newSubsCount);

    const newEv = {
      id: Date.now(),
      type: 'TACTICS',
      text: `بروزرسانی ترکیب/تاکتیک مربی: تغییرات چیدمان (${updatedPlan.currentFormation}) اعمال گردید (تعویض ${newSubsCount} از ۵) ⚡`,
      team: 'البرز',
      icon: '⚡',
      color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
    };

    setEvents([newEv, ...events]);
    if (onAddEvent) onAddEvent(newEv);

    setSaveToast(`تغییرات ترکیبی با موفقیت ثبت شد (تعداد تعویض‌های مصرف‌شده: ${newSubsCount} از ۵).`);
    setTimeout(() => setSaveToast(''), 4500);

    setGamePlanModalOpen(false);
  };

  return (
    <div className="space-y-4 pb-20 font-sans dir-rtl">
      {/* Live Match Top Scoreboard Banner */}
      <div className="glass-panel p-4 rounded-3xl border border-rose-500/40 bg-gradient-to-r from-rose-950/60 via-slate-900 to-purple-950/60 flex items-center justify-between shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping absolute top-0 left-0"></div>
            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
          </div>
          <div>
            <span className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
              <Tv size={14} /> پخش زنده آپارات (LIVE STREAM)
            </span>
            <h2 className="text-sm md:text-base font-black text-white mt-0.5">
              باشگاه البرز ۲ - ۱ سپاهان اصفهان
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Demo Match State Switcher (for testing tactics during first half / halftime) */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900/80 p-1 rounded-2xl border border-slate-800 text-[10px] font-bold">
            <span className="text-slate-400 px-1">وضعیت بازی:</span>
            <button
              onClick={() => setMatchState('FIRST_HALF')}
              className={`px-2 py-0.5 rounded-xl transition-all ${
                matchState === 'FIRST_HALF' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              نیمه اول
            </button>
            <button
              onClick={() => setMatchState('HALF_TIME')}
              className={`px-2 py-0.5 rounded-xl transition-all ${
                matchState === 'HALF_TIME' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              بین دو نیمه
            </button>
          </div>

          <span className="text-xs font-bold text-rose-400 bg-rose-950/80 px-3 py-1 rounded-full border border-rose-500/40 flex items-center gap-1">
            <Radio size={13} className="animate-pulse" />
            در حال برگزاری (LIVE)
          </span>
        </div>
      </div>

      {saveToast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-cyan-300 font-bold bg-cyan-950/90 p-3 rounded-2xl border border-cyan-500/40 text-center shadow-lg flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={16} className="text-cyan-400" />
          <span>{saveToast}</span>
        </motion.div>
      )}

      {/* 1. APARAT LIVE VIDEO STREAM PLAYER CONTAINER */}
      <div className="glass-panel p-2 md:p-3 rounded-3xl border border-slate-800 space-y-2 shadow-2xl relative overflow-hidden bg-slate-950">
        <div className="flex justify-between items-center px-2 py-1 text-xs text-slate-300">
          <span className="font-bold text-rose-400 flex items-center gap-1.5">
            <Radio size={15} className="animate-pulse text-rose-500" />
            استریم زنده مسابقه مستر لیگ
          </span>
          <span className="text-[10.5px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
            کیفیت HD 1080p | آپارات
          </span>
        </div>

        {/* Official Aparat Live Video Embed Frame */}
        <div className="h_iframe-aparat_embed_frame relative w-full rounded-2xl overflow-hidden border border-slate-800/80 bg-black shadow-inner">
          <span style={{ display: 'block', paddingTop: '57%' }}></span>
          <iframe
            src={aparatEmbedSrc}
            title="Aparat Live Stream VML.Emad"
            className="absolute top-0 left-0 w-full h-full border-0"
            scrolling="no"
            allowFullScreen={true}
            webkitallowfullscreen="true"
            mozallowfullscreen="true"
          ></iframe>
        </div>
      </div>

      {/* 2. REAL-TIME LIVE MATCH EVENTS TICKER */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Activity size={16} className="text-cyan-400" />
            <span>اتفاقات و گزارش لحظه‌ای مسابقه (Live Ticker)</span>
          </h3>
          <span className="text-[10px] text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-mono">
            همگام‌سازی زنده با ادمین
          </span>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {events.map((ev) => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between group transition-all ${ev.color}`}
            >
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-sm">{ev.icon}</span>
                <span className="font-semibold text-slate-200">{ev.text}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-mono bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700/50">
                  ثبت شد
                </span>
                <button
                  onClick={() => setEvents((prev) => prev.filter((e) => e.id !== ev.id))}
                  className="p-1 rounded-lg hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-transparent hover:border-rose-800 transition-all opacity-80 group-hover:opacity-100"
                  title="لغو / حذف این رویداد"
                >
                  🗑️
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 30-SECOND HALF TIME TIMER COUNTDOWN BANNER */}
      {matchState === 'HALF_TIME' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-4 rounded-3xl border-2 border-amber-500/70 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 text-amber-200 shadow-2xl flex items-center justify-between animate-pulse"
        >
          <div className="flex items-center gap-3">
            <Timer size={28} className="text-amber-400 animate-spin" />
            <div>
              <h3 className="font-black text-white text-sm md:text-base">زمان استراحت بین دو نیمه مربیان (Half-Time)</h3>
              <p className="text-xs text-amber-300">در حال حاضر امکان تغییر تاکتیک‌ها و انجام تعویض‌ها فعال است.</p>
            </div>
          </div>
          <div className="bg-amber-500 text-slate-950 px-4 py-2 rounded-2xl font-black text-lg md:text-xl font-mono shadow-xl border border-amber-300 shrink-0">
            ⏱️ {halfTimeSeconds}s
          </div>
        </motion.div>
      )}

      {/* 3. COACH LIVE GAME PLAN & SUBSTITUTION TRIGGER BUTTON */}
      <div className="glass-panel p-5 rounded-3xl border border-purple-500/40 bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-right">
          <div className="w-12 h-12 rounded-2xl bg-purple-900/60 border border-purple-500/50 flex items-center justify-center text-cyan-400 shadow-inner">
            <Sliders size={24} />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black text-white flex items-center gap-2">
              <span>مدیریت ترکیب و تاکتیک‌های زنده مربی</span>
              <span className="text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/40 px-2 py-0.5 rounded-full">
                تعویض {subsCount} از ۵
              </span>
            </h3>
            <p className="text-xs text-purple-300 mt-0.5">
              انجام تعویض در هر لحظه (حداکثر ۵ تعویض) + تغییر تاکتیک در استراحت بین دو نیمه
            </p>
          </div>
        </div>

        <button
          onClick={() => setGamePlanModalOpen(true)}
          className="w-full md:w-auto bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-slate-950 font-black px-6 py-3.5 rounded-2xl shadow-xl hover:shadow-cyan-500/20 transition-all text-xs md:text-sm flex items-center justify-center gap-2 border border-cyan-300 shrink-0"
        >
          <Sliders size={18} />
          <span>تغییر ترکیب / تاکتیک مربی</span>
        </button>
      </div>

      {/* 4. FULL-SCREEN POPUP MODAL FOR EFOOTBALL GAME PLAN */}
      <AnimatePresence>
        {gamePlanModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-5xl my-auto glass-panel rounded-3xl border border-purple-500/50 overflow-hidden shadow-2xl relative max-h-[92vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-[#180026] text-white p-4 border-b border-purple-800/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <Shield size={20} className="text-rose-500" />
                  <h3 className="font-black text-sm md:text-base">پنل تاکتیک و تعویض زنده مسابقه</h3>
                </div>

                <div className="flex items-center gap-3">
                  {matchState === 'HALF_TIME' ? (
                    <div className="flex items-center gap-1.5 bg-amber-500 text-slate-950 px-3 py-1 rounded-xl text-xs font-black font-mono animate-pulse shadow-md">
                      <Timer size={15} />
                      <span>زمان باقی‌مانده استراحت: {halfTimeSeconds} ثانیه</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-slate-900/90 px-3 py-1 rounded-xl border border-slate-700 text-xs font-bold text-slate-300">
                      <Clock size={14} className="text-cyan-400" />
                      <span>وضعیت: {matchState === 'FIRST_HALF' ? 'نیمه اول' : matchState === 'SECOND_HALF' ? 'نیمه دوم' : 'پایان بازی'}</span>
                    </div>
                  )}

                  <button
                    onClick={() => setGamePlanModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-slate-700"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body: EFootballGamePlan Component */}
              <div className="flex-1 overflow-y-auto p-2 sm:p-4 custom-scrollbar bg-slate-950/60">
                <EFootballGamePlan
                  teamName="باشگاه البرز (میزبان)"
                  isLiveMode={true}
                  matchState={matchState}
                  halfTimeSeconds={halfTimeSeconds}
                  subsUsed={subsCount}
                  maxSubs={5}
                  onSave={handleSaveGamePlan}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
