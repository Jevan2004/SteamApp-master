"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import "./gameDetails.css"

export default function GameDetails({ game, userStat = {}, updateUserStat, deleteUserStat, deleteGame }) {
  // Map API field names to component expected names
  const mappedUserStat = {
    achievements: userStat?.achievements || 0,
    hoursPlayed: userStat?.hours_played || 0,
    score: userStat?.score || 0,
    review: userStat?.review || "",
    finished: userStat?.finished || false
  }
  

  const [achievements, setAchievements] = useState(mappedUserStat.achievements)
  const [hoursPlayed, setHoursPlayed] = useState(mappedUserStat.hoursPlayed)
  const [score, setScore] = useState(mappedUserStat.score)
  const [review, setReview] = useState(mappedUserStat.review)
  const [finished, setFinished] = useState(mappedUserStat.finished)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(null)

  const gameId = game.id

  // Check if userStat has actual data (not just empty object)
  const hasStats = userStat && (
    userStat.achievements !== undefined || 
    userStat.hours_played !== undefined ||
    userStat.score !== undefined
  )

  useEffect(() => {
    if (gameId) {
      const savedGameData = localStorage.getItem(`game_${gameId}`)
      if (!hasStats && savedGameData) {
        const { gameData, statsData } = JSON.parse(savedGameData)
        setAchievements(statsData.achievements || 0)
        setHoursPlayed(statsData.hoursPlayed || 0)
        setScore(statsData.score || 0)
        setReview(statsData.review || "")
        setFinished(statsData.finished || false)
      }
    }
  }, [gameId, hasStats])

  const handleSave = () => {
    const updatedStats = {
      achievements: Number(achievements),
      hoursPlayed: Number(hoursPlayed), // Frontend field name
      score: Number(score),
      review,
      finished,
    };
    console.log(updatedStats);
    updateUserStat(updatedStats)
      .then(updatedData => {
        // console.log(updatedData)
        if (!updatedData) return;

        // Update local state with the response
        setAchievements(updatedData.achievements);
        setHoursPlayed(updatedData.hours_played); // Backend field name
        setScore(updatedData.score);
        setReview(updatedData.review);
        setFinished(updatedData.finished);
        
        // Update localStorage
        const savedGameData = localStorage.getItem(`game_${gameId}`);
        if (savedGameData) {
          const { gameData } = JSON.parse(savedGameData);
          localStorage.setItem(`game_${gameId}`, JSON.stringify({ 
            gameData, 
            statsData: {
              achievements: updatedData.achievements,
              hoursPlayed: updatedData.hours_played, // Map to frontend name
              score: updatedData.score,
              review: updatedData.review,
              finished: updatedData.finished
            }
          }));
        }
        
        setEditing(false);
      })
      .catch(error => {
        setError(error.message);
      });
  };

  const handleDelete = () => {
    if (typeof deleteUserStat === "function") {
      deleteUserStat(game.id)
      localStorage.removeItem(`game_${game.id}`)
      // Reset local state
      setAchievements(0)
      setHoursPlayed(0)
      setScore(0)
      setReview("")
      setFinished(false)
    }
  }

  const handleDeleteGame = () => {
    if (typeof deleteGame === "function") {
      deleteGame()
      localStorage.removeItem(`game_${game.id}`)
    }
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div className="game-details-page">
      <div className="game-details-container">
        <h1 className="game-title">{game.title}</h1>

        <div className="game-content">
          <div className="game-banner">
            <Image
              src={game.banner_image || "/placeholder.jpg"}
              alt={game.title}
              width={500}
              height={300}
              className="banner-image"
            />
          </div>

          <div className="game-info">
            <p className="game-description">{game.description}</p>
            <div className="info-row">
              <span className="info-label">Developer:</span>
              <span className="info-value">{game.developer}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Release Date:</span>
              <span className="info-value">{game.release_date}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Average Reviews:</span>
              <span className="info-value">{game.average_reviews}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Tags:</span>
              <div className="tags-container">
                {game.tags && game.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            </div>
            <div className="info-row">
              <span className="info-label">Price:</span>
              <span className="info-value">{game.price}</span>
            </div>
          </div>
        </div>

        <div className="player-stats">
        <div className="stats-header">
          {hasStats ? "You Played This Game" : "Add Your Stats"}
        </div>
          <div className="stats-grid">
            <div className="stats-row">
              <span className="stats-label">Number of Achievements:</span>
              {editing ? (
                <input type="number" value={achievements} onChange={(e) => setAchievements(e.target.value)} />
              ) : (
                <span className="stats-value">{achievements || "N/A"}</span>
              )}
            </div>
            <div className="stats-row">
              <span className="stats-label">Hours Played:</span>
              {editing ? (
                <input type="number" value={hoursPlayed} onChange={(e) => setHoursPlayed(e.target.value)} />
              ) : (
                <span className="stats-value">{hoursPlayed || "N/A"}</span>
              )}
            </div>
            <div className="stats-row">
              <span className="stats-label">Game Finished:</span>
              {editing ? (
                <input type="checkbox" checked={finished} onChange={(e) => setFinished(e.target.checked)} />
              ) : (
                <span className="stats-value">{finished ? "Yes" : "No"}</span>
              )}
            </div>
            <div className="stats-row">
              <span className="stats-label">Your Score:</span>
              {editing ? (
                <input type="number" value={score} min="0" max="10" onChange={(e) => setScore(e.target.value)} />
              ) : (
                <span className="stats-value">{score || "N/A"}</span>
              )}
            </div>
            <div className="stats-row full-width">
              <span className="stats-label">Your Review:</span>
              {editing ? (
                <textarea value={review} onChange={(e) => setReview(e.target.value)} />
              ) : (
                <p>{review || "No review yet"}</p>
              )}
            </div>
          </div>
          <div className="button-container">
            {editing ? (
              <button className="save-button" onClick={handleSave}>
                Save
              </button>
            ) : (
              <>
                <button className="edit-button" onClick={() => setEditing(true)}>
                  {Object.keys(userStat).length > 0 ? "Edit" : "Add Stats"}
                </button>
                {Object.keys(userStat).length > 0 && (
                  <button className="delete-button" onClick={handleDelete}>
                    Delete Stats
                  </button>
                )}
              </>
            )}
            <button className="delete-game-button" onClick={handleDeleteGame}>
              Remove Game
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
