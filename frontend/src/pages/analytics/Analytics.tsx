import { useState } from 'react';
import {
  Sparkles,
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
import './Analytics.css';

/* ── Static data ── */

const stats = [
  {
    id: 'total-followers',
    label: 'Total Followers',
    value: '1.24M',
    change: '+2.1%',
    isUp: true,
  },
  {
    id: 'avg-engagement',
    label: 'Avg Engagement',
    value: '4.52%',
    change: '-0.5%',
    isUp: false,
  },
  {
    id: 'total-reach',
    label: 'Total Reach',
    value: '890.2K',
    change: '+10.2%',
    isUp: true,
  },
  {
    id: 'conversions',
    label: 'Conversions',
    value: '12.4%',
    change: '+1.4%',
    isUp: true,
  },
];

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

const platformReach = [
  { name: 'Instagram', followers: '542.2K', percent: 68, color: '#e1306c', icon: '📷' },
  { name: 'X (Twitter)', followers: '210.8K', percent: 42, color: '#2dd4bf', icon: '𝕏' },
  { name: 'LinkedIn', followers: '105.4K', percent: 26, color: '#0077b5', icon: '💼' },
  { name: 'YouTube', followers: '42.1K', percent: 12, color: '#ff0000', icon: '🎬' },
];

type DateRange = 'last30' | 'last90';

export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange>('last30');

  return (
    <div className="analytics" id="analytics-page">
      {/* Page Header */}
      <div className="analytics__header">
        <div>
          <h1 className="analytics__title">Advanced AI Analytics</h1>
          <p className="analytics__subtitle">Deep insights into your social performance</p>
        </div>
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
          Your engagement is up <strong>12.4%</strong> this month. Peak activity occurs on{' '}
          <strong>Tuesdays at 6 PM EST</strong>. Video content on Instagram is performing{' '}
          <em>3.5x better</em> than static posts. Recommend increasing Reels production by 20%.
        </p>
      </div>

      {/* Stat Cards */}
      <section className="analytics__stats" id="analytics-stat-cards">
        {stats.map((stat) => (
          <div className="a-stat-card" key={stat.id} id={stat.id}>
            <p className="a-stat-card__label">{stat.label}</p>
            <div className="a-stat-card__row">
              <span className="a-stat-card__value">{stat.value}</span>
              <span className={`a-stat-card__change ${stat.isUp ? 'a-stat-card__change--up' : 'a-stat-card__change--down'}`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </section>

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
            {platformReach.map((platform) => (
              <div className="platform-row" key={platform.name}>
                <div className="platform-row__header">
                  <span className="platform-row__icon">{platform.icon}</span>
                  <span className="platform-row__name">{platform.name}</span>
                  <span className="platform-row__count">{platform.followers}</span>
                </div>
                <div className="platform-row__bar-bg">
                  <div
                    className="platform-row__bar-fill"
                    style={{ width: `${platform.percent}%`, background: platform.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
