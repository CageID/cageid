/**
 * CAGE Extension — Content Script
 *
 * Runs on CAGE web app pages. Detects the session handoff element
 * rendered by the extension-specific verify endpoint and passes
 * the session data to the background service worker.
 */

function checkForSessionHandoff() {
  const el = document.getElementById('cage-ext-session');
  if (!el) return;

  const sessionId = el.getAttribute('data-session-id');
  const email = el.getAttribute('data-email');

  if (!sessionId || !email) return;

  // Send session data to background worker
  chrome.runtime.sendMessage({
    type: 'SESSION_CAPTURED',
    sessionId,
    email,
  });

  // Remove the element from DOM after reading
  el.remove();
}

// Run on page load
checkForSessionHandoff();
