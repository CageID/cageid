/**
 * CAGE Extension Configuration
 *
 * TODO: Update to cageid.app / api.cageid.app when custom domains are configured.
 */

const IS_DEV = false;

export const SERVER_URL = IS_DEV
  ? 'http://localhost:3001'
  : 'https://server-production-0ea14.up.railway.app';

export const WEB_URL = IS_DEV
  ? 'http://localhost:3000'
  : 'https://cageid-web.vercel.app';

/** URL patterns to match for OAuth interception (Phase 2) */
export const OAUTH_PATTERNS = [
  `${WEB_URL}/api/oauth/authorize`,
  `${SERVER_URL}/oauth/authorize`,
];

/** Storage keys */
export const STORAGE_KEYS = {
  SESSION_ID: 'cage_session_id',
  EMAIL: 'cage_email',
} as const;
