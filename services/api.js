import { tryOrQueue } from "@/app/utils/offlineSync";
import { use } from "react";
import { clearAuth } from "../src/app/utils/auth";

const API_BASE_URL = 'https://steamappserver-production.up.railway.app/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (response.status === 401) {
    // Token expired or invalid
    clearAuth();
    window.location.href = '/';
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const getGames = async (params = {}) => {
  try {
    const defaultParams = { limit: 100, page: 1 };
    const queryString = new URLSearchParams({ ...defaultParams, ...params }).toString();
    const response = await fetch(`${API_BASE_URL}/games?${queryString}`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(5000),
    });

    return await handleResponse(response);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out - check VM connection');
    }
    throw error;
  }
};

export const fetchUserStatistics = async ({ userId, page = 1, limit = 10 }) => {
  const queryString = new URLSearchParams({ userId, page, limit }).toString();
  const res = await fetch(`/api/user-statistics?${queryString}`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch user statistics');
  }

  return res.json();
};

export const getUsersStatsAll = async (params = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/user-stats`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(5000),
    });

    return await handleResponse(response);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out - check VM connection');
    }
    throw error;
  }
};

export const getGameById = async (id) => {
  const response = await fetch(`${API_BASE_URL}/games/${id}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch game');
  }
  return await response.json();
};

export const getUserStats = async (gameId) => {
  const response = await fetch(`${API_BASE_URL}/user-stats/${gameId}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error('Failed to fetch user stats');
  }
  const stats = await response.json();
  return stats;
};

export const addGame = async (gameData) => {
  try {
    if (!gameData.title) {
      throw new Error('Game title is required');
    }

    const response = await fetch(`${API_BASE_URL}/games`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        bannerImage: "/images/placeholder.jpg",
        image: "/images/placeholder.jpg",
        description: "No description available.",
        developer: "Unknown",
        releaseDate: "N/A",
        averageReviews: "0",
        tags: ["Unknown"],
        price: "10$",
        ...gameData
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 400 && errorData.error.includes('already exists')) {
        throw new Error('Game with this title already exists');
      }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding game:', error);
    const enhancedError = new Error(`Failed to add game: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.isNetworkError = error instanceof TypeError;
    throw enhancedError;
  }
};

export const addGameStats = async (gameId, statsData) => {
  const userId = localStorage.getItem('userId');
  if (!userId) throw new Error('User not logged in');

  const response = await fetch(`${API_BASE_URL}/games/${gameId}/stats`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      userId: parseInt(userId),
      achievements: statsData.achievements || 0,
      hours_played: statsData.hoursPlayed || 0,
      score: statsData.score || 0,
      finished: statsData.finished || false,
      review: statsData.review || 'No review yet'
    })
  });

  if (!response.ok) throw new Error('Failed to add stats');
  return await response.json();
};

export const updateGame = async (id, updates) => {
  const response = await fetch(`${API_BASE_URL}/games/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  return await response.json();
};

export const updateGameStats = async (gameId, stats) => {
  const userId = localStorage.getItem('userId');
  if (!userId) throw new Error('User not logged in');

  const response = await fetch(`${API_BASE_URL}/games/${gameId}/stats`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      userId: parseInt(userId),
      achievements: stats.achievements,
      hours_played: stats.hoursPlayed,
      finished: stats.finished,
      score: stats.score,
      review: stats.review
    })
  });

  if (!response.ok) throw new Error('Failed to update stats');
  return await response.json();
};

export const deleteGameStats = async (gameId) => {
  const response = await fetch(`${API_BASE_URL}/games/${gameId}/stats`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete stats');
};

export const deleteGame = async (gameId) => {
  const response = await fetch(`${API_BASE_URL}/games/${gameId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete game');
  }
  return await response.json();
};

export const getUsers = async () => {
  const response = await fetch(`${API_BASE_URL}/users`)
  if (!response.ok) throw new Error('Failed to fetch users')
  return await response.json()
}

export const getUserById = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`)
  if (!response.ok) return null
  return await response.json()
}

export const login = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Login failed with status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch (error) {
    console.warn('Logout warning:', error);
  } finally {
    clearAuth();
  }
};
