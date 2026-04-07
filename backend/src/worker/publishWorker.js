/**
 * publishWorker.js
 *
 * BullMQ Worker that listens to "postQueue" and processes "publishPost" jobs.
 * Run as a standalone process: node src/worker/publishWorker.js
 */

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { publishPost } from '../services/publishService.js';
dotenv.config();

function timestamp() {
  return new Date().toISOString();
}

// ─── Redis Connection ─────────────────────────────────────────────────────────

function createRedisConnection() {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !token) {
    throw new Error('[publishWorker] Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in env');
  }

  const hostname = new URL(restUrl).hostname;

  return new IORedis({
    host: hostname,
    port: 6379,
    password: token,
    tls: {},
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,    // Required by BullMQ
  });
}

const redisConnection = createRedisConnection();

// ─── Worker ───────────────────────────────────────────────────────────────────

const worker = new Worker(
  'postQueue',
  async (job) => {
    const { postId } = job.data;

    console.log(`\n[${timestamp()}] [publishWorker] ═══ Job received ═══`);
    console.log(`[publishWorker] Job ID: ${job.id} | Post ID: ${postId} | Attempt: ${job.attemptsMade + 1}`);

    await publishPost(postId);

    console.log(`[${timestamp()}] [publishWorker] ✓ Job ${job.id} completed successfully`);
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 posts simultaneously
  }
);

// ─── Worker Event Handlers ────────────────────────────────────────────────────

worker.on('completed', (job) => {
  console.log(`[${timestamp()}] [publishWorker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[${timestamp()}] [publishWorker] ✗ Job ${job?.id} failed on attempt ${job?.attemptsMade}/${job?.opts?.attempts}`);
  console.error(`[publishWorker] Error: ${err.message}`);
  if (err.stack) {
    console.error(`[publishWorker] Stack: ${err.stack}`);
  }
});

worker.on('error', (err) => {
  console.error(`[${timestamp()}] [publishWorker] Worker error: ${err.message}`);
});

worker.on('stalled', (jobId) => {
  console.warn(`[${timestamp()}] [publishWorker] Job ${jobId} stalled — will be retried`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

async function shutdown(signal) {
  console.log(`\n[${timestamp()}] [publishWorker] ${signal} received — shutting down gracefully...`);
  await worker.close();
  redisConnection.disconnect();
  console.log(`[${timestamp()}] [publishWorker] Shutdown complete.`);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

console.log(`[${timestamp()}] [publishWorker] Worker started — listening to "postQueue"`);
