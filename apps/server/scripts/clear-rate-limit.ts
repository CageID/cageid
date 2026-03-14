import { redis } from '../src/lib/redis.js';

const email = process.argv[2] || 'acres.steven@gmail.com';
const key = `magic_link_rate:${email}`;

const result = await redis.del(key);
console.log(`Deleted key "${key}":`, result);
process.exit(0);
