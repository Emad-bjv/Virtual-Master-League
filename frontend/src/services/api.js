import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

// Request Interceptor: Attach JWT Bearer token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vml_token') || localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Allow Axios & Browser to properly set multipart/form-data with boundary when data is FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch HTTP 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('vml_token');
      localStorage.removeItem('vml_refresh_token');
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (username, password) => api.post('/users/auth/login/', { username, password }),
  quickLogin: (role) => api.post('/users/auth/quick/', { role }),
  getProfile: () => api.get('/users/me/'),
  updateProfile: (data) => api.patch('/users/me/', data),
  getLeaderboard: () => api.get('/users/leaderboard/'),
};

export const teamApi = {
  getTeams: () => api.get('/teams/'),
  getTeam: (teamId) => api.get(`/teams/${teamId}/`),
  updateGameplan: (teamId, players) =>
    api.post(`/teams/${teamId}/update_gameplan/`, players),
  submitGameplan: (teamId, payload, matchId) =>
    api.post(`/teams/${teamId}/submit_gameplan/`, { ...payload, ...(matchId ? { match_id: matchId } : {}) }),
  getGameplan: (teamId, matchId) =>
    api.get(`/teams/${teamId}/submit_gameplan/`, { params: matchId ? { match_id: matchId } : {} }),
  upgradeFacility: (teamId, facilityName) =>
    api.post(`/teams/${teamId}/upgrade_facility/`, { facility: facilityName }),
};

export const playerApi = {
  getPlayers: (params) => api.get('/players/', { params }),
  getPlayer: (id) => api.get(`/players/${id}/`),
  recoverStamina: (id) => api.post(`/players/${id}/recover_stamina/`),
  healInjury: (id) => api.post(`/players/${id}/heal_injury/`),
  gemBoost: (id) => api.post(`/players/${id}/gem_boost/`),
  updateMarketValue: (id, marketValue) => api.post(`/players/${id}/update_market_value/`, { market_value: marketValue }),
  manualTransfer: (payload) => api.post('/players/manual_transfer/', payload),
  uploadPhoto: (id, formData) => api.post(`/players/${id}/upload_photo/`, formData),
  resetPhoto: (id) => api.post(`/players/${id}/reset_photo/`),
  fullUpdate: (id, data) => api.patch(`/players/${id}/full_update/`, data),
  getDuplicates: () => api.get('/players/duplicates/'),
  mergeDuplicates: (data) => api.post('/players/merge_duplicates/', data),
  deleteDuplicate: (playerId) => api.post('/players/delete_duplicate/', { player_id: playerId }),
  initializeBaseTeams: () => api.post('/players/initialize_base_teams/'),
};

export const transferApi = {
  getMarketListings: () => api.get('/transfers/market/'),
  createListing: (data) => api.post('/transfers/list/', data),
  buyDirect: (data) => api.post('/transfers/buy/', data),
  placeBid: (data) => api.post('/transfers/bid/', data),
  getHistory: () => api.get('/transfers/history/'),
  // Negotiation Hub Endpoints
  getLeagueTeams: () => api.get('/transfers/league-teams/'),
  getFreeAgents: () => api.get('/transfers/free-agents/'),
  signFreeAgent: (playerId) => api.post(`/transfers/free-agents/${playerId}/sign/`),
  createOffer: (data) => api.post('/transfers/offers/', data),
  getInbox: () => api.get('/transfers/inbox/'),
  actionOffer: (offerId, action) => api.post(`/transfers/offers/${offerId}/${action}/`),
  releasePlayer: (playerId) => api.post(`/transfers/players/${playerId}/release/`),
  getLogs: () => api.get('/transfers/logs/'),
  getAudit: (teamId) => api.get('/transfers/audit/', { params: teamId ? { team_id: teamId } : {} }),
  rollbackTransfer: (data) => api.post('/transfers/rollback/', data),
};

