import { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  // TrendingUp,
  // TrendingDown,
  // Instagram,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import API_URL from '../../config/api';
import './Analytics.css';

/* ── Formatter ── */
const formatNumber = (num: number | null | undefined): string => {
  if (num == null) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
};

/* ── Types ── */
interface Insights {
  followers: number;
  impressions: number;
  reach: number;
  profile_views: number;
  posts_count: number;
  engagement_rate: number | null;
  likes: number;
  comments: number;
  fetched_at: string;
}

interface SocialAccount {
  id: string;
  platform: 'facebook' | 'instagram';
  username: string;
  profile_picture: string | null;
  insights: Insights | null;
}

/* ── Static fallback / generic data ── */

const engagementTrendData = [
  { date: 'OCT 01', interactions: 30 },
  { date: '', interactions: 45 },
  { date: '', interactions: 38 },
  { date: '', interactions: 55 },
  { date: 'OCT 08', interactions: 42 },
  { date: '', interactions: 60 },
  { date: '', interactions: 48 },
  { date: '', interactions: 70 },
  { date: 'OCT 15', interactions: 55 },
  { date: '', interactions: 40 },
  { date: '', interactions: 35 },
  { date: '', interactions: 50 },
  { date: 'OCT 22', interactions: 85 },
  { date: '', interactions: 72 },
  { date: '', interactions: 60 },
  { date: '', interactions: 55 },
  { date: 'OCT 30', interactions: 65 },
];

const demographicsData = [
  { name: '18-24 (Gen Z)', value: 45.2, color: '#2dd4bf' },
  { name: '25-34', value: 28.4, color: '#8b5cf6' },
  { name: '35-44', value: 16.8, color: '#f59e0b' },
  { name: '45+', value: 9.6, color: '#6366f1' },
];

type DateRange = 'last30' | 'last90';

export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange>('last30');
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all'); // 'all' or account.id

  const fetchInsights = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${API_URL}/api/analytics/insights?user_id=${session.user.id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true',
        }
      });
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error('Error fetching insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleRefresh = async () => {
    if (accounts.length === 0) return;
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      for (const acc of accounts) {
        await fetch(`${API_URL}/api/analytics/refresh/${acc.id}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'ngrok-skip-browser-warning': 'true',
          },
        });
      }
      await fetchInsights();
    } catch (err) {
      console.error('Error refreshing insights:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculations
  const activeAccounts = activeTab === 'all' 
    ? accounts 
    : accounts.filter(a => a.id === activeTab);

  let totalFollowers = 0;
  let totalReach = 0;
  let totalLikes = 0;
  let totalComments = 0;
  
  let totalEngagementSum = 0;
  let accountsWithEngagement = 0;
  
  let latestFetch: Date | null = null;
  let topPlatformId: string | null = null;
  let maxLikes = -1;

  activeAccounts.forEach(acc => {
    if (!acc.insights) return;
    
    totalFollowers += (acc.insights.followers || 0);
    totalReach += (acc.insights.reach || 0);
    
    const accLikes = acc.insights.likes || 0;
    const accComments = acc.insights.comments || 0;
    
    totalLikes += accLikes;
    totalComments += accComments;

    // Track best platform
    if (accLikes > maxLikes) {
      maxLikes = accLikes;
      topPlatformId = acc.id;
    }

    if (acc.insights.engagement_rate != null) {
      totalEngagementSum += acc.insights.engagement_rate;
      accountsWithEngagement++;
    }

    if (acc.insights.fetched_at) {
      const fetchDate = new Date(acc.insights.fetched_at);
      if (!latestFetch || fetchDate > latestFetch) {
        latestFetch = fetchDate;
      }
    }
  });

  const avgEngagement = accountsWithEngagement > 0 
    ? (totalEngagementSum / accountsWithEngagement) 
    : (totalFollowers > 0 ? ((totalLikes + totalComments) / totalFollowers) * 100 : 0);

  const bestPlatform = accounts.find(a => a.id === topPlatformId);

  // Platform styling helpers
  const getPlatformColor = (platform: string) => platform === 'instagram' ? '#e1306c' : '#1877f2';
  const getPlatformIcon = (platform: string) => platform === 'instagram' ? '📷' : '📘';

  // Last Updated formatting
  const formattedLastUpdated = latestFetch 
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(latestFetch)
    : 'Never';

  if (loading) {
    return (
      <div className="analytics" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
        Loading your analytics...
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="analytics" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
        <h2>No API Data</h2>
        <p style={{ marginTop: 10 }}>Connect accounts on the Accounts page to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="analytics" id="analytics-page">
      {/* Page Header */}
      <div className="analytics__header">
        <div>
          <h1 className="analytics__title">Advanced AI Analytics</h1>
          <p className="analytics__subtitle">Deep insights into your social performance</p>
          <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Last updated: {formattedLastUpdated}</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button 
            onClick={handleRefresh} 
            disabled={refreshing}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              padding: '8px 16px', borderRadius: '6px', 
              background: 'var(--bg-card)', border: '1px solid var(--border-color)', 
              color: 'var(--text-primary)', cursor: refreshing ? 'not-allowed' : 'pointer' 
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <div className="analytics__date-toggle">
            <button
              className={`analytics__date-btn ${dateRange === 'last30' ? 'analytics__date-btn--active' : ''}`}
              onClick={() => setDateRange('last30')}
            >
              Last 30 Days
            </button>
            <button
              className={`analytics__date-btn ${dateRange === 'last90' ? 'analytics__date-btn--active' : ''}`}
              onClick={() => setDateRange('last90')}
            >
              Last 90 Days
            </button>
          </div>
        </div>
      </div>

      {/* AI Summary Card */}
      <div className="analytics__ai-summary" id="ai-summary">
        <div className="ai-summary__header">
          <div className="ai-summary__icon">
            <Sparkles size={20} />
          </div>
          <h2 className="ai-summary__title">AI-Generated Summary</h2>
          <span className="ai-summary__badge">REAL-TIME</span>
          <div className="ai-summary__sparkle">
            <Sparkles size={48} />
          </div>
        </div>
        <p className="ai-summary__text">
          You have reached a total of <strong>{formatNumber(totalFollowers)} followers</strong>. 
          Your average engagement rate is currently <strong>{avgEngagement.toFixed(2)}%</strong>. 
          {bestPlatform && (
            <span> Your highest performing platform by likes is <em>{bestPlatform.platform}</em> ({bestPlatform.username}).</span>
          )}
          {' '}Continue posting consistently to maintain this momentum.
        </p>
      </div>

      {/* Stat Cards */}
      <section className="analytics__stats" id="analytics-stat-cards">
        <div className="a-stat-card">
          <p className="a-stat-card__label">Total Followers</p>
          <div className="a-stat-card__row">
            <span className="a-stat-card__value">{formatNumber(totalFollowers)}</span>
            <span className="a-stat-card__change a-stat-card__change--up">--</span>
          </div>
        </div>
        <div className="a-stat-card">
          <p className="a-stat-card__label">Avg Engagement</p>
          <div className="a-stat-card__row">
            <span className="a-stat-card__value">{avgEngagement.toFixed(2)}%</span>
            <span className="a-stat-card__change a-stat-card__change--up">--</span>
          </div>
        </div>
        <div className="a-stat-card">
          <p className="a-stat-card__label">Total Reach</p>
          <div className="a-stat-card__row">
            <span className="a-stat-card__value">{formatNumber(totalReach)}</span>
            <span className="a-stat-card__change a-stat-card__change--up">--</span>
          </div>
        </div>
        <div className="a-stat-card">
          <p className="a-stat-card__label">Total Likes</p>
          <div className="a-stat-card__row">
            <span className="a-stat-card__value">{formatNumber(totalLikes)}</span>
            <span className="a-stat-card__change a-stat-card__change--up">--</span>
          </div>
        </div>
      </section>

      {/* Platform Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
            background: activeTab === 'all' ? 'var(--accent)' : 'var(--bg-card)',
            color: activeTab === 'all' ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${activeTab === 'all' ? 'var(--accent)' : 'var(--border-color)'}`,
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          All Platforms
        </button>
        {accounts.map(acc => (
          <button
            key={acc.id}
            onClick={() => setActiveTab(acc.id)}
            style={{
              padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '6px',
              background: activeTab === acc.id ? getPlatformColor(acc.platform) : 'var(--bg-card)',
              color: activeTab === acc.id ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${activeTab === acc.id ? getPlatformColor(acc.platform) : 'var(--border-color)'}`,
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <span>{getPlatformIcon(acc.platform)}</span>
            {acc.username}
          </button>
        ))}
      </div>

      {/* Engagement Trends Chart */}
      <section className="analytics__chart-card" id="engagement-trends">
        <div className="chart-card__header">
          <div>
            <h2 className="chart-card__title">Engagement Trends</h2>
            <p className="chart-card__sub">Interaction volume across all platforms (30 Days)</p>
          </div>
          <div className="chart-card__legend">
            <span className="chart-card__legend-item">
              <span className="chart-card__legend-dot chart-card__legend-dot--accent" />
              Interactions
            </span>
          </div>
        </div>
        <div className="chart-card__body chart-card__body--tall">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={engagementTrendData}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: '#1a2332',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="interactions"
                stroke="#2dd4bf"
                strokeWidth={2.5}
                fill="url(#areaGradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#2dd4bf', stroke: '#0f1724', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Bottom Row: Demographics + Platform Reach */}
      <section className="analytics__bottom">
        {/* Audience Demographics */}
        <div className="analytics__demographics" id="audience-demographics">
          <h2 className="chart-card__title">Audience Demographics</h2>
          <p className="chart-card__sub">Age segment distribution</p>

          <div className="demographics__content">
            <div className="demographics__chart">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={demographicsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {demographicsData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="demographics__center-label">
                <span className="demographics__gen">Gen Z</span>
                <span className="demographics__gen-sub">TOP GROUP</span>
              </div>
            </div>

            <div className="demographics__legend">
              {demographicsData.map((item) => (
                <div className="demographics__legend-item" key={item.name}>
                  <span
                    className="demographics__legend-dot"
                    style={{ background: item.color }}
                  />
                  <span className="demographics__legend-label">{item.name}</span>
                  <span className="demographics__legend-value">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Platform Reach */}
        <div className="analytics__platforms" id="platform-reach">
          <h2 className="chart-card__title">Platform Reach</h2>
          <p className="chart-card__sub">Follower growth by network</p>

          <div className="platforms__list">
            {accounts.map((acc) => {
              const followers = acc.insights?.followers || 0;
              const percent = totalFollowers > 0 ? (followers / totalFollowers) * 100 : 0;
              return (
                <div className="platform-row" key={acc.id}>
                  <div className="platform-row__header">
                    <span className="platform-row__icon">{getPlatformIcon(acc.platform)}</span>
                    <span className="platform-row__name">{acc.username}</span>
                    <span className="platform-row__count">{formatNumber(followers)}</span>
                  </div>
                  <div className="platform-row__bar-bg">
                    <div
                      className="platform-row__bar-fill"
                      style={{ width: `${percent}%`, background: getPlatformColor(acc.platform) }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
