import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Upstash Redis IORedis-compatible connection.
 * Upstash exposes a Redis-protocol endpoint (rediss://) in addition to REST.
 * We parse the REST URL hostname and use port 6379 over TLS.
 *
 * UPSTASH_REDIS_REST_URL format: https://<hostname>.upstash.io
 * IORedis connection:             rediss://:TOKEN@<hostname>.upstash.io:6379
 */
function createRedisConnection() {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !token) {
    throw new Error('[postQueue] Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in env');
  }

  // Extract hostname from https://hostname.upstash.io
  const hostname = new URL(restUrl).hostname;

  return new IORedis({
    host: hostname,
    port: 6379,
    password: token,
    tls: {},              // TLS required by Upstash
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,    // Required by BullMQ
  });
}

export const redisConnection = createRedisConnection();

// Create the BullMQ queue
export const postQueue = new Queue('postQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

postQueue.on('error', (err) => {
  console.error('[postQueue] Queue error:', err.message);
});

/**
 * Add a scheduled job for a post.
 * @param {string} postId   - UUID of the post in the posts table
 * @param {string} scheduledAt - ISO timestamp when the post should publish
 */
export async function addScheduledJob(postId, scheduledAt) {
  const delay = new Date(scheduledAt).getTime() - Date.now();

  if (delay < 0) {
    console.warn(`[postQueue] scheduledAt is in the past for post ${postId}. Scheduling immediately.`);
  }

  const job = await postQueue.add(
    'publishPost',
    { postId },
    {
      jobId: postId,          // Prevents duplicate jobs for the same post
      delay: Math.max(0, delay),
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  console.log(`[postQueue] Job scheduled for post ${postId}, delay=${Math.max(0, delay)}ms, jobId=${job.id}`);
  return job;
}
