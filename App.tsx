
import React, { useState, lazy, Suspense } from 'react';
import { HashRouter, MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
const Router = import.meta.env.VITE_AURA_PREVIEW ? MemoryRouter : HashRouter;
import Home from './pages/Home';
const Chat = lazy(() => import('./pages/Chat'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Memories = lazy(() => import('./pages/Memories'));
const CycleTracker = lazy(() => import('./pages/CycleTracker'));
const Rewards = lazy(() => import('./pages/Rewards'));
const DatePlanner = lazy(() => import('./pages/DatePlanner'));
import Login from './pages/Login';
import Setup from './pages/Setup';
import LinkPartner from './pages/LinkPartner';
import { Gender } from './types';
import { useAccount } from './contexts/AccountContext';
import { saveProfile, acceptInvite } from './services/accountService';
import Recovery from './pages/Recovery';
import Settings from './pages/Settings';

const App: React.FC = () => {
  const { user, loading, error, reload, signOut, recovering, finishRecovery } = useAccount();
  const [editing, setEditing] = useState(false);
  const handleSetupComplete = async (gender: Gender, nickname: string) => {
    if (!user) return;
    await saveProfile(user.id, gender, nickname);
    setEditing(false);
    reload();
  };
  const handleLinkPartner = async (code: string) => {
    await acceptInvite(code);
    reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFDF0]">
        <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (recovering) return <Recovery onComplete={finishRecovery} />;
  if (error) return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-[#FFFDF0]">
    <p role="alert">We couldn’t load your account. Please try again.</p>
    <button onClick={reload} className="text-pink-600 font-bold">Try Again</button>
    <button onClick={() => void signOut().catch(() => reload())}>Sign Out</button>
  </div>;
  // Auth Flow
  if (!user) {
    return <Login />;
  }

  // Profile Setup Flow
  if (editing || !user.gender || !user.partnerNickname) {
    return <Setup user={user} onComplete={handleSetupComplete} />;
  }

  // Partner Linking Flow
  if (!user.linked) {
    return <LinkPartner user={user} onLink={handleLinkPartner} onBack={() => setEditing(true)} />;
  }

  // Main App
  return (
    <Router>
      <div className="min-h-screen bg-[#FFFDF0] text-gray-900 overflow-x-hidden">
        <Suspense fallback={<p role="status" className="p-8 text-pink-500">Opening your sanctuary…</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/memories" element={<Memories />} />
          <Route path="/cycle" element={<CycleTracker />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/date-planner" element={<DatePlanner />} />
          <Route path="/mood" element={<Navigate to="/" replace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        <Navigation />
      </div>
    </Router>
  );
};

export default App;
