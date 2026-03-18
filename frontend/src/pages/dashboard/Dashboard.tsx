import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  Target,
  Sparkles,
  ArrowRight,
  AtSign,
  MessageSquare
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
import React, { useState, useEffect } from 'react';
import './Dashboard.css';

/* ── Static data (replace with API later) ── */

const stats = [
  {
    id: 'total-scheduled',
    label: 'Total Scheduled',
    value: '1,284',
    badge: '+5.2%',
    badgeType: 'up' as const,
    icon: <DollarSign size={18} />,
    iconBg: '#6366f1',
  },
  {
    id: 'engagement-rate',
    label: 'Engagement Rate',
    value: '4.2%',
    badge: '+1.2%',
    badgeType: 'up' as const,
    icon: <TrendingUp size={18} />,
    iconBg: '#8b5cf6',
  },
  {
    id: 'ai-usage',
    label: 'AI Usage',
    value: '850/1k',
    badge: '85%',
    badgeType: 'neutral' as const,
    icon: <Target size={18} />,
    iconBg: '#2dd4bf',
  },
  {
    id: 'active-accounts',
    label: 'Active Accounts',
    value: '12',
    badge: 'Active',
    badgeType: 'active' as const,
    icon: <Sparkles size={18} />,
    iconBg: 'transparent',
  },
];

const trendingHashtags = [
  '#AIRevolution',
  '#SaaSGrowth',
  '#FutureOfWork',
  '+4 Trending',
];

// Removed static upcomingPosts mock data

const chartData = [
  { platform: 'Instagram', current: 75, previous: 50 },
  { platform: 'LinkedIn', current: 90, previous: 65 },
  { platform: 'X Platform', current: 60, previous: 45 },
];

/* ── Component ── */

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

export default function Dashboard() {
  const { user } = useAuth();
  const [recentPosts, setRecentPosts] = useState<DashboardPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

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

    fetchPosts();
  }, [user]);

  return (
    <div className="dashboard" id="dashboard-page">
      {/* ─── Stat Cards ─── */}
      <section className="dashboard__stats" id="stat-cards">
        {stats.map((stat) => (
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
            <div className="insight-card__sparkle">
              <Sparkles size={48} className="insight-card__sparkle-icon" />
            </div>
          </div>

          <p className="insight-card__text">
            Your <strong>LinkedIn engagement is up 20%</strong> this week.
            Recommendation: Use more video content between{' '}
            <strong>9 AM and 11 AM</strong> for maximum reach.
          </p>

          <div className="insight-card__tags">
            {trendingHashtags.map((tag, i) => (
              <span
                className={`insight-card__tag ${i === trendingHashtags.length - 1 ? 'insight-card__tag--more' : ''}`}
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>

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
    </div>
  );
}
