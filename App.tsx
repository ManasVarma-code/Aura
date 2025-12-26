
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Chat from './pages/Chat';
import Calendar from './pages/Calendar';
import Memories from './pages/Memories';
import CycleTracker from './pages/CycleTracker';
import Rewards from './pages/Rewards';
import DatePlanner from './pages/DatePlanner';
import Login from './pages/Login';
import Setup from './pages/Setup';
import LinkPartner from './pages/LinkPartner';
import { User, Gender } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock initial state check
  useEffect(() => {
    const savedUser = localStorage.getItem('aura_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (email: string) => {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name: email.split('@')[0],
      partnerNickname: '',
      gender: null,
      linked: false,
      coupleCode: Math.random().toString(36).substr(2, 6).toUpperCase(),
    };
    setUser(newUser);
    localStorage.setItem('aura_user', JSON.stringify(newUser));
  };

  const handleSetupComplete = (gender: Gender, partnerNickname: string) => {
    if (!user) return;
    const updatedUser = { ...user, gender, partnerNickname };
    setUser(updatedUser);
    localStorage.setItem('aura_user', JSON.stringify(updatedUser));
  };

  const handleLinkPartner = (partnerCode: string) => {
    if (!user) return;
    const updatedUser = { ...user, linked: true, partnerCode };
    setUser(updatedUser);
    localStorage.setItem('aura_user', JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('aura_user');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFDF0]">
        <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Auth Flow
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Profile Setup Flow
  if (!user.gender || !user.partnerNickname) {
    return <Setup user={user} onComplete={handleSetupComplete} />;
  }

  // Partner Linking Flow
  if (!user.linked) {
    return <LinkPartner user={user} onLink={handleLinkPartner} onBack={() => setUser({ ...user, gender: null })} />;
  }

  // Main App
  return (
    <Router>
      <div className="min-h-screen bg-[#FFFDF0] text-gray-900 overflow-x-hidden">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/memories" element={<Memories />} />
          <Route path="/cycle" element={<CycleTracker />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/date-planner" element={<DatePlanner />} />
          <Route path="/mood" element={<Navigate to="/" />} />
          <Route path="/settings" element={<Navigate to="/" />} />
        </Routes>
        <Navigation />
      </div>
    </Router>
  );
};

export default App;
