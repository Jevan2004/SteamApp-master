"use client"

import { useState, useEffect } from "react";
import GamingPlatform from "./gaming-platform";
import { setAuthToken, isAuthenticated, clearAuth } from "./utils/auth";
import { login } from "../../services/api";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status on mount
    setIsLoggedIn(isAuthenticated());
    setIsLoading(false);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const data = await login(username, password);
      setAuthToken(data.token, data.userId, username);
      setIsLoggedIn(true);
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  const handleLogout = () => {
    clearAuth();
    setIsLoggedIn(false);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#111',
        color: '#fff'
      }}>
        Loading...
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#111',
        color: '#fff'
      }}>
        <h1>Login to Game Platform</h1>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '250px' }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '5px' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '5px' }}
          />
          <button
            type="submit"
            style={{
              padding: '0.5rem',
              backgroundColor: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Login
          </button>
          {error && <div style={{ color: 'red', fontSize: '0.9rem' }}>{error}</div>}
        </form>
      </div>
    );
  }

  return <GamingPlatform onLogout={handleLogout} />;
}