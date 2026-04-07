import axios from 'axios';
import supabaseAdmin from '../config/supabaseAdmin.js';

const META_API_BASE = 'https://graph.facebook.com/v18.0';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

/**
 * Fetches insights from Meta Graph API and upserts them into account_insights.
 * Skips if the last fetch was less than 6 hours ago.
 *
 * @param {string} socialAccountId - UUID of the row in social_accounts
 * @returns {object|null} The updated insights row, or null if skipped/failed
 */
export const fetchAndStoreInsights = async (socialAccountId) => {
  console.log(`\n[AnalyticsService] ═══ fetchAndStoreInsights START ═══`);
  console.log(`[AnalyticsService] socialAccountId: ${socialAccountId}`);

  // ── Step a: Fetch social_account record ──────────────────────────────────
  const { data: account, error: accountError } = await supabaseAdmin
    .from('social_accounts')
    .select('id, platform, account_id, page_access_token, username')
    .eq('id', socialAccountId)
    .maybeSingle();

  if (accountError || !account) {
    console.error(`[AnalyticsService] ✗ Could not fetch social_account:`, accountError?.message ?? 'Not found');
    return null;
  }

  // ── Full account debug log (as requested) ────────────────────────────────
  console.log(`[AnalyticsService] social_account row:`, {
    id: account.id,
    platform: account.platform,
    account_id: account.account_id,
    username: account.username,
    has_page_access_token: !!account.page_access_token,
  });

  // Normalize platform to lowercase to guard against casing inconsistencies
  const platform = (account.platform ?? '').toLowerCase();
  const { account_id, page_access_token } = account;

  if (!page_access_token) {
    console.error(`[AnalyticsService] ✗ No page_access_token for account ${socialAccountId} — skipping`);
    return null;
  }

  // ── Step b: Check last fetch time (6-hour dedup) ─────────────────────────
  // Use order+limit instead of maybeSingle to safely handle duplicate rows
  // that may exist if the unique constraint hasn't been applied yet.
  const { data: existingRows } = await supabaseAdmin
    .from('account_insights')
    .select('id, fetched_at')
    .eq('social_account_id', socialAccountId)
    .order('fetched_at', { ascending: false })
    .limit(1);

  const existingInsight = existingRows?.[0] ?? null;

  if (existingInsight?.fetched_at) {
    const lastFetch = new Date(existingInsight.fetched_at).getTime();
    const elapsed = Date.now() - lastFetch;
    if (elapsed < SIX_HOURS_MS) {
      const minutesAgo = Math.floor(elapsed / 60000);
      console.log(`[AnalyticsService] ⏩ Skipping — last fetched ${minutesAgo} min ago (< 6 h threshold)`);
      return existingInsight;
    }
  }

  console.log(`[AnalyticsService] Platform resolved to: "${platform}"`);

  // ── Steps c/d: Fetch from Meta API (each call isolated) ──────────────────
  let insightPayload = { social_account_id: socialAccountId };

  if (platform === 'facebook') {
    insightPayload = await fetchFacebookInsights(account_id, page_access_token, insightPayload);
  } else if (platform === 'instagram') {
    insightPayload = await fetchInstagramInsights(account_id, page_access_token, insightPayload);
  } else {
    console.error(`[AnalyticsService] ✗ Unknown platform "${platform}" — cannot fetch insights`);
    return null;
  }

  // ── Step e: Upsert into account_insights ─────────────────────────────────
  insightPayload.fetched_at = new Date().toISOString();

  console.log(`[AnalyticsService] Upserting payload:`, {
    ...insightPayload,
    social_account_id: socialAccountId,
  });

  const { data: upserted, error: upsertError } = await supabaseAdmin
    .from('account_insights')
    .upsert(insightPayload, { onConflict: 'social_account_id' })
    .select()
    .single();

  if (upsertError) {
    console.error(`[AnalyticsService] ✗ Upsert failed:`, upsertError.message, upsertError.details);
    return null;
  }

  console.log(`[AnalyticsService] ✓ Insights saved for account ${socialAccountId} (platform: ${platform})`);
  console.log(`[AnalyticsService] ═══ fetchAndStoreInsights END ═══\n`);
  return upserted;
};

// ─── Facebook helpers ─────────────────────────────────────────────────────────
// Each of the two API calls is wrapped in its own try/catch so a failure
// in the insights call does NOT discard the profile data already fetched.

