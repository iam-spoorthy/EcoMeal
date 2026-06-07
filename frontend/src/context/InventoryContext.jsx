import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { syncQueue } from '../utils/SyncQueue';

const InventoryContext = createContext(null);

export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider = ({ children }) => {
  const { authenticatedFetch, API_URL, token } = useAuth();
  
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    outOfStock: 0,
    expired: 0,
    expiringSoon: 0,
    lowStock: 0,
  });
  
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 20,
  });

  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(syncQueue.getQueue().length);
  
  // Store current search, filter, and sort params in refs to use during socket updates
  const queryParamsRef = useRef({
    page: 1,
    search: '',
    category: 'All',
    status: 'All',
    sortBy: 'expiryDate',
    sortOrder: 'asc',
  });

  const socketRef = useRef(null);

  // Connection State listeners setup
  useEffect(() => {
    const handleOnline = () => {
      console.log('Browser back online. Launching sync...');
      setIsOnline(true);
      // Process offline mutations queue
      syncQueue.processQueue(authenticatedFetch, API_URL);
    };

    const handleOffline = () => {
      console.log('Browser offline.');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check: if online on startup, attempt to process any leftover queue items
    if (navigator.onLine) {
      syncQueue.processQueue(authenticatedFetch, API_URL);
    }

    // Bind syncQueue complete callback to refetch data
    syncQueue.onSyncCompleted(() => {
      console.log('Offline queue successfully synced. Refetching dashboard...');
      setPendingSyncCount(0);
      fetchInventory(queryParamsRef.current.page, queryParamsRef.current);
      fetchStats();
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token]);

  // WebSocket Setup for Real-time pushes
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect to WebSocket server in backend
    const socket = io('http://localhost:5001');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSockets connected to server.');
      socket.emit('join_kitchen');
    });

    // Real-time synchronization events triggers from other users/sessions
    socket.on('inventory_change', (change) => {
      console.log('Real-time updates broadcast received:', change);
      
      // Auto refetch dashboard to maintain latest pagination and search match accuracy
      fetchInventory(queryParamsRef.current.page, queryParamsRef.current);
      fetchStats();
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Keep track of local storage queue updates in UI state
  const refreshPendingSyncCount = () => {
    setPendingSyncCount(syncQueue.getQueue().length);
  };

  /**
   * Fetch paginated list of inventory items
   */
  const fetchInventory = async (page = 1, filters = {}) => {
    // If offline, read from cached local state if possible or keep list as-is
    if (!navigator.onLine) {
      console.log('Offline: Reading inventory from cached state');
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Save current parameters in ref for reference
    queryParamsRef.current = { page, ...filters };

    try {
      const { search, category, status, sortBy, sortOrder } = filters;
      let queryString = `page=${page}&limit=20`;
      
      if (search) queryString += `&search=${encodeURIComponent(search)}`;
      if (category) queryString += `&category=${encodeURIComponent(category)}`;
      if (status) queryString += `&status=${encodeURIComponent(status)}`;
      if (sortBy) queryString += `&sortBy=${sortBy}`;
      if (sortOrder) queryString += `&sortOrder=${sortOrder}`;

      const response = await authenticatedFetch(`${API_URL}/inventory?${queryString}`);
      const data = await response.json();

      if (data.success) {
        setItems(data.data);
        setPagination(data.pagination);
        // Cache inventory list locally for offline view fallback
        localStorage.setItem('ecomeal_cached_inventory', JSON.stringify(data.data));
        localStorage.setItem('ecomeal_cached_pagination', JSON.stringify(data.pagination));
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      // Retrieve from cache if network fails
      const cached = localStorage.getItem('ecomeal_cached_inventory');
      const cachedPag = localStorage.getItem('ecomeal_cached_pagination');
      if (cached) setItems(JSON.parse(cached));
      if (cachedPag) setPagination(JSON.parse(cachedPag));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch inventory summary counts
   */
  const fetchStats = async () => {
    if (!navigator.onLine) {
      const cachedStats = localStorage.getItem('ecomeal_cached_stats');
      if (cachedStats) setStats(JSON.parse(cachedStats));
      return;
    }

    try {
      const response = await authenticatedFetch(`${API_URL}/inventory/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        localStorage.setItem('ecomeal_cached_stats', JSON.stringify(data.stats));
      }
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  };

  /**
   * Create new inventory item
   */
  const createItem = async (itemData) => {
    if (!isOnline) {
      // Offline mode: create temporary client ID and add to local UI state & queue
      const tempId = `temp_${Date.now()}`;
      const mockItem = {
        _id: tempId,
        tempId,
        ...itemData,
        status: 'good', // local preview status
        expiryDate: new Date(itemData.expiryDate),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Optimistically push to local items display list
      setItems((prev) => [mockItem, ...prev]);
      
      // Enqueue mutation for future synchronization
      syncQueue.enqueue('create', tempId, itemData);
      refreshPendingSyncCount();
      
      return mockItem;
    }

    try {
      const response = await authenticatedFetch(`${API_URL}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create item');
      
      // Refresh database records
      fetchInventory(queryParamsRef.current.page, queryParamsRef.current);
      fetchStats();
      return data.data;
    } catch (err) {
      console.error('Create item error:', err);
      throw err;
    }
  };

  /**
   * Update existing inventory item
   */
  const updateItem = async (id, itemData) => {
    if (!isOnline) {
      // Offline mode: perform optimistic update on state array
      setItems((prev) =>
        prev.map((item) => (item._id === id ? { ...item, ...itemData, expiryDate: new Date(itemData.expiryDate) } : item))
      );

      // Enqueue update action
      syncQueue.enqueue('update', id, itemData);
      refreshPendingSyncCount();
      return { _id: id, ...itemData };
    }

    try {
      const response = await authenticatedFetch(`${API_URL}/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update item');
      
      fetchInventory(queryParamsRef.current.page, queryParamsRef.current);
      fetchStats();
      return data.data;
    } catch (err) {
      console.error('Update item error:', err);
      throw err;
    }
  };

  /**
   * Delete inventory item
   */
  const deleteItem = async (id) => {
    if (!isOnline) {
      // Offline mode: remove item from UI immediately
      setItems((prev) => prev.filter((item) => item._id !== id));
      
      // Enqueue delete operation
      syncQueue.enqueue('delete', id, null);
      refreshPendingSyncCount();
      return { success: true };
    }

    try {
      const response = await authenticatedFetch(`${API_URL}/inventory/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete item');
      
      fetchInventory(queryParamsRef.current.page, queryParamsRef.current);
      fetchStats();
      return data;
    } catch (err) {
      console.error('Delete item error:', err);
      throw err;
    }
  };

  return (
    <InventoryContext.Provider
      value={{
        items,
        stats,
        pagination,
        loading,
        isOnline,
        pendingSyncCount,
        fetchInventory,
        fetchStats,
        createItem,
        updateItem,
        deleteItem,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};
