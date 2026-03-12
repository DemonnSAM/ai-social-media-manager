import {
  DollarSign,
  TrendingUp,
  Target,
  Sparkles,
  ArrowRight,
  AtSign,
  Hash,
  MessageSquare,
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

const upcomingPosts = [
  {
    id: 'post-1',
    icon: <AtSign size={16} />,
    iconColor: '#2dd4bf',
    time: 'Today, 4:30 PM',
    status: 'READY' as const,
    title: '',
    description: '"Unlocking the potential of generative AI in modern SaaS architectures..."',
    hasImage: true,
  },
  {
    id: 'post-2',
    icon: <MessageSquare size={16} />,
    iconColor: '#f97316',
    time: 'Tomorrow, 10:00 AM',
    status: 'REVIEW' as const,
    title: 'Company Culture Highlight',
    description: 'Video: Behind the scenes with our AI engineering team.',
    hasImage: false,
  },
  {
    id: 'post-3',
    icon: <Hash size={16} />,
    iconColor: '#64748b',
    time: 'Wed, 9:15 AM',
    status: 'DRAFT' as const,
    title: '',
    description: 'Scheduled: Weekly Tech Roundup #Growth2024',
    hasImage: false,
  },
];

const chartData = [
  { platform: 'Instagram', current: 75, previous: 50 },
  { platform: 'LinkedIn', current: 90, previous: 65 },
  { platform: 'X Platform', current: 60, previous: 45 },
];

/* ── Component ── */

export default function Dashboard() {
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

          <a href="#" className="insight-card__link" id="view-ai-analysis">
            View Detailed AI Analysis <ArrowRight size={14} />
          </a>
        </div>

        {/* Upcoming Posts */}
        <div className="upcoming-card" id="upcoming-posts">
          <div className="upcoming-card__header">
            <h2 className="upcoming-card__title">Upcoming Posts</h2>
            <a href="#" className="upcoming-card__link">View Calendar</a>
          </div>

          <div className="upcoming-card__list">
            {upcomingPosts.map((post) => (
              <div className="upcoming-post" key={post.id} id={post.id}>
                <div className="upcoming-post__top">
                  <div className="upcoming-post__meta">
                    <span
                      className="upcoming-post__icon"
                      style={{ color: post.iconColor }}
                    >
                      {post.icon}
                    </span>
                    <span className="upcoming-post__time">{post.time}</span>
                  </div>
                  <span className={`upcoming-post__status upcoming-post__status--${post.status.toLowerCase()}`}>
                    {post.status}
                  </span>
                </div>
                {post.title && (
                  <p className="upcoming-post__title">{post.title}</p>
                )}
                {post.hasImage && (
                  <div className="upcoming-post__image">
                    <div className="upcoming-post__image-placeholder" />
                  </div>
                )}
                <p className="upcoming-post__desc">{post.description}</p>
              </div>
            ))}
          </div>

          <button className="upcoming-card__add" id="schedule-new-content">
            + Schedule New Content
          </button>
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
