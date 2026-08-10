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
  requestOtp: (phoneNumber) => api.post('/users/auth/otp/request/', { phone_number: phoneNumber }),
  verifyOtp: (phoneNumber, code) => api.post('/users/auth/otp/verify/', { phone_number: phoneNumber, code }),
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
};

export const transferApi = {
  getMarketListings: () => api.get('/transfers/market/'),
  createListing: (data) => api.post('/transfers/list/', data),
  buyDirect: (data) => api.post('/transfers/buy/', data),
  placeBid: (data) => api.post('/transfers/bid/', data),
  getHistory: () => api.get('/transfers/history/'),
};

export const economyApi = {
  getPackages: () => api.get('/economy/store/packages/'),
  requestPayment: (data) => api.post('/economy/payment/request/', data),
  verifyPayment: (data) => api.post('/economy/payment/verify/', data),
};

export const gachaApi = {
  getPacks: () => api.get('/gacha/packs/'),
  openPack: (data) => api.post('/gacha/open/', data),
  getPity: (teamId) => api.get(`/gacha/pity/${teamId}/`),
};

export const adminApi = {
  updatePlayer: (data) => api.post('/teams/admin_update_player/', data),
  overrideFacility: (data) => api.post('/teams/admin_override_facility/', data),
  adjustBudget: (data) => api.post('/teams/admin_adjust_budget/', data),
  registerCoach: (data) => api.post('/teams/admin_register_coach/', data),
};

export const matchApi = {
  getUpcomingMatches: () => api.get('/matches/upcoming/'),
  getMatchHistory: () => api.get('/matches/history/'),
  getLeagueStandings: () => api.get('/matches/standings/'),
  getTournamentStandings: (tournamentId) => api.get(`/tournaments/${tournamentId}/standings/`),
  getMatchDetail: (matchId) => api.get(`/matches/${matchId}/detail/`),
  getTeamMatchHistory: (teamId) => api.get(`/teams/${teamId}/match-history/`),
  recordEvent: (matchId, payload) => api.post(`/matches/${matchId}/event/`, payload),
  applySubstitution: (matchId, payload) => api.post(`/matches/${matchId}/substitute/`, payload),
  updateStatus: (matchId, payload) => api.post(`/matches/${matchId}/status/`, payload),
  submitTeamStats: (matchId, payload) => api.post(`/matches/${matchId}/team-stats/`, payload),
  submitPlayerRatings: (matchId, payload) => api.post(`/matches/${matchId}/player-ratings/`, payload),
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
