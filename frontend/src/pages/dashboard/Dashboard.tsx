import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  Target,
  Sparkles,
  ArrowRight,
  AtSign,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect, useCallback } from 'react';
import './Dashboard.css';

/* ── Static data (replace with API later) ── */

const defaultStats = [
  {
    id: 'total-scheduled',
    label: 'Total Scheduled',
    value: '0',
    badge: '—',
    badgeType: 'neutral' as const,
    icon: <DollarSign size={18} />,
    iconBg: '#6366f1',
  },
  {
    id: 'total-published',
    label: 'Total Published',
    value: '0',
    badge: '—',
    badgeType: 'neutral' as const,
    icon: <TrendingUp size={18} />,
    iconBg: '#8b5cf6',
  },
  {
    id: 'ai-usage',
    label: 'AI Usage',
    value: '0 tokens',
    badge: '—',
    badgeType: 'neutral' as const,
    icon: <Target size={18} />,
    iconBg: '#2dd4bf',
  },
  {
    id: 'active-accounts',
    label: 'Active Accounts',
    value: '0',
    badge: 'Active',
    badgeType: 'active' as const,
    icon: <Sparkles size={18} />,
    iconBg: 'transparent',
  },
];

// Removed static upcomingPosts mock data

const chartData = [
  { platform: 'Instagram', current: 75, previous: 50 },
  { platform: 'LinkedIn', current: 90, previous: 65 },
  { platform: 'X Platform', current: 60, previous: 45 },
];

/* ── Types ── */

interface DashboardPost {
  id: string;
  icon: React.ReactNode;
  iconColor: string;
  time: string;
  status: string;
  title: string;
  description: string;
  hasImage: boolean;
  imagePreview: string | null;
}

interface InsightData {
  insight: string;
  recommendation: string;
  hashtags: string[];
  best_platform: string | null;
  cached: boolean;
}

/* ── Component ── */

