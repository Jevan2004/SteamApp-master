  "use client"
  import { useState } from "react"
  import { useRouter } from "next/navigation"
  import { addGame, addGameStats } from "../../../services/api" // Import API functions
  import "./addGame.css"
  import { tryOrQueue, saveGameDataForOffline, saveOfflineUserStats } from "../../app/utils/offlineSync";

  export default function AddGamePage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
      gameId: "",
      achievements: "",
      hoursPlayed: "",
      score: "",
      review: "",
      finished: false
    })
    const [errors, setErrors] = useState({
      gameId: "",
      achievements: "",
      hoursPlayed: "",
      score: "",
    })
    const [successMessage, setSuccessMessage] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleChange = (e) => {
      const { name, value, type, checked } = e.target
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }

    const validateForm = () => {
      let valid = true
      const newErrors = { ...errors }

      if (!formData.gameId.trim()) {
        newErrors.gameId = "Game ID is required."
        valid = false
      } else if (isNaN(Number(formData.gameId)) || Number(formData.gameId) <= 0) {
        newErrors.gameId = "Game ID must be a valid positive number."
        valid = false
      }

      if (!formData.achievements.trim() || isNaN(Number(formData.achievements)) || Number(formData.achievements) < 0) {
        newErrors.achievements = "Enter a valid number of achievements (positive)."
        valid = false
      }

      if (!formData.hoursPlayed.trim() || isNaN(Number(formData.hoursPlayed)) || Number(formData.hoursPlayed) < 0) {
        newErrors.hoursPlayed = "Enter a valid number of hours played (positive)."
        valid = false
      }

      if (!formData.score.trim()) {
        newErrors.score = "Score is required."
        valid = false
      } else if (isNaN(Number(formData.score)) || Number(formData.score) < 0 || Number(formData.score) > 10) {
        newErrors.score = "Score must be a valid number between 0 and 10."
        valid = false
      }

      setErrors(newErrors)
      return valid
    }

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!validateForm()) return;
      
      setIsSubmitting(true);
      
      try {
        const numericId = Number(formData.gameId);
    
        // Create game object
        const newGame = {
          id: numericId,
          title: `Game #${numericId}`,
          bannerImage: "/images/placeholder.jpg",
          image: "/images/placeholder.jpg",
          description: "No description available.",
          developer: "Unknown",
          releaseDate: "N/A",
          averageReviews: "0",
          tags: ["Unknown"],
          price: "10$",
        };
    
        // Create stats object
        const gameStats = {
          achievements: Number(formData.achievements),
          hoursPlayed: Number(formData.hoursPlayed),
          finished: formData.finished,
          score: Number(formData.score),
          review: formData.review,
        };
    
        // Save to offline storage immediately
        saveGameDataForOffline(newGame);
        saveOfflineUserStats(numericId, gameStats);
    
        // Queue the operations
        await tryOrQueue(
          { type: 'add', entity: 'game', payload: { data: newGame } },
          async () => await addGame(newGame)
        );
    
        await tryOrQueue(
          { type: 'add', entity: 'stat', payload: { gameId: numericId, data: gameStats } },
          async () => await addGameStats(numericId, gameStats)
        );
    
        setSuccessMessage("Game added successfully!" + (navigator.onLine ? "" : " (Will sync when online)"));
    
        // Trigger global update
        window.dispatchEvent(new CustomEvent("gamesUpdated"));
        window.dispatchEvent(new CustomEvent("statsUpdated"));
    
        // Reset form
        setFormData({
          gameId: "",
          achievements: "",
          hoursPlayed: "",
          score: "",
          review: "",
          finished: false
        });
    
        // Redirect after delay
        setTimeout(() => {
          router.push(`/game-details?id=${numericId}`);
        }, 1500);
      } catch (error) {
        console.error("Error adding game:", error);
        setErrors({
          submit: error.message || "Failed to add game. Please try again."
        });
      } finally {
        setIsSubmitting(false);
      }
    };
    return (
      <div className="container">
        <div className="form-container">
          <h1>Add a New Game</h1>

          {successMessage && <div className="success-message">{successMessage}</div>}
          {errors.submit && <div className="error-message">{errors.submit}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <label>Game ID</label>
              <input
                name="gameId"
                type="text"
                value={formData.gameId}
                onChange={handleChange}
                placeholder="Enter a unique game ID (number)"
                required
                disabled={isSubmitting}
              />
              {errors.gameId && <p className="error">{errors.gameId}</p>}
              <p className="help-text">A game with title "Game #{formData.gameId || "[ID]"}" will be created</p>
            </div>

            <div className="form-row">
              <label>Number of Achievements</label>
              <input
                name="achievements"
                type="text"
                value={formData.achievements}
                onChange={handleChange}
                placeholder="Enter number of achievements"
                required
                disabled={isSubmitting}
              />
              {errors.achievements && <p className="error">{errors.achievements}</p>}
            </div>

            <div className="form-row">
              <label>Hours Played</label>
              <input
                name="hoursPlayed"
                type="text"
                value={formData.hoursPlayed}
                onChange={handleChange}
                placeholder="Enter number of hours played"
                required
                disabled={isSubmitting}
              />
              {errors.hoursPlayed && <p className="error">{errors.hoursPlayed}</p>}
            </div>

            <div className="form-row">
              <label>Game Finished?</label>
              <input
                name="finished"
                type="checkbox"
                checked={formData.finished}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-row">
              <label>Score (0-10)</label>
              <input
                name="score"
                type="text"
                value={formData.score}
                onChange={handleChange}
                placeholder="Enter score"
                required
                disabled={isSubmitting}
              />
              {errors.score && <p className="error">{errors.score}</p>}
            </div>

            <div className="form-row">
              <label>Write a Review</label>
              <textarea
                name="review"
                value={formData.review}
                onChange={handleChange}
                placeholder="Write your review here..."
                disabled={isSubmitting}
              />
            </div>

            <div className="button-group">
              <button 
                type="submit" 
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add Game"}
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => router.push("/")}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }