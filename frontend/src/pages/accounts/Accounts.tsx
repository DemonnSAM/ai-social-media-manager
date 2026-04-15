import { useState, useEffect } from 'react';
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
  Unlink,
  Users
} from 'lucide-react';
import './Accounts.css';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import API_URL from '../../config/api';

// Platform data as per image
const basePlatformsData = [
  { id: 'ig', name: 'Instagram', accounts: 0, icon: <Instagram size={24} />, color: 'var(--platform-ig, #e1306c)', bg: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' },
  { id: 'li', name: 'LinkedIn', accounts: 0, icon: <Linkedin size={24} />, color: 'var(--platform-li, #0077b5)', bg: '#0077b5' },
  { id: 'x', name: 'X / Twitter', accounts: 0, icon: <Twitter size={24} />, color: 'var(--platform-x, #000000)', bg: '#0f1724' }, // X is dark in the image
  { id: 'yt', name: 'YouTube', accounts: 0, icon: <Youtube size={24} />, color: 'var(--platform-yt, #ff0000)', bg: '#ff0000' },
  { id: 'fb', name: 'Facebook', accounts: 0, icon: <Facebook size={24} />, color: 'var(--platform-fb, #1877f2)', bg: '#1877f2' },
  { id: 'tt', name: 'Threads', accounts: 0, icon: <AtSign size={24} />, color: 'var(--platform-th, #000000)', bg: '#0f1724' },
  { id: 'tk', name: 'TikTok', accounts: 0, icon: <Video size={24} />, color: 'var(--platform-tk, #000000)', bg: '#000000', border: '2px solid #00f2fe' },
];

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  profile_picture: string;
  followers: number;
}

