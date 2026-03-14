/**
 * CAGE Extension Configuration
 */

const IS_DEV = false;

export const SERVER_URL = IS_DEV
  ? 'http://localhost:3001'
  : 'https://api.cageid.app';

export const WEB_URL = IS_DEV
  ? 'http://localhost:3000'
  : 'https://cageid.app';

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
