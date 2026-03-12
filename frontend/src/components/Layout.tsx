import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SettingsModal from './SettingsModal';
import './Layout.css';

export default function Layout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="layout" id="app-layout">
      <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />
      <div className="layout__main">
        <Topbar />
        <div className="layout__content">
          <Outlet />
        </div>
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
