import React, { useState, useEffect } from 'react';
import SubNav from '../common/SubNav';
import { Check, X, Eye, DollarSign, Gavel, Compass, History, Tag, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { transferApi } from '../../services/api';
import CustomSelect from '../common/CustomSelect';
import Toast from '../common/Toast';

const MARKET_SUBNAV = [
  { id: 'buy', label: 'خرید' },
  { id: 'sell', label: 'فروش' },
  { id: 'offers', label: 'پیشنهادها' },
  { id: 'history', label: 'تاریخچه' },
];

export default function MarketTab({ teamData }) {
  const [activeSub, setActiveSub] = useState('buy');
  const [marketListings, setMarketListings] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);
  const [actionMessage, setActionMessage] = useState('');

  // Bid Modal State
  const [selectedBidListing, setSelectedBidListing] = useState(null);
  const [bidAmount, setBidAmount] = useState('');

  // Create Listing State (Sell tab)
  const [selectedPlayerToSell, setSelectedPlayerToSell] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [listingType, setListingType] = useState('FIXED_PRICE');

  // Scouting Report Modal State
  const [scoutedProspect, setScoutedProspect] = useState(null);

  useEffect(() => {
    transferApi
      .getMarketListings()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setMarketListings(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load market listings:', err);
      });

    transferApi
      .getHistory()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setTransferHistory(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load transfer history:', err);
      });
  }, []);

  const handleBuyPlayer = async (listingId) => {
    if (!teamData) return;
    try {
      await transferApi.buyDirect({ listing_id: listingId, buyer_team_id: teamData.id });
      setActionMessage('خرید با موفقیت در دیتابیس ثبت شد!');
    } catch (err) {
      setActionMessage('خطا در خرید بازیکن');
    } finally {
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    if (!selectedBidListing || !bidAmount || !teamData) return;
    try {
      await transferApi.placeBid({
        listing_id: selectedBidListing.id,
        bidder_team_id: teamData.id,
        amount_usd: parseFloat(bidAmount),
      });
      setActionMessage(`پیشنهاد ${parseInt(bidAmount).toLocaleString('fa-IR')} دلار ثبت شد!`);
    } catch (err) {
      setActionMessage(`خطا در ثبت پیشنهاد`);
    } finally {
      setSelectedBidListing(null);
      setBidAmount('');
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (!selectedPlayerToSell || !sellPrice || !teamData) return;
    try {
      await transferApi.createListing({
        player_id: parseInt(selectedPlayerToSell),
        seller_team_id: teamData.id,
        price_usd: parseFloat(sellPrice),
        listing_type: listingType,
      });
      setActionMessage('آگهی فروش با موفقیت در بازار ثبت شد!');
    } catch (err) {
      setActionMessage('خطا در ثبت آگهی فروش');
    } finally {
      setSelectedPlayerToSell('');
      setSellPrice('');
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <Toast message={actionMessage} isVisible={!!actionMessage} type="success" />
      <SubNav items={MARKET_SUBNAV} activeId={activeSub} onChange={setActiveSub} />

      {/* Subtab 1: Buy (Holographic Card Listings) */}
      {activeSub === 'buy' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="text-[11px] text-cyan-300 bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-500/30 flex justify-between items-center">
            <span>ظرفیت لیست تیم: ۱۱ / ۲۵ بازیکن (مجاز)</span>
            <span className="text-[10px] text-purple-300 font-mono">تخفیف استعدادیابی: ۳.۲٪</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketListings.length > 0 ? (
              marketListings.map((item) => (
                <div
                  key={item.id}
                  className="glass-panel p-3.5 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900 to-cyan-950/40 flex items-center justify-between text-xs shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-14 rounded-xl bg-gradient-to-tr from-amber-500 via-purple-600 to-cyan-400 p-0.5 shadow-lg flex flex-col items-center justify-center text-center">
                      <div className="w-full h-full bg-slate-950 rounded-[10px] flex flex-col items-center justify-center p-1">
                        <span className="text-sm font-black text-amber-400">79</span>
                        <span className="text-[9px] font-bold text-cyan-300 dir-ltr">ST</span>
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-white text-sm block">{item.player_name || 'نام بازیکن'}</span>
                      <span className="text-[10.5px] text-slate-400">فروشنده: {item.seller_team_name || 'باشگاه فروشنده'}</span>
                      <div className="flex gap-1.5 mt-1">
                        <span className="text-[9.5px] bg-purple-900/60 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/40">
                          {item.listing_type === 'AUCTION' ? 'مزایده' : 'قیمت مقطوع'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-xs font-black text-cyan-400 dir-ltr">
                      {(item.price_usd || 200000).toLocaleString('fa-IR')} $
                    </span>
                    {item.listing_type === 'AUCTION' ? (
                      <button
                        onClick={() => setSelectedBidListing(item)}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-xl transition-all shadow-md shadow-purple-600/30 flex items-center gap-1"
                      >
                        <Gavel size={13} />
                        <span>ثبت پیشنهاد</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyPlayer(item.id)}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl transition-all shadow-md shadow-cyan-500/30 flex items-center gap-1"
                      >
                        <DollarSign size={13} />
                        <span>خرید مستقیم</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
                هیچ بازیکنی در حال حاضر برای فروش لیست نشده است.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Subtab 2: Sell (Create Listing Form) */}
      {activeSub === 'sell' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <form onSubmit={handleCreateListing} className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Tag size={16} className="text-purple-400" />
              <span className="font-bold text-white">ثبت آگهی جدید در بازار نقل و انتقالات</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><ShieldAlert size={15} className="text-amber-400" /> مالیات فروش:</span>
              <strong className="text-amber-400 font-mono">۵٪ مالیات کسر می‌شود</strong>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">انتخاب بازیکن جهت فروش</label>
              <CustomSelect
                value={selectedPlayerToSell}
                onChange={setSelectedPlayerToSell}
                colorTheme="cyan"
                options={[
                  { value: '', label: 'یک بازیکن انتخاب کنید...' },
                  ...(teamData?.players || []).map((p) => ({
                    value: String(p.id),
                    label: `${p.name} (${p.position} - OVR ${p.overall})`,
                  })),
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">نوع آگهی</label>
                <CustomSelect
                  value={listingType}
                  onChange={setListingType}
                  colorTheme="cyan"
                  options={[
                    { value: 'FIXED_PRICE', label: 'قیمت مقطوع' },
                    { value: 'AUCTION', label: 'مزایده عمومی' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">قیمت (دلار مجازی)</label>
                <input
                  type="number"
                  required
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="مثلا: 150000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-cyan-500 dir-ltr"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-600/30 transition-all"
            >
              ثبت آگهی فروش در بازار
            </button>
          </form>
        </motion.div>
      )}

      {/* Subtab 3: Incoming Offers */}
      {activeSub === 'offers' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="font-bold text-white">پیشنهادهای دریافتی از تیم‌های رقیب</span>
            <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
              ۱ پیشنهاد فعال
            </span>
          </div>

          <div className="py-12 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
            هیچ پیشنهادی در حال حاضر دریافتی وجود ندارد.
          </div>
        </motion.div>
      )}



      {/* Subtab 5: Transfer History */}
      {activeSub === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <History size={16} className="text-cyan-400" />
            <span className="font-bold text-white">تاریخچه کامل نقل و انتقالات</span>
          </div>

          <div className="space-y-2 pt-1">
            {transferHistory.length > 0 ? (
              transferHistory.slice(0, 10).map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/60 border border-slate-800"
                >
                  <div>
                    <span className="font-bold text-white block">
                      {item.player_name || 'بازیکن'} — {item.seller_team_name} ➔ {item.buyer_team_name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.transferred_at ? new Date(item.transferred_at).toLocaleDateString('fa-IR') : ''}
                      {item.transfer_type ? ` | ${item.transfer_type}` : ''}
                    </span>
                  </div>
                  <span className="text-rose-400 font-bold dir-ltr">
                    -{Number(item.price_usd || 0).toLocaleString('fa-IR')} $
                  </span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
                تاریخچه نقل و انتقالاتی ثبت نشده است.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Auction Bid Modal */}
      <AnimatePresence>
        {selectedBidListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm glass-panel p-5 rounded-2xl border border-purple-500/50 space-y-4 text-xs"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="font-bold text-white text-sm">ثبت پیشنهاد در مزایده</span>
                <button onClick={() => setSelectedBidListing(null)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div>
                <p className="text-slate-300">بازیکن: <strong className="text-cyan-400">{selectedBidListing.player_name}</strong></p>
                <p className="text-slate-300">قیمت پایه: <strong className="text-amber-400 dir-ltr">{selectedBidListing.price_usd} $</strong></p>
              </div>

              <form onSubmit={handlePlaceBid} className="space-y-3">
                <div>
                  <label className="block text-slate-300 mb-1">مبلغ پیشنهاد شما (دلار)</label>
                  <input
                    type="number"
                    required
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="مثلا: 160000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-purple-500 dir-ltr"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-purple-600/30 transition-all"
                >
                  ارسال پیشنهاد مزایده
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
