import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '../components/common/Header';
import BottomNav from '../components/common/BottomNav';
import HomeTab from '../components/home/HomeTab';
import AuthModal from '../components/auth/AuthModal';
import FCBackground from '../components/common/FCBackground';
import { teamApi, matchApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import notificationSoundService from '../services/notificationSound';
import { AlertTriangle, Radio, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamic Code-Splitting
const TeamTab = lazy(() => import('../components/team/TeamTab'));
const ClubTab = lazy(() => import('../components/club/ClubTab'));
const MarketTab = lazy(() => import('../components/market/MarketTab'));
const StoreTab = lazy(() => import('../components/store/StoreTab'));
const ProfileView = lazy(() => import('../components/profile/ProfileView'));
const AdminDashboard = lazy(() => import('../components/admin/AdminDashboard'));
const LiveStreamTab = lazy(() => import('../components/live/LiveStreamTab'));

export default function MainDashboard() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const { hydrateTeamData } = useTeam();

  const [activeTab, setActiveTab] = useState('home');
  const [previousTab, setPreviousTab] = useState('home');
  const [teamSub, setTeamSub] = useState('lineup');
  const [storeSub, setStoreSub] = useState('gems');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Lineup Submission Status for Next Match Alert
  const [isLineupSubmitted, setIsLineupSubmitted] = useState(false);
  const handleSaveLineup = () => setIsLineupSubmitted(true);

  // Real-Time Live Match State shared between Admin & Coach
  const [liveStreamUrl, setLiveStreamUrl] = useState("https://www.aparat.com/embed/live/VML.Emad");
  const [liveEvents, setLiveEvents] = useState([]);
  const [currentMatchStatus, setCurrentMatchStatus] = useState(null);

  const [teamData, setTeamData] = useState(null);
  const [playersData, setPlayersData] = useState([]);

  // Pre-Match T-15 Reminder Toast State
  const [preMatchAlert, setPreMatchAlert] = useState(null);
  const hasTriggeredChimeRef = React.useRef(false);

  // T-15 Pre-Match Background Check
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkPreMatch = async () => {
      try {
        const res = await matchApi.getLiveMatchContext();
        const ctx = res.data;
        if (ctx?.is_within_reminder_window && ctx.next_match) {
          setPreMatchAlert(ctx.next_match);
          if (!hasTriggeredChimeRef.current) {
            notificationSoundService.playMatchAlertChime();
            notificationSoundService.sendBrowserNotification('⏰ هشدار مسابقه مستر لیگ', {
              body: `کمتر از ۱۵ دقیقه تا شروع مسابقه ${ctx.next_match.home_team_name} و ${ctx.next_match.away_team_name} باقی مانده است!`,
            });
            hasTriggeredChimeRef.current = true;
          }
        } else {
          if (!ctx?.is_within_reminder_window) {
            hasTriggeredChimeRef.current = false;
          }
        }
      } catch (_e) {
        // quiet error
      }
    };

    checkPreMatch();
    const timer = setInterval(checkPreMatch, 15000);
    return () => clearInterval(timer);
  }, [isAuthenticated]);

  // Fetch Team data from backend REST API using user's actual team_id
  useEffect(() => {
    localStorage.removeItem('vml_test_mode');
    localStorage.removeItem('vml_mock_data');
    sessionStorage.removeItem('vml_test_session');

    if (user && user.team_id) {
      teamApi
        .getTeam(user.team_id)
        .then((res) => {
          setTeamData(res.data);
          hydrateTeamData(res.data);
          setIsLineupSubmitted(Boolean(res.data?.gameplan?.is_submitted));
          if (res.data.players && res.data.players.length > 0) {
            setPlayersData(res.data.players);
          } else {
            setPlayersData([]);
          }
          setLoading(false);
        })
        .catch((_err) => {
          console.log('Backend API failed.');
          setTeamData(null);
          hydrateTeamData(null);
          setPlayersData([]);
          setLoading(false);
        });
    } else {
      setTeamData(null);
      hydrateTeamData(null);
      setPlayersData([]);
      setLoading(false);
    }
  }, [user, hydrateTeamData]);

  const handleTabChange = (newTab) => {
    if (newTab !== 'profile' && newTab !== 'admin') {
      setPreviousTab(newTab);
    }
    setActiveTab(newTab);
  };

  const handleNavigateWithSub = (tab, sub) => {
    if (tab === 'team' && sub) {
      setTeamSub(sub);
    }
    if (tab === 'store' && sub) {
      setStoreSub(sub);
    }
    handleTabChange(tab);
  };

  const handleAvatarClick = () => {
    handleTabChange('profile');
  };

  const handleBackFromProfile = () => {
    setActiveTab(previousTab);
  };

  const handleLoginSuccess = (userData) => {
    setIsAuthOpen(false);
    if (userData?.role === 'admin' || userData?.is_superuser) {
      setActiveTab('admin');
    } else {
      setActiveTab('home');
    }
  };

  const handleLogout = () => {
    logout();
    setActiveTab('home');
    setIsAuthOpen(true);
  };

  const handlePushLiveEvent = (newEvent) => {
    setLiveEvents((prev) => [newEvent, ...prev]);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#050711] text-cyan-400 flex items-center justify-center font-bold relative dir-rtl font-sans">
        <FCBackground />
        <div className="z-10 bg-slate-900/80 px-6 py-3 rounded-2xl border border-cyan-500/40 backdrop-blur-xl shadow-2xl animate-pulse flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>در حال بارگذاری سریع مستر لیگ...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100 font-sans selection:bg-purple-500 selection:text-white flex justify-center relative overflow-x-hidden">
      {/* Custom Textured Ambient Background */}
      <FCBackground />

      {/* Mandatory Auth Check - Redirect to Coach Login if not authenticated */}
      {!isAuthenticated ? (
        <Navigate to="/" replace />
      ) : (
        <>
          {/* Mobile, Tablet & Desktop Responsive App Container Shell */}
          <div className="w-full max-w-md sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl min-h-screen bg-[#0b0f19]/30 backdrop-blur-md border-x border-slate-800/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col transition-all duration-300">
            
            {/* Top Header Banner */}
            <Header
              user={user}
              coins={user?.virtual_dollars}
              activeTab={activeTab}
              onAvatarClick={handleAvatarClick}
              onOpenAuth={() => setIsAuthOpen(true)}
              onOpenAdmin={() => handleTabChange('admin')}
              onLogout={handleLogout}
              isAuthenticated={isAuthenticated}
              onNavigateTab={handleNavigateWithSub}
            />

            {/* Responsive Content Area */}
            <main className="flex-1 p-3 sm:p-5 md:p-6 pb-28 sm:pb-32 overflow-y-auto relative">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center p-12 text-xs text-cyan-400 font-bold">
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin ml-2"></div>
                    <span>در حال بارگذاری...</span>
                  </div>
                }
              >
                {!teamData && activeTab !== 'profile' && activeTab !== 'admin' ? (
                  <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-slate-900/60 rounded-3xl border border-slate-800/80 shadow-2xl">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                      <span className="text-3xl">⚽</span>
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">هنوز تیمی به شما اختصاص نیافته است</h2>
                    <p className="text-sm text-slate-400 max-w-sm mb-6">
                      شما به عنوان مربی وارد سیستم شده‌اید اما هیچ تیمی در دیتابیس به پروفایل شما متصل نیست. لطفاً با مدیر سیستم تماس بگیرید.
                    </p>
                    {user?.role === 'admin' || user?.is_superuser ? (
                      <button 
                        onClick={() => handleTabChange('admin')}
                        className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-sm hover:from-cyan-500 hover:to-blue-500 transition-all shadow-[0_0_15px_rgba(8,145,178,0.4)]"
                      >
                        ورود به پنل ادمین
                      </button>
                    ) : (
                      <button 
                        onClick={handleLogout}
                        className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-all"
                      >
                        خروج از حساب
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {activeTab === 'home' && (
                      <HomeTab
                        onNavigateTab={handleNavigateWithSub}
                        teamData={teamData}
                        isLineupSubmitted={isLineupSubmitted}
                        onSaveLineup={handleSaveLineup}
                      />
                    )}

                    {activeTab === 'team' && (
                      <TeamTab
                        initialSub={teamSub}
                        teamData={teamData}
                        initialPlayers={playersData}
                        isLineupSubmitted={isLineupSubmitted}
                        onSaveLineup={handleSaveLineup}
                      />
                    )}

                    {activeTab === 'live' && (
                      <LiveStreamTab
                        liveStreamUrl={liveStreamUrl}
                        liveEvents={liveEvents}
                        onAddEvent={handlePushLiveEvent}
                        currentMatchStatus={currentMatchStatus}
                        onMatchStatusChange={setCurrentMatchStatus}
                        teamData={teamData}
                        initialPlayers={playersData}
                        userRole={user?.role}
                        onOpenAdminControl={() => handleTabChange('admin')}
                      />
                    )}

                    {activeTab === 'club' && (
                      <ClubTab teamData={teamData} />
                    )}

                    {activeTab === 'market' && (
                      <MarketTab teamData={teamData} />
                    )}

                    {activeTab === 'store' && (
                      <StoreTab teamData={teamData} initialSub={storeSub} />
                    )}
                  </>
                )}

                {activeTab === 'profile' && (
                  <ProfileView user={user} teamData={teamData} onBack={handleBackFromProfile} onLogout={handleLogout} />
                )}

                {activeTab === 'admin' && (
                  <AdminDashboard
                    onExitAdmin={handleBackFromProfile}
                    liveStreamUrl={liveStreamUrl}
                    setLiveStreamUrl={setLiveStreamUrl}
                    onPushLiveEvent={handlePushLiveEvent}
                    currentMatchStatus={currentMatchStatus}
                    onMatchStatusChange={setCurrentMatchStatus}
                    teamData={teamData}
                  />
                )}
              </Suspense>
            </main>

            {/* Global T-15 Pre-Match Notification Floating Toast */}
            <AnimatePresence>
              {preMatchAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg p-3.5 rounded-2xl bg-gradient-to-r from-rose-950 via-slate-900 to-amber-950 border-2 border-amber-500/80 shadow-[0_0_30px_rgba(245,158,11,0.35)] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-white block">
                        ⏰ کمتر از ۱۵ دقیقه تا شروع مسابقه!
                      </span>
                      <span className="text-[11px] text-amber-300">
                        {preMatchAlert.home_team_name} مقابل {preMatchAlert.away_team_name} ({preMatchAlert.round_name || 'هفته اول'})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        handleTabChange('live');
                        setPreMatchAlert(null);
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-[11px] shrink-0 transition-all shadow-md active:scale-95 flex items-center gap-1"
                    >
                      <Radio size={13} className="animate-pulse" />
                      <span>پخش زنده</span>
                    </button>
                    <button
                      onClick={() => setPreMatchAlert(null)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auth Modal */}
            {isAuthenticated && isAuthOpen && (
              <AuthModal
                isOpen={isAuthOpen}
                onClose={() => setIsAuthOpen(false)}
                onLoginSuccess={handleLoginSuccess}
                isRequired={false}
              />
            )}
          </div>

          {/* Bottom Navigation Dock */}
          {activeTab !== 'profile' && activeTab !== 'admin' && (
            <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
          )}
        </>
      )}
    </div>
  );
}
