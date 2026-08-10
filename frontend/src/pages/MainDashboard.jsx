import React, { useState, useEffect, lazy, Suspense } from 'react';
import Header from '../components/common/Header';
import BottomNav from '../components/common/BottomNav';
import HomeTab from '../components/home/HomeTab';
import AuthModal from '../components/auth/AuthModal';
import FCBackground from '../components/common/FCBackground';
import { teamApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

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

  const [activeTab, setActiveTab] = useState('home');
  const [previousTab, setPreviousTab] = useState('home');
  const [teamSub, setTeamSub] = useState('lineup');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Lineup Submission Status for Next Match Alert
  const [isLineupSubmitted, setIsLineupSubmitted] = useState(false);
  const handleSaveLineup = () => setIsLineupSubmitted(true);

  // Real-Time Live Match State shared between Admin & Coach
  const [liveStreamUrl, setLiveStreamUrl] = useState("https://www.aparat.com/embed/live/VML.Emad");
  const [liveEvents, setLiveEvents] = useState([]);
  const [currentMatchStatus, setCurrentMatchStatus] = useState('FIRST_HALF');

  const [teamData, setTeamData] = useState(null);
  const [playersData, setPlayersData] = useState([]);

  // Fetch Team data from backend REST API using user's actual team_id
  useEffect(() => {
    if (user && user.team_id) {
      teamApi
        .getTeam(user.team_id)
        .then((res) => {
          setTeamData(res.data);
          if (res.data.players && res.data.players.length > 0) {
            setPlayersData(res.data.players);
          }
          setLoading(false);
        })
        .catch((_err) => {
          console.log('Backend API failed.');
          setLoading(false);
        });
    } else {
      // Not authenticated (user is null) or user has no team yet:
      // nothing to fetch — always clear loading so the login gate renders.
      setLoading(false);
    }
  }, [user]);

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
    <div className="min-h-screen bg-[#050711] text-slate-100 font-sans selection:bg-purple-500 selection:text-white flex justify-center relative overflow-x-hidden">
      {/* EA Sports FC 26 Next-Gen Animated Ambient Background */}
      <FCBackground />

      {/* Mandatory Login Modal Gating */}
      {!isAuthenticated ? (
        <AuthModal
          isOpen={true}
          onClose={() => {}}
          onLoginSuccess={handleLoginSuccess}
          isRequired={true}
        />
      ) : (
        <>
          {/* Mobile, Tablet & Desktop Responsive App Container Shell */}
          <div className="w-full max-w-md sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl min-h-screen bg-[#0b0f19]/80 backdrop-blur-xl border-x border-slate-800/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col transition-all duration-300">
            
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
              onNavigateTab={handleTabChange}
            />

            {/* Responsive Content Area */}
            <main className="flex-1 p-3 sm:p-5 md:p-6 pb-24 sm:pb-28 overflow-y-auto">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center p-12 text-xs text-cyan-400 font-bold">
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin ml-2"></div>
                    <span>در حال بارگذاری...</span>
                  </div>
                }
              >
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
                  />
                )}

                {activeTab === 'club' && (
                  <ClubTab teamData={teamData} />
                )}

                {activeTab === 'market' && (
                  <MarketTab teamData={teamData} />
                )}

                {activeTab === 'store' && (
                  <StoreTab teamData={teamData} />
                )}

                {activeTab === 'profile' && (
                  <ProfileView user={user} onBack={handleBackFromProfile} onLogout={handleLogout} />
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
