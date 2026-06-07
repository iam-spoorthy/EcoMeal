import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { 
  Plus, Edit2, Trash2, Search, Filter, RefreshCw, 
  Wifi, WifiOff, LogOut, Package, AlertTriangle, 
  Calendar, Shield, ChevronLeft, ChevronRight, User, Phone, 
  Sparkles, ChefHat, BarChart3, ListCollapse, Compass, Info, CheckCircle2, Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const Dashboard = () => {
  const { user, logout, authenticatedFetch, API_URL } = useAuth();
  const { 
    items, stats, pagination, loading, isOnline, pendingSyncCount,
    fetchInventory, fetchStats, createItem, updateItem, deleteItem 
  } = useInventory();

  // Navigation Tabs state: 'inventory' | 'analytics' | 'ai'
  const [activeTab, setActiveTab] = useState('inventory');

  // Search & Filters state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [sortBy, setSortBy] = useState('expiryDate');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);

  // AI Recommendations state
  const [aiRecipes, setAiRecipes] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiSource, setAiSource] = useState('');

  // Form Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' | 'edit'
  const [editingItem, setEditingItem] = useState(null);

  // Modal Form Inputs
  const [formData, setFormData] = useState({
    name: '',
    category: 'Produce',
    quantity: '',
    unit: 'kg',
    expiryDate: '',
    lowStockThreshold: 10,
    supplierName: '',
    supplierContact: '',
  });

  // Load stats and items on mount and parameter changes
  useEffect(() => {
    fetchStats();
  }, [items]);

  useEffect(() => {
    if (activeTab === 'inventory') {
      const filters = { search, category, status, sortBy, sortOrder };
      fetchInventory(page, filters);
    }
  }, [page, search, category, status, sortBy, sortOrder, activeTab]);

  // Trigger AI suggestions fetching
  const handleFetchAiRecommendations = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiSource('');
    try {
      const response = await authenticatedFetch(`${API_URL}/ai/recommendations`);
      const data = await response.json();
      if (data.success) {
        setAiRecipes(data.data);
        setAiSource(data.source);
      } else {
        throw new Error(data.message || 'Failed to fetch recommendations');
      }
    } catch (err) {
      setAiError(err.message || 'AI request encountered an error.');
    } finally {
      setAiLoading(false);
    }
  };

  // Auto trigger AI on tab change if empty
  useEffect(() => {
    if (activeTab === 'ai' && aiRecipes.length === 0) {
      handleFetchAiRecommendations();
    }
  }, [activeTab]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  // Open Modal to Add Item (No pre-filled values)
  const handleOpenAddModal = () => {
    setModalType('add');
    setFormData({
      name: '',
      category: 'Produce',
      quantity: '',
      unit: 'kg',
      expiryDate: '',
      lowStockThreshold: 10,
      supplierName: '',
      supplierContact: '',
    });
    setIsModalOpen(true);
  };

  // Open Modal to Edit Item
  const handleOpenEditModal = (item) => {
    setModalType('edit');
    setEditingItem(item);
    
    const formattedDate = item.expiryDate 
      ? new Date(item.expiryDate).toISOString().split('T')[0]
      : '';

    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: formattedDate,
      lowStockThreshold: item.lowStockThreshold || 10,
      supplierName: item.supplierName || '',
      supplierContact: item.supplierContact || '',
    });
    setIsModalOpen(true);
  };

  // Submit Form Handler
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      category: formData.category,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      expiryDate: new Date(formData.expiryDate),
      lowStockThreshold: parseInt(formData.lowStockThreshold),
      supplierName: formData.supplierName || 'General Supplier',
      supplierContact: formData.supplierContact || '',
    };

    try {
      if (modalType === 'add') {
        await createItem(payload);
      } else {
        await updateItem(editingItem._id, payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      alert(`Operation failed: ${err.message}`);
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      try {
        await deleteItem(id);
      } catch (err) {
        alert(`Failed to delete item: ${err.message}`);
      }
    }
  };

  // Format Date to Readable String
  const formatReadableDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    const date = new Date(dateVal);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusStyle = (itemStatus) => {
    switch (itemStatus) {
      case 'expired':
        return 'bg-rose-500/10 border border-rose-500/30 text-rose-400';
      case 'expiring_soon':
        return 'bg-amber-500/10 border border-amber-500/30 text-amber-400 pulse-warning';
      case 'low_stock':
        return 'bg-orange-500/10 border border-orange-500/30 text-orange-400';
      default:
        return 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400';
    }
  };

  // Prepare Data for Recharts
  const goodStockCount = Math.max(0, stats.totalItems - stats.lowStock - stats.expiringSoon - stats.expired);
  
  const statusPieData = [
    { name: 'Good Stock', value: goodStockCount, color: '#10B981' },
    { name: 'Low Stock', value: stats.lowStock, color: '#F97316' },
    { name: 'Expiring Soon', value: stats.expiringSoon, color: '#F59E0B' },
    { name: 'Expired', value: stats.expired, color: '#EF4444' }
  ].filter(item => item.value > 0);

  const stockBarData = [
    { name: 'Good', count: goodStockCount, fill: '#10B981' },
    { name: 'Low', count: stats.lowStock, fill: '#F97316' },
    { name: 'Expiring', count: stats.expiringSoon, fill: '#F59E0B' },
    { name: 'Expired', count: stats.expired, fill: '#EF4444' }
  ];

  return (
    <div className="flex h-screen bg-dark-bg text-gray-100 overflow-hidden font-sans relative">
      
      {/* Background Mesh Glow Circles */}
      <div className="absolute top-10 left-80 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[130px] animate-drift-1 pointer-events-none"></div>
      <div className="absolute bottom-10 right-20 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[130px] animate-drift-2 pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/3 w-[500px] h-[500px] bg-purple-500/3 rounded-full blur-[160px] pointer-events-none"></div>

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-dark-card/90 border-r border-dark-border flex flex-col justify-between p-6 z-20 backdrop-blur-md">
        <div>
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="p-2.5 bg-brand-primary/20 border border-brand-primary/30 rounded-xl shadow-inner">
              <Package className="w-5.5 h-5.5 text-brand-primary animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-white">EcoMeal</h2>
              <span className="text-[9px] text-gray-500 font-bold tracking-widest uppercase block mt-0.5">Kitchen OS Console</span>
            </div>
          </div>

          {/* User Profile */}
          <div className="p-4 bg-dark-bg/60 border border-dark-border/60 rounded-2xl mb-6 shadow-inner">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-brand-secondary/15 flex items-center justify-center border border-brand-secondary/25">
                <User className="w-4.5 h-4.5 text-brand-secondary" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-sm font-semibold text-white truncate">{user?.name}</h4>
                <div className="flex items-center text-[10px] text-gray-400 font-medium capitalize mt-0.5">
                  <Shield className="w-3.5 h-3.5 text-brand-primary mr-1" />
                  {user?.role?.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation Menu */}
          <nav className="space-y-1.5 mb-6">
            <span className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest block mb-2.5 px-1.5">Management Control</span>
            
            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                activeTab === 'inventory' 
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 border border-brand-primary/10' 
                  : 'text-gray-400 hover:text-white hover:bg-dark-hover/60 border border-transparent'
              }`}
            >
              <ListCollapse className="w-4 h-4" />
              <span>Inventory Control</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                activeTab === 'analytics' 
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 border border-brand-primary/10' 
                  : 'text-gray-400 hover:text-white hover:bg-dark-hover/60 border border-transparent'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Stock Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                activeTab === 'ai' 
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 border border-brand-primary/10' 
                  : 'text-gray-400 hover:text-white hover:bg-dark-hover/60 border border-transparent animate-pulse'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span className="flex-1 text-left">AI Chef Specials</span>
              <Sparkles className="w-3.5 h-3.5 text-brand-warning animate-bounce" />
            </button>
          </nav>

          {/* Connection Status indicator */}
          <div className="space-y-3 pt-4 border-t border-dark-border/40">
            <span className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest block px-1.5">System Status</span>
            
            <div className={`flex items-center justify-between p-3.5 rounded-2xl border text-[11px] ${
              isOnline 
                ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' 
                : 'bg-amber-500/5 border-amber-500/15 text-brand-warning'
            }`}>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-brand-warning animate-ping'}`}></span>
                <span className="font-bold tracking-wide uppercase text-[9px]">{isOnline ? 'Console Online' : 'Console Offline'}</span>
              </div>
              {pendingSyncCount > 0 && (
                <span className="bg-brand-warning text-dark-bg font-extrabold px-1.5 py-0.5 rounded-md text-[9px] animate-pulse">
                  {pendingSyncCount} queued
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Logout Control */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 bg-dark-bg border border-dark-border hover:bg-dark-hover py-3.5 rounded-2xl transition-all duration-200 active:scale-[0.98] text-sm font-semibold text-gray-400 hover:text-white hover:border-white/10 shadow-inner cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout Console</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        
        {/* Offline Sync Banner Alerts */}
        {!isOnline && (
          <div className="bg-brand-warning/90 text-dark-bg px-8 py-3 flex items-center justify-between text-xs font-bold z-30 shadow-md backdrop-blur-md">
            <div className="flex items-center space-x-2">
              <WifiOff className="w-4 h-4 animate-bounce" />
              <span>INTERNET DISCONNECTED: Offline changes are buffered locally and will auto-sync on connection restore.</span>
            </div>
            {pendingSyncCount > 0 && (
              <span className="bg-dark-bg text-brand-warning text-[10px] px-3 py-1 rounded-full border border-brand-warning/20 shadow-inner">
                {pendingSyncCount} operations buffered
              </span>
            )}
          </div>
        )}

        {/* Top Header Bar */}
        <header className="h-20 border-b border-dark-border flex items-center justify-between px-8 bg-dark-card/30 backdrop-blur-md z-10">
          <div className="flex items-center space-x-3.5">
            {activeTab === 'inventory' && <ListCollapse className="w-5.5 h-5.5 text-brand-primary" />}
            {activeTab === 'analytics' && <BarChart3 className="w-5.5 h-5.5 text-brand-secondary" />}
            {activeTab === 'ai' && <ChefHat className="w-5.5 h-5.5 text-brand-warning" />}
            <div>
              <h1 className="text-xl font-black text-white tracking-tight capitalize">
                {activeTab === 'inventory' ? 'Kitchen Stock Controller' : activeTab === 'analytics' ? 'Operations Analytics' : 'Zero-Waste AI Kitchen Engine'}
              </h1>
              <p className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase mt-0.5">
                {activeTab === 'inventory' ? 'Manage ingredients, check expiries and audit items' : activeTab === 'analytics' ? 'Real-time stock ratios, charts and alert lists' : 'Zero-waste chef specials generated via Groq (Llama 3)'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Quick Actions (Add Item) */}
            {activeTab === 'inventory' && (user?.role === 'admin' || user?.role === 'kitchen_manager') && (
              <button
                onClick={handleOpenAddModal}
                className="bg-brand-primary hover:bg-emerald-600 text-white text-xs font-bold px-4.5 py-3 rounded-2xl inline-flex items-center transition-all duration-300 shadow-lg shadow-brand-primary/20 btn-glow-green cursor-pointer border border-brand-primary/10"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Ingredient
              </button>
            )}

            {/* AI Refresh Action */}
            {activeTab === 'ai' && (
              <button
                disabled={aiLoading}
                onClick={handleFetchAiRecommendations}
                className="bg-brand-secondary hover:bg-blue-600 text-white text-xs font-bold px-4.5 py-3 rounded-2xl inline-flex items-center transition-all duration-300 shadow-lg shadow-brand-secondary/20 btn-glow-blue disabled:opacity-50 cursor-pointer border border-brand-secondary/10"
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${aiLoading ? 'animate-spin' : ''}`} />
                Regenerate Chef Specials
              </button>
            )}
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* Summary Cards */}
          {activeTab !== 'ai' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Card 1: Total Items */}
              <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex items-center space-x-4">
                <div className="p-3.5 bg-brand-secondary/10 rounded-xl border border-brand-secondary/20">
                  <Package className="w-6 h-6 text-brand-secondary" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block">Total Ingredients</span>
                  <span className="text-3xl font-black text-white mt-1 block tracking-tight">{stats.totalItems}</span>
                </div>
              </div>

              {/* Card 2: Low Stock */}
              <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex items-center space-x-4">
                <div className="p-3.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block">Low Stock Items</span>
                  <span className="text-3xl font-black text-white mt-1 block tracking-tight">{stats.lowStock}</span>
                </div>
              </div>

              {/* Card 3: Expiring Soon */}
              <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex items-center space-x-4">
                <div className="p-3.5 bg-brand-warning/10 rounded-xl border border-brand-warning/20">
                  <Calendar className="w-6 h-6 text-brand-warning animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block">Expiring (3 Days)</span>
                  <span className="text-3xl font-black text-white mt-1 block tracking-tight">{stats.expiringSoon}</span>
                </div>
              </div>

              {/* Card 4: Expired */}
              <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex items-center space-x-4">
                <div className="p-3.5 bg-brand-accent/10 rounded-xl border border-brand-accent/20">
                  <AlertTriangle className="w-6 h-6 text-brand-accent" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block">Expired Ingredients</span>
                  <span className="text-3xl font-black text-white mt-1 block tracking-tight text-brand-accent">{stats.expired}</span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 1: INVENTORY CONTROL LIST */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-fade-in">
              {/* Filtering Panel */}
              <div className="glass-panel p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 w-4 h-4 my-auto" />
                  <input
                    type="text"
                    placeholder="Search stock by name..."
                    value={search}
                    onChange={handleSearchChange}
                    className="w-full bg-[#05070c] border border-dark-border text-white placeholder-gray-600 text-xs rounded-xl focus:outline-none focus:border-brand-primary pl-10 pr-4 py-3 transition-colors"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-3.5 h-3.5 text-gray-500" />
                    <select
                      value={category}
                      onChange={handleFilterChange(setCategory)}
                      className="bg-[#05070c] border border-dark-border text-gray-300 text-xs rounded-xl focus:outline-none focus:border-brand-primary px-3.5 py-2.5 cursor-pointer font-medium"
                    >
                      <option value="All">All Categories</option>
                      <option value="Produce">Produce</option>
                      <option value="Dairy">Dairy</option>
                      <option value="Meat & Seafood">Meat & Seafood</option>
                      <option value="Pantry Staples">Pantry Staples</option>
                      <option value="Bakery">Bakery</option>
                    </select>
                  </div>

                  <select
                    value={status}
                    onChange={handleFilterChange(setStatus)}
                    className="bg-[#05070c] border border-dark-border text-gray-300 text-xs rounded-xl focus:outline-none focus:border-brand-primary px-3.5 py-2.5 cursor-pointer font-medium"
                  >
                    <option value="All">All Statuses</option>
                    <option value="good">Good Condition</option>
                    <option value="low_stock">Low Stock Warning</option>
                    <option value="expiring_soon">Expiring Soon</option>
                    <option value="expired">Expired Block</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-[#05070c] border border-dark-border text-gray-300 text-xs rounded-xl focus:outline-none focus:border-brand-primary px-3.5 py-2.5 cursor-pointer font-medium"
                  >
                    <option value="expiryDate">Sort by Expiry Date</option>
                    <option value="name">Sort by Name</option>
                    <option value="quantity">Sort by Quantity</option>
                    <option value="updatedAt">Sort by Audit Date</option>
                  </select>

                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="bg-[#05070c] border border-dark-border hover:bg-dark-hover px-4 py-2.5 text-xs font-bold rounded-xl text-gray-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-dark-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-dark-border bg-white/[0.02] text-gray-400 text-[10px] font-extrabold uppercase tracking-widest">
                        <th className="py-4.5 px-6">Ingredient</th>
                        <th className="py-4.5 px-6">Category</th>
                        <th className="py-4.5 px-6 text-right">Quantity</th>
                        <th className="py-4.5 px-6">Expiry Date</th>
                        <th className="py-4.5 px-6">Stock Status</th>
                        <th className="py-4.5 px-6">Supplier Details</th>
                        <th className="py-4.5 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs font-medium">
                      {loading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <tr key={index}>
                            <td className="py-5 px-6"><div className="h-4 w-36 loading-shimmer rounded-lg"></div></td>
                            <td className="py-5 px-6"><div className="h-4 w-20 loading-shimmer rounded-lg"></div></td>
                            <td className="py-5 px-6 text-right"><div className="h-4 w-12 loading-shimmer rounded-lg ml-auto"></div></td>
                            <td className="py-5 px-6"><div className="h-4 w-24 loading-shimmer rounded-lg"></div></td>
                            <td className="py-5 px-6"><div className="h-6 w-16 loading-shimmer rounded-lg"></div></td>
                            <td className="py-5 px-6"><div className="h-4 w-28 loading-shimmer rounded-lg"></div></td>
                            <td className="py-5 px-6 text-center"><div className="h-8 w-16 loading-shimmer rounded-lg mx-auto"></div></td>
                          </tr>
                        ))
                      ) : items.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-16 px-6 text-center text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                            No inventory items match search criteria
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item._id} className="hover:bg-white/[0.015] transition-all duration-150">
                            
                            {/* Ingredient Name */}
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-2.5">
                                <span className="font-bold text-white tracking-wide text-sm">{item.name}</span>
                                {item._id.toString().startsWith('temp_') && (
                                  <div className="group relative">
                                    <Clock className="w-4 h-4 text-brand-warning cursor-help animate-pulse" />
                                    <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-[#05070c] text-[9px] text-gray-300 font-bold px-2 py-1 rounded border border-dark-border transition-transform whitespace-nowrap shadow-xl">
                                      Offline Action: Sync Pending
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Category badge */}
                            <td className="py-4 px-6">
                              <span className="text-gray-300 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                {item.category}
                              </span>
                            </td>

                            {/* Quantity */}
                            <td className="py-4 px-6 text-right font-mono font-bold text-sm text-white">
                              {item.quantity} <span className="text-xs text-gray-400 font-normal">{item.unit}</span>
                            </td>

                            {/* Expiry Date */}
                            <td className="py-4 px-6 text-gray-400 font-semibold">
                              {formatReadableDate(item.expiryDate)}
                            </td>

                            {/* Status badge */}
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-widest inline-block ${getStatusStyle(item.status)}`}>
                                {item.status.replace('_', ' ')}
                              </span>
                            </td>

                            {/* Supplier info */}
                            <td className="py-4 px-6">
                              <div>
                                <div className="font-bold text-white text-xs">{item.supplierName}</div>
                                {item.supplierContact && (
                                  <div className="text-gray-400 flex items-center mt-1 font-mono text-[10px]">
                                    <Phone className="w-3 h-3 mr-1 text-gray-500" />
                                    {item.supplierContact}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Table row actions */}
                            <td className="py-4 px-6 text-center">
                              <div className="flex items-center justify-center space-x-2.5">
                                {(user?.role === 'admin' || user?.role === 'kitchen_manager') ? (
                                  <button
                                    onClick={() => handleOpenEditModal(item)}
                                    className="p-2 bg-white/5 border border-white/5 hover:border-brand-secondary/30 text-gray-400 hover:text-brand-secondary rounded-xl transition-all duration-200 cursor-pointer hover:bg-brand-secondary/5"
                                    title="Edit Ingredient"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-600">-</span>
                                )}

                                {user?.role === 'admin' && (
                                  <button
                                    onClick={() => handleDeleteItem(item._id)}
                                    className="p-2 bg-white/5 border border-white/5 hover:border-brand-accent/30 text-gray-400 hover:text-brand-accent rounded-xl transition-all duration-200 cursor-pointer hover:bg-brand-accent/5"
                                    title="Delete Ingredient"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>

                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                {pagination.totalPages > 1 && (
                  <div className="bg-white/[0.01] border-t border-dark-border px-6 py-4 flex items-center justify-between text-xs">
                    <span className="text-xs text-gray-400 font-medium">
                      Page <span className="font-bold text-white">{pagination.currentPage}</span> of <span className="font-bold text-white">{pagination.totalPages}</span> ({pagination.totalItems} ingredients)
                    </span>
                    
                    <div className="flex items-center space-x-2.5">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                        className="p-2 bg-dark-bg border border-dark-border rounded-xl text-gray-400 hover:text-white transition-colors disabled:opacity-40 disabled:hover:text-gray-400 cursor-pointer hover:bg-dark-hover"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <button
                        disabled={page === pagination.totalPages}
                        onClick={() => setPage(prev => Math.min(prev + 1, pagination.totalPages))}
                        className="p-2 bg-dark-bg border border-dark-border rounded-xl text-gray-400 hover:text-white transition-colors disabled:opacity-40 disabled:hover:text-gray-400 cursor-pointer hover:bg-dark-hover"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STOCK ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              
              {/* PieChart */}
              <div className="glass-panel p-6 rounded-2xl border border-dark-border flex flex-col justify-between shadow-2xl">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center">
                  <Info className="w-4 h-4 text-brand-primary mr-2" />
                  Stock Health Share (Pie distribution)
                </h3>
                
                {statusPieData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-gray-500 font-semibold">No stock data seeded.</div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="45%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {statusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'rgba(10, 15, 30, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                          itemStyle={{ color: '#F3F4F6' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* BarChart */}
              <div className="glass-panel p-6 rounded-2xl border border-dark-border flex flex-col justify-between shadow-2xl">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center">
                  <BarChart3 className="w-4 h-4 text-brand-secondary mr-2" />
                  Stock Health Status Count
                </h3>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#6B7280" fontSize={11} fontWeight="bold" />
                      <YAxis stroke="#6B7280" fontSize={11} fontWeight="bold" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(10, 15, 30, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                        itemStyle={{ color: '#F3F4F6' }}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {stockBarData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Aggregation Insights */}
              <div className="glass-panel p-6 rounded-2xl lg:col-span-2 border border-dark-border flex items-start space-x-4 bg-white/[0.01] shadow-2xl">
                <div className="p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-xl text-brand-primary">
                  <ChefHat className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm mb-1 tracking-wide uppercase text-xs">Stock Audit Analytics Summary</h4>
                  <p className="text-gray-400 text-xs leading-relaxed mt-1">
                    System contains exactly <span className="text-white font-black">{stats.totalItems} items</span>. Current metrics isolate <span className="text-brand-accent font-extrabold">{stats.expired} expired items</span>. Ensure the expiring batch stock count of <span className="text-brand-warning font-extrabold">{stats.expiringSoon} items</span> is integrated into today's Chef Specials using the zero-waste recommender.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: AI RECOMMENDATIONS */}
          {activeTab === 'ai' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Box */}
              <div className="glass-panel p-6 rounded-2xl border border-dark-border bg-white/[0.01] shadow-2xl flex items-center justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-brand-warning/10 border border-brand-warning/20 rounded-xl text-brand-warning mt-0.5">
                    <Sparkles className="w-5.5 h-5.5 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm tracking-wide uppercase text-xs">Zero-Waste AI Chef Recommendations</h3>
                    <p className="text-gray-400 text-xs mt-1.5 leading-relaxed max-w-2xl">
                      This system analyzes your ingredients nearing expiration and queries **Groq (Llama 3)** to construct Zero-Waste specials.
                    </p>
                  </div>
                </div>

                {aiSource && (
                  <span className={`text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-md border ${
                    aiSource === 'groq_api'
                      ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary shadow-sm shadow-brand-primary/10'
                      : 'bg-brand-secondary/10 border-brand-secondary/20 text-brand-secondary'
                  }`}>
                    {aiSource === 'groq_api' ? '✓ Groq Live API' : '⚡ Local Backup Engine'}
                  </span>
                )}
              </div>

              {/* Recommendations loading */}
              {aiLoading ? (
                <div className="glass-panel p-20 rounded-2xl text-center border border-dark-border shadow-2xl">
                  <div className="inline-block animate-spin border-4 border-brand-warning border-t-transparent rounded-full w-10 h-10 mb-4"></div>
                  <h4 className="text-white font-bold text-sm uppercase tracking-wider">Contacting Groq Llama 3 servers...</h4>
                  <p className="text-gray-500 text-xs mt-1.5 animate-pulse">Analyzing expiring inventory and compiling zero-waste cooking steps...</p>
                </div>
              ) : aiError ? (
                <div className="glass-panel p-10 rounded-2xl border border-brand-accent/20 bg-brand-accent/5 text-center shadow-2xl">
                  <AlertTriangle className="w-10 h-10 text-brand-accent mx-auto mb-3" />
                  <h4 className="text-white font-bold text-xs uppercase tracking-widest text-brand-accent">AI Recommendations Interrupted</h4>
                  <p className="text-gray-400 text-xs mt-1.5 max-w-md mx-auto leading-relaxed">{aiError}</p>
                  <button
                    onClick={handleFetchAiRecommendations}
                    className="mt-5 bg-brand-secondary hover:bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Retry Request
                  </button>
                </div>
              ) : aiRecipes.length === 0 ? (
                <div className="glass-panel p-16 rounded-2xl text-center border border-dark-border shadow-2xl">
                  <ChefHat className="w-12 h-12 text-gray-600 mx-auto mb-3.5" />
                  <h4 className="text-white font-bold text-xs uppercase tracking-widest text-gray-400">Zero Expiring Ingredients Found</h4>
                  <p className="text-gray-500 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
                    No kitchen ingredients expire in the next 7 days. Your storage is perfectly optimized!
                  </p>
                </div>
              ) : (
                /* Recipes Display */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {aiRecipes.map((recipe, index) => (
                    <div key={index} className="glass-panel glass-panel-hover p-6 rounded-2xl border border-dark-border flex flex-col justify-between h-full shadow-2xl">
                      <div>
                        {/* Recipe Title */}
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="text-md font-bold text-white tracking-wide leading-snug line-clamp-2">{recipe.name}</h4>
                          <span className="p-1.5 bg-brand-warning/10 border border-brand-warning/20 rounded-lg text-brand-warning">
                            <ChefHat className="w-4 h-4" />
                          </span>
                        </div>

                        {/* Ingredients */}
                        <div className="mb-4">
                          <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest block mb-2">Ingredients Used</span>
                          <div className="flex flex-wrap gap-1.5">
                            {recipe.ingredientsUsed?.map((ing, i) => (
                              <span key={i} className="bg-white/5 border border-white/5 text-gray-300 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                {ing}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Instructions */}
                        <div className="mb-6">
                          <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest block mb-2">Preparation Details</span>
                          <p className="text-xs text-gray-400 leading-relaxed font-sans">{recipe.instructions}</p>
                        </div>
                      </div>

                      {/* Recipe metadata */}
                      <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4 text-center text-xs">
                        <div>
                          <span className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest block">Waste Reduction</span>
                          <span className="text-xs font-bold text-brand-primary mt-1 block">{recipe.wasteReduction}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest block">Usage Priority</span>
                          <span className="text-xs font-bold text-brand-warning mt-1 block">{recipe.usagePriority}</span>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Add / Edit Modal Drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-lg glass-panel p-8 rounded-2xl shadow-2xl relative border border-white/15">
            
            <h3 className="text-lg font-black text-white mb-6 flex items-center uppercase tracking-wider">
              <Package className="w-5 h-5 text-brand-primary mr-2" />
              {modalType === 'add' ? 'Add Ingredient' : 'Edit Ingredient'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Ingredient Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Button Mushroom"
                    autoComplete="off"
                    className="w-full bg-[#05070c] border border-dark-border text-white text-xs rounded-xl focus:outline-none focus:border-brand-primary px-3.5 py-3 shadow-inner font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-[#05070c] border border-dark-border text-white text-xs rounded-xl focus:outline-none focus:border-brand-primary px-3.5 py-3 cursor-pointer shadow-inner font-medium"
                  >
                    <option value="Produce">Produce</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Meat & Seafood">Meat & Seafood</option>
                    <option value="Pantry Staples">Pantry Staples</option>
                    <option value="Bakery">Bakery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full bg-[#05070c] border border-dark-border text-white text-xs rounded-xl focus:outline-none focus:border-brand-primary px-3.5 py-2.5 shadow-inner font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="e.g. 5.5"
                    autoComplete="off"
                    className="w-full bg-[#05070c] border border-dark-border text-white text-xs rounded-xl focus:outline-none focus:border-brand-primary px-3.5 py-3 shadow-inner font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Unit
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="e.g. kg, liters, pcs"
                    autoComplete="off"
                    className="w-full bg-[#05070c] border border-dark-border text-white text-xs rounded-xl focus:outline-none focus:border-brand-primary px-3.5 py-3 shadow-inner font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                    autoComplete="off"
                    className="w-full bg-[#05070c] border border-dark-border text-white text-xs rounded-xl focus:outline-none focus:border-brand-primary px-3.5 py-3 shadow-inner font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    value={formData.supplierName}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplierName: e.target.value }))}
                    placeholder="Fresh Farms Ltd."
                    autoComplete="off"
                    className="w-full bg-[#05070c] border border-dark-border text-white text-xs rounded-xl focus:outline-none focus:border-brand-primary px-3.5 py-3 shadow-inner font-medium"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Supplier Contact (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.supplierContact}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplierContact: e.target.value }))}
                    placeholder="e.g. +1-555-0192"
                    autoComplete="off"
                    className="w-full bg-[#05070c] border border-dark-border text-white text-xs rounded-xl focus:outline-none focus:border-brand-primary px-3.5 py-3 shadow-inner font-medium"
                  />
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-dark-border/40">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-dark-bg border border-dark-border hover:bg-dark-hover px-5 py-2.5 text-xs font-bold rounded-xl text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-primary hover:bg-emerald-600 px-5 py-2.5 text-xs font-bold rounded-xl text-white transition-colors shadow-lg shadow-brand-primary/10 btn-glow-green cursor-pointer border border-brand-primary/10"
                >
                  Save Ingredient
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
