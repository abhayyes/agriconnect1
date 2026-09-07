/**
 * AgriConnect API Service
 * Connects the frontend to the local backend or Railway backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const api = {
  baseUrl: API_BASE_URL,

  // Check health of the backend
  checkHealth: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      if (!res.ok) throw new Error(`Health check returned status ${res.status}`);
      return await res.json();
    } catch (error) {
      console.warn('Backend health check failed:', error);
      return { status: 'offline', error: error.message };
    }
  },

  // Generic request wrapper with auto error handling
  request: async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    try {
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': options.headers?.Authorization || localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
          ...(options.headers || {})
        },
        ...options
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `API Error: ${res.status} ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.error(`Request to ${url} failed:`, err.message);
      throw err;
    }
  },

  // Auth endpoints
  register: async (credentials) => {
    try {
      const res = await api.request('/api/users/register', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      // Store the token
      if (res.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
      }
      return res;
    } catch (err) {
      console.error('Registration failed:', err);
      throw err;
    }
  },

  login: async (credentials) => {
    try {
      const res = await api.request('/api/users/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      // Store the token and user
      if (res.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
      }
      return res;
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  },

  getCurrentUser: async () => {
    try {
      return await api.request('/api/users/me');
    } catch {
      // Fallback to stored user
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    }
  },

  // Listings endpoints
  getProducts: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      return await api.request(`/api/listings?${params.toString()}`);
    } catch {
      return { listings: [], pagination: { total: 0 } };
    }
  },

  createListing: async (listingData) => {
    try {
      return await api.request('/api/listings', {
        method: 'POST',
        body: JSON.stringify(listingData)
      });
    } catch (err) {
      console.error('Create listing failed:', err);
      throw err;
    }
  },

  updateListing: async (id, listingData) => {
    try {
      return await api.request(`/api/listings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(listingData)
      });
    } catch (err) {
      console.error('Update listing failed:', err);
      throw err;
    }
  },

  getPriceHistory: async (crop) => {
    try {
      return await api.request(`/api/listings/${crop}/price-history`);
    } catch {
      return { crop, history: [] };
    }
  },

  // Order endpoints
  createOrder: async (orderData) => {
    try {
      return await api.request('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
    } catch (err) {
      console.error('Create order failed:', err);
      throw err;
    }
  },

  getOrders: async (status = null) => {
    try {
      const url = status
        ? `/api/orders?status=${status}`
        : '/api/orders';
      return await api.request(url);
    } catch {
      return { orders: [] };
    }
  },

  getOrderById: async (orderId) => {
    try {
      return await api.request(`/api/orders/${orderId}`);
    } catch {
      return null;
    }
  },

  updateOrderStatus: async (orderId, status) => {
    try {
      return await api.request(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    } catch (err) {
      console.error('Update order status failed:', err);
      throw err;
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

export default api;
