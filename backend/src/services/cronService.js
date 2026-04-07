import cron from 'node-cron';
import supabaseAdmin from '../config/supabaseAdmin.js';
import { fetchAndStoreInsights } from './analyticsService.js';

/**
 * Pauses execution for a given number of milliseconds.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs the analytics sync job:
 * - Fetches all social_accounts from the DB
 * - Calls fetchAndStoreInsights for each, with a 1-second delay between accounts
 */
const runAnalyticsSync = async () => {
  console.log('[Cron] Analytics sync triggered at', new Date().toISOString());

  const { data: accounts, error } = await supabaseAdmin
    .from('social_accounts')
    .select('id, platform, username');

  if (error) {
    console.error('[Cron] Failed to fetch social_accounts:', error.message);
    return;
  }

  if (!accounts || accounts.length === 0) {
    console.log('[Cron] No social accounts found — skipping sync.');
    return;
  }

  console.log(`[Cron] Processing ${accounts.length} account(s)...`);

  for (const account of accounts) {
    try {
      console.log(`[Cron] → Syncing ${account.platform} account: ${account.username} (${account.id})`);
      await fetchAndStoreInsights(account.id);
      console.log(`[Cron] ✓ Done: ${account.username}`);
    } catch (err) {
      // One account failure must not stop others
      console.error(`[Cron] ✗ Failed for account ${account.id} (${account.username}):`, err.message);
    }

    // 1-second delay between accounts to respect Meta rate limits
    await sleep(1000);
  }

  console.log('[Cron] Analytics sync complete.');
};

// Schedule: every 6 hours — '0 */6 * * *'
cron.schedule('0 */6 * * *', runAnalyticsSync);

console.log('[Cron] Analytics cron job scheduled — every 6 hours');
