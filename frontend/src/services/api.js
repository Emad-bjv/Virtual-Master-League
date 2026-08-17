import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

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
    const token = localStorage.getItem('vml_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
  submitGameplan: (teamId, payload) =>
    api.post(`/teams/${teamId}/submit_gameplan/`, payload),
  getGameplan: (teamId) =>
    api.get(`/teams/${teamId}/submit_gameplan/`),
  upgradeFacility: (teamId, facilityName) =>
    api.post(`/teams/${teamId}/upgrade_facility/`, { facility: facilityName }),
};

export const playerApi = {
  getPlayers: () => api.get('/players/'),
  getPlayer: (id) => api.get(`/players/${id}/`),
  recoverStamina: (id) => api.post(`/players/${id}/recover_stamina/`),
  healInjury: (id) => api.post(`/players/${id}/heal_injury/`),
};

export const transferApi = {
  getMarketListings: () => api.get('/transfers/market/'),
  createListing: (data) => api.post('/transfers/list/', data),
  buyDirect: (data) => api.post('/transfers/buy/', data),
  placeBid: (data) => api.post('/transfers/bid/', data),
  getHistory: () => api.get('/transfers/history/'),
  // Negotiation Hub Endpoints
  getLeagueTeams: () => api.get('/transfers/league-teams/'),
  createOffer: (data) => api.post('/transfers/offers/', data),
  getInbox: () => api.get('/transfers/inbox/'),
  actionOffer: (offerId, action) => api.post(`/transfers/offers/${offerId}/${action}/`),
  releasePlayer: (playerId) => api.post(`/transfers/players/${playerId}/release/`),
  getLogs: () => api.get('/transfers/logs/'),
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
  adminGetPaymentRequests: (params) => api.get('/economy/payment/admin-list/', { params }),
  adminReviewPayment: (paymentId, data) => api.post(`/economy/payment/${paymentId}/admin-review/`, data),
};

export const gachaApi = {
  getPacks: () => api.get('/gacha/packs/'),
  openPack: (data) => api.post('/gacha/open/', data),
  getPity: (teamId) => api.get(`/gacha/pity/${teamId}/`),
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
  getUsers: () => api.get('/users/admin/users/'),
};

export const matchApi = {
  getGameweeksStatus: () => api.get('/matches/gameweeks-status/'),
  getLiveMatchContext: () => api.get('/matches/live-context/'),
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
  rejectSubRequest: (matchId, requestId) => api.post(`/matches/${matchId}/control/`, { action: 'REJECT_SUB_REQUEST', request_id: requestId }),
  updateLiveTelemetryStats: (matchId, stats) => api.post(`/matches/${matchId}/control/`, { action: 'UPDATE_TEAM_STATS', stats }),
  syncMatchClock: (matchId, minute, stoppageTime, isRunning) => api.post(`/matches/${matchId}/control/`, { action: 'SYNC_CLOCK', minute, stoppage_time: stoppageTime, is_running: isRunning }),
};

export const notificationApi = {
  getInbox: () => api.get('/notifications/inbox/'),
  markAsRead: (id) => api.post(`/notifications/${id}/read/`),
};

export const seasonPassApi = {
  getStatus: () => api.get('/season-pass/status/'),
  claimTask: (taskProgressId) => api.post('/season-pass/claim-task/', { task_progress_id: taskProgressId }),
  claimLevel: (level) => api.post('/season-pass/claim-level/', { level }),
};

export default api;
