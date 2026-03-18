import { useLocation } from 'react-router-dom';
import { Search, Plus, Bell, ChevronDown, Zap, Camera, X, Briefcase, Upload } from 'lucide-react';
import './Topbar.css';

interface TopbarProps {
  actions?: React.ReactNode;
}

export default function Topbar({ actions }: TopbarProps) {
  const location = useLocation();
  const path = location.pathname;

  const displayName = 'Workspace';
  const initials = 'WS';

  // 1. Dashboard Topbar
  if (path === '/') {
    return (
      <header className="topbar topbar--dashboard" id="topbar">
        <h1 className="topbar__title">Platform Overview</h1>
        
        <div className="topbar__center">
          <div className="topbar__search" id="search-bar">
            <Search size={16} className="topbar__search-icon" />
            <input
              type="text"
              placeholder="Search insights..."
              className="topbar__search-input"
            />
          </div>
        </div>

        <div className="topbar__actions">
          {actions ? actions : (
            <>
              <button className="topbar__cta" id="create-post-btn">
                <Plus size={16} />
                <span>Create Post</span>
              </button>
              <button className="topbar__icon-btn" id="notifications-btn" title="Notifications">
                <Bell size={20} />
              </button>
            </>
          )}
        </div>
      </header>
    );
  }

  // 2. Analytics Topbar
  if (path === '/analytics') {
    return (
      <header className="topbar topbar--analytics" id="topbar">
        <div className="topbar__left-actions">
           <div className="topbar__org-selector topbar__org-selector--ghost">
              <div className="org-icon org-icon--gray">
                <span>A</span>
              </div>
              <span className="org-name">Acme Global</span>
              <ChevronDown size={14} className="org-chevron" />
           </div>
           
           <div className="topbar__divider"></div>
           
           <div className="topbar__icon-group">
             <button className="topbar__circle-btn"><Camera size={14} /></button>
             <button className="topbar__circle-btn"><X size={14} /></button>
             <button className="topbar__circle-btn"><Briefcase size={14} /></button>
             <button className="topbar__circle-btn topbar__circle-btn--plus"><Plus size={14} /></button>
           </div>
        </div>

        <div className="topbar__actions">
          {actions ? actions : (
            <>
              <button className="topbar__icon-btn" id="notifications-btn" title="Notifications">
                <Bell size={20} />
              </button>
              <button className="topbar__export-btn" id="export-btn">
                <Upload size={14} />
                <span>Export Report</span>
              </button>
            </>
          )}
        </div>
      </header>
    );
  }

  // 3. Publish Topbar
  if (path === '/publish') {
    return (
      <header className="topbar topbar--publish" id="topbar">
        <div className="topbar__publish-header">
          <h1 className="topbar__title">Compose Post</h1>
          <p className="topbar__subtitle">Create and schedule content across all your channels</p>
        </div>

        <div className="topbar__actions">
          {actions}
        </div>
      </header>
    );
  }

  // 4. Calendar Topbar
  if (path === '/calendar') {
    return (
      <header className="topbar topbar--calendar" id="topbar">
        <div className="topbar__left-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="topbar__org-selector topbar__org-selector--ghost">
            <div className="org-icon">
              <span>AC</span>
            </div>
            <span className="org-name" style={{ color: '#f8fafc', fontWeight: 'bold' }}>Acme Corp</span>
            <ChevronDown size={14} className="org-chevron" color="#64748b" />
          </div>
          
          <div className="topbar__divider" style={{ width: '1px', height: '24px', background: '#334155' }}></div>
          
          <div className="topbar__icon-group" style={{ display: 'flex', gap: '8px' }}>
             <div className="tab-circle" style={{ background: '#1877f2', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>f</div>
             <div className="tab-circle" style={{ background: '#1da1f2', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}><span style={{ transform: 'scale(1.2)' }}>y</span></div> 
             <div className="tab-circle" style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></div>
          </div>
        </div>

        <div className="topbar__center">
          <div className="topbar__search" id="search-bar">
            <Search size={16} className="topbar__search-icon" />
            <input
              type="text"
              placeholder="Search posts..."
              className="topbar__search-input"
            />
          </div>
        </div>

        <div className="topbar__actions" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <button className="topbar__icon-btn" id="notifications-btn" title="Notifications" style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <Bell size={20} />
          </button>
          
          <div className="topbar__profile" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="topbar__profile-info" style={{ textAlign: 'right' }}>
              <span className="sidebar__profile-name" style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#f8fafc' }}>{displayName}</span>
              <span className="sidebar__profile-plan" style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>Admin</span>
            </div>
            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=fdf4e3&color=000`} alt="Profile" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
          </div>
        </div>
      </header>
    );
  }

  // 5. Accounts Topbar (Default)
  return (
    <header className="topbar topbar--accounts" id="topbar">
      <div className="topbar__org-selector">
        <div className="org-icon">
          <span>AC</span>
        </div>
        <span className="org-name">Acme Corp</span>
        <ChevronDown size={14} className="org-chevron" />
      </div>

      <div className="topbar__center">
        <div className="topbar__tabs">
            <div className="tab-circle tab-circle--fb">F</div>
            <div className="tab-circle tab-circle--ig">I</div>
            <div className="tab-circle tab-circle--x">X</div>
            <div className="tab-circle tab-circle--more">+2</div>
        </div>
      </div>

      <div className="topbar__actions">
        {actions ? actions : (
          <>
            <button className="topbar__icon-btn" id="notifications-btn" title="Notifications">
              <Bell size={18} />
            </button>
            <button className="topbar__insight-btn" id="ai-insights-btn">
              <Zap size={14} />
              <span>AI Insights</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
