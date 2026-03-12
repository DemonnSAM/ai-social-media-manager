import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  BarChart3,
  Sparkles,
  CalendarDays,
  Users,
  Settings,
  Zap,
  Send,
  Inbox,
  Share2,
  ChevronRight,
  LogOut,
  HelpCircle,
  Palette,
  ArrowUpCircle,
  X
} from 'lucide-react';
import './Sidebar.css';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  section?: string;
}

const mainNavItems: NavItem[] = [
  { icon: <LayoutGrid size={20} />, label: 'Dashboard', path: '/' },
  { icon: <Share2 size={20} />, label: 'Accounts', path: '/accounts' },
  { icon: <Send size={20} />, label: 'Publish', path: '/publish' },
  { icon: <CalendarDays size={20} />, label: 'Calendar', path: '/calendar' },
  { icon: <Inbox size={20} />, label: 'Engagement Inbox', path: '/engagement' },
  { icon: <BarChart3 size={20} />, label: 'Analytics', path: '/analytics' },
  { icon: <Sparkles size={20} />, label: 'AI Studio', path: '/ai-tools' },
];

const adminNavItems: NavItem[] = [
  { icon: <Users size={20} />, label: 'Team Management', path: '/team' },
];

interface SidebarProps {
  onOpenSettings: () => void;
}

export default function Sidebar({ onOpenSettings }: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [betaFeature, setBetaFeature] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const expanded = isHovered || userMenuOpen;

  const isActive = (path: string) => location.pathname === path;

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavClick = (item: NavItem) => {
    if (item.label === 'AI Studio' || item.label === 'Team Management') {
      setBetaFeature(item.label);
    } else if (item.label === 'Settings') {
      onOpenSettings();
    } else {
      navigate(item.path);
    }
  };

  return (
    <>
      <aside 
      ref={sidebarRef}
      className={`sidebar ${expanded ? 'sidebar--expanded' : ''} ${userMenuOpen ? 'sidebar--menu-open' : ''}`} 
      id="sidebar"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo + Title */}
      <div className="sidebar__header" onClick={() => window.location.href = '/'}>
        <div className="sidebar__logo">
          <Zap size={22} />
        </div>
        {expanded && <span className="sidebar__brand">SocialAI</span>}
      </div>

      {/* Main nav */}
      <nav className="sidebar__nav sidebar__nav--top">
        {mainNavItems.map((item) => (
          <button
            key={item.path}
            className={`sidebar__item ${isActive(item.path) ? 'sidebar__item--active' : ''}`}
            onClick={() => handleNavClick(item)}
            title={!expanded ? item.label : undefined}
            id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <span className="sidebar__item-icon">{item.icon}</span>
            {expanded && <span className="sidebar__item-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Admin section */}
      <nav className="sidebar__nav sidebar__nav--bottom">
        {expanded && <span className="sidebar__section-title">ADMIN</span>}
        {adminNavItems.map((item) => (
          <button
            key={item.path}
            className={`sidebar__item ${isActive(item.path) ? 'sidebar__item--active' : ''}`}
            onClick={() => handleNavClick(item)}
            title={!expanded ? item.label : undefined}
            id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <span className="sidebar__item-icon">{item.icon}</span>
            {expanded && <span className="sidebar__item-label">{item.label}</span>}
          </button>
        ))}

        {/* User profile */}
        <div className="sidebar__profile" onClick={() => setUserMenuOpen(!userMenuOpen)}>
          <div className="sidebar__avatar-wrap">
            <span style={{ fontWeight: 700 }}>AR</span>
          </div>
          {expanded && (
            <div className="sidebar__profile-info">
              <span className="sidebar__profile-name">Alex Rivera</span>
              <span className="sidebar__profile-plan">@gamegpriyanshu17</span>
            </div>
          )}
          
          {userMenuOpen && (
            <div className="user-menu" onClick={(e) => e.stopPropagation()}>
              <div className="user-menu__header">
                <div className="sidebar__avatar-wrap" style={{ width: 40, height: 40, fontSize: 14 }}>
                  <span style={{ fontWeight: 700 }}>AR</span>
                </div>
                <div className="sidebar__profile-info">
                  <span className="sidebar__profile-name" style={{ fontSize: 15 }}>Alex Rivera</span>
                  <span className="sidebar__profile-plan">@gamegpriyanshu17</span>
                </div>
              </div>
              
              <div className="user-menu__divider"></div>
              
              <div className="user-menu__items">
                <div className="user-menu__item">
                  <ArrowUpCircle size={18} />
                  <span>Upgrade plan</span>
                </div>
                <div className="user-menu__item">
                  <Palette size={18} />
                  <span>Personalization</span>
                </div>
                <div className="user-menu__item" onClick={() => {
                  onOpenSettings();
                  setUserMenuOpen(false);
                  setIsHovered(false);
                }}>
                  <Settings size={18} />
                  <span>Settings</span>
                </div>
              </div>
              
              <div className="user-menu__divider"></div>
              
              <div className="user-menu__items">
                <div className="user-menu__item user-menu__item--between">
                  <div className="flex-center" style={{ gap: 12 }}>
                    <HelpCircle size={18} />
                    <span>Help</span>
                  </div>
                  <ChevronRight size={14} />
                </div>
                <div className="user-menu__item">
                  <LogOut size={18} />
                  <span>Log out</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      </aside>
 
      {/* Beta Modal */}
      {betaFeature && (
        <div className="beta-modal-overlay" onClick={() => {
          setBetaFeature(null);
          setIsHovered(false);
        }}>
          <div className="beta-modal" onClick={(e) => e.stopPropagation()}>
            <div className="beta-modal__close" onClick={() => {
              setBetaFeature(null);
              setIsHovered(false);
            }}>
              <X size={20} />
            </div>
            <div className="beta-modal__icon">
              <Sparkles size={40} color="#06b6d4" />
            </div>
            <h2 className="beta-modal__title">{betaFeature} is in Beta</h2>
            <p className="beta-modal__text">
              We're currently perfecting {betaFeature} for our premium users. This feature is not available in the current version but will be released soon!
            </p>
            <button className="beta-modal__btn" onClick={() => {
              setBetaFeature(null);
              setIsHovered(false);
            }}>
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
