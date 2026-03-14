/**
 * CAGE Extension — Background Service Worker
 *
 * Handles:
 * - Session storage from content script handoff
 * - webNavigation listener for OAuth detection (Phase 2)
 *
 * Note: Config values inlined — keep in sync with config.ts.
 */

// TODO: Update to cageid.app / api.cageid.app when custom domains are configured.
const STORAGE_KEYS = {
  SESSION_ID: 'cage_session_id',
  EMAIL: 'cage_email',
} as const;

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

// ─── OAuth Silent Pass-Through (Phase 2) ────────────────────────────────────

// TODO: Update to api.cageid.app when custom domains are configured.
const SERVER_URL = 'https://server-production-0ea14.up.railway.app';

chrome.webNavigation.onBeforeNavigate.addListener(
  (details) => {
    // Only intercept top-level navigations (not iframes)
    if (details.frameId !== 0) return;

    let url: URL;
    try {
      url = new URL(details.url);
    } catch {
      return;
    }

    // Must be an /oauth/authorize request
    if (!url.pathname.endsWith('/oauth/authorize')) return;

    const clientId = url.searchParams.get('client_id');
    const redirectUri = url.searchParams.get('redirect_uri');
    const responseType = url.searchParams.get('response_type');
    const state = url.searchParams.get('state');

    if (!clientId || !redirectUri || responseType !== 'code') return;

    console.log('[CAGE] OAuth authorize detected, attempting silent pass-through...');

    // Attempt silent authorization
    attemptSilentAuth(details.tabId, { clientId, redirectUri, responseType, state });
  },
  {
    url: [
      { urlContains: 'cageid' },
      { urlContains: 'localhost:3000/api/oauth' },
      { urlContains: 'localhost:3001/oauth' },
    ],
  }
);

// Pending consent state — tracks which tab/params are awaiting user consent
let pendingConsent: {
  tabId: number;
  params: { clientId: string; redirectUri: string; responseType: string; state: string | null };
  sessionId: string;
} | null = null;

// Listen for consent overlay responses
chrome.runtime.onMessage.addListener(
  (message: { type: string }, _sender, _sendResponse) => {
    if (message.type === 'CONSENT_ALLOW' && pendingConsent) {
      console.log('[CAGE] User granted consent — retrying with grant_consent');
      const { tabId, params, sessionId } = pendingConsent;
      pendingConsent = null;
      retryWithConsent(tabId, params, sessionId);
    } else if (message.type === 'CONSENT_DENY' && pendingConsent) {
      console.log('[CAGE] User denied consent — staying on page');
      pendingConsent = null;
    }
  }
);

async function attemptSilentAuth(
  tabId: number,
  params: { clientId: string; redirectUri: string; responseType: string; state: string | null }
) {
  try {
    // 1. Get session from storage
    const stored = await chrome.storage.local.get([STORAGE_KEYS.SESSION_ID]);
    const sessionId = stored[STORAGE_KEYS.SESSION_ID];

    if (!sessionId) {
      console.log('[CAGE] No session — falling through to normal OAuth flow');
      return;
    }

    // 2. Call extension-authorize endpoint
    const response = await fetch(`${SERVER_URL}/oauth/extension-authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionId}`,
      },
      body: JSON.stringify({
        client_id: params.clientId,
        redirect_uri: params.redirectUri,
        response_type: params.responseType,
        state: params.state ?? undefined,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as {
        error?: string;
        partner_name?: string;
      };

      // Handle consent_required — show overlay instead of falling through
      if (err.error === 'consent_required') {
        console.log('[CAGE] Consent required — showing overlay for', err.partner_name);
        pendingConsent = { tabId, params, sessionId };
        showConsentOverlay(tabId, err.partner_name ?? 'this site');
        return;
      }

      console.log('[CAGE] Silent auth declined:', err.error ?? response.status, '— falling through');
      return;
    }

    redirectToCallback(tabId, response);
  } catch (err) {
    console.error('[CAGE] Silent auth error:', err);
    // Let normal flow proceed on any error
  }
}

async function showConsentOverlay(tabId: number, partnerName: string) {
  try {
    // Set the partner name as a global variable before injecting the overlay script
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (name: string) => {
        (window as unknown as { __cagePartnerName: string }).__cagePartnerName = name;
      },
      args: [partnerName],
    });

    // Inject the consent overlay content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['consent-overlay.js'],
    });
  } catch (err) {
    console.error('[CAGE] Failed to inject consent overlay:', err);
    pendingConsent = null;
  }
}

async function retryWithConsent(
  tabId: number,
  params: { clientId: string; redirectUri: string; responseType: string; state: string | null },
  sessionId: string
) {
  try {
    const response = await fetch(`${SERVER_URL}/oauth/extension-authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionId}`,
      },
      body: JSON.stringify({
        client_id: params.clientId,
        redirect_uri: params.redirectUri,
        response_type: params.responseType,
        state: params.state ?? undefined,
        grant_consent: true,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[CAGE] Consent retry failed:', err);
      // Remove the overlay
      chrome.tabs.sendMessage(tabId, { type: 'CONSENT_OVERLAY_REMOVE' });
      return;
    }

    // Remove overlay and redirect
    chrome.tabs.sendMessage(tabId, { type: 'CONSENT_OVERLAY_REMOVE' });
    redirectToCallback(tabId, response);
  } catch (err) {
    console.error('[CAGE] Consent retry error:', err);
    chrome.tabs.sendMessage(tabId, { type: 'CONSENT_OVERLAY_REMOVE' });
  }
}

async function redirectToCallback(tabId: number, response: Response) {
  const { code, redirect_uri, state } = await response.json() as {
    code: string;
    redirect_uri: string;
    state: string | null;
  };

  const callbackUrl = new URL(redirect_uri);
  callbackUrl.searchParams.set('code', code);
  if (state) callbackUrl.searchParams.set('state', state);

  console.log('[CAGE] Silent auth success — redirecting to partner callback');
  chrome.tabs.update(tabId, { url: callbackUrl.toString() });
}

// ─── Extension Lifecycle ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[CAGE] Extension installed');
  } else if (details.reason === 'update') {
    console.log('[CAGE] Extension updated to', chrome.runtime.getManifest().version);
  }
});

console.log('[CAGE] Background service worker started');
