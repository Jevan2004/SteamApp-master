"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

const API_BASE_URL = "http://localhost:5000/api"
export const fetchUserStatistics = async ({ userId, page = 1, limit = 10 }) => {
  const queryString = new URLSearchParams({ userId, page, limit }).toString();
  const res = await fetch(`/api/user-statistics?${queryString}`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch user statistics');
  }

  return res.json();
};



export default function UserStatisticsGames() {
  const [statistics, setStatistics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        setLoading(true)
        const userId = 1 // Replace with dynamic value later
        const data = await fetchUserStatistics({ userId, page, limit: 10 })
        setStatistics((prev) => (page === 1 ? data.data.game_details : [...prev, ...data.data.game_details]))
        setHasMore(data.length > 0)
        setError(null)
      } catch (err) {
        setError("Failed to load user statistics. Please try again later.")
        console.error("Error loading user statistics:", err)
      } finally {
        setLoading(false)
      }
    }
    loadStatistics()
  }, [page])

  const loadMore = () => {
    if (!loading && hasMore) setPage((prev) => prev + 1)
  }

  const categorizeGamesByPrice = (games) => {
    if (!games || games.length === 0) return { cheap: [], average: [], expensive: [] }

    const numericPrices = games
      .map((game) => {
        const priceStr = game.price?.replace(/[^0-9.]/g, "")
        return priceStr ? Number.parseFloat(priceStr) : 0
      })
      .filter((price) => !isNaN(price))
      .sort((a, b) => a - b)

    if (numericPrices.length === 0) return { cheap: [], average: [], expensive: [] }

    const count = numericPrices.length
    const cheapThreshold = numericPrices[Math.floor(count / 3)]
    const averageThreshold = numericPrices[Math.floor((2 * count) / 3)]

    return games.reduce(
      (acc, game) => {
        const priceStr = game.price?.replace(/[^0-9.]/g, "")
        const price = priceStr ? Number.parseFloat(priceStr) : 0

        if (price <= cheapThreshold) acc.cheap.push(game)
        else if (price <= averageThreshold) acc.average.push(game)
        else acc.expensive.push(game)

        return acc
      },
      { cheap: [], average: [], expensive: [] },
    )
  }

  const priceCategories = categorizeGamesByPrice(statistics)

  return (
    <div className="user-statistics-section">
      <div className="section-header">
        <h2 className="section-title">Your Game Statistics</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="games-grid">
        {statistics.length > 0 ? (
          statistics.map((stat) => {
            const game = stat.game
            if (!game) return null

            const priceClass = priceCategories.cheap.includes(game)
              ? "cheap-price"
              : priceCategories.average.includes(game)
              ? "average-price"
              : priceCategories.expensive.includes(game)
              ? "expensive-price"
              : ""

            return (
              <div key={stat.id || `stat-${game.id}`} className="game-card">
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
                    <div className="game-stats">
                      <span className="stat-item">
                        <span className="stat-label">Score:</span> {stat.score}/10
                      </span>
                      <span className="stat-item">
                        <span className="stat-label">Hours:</span> {stat.hoursPlayed}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })
        ) : loading ? (
          <div className="loading-message">Loading statistics...</div>
        ) : (
          <div className="no-data-message">No game statistics available</div>
        )}
      </div>

      {loading && <div className="loading-more">Loading more statistics...</div>}

      {!loading && hasMore && (
        <div className="load-more-container">
          <button onClick={loadMore} className="load-more-button">
            Load More
          </button>
        </div>
      )}
    </div>
  )
}
