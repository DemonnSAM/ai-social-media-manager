import supabaseAdmin from '../config/supabaseAdmin.js';
import { fetchAndStoreInsights } from '../services/analyticsService.js';

/**
 * GET /api/analytics/insights?user_id=<uuid>
 *
 * Returns all social accounts for the given user, each with their latest
 * insights row from account_insights.
 */
export const getInsights = async (req, res) => {
  const user_id = req.query.user_id || req.body.user_id;

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  try {
    console.log(`[AnalyticsController] getInsights called for user_id: ${user_id}`);

    // Fetch all social accounts for this user
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('social_accounts')
      .select('id, platform, username, profile_picture, account_id')
      .eq('user_id', user_id);

    if (accountsError) {
      console.error('[AnalyticsController] Error fetching social_accounts:', accountsError.message);
      return res.status(500).json({ error: 'Failed to fetch social accounts' });
    }

    if (!accounts || accounts.length === 0) {
      return res.json({ accounts: [] });
    }

    // Debug: log exactly what was returned from social_accounts
    console.log(`[AnalyticsController] social_accounts rows:`, accounts.map(a => ({
      id: a.id, platform: a.platform, username: a.username, account_id: a.account_id
    })));

    // For each account, fetch the latest insights row
    const accountIds = accounts.map((a) => a.id);

    const { data: insights, error: insightsError } = await supabaseAdmin
      .from('account_insights')
      .select('social_account_id, followers, impressions, reach, profile_views, posts_count, engagement_rate, likes, comments, fetched_at')
      .in('social_account_id', accountIds);

    if (insightsError) {
      console.error('[AnalyticsController] Error fetching account_insights:', insightsError.message);
      // Don't hard-fail — return accounts with null insights
    }

    // Debug: log all insights rows returned
    console.log(`[AnalyticsController] account_insights rows (${insights?.length ?? 0}):`, insights?.map(r => ({
      social_account_id: r.social_account_id, followers: r.followers, fetched_at: r.fetched_at
    })));

    // Build a lookup map: social_account_id → insights row
    // When duplicate rows exist (no unique constraint applied yet), keep the most
    // recently fetched one instead of blindly overwriting.
    const insightsMap = {};
    if (insights) {
      for (const row of insights) {
        const existing = insightsMap[row.social_account_id];
        if (!existing || new Date(row.fetched_at) > new Date(existing.fetched_at)) {
          insightsMap[row.social_account_id] = row;
        }
      }
    }

    console.log(`[AnalyticsController] insightsMap keys:`, Object.keys(insightsMap));

    // Combine accounts with their insights
    const result = accounts.map((account) => {
      const accountInsights = insightsMap[account.id] || null;
      return {
        id: account.id,
        platform: account.platform,
        username: account.username,
        profile_picture: account.profile_picture,
        insights: accountInsights
          ? {
            followers: accountInsights.followers,
            impressions: accountInsights.impressions,
            reach: accountInsights.reach,
            profile_views: accountInsights.profile_views,
            posts_count: accountInsights.posts_count,
            engagement_rate: accountInsights.engagement_rate,
            likes: accountInsights.likes,
            comments: accountInsights.comments,
            fetched_at: accountInsights.fetched_at,
          }
          : null,
      };
    });

    console.log(`[AnalyticsController] Returning insights for ${result.length} account(s)`);
    return res.json({ accounts: result });
  } catch (err) {
    console.error('[AnalyticsController] Unexpected error in getInsights:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/analytics/refresh/:accountId
 *
 * Manually triggers a fresh fetch from Meta API and stores the result
 * for the given social account. Bypasses the 6-hour dedup check is NOT
 * done here — the service handles that. The client can force a refresh
 * by calling this endpoint.
 *
 * Note: fetchAndStoreInsights still respects the 6h window to prevent abuse.
 * If you want true force-refresh, pass force=true in body (future enhancement).
 */
export const refreshInsights = async (req, res) => {
  const socialAccountId = req.params.accountId;

  if (!socialAccountId) {
    return res.status(400).json({ error: 'Missing accountId parameter' });
  }

  try {
    console.log(`[AnalyticsController] refreshInsights called for account: ${socialAccountId}`);

    const updatedInsights = await fetchAndStoreInsights(socialAccountId);

    if (!updatedInsights) {
      return res.status(200).json({
        message: 'No update performed — either skipped (< 6 h since last fetch), account not found, or API error.',
        insights: null,
      });
    }

    console.log(`[AnalyticsController] refreshInsights complete for account: ${socialAccountId}`);
    return res.json({ insights: updatedInsights });
  } catch (err) {
    console.error('[AnalyticsController] Unexpected error in refreshInsights:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
