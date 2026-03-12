import { useState } from 'react';
import {
  Plus,
  Zap,
  CheckCircle2,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Facebook,
  AtSign,
  Video,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react';
import './Accounts.css';

// Platform data as per image
const platformsData = [
  { id: 'ig', name: 'Instagram', accounts: 2, icon: <Instagram size={24} />, color: 'var(--platform-ig, #e1306c)', bg: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' },
  { id: 'li', name: 'LinkedIn', accounts: 1, icon: <Linkedin size={24} />, color: 'var(--platform-li, #0077b5)', bg: '#0077b5' },
  { id: 'x', name: 'X / Twitter', accounts: 3, icon: <Twitter size={24} />, color: 'var(--platform-x, #000000)', bg: '#0f1724' }, // X is dark in the image
  { id: 'yt', name: 'YouTube', accounts: 1, icon: <Youtube size={24} />, color: 'var(--platform-yt, #ff0000)', bg: '#ff0000' },
  { id: 'fb', name: 'Facebook', accounts: 1, icon: <Facebook size={24} />, color: 'var(--platform-fb, #1877f2)', bg: '#1877f2' },
  { id: 'tt', name: 'Threads', accounts: 0, icon: <AtSign size={24} />, color: 'var(--platform-th, #000000)', bg: '#0f1724' },
  { id: 'tk', name: 'TikTok', accounts: 2, icon: <Video size={24} />, color: 'var(--platform-tk, #000000)', bg: '#000000', border: '2px solid #00f2fe' },
];

const connectedProfiles = [
  {
    id: 1,
    handle: '@acme_global',
    name: '',
    status: 'ACTIVE',
    followers: '12.4k followers',
    platform: 'Instagram',
    aiScheduling: true,
    avatar: 'https://ui-avatars.com/api/?name=AG&background=random',
  },
  {
    id: 2,
    handle: 'Acme Corp Solutions',
    name: '',
    status: 'ACTIVE',
    followers: '3.2k followers',
    platform: 'LinkedIn',
    aiScheduling: false,
    avatar: 'https://ui-avatars.com/api/?name=AC&background=random',
  }
];

export default function Accounts() {
  const [profiles, setProfiles] = useState(connectedProfiles);

  const toggleScheduling = (id: number) => {
    setProfiles(profiles.map(p => p.id === id ? { ...p, aiScheduling: !p.aiScheduling } : p));
  };

  return (
    <div className="accounts-page" id="accounts-page">
      <div className="accounts__header">
        <div>
          <h1 className="accounts__title">Connected Social Accounts</h1>
          <p className="accounts__subtitle">Manage and switch between your social media profiles with AI-driven orchestration.</p>
        </div>
        <button className="accounts__cta">
          <Plus size={16} />
          <span>Add Account</span>
        </button>
      </div>

      <div className="accounts__grid">
        <div className="accounts__main">
          {/* Stats Row */}
          <div className="accounts__stats-row">
            <div className="accounts__stat-card">
              <span className="stat-card__label">TOTAL ACCOUNTS</span>
              <div className="stat-card__bottom">
                <span className="stat-card__value">12</span>
                <div className="stat-card__icon stat-card__icon--blue"><Zap size={16} /></div>
              </div>
            </div>
            <div className="accounts__stat-card">
              <span className="stat-card__label">PLATFORMS</span>
              <div className="stat-card__bottom">
                <span className="stat-card__value">07</span>
                <div className="stat-card__icon stat-card__icon--purple"><Zap size={16} /></div>
              </div>
            </div>
            <div className="accounts__stat-card">
              <span className="stat-card__label">ACTIVE PROFILES</span>
              <div className="stat-card__bottom">
                <span className="stat-card__value">10</span>
                <div className="stat-card__icon stat-card__icon--green"><CheckCircle2 size={16} /></div>
              </div>
            </div>
          </div>

          {/* Platform Connections */}
          <div className="accounts__section" id="platform-connections">
            <h2 className="section__title">
              <Zap size={18} className="section__title-icon" color="#06b6d4" />
              Platform Connections
            </h2>
            <div className="platforms__grid">
              {platformsData.map((plat) => (
                <div className="platform-card" key={plat.id}>
                  <div className="platform-card__icon-wrap" style={{ background: plat.bg, border: plat.border || 'none' }}>
                    {plat.icon}
                  </div>
                  <h3 className="platform-card__name">{plat.name}</h3>
                  <p className="platform-card__count">{plat.accounts} {plat.accounts === 1 ? 'Account' : 'Accounts'}</p>
                  <button className={`platform-card__btn ${plat.accounts === 0 ? 'platform-card__btn--highlight' : ''}`}>
                    Connect
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Connected Profiles */}
          <div className="accounts__section" id="connected-profiles">
            <h2 className="section__title">
              <MoreHorizontal size={18} className="section__title-icon" />
              Connected Profiles
            </h2>
            <div className="profiles__list">
              {profiles.map((profile) => (
                <div className="profile-row" key={profile.id}>
                  <img src={profile.avatar} alt={profile.handle} className="profile-row__avatar" />
                  <div className="profile-row__info">
                    <div className="profile-row__name-line">
                      <span className="profile-row__handle">{profile.handle}</span>
                      <span className="profile-row__badge">{profile.status}</span>
                    </div>
                    <div className="profile-row__meta">
                      <span className="profile-row__followers"><Zap size={12} /> {profile.followers}</span>
                      <span className="profile-row__platform"><Instagram size={12} /> {profile.platform}</span>
                    </div>
                  </div>
                  <div className="profile-row__actions">
                    <span className="profile-row__toggle-label">AI SCHEDULING</span>
                    <div
                      className={`toggle-switch ${profile.aiScheduling ? 'toggle-switch--on' : ''}`}
                      onClick={() => toggleScheduling(profile.id)}
                    >
                      <div className="toggle-switch__thumb" />
                    </div>
                    <button className="profile-row__more"><MoreHorizontal size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar - AI Insights */}
        <div className="accounts__sidebar">
          <div className="insights-panel">
            <div className="insights-panel__header">
              <Zap size={18} className="insights-panel__icon" />
              <h3>AI Insights</h3>
            </div>

            <div className="insight-card">
              <span className="insight-card__badge insight-card__badge--cyan">
                <span className="dot dot--cyan"></span> EFFICIENCY TIP
              </span>
              <p className="insight-card__text">
                Instagram account <strong>@acme_global</strong> has shown <strong className="text-cyan">24% higher</strong> engagement on video content this month.
              </p>
              <div className="insight-card__actions">
                <button className="btn-cyan">Apply Strategy</button>
                <button className="btn-ghost">Dismiss</button>
              </div>
            </div>

            <div className="insight-card">
              <span className="insight-card__badge insight-card__badge--purple">
                <span className="dot dot--purple"></span> NETWORK ALERT
              </span>
              <p className="insight-card__text">
                LinkedIn API tokens expire in <strong>3 days</strong>. Re-authenticate to maintain AI scheduling continuity.
              </p>
              <div className="insight-card__actions">
                <button className="btn-outline">Refresh Token</button>
              </div>
            </div>

            <div className="insight-card insight-card--progress">
              <p className="insight-card__label">Audience Growth Potential</p>
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: '82%' }}></div>
              </div>
              <div className="progress-bar__footer">
                <span className="progress-bar__status text-cyan">HIGH GROWTH DETECTED</span>
                <span className="progress-bar__percent">82%</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
