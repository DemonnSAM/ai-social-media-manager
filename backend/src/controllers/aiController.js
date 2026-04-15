import {
  generateCaptionFromImage,
  generateCaptionFromVideo,
  rewriteCaption as svcRewrite,
  adaptForPlatform as svcAdapt,
  analyzePost as svcAnalyze,
  optimizeContent as svcOptimize,
  generateDashboardInsight as svcDashboardInsight,
} from '../services/aiService.js';
import supabaseAdmin from '../config/supabaseAdmin.js';

/* ── Helpers ── */

/**
 * Logs token usage to ai_usage table.
 */
async function logUsage(userId, tokensUsed, feature) {
  if (!userId || !tokensUsed) return;
  const { error } = await supabaseAdmin.from('ai_usage').insert({
    user_id: userId,
    tokens_used: tokensUsed,
    feature,
  });
  if (error) {
    console.error('[aiController] Failed to log ai_usage:', error.message);
  }
}

/* ── Handlers ── */

export const listModels = async (req, res) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[aiController] listModels error:', error);
    res.status(500).json({ error: error.message || 'Failed to list models' });
  }
};

export const generateCaption = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No media file provided. Please upload an image or video.' });
    }

    const { buffer, mimetype, originalname } = file;
    let result;

    if (mimetype.startsWith('image/')) {
      result = await generateCaptionFromImage(buffer, mimetype);
    } else if (mimetype.startsWith('video/')) {
      result = await generateCaptionFromVideo(buffer, originalname);
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload an image or video.' });
    }

    // Log usage
    const userId = req.body?.user_id || req.headers['x-user-id'];
    await logUsage(userId, result.tokensUsed, 'caption');

    return res.status(200).json({
      caption: result.caption,
      hashtags: result.hashtags,
    });
  } catch (error) {
    console.error('[aiController] generateCaption error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate caption. Please try again.',
    });
  }
};

export const rewriteCaptionHandler = async (req, res) => {
  try {
    const { caption, tone, variant, user_id } = req.body;
    if (!caption) return res.status(400).json({ error: 'caption is required' });
    const result = await svcRewrite(caption, tone || 'balanced', variant || null);

    const userId = user_id || req.headers['x-user-id'];
    await logUsage(userId, result.tokensUsed, 'rewrite');

    return res.status(200).json({ caption: result.caption });
  } catch (error) {
    console.error('[aiController] rewriteCaption error:', error);
    return res.status(500).json({ error: error.message || 'Failed to rewrite caption' });
  }
};

export const adaptForPlatformHandler = async (req, res) => {
  try {
    const { caption, platform, user_id } = req.body;
    if (!caption) return res.status(400).json({ error: 'caption is required' });
    if (!platform) return res.status(400).json({ error: 'platform is required' });
    const result = await svcAdapt(caption, platform);

    const userId = user_id || req.headers['x-user-id'];
    await logUsage(userId, result.tokensUsed, 'adapt');

    return res.status(200).json({ caption: result.caption });
  } catch (error) {
    console.error('[aiController] adaptForPlatform error:', error);
    return res.status(500).json({ error: error.message || 'Failed to adapt caption' });
  }
};

export const analyzePostHandler = async (req, res) => {
  try {
    const { caption, hashtags, user_id } = req.body;
    if (!caption) return res.status(400).json({ error: 'caption is required' });
    const result = await svcAnalyze(caption, hashtags || '');

    const userId = user_id || req.headers['x-user-id'];
    await logUsage(userId, result.tokensUsed, 'analyze');

    // Strip tokensUsed from response
    const { tokensUsed: _t, ...responseData } = result;
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('[aiController] analyzePost error:', error);
    return res.status(500).json({ error: error.message || 'Failed to analyze post' });
  }
};

