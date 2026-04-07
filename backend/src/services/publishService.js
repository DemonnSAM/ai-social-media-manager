import axios from 'axios';
import supabaseAdmin from '../config/supabaseAdmin.js';
import dotenv from 'dotenv';
dotenv.config();

const META_API_BASE = 'https://graph.facebook.com/v19.0';

// ─── Supabase Helpers ─────────────────────────────────────────────────────────

async function fetchPost(postId) {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (error || !data) {
    throw new Error(`[publishService] Post not found: ${postId}`);
  }
  return data;
}

async function fetchMedia(postId) {
  const { data, error } = await supabaseAdmin
    .from('media')
    .select('*')
    .eq('post_id', postId);

  if (error) {
    console.warn(`[publishService] Could not fetch media for post ${postId}:`, error.message);
    return [];
  }
  return data || [];
}

async function fetchPendingTargets(postId) {
  const { data, error } = await supabaseAdmin
    .from('post_targets')
    .select(`
      id,
      social_account_id,
      status,
      social_accounts (
        id,
        platform,
        account_id,
        username,
        access_token,
        page_access_token
      )
    `)
    .eq('post_id', postId)
    .eq('status', 'pending');

  if (error) {
    throw new Error(`[publishService] Failed to fetch post_targets for post ${postId}: ${error.message}`);
  }
  return data || [];
}

async function markTargetPublished(targetId) {
  const { error } = await supabaseAdmin
    .from('post_targets')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', targetId);

  if (error) {
    console.error(`[publishService] Failed to mark target ${targetId} as published:`, error.message);
  }
}

async function markTargetFailed(targetId, errorMessage) {
  const { error } = await supabaseAdmin
    .from('post_targets')
    .update({ status: 'failed', error_message: errorMessage })
    .eq('id', targetId);

  if (error) {
    console.error(`[publishService] Failed to mark target ${targetId} as failed:`, error.message);
  }
}

async function updatePostStatus(postId, status) {
  const { error } = await supabaseAdmin
    .from('posts')
    .update({ status })
    .eq('id', postId);

  if (error) {
    console.error(`[publishService] Failed to update post ${postId} status to '${status}':`, error.message);
  } else {
    console.log(`[publishService] Post ${postId} status → '${status}'`);
  }
}

// ─── Platform Publishers ──────────────────────────────────────────────────────

async function publishToFacebook(target, post, media) {
  const account = target.social_accounts;
  const pageId = account.account_id;
  const pageToken = account.page_access_token;

  if (!pageToken) {
    throw new Error(`Missing page_access_token for Facebook account ${account.id} (@${account.username})`);
  }

  console.log(`[publishService] Publishing to Facebook page ${pageId} (@${account.username})`);

  if (media && media.length > 0) {
    // Publish with photo
    const mediaItem = media[0];
    const endpoint = `${META_API_BASE}/${pageId}/photos`;
    const params = {
      url: mediaItem.url,
      caption: post.content || '',
      access_token: pageToken,
    };

    const response = await axios.post(endpoint, null, { params });
    console.log(`[publishService] Facebook photo published. Response:`, response.data);
  } else {
    // Text-only post
    const endpoint = `${META_API_BASE}/${pageId}/feed`;
    const params = {
      message: post.content || '',
      access_token: pageToken,
    };

    const response = await axios.post(endpoint, null, { params });
    console.log(`[publishService] Facebook text post published. Response:`, response.data);
  }
}

async function publishToInstagram(target, post, media) {
  const account = target.social_accounts;
  const igAccountId = account.account_id;
  const pageToken = account.page_access_token;

  if (!pageToken) {
    throw new Error(`Missing page_access_token for Instagram account ${account.id} (@${account.username})`);
  }

  if (!media || media.length === 0) {
    throw new Error('Instagram requires media. Text-only posts are not supported.');
  }

  const mediaItem = media[0];
  console.log(`[publishService] Publishing to Instagram account ${igAccountId} (@${account.username})`);

  // Step 1 — Create media container
  const containerEndpoint = `${META_API_BASE}/${igAccountId}/media`;
  const containerParams = {
    image_url: mediaItem.url,
    caption: post.content || '',
    access_token: pageToken,
  };

  const containerResponse = await axios.post(containerEndpoint, null, { params: containerParams });
  const creationId = containerResponse.data?.id;

  if (!creationId) {
    throw new Error(`Instagram media container creation failed — no creation_id returned`);
  }

  console.log(`[publishService] Instagram container created: creation_id=${creationId}`);

  // Step 2 — Publish container
  const publishEndpoint = `${META_API_BASE}/${igAccountId}/media_publish`;
  const publishParams = {
    creation_id: creationId,
    access_token: pageToken,
  };

  const publishResponse = await axios.post(publishEndpoint, null, { params: publishParams });
  console.log(`[publishService] Instagram post published. Response:`, publishResponse.data);
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Publish a scheduled post to all its pending targets.
 * @param {string} postId
 */
export async function publishPost(postId) {
  console.log(`\n[publishService] ═══ Starting publish for post ${postId} ═══`);

  // a) Fetch post
  const post = await fetchPost(postId);
  console.log(`[publishService] Post fetched: status='${post.status}', scheduled_at='${post.scheduled_at}'`);

  // Guard: skip if already published (prevent duplicate publishing)
  if (post.status === 'published') {
    console.log(`[publishService] Post ${postId} is already published. Skipping.`);
    return;
  }

  // b) Fetch media (optional)
  const media = await fetchMedia(postId);
  console.log(`[publishService] Media found: ${media.length} item(s)`);

  // c) Fetch pending targets
  const targets = await fetchPendingTargets(postId);
  console.log(`[publishService] Pending targets: ${targets.length}`);

  if (targets.length === 0) {
    console.warn(`[publishService] No pending targets for post ${postId}. Nothing to publish.`);
    return;
  }

  // d) Process each target
  const results = { succeeded: [], failed: [] };

  for (const target of targets) {
    const account = target.social_accounts;

    if (!account) {
      console.error(`[publishService] Target ${target.id} has no linked social account. Marking failed.`);
      await markTargetFailed(target.id, 'Linked social account not found');
      results.failed.push(target.id);
      continue;
    }

    const platform = account.platform;
    console.log(`[publishService] → Processing target ${target.id} [${platform}] @${account.username}`);

    try {
      if (platform === 'facebook') {
        await publishToFacebook(target, post, media);
      } else if (platform === 'instagram') {
        await publishToInstagram(target, post, media);
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      await markTargetPublished(target.id);
      results.succeeded.push(target.id);
      console.log(`[publishService] ✓ Target ${target.id} [${platform}] published successfully`);

    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message;
      console.error(`[publishService] ✗ Target ${target.id} [${platform}] failed: ${errMsg}`);
      await markTargetFailed(target.id, errMsg);
      results.failed.push(target.id);
    }
  }

  // e) Update overall post status
  console.log(`[publishService] Results — succeeded: ${results.succeeded.length}, failed: ${results.failed.length}`);

  if (results.failed.length === 0) {
    await updatePostStatus(postId, 'published');
  } else if (results.succeeded.length === 0) {
    await updatePostStatus(postId, 'failed');
  } else {
    // Partial failure
    console.warn(`[publishService] Partial publish: ${results.succeeded.length} succeeded, ${results.failed.length} failed. Marking post as failed.`);
    await updatePostStatus(postId, 'failed');
  }

  console.log(`[publishService] ═══ Finished publish for post ${postId} ═══\n`);
}
