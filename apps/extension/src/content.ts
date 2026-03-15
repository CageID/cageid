/**
 * CAGE Extension — Content Script
 *
 * Runs on CAGE web app pages. Detects the session handoff element
 * rendered by the extension-specific verify endpoint and passes
 * the session data to the background service worker.
 *
 * Note: Content scripts cannot use ES module imports.
 */

(function () {
  console.log('[CAGE Content] Running on', window.location.href);

  const el = document.getElementById('cage-ext-session');
  if (!el) {
    console.log('[CAGE Content] No #cage-ext-session element found');
    return;
  }

  const sessionId = el.getAttribute('data-session-id');
  const email = el.getAttribute('data-email');

  if (!sessionId || !email) {
    console.log('[CAGE Content] Missing session data attributes');
    return;
  }

  console.log('[CAGE Content] Session element found for', email);

  // Send session data to background worker
  chrome.runtime.sendMessage(
    {
      type: 'SESSION_CAPTURED',
      sessionId,
      email,
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('[CAGE Content] Failed to send message:', chrome.runtime.lastError.message);
        // Fallback: write directly to storage
        chrome.storage.local.set({
          cage_session_id: sessionId,
          cage_email: email,
        }).then(() => {
          console.log('[CAGE Content] Session stored directly (fallback)');
        });
      } else {
        console.log('[CAGE Content] Session sent to background worker:', response);
      }
    }
  );

  // Remove the element from DOM after reading
  el.remove();
})();
