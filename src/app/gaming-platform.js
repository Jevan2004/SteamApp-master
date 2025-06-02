"use client"

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Settings, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { addRandomGame, getRandomReview } from "./games.js";
import { sortGamesByName } from "./sorting.js";
import { categorizeGamesByPrice } from "./utils/gameStats.js";
import GameCharts from './components/gameCharts.js';
import UserStatisticsGames from "./components/userStatistics.js";

import {
  getGames,
  addGame,
  deleteGame,
  getUserStats,
  getUsersStatsAll,
  updateGameStats as updateUserStats
} from "../../services/api.js";
import { tryOrQueue, checkServerReachable } from './utils/offlineSync.js';
import { initOnlineSync, syncOfflineQueue } from "./utils/offlineSync.js";

const GAME_DATA_KEY = 'game_data';
const INITIAL_PAGE_SIZE = 101; // Initial number of games to load
const LOAD_MORE_SIZE = 5; // Number of additional games to load each time

export default function GamingPlatform({ onLogout }) {
   const [scrollOption, setScrollOption] = useState('pagination');
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(INITIAL_PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [allGames, setAllGames] = useState([]);
  const [displayedGames, setDisplayedGames] = useState([]);
  const [isAddingGames, setIsAddingGames] = useState(false);
  const [gamesAdded, setGamesAdded] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [userStats, setUserStats] = useState({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isServerDown, setIsServerDown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showUserStats, setShowUserStats] = useState(true)

  const fetchData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setInitialLoading(true);
      else setRefreshLoading(true);
      
      setError(null);
      setHasMore(true);
      setPage(1);

      const networkIsUp = navigator.onLine;
      setIsOffline(!networkIsUp);

      if (networkIsUp) {
        try {
          const [gamesData, usersStats] = await Promise.all([
            getGames({ 
              search: searchQuery,
              page: 1, 
              limit: scrollOption === 'pagination' ? itemsPerPage : INITIAL_PAGE_SIZE 
            }),
            getUsersStatsAll()
          ]);

          setAllGames(gamesData);
          setDisplayedGames(gamesData);
          setUserStats(usersStats);
          localStorage.setItem("gamesData", JSON.stringify(gamesData));
          localStorage.setItem("userStats", JSON.stringify(usersStats));
          setHasMore(gamesData.length === (scrollOption === 'pagination' ? itemsPerPage : INITIAL_PAGE_SIZE));
          setIsServerDown(false);
        } catch (error) {
          if (navigator.onLine) {
            setIsServerDown(true);
          }
          loadOfflineData();
        }
      } else {
        loadOfflineData();
      }
    } finally {
      if (isInitial) setInitialLoading(false);
      else setRefreshLoading(false);
    }
  }, [searchQuery, scrollOption, itemsPerPage]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== '') {
        setIsSearching(true);
        fetchData(false).finally(() => setIsSearching(false));
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timer);
  }, [searchQuery, fetchData]);
    useEffect(() => {
    // Initialize localStorage if empty
    if (!localStorage.getItem("gamesData")) {
      localStorage.setItem("gamesData", JSON.stringify([]));
    }
    if (!localStorage.getItem("userStats")) {
      localStorage.setItem("userStats", JSON.stringify({}));
    }
  }, []);
  const determineErrorType = () => {
    if (!navigator.onLine) {
      return "Network disconnected - using offline data";
    } else {
      return "Server unreachable - using offline data";
    }
  };
  const checkConnection = async () => {
    const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
  
    try {
      const controller = new AbortController();
      const timeoutPromise = timeout(9000);
  
      const responsePromise = fetch("/api/ping", {
        method: "GET",
        signal: controller.signal,
      });
  
      await Promise.race([responsePromise, timeoutPromise]);
  
      // If successful
      if (!isOffline || isServerDown) {
        setIsOffline(false);
        setIsServerDown(false);
        setError(null);
        await syncOfflineQueue({ addGame, deleteGame, updateGameStats: updateUserStats });
        fetchData(false);
      }
    } catch (error) {
      const networkIsUp = navigator.onLine;
    
      if (!networkIsUp) {
        setIsOffline(true);
        setIsServerDown(false);
        console.log("Nigga")
        setError("Network disconnected - using offline data");
      } else {
        setIsOffline(false);
        setIsServerDown(true);
        setError("Server unavailable - using local data");
      }
      
      loadOfflineData();
    }
  };
  
  const loadOfflineData = () => {
    try {
      const offlineData = JSON.parse(localStorage.getItem("gamesData")) || [];
      const offlineStats = JSON.parse(localStorage.getItem("userStats")) || {};
      
      // Ensure data structure matches what your components expect
      setAllGames(Array.isArray(offlineData) ? offlineData : []);
      setDisplayedGames(Array.isArray(offlineData) ? offlineData : []);
      setUserStats(typeof offlineStats === 'object' ? offlineStats : {});
      setHasMore(false);
      

    } catch (e) {
      console.error("Failed to load offline data:", e);
      setError("Failed to load offline data");
      setAllGames([]);
      setDisplayedGames([]);
      setUserStats({});
    }
  };

  useEffect(() => {
    const apiFns = { addGame, deleteGame, updateGameStats: updateUserStats };
    initOnlineSync(apiFns);
    syncOfflineQueue(apiFns);
    
    // Check if we're offline immediately
    if (!navigator.onLine) {
      loadOfflineData();
    } else {
      fetchData(true);
    }
  }, [fetchData]);

  useEffect(() => {
    const apiFns = { addGame, deleteGame, updateGameStats: updateUserStats };
    const cleanup = initOnlineSync(apiFns);
    let lastOnlineStatus = navigator.onLine;
    let lastServerStatus = !isServerDown;

    const interval = setInterval(checkConnection, 10000);
    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, [fetchData]);

  useEffect(() => {
    if (scrollOption !== 'infinite') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMore) {
          loadMoreGames();
        }
      },
      { threshold: 1.0 }
    );
  
    const sentinel = document.querySelector('#scroll-sentinel');
    if (sentinel) observer.observe(sentinel);
  
    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [isLoadingMore, hasMore, scrollOption, displayedGames.length]); // <--- add displayedGames.length
  

  const loadMoreGames = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const filtered = allGames.filter(game => game.title.toLowerCase().includes(searchQuery.toLowerCase()));
      const sorted = sortGamesByName(filtered, sortOrder);
  
      const startIndex = displayedGames.length;
      const endIndex = startIndex + LOAD_MORE_SIZE;
  
      const newGames = sorted.slice(startIndex, endIndex);
  
      if (newGames.length === 0) {
        setHasMore(false);
        return;
      }
  
      setDisplayedGames(prev => [...prev, ...newGames]);
      setHasMore(newGames.length === LOAD_MORE_SIZE);
    } catch (err) {
      console.error("Failed to load more games:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };
  

  useEffect(() => {
    if (!isMounted) return;
    
    if (scrollOption === 'pagination') {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      setDisplayedGames(allGames.slice(startIndex, endIndex));
    } else {
      const startIndex = 0;
      const endIndex = page * LOAD_MORE_SIZE;
      setDisplayedGames(allGames.slice(startIndex, endIndex));
    }
  }, [allGames, currentPage, itemsPerPage, scrollOption, page, isMounted]);

  useEffect(() => setIsMounted(true), []);
  const priceCategories = useMemo(() => {
    if (!isMounted) return { cheap: [], average: [], expensive: [] };
    return categorizeGamesByPrice(displayedGames);
  }, [displayedGames, isMounted]);

  const totalPages = Math.ceil(
    allGames.filter(game => 
      game.title.toLowerCase().includes(searchQuery.toLowerCase())
    ).length / itemsPerPage
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const toggleAutoAdd = () => {
    setIsAddingGames((prev) => !prev);
    if (isAddingGames) setGamesAdded(0);
  };

  // Auto-add games effect
  useEffect(() => {
    if (!isAddingGames) return;
    const interval = setInterval(() => {
      handleAddRandomGame();
      setGamesAdded((prev) => prev + 1);
    }, 1000); 
    return () => clearInterval(interval);
  }, [isAddingGames]);

  return (
    <div className="gaming-platform">
      <div className="container">
        <div className="profile-card">
          <div className="profile-image-container">
            <img src="/images/profile.png" alt="Profile" width={220} height={220} className="profile-image" />
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{localStorage.getItem('username')}
                {console.log("Username from localStorage:", localStorage.getItem("username"))}</h1>
            
            <p className="profile-location">Nationality/hometown</p>
            <p className="profile-description">Short profile description: I am a cat meow</p>
                  <button
        onClick={onLogout}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#ff5555',
          border: 'none',
          borderRadius: '5px',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        Logout
      </button>
          </div>
        </div>

        {isOffline && (
  <div className="status-banner info">
    Network disconnected - working offline
  </div>
)}
{isServerDown && (
  <div className="status-banner warning">
    Server unavailable - using local data
  </div>
)}

        <div className="library-section">
          <div className="library-header">
            <h2 className="library-title">Your library</h2>
            {isOffline && <div className="offline-banner">You are currently offline</div>}
            
            <div className="library-controls">
              <button onClick={toggleAutoAdd} className={`auto-add-button ${isAddingGames ? 'active' : ''}`}>
                {isAddingGames ? `Stop Adding (${gamesAdded})` : 'Auto-Add Games'}
              </button>
              
              <div className="view-options">
                <button 
                  className={`view-option ${scrollOption === 'pagination' ? 'active' : ''}`}
                  onClick={() => setScrollOption('pagination')}
                >
                  Pagination
                </button>
                <button 
                  className={`view-option ${scrollOption === 'infinite' ? 'active' : ''}`}
                  onClick={() => {
                    setScrollOption('infinite');
                    // Reset to initial state when switching to infinite scroll
                    setPage(1);
                    setHasMore(true);
                  }}
                >
                  Infinite Scroll
                </button>
              </div>
              
              <div className="search-container">
    <img src="/images/search.png" className="search-icon" />
    <input
      type="text"
      placeholder="Search..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="search-input"
    />
    {isSearching && <span className="search-spinner">Searching...</span>}
                <Settings className="settings-icon" />
                <button className="sort-button" onClick={toggleSortOrder}>
                  <ArrowUpDown className="sort-icon" />
                </button>
                {scrollOption === 'pagination' && (
                  <select 
                    value={itemsPerPage} 
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  >
                    {[10, 20, 30].map((num) => (
                      <option key={num} value={num}>{num} per page</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

          </div>

          <div className="games-grid">
            {!isMounted ? (
              <div className="loading-games">Loading your games...</div>
            ) : displayedGames.length > 0 ? (
              <>
                {displayedGames.map((game) => {
                  const priceClass = 
                    priceCategories.cheap.includes(game) ? 'cheap-price' :
                    priceCategories.average.includes(game) ? 'average-price' :
                    priceCategories.expensive.includes(game) ? 'expensive-price' : '';

                  return (
                    <div key={game.id} className="game-card">
                      <Link href={`/game-details?id=${game.id}`}>
                        <div className="game-image-container">
                          {game.image ? (
                            <div className="game-image-wrapper">
                              <img src={game.image || "/placeholder.svg"} alt={game.title} className="game-image" />
                              <div className="game-overlay">
                                <div className={`game-title-overlay ${priceClass}`}>{game.title}</div>
                                <div className="game-price-overlay">{game.price}</div>
                              </div>
                            </div>
                          ) : (
                            <div className="game-placeholder">N/A</div>
                          )}
                        </div>
                        <div className="game-info">
                          <p className={`game-title ${priceClass}`}>{game.title}</p>
                          <p className="game-price">{game.price}</p>
                        </div>
                      </Link>
                    </div>
                  );
                })}
                {scrollOption === 'infinite' && (
                  <>
                    <div id="scroll-sentinel" style={{ height: '20px' }} />
                    {isLoadingMore && <div className="loading-more">Loading more games...</div>}
                    {!hasMore && displayedGames.length > 0 && (
                      <div className="no-more-games">No more games to load</div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="no-games-message">No games found. Add some games to your library!</div>
            )}
          </div>

          {scrollOption === 'pagination' && (
            <div className="pagination-controls">
              <button 
                disabled={currentPage === 1} 
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button 
                disabled={currentPage === totalPages} 
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </button>
            </div>
          )}

          <div className="price-legend">
            <h3>Price Categories:</h3>
            <div className="legend-items">
              <div className="legend-item">
                <span className="color-dot cheap-price"></span>
                <span>Cheap </span>
              </div>
              <div className="legend-item">
                <span className="color-dot average-price"></span>
                <span>Average</span>
              </div>
              <div className="legend-item">
                <span className="color-dot expensive-price"></span>
                <span>Expensive</span>
              </div>
            </div>
          </div>

          <GameCharts games={displayedGames} priceCategories={priceCategories} />

          <div className="add-button-container">
            <Link href="/add">
              <button className="add-button">
                <Plus className="add-icon" />
              </button>
            </Link>
          </div>
        </div>
                <div className="section-toggle">
          <button onClick={() => setShowUserStats(!showUserStats)} className="toggle-button">
            {showUserStats ? "Hide" : "Show"} User Statistics
          </button>
        </div>

        {showUserStats && <UserStatisticsGames />}
      </div>
    </div>
  );
}