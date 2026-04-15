import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreVertical,
  X,
  Instagram,
  Facebook,
  Twitter,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import './Calendar.css';

/* ── Types ── */

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  profile_picture: string | null;
}

interface CalendarPost {
  id: string;
  content: string;
  status: 'scheduled' | 'published' | 'failed' | string;
  scheduled_at: string; // ISO string
  accounts: SocialAccount[];
  mediaUrl: string | null;
}

/* ── Helpers ── */

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Maps post status → event color class (matches existing CSS) */
function statusToColor(status: string): 'cyan' | 'purple' | 'blue' {
  if (status === 'published') return 'cyan';
  if (status === 'failed') return 'purple';
  return 'blue'; // scheduled
}

/** Platform icon component */
function PlatformIcon({ platform, size = 14 }: { platform: string; size?: number }) {
  const p = platform?.toLowerCase();
  if (p === 'instagram') return <Instagram size={size} color="#e1306c" />;
  if (p === 'facebook') return <Facebook size={size} color="#1877f2" />;
  if (p === 'twitter' || p === 'x') return <Twitter size={size} color="#1da1f2" />;
  return null;
}

/** Date-group label for list view */
function dateGroupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const postDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((postDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff <= 7) return 'This Week';
  return 'Later';
}

/* ── Main Component ── */