export default function Accounts() {
  const [profiles, setProfiles] = useState<SocialAccount[]>([]);
  const { user } = useAuth();
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [platformsData, setPlatformsData] = useState(basePlatformsData);
  const [stats, setStats] = useState({ totalAccounts: 0, totalPlatforms: 0, activeProfiles: 0 });

  useEffect(() => {
    if (!user) return;

    const loadAccounts = async () => {
      setLoading(true);

      // Fetch accounts and their insights
      const { data, error } = await supabase
        .from('social_accounts')
        .select(`
          id, 
          platform, 
          username, 
          profile_picture,
          account_insights ( followers )
        `)
        .eq('user_id', user.id);

      if (!error && data) {
        const formatted = data.map((acc: any) => ({
          id: acc.id,
          platform: acc.platform,
          username: acc.username || 'Unknown',
          profile_picture: acc.profile_picture || `https://ui-avatars.com/api/?name=${acc.username}&background=random`,
          followers: acc.account_insights?.[0]?.followers || 0
        }));

        setProfiles(formatted);

        const totalAccounts = formatted.length;
        const platformsWithAccounts = new Set(formatted.map(acc => acc.platform));
        const totalPlatforms = platformsWithAccounts.size;
        const activeProfiles = formatted.length;

        setStats({ totalAccounts, totalPlatforms, activeProfiles });

        const updatedPlatformsData = basePlatformsData.map(plat => {
          const mapPlatform: Record<string, string> = { ig: 'instagram', fb: 'facebook', li: 'linkedin', x: 'x', yt: 'youtube', tt: 'threads', tk: 'tiktok' };
          const dbPlatform = mapPlatform[plat.id] || plat.id;
          const accountCount = formatted.filter(acc => acc.platform === dbPlatform).length;
          return { ...plat, accounts: accountCount };
        });
        setPlatformsData(updatedPlatformsData);
      }
      setLoading(false);
    };

    loadAccounts();
  }, [user]);

  // Check if a platform is already connected
  const isConnected = (platformId: string) => {
    // our db stores them as 'instagram', 'facebook' etc.
    // the platformData uses 'ig', 'fb' etc.
    const map: Record<string, string> = { 'ig': 'instagram', 'fb': 'facebook' };
    const dbName = map[platformId];
    return profiles.some(p => p.platform === dbName);
  };

  const toggleScheduling = (_id: string) => {
    // placeholder for now 
  };

  const handleDisconnect = async (accountId: string) => {
    if (!user) return;
    const confirmed = window.confirm('Are you sure you want to disconnect this account?');
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/social/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to disconnect account.');
        return;
      }

      // Re-fetch accounts to refresh UI
      const { data, error } = await supabase
        .from('social_accounts')
        .select('id, platform, username, profile_picture, account_insights ( followers )')
        .eq('user_id', user.id);

      if (!error && data) {
        const formatted = data.map((acc: any) => ({
          id: acc.id,
          platform: acc.platform,
          username: acc.username || 'Unknown',
          profile_picture: acc.profile_picture || `https://ui-avatars.com/api/?name=${acc.username}&background=random`,
          followers: acc.account_insights?.[0]?.followers || 0
        }));
        setProfiles(formatted);

        const totalAccounts = formatted.length;
        const platformsWithAccounts = new Set(formatted.map((acc: any) => acc.platform));
        setStats({ totalAccounts, totalPlatforms: platformsWithAccounts.size, activeProfiles: totalAccounts });

        const updatedPlatformsData = basePlatformsData.map(plat => {
          const mapPlatform: Record<string, string> = { ig: 'instagram', fb: 'facebook', li: 'linkedin', x: 'x', yt: 'youtube', tt: 'threads', tk: 'tiktok' };
          const dbPlatform = mapPlatform[plat.id] || plat.id;
          const accountCount = formatted.filter((acc: any) => acc.platform === dbPlatform).length;
          return { ...plat, accounts: accountCount };
        });
        setPlatformsData(updatedPlatformsData);
      }
    } catch (err) {
      console.error('Disconnect error:', err);
      alert('Something went wrong while disconnecting.');
    }
  };

  const handleConnect = (platformId: string) => {
    if (!user) {
      alert("You must be logged in to connect accounts.");
      return;
    }

    if (platformId === 'ig') {
      setConnectingPlatform('ig');
      window.location.href = `${API_URL}/api/auth/meta?user_id=${user.id}&platform=instagram`;
    } else if (platformId === 'fb') {
      setConnectingPlatform('fb');
      window.location.href = `${API_URL}/api/auth/meta?user_id=${user.id}&platform=facebook`;
    } else {
      alert(`${platformId.toUpperCase()} integration coming soon!`);
    }
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

      <div className="accounts__main">
        {/* Stats Row */}
        <div className="accounts__stats-row">
          <div className="accounts__stat-card">
            <span className="stat-card__label">TOTAL ACCOUNTS</span>
            <div className="stat-card__bottom">
              <span className="stat-card__value">{stats.totalAccounts}</span>
              <div className="stat-card__icon stat-card__icon--blue"><Zap size={16} /></div>
            </div>
          </div>
          <div className="accounts__stat-card">
            <span className="stat-card__label">PLATFORMS</span>
            <div className="stat-card__bottom">
              <span className="stat-card__value">{stats.totalPlatforms.toString().padStart(2, '0')}</span>
              <div className="stat-card__icon stat-card__icon--purple"><Zap size={16} /></div>
            </div>
          </div>
          <div className="accounts__stat-card">
            <span className="stat-card__label">ACTIVE PROFILES</span>
            <div className="stat-card__bottom">
              <span className="stat-card__value">{stats.activeProfiles}</span>
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
            {platformsData.map((plat) => {
              const connected = isConnected(plat.id);
              return (
                <div className={`platform-card ${connected ? 'platform-card--connected' : ''}`} key={plat.id}>
                  <div className="platform-card__icon-wrap" style={{ background: plat.bg, border: plat.border || 'none' }}>
                    {plat.icon}
                  </div>
                  <h3 className="platform-card__name">{plat.name}</h3>
                  <p className="platform-card__count">{plat.accounts} {plat.accounts === 1 ? 'Account' : 'Accounts'}</p>

                  {connected ? (
                    <div className="platform-card__connected-wrap">
                      <div className="platform-card__connected-badge">
                        <CheckCircle2 size={14} /> Connected
                      </div>
                      <button
                        className="platform-card__disconnect-btn"
                        onClick={() => {
                          const accs = profiles.filter(p => {
                            const map: Record<string, string> = { ig: 'instagram', fb: 'facebook', li: 'linkedin', x: 'x', yt: 'youtube', tt: 'threads', tk: 'tiktok' };
                            return p.platform === (map[plat.id] || plat.id);
                          });
                          accs.forEach(a => handleDisconnect(a.id));
                        }}
                      >
                        <Unlink size={12} /> Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      className="platform-card__btn"
                      onClick={() => handleConnect(plat.id)}
                      disabled={connectingPlatform === plat.id}
                    >
                      {connectingPlatform === plat.id ? '     ' : 'Connect'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Connected Profiles */}
        <div className="accounts__section" id="connected-profiles">
          <h2 className="section__title">
            <Users size={18} className="section__title-icon" />
            Connected Profiles
          </h2>
          <div className="profiles__list">
            {loading ? (
              <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center' }}>Loading accounts...</div>
            ) : profiles.length === 0 ? (
              <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                No accounts connected yet. Connect one above.
              </div>
            ) : (
              profiles.map((profile) => (
                <div className="profile-row" key={profile.id}>
                  <img src={profile.profile_picture} alt={profile.username} className="profile-row__avatar" />
                  <div className="profile-row__info">
                    <div className="profile-row__name-line">
                      <span className="profile-row__handle">@{profile.username}</span>
                      <span className="profile-row__badge">ACTIVE</span>
                    </div>
                    <div className="profile-row__meta">
                      <span className="profile-row__followers"><Zap size={12} /> {profile.followers.toLocaleString()} followers</span>
                      <span className="profile-row__platform" style={{ textTransform: 'capitalize' }}><Instagram size={12} /> {profile.platform}</span>
                    </div>
                  </div>
                  <div className="profile-row__actions">
                    <span className="profile-row__toggle-label">AI SCHEDULING</span>
                    <div
                      className="toggle-switch toggle-switch--on"
                      onClick={() => toggleScheduling(profile.id)}
                    >
                      <div className="toggle-switch__thumb" />
                    </div>
                    <button
                      className="profile-row__disconnect-btn"
                      onClick={() => handleDisconnect(profile.id)}
                      title="Disconnect account"
                    >
                      <Unlink size={14} />
                      Disconnect
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
