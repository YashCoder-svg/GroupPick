const API_BASE = '/api';

/**
 * Universal request wrapper handling authentication headers and error formatting
 */
async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Attach guest member token if stored
  const memberToken = localStorage.getItem('gp_member_token');
  if (memberToken && !headers['x-member-token']) {
    headers['x-member-token'] = memberToken;
  }

  // Attach organizer token if stored
  const organizerToken = localStorage.getItem('gp_organizer_token');
  if (organizerToken && !headers['x-organizer-token']) {
    headers['x-organizer-token'] = organizerToken;
  }

  // Attach JWT user token if logged in
  const userToken = localStorage.getItem('gp_user_jwt');
  if (userToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${userToken}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: response.statusText || 'An unexpected error occurred' };
    }
    const message = errorData.error || errorData.message || `Request failed with status ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.details = errorData.details;
    throw err;
  }

  return response.json();
}

export const api = {
  // Packs
  getPacks: () => request('/packs'),
  getPackById: (id) => request(`/packs/${id}`),

  // Destinations
  searchDestinations: (q, limit = 8) => request(`/destinations/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  getPopularDestinations: () => request('/destinations/popular'),

  // Places
  getPlaces: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/places?${query}`);
  },
  searchPlaces: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/places/search?${query}`);
  },
  reportPlacePrice: (placeId, amount) =>
    request(`/places/${placeId}/report-price`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  // Groups
  createGroup: (payload) => request('/groups', { method: 'POST', body: JSON.stringify(payload) }),
  getGroup: (idOrCode) => request(`/groups/${idOrCode}`),
  joinGroup: (idOrCode, payload) =>
    request(`/groups/${idOrCode}/join`, { method: 'POST', body: JSON.stringify(payload) }),
  submitPreferences: (idOrCode, preferences) =>
    request(`/groups/${idOrCode}/preferences`, { method: 'PUT', body: JSON.stringify(preferences) }),
  getGroupStatus: (idOrCode) => request(`/groups/${idOrCode}/status`),
  runDecision: (idOrCode, payload = {}) =>
    request(`/groups/${idOrCode}/decide`, { method: 'POST', body: JSON.stringify(payload) }),
  getGroupDecisions: (idOrCode) => request(`/groups/${idOrCode}/decisions`),
  confirmDecision: (decisionId, selectedOptionId) =>
    request(`/decisions/${decisionId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ selectedOptionId }),
    }),
  getFairnessHistory: (idOrCode) => request(`/groups/${idOrCode}/fairness`),

  // Organizer Authentication
  authRegister: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  authLogin: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  authMe: () => request('/auth/me'),
};

export default api;