export default function Calendar() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Start on current real month
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');

  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Post detail modal
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  /* ── Data fetching ── */

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    // Month range
    const rangeStart = new Date(year, month, 1).toISOString();
    const rangeEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    try {
      // Fetch posts in the month range
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, content, status, scheduled_at')
        .eq('user_id', user.id)
        .in('status', ['scheduled', 'published', 'failed'])
        .gte('scheduled_at', rangeStart)
        .lte('scheduled_at', rangeEnd)
        .order('scheduled_at', { ascending: true });

      if (postsError) throw postsError;
      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const postIds = postsData.map((p: any) => p.id);

      // Fetch post_targets → social_accounts
      const { data: targetsData } = await supabase
        .from('post_targets')
        .select('post_id, social_account_id, social_accounts(id, platform, username, profile_picture)')
        .in('post_id', postIds);

      // Fetch media
      const { data: mediaData } = await supabase
        .from('media')
        .select('post_id, url, type')
        .in('post_id', postIds)
        .eq('type', 'image')
        .limit(1);

      // Build lookup maps
      const accountsByPost: Record<string, SocialAccount[]> = {};
      if (targetsData) {
        for (const t of targetsData as any[]) {
          if (!accountsByPost[t.post_id]) accountsByPost[t.post_id] = [];
          if (t.social_accounts) {
            accountsByPost[t.post_id].push(t.social_accounts as SocialAccount);
          }
        }
      }

      const mediaByPost: Record<string, string> = {};
      if (mediaData) {
        for (const m of mediaData as any[]) {
          if (!mediaByPost[m.post_id]) mediaByPost[m.post_id] = m.url;
        }
      }

      const mapped: CalendarPost[] = postsData.map((p: any) => ({
        id: p.id,
        content: p.content || '',
        status: p.status,
        scheduled_at: p.scheduled_at,
        accounts: accountsByPost[p.id] || [],
        mediaUrl: mediaByPost[p.id] || null,
      }));

      setPosts(mapped);
    } catch (err: any) {
      console.error('[Calendar] fetch error:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, year, month]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  /* ── Month navigation ── */

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  /* ── Calendar grid ── */

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = 0; i < startingDay; i++) {
    days.push({ date: new Date(year, month - 1, prevMonthDays - startingDay + i + 1), isCurrentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  /* ── List view grouping ── */

  const groupOrder = ['Today', 'Tomorrow', 'This Week', 'Later'];
  const grouped: Record<string, CalendarPost[]> = {};
  for (const post of posts) {
    const label = dateGroupLabel(post.scheduled_at);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(post);
  }

  /* ── Max events per cell before overflow ── */
  const MAX_VISIBLE = 2;

  /* ── Render ── */

  return (
    <div className="calendar-page">
      {/* Header */}
      <div className="calendar__header-info">
        <div className="calendar__breadcrumbs">
          <span>DASHBOARD</span>
          <span>›</span>
          <span>CONTENT CALENDAR</span>
        </div>
        <h1 className="calendar__title">Content Calendar</h1>
        <p className="calendar__subtitle">
          View and manage your <span className="text-cyan">upcoming scheduled content</span>.
        </p>
      </div>

      {/* Controls */}
      <div className="calendar__controls">
        <div className="calendar__tabs">
          <button
            className={`calendar__tab ${activeTab === 'calendar' ? 'calendar__tab--active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            Calendar View
          </button>
          <button
            className={`calendar__tab ${activeTab === 'list' ? 'calendar__tab--active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            List View
          </button>
        </div>

        <div className="calendar__nav">
          <div className="calendar__month-selector">
            <button className="calendar__month-btn" onClick={prevMonth}><ChevronLeft size={20} /></button>
            <span>{MONTH_NAMES[month]} {year}</span>
            <button className="calendar__month-btn" onClick={nextMonth}><ChevronRight size={20} /></button>
          </div>
          <button className="btn-cyan-create" onClick={() => navigate('/publish')}>
            <Plus size={16} /> Create New Post
          </button>
        </div>
      </div>

      {/* Loading / Error banner */}
      {loading && (
        <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
          Loading posts…
        </div>
      )}
      {error && (
        <div style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {activeTab === 'calendar' && (
        <div className="calendar__grid">
          <div className="calendar__days-header">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="calendar__day-name">{day}</div>
            ))}
          </div>

          <div className="calendar__days-grid">
            {days.map((dayObj, index) => {
              const monthShort = MONTH_NAMES[dayObj.date.getMonth()].substring(0, 3);
              const labelStr = `${monthShort} ${dayObj.date.getDate()}`;
              const isToday = isSameDay(dayObj.date, today);

              const dayPosts = posts.filter(p =>
                isSameDay(new Date(p.scheduled_at), dayObj.date)
              );

              const visiblePosts = dayPosts.slice(0, MAX_VISIBLE);
              const overflowCount = dayPosts.length - MAX_VISIBLE;

              return (
                <div
                  key={index}
                  className={`calendar__day-cell ${!dayObj.isCurrentMonth ? 'calendar__day-cell--other-month' : ''}`}
                >
                  <div className="day-cell__header">
                    <span
                      className="day-cell__date"
                      style={isToday ? {
                        background: '#06b6d4',
                        color: '#0f172a',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 800,
                      } : {}}
                    >
                      {isToday ? dayObj.date.getDate() : labelStr}
                    </span>
                    {dayObj.isCurrentMonth && (
                      <Plus
                        size={14}
                        className="day-cell__add"
                        onClick={() => navigate('/publish')}
                      />
                    )}
                  </div>

                  <div className="calendar__events">
                    {visiblePosts.map(post => (
                      <div
                        key={post.id}
                        className={`calendar__event calendar__event--${statusToColor(post.status)}`}
                        onClick={() => setSelectedPost(post)}
                      >
                        <div className="event__header">
                          <span className="event__time">{formatTime(post.scheduled_at)}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {post.accounts[0] && (
                              <PlatformIcon platform={post.accounts[0].platform} size={11} />
                            )}
                            <MoreVertical size={12} className="event__more" />
                          </div>
                        </div>
                        <div className="event__title">
                          {post.content.length > 28 ? post.content.slice(0, 28) + '…' : post.content || '[No content]'}
                        </div>
                        <div className="event__desc">
                          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                          {post.accounts[0] ? ` · @${post.accounts[0].username}` : ''}
                        </div>
                      </div>
                    ))}

                    {overflowCount > 0 && (
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#94a3b8',
                          padding: '2px 6px',
                          cursor: 'pointer',
                        }}
                        onClick={() => setActiveTab('list')}
                      >
                        +{overflowCount} more
                      </div>
                    )}

                    {dayPosts.length === 0 && (
                      <div
                        className="day-cell__schedule-placeholder"
                        onClick={() => navigate('/publish')}
                      >
                        <Plus size={20} />
                        <span>SCHEDULE</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {activeTab === 'list' && (
        <div style={{
          background: '#1e293b',
          borderRadius: '12px',
          border: '1px solid #334155',
          overflow: 'hidden',
        }}>
          {posts.length === 0 && !loading ? (
            /* Empty state */
            <div style={{
              padding: '64px 32px',
              textAlign: 'center',
              color: '#94a3b8',
            }}>
              <Sparkles />
              <p style={{ fontSize: '15px', margin: '16px 0 8px', color: '#f8fafc', fontWeight: 600 }}>
                No scheduled posts for this month
              </p>
              <p style={{ fontSize: '13px', marginBottom: '24px' }}>
                Switch to {MONTH_NAMES[month]} {year} or create a new post.
              </p>
              <button className="btn-cyan-create" onClick={() => navigate('/publish')} style={{ margin: '0 auto' }}>
                <Plus size={16} /> Create New Post
              </button>
            </div>
          ) : (
            groupOrder.filter(g => grouped[g]).map(group => (
              <div key={group}>
                {/* Group header */}
                <div style={{
                  padding: '12px 20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  background: '#0f172a',
                  borderBottom: '1px solid #334155',
                }}>
                  {group}
                </div>

                {grouped[group].map((post, i) => (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px 20px',
                      borderBottom: i < grouped[group].length - 1 ? '1px solid #1e293b' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      background: '#1e293b',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#253347')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#1e293b')}
                  >
                    {/* Date+time */}
                    <div style={{ minWidth: '130px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                        {formatDateLabel(post.scheduled_at)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {formatTime(post.scheduled_at)}
                      </div>
                    </div>

                    {/* Platform(s) */}
                    <div style={{ minWidth: '140px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {post.accounts.length > 0 ? post.accounts.map(acc => (
                        <div key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {acc.profile_picture ? (
                            <img
                              src={acc.profile_picture}
                              alt={acc.username}
                              style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <PlatformIcon platform={acc.platform} size={14} />
                          )}
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>@{acc.username}</span>
                        </div>
                      )) : (
                        <span style={{ fontSize: '12px', color: '#475569' }}>—</span>
                      )}
                    </div>

                    {/* Content preview */}
                    <div style={{ flex: 1, fontSize: '13px', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {post.content || <span style={{ color: '#475569' }}>[No content]</span>}
                    </div>

                    {/* Thumbnail */}
                    {post.mediaUrl && (
                      <img
                        src={post.mediaUrl}
                        alt="thumb"
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                      />
                    )}

                    {/* Status badge */}
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '999px',
                      flexShrink: 0,
                      background: post.status === 'published'
                        ? 'rgba(34,197,94,0.15)'
                        : post.status === 'failed'
                        ? 'rgba(239,68,68,0.15)'
                        : 'rgba(6,182,212,0.15)',
                      color: post.status === 'published'
                        ? '#4ade80'
                        : post.status === 'failed'
                        ? '#f87171'
                        : '#22d3ee',
                    }}>
                      {post.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Empty state for calendar view ── */}
      {activeTab === 'calendar' && !loading && posts.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '24px',
          color: '#94a3b8',
          fontSize: '14px',
          marginTop: '8px',
        }}>
          No scheduled posts for this month.{' '}
          <button
            onClick={() => navigate('/publish')}
            style={{ color: '#06b6d4', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            Create New Post
          </button>
        </div>
      )}

      {/* ── Post Detail Modal ── */}
      {selectedPost && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
          onClick={() => setSelectedPost(null)}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedPost(null)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b',
              }}
            >
              <X size={20} />
            </button>

            {/* Status badge */}
            <span style={{
              display: 'inline-block',
              fontSize: '11px', fontWeight: 700,
              padding: '3px 10px', borderRadius: '999px', marginBottom: '16px',
              background: selectedPost.status === 'published'
                ? 'rgba(34,197,94,0.15)'
                : selectedPost.status === 'failed'
                ? 'rgba(239,68,68,0.15)'
                : 'rgba(6,182,212,0.15)',
              color: selectedPost.status === 'published'
                ? '#4ade80'
                : selectedPost.status === 'failed'
                ? '#f87171'
                : '#22d3ee',
            }}>
              {selectedPost.status.toUpperCase()}
            </span>

            {/* Date & time */}
            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
              {formatDateLabel(selectedPost.scheduled_at)} · {formatTime(selectedPost.scheduled_at)}
            </div>

            {/* Content */}
            <p style={{
              fontSize: '15px', color: '#f1f5f9', lineHeight: 1.6,
              borderLeft: '3px solid #06b6d4',
              paddingLeft: '14px',
              marginBottom: '20px',
            }}>
              {selectedPost.content || <span style={{ color: '#475569' }}>[No content]</span>}
            </p>

            {/* Media */}
            {selectedPost.mediaUrl && (
              <img
                src={selectedPost.mediaUrl}
                alt="Post media"
                style={{
                  width: '100%', borderRadius: '10px', objectFit: 'cover',
                  maxHeight: '220px', marginBottom: '20px',
                }}
              />
            )}

            {/* Accounts */}
            {selectedPost.accounts.length > 0 && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {selectedPost.accounts.map(acc => (
                  <div key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    {acc.profile_picture ? (
                      <img src={acc.profile_picture} alt={acc.username} style={{ width: 22, height: 22, borderRadius: '50%' }} />
                    ) : (
                      <PlatformIcon platform={acc.platform} size={16} />
                    )}
                    @{acc.username}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* tiny inline fallback for the empty-state sparkle icon */
function Sparkles() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v1m0 16v1M4.22 4.22l.71.71m12.73 12.73.71.71M3 12h1m16 0h1M4.22 19.78l.71-.71M18.36 5.64l.71-.71" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}
