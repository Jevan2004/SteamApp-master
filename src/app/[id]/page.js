"use client"
import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import GameDetails from "../gameDetailsCeva/gameDetails"
import { getGameById, getUserStats, deleteGame, updateGameStats, deleteGameStats } from "../../../services/api"
import {
  getOfflineGameData,
  saveGameDataForOffline,
  getOfflineUserStats,
  tryOrQueue,
} from "../../../src/app/utils/offlineSync"
export default function GamePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const gameId = Number(searchParams.get("id"))
  const isOfflineMode = searchParams.get("offline") === "true"

  const [selectedGame, setSelectedGame] = useState(null)
  const [userStat, setUserStat] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isOnline, setIsOnline] = useState(true)

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    window.addEventListener("online", updateOnlineStatus)
    window.addEventListener("offline", updateOnlineStatus)
    return () => {
      window.removeEventListener("online", updateOnlineStatus)
      window.removeEventListener("offline", updateOnlineStatus)
    }
  }, [])
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setLoading(true)

        // Check if we're in offline mode first
        if (isOfflineMode || !navigator.onLine) {
          // Try to load from localStorage first
          const offlineGames = JSON.parse(localStorage.getItem("gamesData") || "[]");
          const offlineGame = offlineGames.find(g => g.id === gameId);
          const offlineStats = JSON.parse(localStorage.getItem("userStats") || "{}");
          const offlineUserStat = offlineStats[gameId];
          
          if (offlineGame) {
            setSelectedGame(offlineGame);
            setUserStat(offlineUserStat || {});
            setLoading(false);
            return;
          }
          
          // If not in localStorage, try sessionStorage
          const sessionData = sessionStorage.getItem(`offlineGame-${gameId}`);
          if (sessionData) {
            const parsedData = JSON.parse(sessionData);
            setSelectedGame(parsedData);
            setUserStat(parsedData.stats || {});
            setLoading(false);
            return;
          }
          
          throw new Error("Game not available offline");
        }

        // Online mode - fetch normally
        const [gameData, statsData] = await Promise.all([
          getGameById(gameId),
          getUserStats(gameId).catch((e) => {
            console.error("Failed to fetch user stats", e)
            return {}
          }), // Fallback if no stats exist
        ])
        console.log("Fetched gameData:", gameData)
        console.log("User stats", statsData)
        if (!gameData) {
          throw new Error("Game not found")
        }

        // Save for offline access
        saveGameDataForOffline(gameData)

        setSelectedGame(gameData)
        setUserStat(statsData || {})
      } catch (err) {
        console.error("Error fetching game:", err)
        setError(err.message)

        // Try to load from localStorage if available
        const offlineGame = getOfflineGameData(gameId)
        const offlineUserStat = getOfflineUserStats(gameId)
        if (offlineGame) {
          setSelectedGame(offlineGame)
          setUserStat(offlineUserStat || {})
          setError(null)
        } else {
          router.push("/")
        }
      } finally {
        setLoading(false)
      }
    }

    if (gameId) {
      fetchGameData()
    } else {
      router.push("/")
    }
  }, [gameId, router, isOfflineMode])
  const handleUpdateStat = async (updatedStats) => {
    if (!isOnline) {
      alert("Cannot update stats while offline");
      return;
    }
  
    try {
      const updatedStat = await updateGameStats(selectedGame.id, updatedStats);
      setUserStat(updatedStat);
      return updatedStat; // ✅ Add this line!
    } catch (err) {
      console.error("Error updating stats:", err);
      setError("Failed to update stats");
    }
  };
  

  const handleDeleteStat = async () => {
    if (!isOnline) {
      alert("Cannot delete stats while offline")
      return
    }

    try {
      await deleteGameStats(selectedGame.id)
      setUserStat({})
    } catch (err) {
      console.error("Error deleting stats:", err)
      setError("Failed to delete stats")
    }
  }

  const handleDeleteGame = async () => {
    const op = {
      type: "delete",
      entity: "game",
      payload: { gameId: selectedGame.id },
    }

    await tryOrQueue(op, async () => {
      await deleteGame(selectedGame.id)
      router.push("/")
    })

    // Optimistically update UI if online
    if (isOnline) {
      router.push("/")
    }
  }
  if (loading) {
    return <div className="loading">Loading game details...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  if (!selectedGame) {
    return null // or redirect handled in useEffect
  }

  return (
    <div>
      {!isOnline && <div className="offline-banner">You are currently offline. Some features may be limited.</div>}

      <GameDetails
        game={selectedGame}
        userStat={userStat}
        updateUserStat={handleUpdateStat}
        deleteUserStat={handleDeleteStat}
        deleteGame={handleDeleteGame}
        isOffline={!isOnline}
      />
    </div>
  )
}
