import { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SettingsModal from './SettingsModal';
import SocialOnboardingModal from './SocialOnboardingModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import './Layout.css';

interface TopbarContextType {
  setActions: (actions: React.ReactNode) => void;
}

export const TopbarContext = createContext<TopbarContextType>({ setActions: () => {} });

export function useTopbar() {
  return useContext(TopbarContext);
}

export default function Layout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [topbarActions, setTopbarActions] = useState<React.ReactNode>(null);
  const { session } = useAuth();

  useEffect(() => {
    const checkAccounts = async () => {
      if (!session?.user?.id) return;
      
      const hasSeenOnboarding = sessionStorage.getItem('hasSeenSocialOnboarding');
      const isConnected = new URLSearchParams(window.location.search).get('connected');
      
      if (!hasSeenOnboarding && !isConnected) {
        try {
          const { count, error } = await supabase
            .from('social_accounts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id);
            
          if (!error && count === 0) {
            setIsOnboardingOpen(true);
          }
        } catch (err) {
          console.error('Error checking accounts:', err);
        }
      }
    };

    const timer = setTimeout(() => {
      checkAccounts();
    }, 800);
    
    return () => clearTimeout(timer);
  }, [session]);

  const handleCloseOnboarding = () => {
    setIsOnboardingOpen(false);
    sessionStorage.setItem('hasSeenSocialOnboarding', 'true');
  };

  const contextValue = useMemo(() => ({ setActions: setTopbarActions }), [setTopbarActions]);

  return (
    <TopbarContext.Provider value={contextValue}>
      <div className="layout">
        <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />
        
        <div className="layout__main">
          <Topbar actions={topbarActions} />
          <main className="layout__content">
            <Outlet />
          </main>
        </div>

        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />

        <SocialOnboardingModal 
          isOpen={isOnboardingOpen}
          onClose={handleCloseOnboarding}
        />
      </div>
    </TopbarContext.Provider>
  );
}