export default function Dashboard() {
  const { user } = useAuth();
  const [recentPosts, setRecentPosts] = useState<DashboardPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [dashboardStats, setDashboardStats] = useState(defaultStats);

  // AI insight state
  const [insightData, setInsightData] = useState<InsightData | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const fetchInsight = useCallback(async (force = false) => {
    if (!user) return;
    setInsightLoading(true);
    setInsightError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const url = `${apiUrl}/api/ai/dashboard-insight${force ? '?force=true' : ''}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch insight');
      }

      if (data.error) {
        // Graceful no-data error from backend
        setInsightError(data.error);
        setInsightData(null);
      } else {
        setInsightData(data);
      }
    } catch (err: any) {
      setInsightError('Could not load insights. Try refreshing.');
      setInsightData(null);
    } finally {
      setInsightLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchPosts = async () => {
      setLoadingPosts(true);

      const { data, error } = await supabase
        .from('posts')
        .select('*, media(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        const mapped: DashboardPost[] = data.map((post: any) => {
          let icon = <MessageSquare size={16} />;
          let iconColor = '#64748b';
          
          if (post.status === 'scheduled') {
            iconColor = '#6366f1';
          } else if (post.status === 'published') {
            icon = <AtSign size={16} />;
            iconColor = '#2dd4bf';
          } else {
            iconColor = '#f97316';
          }

          const displayTime = post.scheduled_at 
            ? new Date(post.scheduled_at).toLocaleString() 
            : new Date(post.created_at).toLocaleString();

          const postMedia = post.media && post.media.length > 0 ? post.media[0].url : null;

          return {
            id: post.id,
            icon,
            iconColor,
            time: displayTime,
            status: post.status.toUpperCase(),
            title: '', // No title concept in DB right now
            description: post.content || (postMedia ? '[Media Only]' : 'Empty Post'),
            hasImage: !!postMedia,
            imagePreview: postMedia
          };
        });
        
        setRecentPosts(mapped);
      }
      setLoadingPosts(false);
    };

    const fetchDashboardData = async () => {
      try {
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('id, status')
          .eq('user_id', user.id);

        const { data: accountsData, error: accountsError } = await supabase
          .from('social_accounts')
          .select('id')
          .eq('user_id', user.id);

        // Fetch total AI token usage
        const { data: usageData } = await supabase
          .from('ai_usage')
          .select('tokens_used')
          .eq('user_id', user.id);

        const totalTokensUsed = usageData
          ? usageData.reduce((sum: number, row: any) => sum + (row.tokens_used || 0), 0)
          : 0;

        if (!postsError && postsData) {
          const totalScheduled = postsData.filter((p: any) => p.status === 'scheduled').length;
          const totalPublished = postsData.filter((p: any) => p.status === 'published').length;
          const activeAccounts = !accountsError && accountsData ? accountsData.length : 0;

          setDashboardStats(prev => prev.map(item => {
            if (item.id === 'total-scheduled') {
              return {
                ...item,
                value: totalScheduled.toLocaleString(),
                badge: totalScheduled > 0 ? `${totalScheduled} pending` : 'None',
                badgeType: totalScheduled > 0 ? 'active' as const : 'neutral' as const,
              };
            }
            if (item.id === 'total-published') {
              return {
                ...item,
                value: totalPublished.toLocaleString(),
                badge: totalPublished > 0 ? `+${totalPublished}` : '—',
                badgeType: totalPublished > 0 ? 'active' as const : 'neutral' as const,
              };
            }
            if (item.id === 'ai-usage') {
              return {
                ...item,
                value: `${totalTokensUsed.toLocaleString()} tokens`,
                badge: totalTokensUsed > 0 ? 'Used' : '—',
                badgeType: totalTokensUsed > 0 ? 'active' as const : 'neutral' as const,
              };
            }
            if (item.id === 'active-accounts') {
              return {
                ...item,
                value: activeAccounts.toString(),
                badge: activeAccounts > 0 ? 'Active' : 'None',
                badgeType: activeAccounts > 0 ? 'active' as const : 'neutral' as const,
              };
            }
            return item;
          }));
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      }
    };

    fetchDashboardData();
    fetchPosts();
    fetchInsight(false);
  }, [user, fetchInsight]);

  return (
    <div className="dashboard" id="dashboard-page">
      {/* ─── Stat Cards ─── */}
      <section className="dashboard__stats" id="stat-cards">
        {dashboardStats.map((stat) => (
          <div className="stat-card" key={stat.id} id={stat.id}>
            <div className="stat-card__header">
              <div
                className="stat-card__icon"
                style={{ background: stat.iconBg }}
              >
                {stat.icon}
              </div>
              <span className={`stat-card__badge stat-card__badge--${stat.badgeType}`}>
                {stat.badge}
              </span>
            </div>
            <p className="stat-card__label">{stat.label}</p>
            <p className="stat-card__value">{stat.value}</p>
          </div>
        ))}
      </section>

      {/* ─── Middle row: AI Insight + Upcoming Posts ─── */}
      <section className="dashboard__middle">
        {/* AI Performance Insight */}
        <div className="insight-card" id="ai-insight-card">
          <div className="insight-card__header">
            <div className="insight-card__icon-wrap">
              <Sparkles size={20} />
            </div>
            <h2 className="insight-card__title">AI Performance Insight</h2>
            {/* Refresh button */}
            <button
              id="refresh-insight-btn"
              onClick={() => fetchInsight(true)}
              disabled={insightLoading}
              title="Refresh insight"
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '6px',
                color: '#a5b4fc',
                fontSize: '12px',
                padding: '4px 10px',
                cursor: insightLoading ? 'not-allowed' : 'pointer',
                opacity: insightLoading ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <RefreshCw
                size={12}
                style={{
                  animation: insightLoading ? 'spin 1s linear infinite' : 'none',
                }}
              />
              Refresh
            </button>
            <div className="insight-card__sparkle">
              <Sparkles size={48} className="insight-card__sparkle-icon" />
            </div>
          </div>

          {/* Loading state */}
          {insightLoading && !insightData && (
            <p className="insight-card__text" style={{ color: '#94a3b8' }}>
              Generating AI insight…
            </p>
          )}

          {/* Error state */}
          {!insightLoading && insightError && (
            <p className="insight-card__text" style={{ color: '#94a3b8' }}>
              {insightError.includes('sync') || insightError.includes('No analytics')
                ? 'Connect and sync your accounts to see AI insights.'
                : 'Could not load insights. Try refreshing.'}
            </p>
          )}

          {/* Data state */}
          {!insightLoading && insightData && (
            <>
              <p className="insight-card__text">
                {insightData.insight}{' '}
                <strong>{insightData.recommendation}</strong>
              </p>

              <div className="insight-card__tags">
                {insightData.hashtags.map((tag, i) => (
                  <span
                    className="insight-card__tag"
                    key={`${tag}-${i}`}
                  >
                    {tag}
                  </span>
                ))}
                {/* Cached / Fresh badge */}
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: insightData.cached
                      ? 'rgba(100,116,139,0.25)'
                      : 'rgba(34,197,94,0.18)',
                    color: insightData.cached ? '#94a3b8' : '#4ade80',
                    border: `1px solid ${insightData.cached ? 'rgba(100,116,139,0.3)' : 'rgba(34,197,94,0.3)'}`,
                    marginLeft: '4px',
                  }}
                >
                  {insightData.cached ? 'Cached' : 'Fresh'}
                </span>
              </div>
            </>
          )}

          {/* Fallback when no data and not loading/error */}
          {!insightLoading && !insightData && !insightError && (
            <p className="insight-card__text" style={{ color: '#94a3b8' }}>
              Connect and sync your accounts to see AI insights.
            </p>
          )}

          <Link to="/analytics" className="insight-card__link" id="view-ai-analysis">
            View Detailed AI Analysis <ArrowRight size={14} />
          </Link>
        </div>

        {/* Upcoming Posts */}
        <div className="upcoming-card" id="upcoming-posts">
          <div className="upcoming-card__header">
            <h2 className="upcoming-card__title">Upcoming Posts</h2>
            <Link to="/calendar" className="upcoming-card__link">View Calendar</Link>
          </div>

          <div className="upcoming-card__list">
            {loadingPosts ? (
               <div style={{ color: '#94a3b8', padding: '1rem', textAlign: 'center' }}>Loading posts...</div>
            ) : recentPosts.length === 0 ? (
               <div style={{ color: '#94a3b8', padding: '1rem', textAlign: 'center' }}>No recent posts found.</div>
            ) : (
              recentPosts.map((post) => (
                <div className="upcoming-post" key={post.id} id={post.id}>
                  <div className="upcoming-post__top">
                    <div className="upcoming-post__meta">
                      <span
                        className="upcoming-post__icon"
                        style={{ color: post.iconColor }}
                      >
                        {post.icon}
                      </span>
                      <span className="upcoming-post__time" style={{ fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={post.time}>{post.time}</span>
                    </div>
                    <span className={`upcoming-post__status upcoming-post__status--${post.status.toLowerCase()}`}>
                      {post.status}
                    </span>
                  </div>
                  {post.title && (
                    <p className="upcoming-post__title">{post.title}</p>
                  )}
                  {post.hasImage && (
                    <div className="upcoming-post__image" style={{ marginTop: '8px' }}>
                      <img src={post.imagePreview || ''} alt="Preview" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                    </div>
                  )}
                  <p className="upcoming-post__desc" style={{ marginTop: '8px' }}>{post.description}</p>
                 </div>
              ))
            )}
          </div>

          <Link to="/publish" className="upcoming-card__add" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }} id="schedule-new-content">
            + Schedule New Content
          </Link>
        </div>
      </section>

      {/* ─── Engagement by Platform ─── */}
      <section className="dashboard__chart" id="engagement-chart">
        <div className="chart-card">
          <div className="chart-card__header">
            <h2 className="chart-card__title">Engagement by Platform</h2>
            <div className="chart-card__legend">
              <span className="chart-card__legend-item">
                <span className="chart-card__legend-dot chart-card__legend-dot--current" />
                Current Week
              </span>
              <span className="chart-card__legend-item">
                <span className="chart-card__legend-dot chart-card__legend-dot--previous" />
                Previous Week
              </span>
            </div>
          </div>

          <div className="chart-card__body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4} barCategoryGap="30%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="platform"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
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
                <Bar
                  dataKey="current"
                  fill="#2dd4bf"
                  radius={[4, 4, 0, 0]}
                  name="Current Week"
                />
                <Bar
                  dataKey="previous"
                  fill="#334155"
                  radius={[4, 4, 0, 0]}
                  name="Previous Week"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ─── Spinner keyframe (inline for RefreshCw animation) ─── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
