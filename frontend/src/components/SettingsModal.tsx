import { useState } from 'react';
import { 
  User, 
  Shield, 
  Bell, 
  Share2, 
  Layers, 
  BarChart3, 
  Crosshair, 
  Sparkles, 
  Users, 
  Cpu, 
  CreditCard, 
  Lock, 
  X,
  Monitor,
  Smartphone,
  Globe,
  LogOut,
  Edit2
} from 'lucide-react';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState('profile');
  
  // State for form fields
  const [fullName, setFullName] = useState('Alex Rivera');
  const [email, setEmail] = useState('alex.rivera@socialai.io');
  const [bio, setBio] = useState('Digital strategist and coffee enthusiast. Managing social growth for tech startups.');
  const [tfaEnabled, setTfaEnabled] = useState(true);
  const [threatDetection, setThreatDetection] = useState(true);

  if (!isOpen) return null;

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="settings-section">
            <div className="settings-section-header">
              <h1 className="settings-section-title">Profile Settings</h1>
              <p className="settings-section-subtitle">Update your photo and personal details here.</p>
            </div>
            
            <div className="profile-card">
              <div className="avatar-upload">
                <div className="avatar-preview-container">
                  <div className="avatar-preview-big">AR</div>
                  <div className="avatar-edit-btn">
                    <Edit2 size={14} />
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Profile Picture</h4>
                  <p style={{ fontSize: 13, color: '#64748b' }}>PNG, JPG or GIF. Max 5MB.</p>
                </div>
              </div>

              <div className="settings-form-grid">
                <div className="settings-input-group">
                  <label className="settings-label">Full Name</label>
                  <input 
                    type="text" 
                    className="settings-input" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="settings-input-group">
                  <label className="settings-label">Email Address</label>
                  <input 
                    type="email" 
                    className="settings-input" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="settings-input-group">
                <label className="settings-label">Bio</label>
                <textarea 
                  className="settings-input settings-textarea" 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="topbar__cta" style={{ borderRadius: 12 }}>Save Profile</button>
              </div>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="settings-section">
            <div className="settings-section-header">
              <h1 className="settings-section-title">Security</h1>
              <p className="settings-section-subtitle">Manage your password and account security preferences.</p>
            </div>

            <div className="security-grid">
              <div className="security-card">
                <div className="flex-between" style={{ marginBottom: 16 }}>
                  <h3 className="security-card-title">Password</h3>
                  <button style={{ color: '#2563eb', fontSize: 13, fontWeight: 600 }}>Change Password</button>
                </div>
                <p style={{ fontSize: 13, color: '#64748b' }}>Last changed 3 months ago</p>
                
                <div className="security-option" style={{ marginTop: 24 }}>
                  <div className="security-option__info">
                    <Shield size={20} color="#06b6d4" />
                    <div>
                      <div className="security-option__label">Two-Factor Auth</div>
                      <div className="security-option__desc">Add an extra layer of security</div>
                    </div>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={tfaEnabled} onChange={() => setTfaEnabled(!tfaEnabled)} />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="security-option">
                  <div className="security-option__info">
                    <Sparkles size={20} color="#06b6d4" />
                    <div>
                      <div className="security-option__label">AI Threat Detection</div>
                      <div className="security-option__desc">Smart monitoring for login anomalies</div>
                    </div>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={threatDetection} onChange={() => setThreatDetection(!threatDetection)} />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="security-card">
                <h3 className="security-card-title">Active Sessions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="flex-between" style={{ padding: '8px 0' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <Monitor size={18} color="#64748b" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Chrome on MacOS</div>
                        <div style={{ fontSize: 11, color: '#10b981' }}>Current Session</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>San Francisco, USA</span>
                  </div>
                  
                  <div className="flex-between" style={{ padding: '8px 0' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <Smartphone size={18} color="#64748b" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>SocialAI App on iPhone 15</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Active 2 hours ago</div>
                      </div>
                    </div>
                    <LogOut size={16} color="#64748b" style={{ cursor: 'pointer' }} />
                  </div>

                  <div className="flex-between" style={{ padding: '8px 0' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <Globe size={18} color="#64748b" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Safari on iPad</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Active 3 days ago</div>
                      </div>
                    </div>
                    <LogOut size={16} color="#64748b" style={{ cursor: 'pointer' }} />
                  </div>
                </div>
                
                <button style={{ width: '100%', marginTop: 24, color: '#ef4444', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  Sign out of all other sessions
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="settings-section">
            <h1 className="settings-section-title">{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</h1>
            <p className="settings-section-subtitle">This section is currently under development.</p>
          </div>
        );
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal__close" onClick={onClose}>
          <X size={24} />
        </div>
        
        <aside className="settings-sidebar">
          <div className="settings-sidebar__section">
            <h3 className="settings-sidebar__title">Personal Settings</h3>
            <div 
              className={`settings-nav-item ${activeSection === 'profile' ? 'settings-nav-item--active' : ''}`}
              onClick={() => setActiveSection('profile')}
            >
              <User size={18} />
              <span>Profile</span>
            </div>
            <div 
              className={`settings-nav-item ${activeSection === 'security' ? 'settings-nav-item--active' : ''}`}
              onClick={() => setActiveSection('security')}
            >
              <Shield size={18} />
              <span>Security</span>
            </div>
            <div 
              className={`settings-nav-item ${activeSection === 'notifications' ? 'settings-nav-item--active' : ''}`}
              onClick={() => setActiveSection('notifications')}
            >
              <Bell size={18} />
              <span>Notifications</span>
            </div>
          </div>

          <div className="settings-sidebar__section">
            <h3 className="settings-sidebar__title">Integrations</h3>
            <div className="settings-nav-item" onClick={() => setActiveSection('social')}>
              <Share2 size={18} />
              <span>Social Accounts</span>
            </div>
            <div className="settings-nav-item" onClick={() => setActiveSection('apps')}>
              <Layers size={18} />
              <span>Connected Apps</span>
            </div>
          </div>

          <div className="settings-sidebar__section">
            <h3 className="settings-sidebar__title">Advanced</h3>
            <div className="settings-nav-item" onClick={() => setActiveSection('analytics')}>
              <BarChart3 size={18} />
              <span>Analytics</span>
            </div>
            <div className="settings-nav-item" onClick={() => setActiveSection('competitor')}>
              <Crosshair size={18} />
              <span>Competitor Tracking</span>
            </div>
            <div className="settings-nav-item" onClick={() => setActiveSection('insights')}>
              <Sparkles size={18} />
              <span>AI Insights</span>
            </div>
            <div className="settings-nav-item" onClick={() => setActiveSection('team')}>
              <Users size={18} />
              <span>Workspace/Team</span>
            </div>
            <div className="settings-nav-item" onClick={() => setActiveSection('api')}>
              <Cpu size={18} />
              <span>API</span>
            </div>
          </div>

          <div className="settings-sidebar__section">
            <h3 className="settings-sidebar__title">Organization</h3>
            <div className="settings-nav-item" onClick={() => setActiveSection('billing')}>
              <CreditCard size={18} />
              <span>Billing</span>
            </div>
            <div className="settings-nav-item" onClick={() => setActiveSection('privacy')}>
              <Lock size={18} />
              <span>Data/Privacy</span>
            </div>
          </div>
        </aside>

        <main className="settings-content">
          <div className="settings-content__inner">
            {renderSection()}
          </div>
          <footer className="settings-footer">
            <button className="btn-save-settings" onClick={onClose}>Save Changes</button>
          </footer>
        </main>
      </div>
    </div>
  );
}
