import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:9000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

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
};

export default api;
