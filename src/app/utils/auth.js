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

  const token = localStorage.getItem(JWT_KEY);
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
};
