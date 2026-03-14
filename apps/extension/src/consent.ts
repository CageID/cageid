/**
 * CAGE Extension — Consent Page Script
 *
 * Runs on the extension's consent.html page. Reads the partner name from
 * the URL hash, displays it, and sends Allow/Deny messages to the
 * background service worker.
 */

const params = new URLSearchParams(window.location.hash.slice(1));
const partnerName = params.get('partner') ?? 'this site';

const partnerEl = document.getElementById('partner-name');
if (partnerEl) partnerEl.textContent = partnerName;

const allowBtn = document.getElementById('btn-allow') as HTMLButtonElement | null;
const denyBtn = document.getElementById('btn-deny') as HTMLButtonElement | null;

allowBtn?.addEventListener('click', () => {
  if (allowBtn) {
    allowBtn.disabled = true;
    allowBtn.textContent = 'Authorizing…';
  }
  if (denyBtn) denyBtn.style.display = 'none';
  chrome.runtime.sendMessage({ type: 'CONSENT_ALLOW' });
});

denyBtn?.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CONSENT_DENY' });
});

// Listen for the background to close/redirect the tab
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CONSENT_OVERLAY_REMOVE') {
    // Background will handle the tab navigation
  }
});
