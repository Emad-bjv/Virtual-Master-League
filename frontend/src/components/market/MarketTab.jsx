import React, { useState, useEffect } from 'react';
import SubNav from '../common/SubNav';
import { History, User, Sparkles, UserPlus, FileText, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { transferApi } from '../../services/api';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import Toast from '../common/Toast';
import LeagueDirectory from './LeagueDirectory';
import PlayerProfileModal from './PlayerProfileModal';
import MakeOfferModal from './MakeOfferModal';
import TransferInbox from './TransferInbox';
import ConfirmModal from '../common/ConfirmModal';

const MARKET_SUBNAV = [
  { id: 'scout', label: 'استعدادیابی و بررسی رقبا' },
  { id: 'inbox', label: 'صندوق پیام' },
  { id: 'sell', label: 'بازیکنان آزاد' },
  { id: 'history', label: 'تاریخچه' },
];

export default function MarketTab({ teamData, onRefreshTeam }) {
  const [activeSub, setActiveSub] = useState('scout');
  const [transferHistory, setTransferHistory] = useState([]);
  const [freeAgents, setFreeAgents] = useState([]);
  const [freeAgentTab, setFreeAgentTab] = useState('pool'); // 'pool' | 'release'
  const [freeAgentSearch, setFreeAgentSearch] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [playerToRelease, setPlayerToRelease] = useState(null);
  const [playerToSign, setPlayerToSign] = useState(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  useEffect(() => {
    if (activeSub === 'history') {
      transferApi.getHistory()
        .then(res => setTransferHistory(res.data))
        .catch(err => console.error(err));
    } else if (activeSub === 'sell') {
      loadFreeAgents();
    }
  }, [activeSub]);

  const loadFreeAgents = () => {
    transferApi.getFreeAgents()
      .then(res => setFreeAgents(res.data || []))
      .catch(err => {
        console.error(err);
        setFreeAgents([]);
      });
  };

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
      if (onRefreshTeam) onRefreshTeam();
    } catch (err) {
      showNotification('خطا در ارسال پیشنهاد: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleReleasePlayerConfirm = async () => {
    if (!playerToRelease) return;
    setIsReleasing(true);
    try {
      await transferApi.releasePlayer(playerToRelease.id);
      showNotification(`قرارداد ${playerToRelease.name} با موفقیت فسخ شد و به لیست بازیکنان آزاد منتقل گردید.`);
      setPlayerToRelease(null);
      loadFreeAgents();
      if (onRefreshTeam) onRefreshTeam();
    } catch (err) {
      showNotification('خطا در آزادسازی بازیکن: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsReleasing(false);
    }
  };

  const handleSignFreeAgentConfirm = async () => {
    if (!playerToSign) return;
    setIsSigning(true);
    try {
      await transferApi.signFreeAgent(playerToSign.id);
      showNotification(`بازیکن آزاد «${playerToSign.name}» با موفقیت به باشگاه شما پیوست!`);
      setPlayerToSign(null);
      loadFreeAgents();
      if (onRefreshTeam) onRefreshTeam();
    } catch (err) {
      showNotification('خطا در جذب بازیکن آزاد: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSigning(false);
    }
  };

  const filteredFreeAgents = freeAgents.filter(p => 
    !freeAgentSearch || p.name.toLowerCase().includes(freeAgentSearch.toLowerCase()) || p.position.toLowerCase().includes(freeAgentSearch.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-20">
      <Toast message={actionMessage} isVisible={!!actionMessage} type="success" />
      <SubNav items={MARKET_SUBNAV} activeId={activeSub} onChange={setActiveSub} />

      {activeSub === 'scout' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <LeagueDirectory currentTeamId={teamData?.id} onPlayerSelect={handlePlayerSelect} />
        </motion.div>
      )}

      {activeSub === 'inbox' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <TransferInbox teamData={teamData} onStatusMessage={showNotification} onRefreshTeam={onRefreshTeam} />
        </motion.div>
      )}

      {activeSub === 'sell' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Sub Switch: Free Agent Pool vs Club Contract Termination */}
          <div className="flex bg-[#05080e] p-1.5 rounded-2xl border border-slate-800 font-sport text-xs font-bold gap-1">
            <button
              onClick={() => setFreeAgentTab('pool')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all cursor-pointer ${
                freeAgentTab === 'pool'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus size={15} />
              <span>بازار بازیکنان آزاد لیگ ({freeAgents.length})</span>
            </button>
            <button
              onClick={() => setFreeAgentTab('release')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all cursor-pointer ${
                freeAgentTab === 'release'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText size={15} />
              <span>فسخ و آزادسازی بازیکنان شما ({teamData?.players?.length || 0})</span>
            </button>
          </div>

          {/* VIEW A: FREE AGENTS POOL (ALL UNASSIGNED PLAYERS) */}
          {freeAgentTab === 'pool' && (
            <div className="fc-card p-4 sm:p-5 rounded-3xl border border-cyan-500/30 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                <div>
                  <h3 className="font-black text-white text-sm tracking-tight flex items-center gap-2">
                    <span>بازار آزاد لیگ (Free Agents)</span>
                    <span className="text-[10.5px] font-sport text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-lg border border-cyan-500/40">
                      {freeAgents.length} بازیکن در دسترس
                    </span>
                  </h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    بازیکنانی که در حال حاضر عضو تیمی نیستند و بدون هزینه رضایت‌نامه، با پرداخت ارزش پایه مستقیماً به تیم شما می‌پیوندند.
                  </p>
                </div>

                <div className="relative min-w-[200px]">
                  <input
                    type="text"
                    value={freeAgentSearch}
                    onChange={(e) => setFreeAgentSearch(e.target.value)}
                    placeholder="جستجوی بازیکن آزاد..."
                    className="w-full bg-[#05080e] border border-slate-700/80 rounded-xl py-1.5 pr-8 pl-3 text-white text-xs outline-none focus:border-cyan-400 transition-all placeholder:text-slate-500"
                  />
                  <Search className="absolute right-2.5 top-2 text-cyan-400" size={14} />
                </div>
              </div>

              {filteredFreeAgents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-[#05080e]/40 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-2xl block">🌟</span>
                  <p className="font-bold text-white">در حال حاضر بازیکن آزادی با این مشخصات وجود ندارد.</p>
                  <p className="text-[10.5px] text-slate-500">با آزادسازی بازیکنان توسط باشگاه‌ها، بازیکنان جدید در این بخش ظاهر می‌شوند.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredFreeAgents.map((p) => {
                    const estValue = Number(p.market_value || (p.wage ? p.wage * 50 : 1000000));
                    return (
                      <div
                        key={p.id}
                        className="flex flex-col justify-between p-3 rounded-2xl border border-slate-700/60 bg-gradient-to-b from-[#080c14] via-[#0d162a] to-[#05080e] hover:border-cyan-400/60 transition-all shadow-md gap-3"
                      >
                        {/* Top: Photo, Details, Badges */}
                        <div className="flex items-center gap-3">
                          {/* Portrait Photo */}
                          <div className="w-13 h-15 rounded-2xl overflow-hidden border border-slate-700 bg-gradient-to-b from-[#0f172a] to-[#05080e] shrink-0 flex items-center justify-center relative shadow-inner">
                            {getPlayerPhotoUrl(p) ? (
                              <img
                                src={getPlayerPhotoUrl(p)}
                                alt={p.name}
                                className="w-full h-full object-cover object-top"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <User size={22} className="text-slate-400 opacity-75" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="space-y-0.5 truncate flex-1 font-sport">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/40">
                                {p.position}
                              </span>
                              <span className="text-[10px] font-black text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/40">
                                OVR {p.overall}
                              </span>
                              {p.potential_ovr && p.potential_ovr > p.overall && (
                                <span className="text-[9.5px] font-black text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-500/40">
                                  POT {p.potential_ovr}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs sm:text-sm font-black text-white truncate font-sans">
                              {p.name}
                            </h4>
                            <div className="text-[10px] text-slate-400">
                              سن: <strong className="text-slate-200">{p.age || 25} سال</strong>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Action */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2 font-sport">
                          <div>
                            <span className="text-[9.5px] text-slate-400 block leading-tight">هزینه جذب</span>
                            <span className="text-xs font-black text-[#00ff87] dir-ltr block">
                              €{estValue.toLocaleString()}
                            </span>
                          </div>

                          <button
                            onClick={() => setPlayerToSign(p)}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
                          >
                            <UserPlus size={13} className="text-slate-950" />
                            <span>جذب بازیکن ⚡</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW B: SQUAD PLAYERS CONTRACT TERMINATION / RELEASE */}
          {freeAgentTab === 'release' && (
            <div className="fc-card p-4 sm:p-5 rounded-3xl border border-slate-700/60 space-y-3.5 text-xs shadow-xl">
              <h3 className="font-black text-white border-b border-slate-700/60 pb-2 text-sm tracking-tight flex items-center justify-between">
                <span>لیست بازیکنان باشگاه جهت آزادسازی یا فسخ</span>
                <span className="text-xs text-amber-400 font-sport">تعداد: {teamData?.players?.length || 0} بازیکن</span>
              </h3>
              <p className="text-slate-400 text-[11px] mb-3">
                با آزادسازی هر بازیکن، او به لیست بازیکنان آزاد لیگ منتقل شده و ۲۰٪ ارزش تخمینی او بلافاصله به خزانه باشگاه واریز می‌گردد.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(teamData?.players || []).map((p) => {
                  const estValue = Number(p.market_value || (p.wage ? p.wage * 50 : 1000000));
                  return (
                    <div
                      key={p.id}
                      className="flex flex-col justify-between p-3 rounded-2xl border border-slate-700/50 bg-[#05080e]/80 hover:border-cyan-400/40 transition-all shadow-md gap-3"
                    >
                      {/* Top: Photo & Info */}
                      <div className="flex items-center gap-3">
                        {/* Portrait Photo */}
                        <div className="w-13 h-15 rounded-2xl overflow-hidden border border-slate-700 bg-gradient-to-b from-[#0f172a] to-[#05080e] shrink-0 flex items-center justify-center relative shadow-inner">
                          {getPlayerPhotoUrl(p) ? (
                            <img
                              src={getPlayerPhotoUrl(p)}
                              alt={p.name}
                              className="w-full h-full object-cover object-top"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <User size={22} className="text-slate-400 opacity-75" />
                          )}
                        </div>

                        {/* Player Details */}
                        <div className="space-y-0.5 truncate flex-1 font-sport">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-500/40">
                              {p.position}
                            </span>
                            <span className="text-[10px] font-black text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/40">
                              OVR {p.overall}
                            </span>
                            {p.potential_ovr && (
                              <span className="text-[9.5px] font-bold text-slate-300 bg-slate-900/90 px-1.5 py-0.2 rounded border border-slate-700/60">
                                POT {p.potential_ovr}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs sm:text-sm font-black text-white truncate font-sans">
                            {p.name}
                          </h4>
                          <div className="text-[10px] text-slate-400">
                            ارزش: <strong className="text-[#00ff87]">€{estValue.toLocaleString()}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2 font-sport">
                        <span className="text-[10px] text-slate-400">
                          بازگشت مالی: <strong className="text-emerald-400">+${Math.round(estValue * 0.2).toLocaleString()}</strong>
                        </span>

                        <button 
                          onClick={() => setPlayerToRelease(p)}
                          className="bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded-xl text-[10.5px] font-black transition-all border border-rose-500/30 cursor-pointer"
                        >
                          فسخ قرارداد 📄
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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

      {/* Confirmation for Signing Free Agent */}
      {playerToSign && (
        <ConfirmModal
          isOpen={!!playerToSign}
          title="جذب بازیکن آزاد (Free Agent Signing)"
          message={`آیا از جذب بازیکن آزاد «${playerToSign.name}» (${playerToSign.position} - OVR ${playerToSign.overall}) اطمینان دارید؟`}
          details={
            <div className="space-y-1.5 text-xs font-sport">
              <div className="flex justify-between text-slate-300">
                <span>هزینه جذب به خزانه:</span>
                <span className="text-amber-400 font-bold dir-ltr">
                  ${Number(playerToSign.market_value || 1000000).toLocaleString()}
                </span>
              </div>
            </div>
          }
          confirmText="بله، جذب بازیکن"
          cancelText="خیر، انصراف"
          onConfirm={handleSignFreeAgentConfirm}
          onCancel={() => setPlayerToSign(null)}
          loading={isSigning}
        />
      )}

      {/* Confirmation for Releasing Player */}
      {playerToRelease && (
        <ConfirmModal
          isOpen={!!playerToRelease}
          title="فسخ قرارداد و آزادسازی بازیکن"
          message={`آیا از فسخ قرارداد «${playerToRelease.name}» (${playerToRelease.position} - OVR ${playerToRelease.overall}) اطمینان دارید؟`}
          details={
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>وضعیت انتقال:</span>
                <span className="text-amber-400 font-bold">انتقال به لیست بازیکنان آزاد لیگ</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>بازگشت بودجه به خزانه (۲۰٪):</span>
                <span className="text-[#00ff87] font-black font-sport">
                  +${Math.round(Number(playerToRelease.market_value || 1000000) * 0.2).toLocaleString()}
                </span>
              </div>
            </div>
          }
          confirmText="بله، فسخ قرارداد"
          cancelText="خیر، انصراف"
          variant="danger"
          isLoading={isReleasing}
          onConfirm={handleReleasePlayerConfirm}
          onCancel={() => setPlayerToRelease(null)}
        />
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
