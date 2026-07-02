const API_URL = '/api';

const api = {
  // Token handlers
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => localStorage.setItem('token', token),
  removeToken: () => localStorage.removeItem('token'),

  // User details handlers
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch (e) {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  removeUser: () => localStorage.removeItem('user'),

  // Generic Request client
  request: async (endpoint, options = {}) => {
    const token = api.getToken();
    
    // Set headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // If options.body is FormData, don't set Content-Type header (let browser set it)
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle unauthorized token issues
        if (response.status === 401) {
          api.logout();
          return;
        }
        throw new Error(data.message || 'Something went wrong.');
      }

      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      throw error;
    }
  },

  // HTTP wrappers
  get: (endpoint) => api.request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => api.request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  postMultipart: (endpoint, formData) => api.request(endpoint, { method: 'POST', body: formData }),
  put: (endpoint, body) => api.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  putMultipart: (endpoint, formData) => api.request(endpoint, { method: 'PUT', body: formData }),
  delete: (endpoint) => api.request(endpoint, { method: 'DELETE' }),

  // Logout routine
  logout: () => {
    api.removeToken();
    api.removeUser();
    window.location.href = '/login';
  },

  // Route security gatekeeper
  checkAuth: (requiredRole) => {
    const token = api.getToken();
    const user = api.getUser();

    if (!token || !user) {
      window.location.href = '/login';
      return null;
    }

    if (requiredRole && user.role !== requiredRole) {
      if (user.role === 'owner') {
        window.location.href = '/owner/dashboard';
      } else if (user.role === 'principal') {
        window.location.href = '/principal/dashboard';
      } else if (user.role === 'teacher') {
        window.location.href = '/teacher/dashboard';
      } else {
        window.location.href = '/student/dashboard';
      }
      return null;
    }

    return user;
  }
};