export const optimizeContentHandler = async (req, res) => {
  try {
    const { caption, hashtags, context, platform, user_id } = req.body;
    if (!caption) return res.status(400).json({ error: 'caption is required' });
    const result = await svcOptimize(caption, hashtags || '', context || '', platform || 'all');

    const userId = user_id || req.headers['x-user-id'];
    await logUsage(userId, result.tokensUsed, 'optimize');

    // Strip tokensUsed from response
    const { tokensUsed: _t, ...responseData } = result;
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('[aiController] optimizeContent error:', error);
    return res.status(500).json({ error: error.message || 'Failed to optimize content' });
  }
};

export const getDashboardInsight = async (req, res) => {
  try {
    // Extract user_id from auth header (Bearer token → verify via supabase) or body
    const authHeader = req.headers.authorization;
    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data?.user) {
        userId = data.user.id;
      }
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const force = req.query.force === 'true';

    // Check cache — look for a recent 'performance' insight (< 6 hours old)
    if (!force) {
      const { data: cachedInsight } = await supabaseAdmin
        .from('ai_insights')
        .select('*')
        .eq('user_id', userId)
        .eq('insight_type', 'performance')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cachedInsight) {
        const createdAt = new Date(cachedInsight.created_at);
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

        if (createdAt > sixHoursAgo) {
          // Parse stored data back out
          const [insight, ...recommendationParts] = cachedInsight.suggestion.split(' ');
          // suggestion = insight + ' ' + recommendation — split at first period for insight
          const suggestion = cachedInsight.suggestion;
          const periodIdx = suggestion.indexOf('. ');
          const insightText = periodIdx !== -1 ? suggestion.slice(0, periodIdx + 1) : suggestion;
          const recommendationText = periodIdx !== -1 ? suggestion.slice(periodIdx + 2) : '';

          const hashtagsStr = cachedInsight.hashtags || '';
          const hashtagsArr = hashtagsStr
            .split(' ')
            .filter((h) => h.startsWith('#'));

          return res.status(200).json({
            insight: insightText,
            recommendation: recommendationText,
            hashtags: hashtagsArr,
            best_platform: null,
            cached: true,
          });
        }
      }
    }

    // Fetch social accounts for user
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('social_accounts')
      .select('id, platform, username')
      .eq('user_id', userId);

    if (accountsError) {
      console.error('[aiController] getDashboardInsight — accounts fetch error:', accountsError.message);
      return res.status(500).json({ error: 'Failed to fetch account data' });
    }

    if (!accounts || accounts.length === 0) {
      return res.status(200).json({ error: 'No analytics data yet. Please sync your accounts first.' });
    }

    // Fetch latest account_insights for each account
    const accountInsightsArray = [];
    for (const account of accounts) {
      const { data: insight } = await supabaseAdmin
        .from('account_insights')
        .select('followers, likes, comments, impressions, reach, posts_count, fetched_at')
        .eq('social_account_id', account.id)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (insight) {
        accountInsightsArray.push({
          platform: account.platform,
          username: account.username,
          followers: insight.followers,
          likes: insight.likes,
          comments: insight.comments,
          impressions: insight.impressions,
          reach: insight.reach,
          posts_count: insight.posts_count,
        });
      }
    }

    if (accountInsightsArray.length === 0) {
      return res.status(200).json({ error: 'No analytics data yet. Please sync your accounts first.' });
    }

    // Generate insight from Gemini
    const result = await svcDashboardInsight(accountInsightsArray);

    // Store in ai_insights
    const suggestionText = `${result.insight} ${result.recommendation}`;
    const hashtagsText = result.hashtags.join(' ');

    await supabaseAdmin.from('ai_insights').insert({
      user_id: userId,
      suggestion: suggestionText,
      hashtags: hashtagsText,
      insight_type: 'performance',
      tokens_used: result.tokensUsed,
    });

    // Log usage
    await logUsage(userId, result.tokensUsed, 'dashboard_insight');

    return res.status(200).json({
      insight: result.insight,
      recommendation: result.recommendation,
      hashtags: result.hashtags,
      best_platform: result.best_platform,
      cached: false,
    });
  } catch (error) {
    console.error('[aiController] getDashboardInsight error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate dashboard insight' });
  }
};