export const economyApi = {
  getPackages: (params) => api.get('/economy/store/packages/', { params }),
  getCardInfo: () => api.get('/economy/payment/card-info/'),
  createPaymentRequest: (data) => api.post('/economy/payment/create/', data),
  uploadReceipt: (paymentId, formData) => api.post(`/economy/payment/${paymentId}/upload-receipt/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMyPaymentRequests: () => api.get('/economy/payment/my-requests/'),
  getTransactionHistory: () => api.get('/economy/transactions/history/'),
  getRevenueBreakdown: (teamId) => api.get(`/economy/teams/${teamId}/revenue-breakdown/`),
  adminGetPaymentRequests: (params) => api.get('/economy/payment/admin-list/', { params }),
  adminReviewPayment: (paymentId, data) => api.post(`/economy/payment/${paymentId}/admin-review/`, data),
  adminGetAllPackages: (params) => api.get('/economy/admin/packages/', { params }),
  adminCreatePackage: (data) => api.post('/economy/admin/packages/', data),
  adminUpdatePackage: (id, data) => api.patch(`/economy/admin/packages/${id}/`, data),
  adminDeletePackage: (id) => api.delete(`/economy/admin/packages/${id}/`),
  adminTogglePackage: (id) => api.post(`/economy/admin/packages/${id}/toggle/`),
};

export const gachaApi = {
  getPacks: () => api.get('/gacha/packs/'),
  openPack: (data) => api.post('/gacha/open/', data),
  pickCard: (data) => api.post('/gacha/pick/', data),
  expireSession: (sessionId) => api.post('/gacha/expire-session/', { session_id: sessionId }),
  getPity: (teamId) => api.get(`/gacha/pity/${teamId}/`),
  adminGetPacks: () => api.get('/gacha/admin/packs/'),
  adminSavePack: (data) => api.post('/gacha/admin/packs/', data),
  adminCreatePack: (formData) => api.post('/gacha/admin/packs/', formData),
  adminUpdatePack: (id, formData) => api.put(`/gacha/admin/packs/${id}/`, formData),
  adminDeletePack: (packId) => api.delete(`/gacha/admin/packs/${packId}/`),
  adminGetPackPlayers: (packId) => api.get(`/gacha/admin/packs/${packId}/players/`),
  adminAddPackPlayer: (packId, formData) => api.post(`/gacha/admin/packs/${packId}/players/`, formData),
  adminBulkUploadPackPlayers: (packId, data) => api.post(`/gacha/admin/packs/${packId}/players/bulk/`, data),
  adminDeletePackPlayer: (packId, playerId) => api.delete(`/gacha/admin/packs/${packId}/players/${playerId}/`),
  adminGetPackSessions: (params) => api.get('/gacha/admin/sessions/', { params }),
};

export const adminApi = {
  getOverviewStats: () => api.get('/admin/overview-stats/'),
  getMatches: (params) => api.get('/matches/admin-list/', { params }),
  createMatch: (data) => api.post('/matches/admin-create/', data),
  updateMatch: (matchId, data) => api.post(`/matches/${matchId}/admin-update/`, data),
  updatePlayer: (data) => api.post('/teams/admin_update_player/', data),
  overrideFacility: (data) => api.post('/teams/admin_override_facility/', data),
  adjustBudget: (data) => api.post('/teams/admin_adjust_budget/', data),
  registerCoach: (data) => api.post('/teams/admin_register_coach/', data),
  getAuditLogs: () => api.get('/admin/audit-logs/'),
  // System Settings & Feature Flags Control Center
  getFeatureFlags: () => api.get('/admin/feature-flags/'),
  updateFeatureFlags: (data) => api.patch('/admin/feature-flags/', data),
  getSystemSettings: () => api.get('/admin/system-settings/'),
  updateSystemSettings: (data) => api.patch('/admin/system-settings/', data),
  executeReset: (action, confirmation) => api.post(`/admin/reset/${action}/`, { confirmation }),

  // League & Cup Tournament Management
  configureLeague: (data) => api.post('/matches/admin/league/configure/', data),
  resetLeague: (data) => api.post('/matches/admin/league/reset/', data),
  gameweekAction: (data) => api.post('/matches/admin/gameweek-action/', data),
  getCups: () => api.get('/matches/admin/cups/'),
  createCup: (data) => api.post('/matches/admin/cups/', data),
  deleteCup: (cupId) => api.delete(`/matches/admin/cups/${cupId}/`),
  resetCup: (data) => api.post('/matches/admin/cups/reset/', data),
  getCupBracket: (tournamentId) => api.get(`/matches/admin/cups/${tournamentId}/bracket/`),
  advanceCupWinner: (matchId) => api.post(`/matches/admin/cups/${matchId}/advance/`),
  syncCupWithLeague: (data) => api.post('/matches/admin/sync-cup-league/', data),
  forfeitMatch: (matchId, data) => api.post(`/matches/${matchId}/forfeit/`, data),

  // Standings Management & Penalty Points
  manualEditStanding: (data) => api.post('/matches/admin/standings/manual-edit/', data),
  applyStandingPenalty: (data) => api.post('/matches/admin/standings/apply-penalty/', data),
  recalculateStandings: (data = {}) => api.post('/matches/admin/standings/recalculate/', data),
};

export const coreApi = {
  getPublicFeatureFlags: () => api.get('/core/feature-flags/'),
  getGlobalSettings: () => api.get('/core/settings/'),
};


export const matchApi = {
  getGameweeksStatus: () => api.get('/matches/gameweeks-status/'),
  getLiveMatchContext: (teamId) => api.get('/matches/live-context/', { params: teamId ? { team_id: teamId } : {} }),
  getMatchLiveState: (matchId) => api.get(`/matches/${matchId}/live-state/`),
  controlMatch: (matchId, payload) => api.post(`/matches/${matchId}/control/`, payload),
  getUpcomingMatches: () => api.get('/matches/upcoming/'),
  getMatchHistory: () => api.get('/matches/history/'),
  getLeagueStandings: () => api.get('/matches/standings/'),
  getTournamentStandings: (tournamentId) => api.get(`/tournaments/${tournamentId}/standings/`),
  getMatchDetail: (matchId) => api.get(`/matches/${matchId}/detail/`),
  getTeamMatchHistory: (teamId) => api.get(`/teams/${teamId}/match-history/`),
  getTeamSchedule: (teamId, params) => api.get(`/teams/${teamId}/schedule/`, { params }),
  getLeagueSchedule: (params) => api.get('/matches/schedule/', { params }),
  generateFixtures: (data) => api.post('/matches/generate-fixtures/', data),
  recordEvent: (matchId, payload) => api.post(`/matches/${matchId}/event/`, payload),
  applySubstitution: (matchId, payload) => api.post(`/matches/${matchId}/substitute/`, payload),
  updateStatus: (matchId, payload) => api.post(`/matches/${matchId}/status/`, payload),
  submitTeamStats: (matchId, payload) => api.post(`/matches/${matchId}/team-stats/`, payload),
  submitPlayerRatings: (matchId, payload) => api.post(`/matches/${matchId}/player-ratings/`, payload),
  updateLiveTactics: (payload) => api.post(`/matches/live-tactics-update/`, payload),
  deleteEvent: (matchId, eventId) => api.post(`/matches/${matchId}/control/`, { action: 'DELETE_EVENT', event_id: eventId }),
  approveSubRequest: (matchId, requestId) => api.post(`/matches/${matchId}/control/`, { action: 'APPROVE_SUB_REQUEST', request_id: requestId }),
  updateLiveTelemetryStats: (matchId, stats) => api.post(`/matches/${matchId}/control/`, { action: 'UPDATE_TEAM_STATS', stats }),
  syncMatchClock: (matchId, minute, stoppageTime, isRunning) => api.post(`/matches/${matchId}/control/`, { action: 'SYNC_CLOCK', minute, stoppage_time: stoppageTime, is_running: isRunning }),
  submitInGameChanges: (matchId, payload) => api.post(`/matches/${matchId}/in-game-changes/`, payload),
  getInGameChanges: (matchId, teamId) => api.get(`/matches/${matchId}/in-game-changes/list/`, { params: { team_id: teamId } }),
  applyInGameChange: (matchId, changeId) => api.post(`/matches/${matchId}/in-game-changes/${changeId}/apply/`),
  rejectInGameChange: (matchId, changeId) => api.post(`/matches/${matchId}/in-game-changes/${changeId}/reject/`),
};

export const notificationApi = {
  getInbox: (params) => api.get('/notifications/inbox/', { params }),
  markAsRead: (id) => api.post(`/notifications/${id}/read/`),
  dismissNotification: (id) => api.post(`/notifications/${id}/dismiss/`),
};

export const seasonPassApi = {
  getStatus: () => api.get('/season-pass/status/'),
  claimTask: (taskProgressId) => api.post('/season-pass/claim-task/', { task_progress_id: taskProgressId }),
  claimLevel: (level) => api.post('/season-pass/claim-level/', { level }),
  // Admin Methods
  getAdminOverview: () => api.get('/season-pass/admin-overview/'),
  adminSeedLevels: () => api.post('/season-pass/admin-seed-levels/'),
  adminSeedTasks: () => api.post('/season-pass/admin-seed-tasks/'),
  adminAutoAssignLegends: () => api.post('/season-pass/admin-auto-assign-legends/'),
  adminAssignLegend: (data) => api.post('/season-pass/admin-assign-legend/', data),
  adminSaveLevel: (data) => api.post('/season-pass/admin-save-level/', data),
  adminResetTeamPass: (data) => api.post('/season-pass/admin-reset-team-pass/', data),
  adminResetAllTeamPasses: () => api.post('/season-pass/admin-reset-all-team-passes/'),
};

export default api;
