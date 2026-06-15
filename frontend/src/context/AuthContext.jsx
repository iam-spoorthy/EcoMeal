import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ecomeal_token') || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('ecomeal_refresh_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  // Session recovery: local storage checks chesi authenticated session load chestundi
  useEffect(() => {
    const storedUser = localStorage.getItem('ecomeal_user');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, [token]);

  /**
   * Helper to perform clean logout
   */
  const logout = () => {
    localStorage.removeItem('ecomeal_token');
    localStorage.removeItem('ecomeal_refresh_token');
    localStorage.removeItem('ecomeal_user');
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    setError(null);
  };

  /**
   * Login handler
   */
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Save credentials locally
      localStorage.setItem('ecomeal_token', data.accessToken);
      localStorage.setItem('ecomeal_refresh_token', data.refreshToken);
      localStorage.setItem('ecomeal_user', JSON.stringify(data.user));

      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register handler
   */
  const register = async (name, email, password, role) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Save credentials locally
      localStorage.setItem('ecomeal_token', data.accessToken);
      localStorage.setItem('ecomeal_refresh_token', data.refreshToken);
      localStorage.setItem('ecomeal_user', JSON.stringify(data.user));

      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Access token refresh trigger.
   * Access token expiry close lo unnapudu automatic ga verify chesi fetch chestundi.
   */
  const refreshAccessToken = async () => {
    if (!refreshToken) {
      logout();
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error('Refresh expired');
      }

      localStorage.setItem('ecomeal_token', data.accessToken);
      localStorage.setItem('ecomeal_refresh_token', data.refreshToken);
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      return data.accessToken;
    } catch (err) {
      console.warn('Session refresh failed, logging out:', err.message);
      logout();
      return null;
    }
  };

  // Utility fetcher that automatically attaches JWT and handles token expiry retry
  const authenticatedFetch = async (url, options = {}) => {
    let currentToken = token;
    
    // Attach authorization header
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${currentToken}`,
    };

    try {
      let response = await fetch(url, { ...options, headers });
      
      // Token expiry control check (401 Unauthorized error)
      if (response.status === 401) {
        console.log('Access token expired, attempting refresh...');
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          // Retry request with fresh token
          headers['Authorization'] = `Bearer ${newAccessToken}`;
          response = await fetch(url, { ...options, headers });
        }
      }

      return response;
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        authenticatedFetch,
        API_URL,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
