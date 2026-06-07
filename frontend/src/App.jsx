import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InventoryProvider } from './context/InventoryContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

// Inner App component to consume Auth context
const AppContent = () => {
  const { user, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login' | 'register'

  // Loading spinner during session recovery checking
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center space-y-4">
        <div className="inline-block animate-spin border-4 border-brand-primary border-t-transparent rounded-full w-10 h-10"></div>
        <p className="text-gray-400 text-sm font-semibold animate-pulse">Initializing EcoMeal Operating System...</p>
      </div>
    );
  }

  // Render protected Dashboard if logged in
  if (user) {
    return <Dashboard />;
  }

  // Render Login or Signup forms otherwise
  if (currentScreen === 'register') {
    return <Register onNavigateToLogin={() => setCurrentScreen('login')} />;
  }

  return <Login onNavigateToRegister={() => setCurrentScreen('register')} />;
};

function App() {
  return (
    <AuthProvider>
      <InventoryProvider>
        <AppContent />
      </InventoryProvider>
    </AuthProvider>
  );
}

export default App;
