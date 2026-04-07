import { MetaService } from '../services/metaService.js';
import supabaseAdmin from '../config/supabaseAdmin.js';
import dotenv from 'dotenv';
dotenv.config();

const CLIENT_ID = process.env.META_APP_ID;
const REDIRECT_URI = process.env.META_REDIRECT_URI;
const CONFIG_ID = process.env.META_CONFIG_ID;

export const initiateMetaOAuth = (req, res) => {
  const { user_id, platform } = req.query;

  if (!user_id) {
    return res.status(400).send('Missing user_id parameter');
  }

  // Define base scopes needed for Facebook publishing
  let scopesArray = [
    'public_profile',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts'
  ];

  if (platform === 'instagram') {
    scopesArray.push(
      'instagram_basic',
      'instagram_manage_insights',
      'instagram_content_publish'
    );
  }

  let scopes = scopesArray.join(',');

  // Store user_id in the 'state' parameter so we get it back in the callback
  const state = JSON.stringify({ user_id, platform });
  // Remove config_id so Meta respects the 'scope' parameter.
  // When config_id is present, Meta ignores the scope list unless the config itself is set up with all those permissions.
  const authUrl =   `https://www.facebook.com/v19.0/dialog/oauth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&config_id=${CONFIG_ID}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scopes)}&response_type=code`;

  res.redirect(authUrl);
};

export const handleMetaCallback = async (req, res) => {
  const { code, state, error, error_description } = req.query;

  console.log('--- META OAUTH CALLBACK HIT ---');
  console.log('Code present:', !!code);
  console.log('State:', state);

  // 1. Check if user denied access
  if (error) {
    console.error('Meta OAuth Error:', error, error_description);
    return res.redirect(`http://localhost:5173/accounts?error=${error}`);
  }

  if (!code || !state) {
    console.error('Missing code or state parameter');
    return res.status(400).send('Missing code or state parameter');
  }

  try {
    const { user_id, platform } = JSON.parse(state);
    console.log(`Parsed state. User ID: ${user_id}, Platform: ${platform}`);

    // Validate platform
    const validPlatforms = ['facebook', 'instagram'];
    if (!validPlatforms.includes(platform)) {
      console.error('Invalid platform:', platform);
      return res.status(400).send('Invalid platform');
    }

    // 2. Exchange code for short-lived token
    console.log('Exchanging code for short-lived token...');
    const shortLivedToken = await MetaService.exchangeCodeForToken(code);
    console.log('Short-lived token received (starts with):', shortLivedToken.substring(0, 10) + '...');

    // 3. Upgrade to long-lived token
    console.log('Upgrading to long-lived token...');
    const tokenData = await MetaService.getLongLivedToken(shortLivedToken);
    const longLivedToken = tokenData.access_token;
    console.log('Long-lived token received (starts with):', longLivedToken.substring(0, 10) + '...');

    // Calculate expiry (default 60 days if expires_in is present)
    const expiryDate = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days fallback

    // --- DEBUG: Fetch actual granted permissions ---
    try {
      console.log('Fetching granted permissions for token...');
      console.log('[MetaService] Permissions Granted    ');
    } catch (permErr) {
      console.error('Failed to fetch token permissions:', permErr.message);
    }
    // -----------------------------------------------

    // 4. Fetch the user's Facebook Pages
    console.log('Fetching FB pages...');
    const pages = await MetaService.getFacebookPages(longLivedToken, platform);

    // Adding console.log for raw pages array
    console.log(`Found ${pages ? pages.length : 0} pages.`);
    if (pages) {
      pages.forEach(p => console.log(`  - Page: ${p.name} (ID: ${p.id}, Has IG: ${!!p.instagram_business_account})`));
    }

    if (!pages || pages.length === 0) {
      console.log('No pages found. Redirecting to frontend.');
      return res.redirect('http://localhost:5173/accounts?error=no_pages_found');
    }

    // Helper functions for saving accounts
    const saveFacebookAccount = async (page, user_id, longLivedToken, expiryDate) => {
      const fbAccount = {
        user_id,
        platform: 'facebook',
        account_id: page.id,
        username: page.name,
        profile_picture: page.picture?.data?.url || null,
        access_token: longLivedToken,
        page_access_token: page.access_token,
        token_expiry: expiryDate
      };

      console.log('Attempting to insert FB Account into Supabase:', {
        ...fbAccount,
        access_token: '[REDACTED]',
        page_access_token: '[REDACTED]'
      });

      const { data: fbData, error: fbError } = await supabaseAdmin
        .from('social_accounts')
        .upsert(fbAccount, { onConflict: 'account_id' })
        .select()
        .single();

      if (fbError) {
        console.error('Supabase: FB Save Error', fbError.message, fbError.details, fbError.hint);
      } else {
        console.log('FB Account saved successfully. DB ID:', fbData.id);
      }
    };

    const saveInstagramAccount = async (page, user_id, longLivedToken, expiryDate) => {
      if (!page.instagram_business_account) return;

      console.log(`Page '${page.name}' has linked IG account. Fetching details...`);
      const igId = page.instagram_business_account.id;
      const igInfo = await MetaService.getInstagramAccountInfo(igId, page.access_token);

      if (igInfo) {
        console.log(`IG Details fetched: ${igInfo.username} (${igInfo.followers_count} followers)`);
        const igAccount = {
          user_id,
          platform: 'instagram',
          account_id: igId,
          username: igInfo.username,
          profile_picture: igInfo.profile_picture_url || null,
          access_token: longLivedToken,
          page_access_token: page.access_token,
          token_expiry: expiryDate
        };

        console.log('Attempting to insert IG Account into Supabase:', {
          ...igAccount,
          access_token: '[REDACTED]',
          page_access_token: '[REDACTED]'
        });

        const { data: igData, error: igError } = await supabaseAdmin
          .from('social_accounts')
          .upsert(igAccount, { onConflict: 'account_id' })
          .select()
          .single();

        if (igError) {
          console.error('Supabase: IG Save Error', igError.message, igError.details, igError.hint);
        } else if (igData) {
          console.log('IG Account saved successfully. DB ID:', igData.id);
          // Save initial IG insights
          const insightPayload = {
            social_account_id: igData.id,
            followers: typeof igInfo.followers_count === 'number' ? igInfo.followers_count : 0,
            posts_count: typeof igInfo.media_count === 'number' ? igInfo.media_count : 0
          };

          console.log('Attempting to insert IG Insights into Supabase:', insightPayload);
          const { error: insightErr } = await supabaseAdmin.from('account_insights').insert(insightPayload);
          if (insightErr) {
            console.error('Supabase: IG Insights Save Error:', insightErr.message);
          } else {
            console.log('IG Insights saved successfully.');
          }
        }
      } else {
        console.log('Failed to fetch details for IG ID:', igId);
      }
    };

    // Platform-specific account savers
    const accountSavers = {
      facebook: saveFacebookAccount,
      instagram: saveInstagramAccount,
    };

    // 5. Process each page and save to Supabase based on platform
    for (const page of pages) {
      const saver = accountSavers[platform];
      if (saver) {
        await saver(page, user_id, longLivedToken, expiryDate);
      }
    }

    // 6. Redirect back to frontend on success
    console.log('--- CALLBACK FINISHED, REDIRECTING ---');
    res.redirect(`http://localhost:5173/accounts?connected=true&platform=${platform}`);

  } catch (err) {
    console.error('OAuth Callback Error Caught:', err.message);
    if (err.response) {
      console.error('API Response Error Data:', JSON.stringify(err.response.data, null, 2));
    }
    res.redirect('http://localhost:5173/accounts?error=server_error');
  }
};

