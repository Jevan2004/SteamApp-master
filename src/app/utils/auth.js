const JWT_KEY = 'Cristina';

export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(JWT_KEY);
  }
  return null;
};

export const setToken = (token) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(JWT_KEY, token);
  }
};

export const clearToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(JWT_KEY);
  }
};

export const isAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    // Basic token validation - you can add more checks here
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) return false;

    // Check if token is expired
    const payload = JSON.parse(atob(tokenParts[1]));
    const expiry = payload.exp * 1000; // Convert to milliseconds
    if (Date.now() >= expiry) {
      // Token expired, clear storage
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

export const setAuthToken = (token, userId, username) => {
  localStorage.setItem('token', token);
  localStorage.setItem('userId', userId);
  localStorage.setItem('username', username);
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
};

export const getCurrentUser = () => {
  if (!isAuthenticated()) return null;
  
  return {
    userId: localStorage.getItem('userId'),
    username: localStorage.getItem('username')
  };
};
