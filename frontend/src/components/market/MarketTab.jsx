import React, { useState, useEffect } from 'react';
import SubNav from '../common/SubNav';
import { History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { transferApi } from '../../services/api';
import Toast from '../common/Toast';
import LeagueDirectory from './LeagueDirectory';
import PlayerProfileModal from './PlayerProfileModal';
import MakeOfferModal from './MakeOfferModal';
import TransferInbox from './TransferInbox';

const MARKET_SUBNAV = [
  { id: 'scout', label: 'اسکوتینگ (لیگ)' },
  { id: 'inbox', label: 'صندوق پیام' },
  { id: 'sell', label: 'بازیکنان آزاد' },
  { id: 'history', label: 'تاریخچه' },
];

export default function MarketTab({ teamData }) {
  const [activeSub, setActiveSub] = useState('scout');
  const [transferHistory, setTransferHistory] = useState([]);
  const [actionMessage, setActionMessage] = useState('');

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showOfferModal, setShowOfferModal] = useState(false);

  useEffect(() => {
    if (activeSub === 'history') {
      transferApi.getHistory()
        .then(res => setTransferHistory(res.data))
        .catch(err => console.error(err));
    }
  }, [activeSub]);

  const showNotification = (msg) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handlePlayerSelect = (player, team) => {
    setSelectedPlayer(player);
    setSelectedTeam(team);
  };

  const openOfferModal = () => {
    setShowOfferModal(true);
  };

  const handleMakeOffer = async (payload) => {
    try {
      await transferApi.createOffer(payload);
      showNotification('پیشنهاد با موفقیت ارسال شد و در صندوق خروجی قرار گرفت!');
      setShowOfferModal(false);
      setSelectedPlayer(null);
    } catch (err) {
      showNotification('خطا در ارسال پیشنهاد: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleReleasePlayer = async (playerId) => {
    if (!window.confirm('آیا مطمئن هستید که می‌خواهید قرارداد این بازیکن را فسخ کنید؟ ۲۰٪ ارزش او به باشگاه بازگردانده می‌شود.')) return;
    try {
      await transferApi.releasePlayer(playerId);
      showNotification('بازیکن آزاد شد.');
      // Need a way to refresh teamData, usually it trickles down from parent, but a refresh might be needed
    } catch (err) {
      showNotification('خطا در آزادسازی بازیکن.');
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <Toast message={actionMessage} isVisible={!!actionMessage} type="success" />
      <SubNav items={MARKET_SUBNAV} activeId={activeSub} onChange={setActiveSub} />

      {activeSub === 'scout' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="mb-4 text-[11px] text-cyan-300 bg-cyan-950/40 p-3 rounded-2xl border border-cyan-500/30 font-medium">
            💡 برای بررسی مشخصات کامل، هوش مصنوعی و ارسال پیشنهاد رسمی خرید، روی کارت بازیکنان تیم‌ها کلیک کنید.
          </div>
          <LeagueDirectory currentTeamId={teamData?.id} onPlayerSelect={handlePlayerSelect} />
        </motion.div>
      )}

      {activeSub === 'inbox' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <TransferInbox teamData={teamData} onStatusMessage={showNotification} />
        </motion.div>
      )}

      {activeSub === 'sell' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="fc-card p-4 sm:p-5 rounded-3xl border border-slate-700/60 space-y-3.5 text-xs shadow-xl">
            <h3 className="font-black text-white border-b border-slate-700/60 pb-2 text-sm tracking-tight">لیست بازیکنان باشگاه جهت آزادسازی یا فسخ</h3>
            <p className="text-slate-400 text-[11px] mb-3">آزادسازی بازیکن، او را به لیست بازیکنان آزاد منتقل نموده و ۲۰٪ ارزش تخمینی او به خزانه واریز می‌گردد.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(teamData?.players || []).map(p => (
                <div key={p.id} className="flex justify-between items-center bg-[#05080e]/70 p-3 rounded-2xl border border-slate-700/50 hover:border-cyan-400/40 transition-all">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-200 flex items-center justify-center font-black text-slate-950 text-xs font-sport shadow">
                      {p.overall || 75}
                    </div>
                    <div>
                      <span className="font-black text-white block text-xs">{p.name}</span>
                      <span className="text-[10px] text-cyan-300 font-sport">{p.position} | ارزش: ${(p.wage ? Number(p.wage * 50).toLocaleString() : '50,000')}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleReleasePlayer(p.id)}
                    className="bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded-xl text-[10.5px] font-black transition-all border border-rose-500/30 cursor-pointer font-sport"
                  >
                    فسخ قرارداد
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {activeSub === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fc-card p-4 sm:p-5 rounded-3xl border border-slate-700/60 space-y-3 text-xs shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-700/60 pb-2">
            <History size={17} className="text-cyan-400" />
            <span className="font-black text-white text-sm">تاریخچه رسمی نقل و انتقالات لیگ</span>
          </div>
          <div className="space-y-2 pt-1 font-sport">
            {transferHistory.slice(0, 10).map((item, idx) => (
              <div key={item.id || idx} className="flex justify-between items-center p-3 rounded-2xl bg-[#05080e]/60 border border-slate-700/50">
                <span className="font-bold text-white text-xs font-sans">
                  {item.player_name} — <strong className="text-cyan-300">{item.seller_team_name}</strong> ➔ <strong className="text-[#00ff87]">{item.buyer_team_name}</strong>
                </span>
                <span className="text-amber-300 font-black dir-ltr text-xs">
                  ${Number(item.price_usd || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {selectedPlayer && !showOfferModal && (
          <PlayerProfileModal 
            player={selectedPlayer} 
            team={selectedTeam} 
            onClose={() => setSelectedPlayer(null)} 
            onMakeOffer={() => setShowOfferModal(true)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOfferModal && selectedPlayer && selectedTeam && (
          <MakeOfferModal 
            player={selectedPlayer} 
            targetTeam={selectedTeam} 
            myTeam={teamData}
            onClose={() => {
              setShowOfferModal(false);
              setSelectedPlayer(null);
            }} 
            onSubmitOffer={handleMakeOffer} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
