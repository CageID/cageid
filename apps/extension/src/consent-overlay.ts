/**
 * CAGE Extension — Consent Overlay
 *
 * Injected on demand by the background service worker when a partner site
 * requires first-time consent. Shows an overlay asking the user to allow
 * or deny sharing their age verification with the partner.
 *
 * Communicates back to the background worker via chrome.runtime.sendMessage.
 */

(function () {
  // Prevent double-injection
  if (document.getElementById('cage-consent-overlay')) return;

  // Read partner name from the global variable set by executeScript
  const partnerName =
    (window as unknown as { __cagePartnerName?: string }).__cagePartnerName ?? 'this site';

  // ─── Build the overlay DOM ──────────────────────────────────────────────────

  const overlay = document.createElement('div');
  overlay.id = 'cage-consent-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background: #1a1a2e;
    border-radius: 16px;
    padding: 32px;
    max-width: 400px;
    width: 90%;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(201, 168, 76, 0.2);
  `;

  // Logo (inline SVG)
  const logo = document.createElement('div');
  logo.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 587.16 670.14" style="height:48px;width:auto;margin:0 auto 16px;">
    <path fill="#c9a84c" d="M293.58,0C131.44,0,0,150.01,0,335.07s131.44,335.07,293.58,335.07,293.58-150.01,293.58-335.07S455.72,0,293.58,0ZM293.58,603.6c-36.29,0-69.77-11.82-99.03-31.93l28.45-42.28c20.87,14.06,45.26,22.5,70.58,22.5s49.71-8.44,70.58-22.5l28.45,42.28c-29.27,20.11-62.74,31.93-99.03,31.93ZM476.29,523.3l-28.77-42.75c33.91-42.24,54.39-100.82,54.39-145.48,0-115.06-93.39-208.45-208.45-208.45s-208.33,93.39-208.33,208.45c0,44.66,20.48,103.24,54.39,145.48l-28.77,42.75C62.76,468.09,27.62,389.53,27.62,335.07c0-146.88,119.08-265.96,265.96-265.96s265.96,119.08,265.96,265.96c0,54.46-35.14,133.01-83.13,188.23ZM293.58,480.64c-80.36,0-145.57-65.21-145.57-145.57s65.21-145.57,145.57-145.57,145.57,65.21,145.57,145.57-65.21,145.57-145.57,145.57ZM293.58,240.42c-52.22,0-94.65,42.43-94.65,94.65s42.43,94.65,94.65,94.65,94.65-42.43,94.65-94.65-42.43-94.65-94.65-94.65Z"/>
  </svg>`;

  // Heading
  const heading = document.createElement('h2');
  heading.style.cssText = `
    color: #ffffff;
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px;
    line-height: 1.4;
  `;
  heading.textContent = 'Share your age verification?';

  // Partner name
  const partnerLabel = document.createElement('p');
  partnerLabel.style.cssText = `
    color: #c9a84c;
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 12px;
  `;
  partnerLabel.textContent = partnerName;

  // Subtext
  const subtext = document.createElement('p');
  subtext.style.cssText = `
    color: #a0a0b0;
    font-size: 13px;
    margin: 0 0 24px;
    line-height: 1.5;
  `;
  subtext.textContent = 'Only your verification status (18+) is shared. No personal data.';

  // Buttons container
  const buttons = document.createElement('div');
  buttons.style.cssText = `
    display: flex;
    gap: 12px;
    justify-content: center;
  `;

  const allowBtn = document.createElement('button');
  allowBtn.textContent = 'Allow';
  allowBtn.style.cssText = `
    background: #c9a84c;
    color: #1a1a2e;
    border: none;
    border-radius: 8px;
    padding: 12px 32px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  `;
  allowBtn.onmouseover = () => { allowBtn.style.background = '#d4b85c'; };
  allowBtn.onmouseout = () => { allowBtn.style.background = '#c9a84c'; };

  const denyBtn = document.createElement('button');
  denyBtn.textContent = 'Deny';
  denyBtn.style.cssText = `
    background: transparent;
    color: #a0a0b0;
    border: 1px solid #3a3a4e;
    border-radius: 8px;
    padding: 12px 32px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  `;
  denyBtn.onmouseover = () => { denyBtn.style.background = '#2a2a3e'; denyBtn.style.color = '#ffffff'; };
  denyBtn.onmouseout = () => { denyBtn.style.background = 'transparent'; denyBtn.style.color = '#a0a0b0'; };

  // ─── Event handlers ─────────────────────────────────────────────────────────

  allowBtn.addEventListener('click', () => {
    // Disable buttons to prevent double-click
    allowBtn.disabled = true;
    denyBtn.disabled = true;
    allowBtn.textContent = 'Authorizing…';
    chrome.runtime.sendMessage({ type: 'CONSENT_ALLOW' });
  });

  denyBtn.addEventListener('click', () => {
    overlay.remove();
    chrome.runtime.sendMessage({ type: 'CONSENT_DENY' });
  });

  // ─── Assemble and inject ────────────────────────────────────────────────────

  buttons.appendChild(allowBtn);
  buttons.appendChild(denyBtn);

  card.appendChild(logo);
  card.appendChild(heading);
  card.appendChild(partnerLabel);
  card.appendChild(subtext);
  card.appendChild(buttons);

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Listen for removal message from background (after successful auth)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'CONSENT_OVERLAY_REMOVE') {
      overlay.remove();
    }
  });
})();
