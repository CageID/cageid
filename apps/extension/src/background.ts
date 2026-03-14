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

    // Capture the partner page URL before the navigation proceeds,
    // so we can navigate back to it if consent is needed.
    chrome.tabs.get(details.tabId).then((tab) => {
      const partnerPageUrl = tab.url;
      attemptSilentAuth(details.tabId, { clientId, redirectUri, responseType, state }, partnerPageUrl);
    });
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
  partnerPageUrl?: string;
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
      console.log('[CAGE] User denied consent — returning to partner page');
      const { tabId, partnerPageUrl } = pendingConsent;
      pendingConsent = null;
      // Navigate back to the partner page (or just go back in history)
      if (partnerPageUrl) {
        chrome.tabs.update(tabId, { url: partnerPageUrl });
      } else {
        chrome.tabs.goBack(tabId);
      }
    }
  }
);

async function attemptSilentAuth(
  tabId: number,
  params: { clientId: string; redirectUri: string; responseType: string; state: string | null },
  partnerPageUrl?: string
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

      // Handle consent_required — navigate back to partner page and show overlay
      if (err.error === 'consent_required') {
        console.log('[CAGE] Consent required — showing consent page for', err.partner_name);
        pendingConsent = { tabId, params, sessionId, partnerPageUrl };
        showConsentPage(tabId, err.partner_name ?? 'this site');
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

function showConsentPage(tabId: number, partnerName: string) {
  // Navigate the tab to the extension's consent page.
  // The partner page's OAuth state cookie is preserved because we don't reload the partner page.
  const consentUrl = chrome.runtime.getURL(`consent.html#partner=${encodeURIComponent(partnerName)}`);
  chrome.tabs.update(tabId, { url: consentUrl });
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
      return;
    }

    redirectToCallback(tabId, response);
  } catch (err) {
    console.error('[CAGE] Consent retry error:', err);
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
