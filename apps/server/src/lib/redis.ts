import { Redis } from "@upstash/redis";

// Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env.
// These are set in Doppler for production. For local dev, set them in .env.
export const redis = Redis.fromEnv();