async function fetchFacebookInsights(accountId, pageAccessToken, payload) {
  console.log(`[AnalyticsService] [FB] Fetching profile for page_id=${accountId}`);

  // ── Profile call: fan_count (page followers) ──────────────────────────────
  // NOTE: 'posts_count' is NOT a valid Facebook Page API field.
  // Use 'fan_count' for followers. Post count is not directly exposed on /page.
  try {
    const profileRes = await axios.get(`${META_API_BASE}/${accountId}`, {
      params: {
        fields: 'fan_count,name',
        access_token: pageAccessToken,
      },
    });

    console.log(`[AnalyticsService] [FB] Profile raw response:`, profileRes.data);
    payload.followers = profileRes.data.fan_count ?? null;

  } catch (err) {
    console.error(`[AnalyticsService] [FB] ✗ Profile call failed:`, err.response?.data ?? err.message);
    // Don't return — continue to insights call
  }

  // ── Insights call: page_impressions + page_reach ──────────────────────────
  try {
    const insightsRes = await axios.get(`${META_API_BASE}/${accountId}/insights`, {
      params: {
        metric: 'page_impressions,page_reach',
        period: 'day',
        access_token: pageAccessToken,
      },
    });

    console.log(`[AnalyticsService] [FB] Insights raw response:`, JSON.stringify(insightsRes.data, null, 2));

    const metricsData = insightsRes.data?.data || [];
    for (const metric of metricsData) {
      // values[] is ordered oldest→newest; take the last entry
      const latestValue = metric.values?.[metric.values.length - 1]?.value ?? null;
      if (metric.name === 'page_impressions') payload.impressions = latestValue;
      if (metric.name === 'page_reach') payload.reach = latestValue;
    }

  } catch (err) {
    console.error(`[AnalyticsService] [FB] ✗ Insights call failed:`, err.response?.data ?? err.message);
    // Don't return — we still want to upsert whatever profile data we got
  }

  // ── Post-level call: likes + comments ───────────────────────────────────
  try {
    const postsRes = await axios.get(`${META_API_BASE}/${accountId}/posts`, {
      params: {
        fields: 'id,likes.summary(true),comments.summary(true)',
        access_token: pageAccessToken,
      },
    });

    const posts = postsRes.data?.data || [];
    let totalLikes = 0;
    let totalComments = 0;
    for (const post of posts) {
      totalLikes += post.likes?.summary?.total_count ?? 0;
      totalComments += post.comments?.summary?.total_count ?? 0;
    }
    payload.likes = totalLikes;
    payload.comments = totalComments;
    console.log(`[AnalyticsService] [FB] Posts aggregated — likes: ${totalLikes}, comments: ${totalComments} across ${posts.length} post(s)`);

  } catch (err) {
    console.error(`[AnalyticsService] [FB] ✗ Posts call failed:`, err.response?.data ?? err.message);
  }

  console.log(`[AnalyticsService] [FB] Collected:`, {
    followers: payload.followers,
    impressions: payload.impressions,
    reach: payload.reach,
    likes: payload.likes,
    comments: payload.comments,
  });

  return payload;
}

// ─── Instagram helpers ────────────────────────────────────────────────────────
// account_id here is the Instagram Business Account ID (NOT the Facebook Page ID).
// page_access_token is the linked Facebook Page's access token (required by Meta API).

async function fetchInstagramInsights(accountId, pageAccessToken, payload) {
  console.log(`[AnalyticsService] [IG] Fetching profile for ig_account_id=${accountId}`);

  // ── Profile call: followers_count + media_count ───────────────────────────
  try {
    const profileRes = await axios.get(`${META_API_BASE}/${accountId}`, {
      params: {
        fields: 'followers_count,media_count,username',
        access_token: pageAccessToken,
      },
    });

    console.log(`[AnalyticsService] [IG] Profile raw response:`, profileRes.data);
    payload.followers = profileRes.data.followers_count ?? null;
    payload.posts_count = profileRes.data.media_count ?? null;

  } catch (err) {
    console.error(`[AnalyticsService] [IG] ✗ Profile call failed:`, err.response?.data ?? err.message);
    // Don't return — continue to insights call
  }

  // ── Insights call: impressions, reach, profile_views ─────────────────────
  // Requires 'instagram_manage_insights' permission on the connected app.
  try {
    const insightsRes = await axios.get(`${META_API_BASE}/${accountId}/insights`, {
      params: {
        metric: 'impressions,reach,profile_views',
        period: 'day',
        access_token: pageAccessToken,
      },
    });

    console.log(`[AnalyticsService] [IG] Insights raw response:`, JSON.stringify(insightsRes.data, null, 2));

    const metricsData = insightsRes.data?.data || [];
    for (const metric of metricsData) {
      const latestValue = metric.values?.[metric.values.length - 1]?.value ?? null;
      if (metric.name === 'impressions') payload.impressions = latestValue;
      if (metric.name === 'reach') payload.reach = latestValue;
      if (metric.name === 'profile_views') payload.profile_views = latestValue;
    }

  } catch (err) {
    console.error(`[AnalyticsService] [IG] ✗ Insights call failed:`, err.response?.data ?? err.message);
    // Don't return — we still want to upsert profile data
  }

  // ── Media-level call: like_count + comments_count ───────────────────────
  try {
    const mediaRes = await axios.get(`${META_API_BASE}/${accountId}/media`, {
      params: {
        fields: 'id,like_count,comments_count',
        access_token: pageAccessToken,
      },
    });

    const mediaItems = mediaRes.data?.data || [];
    let totalLikes = 0;
    let totalComments = 0;
    for (const item of mediaItems) {
      totalLikes += item.like_count ?? 0;
      totalComments += item.comments_count ?? 0;
    }
    payload.likes = totalLikes;
    payload.comments = totalComments;
    console.log(`[AnalyticsService] [IG] Media aggregated — likes: ${totalLikes}, comments: ${totalComments} across ${mediaItems.length} media item(s)`);

  } catch (err) {
    console.error(`[AnalyticsService] [IG] ✗ Media call failed:`, err.response?.data ?? err.message);
  }

  console.log(`[AnalyticsService] [IG] Collected:`, {
    followers: payload.followers,
    posts_count: payload.posts_count,
    impressions: payload.impressions,
    reach: payload.reach,
    profile_views: payload.profile_views,
    likes: payload.likes,
    comments: payload.comments,
  });

  return payload;
}
