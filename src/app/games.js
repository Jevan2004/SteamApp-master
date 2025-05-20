const isBrowser = typeof window !== "undefined"

const initialGames = [
  {
    id: 1,
    title: "Counter Strike 2",
    bannerImage: "/images/Cs2-banner.png",
    image: "/images/Cs2.jpg",
    description: "For over two decades, Counter-Strike has offered an elite competitive experience...",
    developer: "Valve",
    releaseDate: "1 July 2023",
    averageReviews: "3/5",
    tags: ["FPS", "Multiplayer", "Shooter"],
    price: "Free",
  },
  {
    id: 2,
    title: "Dark Souls III",
    bannerImage: "/images/header.jpg",
    image: "/images/ds3cover.jpg",
    description: "As fires fade and the world falls into ruin...",
    developer: "FromSoftware",
    releaseDate: "11 Apr 2016",
    averageReviews: "5/5",
    tags: ["Souls-like", "Rpg", "Dark Fantasy"],
    price: "40$",
  },
  ...Array(3)
    .fill()
    .map((_, index) => ({
      id: index + 3,
      title: `Game ${index + 3}`,
      bannerImage: "/images/placeholder.jpg", 
      image: "/images/placeholder.jpg", 
      description: "No description available.",
      developer: "Unknown",
      releaseDate: "N/A",
      averageReviews: "0",
      tags: ["Unknown"],
      price: "N/A",
    })),
]

const initialUserStats = {
  1: {
    achievements: 15,
    hoursPlayed: 50,
    finished: true,
    score: 8.5,
    review: "Amazing game, lots of fun!",
  },
  2: {
    achievements: 25,
    hoursPlayed: 130,
    finished: true,
    score: 10,
    review: "Praise the sun!",
  },
}
let gamesData = [...initialGames]; 
let userStatsData = { ...initialUserStats };

if (isBrowser) {
  try {
    const storedGames = localStorage.getItem("games");
    if (storedGames) {
      gamesData = JSON.parse(storedGames);
    } else {
      localStorage.setItem("games", JSON.stringify(initialGames));
    }

    const storedStats = localStorage.getItem("userStats");
    if (storedStats) {
      userStatsData = JSON.parse(storedStats);
    } else {
      localStorage.setItem("userStats", JSON.stringify(initialUserStats));
    }
  } catch (error) {
    console.error("Error loading data from localStorage:", error);
  }
}

// Ensure userStatsData is always an object before creating a Proxy
const safeUserStatsData = userStatsData && typeof userStatsData === 'object' ? userStatsData : {};

const gamesProxy = isBrowser
  ? new Proxy(gamesData, {
      set: (target, property, value) => {
        target[property] = value;
        localStorage.setItem("games", JSON.stringify(target));
        window.dispatchEvent(new CustomEvent("gamesUpdated", {
          detail: { updatedGames: target }
        }));
        return true;
      },
      deleteProperty: (target, property) => {
        delete target[property];
        localStorage.setItem("games", JSON.stringify(target));
        window.dispatchEvent(new Event("gamesUpdated"));
        return true;
      },
    })
  : gamesData;

const userStatsProxy = isBrowser
  ? new Proxy(safeUserStatsData, {
      set: (target, property, value) => {
        target[property] = value;
        localStorage.setItem("userStats", JSON.stringify(target));
        window.dispatchEvent(new Event("statsUpdated"));
        return true;
      },
      deleteProperty: (target, property) => {
        delete target[property];
        localStorage.setItem("userStats", JSON.stringify(target));
        window.dispatchEvent(new Event("statsUpdated"));
        return true;
      },
    })
  : safeUserStatsData;

export const games = gamesProxy;
export const userStats = userStatsProxy;

export function deleteGame(gameId) {
  const index = games.findIndex((game) => game.id === gameId)
  if (index !== -1) {
    games.splice(index, 1)
    delete userStats[gameId]
  }
}

export function updateGameStats(gameId, newStats) {
  userStats[gameId] = { ...(userStats[gameId] || {}), ...newStats }
}

export function deleteGameStats(gameId) {
  delete userStats[gameId]
}

function generateRandomGame() {
  const titles = [
    "Epic Adventure", "Space Explorer", "Dragon Quest", "Cyber Punk", "Fantasy Kingdom",
    "Zombie Survival", "Racing Legends", "Sports Challenge", "Puzzle Master", "Battle Royale"
  ];
  const tags = [
    ["RPG", "Adventure"], ["FPS", "Action"], ["Strategy", "Simulation"], 
    ["Sports", "Racing"], ["Puzzle", "Casual"], ["Horror", "Survival"]
  ];
  const prices = ["Free", "$9.99", "$19.99", "$29.99", "$49.99", "$59.99"];

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    title: titles[Math.floor(Math.random() * titles.length)],
    image: "/images/placeholder.svg",
    description: "Randomly generated game",
    developer: "Random Studio",
    releaseDate: new Date().toLocaleDateString(),
    averageReviews: `${Math.floor(Math.random() * 5)}/5`,
    tags: tags[Math.floor(Math.random() * tags.length)],
    price: prices[Math.floor(Math.random() * prices.length)]
  };
}

export function addRandomGame() {
  const newGame = generateRandomGame();
  games.push(newGame);
  
  userStats[newGame.id] = {
    achievements: Math.floor(Math.random() * 50), 
    hoursPlayed: Math.floor(Math.random() * 200), 
    finished: Math.random() > 0.7, 
    score: (Math.random() * 5).toFixed(1), 
    review: getRandomReview()
  };
  
  window.dispatchEvent(new Event("gamesUpdated"));
  window.dispatchEvent(new Event("statsUpdated"));
}

export function getRandomReview() {
  const reviews = [
    "Absolutely amazing!",
    "Really enjoyed my time with this one",
    "Pretty good overall",
    "Could use some improvements",
    "Not my favorite",
    "Worth playing",
    "A masterpiece",
    "Just okay",
    "Would recommend",
    "Needs more content"
  ];
  return reviews[Math.floor(Math.random() * reviews.length)];
}