export const disconnectAccount = async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!id || !user_id) {
    return res.status(400).json({ error: 'Missing account id or user_id' });
  }

  try {
    const { error } = await supabaseAdmin
      .from('social_accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    if (error) {
      console.error('Supabase: Disconnect Error', error.message);
      return res.status(500).json({ error: 'Failed to disconnect account' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('disconnectAccount error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const getFacebookPages = async (req, res) => {
  const { user_id, access_token } = req.query;

  if (!user_id || !access_token) {
    return res.status(400).json({ error: 'Missing user_id or access_token parameter' });
  }

  try {
    const pages = await MetaService.getFacebookPages(access_token);

    if (!pages || pages.length === 0) {
      return res.status(200).json([]);
    }

    const savedAccounts = [];
    const expiryDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    for (const page of pages) {
      const fbAccount = {
        user_id,
        platform: 'facebook',
        account_id: page.id,
        username: page.name,
        profile_picture: page.picture?.data?.url || null,
        access_token: page.access_token,
        token_expiry: expiryDate
      };

      const { data: existingFb } = await supabaseAdmin.from('social_accounts')
        .select('id').eq('user_id', user_id).eq('account_id', page.id).single();

      let fbData, fbError;

      if (existingFb) {
        ({ data: fbData, error: fbError } = await supabaseAdmin.from('social_accounts')
          .update(fbAccount).eq('id', existingFb.id).select().single());
      } else {
        ({ data: fbData, error: fbError } = await supabaseAdmin.from('social_accounts')
          .insert(fbAccount).select().single());
      }

      if (!fbError && fbData) {
        savedAccounts.push({
          id: fbData.account_id,
          name: fbData.username,
          platform: fbData.platform
        });
      }

      if (page.instagram_business_account) {
        const igId = page.instagram_business_account.id;
        const igInfo = await MetaService.getInstagramAccountInfo(igId, page.access_token);
        if (igInfo) {
          const igAccount = {
            user_id,
            platform: 'instagram',
            account_id: igId,
            username: igInfo.username,
            profile_picture: igInfo.profile_picture_url || null,
            access_token: page.access_token,
            token_expiry: expiryDate
          };

          const { data: existingIg } = await supabaseAdmin.from('social_accounts')
            .select('id').eq('user_id', user_id).eq('account_id', igId).single();

          let igData, igError;
          if (existingIg) {
            ({ data: igData, error: igError } = await supabaseAdmin.from('social_accounts')
              .update(igAccount).eq('id', existingIg.id).select().single());
          } else {
            ({ data: igData, error: igError } = await supabaseAdmin.from('social_accounts')
              .insert(igAccount).select().single());
          }

          if (!igError && igData) {
            savedAccounts.push({
              id: igData.account_id,
              name: igData.username,
              platform: igData.platform
            });
          }
        }
      }
    }

    res.json(savedAccounts);
  } catch (error) {
    console.error('getFacebookPages error:', error);
    if (error.response?.data?.error) {
      return res.status(401).json({ error: 'Invalid or expired access token from Meta' });
    }
    res.status(500).json({ error: 'Server error fetching pages.' });
  }
};
