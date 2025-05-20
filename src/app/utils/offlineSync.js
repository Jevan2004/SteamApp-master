// /lib/offlineSync.js

const STORAGE_KEY = 'offlineQueue';
const OFFLINE_GAMES_KEY = 'offline_games_data';
const OFFLINE_QUEUE_KEY = 'offline_queue';
const OFFLINE_STATS_KEY = 'offline_user_stats';
const GAMES_DATA_KEY = 'gamesData'; // Consistent with what you're using elsewhere
const USER_STATS_KEY = 'userStats'; // Consistent with what you're using elsewhere


function getQueue() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function queueOfflineOperation(op) {
    const queue = getQueue();
    queue.push(op);
    saveQueue(queue);
    
    // Also save the current state for immediate UI updates
    if (op.type === 'delete' && op.entity === 'game') {
      const games = JSON.parse(localStorage.getItem('gamesData')) || [];
      const updatedGames = games.filter(game => game.id !== op.payload.gameId);
      localStorage.setItem('gamesData', JSON.stringify(updatedGames));
    } else if (op.type === 'update' && op.entity === 'stat') {
      const stats = JSON.parse(localStorage.getItem(OFFLINE_STATS_KEY)) || {};
      stats[op.payload.gameId] = op.payload.data;
      localStorage.setItem(OFFLINE_STATS_KEY, JSON.stringify(stats));
    }
  }
  export async function syncOfflineQueue(apiFns) {
    try {
      const serverIsUp = await checkServerReachable();
      if (!serverIsUp) {
        console.warn('Server is down, skipping sync');
        return false;
      }
  
      const queue = getQueue();
      if (queue.length === 0) return true;
  
      const newQueue = [];
      let successCount = 0;
  
      for (const [index, op] of queue.entries()) {
        try {
          const { type, entity, payload } = op;
          
          // Execute the operation
          if (type === 'add' && entity === 'game') {
            await apiFns.addGame(payload.data);
          } else if (type === 'delete' && entity === 'game') {
            await apiFns.deleteGame(payload.gameId);
          } else if (type === 'update' && entity === 'stat') {
            await apiFns.updateGameStats(payload.gameId, payload.data);
          }
          
          successCount++;
        } catch (err) {
          console.error('Failed to sync operation:', op, err);
          // Keep failed operations in queue for next attempt
          newQueue.push(...queue.slice(index));
          break;
        }
      }
  
      // Update the queue with remaining operations
      saveQueue(newQueue);
  
      // Notify the UI if we successfully synced anything
      if (successCount > 0) {
        window.dispatchEvent(new Event('gamesUpdated'));
        window.dispatchEvent(new Event('statsUpdated'));
      }
  
      return successCount === queue.length;
    } catch (err) {
      console.error('Sync error:', err);
      return false;
    }
  }  

  export function initOnlineSync(apiFns) {
    if (typeof window === 'undefined') return;
  
    // This handles when the browser detects online status
    const handleOnline = async () => {
      try {
        await syncOfflineQueue(apiFns);
        // Refresh data after sync
        window.dispatchEvent(new Event('gamesUpdated'));
      } catch (error) {
        console.error('Sync failed after coming online:', error);
      }
    };
  
    // Set up the event listener
    window.addEventListener('online', handleOnline);
  
    // Also check immediately in case we're already online
    if (navigator.onLine) {
      handleOnline();
    }
  
    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }

// fallback wrapper
export async function tryOrQueue(op, actionFn) {
    try {
      const serverIsUp = await checkServerReachable();
      if (serverIsUp) {
        await actionFn();
        return true;
      }
      throw new Error('Offline');
    } catch (err) {
      console.warn('Offline, queued operation:', op);
      queueOfflineOperation(op);
      
      // Update local storage immediately for UI consistency

      
      return false;
    }
  }
export function saveGameDataForOffline(game) {
    if (typeof window === 'undefined') return;
    try {
      const existingData = JSON.parse(localStorage.getItem(GAMES_DATA_KEY)) || [];
      const updatedGames = [...existingData, game];
      localStorage.setItem(GAMES_DATA_KEY, JSON.stringify(updatedGames));
    } catch (error) {
      console.error('Error saving game data for offline:', error);
    }
  }
  
  export function getOfflineGameData(gameId) {
    if (typeof window === 'undefined') return null;
    try {
      const data = JSON.parse(localStorage.getItem(OFFLINE_GAMES_KEY)) || {};
      return data[gameId] || null;
    } catch {
      return null;
    }
  }
  export function getOfflineUserStats(gameId) {
    if (typeof window === 'undefined') return null;
    try {
      const allStats = JSON.parse(localStorage.getItem(OFFLINE_STATS_KEY)) || {};
      return allStats[gameId] || null;
    } catch {
      return null;
    }
  }

  export function getAllOfflineGames() {
    if (typeof window === 'undefined') return [];
    try {
      const data = JSON.parse(localStorage.getItem(OFFLINE_GAMES_KEY)) || {};
      return Object.values(data);
    } catch {
      return [];
    }
  }
  export async function checkServerReachable() {
    try {
      const response = await fetch('/health-check'); // A simple health check endpoint
      return response.ok;
    } catch (err) {
      return false;
    }
  }
  export function saveOfflineUserStats(gameId, stats) {
  if (typeof window === 'undefined') return;
  try {
    const existingStats = JSON.parse(localStorage.getItem(OFFLINE_STATS_KEY)) || {};
    existingStats[gameId] = stats;
    localStorage.setItem(OFFLINE_STATS_KEY, JSON.stringify(existingStats));
  } catch (error) {
    console.error('Error saving offline stats:', error);
  }
}

