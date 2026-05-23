import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://sharefare-backend.onrender.com';

// Configure axios default backend URL
axios.defaults.baseURL = API_BASE_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('sf_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync token changes to axios and localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('sf_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch user profile if token exists but user state is null
      if (!user) {
        axios.get('/api/auth/me')
          .then(res => {
            setUser(res.data);
            setLoading(false);
          })
          .catch(err => {
            console.error("Failed to load user profile:", err);
            logout();
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    } else {
      localStorage.removeItem('sf_token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const register = async (name, email, password, role) => {
    setError(null);
    try {
      const res = await axios.post('/api/auth/register', { name, email, password, role });
      // Automate login on successful registration for seamless UX
      if (res.status === 201) {
        return await login(email, password);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Registration failed.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('sf_token');
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/auth/me');
      setUser(res.data);
      return res.data;
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, register, logout, refreshUser, setError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
