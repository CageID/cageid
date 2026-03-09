/**
 * CAGE Extension — Background Service Worker
 *
 * Handles:
 * - Session storage from content script handoff
 * - webNavigation listener for OAuth detection (Phase 2)
 */

import { STORAGE_KEYS } from './config.js';

// ─── Message Listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    message: { type: string; sessionId?: string; email?: string },
    _sender,
    sendResponse
  ) => {
    if (message.type === 'SESSION_CAPTURED' && message.sessionId && message.email) {
      // Store session from content script handoff
      chrome.storage.local
        .set({
          [STORAGE_KEYS.SESSION_ID]: message.sessionId,
          [STORAGE_KEYS.EMAIL]: message.email,
        })
        .then(() => {
          console.log('[CAGE] Session captured and stored for', message.email);
          sendResponse({ ok: true });
        });

      // Return true to indicate we'll respond asynchronously
      return true;
    }
  }
);

// ─── OAuth Detection (Phase 2 — log only) ──────────────────────────────────────

chrome.webNavigation.onBeforeNavigate.addListener(
  (details) => {
    const url = details.url;

    // Check if this is an OAuth authorize request to CAGE
    if (url.includes('/oauth/authorize')) {
      console.log('[CAGE] OAuth authorize detected:', url);
      // Phase 2: Intercept and handle silently
    }
  },
  {
    url: [
      { urlContains: 'cageid' },
      { urlContains: 'localhost:3000/api/oauth' },
      { urlContains: 'localhost:3001/oauth' },
    ],
  }
);

// ─── Extension Lifecycle ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[CAGE] Extension installed');
  } else if (details.reason === 'update') {
    console.log('[CAGE] Extension updated to', chrome.runtime.getManifest().version);
  }
});

console.log('[CAGE] Background service worker started');
